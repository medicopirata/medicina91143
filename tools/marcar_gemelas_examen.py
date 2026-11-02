#!/usr/bin/env python3
"""Marca como «cayó en examen» las preguntas que son la misma que una de examen con otra redacción.

Uso:  python3 tools/marcar_gemelas_examen.py <plataforma.html> [--prueba]

entrenador.js ya reconoce una pregunta de examen repetida en otro banco cuando el
enunciado es idéntico. Esto cubre las que cambian algo la redacción («Señale cuál
de los siguientes…» / «¿Cuál de los siguientes…?», «la sinusoide» / «el
sinusoide»): mismo enunciado en un 70 % de sus palabras y misma respuesta
correcta. A esas les añade en "caida" el nombre del banco de examen (como hacen
ya los cargadores de exámenes), así que el plan, el entrenador y la sala les dan
el peso de una pregunta de examen.

Solo añade: no quita ningún "caida" que hubiera. Es idempotente.
"""
import json, os, re, sys, unicodedata
from collections import defaultdict

K = "const ALL_QUESTIONS = "
# Lo mismo que RE_EXAMEN y limpio() de entrenador.js
RE_EXAMEN = re.compile(r"ex[aá]men(es)?|parcial|convocatoria|\bglobal\b|\b(enero|febrero|junio|julio|septiembre|diciembre)\b|a[ñn]os anteriores", re.I)


def limpio(t):
    return re.sub(r"^[^A-Za-zÁÉÍÓÚÑáéíóúñ0-9¿¡«]+", "", t).strip()


def norma(x):
    return re.sub(r"[^a-z0-9]+", " ", unicodedata.normalize("NFD", str(x).lower()).encode("ascii", "ignore").decode()).strip()


def toks(x):
    return {w for w in norma(x).split() if len(w) >= 4}


def jac(a, b):
    return len(a & b) / len(a | b) if a and b else 0


def correcta(q):
    c = q.get("correct")
    return q["options"][c] if isinstance(c, int) and 0 <= c < len(q.get("options", [])) else None


def main():
    if len(sys.argv) < 2: raise SystemExit(__doc__)
    html = sys.argv[1]
    s = open(html, encoding="utf-8").read()
    i = s.index(K) + len(K)
    qs, fin = json.JSONDecoder().raw_decode(s[i:])
    es_examen = lambda q: q["topicBase"].startswith("📝") and RE_EXAMEN.search(q["topicBase"])
    ex = [q for q in qs if es_examen(q) and correcta(q) is not None]
    exactos = {norma(q["q"]) for q in ex}
    inv = defaultdict(set)
    T = []
    for k, q in enumerate(ex):
        T.append((toks(q["q"]), toks(correcta(q)), norma(correcta(q))))
        for w in T[-1][0]: inv[w].add(k)
    n = 0
    for q in qs:
        if es_examen(q) or norma(q["q"]) in exactos or correcta(q) is None: continue
        a, ca, na = toks(q["q"]), toks(correcta(q)), norma(correcta(q))
        if len(a) < 4: continue
        cuenta = defaultdict(int)
        for w in a:
            for k in inv.get(w, ()): cuenta[k] += 1
        bancos = []
        for k, c in cuenta.items():
            if c < 3: continue
            if jac(a, T[k][0]) >= 0.7 and (na == T[k][2] or jac(ca, T[k][1]) >= 0.8):
                b = limpio(ex[k]["topicBase"])
                if b not in bancos: bancos.append(b)
        nuevos = [b for b in bancos if b not in (q.get("caida") or [])]
        if nuevos:
            q["caida"] = (q.get("caida") or []) + nuevos
            n += 1
    print("%s: %d preguntas de examen · %d gemelas con otra redacción marcadas" % (os.path.basename(html), len(ex), n))
    if "--prueba" in sys.argv: return
    s = s[:i] + json.dumps(qs, ensure_ascii=False) + s[i + fin:]
    open(html, "w", encoding="utf-8").write(s)


main()
