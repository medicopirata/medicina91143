#!/usr/bin/env python3
"""Anatomía 3: 1er Parcial de Neuroanatomía del curso 2025-26 (PDF con las fotos del examen,
26 preguntas). Idempotente.

Lee apuntes_extra/anat3-parcial1-2526.json y:
- crea (o rehace) el banco «📝 1er Parcial Neuroanatomía · Curso 2025-26» justo detrás del
  banco del 1er parcial de 2020-21, con ids 98100-98125 (fileId = id, n = origQ = número en el
  examen); comprueba opciones, clave, explicación e imagen;
- marca con «caida» las preguntas que ya estaban en la plataforma y preguntan lo mismo
  (así el entrenador y la sala las cuentan como caídas en examen);
- añade cada pregunta a la batería del tema de la sala que le toca (estudio/anat3/tema-NN.json);
- en el programa «Repaso de examen» (programa-t12.json) las deja como un examen propio,
  fijo y con nombre (p["fijos"], p["nombres"]), para hacer el parcial entero de una vez;
- pasa tools/programa_repaso.py y tools/estudio_validar.py para rehacer el reparto y el índice.
Uso: python3 tools/anat3_parcial1_2526.py [--prueba]
"""
import json, os, re, subprocess, sys, unicodedata

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
H = os.path.join(R, "plataforma_anatomia3.html")
J = os.path.join(R, "apuntes_extra", "anat3-parcial1-2526.json")
SALA = os.path.join(R, "estudio", "anat3")
ID0 = 98100
DETRAS_DE = "📝 1er Parcial Neuroanatomía · Diciembre 2020-21"
PRUEBA = "--prueba" in sys.argv


def norma(s):
    s = unicodedata.normalize("NFKD", (s or "").lower())
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"\W+", " ", s).strip()


def main():
    X = json.load(open(J, encoding="utf-8"))
    banco, etiqueta = X["banco"], X["etiqueta"]
    s = open(H, encoding="utf-8").read()
    m = re.search(r"const ALL_QUESTIONS = (\[.*?\]);\n", s, re.S)
    qs = json.loads(m.group(1))
    por_id = {q["id"]: q for q in qs}
    errores, nuevas, vistos = [], [], set()
    for p in X["preguntas"]:
        n = p["n"]; i = ID0 + n - 1
        ctx = "#%d (pregunta %d) %s" % (i, n, p["q"][:50])
        if n in vistos: errores.append("número repetido: " + ctx); continue
        vistos.add(n)
        ops = [str(o).strip() for o in p["options"]]
        if len(ops) != 4 or len({norma(o) for o in ops}) != 4: errores.append("opciones: " + ctx); continue
        if not isinstance(p["correct"], int) or not 0 <= p["correct"] < 4: errores.append("clave: " + ctx); continue
        if len(p["exp"].strip()) < 80: errores.append("explicación corta: " + ctx); continue
        q = {"id": i, "topic": banco, "topicBase": banco, "fileId": i, "origQ": n,
             "q": p["q"].strip(), "options": ops, "correct": p["correct"], "exp": p["exp"].strip(), "n": n}
        if p.get("img"):
            if not os.path.exists(os.path.join(R, p["img"])): errores.append("imagen inexistente: " + ctx); continue
            q["img"] = p["img"]
        for c in p.get("caida", []):
            if c not in por_id: errores.append("caida a id inexistente %s: %s" % (c, ctx))
            elif ID0 <= c < ID0 + 100: errores.append("caida a la propia carga: " + ctx)
        if not os.path.exists(os.path.join(SALA, "tema-%02d.json" % p["tema"])): errores.append("tema de la sala inexistente: " + ctx)
        nuevas.append(q)
    if errores:
        print("\n".join(errores)); sys.exit("%d errores: no se escribe nada" % len(errores))

    # colocar (quitando antes las de esta carga si ya estaban)
    qs = [q for q in qs if not (q["topic"] == banco or ID0 <= q["id"] < ID0 + 100)]
    pos = max(k for k, q in enumerate(qs) if q["topic"] == DETRAS_DE) + 1
    qs = qs[:pos] + nuevas + qs[pos:]
    assert len({q["id"] for q in qs}) == len(qs)
    # caídas en este examen
    por_id = {q["id"]: q for q in qs}
    ncaida = 0
    for p in X["preguntas"]:
        for c in p.get("caida", []):
            q = por_id[c]
            l = q.setdefault("caida", [])
            if etiqueta not in l: l.append(etiqueta); ncaida += 1
    s = s[:m.start(1)] + json.dumps(qs, ensure_ascii=False) + s[m.end(1):]
    m2 = re.search(r"const TOPIC_COUNTS = (\{.*?\});\n", s, re.S)
    tc = {}
    for q in qs: tc[q["topic"]] = tc.get(q["topic"], 0) + 1
    s = s[:m2.start(1)] + json.dumps(tc, ensure_ascii=False) + s[m2.end(1):]
    print("plataforma: %d preguntas · %s: %d · caídas marcadas nuevas: %d" % (len(qs), banco, tc[banco], ncaida))

    # sala: baterías de los temas
    por_tema = {}
    for p in X["preguntas"]: por_tema.setdefault(p["tema"], []).append(ID0 + p["n"] - 1)
    cambios = []
    temas = {}
    for n, ids in sorted(por_tema.items()):
        f = os.path.join(SALA, "tema-%02d.json" % n)
        t = json.load(open(f, encoding="utf-8"))
        nuevos = [i for i in ids if i not in t["bateria"]]
        if nuevos:
            t["bateria"] += nuevos; temas[f] = t; cambios.append("T%d +%d" % (n, len(nuevos)))
    print("baterías de la sala:", ", ".join(cambios) or "ya estaban")

    # programa de repaso: un examen propio, fijo y con nombre
    fp = os.path.join(SALA, X["programa"])
    prog = json.load(open(fp, encoding="utf-8"))
    ids = [ID0 + p["n"] - 1 for p in X["preguntas"]]
    fijos = prog.setdefault("fijos", []); nombres = prog.setdefault("nombres", {})
    k = next((int(i) for i, nom in nombres.items() if nom == X["nombre_examen"]), None)
    exs = [[x for x in e if x not in ids] for e in prog["examenes"]]
    if k is None:
        k = len(exs); exs.append([]); fijos.append(k); nombres[str(k)] = X["nombre_examen"]
    exs[k] = ids
    prog["examenes"] = exs
    print("programa %s: examen %d «%s» con %d preguntas" % (X["programa"], k + 1, X["nombre_examen"], len(ids)))
    if PRUEBA: return
    open(H, "w", encoding="utf-8").write(s)
    for f, t in temas.items(): json.dump(t, open(f, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump(prog, open(fp, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    for cmd in (["tools/programa_repaso.py", "anat3", X["programa"]], ["tools/estudio_validar.py", "anat3"]):
        print("$", " ".join(cmd)); subprocess.run([sys.executable] + cmd, cwd=R, check=True)


main()
