#!/usr/bin/env python3
"""Crea una plataforma nueva a partir de otra que ya funcione (por defecto, Genética).

Uso:  python3 tools/crear_plataforma.py <clave> "<Título>" "<emoji>" <preguntas.json> [--plantilla plataforma_genetica.html]

Copia el motor entero de la plantilla (entrenador, plan, sala de estudio, IA,
sincronización…) y solo cambia lo propio de la asignatura: título, cabecera,
STORAGE_KEY (<clave>_study_v1), ALL_QUESTIONS y TOPIC_COUNTS. Las preguntas del
JSON: lista de {id, topicBase, q, options, correct, exp, img?, caida?, cae?};
topic = topicBase salvo que se dé. Escribe plataforma_<clave>.html (no pisa uno
que ya exista: para añadir preguntas después, tools/imi_cargar_nuevas.py).

Después hay que darla de alta en: catalogo.js, escritorio.js, portada.js,
tools/indice_temas.py, tools/estudio_validar.py / estudio_material.py /
estudio_siglas.py (si lleva sala) y apuntes_volcar_instrucciones.md.
"""
import collections, json, os, re, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
K_Q, K_T = "const ALL_QUESTIONS = ", "const TOPIC_COUNTS = "


def main():
    a = [x for x in sys.argv[1:] if not x.startswith("--")]
    if len(a) != 4: raise SystemExit(__doc__)
    clave, titulo, emoji, datos = a
    plantilla = sys.argv[sys.argv.index("--plantilla") + 1] if "--plantilla" in sys.argv else "plataforma_genetica.html"
    destino = os.path.join(RAIZ, "plataforma_%s.html" % clave)
    if os.path.exists(destino): raise SystemExit("ya existe %s" % destino)
    s = open(os.path.join(RAIZ, plantilla), encoding="utf-8").read()
    qs = json.load(open(datos, encoding="utf-8"))
    ids = set()
    for q in qs:
        for k in ("id", "topicBase", "q", "options", "correct"):
            if k not in q: raise SystemExit("pregunta sin %s: %s" % (k, json.dumps(q, ensure_ascii=False)[:120]))
        if q["id"] in ids: raise SystemExit("id repetido %s" % q["id"])
        if not (isinstance(q["correct"], int) and 0 <= q["correct"] < len(q["options"])): raise SystemExit("correct fuera de rango en %s" % q["id"])
        ids.add(q["id"])
        q.setdefault("topic", q["topicBase"]); q.setdefault("fileId", q["id"]); q.setdefault("exp", "")
    n = collections.Counter()
    for q in qs:
        n[q["topicBase"]] += 1
        q.setdefault("origQ", n[q["topicBase"]])
    # ALL_QUESTIONS y TOPIC_COUNTS (una línea cada uno, como en el resto)
    i = s.index(K_Q) + len(K_Q); _, fin = json.JSONDecoder().raw_decode(s[i:])
    s = s[:i] + json.dumps(qs, ensure_ascii=False) + s[i + fin:]
    i = s.index(K_T) + len(K_T); _, fin = json.JSONDecoder().raw_decode(s[i:])
    s = s[:i] + json.dumps(dict(collections.Counter(q["topic"] for q in qs)), ensure_ascii=False) + s[i + fin:]
    # Lo propio de la asignatura
    viejo = re.search(r"const STORAGE_KEY = '([a-z0-9]+)_study_v1';", s).group(1)
    s = s.replace("const STORAGE_KEY = '%s_study_v1';" % viejo, "const STORAGE_KEY = '%s_study_v1';" % clave)
    s = re.sub(r"<title>[^<]*</title>", "<title>%s — Plataforma de Estudio</title>" % titulo, s, count=1)
    s = re.sub(r'(<div class="home-header">\s*<h1>)[^<]*(</h1>)', lambda m: m.group(1) + emoji + " " + titulo + m.group(2), s, count=1)
    open(destino, "w", encoding="utf-8").write(s)
    print("%s: %d preguntas en %d bancos (plantilla %s)" % (os.path.basename(destino), len(qs), len(n), plantilla))


main()
