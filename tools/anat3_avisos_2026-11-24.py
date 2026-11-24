#!/usr/bin/env python3
"""Anatomía 3: avisos del profesor en la clase del 24-11-2026 para el 1.er parcial (apuntes_extra/anat3-avisos-2026-11-24.json).
Idempotente.

- Crea (o rehace) el banco «Apuntes: Avisos del profesor · clase del 24-11-2026 …» con las preguntas nuevas de cada
  aviso (ids desde 98200, detrás del banco «Apuntes: Lo que el profesor dijo que cae»), marcadas con «cae».
- Marca con «cae» las preguntas que ya estaban en la plataforma y preguntan lo mismo (si no tenían ya una marca).
- Añade las nuevas (y las existentes que no estuvieran en ninguna batería del programa) a la batería del tema de la sala.
- En el programa de repaso del parcial deja el apartado «avisos» (título, cita, texto y preguntas de cada aviso),
  que estudio.js pinta encima de los exámenes; después pasa programa_repaso.py y estudio_validar.py.
Uso: python3 tools/anat3_avisos_2026-11-24.py [--prueba]
"""
import glob, json, os, re, subprocess, sys, unicodedata

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
H = os.path.join(R, "plataforma_anatomia3.html")
J = os.path.join(R, "apuntes_extra", "anat3-avisos-2026-11-24.json")
SALA = os.path.join(R, "estudio", "anat3")
ID0, ID_FIN = 98200, 98300
DETRAS_DE = "Apuntes: Lo que el profesor dijo que cae"
PRUEBA = "--prueba" in sys.argv


def norma(s):
    s = unicodedata.normalize("NFKD", (s or "").lower())
    return re.sub(r"\W+", " ", "".join(c for c in s if not unicodedata.combining(c))).strip()


def main():
    X = json.load(open(J, encoding="utf-8"))
    banco = X["banco"]
    s = open(H, encoding="utf-8").read()
    m = re.search(r"const ALL_QUESTIONS = (\[.*?\]);\n", s, re.S)
    qs = json.loads(m.group(1))
    previos = {q["q"]: q["id"] for q in qs if q["topic"] == banco}
    qs = [q for q in qs if not (q["topic"] == banco or ID0 <= q["id"] < ID_FIN)]
    por_id = {q["id"]: q for q in qs}
    errores, nuevas, vistos = [], [], set()
    libre = (i for i in range(ID0, ID_FIN) if i not in por_id and i not in previos.values())
    ids_aviso = []
    for av in X["avisos"]:
        cae = {"p": av["titulo"], "c": av["cita"], "r": X["cae_r"], "f": 2}
        mios = []
        if not os.path.exists(os.path.join(SALA, "tema-%02d.json" % av["tema"])): errores.append("tema inexistente: " + av["clave"])
        for e in av["existentes"]:
            if e not in por_id: errores.append("existente %s no existe (%s)" % (e, av["clave"]))
        for p in av["preguntas"]:
            ctx = "%s · %s" % (av["clave"], p["q"][:50])
            ops = [str(o).strip() for o in p["options"]]
            if len(ops) != 4 or len({norma(o) for o in ops}) != 4: errores.append("opciones: " + ctx); continue
            if not 0 <= p["correct"] < 4: errores.append("clave: " + ctx); continue
            if len(p["exp"].strip()) < 80: errores.append("explicación corta: " + ctx); continue
            if norma(p["q"]) in vistos: errores.append("repetida: " + ctx); continue
            vistos.add(norma(p["q"]))
            i = previos.get(p["q"].strip()) or next(libre)
            nuevas.append({"id": i, "topic": banco, "topicBase": banco, "fileId": i, "origQ": len(nuevas) + 1, "n": len(nuevas) + 1,
                           "q": p["q"].strip(), "options": ops, "correct": p["correct"], "exp": "🎯 Aviso del profesor en clase (24-11-2026). " + p["exp"].strip(),
                           "cae": dict(cae)})
            mios.append(i)
        ids_aviso.append(mios)
    if errores:
        print("\n".join(errores)); sys.exit("%d errores: no se escribe nada" % len(errores))

    # colocar el banco detrás del de «lo que el profesor dijo que cae»
    pos = max(k for k, q in enumerate(qs) if q["topic"] == DETRAS_DE) + 1
    qs = qs[:pos] + nuevas + qs[pos:]
    assert len({q["id"] for q in qs}) == len(qs)
    por_id = {q["id"]: q for q in qs}
    # marcar las existentes
    marcadas = 0
    for av in X["avisos"]:
        for e in av["existentes"]:
            q = por_id[e]
            if not q.get("cae"):
                q["cae"] = {"p": av["titulo"], "c": av["cita"], "r": X["cae_r"], "f": 2}; marcadas += 1
    s = s[:m.start(1)] + json.dumps(qs, ensure_ascii=False) + s[m.end(1):]
    m2 = re.search(r"const TOPIC_COUNTS = (\{.*?\});\n", s, re.S)
    tc = {}
    for q in qs: tc[q["topic"]] = tc.get(q["topic"], 0) + 1
    s = s[:m2.start(1)] + json.dumps(tc, ensure_ascii=False) + s[m2.end(1):]

    # sala: baterías de los temas y apartado del programa
    prog_ruta = os.path.join(SALA, X["programa"])
    prog = json.load(open(prog_ruta, encoding="utf-8"))
    en_bateria = set()
    temas = {}
    for f in glob.glob(os.path.join(SALA, "tema-*.json")):
        t = json.load(open(f, encoding="utf-8")); temas[t["tema"]] = (f, t)
        if t["tema"] in prog["temas"]: en_bateria.update(x for x in t.get("bateria", []) if isinstance(x, int))
    anadidas = {}
    for av, mios in zip(X["avisos"], ids_aviso):
        f, t = temas[av["tema"]]
        bat = t.setdefault("bateria", [])
        for i in mios + [e for e in av["existentes"] if e not in en_bateria]:
            if i not in bat: bat.append(i); anadidas[av["tema"]] = anadidas.get(av["tema"], 0) + 1
    prog["avisosTitulo"] = X["titulo"]
    prog["avisosIntro"] = X["intro"]
    prog["avisos"] = [{"titulo": av["titulo"], "cita": av["cita"], "md": av["md"], "ids": mios + av["existentes"]} for av, mios in zip(X["avisos"], ids_aviso)]
    print("plataforma: %d preguntas · banco «%s»: %d · existentes marcadas «cae»: %d · añadidas a baterías: %s" % (len(qs), banco, len(nuevas), marcadas, anadidas))
    for av in prog["avisos"]: print("  %2d  %s" % (len(av["ids"]), av["titulo"]))
    if PRUEBA: return
    open(H, "w", encoding="utf-8").write(s)
    for n in anadidas:
        f, t = temas[n]
        json.dump(t, open(f, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump(prog, open(prog_ruta, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    subprocess.run([sys.executable, os.path.join(R, "tools", "programa_repaso.py"), "anat3", X["programa"]], check=True)
    subprocess.run([sys.executable, os.path.join(R, "tools", "estudio_validar.py"), "anat3"], check=True)


main()
