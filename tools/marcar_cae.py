#!/usr/bin/env python3
"""Marca las preguntas sobre lo que el profesor dijo en clase que cae.

Uso:  python3 tools/marcar_cae.py <plataforma.html> <apuntes_extra/<clave>-cae-AAAA-MM-DD.json> [--prueba]

El JSON es una lista de {"id", "pista", "cita", "ruta", "f"}: la pregunta, la
idea que el profesor dijo que se pregunta, su cita breve, el apartado de los
apuntes de donde sale y la fuerza (2 = lo dijo expresamente, 1 = insistió o lo
puso entre las pistas). Se revisa a mano (o con ayudantes) leyendo los apuntes:
solo cuenta lo que viene del profesor.

A cada pregunta le pone q.cae = {"p": pista, "c": cita, "r": ruta, "f": fuerza}.
Con eso entrenador.js añade «🔴 El profesor dijo que cae» a su origen, el plan
de examen le da el peso de «🔴 Lo que el profesor dijo que cae» y la sala de
estudio la pone entre «las que más caen».

Solo añade: si una pregunta ya tenía marca, se queda la de más fuerza. Es idempotente.
"""
import json, os, sys

K = "const ALL_QUESTIONS = "


def main():
    if len(sys.argv) < 3: raise SystemExit(__doc__)
    html, datos = sys.argv[1], sys.argv[2]
    s = open(html, encoding="utf-8").read()
    i = s.index(K) + len(K)
    qs, fin = json.JSONDecoder().raw_decode(s[i:])
    por_id = {q["id"]: q for q in qs}
    n = {"marcadas": 0, "sin_cambio": 0, "id_inexistente": 0, "fuerza_2": 0}
    for x in json.load(open(datos, encoding="utf-8")):
        q = por_id.get(x.get("id"))
        if not q: n["id_inexistente"] += 1; continue
        nueva = {"p": str(x.get("pista", ""))[:300], "c": str(x.get("cita", ""))[:200], "r": str(x.get("ruta", ""))[:200], "f": 2 if x.get("f") == 2 else 1}
        vieja = q.get("cae")
        if vieja and (vieja == nueva or vieja.get("f", 1) > nueva["f"]): n["sin_cambio"] += 1; continue
        q["cae"] = nueva
        n["marcadas"] += 1
    n["fuerza_2"] = sum(1 for q in qs if (q.get("cae") or {}).get("f") == 2)
    n["total_con_marca"] = sum(1 for q in qs if q.get("cae"))
    print(os.path.basename(html), n)
    if "--prueba" in sys.argv: return
    s = s[:i] + json.dumps(qs, ensure_ascii=False) + s[i + fin:]
    open(html, "w", encoding="utf-8").write(s)


main()
