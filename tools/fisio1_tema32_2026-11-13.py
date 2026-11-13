#!/usr/bin/env python3
"""Fisio I: carga el Tema 32 (Glucocorticoides y estrés, clase del 12/11/26) y sus negritas.

- apuntes_extra/fisio1-tema32.json: las 28 preguntas de la pestaña «Tema 32 · Preguntas» (rev 1) en el
  banco nuevo «Apuntes: Tema 32 — Glucocorticoides y estrés», delante del de Tema 31 (como hacía
  tools/add_apuntes.py, con la etiqueta de procedencia de su campo `g`).
- apuntes_extra/fisio1-negritas-2026-11-13.json: N133–N138 de «Negritas de las presentaciones» (rev 15)
  en «Apuntes: Negritas · Tema 32 — Glucocorticoides y estrés», detrás del banco de negritas del Tema 31.
- apuntes_extra/fisio1-cae-2026-11-13.json: marcas «caen» de las pistas del Tema 32 (tools/marcar_cae.py).

No usa add_apuntes.py para no renumerar: si un banco ya estaba, cada pregunta conserva su id (por su
número `n`); las nuevas van tras el máximo id de la plataforma. No regenera el índice de temas.
Idempotente. Uso: python3 tools/fisio1_tema32_2026-11-13.py [plataforma_fisio1.html]
"""
import collections, json, os, re, subprocess, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ETIQUETA = {"A": "\U0001F393 Dicha en clase.", "B": "\U0001F4CC Deducida de sus pistas.",
            "C": "\U0001F916 Propuesta por Claude, no dicha en clase."}
TEMA = os.path.join(RAIZ, "apuntes_extra", "fisio1-tema32.json")
NEGRITAS = os.path.join(RAIZ, "apuntes_extra", "fisio1-negritas-2026-11-13.json")
CAE = os.path.join(RAIZ, "apuntes_extra", "fisio1-cae-2026-11-13.json")
ANTES_DE = "Apuntes: Tema 31 — Glándulas suprarrenales"


def main(ruta):
    s = open(ruta, encoding="utf-8").read()
    m = re.search(r"^const ALL_QUESTIONS = (.*?);$", s, re.M | re.S)
    qs = json.loads(m.group(1))
    tema = json.load(open(TEMA, encoding="utf-8"))["bancos"][0]
    neg = json.load(open(NEGRITAS, encoding="utf-8"))["bancos"][0]

    previos = {(q["topic"], q.get("n")): q["id"] for q in qs if q["topic"] in (tema["banco"], neg["banco"])}
    qs = [q for q in qs if q["topic"] not in (tema["banco"], neg["banco"])]
    sig = max([q["id"] for q in qs] + list(previos.values())) + 1

    def construir(banco, lista):
        nonlocal sig
        out = []
        for i, p in enumerate(lista, 1):
            assert 0 <= p["correct"] < len(p["options"]) == 4, p["q"]
            idq = previos.get((banco, i))
            if idq is None:
                idq, sig = sig, sig + 1
            et = ETIQUETA.get(p.get("g", ""), "")
            exp = (et + " " + p["exp"].strip()).strip()
            assert len(p["exp"].strip()) >= 60, p["q"]
            out.append({"id": idq, "topic": banco, "topicBase": banco, "fileId": idq, "origQ": i,
                        "q": p["q"], "options": p["options"], "correct": p["correct"], "exp": exp, "n": i,
                        **({"img": p["img"]} if p.get("img") else {})})
        return out

    nuevas_tema = construir(tema["banco"], tema["preguntas"])
    nuevas_neg = construir(neg["banco"], neg["preguntas"])

    # Tema 32 delante del Tema 31; negritas del 32 detrás de las del 31
    i31 = next(i for i, q in enumerate(qs) if q["topic"] == ANTES_DE)
    qs[i31:i31] = nuevas_tema
    ult = max(i for i, q in enumerate(qs) if q["topic"] == neg["despues_de"])
    qs[ult + 1:ult + 1] = nuevas_neg

    cuenta = collections.Counter(q["topic"] for q in qs)
    counts = {b: cuenta[b] for b in dict.fromkeys(q["topic"] for q in qs)}
    s = s[:m.start(1)] + json.dumps(qs, ensure_ascii=False, separators=(",", ":")) + s[m.end(1):]
    s = re.sub(r"^const TOPIC_COUNTS = .*?;$",
               lambda _: "const TOPIC_COUNTS = %s;" % json.dumps(counts, ensure_ascii=False, separators=(",", ":")),
               s, count=1, flags=re.M | re.S)
    open(ruta, "w", encoding="utf-8").write(s)
    print("total", len(qs))
    for b, l in ((tema["banco"], nuevas_tema), (neg["banco"], nuevas_neg)):
        print("  %s: %d (ids %d–%d)" % (b, len(l), l[0]["id"], l[-1]["id"]))

    if os.path.exists(CAE):
        subprocess.run([sys.executable, os.path.join(RAIZ, "tools", "marcar_cae.py"), ruta, CAE], check=True)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(RAIZ, "plataforma_fisio1.html"))
