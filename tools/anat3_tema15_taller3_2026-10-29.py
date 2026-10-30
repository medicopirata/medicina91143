#!/usr/bin/env python3
"""Anatomía 3, carga del 29-10-2026 (Parte 2, rev 73): Tema 15 (Ordóñez,
globo ocular y anexos; solo transcripción, sin diapositivas aún) y Taller 3
(normas del cráneo I). Idempotente.

Lee apuntes_extra/anat3-tema15-taller3-2026-10-29.json y:
- mete los bancos «Apuntes:» detrás de los de Ordóñez ya cargados y el
  «⭐ Imágenes clave · Taller 3 …» al final de ALL_QUESTIONS, con los ids del
  JSON (si ya estaban, los sustituye sin mover nada);
- pone al día TOPIC_COUNTS y el orden de la sección de imágenes;
- añade las fichas de rellenar al final de rellenar-anat3-ejercicios.json
  (si no estaban).
Uso: python3 tools/anat3_tema15_taller3_2026-10-29.py
"""
import json, re, os
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
H = os.path.join(R, "plataforma_anatomia3.html")
X = json.load(open(os.path.join(R, "apuntes_extra/anat3-tema15-taller3-2026-10-29.json"), encoding="utf-8"))
nuevas = X["preguntas"]
bancos = list(dict.fromkeys(q["topic"] for q in nuevas))
s = open(H, encoding="utf-8").read()
m = re.search(r"const ALL_QUESTIONS = (\[.*?\]);\n", s, re.S)
qs = json.loads(m.group(1))
ids_nuevos = {q["id"] for q in nuevas}
qs = [q for q in qs if q["topic"] not in bancos]
choque = ids_nuevos & {q["id"] for q in qs}
assert not choque, choque
ap = [q for q in nuevas if q["topic"].startswith("Apuntes:")]
im = [q for q in nuevas if not q["topic"].startswith("Apuntes:")]
# detrás del último banco «Apuntes: … (Ordóñez)»
pos = max(i for i, q in enumerate(qs) if q["topic"].startswith("Apuntes:") and "(Ordóñez)" in q["topic"]) + 1
qs = qs[:pos] + ap + qs[pos:] + im
s = s[:m.start(1)] + json.dumps(qs, ensure_ascii=False) + s[m.end(1):]
m = re.search(r"const TOPIC_COUNTS = (\{.*?\});\n", s, re.S)
tc = {}
for q in qs:
    tc[q["topic"]] = tc.get(q["topic"], 0) + 1
s = s[:m.start(1)] + json.dumps(tc, ensure_ascii=False) + s[m.end(1):]
m = re.search(r"(SECTIONS\.push\(\{id:'imgclase'.*?ord:)(\{.*?\})", s)
orden = json.loads(m.group(2))
for b in bancos:
    if not b.startswith("Apuntes:") and b not in orden:
        orden[b] = max(orden.values()) + 1
s = s[:m.start(2)] + json.dumps(orden, ensure_ascii=False, separators=(",", ":")) + s[m.end(2):]
open(H, "w", encoding="utf-8").write(s)
print("plataforma:", len(qs), "preguntas;", {b: tc[b] for b in bancos})
RJ = os.path.join(R, "apuntes_extra/rellenar-anat3-ejercicios.json")
ej = json.load(open(RJ, encoding="utf-8"))
ya = {e["img"] for e in ej}
añadidas = [f for f in X["fichas"] if f["img"] not in ya]
if añadidas:
    ej += añadidas
    json.dump(ej, open(RJ, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("fichas:", len(ej), "(+%d)" % len(añadidas))
