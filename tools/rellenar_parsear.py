#!/usr/bin/env python3
"""Convierte el solucionario de las preguntas con imagen en ejercicios de rellenar.

Del doc de apuntes sale una línea por pregunta, del estilo

    1 piel; 2 grasa subcutánea; 5 ligamento amarillo (tras él, pérdida de resistencia)

y aquí se parte en (número, etiqueta corta, matiz). La etiqueta corta es lo que
va en el desplegable; el matiz solo se enseña al corregir. Lo que venga después
del último número es la coletilla, que responde a la segunda parte del enunciado.

Uso:  python3 tools/rellenar_parsear.py <bruto.json> <ejercicios.json>

El bruto lo saca la lectura del doc: una lista de
{tema, clave, enunciado, blob, solucion}.
"""
import json, re, sys

# (tema en el doc, clave de la pregunta, título del ejercicio, archivo de imagen)
EJERCICIOS = [
    ("Meninges", "D1",  "Meninges en corte",                          "D1-meninges-corte"),
    ("Meninges", "D2",  "Membranas y espacios del conducto vertebral", "D2-espacios-medula"),
    ("Meninges", "D3",  "Capas de la punción lumbar",                 "D3-puncion-lumbar"),
    ("Meninges", "D4",  "Tabiques durales",                           "D4-tabiques-durales"),
    ("Meninges", "D5",  "Tres TAC: ¿qué hemorragia es cada una?",     "D5-tac-hemorragias"),
    ("Meninges", "D9",  "Herniaciones cerebrales",                    "D9-herniaciones"),
    ("Meninges", "D10", "Arteria meníngea media",                     "D10-meningea-media"),
    ("Meninges", "D11", "Venas emisarias y seno sagital",             "D11-venas-emisarias"),
    ("Meninges", "D12", "Hemorragia subaracnoidea",                   "D12-hsa-aneurisma"),
    ("Médula espinal", "I1", "Nervio espinal y sus envolturas",       "M1-nervio-espinal"),
    ("Médula espinal", "I2", "Corte transversal de la médula",        "M2-corte-transversal"),
    ("Médula espinal", "I4", "Segmento medular",                      "M4-segmento-medular"),
    ("Médula espinal", "I5", "Raíces, ganglio y astas",               "M5-raices-astas"),
    ("Osteología del cráneo", "I1", "Hueso frontal, visión anterior", "O1-hueso-frontal"),
    ("Osteología del cráneo", "I2", "Hueso occipital, visión caudal", "O2-hueso-occipital"),
    ("Tronco del encéfalo",   "I1", "Tronco del encéfalo, visión anterior", "T1-tronco-anterior"),
]


def partir_puntoycoma(s):
    """Parte por ';' pero no por los que van dentro de un paréntesis."""
    trozos, hondo, act = [], 0, ""
    for c in s:
        if c == "(":
            hondo += 1
        elif c == ")":
            hondo = max(0, hondo - 1)
        if c == ";" and hondo == 0:
            trozos.append(act); act = ""
        else:
            act += c
    trozos.append(act)
    return [t.strip() for t in trozos if t.strip()]


def partir_etiqueta(txt):
    """Separa la etiqueta corta del matiz entre paréntesis o tras la coma."""
    m = re.match(r"^([^(,]+?)\s*(\(.*\)|,.*)$", txt)
    if m:
        return m.group(1).strip(), m.group(2).strip().lstrip(",").strip()
    return txt.strip(), ""


def main():
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    bruto = {(p["tema"], p["clave"]): p
             for p in json.load(open(sys.argv[1], encoding="utf-8"))}

    salida = []
    for tema, clave, titulo, img in EJERCICIOS:
        p = bruto[(tema, clave)]
        items, coletilla = [], ""
        for trozo in partir_puntoycoma(p["solucion"]):
            m = re.match(r"^(\d{1,2}|[A-D])\s+(.+)$", trozo, re.S)
            if not m:
                coletilla = (coletilla + "; " + trozo).strip("; ").strip()
                continue
            n, resto = m.group(1), m.group(2).strip()
            # lo que venga tras un punto y mayúscula ya no es la etiqueta
            corte = re.search(r"\.\s+(?=[A-ZÁÉÍÓÚ¿])", resto)
            if corte:
                coletilla = (coletilla + " " + resto[corte.end():]).strip()
                resto = resto[:corte.start()]
            etiqueta, nota = partir_etiqueta(resto)
            if re.fullmatch(r"(I|V|X)[IVX]*", etiqueta):
                etiqueta += " par"        # "IX" -> "IX par", como los demás
            items.append({"n": n, "etiqueta": etiqueta, "nota": nota})

        repes = [x for x in [i["etiqueta"] for i in items]
                 if [i["etiqueta"] for i in items].count(x) > 1]
        if repes:
            print("  aviso: %s tiene etiquetas repetidas: %s" % (titulo, set(repes)),
                  file=sys.stderr)

        salida.append({"tema": tema, "titulo": titulo, "img": img,
                       "enunciado": p["enunciado"], "items": items,
                       "coletilla": coletilla.strip()})

    json.dump(salida, open(sys.argv[2], "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    print("  %d ejercicios · %d huecos -> %s"
          % (len(salida), sum(len(e["items"]) for e in salida), sys.argv[2]))


if __name__ == "__main__":
    main()
