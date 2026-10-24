#!/usr/bin/env python3
"""Añade preguntas nuevas a plataforma_medint.html sin mover ningún id.

Para las cargas de IMI en las que llegan a la vez bancos nuevos y preguntas
sueltas para bancos que ya existen (p. ej. una autoevaluación del Sisinio que
el doc completa). A diferencia de add_apuntes.py y cargar_extra.py:

- No borra ni regenera ningún banco: solo AÑADE al final de ALL_QUESTIONS.
- Los ids nuevos van siempre después del máximo de toda la plataforma.
- Si el banco ya existe, la pregunta se suma a él (n y origQ siguen la
  numeración del banco); si no, el banco nuevo queda al final.
- Es idempotente: una pregunta que ya está en ese banco con el mismo
  enunciado y las mismas opciones no se vuelve a añadir.
- TOPIC_COUNTS se actualiza sumando, sin reordenar las claves que ya había.
- No llama a tools/indice_temas.py.

Cada pregunta del JSON: {q, options, correct, exp, g?} con g = "A"/"B"/"C"
para anteponer la etiqueta de procedencia, igual que add_apuntes.py.

Uso:  python3 tools/imi_cargar_nuevas.py plataforma_medint.html <bancos.json> [...]
"""
import collections, json, re, sys, unicodedata

ETIQUETA = {
    "A": "\U0001F393 Dicha en clase.",
    "B": "\U0001F4CC Deducida de sus pistas.",
    "C": "\U0001F916 Propuesta por Claude, no dicha en clase.",
}


def norma(s):
    s = unicodedata.normalize("NFKD", (s or "").lower())
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", s).strip()


def main(ruta_html, rutas):
    s = open(ruta_html, encoding="utf-8").read()
    mq = re.search(r"^const ALL_QUESTIONS = (\[.*?\]);$", s, re.M | re.S)
    qs = json.loads(mq.group(1))
    siguiente = max(q["id"] for q in qs) + 1
    ya = {(q["topic"], norma(q["q"]), tuple(norma(o) for o in q["options"])) for q in qs}
    n_banco = collections.Counter()
    for q in qs:
        n_banco[q["topic"]] = max(n_banco[q["topic"]], q.get("n") or q.get("origQ") or 0
                                  if isinstance(q.get("n") or q.get("origQ") or 0, int) else 0)
    existentes = {q["topic"] for q in qs}
    nuevas = []
    for r in rutas:
        for b in json.load(open(r, encoding="utf-8"))["bancos"]:
            banco = b["banco"]
            if banco not in existentes and not n_banco[banco]:
                n_banco[banco] = 0
            for p in b["preguntas"]:
                if not 0 <= p["correct"] < len(p["options"]):
                    sys.exit("clave fuera de rango: %s" % p["q"][:70])
                if len(set(map(norma, p["options"]))) != len(p["options"]):
                    sys.exit("opciones repetidas: %s" % p["q"][:70])
                exp = (p.get("exp") or "").strip()
                if len(exp) < 60:
                    sys.exit("explicación corta (<60): %s" % p["q"][:70])
                k = (banco, norma(p["q"]), tuple(norma(o) for o in p["options"]))
                if k in ya:
                    continue
                ya.add(k)
                et = ETIQUETA.get(p.get("g", ""), "")
                n_banco[banco] += 1
                q = {"id": siguiente, "topic": banco, "topicBase": banco, "fileId": siguiente,
                     "origQ": n_banco[banco], "q": p["q"], "options": p["options"],
                     "correct": p["correct"], "exp": (et + " " + exp).strip() if et else exp,
                     "n": n_banco[banco]}
                nuevas.append(q)
                siguiente += 1
    qs += nuevas

    mc = re.search(r"^const TOPIC_COUNTS = (\{.*?\});$", s, re.M | re.S)
    tc = json.loads(mc.group(1))
    for q in nuevas:
        tc[q["topic"]] = tc.get(q["topic"], 0) + 1

    s = s[:mq.start(1)] + json.dumps(qs, ensure_ascii=False) + s[mq.end(1):]
    mc = re.search(r"^const TOPIC_COUNTS = (\{.*?\});$", s, re.M | re.S)
    s = s[:mc.start(1)] + json.dumps(tc, ensure_ascii=False) + s[mc.end(1):]
    open(ruta_html, "w", encoding="utf-8").write(s)

    por = collections.OrderedDict()
    for q in nuevas:
        por.setdefault(q["topic"], []).append(q["id"])
    print("%s: %d preguntas (+%d)" % (ruta_html, len(qs), len(nuevas)))
    for t, ids in por.items():
        print("  +%-3d %d-%d  %s" % (len(ids), ids[0], ids[-1], t))


if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2:])
