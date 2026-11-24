#!/usr/bin/env python3
"""Anatomía 3, 24-11-2026: devuelve las 39 preguntas de la carga de Wuolah de octubre (ids 97000-97045) que la
carga de exámenes del 23-11 (tools/anat3_examenes_2026-11-23.py → cargar_examenes_wuolah.py) borró al rehacer
los bancos «📝 Recopilación de exámenes Anatomía II (sin fecha)» y los dos modelos del 23 febrero 2018.
La sala (baterías, «previa», «comprueba») y el historial del alumno las referencian por id.

- Las recupera de la versión e5ec5ef de la plataforma con su id de siempre.
- Si la carga del 23-11 trajo la misma pregunta con otro id (mismo enunciado), se queda el id antiguo con el
  texto, la clave, la explicación, la imagen y las «caídas» de la transcripción nueva (mejor leída) y se quita
  el duplicado nuevo.
Uso: python3 tools/anat3_restaurar_oct_2026-11-24.py [--prueba]
"""
import json, os, re, subprocess, sys, unicodedata

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
H = os.path.join(R, "plataforma_anatomia3.html")
VERSION = "e5ec5ef"
PRUEBA = "--prueba" in sys.argv


def norma(x):
    x = unicodedata.normalize("NFD", str(x).lower())
    return re.sub(r"[^a-z0-9]+", " ", "".join(c for c in x if unicodedata.category(c) != "Mn")).strip()


def preguntas(s): return json.loads(re.search(r"const ALL_QUESTIONS = (\[.*?\]);\n", s, re.S).group(1))


def main():
    viejo = subprocess.run(["git", "-C", R, "show", VERSION + ":plataforma_anatomia3.html"], capture_output=True, text=True, check=True).stdout
    antes = {q["id"]: q for q in preguntas(viejo)}
    s = open(H, encoding="utf-8").read()
    qs = preguntas(s)
    ahora = {q["id"]: q for q in qs}
    perdidas = [antes[i] for i in sorted(antes) if i not in ahora and 97000 <= i < 97046]
    por_q = {}
    for q in qs:
        if q["id"] >= 97500: por_q.setdefault(norma(q["q"]), []).append(q)
    quitar, fusionadas = set(), 0
    for q in perdidas:
        dup = [d for d in por_q.get(norma(q["q"]), []) if d["topic"] == q["topic"]] or por_q.get(norma(q["q"]), [])
        if dup:
            d = dup[0]
            for k in ("q", "options", "correct", "exp", "img", "caida", "w"):
                if k in d: q[k] = d[k]
                elif k in q and k in ("caida",): pass
            if d["correct"] != antes[q["id"]]["correct"]: q["correctAntes"] = antes[q["id"]]["correct"]
            quitar.add(d["id"]); fusionadas += 1
    qs = [q for q in qs if q["id"] not in quitar]
    for q in perdidas:
        pos = max((k for k, x in enumerate(qs) if x["topic"] == q["topic"]), default=len(qs) - 1) + 1
        qs.insert(pos, q)
    assert len({q["id"] for q in qs}) == len(qs)
    s = s[:s.index("const ALL_QUESTIONS = ") + len("const ALL_QUESTIONS = ")] + json.dumps(qs, ensure_ascii=False) + s[re.search(r"const ALL_QUESTIONS = (\[.*?\]);\n", s, re.S).end(1):]
    m2 = re.search(r"const TOPIC_COUNTS = (\{.*?\});\n", s, re.S)
    tc = {}
    for q in qs: tc[q["topic"]] = tc.get(q["topic"], 0) + 1
    s = s[:m2.start(1)] + json.dumps(tc, ensure_ascii=False) + s[m2.end(1):]
    print("recuperadas: %d (de ellas %d fundidas con su duplicado nuevo, que se quita: %s) · plataforma: %d" % (len(perdidas), fusionadas, sorted(quitar), len(qs)))
    if PRUEBA: return
    open(H, "w", encoding="utf-8").write(s)
    # referencias al duplicado nuevo en la sala y en la carga de avisos
    cambios = {d: q["id"] for q in perdidas for d in quitar if norma(ahora[d]["q"]) == norma(q["q"])}
    for f in [os.path.join(R, "estudio", "anat3", "tema-21.json"), os.path.join(R, "apuntes_extra", "anat3-avisos-2026-11-24.json")]:
        t = open(f, encoding="utf-8").read(); t0 = t
        for d, i in cambios.items(): t = re.sub(r"\b%d\b" % d, str(i), t)
        if t != t0: open(f, "w", encoding="utf-8").write(t); print("referencias cambiadas en", os.path.basename(f))


main()
