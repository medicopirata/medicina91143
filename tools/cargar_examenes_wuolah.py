#!/usr/bin/env python3
"""Carga preguntas de examen leídas de PDF de Wuolah/Drive (JSONL de los ayudantes).

Cada línea: {q, options, correct, clave, exp, nota, src, pag, examen, n, fig, also?, banco, img?}
`banco` e `img` los pone el preparador (ver apuntes_extra/examenes-2026-10-19/).

- Descarta las que ya están en la plataforma (enunciado + opciones, Jaccard >= UMBRAL,
  mismos números y negaciones en el enunciado y la respuesta correcta entre sus
  opciones; si no, es otra variante y se carga) y las repetidas entre sí. A las que ya
  estaban, si la nueva viene de un banco 📝, les anota el examen en `caida` (entrenador.js
  lo usa para decir «cayó en…»). Lo descartado queda en el informe.
- Ids nuevos desde ID_BASE hacia arriba, sin tocar los existentes; idempotente: los
  bancos con el mismo nombre se sustituyen y cada pregunta conserva su id por
  (banco, enunciado).
- Clave «resuelta» (el documento no la marcaba) o corregida respecto a la marca del
  alumno: se dice al final de la explicación.

Uso: python3 tools/cargar_examenes_wuolah.py <plataforma.html> <preguntas.json>
"""
import json, re, sys, collections, unicodedata

ID_BASE = 97000
UMBRAL = 0.6


def toks(t):
    t = unicodedata.normalize("NFKD", (t or "").lower())
    t = "".join(c for c in t if not unicodedata.combining(c))
    # los números cuentan aunque sean cortos («el 18 corresponde a…») y las
    # negaciones también: «señale la INCORRECTA» no es la misma pregunta que «la correcta»
    ws = re.findall(r"[a-z0-9αβγδ]+", t)
    out = {w for w in ws if len(w) > 2 or w.isdigit()}
    out |= {"¬" + w for w in ws if w in ("no", "excepto", "falsa", "falso", "incorrecta", "incorrecto", "salvo")}
    return out


def firma(q):
    return toks(q["q"] + " " + " ".join(q["options"]))


def nn(t):
    t = unicodedata.normalize("NFKD", (t or "").lower())
    t = "".join(c for c in t if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9αβγδ]+", " ", t).strip()


def tiene_opcion(p, q):
    """¿Son la misma pregunta? Mismos números y negaciones en el enunciado, y la
    respuesta correcta de p entre las opciones de q; si no, son variantes distintas."""
    ep, eq = toks(p["q"]), toks(q["q"])
    clave = lambda e: {w for w in e if w.isdigit() or w.startswith("¬")}
    if clave(ep) != clave(eq):
        return False
    a = nn(p["options"][p["correct"]])
    for o in q["options"]:
        b = nn(o)
        if a == b or parecido(set(a.split()), set(b.split())) >= 0.8:
            return True
    return False


def parecido(a, b):
    return len(a & b) / max(1, len(a | b))


def main(ruta_html, ruta_json):
    s = open(ruta_html, encoding="utf-8").read()
    m = re.search(r"const ALL_QUESTIONS = (\[.*?\]);\n", s, re.S)
    qs = json.loads(m.group(1))
    nuevas = json.load(open(ruta_json, encoding="utf-8"))
    nombres = {p["banco"] for p in nuevas}

    previos = collections.defaultdict(list)
    for q in qs:
        if q["topic"] in nombres:
            previos[(q["topic"], q["q"])].append(q["id"])
    ocupados = {q["id"] for q in qs}
    qs = [q for q in qs if q["topic"] not in nombres]
    base = [(firma(q), q) for q in qs]
    # índice por palabra para no comparar contra todo
    por_tok = collections.defaultdict(list)
    for i, (f, _) in enumerate(base):
        for w in f:
            por_tok[w].append(i)

    informe = {"cargadas": 0, "ya_estaban": [], "repetidas": 0}
    vistas = []
    reservados = {i for v in previos.values() for i in v}
    libres = (i for i in range(ID_BASE, ID_BASE + 100000)
              if i not in ocupados and i not in reservados)
    origq = collections.Counter()
    for p in nuevas:
        assert 0 <= p["correct"] < len(p["options"]), p["q"][:60]
        assert len(p.get("exp", "")) >= 60, p["q"][:60]
        f = firma(p)
        cand = collections.Counter(i for w in f for i in por_tok.get(w, ()))
        mejor, quien = 0, None
        for i, _ in cand.most_common(40):
            x = parecido(f, base[i][0])
            if x > mejor and tiene_opcion(p, base[i][1]):
                mejor, quien = x, base[i][1]
        if mejor >= UMBRAL:
            # no se duplica, pero queda anotado en qué examen cayó (lo lee entrenador.js)
            if p["banco"].startswith("📝"):
                nombre = re.sub(r"^\W+", "", p["banco"]).strip()
                if nombre not in quien.setdefault("caida", []):
                    quien["caida"].append(nombre)
            informe["ya_estaban"].append({
                "q": p["q"][:90], "banco": p["banco"], "id": quien["id"], "sim": round(mejor, 2),
                "misma_clave": quien["options"][quien["correct"]].strip().lower()
                == p["options"][p["correct"]].strip().lower()})
            continue
        if any(parecido(f, v) >= UMBRAL and tiene_opcion(p, w) for v, w in vistas):
            informe["repetidas"] += 1
            continue
        vistas.append((f, p))
        cola = previos.get((p["banco"], p["q"]))
        idq = cola.pop(0) if cola else next(libres)
        origq[p["banco"]] += 1
        q = {"id": idq, "topic": p["banco"], "topicBase": p["banco"], "fileId": idq,
             "origQ": origq[p["banco"]], "q": p["q"], "options": p["options"],
             "correct": p["correct"], "exp": p["exp"]}
        if p.get("n"):
            q["n"] = p["n"]
        if p.get("also"):
            q["also"] = p["also"]
        if p.get("img"):
            q["img"] = p["img"]
            q["ns"] = 1
        qs.append(q)
        informe["cargadas"] += 1

    counts = collections.Counter(q["topic"] for q in qs)
    s = s[:m.start()] + "const ALL_QUESTIONS = %s;\n" % json.dumps(qs, ensure_ascii=False) + s[m.end():]
    s = re.sub(r"const TOPIC_COUNTS = \{.*?\};\n",
               lambda _: "const TOPIC_COUNTS = %s;\n" % json.dumps(dict(counts), ensure_ascii=False),
               s, count=1, flags=re.S)
    open(ruta_html, "w", encoding="utf-8").write(s)
    return informe


if __name__ == "__main__":
    inf = main(sys.argv[1], sys.argv[2])
    print("cargadas", inf["cargadas"], "| ya estaban", len(inf["ya_estaban"]),
          "(clave distinta:", sum(not x["misma_clave"] for x in inf["ya_estaban"]), ")",
          "| repetidas entre sí", inf["repetidas"])
    if len(sys.argv) > 3:
        json.dump(inf, open(sys.argv[3], "w"), ensure_ascii=False, indent=1)
