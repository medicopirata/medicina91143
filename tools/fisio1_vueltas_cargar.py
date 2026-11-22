#!/usr/bin/env python3
"""Carga las vueltas (apuntes_extra/fisio1-vueltas/vueltas-NN.json) en plataforma_fisio1.html.

Cada vuelta lleva `de` (id de la pregunta base). Van a bancos «🔁 Vueltas · Exámenes · <bloque>»
o «🔁 Vueltas · Tareas · <bloque>» según el grupo y el bloque de la base (base/base.json).
Idempotente: los bancos 🔁 se sustituyen enteros y cada pregunta conserva su id por
(banco, enunciado). Ids desde ID_BASE. Solo carga lotes que pasen el validador.

Uso: python3 tools/fisio1_vueltas_cargar.py [--prueba]
"""
import json, re, sys, glob, collections, subprocess
sys.path.insert(0, "tools")
import fisio1_vueltas_validar as V

D = "apuntes_extra/fisio1-vueltas"
HTML = "plataforma_fisio1.html"
ID_BASE = 110000
BLOQUE = {"general": "Generalidades", "cardio": "Cardiovascular", "resp": "Respiratorio", "dig": "Digestivo", "renal": "Renal", "endo": "Endocrino"}
GRUPO = {"examen": "Exámenes", "tarea": "Tareas"}


def main(prueba=False):
    base = {x["id"]: x for x in json.load(open(f"{D}/base/base.json", encoding="utf-8"))}
    nuevas, saltados = [], []
    for f in sorted(glob.glob(f"{D}/vueltas-??.json")):
        n = int(re.search(r"vueltas-(\d+)", f).group(1))
        err, k = V.validar(n)
        if err:
            saltados.append((n, len(err))); continue
        for p in json.load(open(f, encoding="utf-8"))["preguntas"]:
            b = base[p["de"]]
            p["banco"] = "🔁 Vueltas · %s · %s" % (GRUPO[b["grupo"]], BLOQUE[b["bloque"]])
            nuevas.append(p)
    # Enunciados repetidos entre lotes (la misma base estaba en dos bancos): se queda el primero
    vistos, unicas = set(), []
    for p in nuevas:
        k = V.nn(p["q"])
        k = " ".join(sorted(k))
        if k in vistos: continue
        vistos.add(k); unicas.append(p)
    repetidas = len(nuevas) - len(unicas); nuevas = unicas
    # La clave va repartida entre las cuatro posiciones: se rotan las opciones (la explicación
    # habla del contenido, no de letras) hacia la posición menos usada hasta el momento
    uso = [0, 0, 0, 0]
    for p in nuevas:
        dest = uso.index(min(uso))
        giro = (dest - p["correct"]) % 4
        p["options"] = p["options"][-giro:] + p["options"][:-giro] if giro else p["options"]
        p["correct"] = dest; uso[dest] += 1
    s = open(HTML, encoding="utf-8").read()
    m = re.search(r"const ALL_QUESTIONS = (\[.*?\]);\n", s, re.S)
    qs = json.loads(m.group(1))
    previos = {}
    for q in qs:
        if q["topic"].startswith("🔁 Vueltas"):
            previos.setdefault((q["topic"], q["q"]), []).append(q["id"])
    ocupados = {q["id"] for q in qs}
    qs = [q for q in qs if not q["topic"].startswith("🔁 Vueltas")]
    reservados = {i for v in previos.values() for i in v}
    libres = (i for i in range(ID_BASE, ID_BASE + 100000) if i not in ocupados and i not in reservados)
    origq = collections.Counter()
    for p in nuevas:
        cola = previos.get((p["banco"], p["q"]))
        idq = cola.pop(0) if cola else next(libres)
        origq[p["banco"]] += 1
        qs.append({"id": idq, "topic": p["banco"], "topicBase": p["banco"], "fileId": idq, "origQ": origq[p["banco"]],
                   "q": p["q"], "options": p["options"], "correct": p["correct"], "exp": p["exp"], "de": p["de"], "n": p.get("angulo", "")})
    counts = collections.Counter(q["topic"] for q in qs)
    print("vueltas cargadas: %d en %d bancos · repetidas quitadas: %d · clave por posición %s · lotes saltados por errores: %s · total plataforma %d" % (len(nuevas), len(origq), repetidas, uso, saltados or "ninguno", len(qs)))
    for b, k in sorted(origq.items()): print("  %4d  %s" % (k, b))
    if prueba: return
    s = s[:m.start()] + "const ALL_QUESTIONS = %s;\n" % json.dumps(qs, ensure_ascii=False) + s[m.end():]
    s = re.sub(r"const TOPIC_COUNTS = \{.*?\};\n", lambda _: "const TOPIC_COUNTS = %s;\n" % json.dumps(dict(counts), ensure_ascii=False), s, count=1, flags=re.S)
    open(HTML, "w", encoding="utf-8").write(s)


if __name__ == "__main__":
    main("--prueba" in sys.argv)
