#!/usr/bin/env python3
"""Copia la explicación de una pregunta a sus copias en otras plataformas.

La misma pregunta aparece en varias plataformas (los bancos de IMI repiten las
de Fisiología, las de segundo repiten las de primero…). Si en una está
explicada y en otra no, no tiene sentido escribirla dos veces.

Dos preguntas se consideran la misma si coinciden el enunciado y el conjunto de
opciones, comparados con la normalización de repasar.py —que conserva letras
griegas, signos y operadores, porque «2α + 2β» y «2α + 2δ» son distintas—. Si
además llevan imagen, tiene que ser la misma.

Solo se copia cuando la respuesta correcta coincide: si dos copias de la misma
pregunta se corrigen distinto, el problema es otro y lo saca `repasar.py`.

Uso:  python3 tools/explicaciones_copiar.py <destino.html> [más destinos…]
      (las fuentes son todas las plataforma_*.html del directorio)
"""
import glob, json, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from repasar import norm, ETIQUETAS


def cuerpo(e):
    e = e or ""
    for t in ETIQUETAS:
        if e.startswith(t):
            return e[len(t):].strip()
    return e.strip()


def clave(q):
    return (norm(q.get("q")),
            tuple(sorted(norm(o) for o in q.get("options") or [])),
            q.get("img", ""))


def correcta(q):
    ops = q.get("options") or []
    i = q.get("correct")
    return norm(ops[i]) if isinstance(i, int) and 0 <= i < len(ops) else None


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)

    # catálogo de explicaciones ya escritas, de todas las plataformas
    fuente = {}
    for f in sorted(glob.glob("plataforma_*.html")):
        s = open(f, encoding="utf-8").read()
        m = re.search(r"^const ALL_QUESTIONS = (.*?);$", s, re.M | re.S)
        if not m:
            continue
        for q in json.loads(m.group(1)):
            c = cuerpo(q.get("exp"))
            if c and len(c) >= 30:
                fuente.setdefault(clave(q), []).append((correcta(q), c, f))

    for destino in sys.argv[1:]:
        s = open(destino, encoding="utf-8").read()
        m = re.search(r"^const ALL_QUESTIONS = (.*?);$", s, re.M | re.S)
        qs = json.loads(m.group(1))
        puestas, distinta = 0, 0
        for q in qs:
            if cuerpo(q.get("exp")):
                continue
            cands = [x for x in fuente.get(clave(q), []) if x[2] != os.path.basename(destino)]
            if not cands:
                continue
            buenas = [x for x in cands if x[0] == correcta(q)]
            if not buenas:
                distinta += 1        # la copia se corrige distinto: no se toca
                continue
            q["exp"] = (q.get("exp") or "") + (" " if q.get("exp") else "") + buenas[0][1]
            puestas += 1
        if puestas:
            open(destino, "w", encoding="utf-8").write(
                s[:m.span(1)[0]] + json.dumps(qs, ensure_ascii=False, separators=(",", ":")) + s[m.span(1)[1]:])
        print("  %-28s copiadas %4d%s" % (os.path.basename(destino), puestas,
              " · %d con otra respuesta, sin tocar" % distinta if distinta else ""))


if __name__ == "__main__":
    main()
