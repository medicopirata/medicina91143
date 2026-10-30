#!/usr/bin/env python3
"""Fisio I: cuestionarios del 29-10-2026 (pestañas «Tests de la plataforma» y
«Cursos anteriores · Respiratorio» del doc, rev 19 y 13).

Datos en apuntes_extra/fisio1-cuestionarios-2026-10-29.json:
- `nuevas`:
    · P7.4–P7.8, preguntas 4–8 del cuestionario en papel 7 (renal 2, Dra. García Alloza,
      28/10/26), del Tema 23: banco nuevo al final «🎯 Cuestionario en papel 7 · Renal 2
      (28/10)» (🎯 → profesor, como los cuestionarios en papel 3 y 6).
    · WUO1, la única pregunta nueva de las baterías de Wuolah (bloque 2, Tema 10): se añade
      al final de su banco «Bloque 2: Respiratorio», como las PRE de b3dbbf9.
- `marcas`: P7.1–P7.3 = BAT32 (ids 126 y 330), BAT38 (131) y BAT39 (132): se les anota el
  cuestionario en `q.caida` («cayó en…» del entrenador).

Idempotente: lo cargado por este script (por `n`) se sustituye conservando cada id por
(banco, enunciado, texto de la respuesta correcta); los ids nuevos van tras el máximo y no
se toca ningún id ni contenido de lo que ya estaba. Mismo código que
tools/fisio1_cuestionarios_2026-10-26.py.

Uso: python3 tools/fisio1_cuestionarios_2026-10-29.py [plataforma_fisio1.html]
"""
import collections, json, os, re, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATOS = os.path.join(RAIZ, "apuntes_extra", "fisio1-cuestionarios-2026-10-29.json")
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
