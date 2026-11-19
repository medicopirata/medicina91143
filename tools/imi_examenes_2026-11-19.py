#!/usr/bin/env python3
"""Carga en plataforma_medint.html los exámenes antiguos de IMI del 19-11-2026
(17 PDF de ~/Downloads transcritos por ayudantes; JSON en apuntes_extra/imi-examenes-2026-11-19/).

Cada objeto: {banco, q, options, correct, exp, n?, img?, nota?}.

A diferencia de tools/cargar_examenes_wuolah.py, AÑADE a los bancos existentes sin
sustituirlos (las preguntas antiguas conservan id, `caida`, `cae`, `dudosa`, `rev`…):
- Las que ya están (misma firma, Jaccard >= 0.6 y la correcta entre sus opciones) no se
  cargan; si vienen de un banco 📝 se les anota el examen en `caida` (entrenador.js y
  plan_examen.js las ponderan como preguntas de examen). Van al informe con si la clave
  coincide o no.
- Las nuevas reciben ids libres desde ID_BASE, `origQ` a continuación del mayor del
  banco, `n` = número en el documento, `img` (+ `ns`=1) si traen figura, y la `nota`
  se añade al final de `exp`.
- Idempotente: volver a pasarlo no duplica nada (las ya cargadas se reconocen por firma).

Uso: python3 tools/imi_examenes_2026-11-19.py plataforma_medint.html informe.json a.json [b.json …]
"""
import collections, json, re, sys, os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cargar_examenes_wuolah import firma, parecido, tiene_opcion, UMBRAL, nn  # noqa: E402

ID_BASE = 97000


def limpio(t):
    return re.sub(r"^\W+", "", t).strip()


def main(ruta_html, ruta_informe, rutas_json):
    s = open(ruta_html, encoding="utf-8").read()
    m = re.search(r"const ALL_QUESTIONS = (\[.*?\]);\n", s, re.S)
    qs = json.loads(m.group(1))
    nuevas = []
    for r in rutas_json:
        d = json.load(open(r, encoding="utf-8"))
        for p in d:
            p["_src"] = os.path.basename(r)
        nuevas += d

    base = [(firma(q), q) for q in qs]
    por_tok = collections.defaultdict(list)
    for i, (f, _) in enumerate(base):
        for w in f:
            por_tok[w].append(i)
    ocupados = {q["id"] for q in qs}
    libres = (i for i in range(ID_BASE, ID_BASE + 100000) if i not in ocupados)
    origq = collections.Counter()
    for q in qs:
        origq[q["topic"]] = max(origq[q["topic"]], q.get("origQ") or 0)

    inf = {"cargadas": [], "ya_estaban": [], "repetidas": [], "caida_anotada": 0, "por_banco": {}}

    def busca(p, pool):
        f = firma(p)
        cand = collections.Counter(i for w in f for i in por_tok.get(w, ()) if i < len(pool))
        mejor, quien = 0, None
        for i, _ in cand.most_common(60):
            x = parecido(f, pool[i][0])
            if x > mejor and tiene_opcion(p, pool[i][1]):
                mejor, quien = x, pool[i][1]
        return mejor, quien

    for p in nuevas:
        assert 0 <= p["correct"] < len(p["options"]), ("clave fuera de rango", p["q"][:60])
        assert len(p.get("exp", "")) >= 60, ("exp corta", p["q"][:60])
        assert len(p["options"]) >= 2 and p["banco"].strip(), p["q"][:60]
        p["q"] = p["q"].strip()
        p["options"] = [o.strip() for o in p["options"]]
        sim, quien = busca(p, base)
        if sim >= UMBRAL:
            misma = nn(quien["options"][quien["correct"]]) == nn(p["options"][p["correct"]])
            nombre = limpio(p["banco"])
            if p["banco"].startswith("📝") and limpio(quien["topicBase"]) != nombre and not quien["topic"].startswith(p["banco"]):
                if nombre not in quien.setdefault("caida", []):
                    quien["caida"].append(nombre)
                    inf["caida_anotada"] += 1
            inf["ya_estaban"].append({"q": p["q"][:90], "banco": p["banco"], "id": quien["id"], "sim": round(sim, 2),
                                      "misma_clave": misma, "src": p["_src"],
                                      "clave_doc": p["options"][p["correct"]][:60],
                                      "clave_plat": quien["options"][quien["correct"]][:60]})
            continue
        idq = next(libres)
        origq[p["banco"]] += 1
        q = {"id": idq, "topic": p["banco"], "topicBase": p["banco"], "fileId": idq,
             "origQ": origq[p["banco"]], "q": p["q"], "options": p["options"],
             "correct": p["correct"], "exp": p["exp"].strip()}
        if p.get("nota"):
            q["exp"] += "\n\nℹ️ " + p["nota"].strip()
        if p.get("n"):
            q["n"] = str(p["n"])
        if p.get("img"):
            assert os.path.exists(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), p["img"])), p["img"]
            q["img"] = p["img"]
            q["ns"] = 1
        if re.search(r"(?<![\wáéíóúñ])[a-e]\)|\b[Ll]as? [a-e](?=[\s,.;:])|opci[oó]n [a-e]\b", q["exp"]):
            q["ns"] = 1
        qs.append(q)
        base.append((firma(q), q))
        for w in base[-1][0]:
            por_tok[w].append(len(base) - 1)
        inf["cargadas"].append({"id": idq, "banco": p["banco"], "q": p["q"][:80], "src": p["_src"]})
        inf["por_banco"][p["banco"]] = inf["por_banco"].get(p["banco"], 0) + 1

    counts = collections.Counter(q["topic"] for q in qs)
    s = s[:m.start()] + "const ALL_QUESTIONS = %s;\n" % json.dumps(qs, ensure_ascii=False) + s[m.end():]
    s = re.sub(r"const TOPIC_COUNTS = \{.*?\};\n",
               lambda _: "const TOPIC_COUNTS = %s;\n" % json.dumps(dict(counts), ensure_ascii=False),
               s, count=1, flags=re.S)
    open(ruta_html, "w", encoding="utf-8").write(s)
    json.dump(inf, open(ruta_informe, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("cargadas", len(inf["cargadas"]), "| ya estaban", len(inf["ya_estaban"]),
          "(clave distinta:", sum(not x["misma_clave"] for x in inf["ya_estaban"]), ")",
          "| caida anotada en", inf["caida_anotada"], "| total", len(qs))
    for b, n in sorted(inf["por_banco"].items()):
        print("  ", n, b)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], sys.argv[3:])
