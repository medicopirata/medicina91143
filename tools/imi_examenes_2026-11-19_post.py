#!/usr/bin/env python3
"""Correcciones posteriores a la carga de exámenes de IMI del 19-11-2026
(se pasa DESPUÉS de tools/imi_examenes_2026-11-19.py). Datos en
apuntes_extra/imi-examenes-2026-11-19/post.json y las transcripciones completas de los
ayudantes en apuntes_extra/imi-examenes-2026-11-19/work/<clave>_todas.json.

1. `caida`: a cada pregunta de la plataforma que ya estaba (misma firma que una
   pregunta transcrita de un examen 📝) se le anota la convocatoria, para que el
   entrenador y el plan la ponderen como pregunta de examen.
2. `renombrar`: bancos que eran dos mitades del mismo examen.
3. `claves`: claves corregidas por plantillas oficiales (con la nueva explicación).
4. `dudosas`: preguntas marcadas `dudosa: 1` con una nota ⚠️ al final de la explicación.
5. `img`: figuras añadidas a preguntas que ya estaban sin ella.

Idempotente. Uso: python3 tools/imi_examenes_2026-11-19_post.py plataforma_medint.html
"""
import collections, json, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cargar_examenes_wuolah import firma, parecido, tiene_opcion, UMBRAL  # noqa: E402

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXTRA = os.path.join(RAIZ, "apuntes_extra", "imi-examenes-2026-11-19")


def limpio(t):
    return re.sub(r"^\W+", "", t).strip()


def main(ruta):
    s = open(ruta, encoding="utf-8").read()
    m = re.search(r"const ALL_QUESTIONS = (\[.*?\]);\n", s, re.S)
    qs = json.loads(m.group(1))
    Q = {q["id"]: q for q in qs}
    post = json.load(open(os.path.join(EXTRA, "post.json"), encoding="utf-8"))
    res = collections.Counter()

    # 2. renombrar bancos (antes de anotar caida, para que el nombre nuevo no se autoanote)
    for viejo, nuevo, desplaza in post.get("renombrar", []):
        for q in qs:
            if q["topicBase"] == viejo:
                q["topic"] = nuevo + q["topic"][len(viejo):]
                q["topicBase"] = nuevo
                q["origQ"] = (q.get("origQ") or 0) + desplaza
                res["renombradas"] += 1

    # 1. caida
    base = [(firma(q), q) for q in qs]
    por_tok = collections.defaultdict(list)
    for i, (f, _) in enumerate(base):
        for w in f:
            por_tok[w].append(i)
    for fuente in post.get("caida", []):
        campo = fuente.get("campo_clave", "correct")
        for p in json.load(open(os.path.join(EXTRA, "work", fuente["todas"]), encoding="utf-8")):
            if not p.get("options") or len(p["options"]) < 2:
                continue
            # el banco puede venir en cada pregunta (transcripciones de varios exámenes)
            banco = p["banco"] if fuente.get("banco_en_item") else fuente["banco"]
            if not banco.startswith("📝"):
                continue
            nombre = limpio(banco)
            c = p.get(campo)
            cand = {"q": p["q"], "options": p["options"], "correct": c if isinstance(c, int) and 0 <= c < len(p["options"]) else None}
            f = firma(cand)
            cnt = collections.Counter(i for w in f for i in por_tok.get(w, ()))
            mejor, quien = 0, None
            for i, _ in cnt.most_common(60):
                x = parecido(f, base[i][0])
                if x > mejor and (cand["correct"] is None or tiene_opcion(cand, base[i][1])):
                    mejor, quien = x, base[i][1]
            if mejor < UMBRAL or quien is None:
                continue
            if limpio(quien["topicBase"]) == nombre or quien["topic"].startswith(banco):
                continue
            if nombre not in quien.setdefault("caida", []):
                quien["caida"].append(nombre)
                res["caida"] += 1

    # 3. claves
    for c in post.get("claves", []):
        q = Q[c["id"]]
        assert c["antes"] in q["options"][q["correct"]], (c["id"], q["options"][q["correct"]])
        q["correct"] = c["correct"]
        assert c["texto"] in q["options"][q["correct"]], (c["id"], q["options"][q["correct"]])
        q["exp"] = c["exp"]
        q.pop("dudosa", None)
        res["claves"] += 1

    # 4. dudosas
    for d in post.get("dudosas", []):
        q = Q[d["id"]]
        q["dudosa"] = 1
        if d["nota"] not in q["exp"]:
            q["exp"] = q["exp"].rstrip() + "\n\n⚠️ " + d["nota"]
        res["dudosas"] += 1

    # 5. img
    for i in post.get("img", []):
        q = Q[i["id"]]
        assert os.path.exists(os.path.join(RAIZ, i["img"])), i["img"]
        q["img"] = i["img"]
        q["ns"] = 1
        res["img"] += 1

    counts = collections.Counter(q["topic"] for q in qs)
    s = s[:m.start()] + "const ALL_QUESTIONS = %s;\n" % json.dumps(qs, ensure_ascii=False) + s[m.end():]
    s = re.sub(r"const TOPIC_COUNTS = \{.*?\};\n",
               lambda _: "const TOPIC_COUNTS = %s;\n" % json.dumps(dict(counts), ensure_ascii=False),
               s, count=1, flags=re.S)
    open(ruta, "w", encoding="utf-8").write(s)
    print(dict(res), "| total", len(qs))


if __name__ == "__main__":
    main(sys.argv[1])
