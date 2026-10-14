#!/usr/bin/env python3
"""Desdobla las preguntas que admiten más de una respuesta correcta.

Vienen de exámenes de respuesta múltiple («señale la/s correcta/s»). Al
pasarlas a una plataforma de respuesta única se guardó la segunda válida en el
campo `also`, y el motor la acepta y la pinta en verde al corregir: por eso al
estudiar aparecen preguntas con dos respuestas buenas.

Aquí cada una se parte en tantas preguntas como respuestas correctas tenga,
dentro de su mismo banco (si era del Examen Febrero 2020, las dos resultantes
siguen siendo de ese examen):

    original: [A✔, B, C✔, D, E]  ->  1.ª: [A✔, B, D, E]
                                     2.ª: [C✔, B, D, E]

Cada copia conserva UNA correcta y todos los distractores, y se queda sin el
campo `also`. La primera mantiene el id original, para no tocar el progreso
guardado; las demás reciben ids nuevos al final del rango.

Si entre los distractores hay una opción «meta» que nombra letras («solo b y c
son correctas») y alguna de esas letras desaparece, esa opción se quita
también: sin la opción a la que apunta ya no significa nada.

Uso:  python3 tools/desdoblar_dobles.py <plataforma.html> [...]
      python3 tools/desdoblar_dobles.py --simular <plataforma.html>
"""
import json, re, sys

LETRAS = "abcdef"
NOTA = ("▸ En el examen original esta pregunta admitía más de una respuesta "
        "correcta. Está desdoblada en una pregunta por cada una, todas en este "
        "mismo banco; en esta versión la válida es «%s».")


def letras_citadas(texto):
    """Opción del tipo «solo b y c son correctas»: devuelve las letras que cita."""
    if not re.search(r"\b(s[oó]lo|solo|todas|ambas)\b", texto, re.I):
        return set()
    return {c for c in re.findall(r"\b([a-f])\b", texto.lower())} & set(LETRAS)


def renumerar(texto, mapa):
    """Reescribe las letras de una opción «meta» con su nueva posición."""
    return re.sub(r"\b([a-f])\b",
                  lambda m: mapa.get(m.group(1), m.group(1)), texto, flags=re.I)


def una_version(q, conservar, otras, nuevo_id=None):
    """Copia de q que deja como correcta solo `conservar` y quita `otras`."""
    fuera = set(otras)
    # 1.ª pasada: qué opciones sobreviven y qué letra le toca a cada una
    supervivientes = [i for i in range(len(q["options"])) if i not in fuera]
    quedan = {LETRAS[i] for i in supervivientes}
    mapa = {LETRAS[viejo]: LETRAS[nuevo] for nuevo, viejo in enumerate(supervivientes)}
    opciones, indices = [], []
    for i in supervivientes:
        texto = q["options"][i]
        citadas = letras_citadas(texto)
        if citadas and not citadas <= quedan:   # cita una opción que ya no está
            continue
        if citadas:                             # las letras se han desplazado
            texto = renumerar(texto, mapa)
        opciones.append(texto)
        indices.append(i)
    nueva = {k: v for k, v in q.items() if k != "also"}
    nueva["options"] = opciones
    nueva["correct"] = indices.index(conservar)
    corta = re.sub(r"\s+", " ", q["options"][conservar]).strip().rstrip(".")
    if len(corta) > 90:
        corta = corta[:87].rstrip() + "…"
    base = re.sub(r"\s*▸ En el examen original.*$", "", q.get("exp", "") or "").strip()
    nueva["exp"] = (base + " " + NOTA % corta).strip()
    if nuevo_id is not None:
        nueva["id"] = nuevo_id
    return nueva


# Preguntas que no se parten: con tantas correctas que cada versión se quedaría
# en dos opciones, y eso es un verdadero/falso encubierto. Se tratan a mano.
EXCLUIDAS = {333,          # Fisio I · Junio 2018, 4 correctas de 5
             11, 434, 1022}  # Histología, 3 correctas de 4


def desdoblar(qs):
    salida, siguiente, partidas, creadas = [], None, 0, 0
    siguiente = max(q["id"] for q in qs if q["id"] < 90000) + 1
    for q in qs:
        extra = [i for i in (q.get("also") or []) if i != q["correct"]]
        if not extra or q["id"] in EXCLUIDAS:
            salida.append(q)
            continue
        correctas = [q["correct"]] + sorted(extra)
        partidas += 1
        for k, c in enumerate(correctas):
            otras = [x for x in correctas if x != c]
            if k == 0:
                salida.append(una_version(q, c, otras))
            else:
                salida.append(una_version(q, c, otras, nuevo_id=siguiente))
                siguiente += 1
                creadas += 1
    return salida, partidas, creadas


def main(argv):
    simular = "--simular" in argv
    rutas = [a for a in argv if not a.startswith("--")]
    for ruta in rutas:
        s = open(ruta, encoding="utf-8").read()
        m = re.search(r"const ALL_QUESTIONS = (\[.*?\]);\n", s, re.S)
        qs = json.loads(m.group(1))
        nuevas, partidas, creadas = desdoblar(qs)
        print("%-28s %4d preguntas -> %4d · %d partidas, %d nuevas"
              % (ruta, len(qs), len(nuevas), partidas, creadas))
        if simular:
            continue
        texto = "const ALL_QUESTIONS = %s;\n" % json.dumps(nuevas, ensure_ascii=False)
        open(ruta, "w", encoding="utf-8").write(s[:m.start()] + texto + s[m.end():])


if __name__ == "__main__":
    main(sys.argv[1:])
