#!/usr/bin/env python3
"""Histología Esp. I: carga bancos «Apuntes: …» de un JSON (formato de
apuntes_extra/histo-bloque*.json) SIN mover ningún id ni banco.

- Banco nuevo: se añade AL FINAL de ALL_QUESTIONS con ids tras el máximo.
- Banco que ya existe: sus preguntas conservan sus ids por posición (se
  reescribe el contenido); si el JSON trae más, las de más van con ids nuevos.
- TOPIC_COUNTS se recalcula conservando el orden de las claves (las nuevas al final).
- Idempotente. NO llama a tools/indice_temas.py (a diferencia de add_apuntes.py).

Uso: python3 tools/histo_cargar_bancos_al_final.py plataforma_histologia2.1.html apuntes_extra/<archivo>.json
"""
import json, re, sys
ETIQUETA = {"A": "🎓 Dicha en clase.", "B": "📌 Deducida de sus pistas.",
            "C": "🤖 Propuesta por Claude, no dicha en clase.", "D": "🖼️ Pregunta con imagen."}
ruta, rjson = sys.argv[1], sys.argv[2]
h = open(ruta, encoding="utf-8").read()
def span(nombre):
    m = re.search(r'^const %s = (.*?);$' % nombre, h, re.M | re.S); return json.loads(m.group(1)), m.span(1)
Q, sq = span("ALL_QUESTIONS")
datos = json.load(open(rjson, encoding="utf-8"))
siguiente = max(q["id"] for q in Q) + 1
nuevas_tot = 0
for b in datos["bancos"]:
    nombre = b["banco"]; assert nombre.startswith("Apuntes:"), nombre
    viejos = [q for q in Q if q["topicBase"] == nombre]
    ids = [q["id"] for q in viejos]
    objs = []
    for i, p in enumerate(b["preguntas"], 1):
        assert 0 <= p["correct"] < len(p["options"]), p["q"]
        if i <= len(ids): qid = ids[i - 1]
        else: qid = siguiente; siguiente += 1; nuevas_tot += 1
        et = ETIQUETA.get(p.get("g", ""), "")
        exp = p.get("exp", "").strip()
        objs.append({"id": qid, "topic": nombre, "topicBase": nombre, "fileId": qid, "origQ": i,
                     "q": p["q"], "options": p["options"], "correct": p["correct"],
                     "exp": (et + " " + exp).strip() if et else exp, "n": i,
                     **({"img": p["img"]} if p.get("img") else {})})
    if len(ids) > len(objs): raise SystemExit("El banco %r perdería preguntas (%d → %d)" % (nombre, len(ids), len(objs)))
    if viejos:
        pos = [i for i, q in enumerate(Q) if q["topicBase"] == nombre]
        extra = objs[len(pos):]
        for k, i in enumerate(pos): Q[i] = objs[k]
        Q[pos[-1] + 1:pos[-1] + 1] = extra
    else:
        Q.extend(objs)
    print("  %s — %d (%s)" % (nombre, len(objs), "ids %d–%d" % (min(o["id"] for o in objs), max(o["id"] for o in objs))))
ids = [q["id"] for q in Q]; assert len(ids) == len(set(ids)), "ids repetidos"
C, _ = span("TOPIC_COUNTS")
cuenta = {}
for q in Q: cuenta[q["topicBase"]] = cuenta.get(q["topicBase"], 0) + 1
nuevo = {k: cuenta[k] for k in C if k in cuenta}
for k in cuenta:
    if k not in nuevo: nuevo[k] = cuenta[k]
dump = lambda o: json.dumps(o, ensure_ascii=False, separators=(",", ":"))
h = h[:sq[0]] + dump(Q) + h[sq[1]:]
_, sc = span("TOPIC_COUNTS")
h = h[:sc[0]] + dump(nuevo) + h[sc[1]:]
open(ruta, "w", encoding="utf-8").write(h)
print("  total %d preguntas, %d nuevas" % (len(Q), nuevas_tot))
