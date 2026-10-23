#!/usr/bin/env python3
"""Fisio I: pestañas «Preguntas de cursos anteriores» del doc (subidas el 23-10-2026).

Datos en apuntes_extra/fisio1-cursos-anteriores-2026-10-23.json (cotejo hecho a mano
contra la plataforma):
- `marcas`: preguntas que ya estaban. Se les anota en `q.caida` de dónde salió
  («Tests de clase 2025/26» para la batería de tests de clase del curso pasado;
  «Exámenes de cursos anteriores (recopilación)» para las de los bancos recopilados de
  exámenes, solo cuando la pregunta no estaba ya en un banco de examen, para no contar
  dos veces la misma convocatoria). entrenador.js lo lee como «cayó en…».
- `nuevas`: las que no estaban, en bancos «📝 Exámenes de cursos anteriores · <bloque>»
  (📝 + «exámenes» → Entrenador.origen las da como examen). Ids desde el máximo + 1.

Idempotente: los bancos nuevos se sustituyen conservando cada id por (banco, enunciado)
y las marcas no se repiten. No toca ids ni contenido de lo que ya estaba.

Uso: python3 tools/fisio1_cursos_anteriores_2026-10-23.py [plataforma_fisio1.html]
"""
import collections, json, os, re, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATOS = os.path.join(RAIZ, "apuntes_extra", "fisio1-cursos-anteriores-2026-10-23.json")


def main(ruta):
    s = open(ruta, encoding="utf-8").read()
    m = re.search(r"const ALL_QUESTIONS = (\[.*?\]);\n", s, re.S)
    qs = json.loads(m.group(1))
    datos = json.load(open(DATOS, encoding="utf-8"))
    nombres = {p["banco"] for p in datos["nuevas"]}

    previos = {(q["topic"], q["q"]): q["id"] for q in qs if q["topic"] in nombres}
    qs = [q for q in qs if q["topic"] not in nombres]
    por_id = {q["id"]: q for q in qs}

    marcadas = 0
    for mk in datos["marcas"]:
        q = por_id[mk["id"]]
        if mk["caida"] not in q.setdefault("caida", []):
            q["caida"].append(mk["caida"])
            marcadas += 1

    sig = max([q["id"] for q in qs] + list(previos.values())) + 1
    origq = collections.Counter()
    for p in datos["nuevas"]:
        assert 0 <= p["correct"] < len(p["options"]) and len(p["exp"]) >= 60, p["cod"]
        idq = previos.get((p["banco"], p["q"]))
        if idq is None:
            idq, sig = sig, sig + 1
        origq[p["banco"]] += 1
        qs.append({"id": idq, "topic": p["banco"], "topicBase": p["banco"], "fileId": idq,
                   "origQ": origq[p["banco"]], "q": p["q"], "options": p["options"],
                   "correct": p["correct"], "exp": p["exp"], "n": p["cod"]})

    counts = collections.Counter(q["topic"] for q in qs)
    s = s[:m.start()] + "const ALL_QUESTIONS = %s;\n" % json.dumps(qs, ensure_ascii=False) + s[m.end():]
    s = re.sub(r"const TOPIC_COUNTS = \{.*?\};\n",
               lambda _: "const TOPIC_COUNTS = %s;\n" % json.dumps(dict(counts), ensure_ascii=False),
               s, count=1, flags=re.S)
    open(ruta, "w", encoding="utf-8").write(s)
    print("marcas nuevas", marcadas, "| preguntas nuevas", len(datos["nuevas"]),
          "| bancos", dict((b, counts[b]) for b in sorted(nombres)))


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(RAIZ, "plataforma_fisio1.html"))
