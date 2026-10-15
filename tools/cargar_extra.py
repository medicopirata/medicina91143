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

    # Los ids se conservan por pregunta, no por posición: si una pregunta ya
    # estaba (mismo banco y mismo enunciado) se queda con su id, pase lo que
    # pase con el orden en que se carguen los JSON. Si el id dependiera del
    # orden, cargar dos ficheros al revés le cambiaría el id a todo y el
    # progreso guardado dejaría de corresponder.
    # Cola por (banco, enunciado): si un banco repite enunciado —pasa en las
    # preguntas de imagen, «El 1 es…»— cada repetición recupera su propio id
    # en el mismo orden en que estaba.
    previos = collections.defaultdict(list)
    for q in qs:
        if q["id"] >= ID_BASE:
            previos[(q["topic"], q["q"])].append(q["id"])
    ocupados = {q["id"] for q in qs if q["id"] >= ID_BASE}

    antes = len(qs)
    qs = [q for q in qs if q["topic"] not in nombres]
    quitadas = antes - len(qs)

    reservados = {i for b in bancos for p in b["preguntas"]
                  for i in previos.get((b["banco"], p["q"]), [])}
    libres = (i for i in range(ID_BASE, ID_BASE + 100000)
              if i not in ocupados and i not in reservados)

    nuevas, heredados = 0, 0
    for b in bancos:
        for i, p in enumerate(b["preguntas"], 1):
            if not (0 <= p["correct"] < len(p["options"])):
                sys.exit("clave fuera de rango en «%s» pregunta %d" % (b["banco"], i))
            if not (p.get("exp") or "").strip():
                sys.exit("pregunta sin explicación en «%s» nº %d" % (b["banco"], i))
            cola = previos.get((b["banco"], p["q"]))
            if cola:
                idq = cola.pop(0)
                heredados += 1
            else:
                idq = next(libres)
                nuevas += 1
            qs.append({
                "id": idq, "topic": b["banco"], "topicBase": b["banco"],
                "fileId": idq, "origQ": i, "q": p["q"], "options": p["options"],
                "correct": p["correct"], "exp": p["exp"], "n": i,
            })

    counts = collections.Counter(q["topic"] for q in qs)
    s = s[:m.start()] + "const ALL_QUESTIONS = %s;\n" % json.dumps(qs, ensure_ascii=False) + s[m.end():]
    s = re.sub(r"const TOPIC_COUNTS = \{.*?\};\n",
               "const TOPIC_COUNTS = %s;\n" % json.dumps(dict(counts), ensure_ascii=False),
               s, count=1, flags=re.S)
    open(ruta_html, "w", encoding="utf-8").write(s)

    print("%s: %d preguntas (%d sustituidas, %d con id conservado, %d nuevas)"
          % (ruta_html, len(qs), quitadas, heredados, nuevas))
    for b in bancos:
        print("   %3d  %s" % (len(b["preguntas"]), b["banco"]))
    print("  sin explicación en toda la plataforma: %d"
          % sum(1 for q in qs if not (q.get("exp") or "").strip()))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2:])
