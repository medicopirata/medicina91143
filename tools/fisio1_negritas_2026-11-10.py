#!/usr/bin/env python3
"""Fisio I: carga las preguntas de la pestaña «Negritas de las presentaciones» del doc
(nodo 1c85f574-8026, rev 10; 132 preguntas N1–N132, 6 por tema, Temas 10–31) desde
apuntes_extra/fisio1-negritas-2026-11-10.json.

- `bancos`: un banco por tema, «Apuntes: Negritas · Tema N — <título>» (con «Apuntes:» para
  que entre en la sección 📓 Apuntes de clase y el entrenador lo trate como de clase; el
  prefijo ⭐ lo da entrenador.js por «imagen que marcó el profesor»). Se cargan con
  tools/add_apuntes.py SIN regenerar el índice de temas.
- `ya_estaban`: las 7 que, cotejadas por conjunto de opciones, ya estaban en la plataforma
  (misma pregunta y misma clave). No se duplican: se les anota «Negritas de las
  presentaciones» en `q.caida`.
Las explicaciones están escritas desde los apuntes de cada tema, no copiadas del doc.

Idempotente. Uso: python3 tools/fisio1_negritas_2026-11-10.py [plataforma_fisio1.html]
"""
import importlib.util, json, os, re, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATOS = os.path.join(RAIZ, "apuntes_extra", "fisio1-negritas-2026-11-10.json")
html = sys.argv[1] if len(sys.argv) > 1 else os.path.join(RAIZ, "plataforma_fisio1.html")

spec = importlib.util.spec_from_file_location("add_apuntes", os.path.join(RAIZ, "tools", "add_apuntes.py"))
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
mod.regenerar_indice = lambda ruta: print("  índice: sin regenerar (a propósito)")
sys.argv = [sys.argv[0], html, DATOS]
mod.main()

datos = json.load(open(DATOS, encoding="utf-8"))
s = open(html, encoding="utf-8").read()
m = re.search(r'^const ALL_QUESTIONS = (.*?);$', s, re.M | re.S)
qs = json.loads(m.group(1))
por_id = {q["id"]: q for q in qs}
n = 0
for x in datos["ya_estaban"]:
    q = por_id[x["id"]]
    if x["caida"] not in q.setdefault("caida", []):
        q["caida"].append(x["caida"]); n += 1
s = s[:m.start(1)] + json.dumps(qs, ensure_ascii=False, separators=(",", ":")) + s[m.end(1):]
open(html, "w", encoding="utf-8").write(s)
print("  ya estaban: %d (marcas nuevas en caida: %d)" % (len(datos["ya_estaban"]), n))
