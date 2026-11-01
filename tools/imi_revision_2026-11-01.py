#!/usr/bin/env python3
"""Aplica la revisión de claves, opciones y explicaciones de IMI (01-11-2026).

Uso:  python3 tools/imi_revision_2026-11-01.py [--prueba]

Lee apuntes_extra/imi-revision-2026-11-01.json (lista de cambios por id, unión
de los cambiosNN.json de la revisión por lotes) y los aplica a
plataforma_medint.html:
  - "correct": solo si "confianza" es «alta». Guarda la clave anterior en
    "correctAntes" (si ya existe, no la pisa).
  - "options": solo si tiene el mismo número de opciones. Guarda las anteriores
    en "optionsAntes".
  - "q": corrige erratas del enunciado (la original va a "qErrata").
  - "img": imagen que faltaba (ruta en el repo; solo si existe).
  - "exp": explicación nueva.
Es idempotente: aplicar dos veces no cambia nada la segunda.
"""
import json, os, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HTML = os.path.join(RAIZ, "plataforma_medint.html")
DATOS = os.path.join(RAIZ, "apuntes_extra", sys.argv[1] if len(sys.argv) > 1 and sys.argv[1].endswith(".json") else "imi-revision-2026-11-01.json")
K = "const ALL_QUESTIONS = "


def main():
    prueba = "--prueba" in sys.argv
    s = open(HTML, encoding="utf-8").read()
    i = s.index(K) + len(K)
    qs, fin = json.JSONDecoder().raw_decode(s[i:])
    por_id = {q["id"]: q for q in qs}
    cambios = json.load(open(DATOS, encoding="utf-8"))
    n = {"clave": 0, "clave_media_sin_aplicar": 0, "opciones": 0, "enunciado": 0, "explicacion": 0, "id_inexistente": 0, "opciones_mal": 0}
    for c in cambios:
        q = por_id.get(c.get("id"))
        if not q: n["id_inexistente"] += 1; continue
        if "correct" in c and c["correct"] != q["correct"]:
            if c.get("confianza") == "alta" and isinstance(c["correct"], int) and 0 <= c["correct"] < len(q["options"]):
                q.setdefault("correctAntes", q["correct"]); q["correct"] = c["correct"]; n["clave"] += 1
            else:
                n["clave_media_sin_aplicar"] += 1
        if "options" in c and c["options"] != q["options"]:
            if isinstance(c["options"], list) and len(c["options"]) == len(q["options"]) and all(isinstance(o, str) and o.strip() for o in c["options"]):
                q.setdefault("optionsAntes", q["options"]); q["options"] = c["options"]; n["opciones"] += 1
            else:
                n["opciones_mal"] += 1
        if c.get("q") and c["q"] != q["q"]:
            q.setdefault("qErrata", q["q"]); q["q"] = c["q"]; n["enunciado"] += 1
        if c.get("img") and c["img"] != q.get("img"):
            if os.path.exists(os.path.join(RAIZ, c["img"])): q["img"] = c["img"]; n["imagen"] = n.get("imagen", 0) + 1
            else: n["imagen_no_existe"] = n.get("imagen_no_existe", 0) + 1
        if c.get("exp") and c["exp"] != q.get("exp"):
            q["exp"] = c["exp"]; n["explicacion"] += 1
    print(n)
    if prueba: return
    texto = json.dumps(qs, ensure_ascii=False)  # mismo formato que el archivo (una línea, separadores por defecto)
    s = s[:i] + texto + s[i + fin:]
    open(HTML, "w", encoding="utf-8").write(s)


main()
