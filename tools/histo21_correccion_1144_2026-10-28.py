#!/usr/bin/env python3
"""Histología · pregunta 1144 (Test 1, tejido sanguíneo): la imagen es un eritroblasto
ortocromático y la corrección del Seminario 1 (P20, mismo enunciado y opciones) da
«c) Serie roja». La clave pasa de «Serie linfocitaria» a «Serie roja»; la explicación
anterior se guarda en `expAntes`. Idempotente."""
import json, os, re
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
p = os.path.join(RAIZ, "plataforma_histologia2.1.html")
s = open(p, encoding="utf-8").read()
m = re.search(r"const ALL_QUESTIONS = (\[.*?\]);\n", s, re.S)
qs = json.loads(m.group(1))
q = next(x for x in qs if x["id"] == 1144)
assert q["options"][2] == "Serie roja."
if q["correct"] != 2:
    q.setdefault("expAntes", q["exp"])
    q["correct"] = 2
    q["exp"] = ("Es un eritroblasto ortocromático (normoblasto): célula pequeña con núcleo redondo, muy denso y picnótico, "
                "y citoplasma ya acidófilo, casi del color del hematíe. Pertenece a la serie roja: es el último precursor "
                "con núcleo antes de expulsarlo y pasar a reticulocito. No es un linfocito, cuyo citoplasma es un ribete "
                "basófilo (azulado). Así lo corrige el Seminario 1 (pregunta 20): «Normoblasto en sangre = serie roja, no blanca».")
    s = s[:m.start()] + "const ALL_QUESTIONS = %s;\n" % json.dumps(qs, ensure_ascii=False) + s[m.end():]
    open(p, "w", encoding="utf-8").write(s)
    print("1144 corregida")
else:
    print("1144 ya estaba corregida")
