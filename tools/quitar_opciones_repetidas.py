#!/usr/bin/env python3
"""Quita opciones repetidas dentro de una misma pregunta.

Cuando una pregunta trae dos opciones idénticas, o sobra un distractor (y la
pregunta tiene en realidad una opción menos de las que aparenta) o hay un
empate imposible, porque dos opciones iguales serían las dos correctas o las
dos falsas. Viene siempre de la transcripción de la fuente.

Se quita la copia y NO se inventa nada en su lugar: una opción de un libro que
no sabemos cuál era no se puede reconstruir. La clave se reubica en su nueva
posición y se deja constancia al final de la explicación.

Uso:  python3 tools/quitar_opciones_repetidas.py <plataforma.html> <id> [<id> ...]
      python3 tools/quitar_opciones_repetidas.py --simular <plataforma.html> <id>
"""
import json, re, sys, unicodedata

NOTA = ("▸ En la fuente esta pregunta tenía dos opciones idénticas; se ha quitado "
        "la copia, de modo que aquí tiene una opción menos que en el original.")


def norma(s):
    s = unicodedata.normalize("NFD", (s or "").lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", "", s).rstrip(".")


def main(argv):
    simular = "--simular" in argv
    args = [a for a in argv if not a.startswith("--")]
    ruta, ids = args[0], {int(x) for x in args[1:]}
    s = open(ruta, encoding="utf-8").read()
    m = re.search(r"const ALL_QUESTIONS = (\[.*?\]);\n", s, re.S)
    qs = json.loads(m.group(1))

    tocadas = 0
    for q in qs:
        if q["id"] not in ids:
            continue
        correcta = q["options"][q["correct"]]
        vistas, nuevas = set(), []
        for o in q["options"]:
            k = norma(o)
            if k in vistas:
                continue
            vistas.add(k)
            nuevas.append(o)
        if len(nuevas) == len(q["options"]):
            print("  id %s: no tiene opciones repetidas" % q["id"])
            continue
        print("  id %s: %d -> %d opciones · clave «%s»"
              % (q["id"], len(q["options"]), len(nuevas), correcta[:50]))
        q["options"] = nuevas
        q["correct"] = next(i for i, o in enumerate(nuevas) if norma(o) == norma(correcta))
        base = re.sub(r"\s*▸ En la fuente esta pregunta.*$", "", q.get("exp") or "").strip()
        q["exp"] = (base + " " + NOTA).strip()
        tocadas += 1

    if simular:
        print("(simulación: no se escribe)")
        return
    if tocadas:
        s = s[:m.start()] + "const ALL_QUESTIONS = %s;\n" % json.dumps(qs, ensure_ascii=False) + s[m.end():]
        open(ruta, "w", encoding="utf-8").write(s)
    print("%s: %d preguntas corregidas" % (ruta, tocadas))


if __name__ == "__main__":
    main(sys.argv[1:])
