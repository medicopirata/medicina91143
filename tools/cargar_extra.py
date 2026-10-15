#!/usr/bin/env python3
"""Añade bancos sueltos a una plataforma sin tocar los ids existentes.

Para preguntas que escribo yo a partir de un apartado nuevo del doc y que, por
tanto, una reextracción de los apuntes no traería: viven en `apuntes_extra/` y
se cargan con esto.

Van AL FINAL de `ALL_QUESTIONS` y con ids a partir de ID_BASE (95000), por
encima del rango que `add_apuntes.py` reparte a los bancos «Apuntes:» (desde
90000 hacia arriba). Así ninguna pregunta ya existente cambia de id —el
progreso y la repetición espaciada van por `q.id`— y una recarga de apuntes no
los pisa.

Es idempotente: vuelve a cargar sustituyendo los bancos con el mismo nombre.

Uso:  python3 tools/cargar_extra.py <plataforma.html> <extra.json> [...]
"""
import json, re, sys, collections

ID_BASE = 95000


def main(ruta_html, rutas_json):
    s = open(ruta_html, encoding="utf-8").read()
    m = re.search(r"const ALL_QUESTIONS = (\[.*?\]);\n", s, re.S)
    qs = json.loads(m.group(1))

    bancos = []
    for r in rutas_json:
        bancos += json.load(open(r, encoding="utf-8"))["bancos"]
    nombres = {b["banco"] for b in bancos}

    antes = len(qs)
    qs = [q for q in qs if q["topic"] not in nombres]
    quitadas = antes - len(qs)

    choques = sorted({q["id"] for q in qs if q["id"] >= ID_BASE})
    sig = max(choques) + 1 if choques else ID_BASE

    nuevas = 0
    for b in bancos:
        for i, p in enumerate(b["preguntas"], 1):
            if not (0 <= p["correct"] < len(p["options"])):
                sys.exit("clave fuera de rango en «%s» pregunta %d" % (b["banco"], i))
            if not (p.get("exp") or "").strip():
                sys.exit("pregunta sin explicación en «%s» nº %d" % (b["banco"], i))
            qs.append({
                "id": sig, "topic": b["banco"], "topicBase": b["banco"],
                "fileId": sig, "origQ": i, "q": p["q"], "options": p["options"],
                "correct": p["correct"], "exp": p["exp"], "n": i,
            })
            sig += 1
            nuevas += 1

    counts = collections.Counter(q["topic"] for q in qs)
    s = s[:m.start()] + "const ALL_QUESTIONS = %s;\n" % json.dumps(qs, ensure_ascii=False) + s[m.end():]
    s = re.sub(r"const TOPIC_COUNTS = \{.*?\};\n",
               "const TOPIC_COUNTS = %s;\n" % json.dumps(dict(counts), ensure_ascii=False),
               s, count=1, flags=re.S)
    open(ruta_html, "w", encoding="utf-8").write(s)

    print("%s: %d preguntas (%d sustituidas, %d cargadas)"
          % (ruta_html, len(qs), quitadas, nuevas))
    for b in bancos:
        print("   %3d  %s" % (len(b["preguntas"]), b["banco"]))
    print("  sin explicación en toda la plataforma: %d"
          % sum(1 for q in qs if not (q.get("exp") or "").strip()))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2:])
