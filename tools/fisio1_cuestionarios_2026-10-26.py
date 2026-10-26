#!/usr/bin/env python3
"""Fisio I: cuestionarios del 26-10-2026 (pestañas «Tests de la plataforma» y
«Cuestionarios de prácticas y seminarios» del doc).

Datos en apuntes_extra/fisio1-cuestionarios-2026-10-26.json:
- `nuevas`:
    · P6.1, pregunta 1 del cuestionario en papel 6 (renal, Dra. García Alloza): la BAT30
      editada, con DOS opciones falsas (b y d). Se desdobla en una pregunta por opción
      válida, como en 5121f23, en un banco nuevo al final «🎯 Cuestionario en papel 6 ·
      Renal (26/10)» (🎯 → profesor, como el cuestionario en papel 3).
    · PR1.C1, la única nueva del cuestionario-lección de la Práctica 1 del campus
      (2026-27): se añade al final de su banco «🔬 Práctica 1 · Electrocardiografía».
- `marcas`: las que ya estaban (P6.2–P6.5 = BAT31, 33, 34 y 37; PR1.C2–C5 = P1.1, 1.2,
  1.5 y 1.6): se les anota el cuestionario en `q.caida` («cayó en…» del entrenador).

Idempotente: lo cargado por este script (por `n`) se sustituye conservando cada id por
(banco, enunciado, texto de la respuesta correcta); los ids nuevos van tras el máximo y no
se toca ningún id ni contenido de lo que ya estaba.

Uso: python3 tools/fisio1_cuestionarios_2026-10-26.py [plataforma_fisio1.html]
"""
import collections, json, os, re, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATOS = os.path.join(RAIZ, "apuntes_extra", "fisio1-cuestionarios-2026-10-26.json")
NOTA = ("▸ En el cuestionario había dos opciones falsas. Está desdoblada en una pregunta por "
        "cada una, las dos en este mismo banco; en esta versión la falsa es «%s».")


def versiones(p):
    extra = [i for i in p.get("also", []) if i != p["correct"]]
    if not extra:
        return [(p["options"], p["correct"], p["exp"])]
    salida = []
    for c in [p["correct"]] + sorted(extra):
        fuera = {x for x in [p["correct"]] + extra if x != c}
        quedan = [i for i in range(len(p["options"])) if i not in fuera]
        corta = p["options"][c].rstrip(".")
        corta = corta if len(corta) <= 90 else corta[:87].rstrip() + "…"
        exp = "%s %s %s" % (p["versiones"][str(c)], NOTA % corta, p.get("origen", ""))
        salida.append(([p["options"][i] for i in quedan], quedan.index(c), exp.strip()))
    return salida


def main(ruta):
    s = open(ruta, encoding="utf-8").read()
    m = re.search(r"const ALL_QUESTIONS = (\[.*?\]);\n", s, re.S)
    qs = json.loads(m.group(1))
    tc = re.search(r"const TOPIC_COUNTS = (\{.*?\});\n", s, re.S)
    orden_bancos = list(json.loads(tc.group(1)))
    datos = json.load(open(DATOS, encoding="utf-8"))
    mias = {(p["banco"], p["cod"]) for p in datos["nuevas"]}

    def clave(q):
        return (q["topic"], q["q"], q["options"][q["correct"]])
    previos = {clave(q): q["id"] for q in qs if (q["topic"], q.get("n")) in mias}
    qs = [q for q in qs if (q["topic"], q.get("n")) not in mias]
    por_id = {q["id"]: q for q in qs}

    marcadas = 0
    for mk in datos["marcas"]:
        q = por_id[mk["id"]]
        if mk["caida"] not in q.setdefault("caida", []):
            q["caida"].append(mk["caida"])
            marcadas += 1

    sig = max([q["id"] for q in qs] + list(previos.values())) + 1
    origq = collections.Counter()
    for q in qs:
        if isinstance(q.get("origQ"), int):
            origq[q["topic"]] = max(origq[q["topic"]], q["origQ"])
    nuevas = collections.defaultdict(list)
    for p in datos["nuevas"]:
        for opciones, correcta, exp in versiones(p):
            assert 0 <= correcta < len(opciones) and len(exp) >= 60, p["cod"]
            q = {"topic": p["banco"], "q": p["q"], "options": opciones, "correct": correcta}
            idq = previos.get(clave(q))
            if idq is None:
                idq, sig = sig, sig + 1
            origq[p["banco"]] += 1
            nuevas[p["banco"]].append(idq)
            qs.append({"id": idq, "topic": p["banco"], "topicBase": p["banco"], "fileId": idq,
                       "origQ": origq[p["banco"]], "q": p["q"], "options": opciones,
                       "correct": correcta, "exp": exp, "n": p["cod"]})

    orden = orden_bancos + [b for b in dict.fromkeys(q["topic"] for q in qs) if b not in orden_bancos]
    cuenta = collections.Counter(q["topic"] for q in qs)
    counts = {b: cuenta[b] for b in orden if cuenta[b]}
    s = s[:m.start()] + "const ALL_QUESTIONS = %s;\n" % json.dumps(qs, ensure_ascii=False) + s[m.end():]
    s = re.sub(r"const TOPIC_COUNTS = \{.*?\};\n",
               lambda _: "const TOPIC_COUNTS = %s;\n" % json.dumps(counts, ensure_ascii=False),
               s, count=1, flags=re.S)
    open(ruta, "w", encoding="utf-8").write(s)
    print("total", len(qs), "| marcas nuevas", marcadas, "| añadidas", dict(nuevas))


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(RAIZ, "plataforma_fisio1.html"))
