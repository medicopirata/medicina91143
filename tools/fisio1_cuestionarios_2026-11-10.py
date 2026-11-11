#!/usr/bin/env python3
"""Fisio I: cuestionarios en papel 11 y 12 del 10-11-2026 (pestaña «Tests de la plataforma» rev 25
del doc; «Cursos anteriores · Endocrino» rev 19 solo añade notas de «salió en el cuestionario»).

Datos en apuntes_extra/fisio1-cuestionarios-2026-11-10.json:
- `nuevas`: P11.1–P11.5 (cuestionario 11, Tema 30, 10/11/26) en el banco nuevo al final
  «🎯 Cuestionario en papel 11 · Endocrino (10/11)», y P12.5 (cuestionario 12, Tema 31, 11/11/26)
  en «🎯 Cuestionario en papel 12 · Endocrino (11/11)».
- `marcas`: P12.1–P12.4 ya estaban (ids 192, 194, 195 y 196, tests de clase 2025/26): se les anota
  el cuestionario en `q.caida`.

Idempotente: lo cargado por este script (por `n`) se sustituye conservando cada id; los ids nuevos
van tras el máximo y no se mueve ningún id. Mismo código que tools/fisio1_cuestionarios_2026-10-31.py.

Uso: python3 tools/fisio1_cuestionarios_2026-11-10.py [plataforma_fisio1.html]
"""
import collections, json, os, re, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATOS = os.path.join(RAIZ, "apuntes_extra", "fisio1-cuestionarios-2026-11-10.json")


def main(ruta):
    s = open(ruta, encoding="utf-8").read()
    m = re.search(r"const ALL_QUESTIONS = (\[.*?\]);\n", s, re.S)
    qs = json.loads(m.group(1))
    tc = re.search(r"const TOPIC_COUNTS = (\{.*?\});\n", s, re.S)
    orden_bancos = list(json.loads(tc.group(1)))
    datos = json.load(open(DATOS, encoding="utf-8"))

    def clave(q):
        return (q["topic"], q["q"], q["options"][q["correct"]])

    mias = {(p["banco"], p["cod"]) for p in datos["nuevas"]}
    for d in datos["desdobles"]:
        q0 = next(q for q in qs if q["id"] == d["id"])
        mias.add((q0["topic"], d["cod_nueva"]))
    previos = {clave(q): q["id"] for q in qs if (q["topic"], q.get("n")) in mias}
    qs = [q for q in qs if (q["topic"], q.get("n")) not in mias]
    por_id = {q["id"]: q for q in qs}
    sig = max([q["id"] for q in qs] + list(previos.values())) + 1
    nuevas = collections.defaultdict(list)

    def alta(q):
        nonlocal sig
        idq = previos.get(clave(q))
        if idq is None:
            idq, sig = sig, sig + 1
        q = {"id": idq, "topic": q["topic"], "topicBase": q["topicBase"], "fileId": idq,
             **{k: v for k, v in q.items() if k not in ("topic", "topicBase")}}
        assert 0 <= q["correct"] < len(q["options"]) and len(q["exp"]) >= 60, q["q"][:60]
        qs.append(q)
        nuevas[q["topic"]].append(idq)

    # 1. Desdobles (antes que nada, sobre el original)
    for d in datos["desdobles"]:
        q = por_id[d["id"]]
        orig, c0 = d["opciones"], d["correct"]   # el original, guardado en el JSON
        quedan = [i for i in range(len(orig)) if i not in d["fuera"]]
        q["options"] = [orig[i] for i in quedan]
        q["correct"] = quedan.index(c0)
        q["exp"] = "%s %s %s" % (d["exp_comun"], d["nota"] % orig[c0].rstrip("."), d["origen"])
        q.pop("also", None)
        quedan2 = [i for i in range(len(orig)) if i not in d["nueva_fuera"]]
        c1 = orig.index(d["correct_nueva_texto"])
        alta({"topic": q["topic"], "topicBase": q["topicBase"], "origQ": q.get("origQ"),
              "q": q["q"], "options": [orig[i] for i in quedan2], "correct": quedan2.index(c1),
              "exp": "%s %s %s" % (d["exp_comun"], d["nota"] % orig[c1].rstrip("."), d["origen"]),
              "n": d["cod_nueva"]})

    # 2. Explicaciones ampliadas
    for e in datos["exp_anadir"]:
        q = por_id[e["id"]]
        if e["texto"] not in q["exp"]:
            q["exp"] = q["exp"].rstrip() + " " + e["texto"]

    # 3. Marcas «cayó en…»
    marcadas = 0
    for mk in datos["marcas"]:
        q = por_id[mk["id"]]
        if mk["caida"] not in q.setdefault("caida", []):
            q["caida"].append(mk["caida"])
            marcadas += 1

    # 4. Bancos nuevos
    origq = collections.Counter()
    for p in datos["nuevas"]:
        origq[p["banco"]] += 1
        alta({"topic": p["banco"], "topicBase": p["banco"], "origQ": origq[p["banco"]],
              "q": p["q"], "options": p["options"], "correct": p["correct"], "exp": p["exp"],
              "n": p["cod"]})

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
