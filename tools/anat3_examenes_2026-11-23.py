#!/usr/bin/env python3
"""Anatomía 3, 23-11-2026: exámenes de otros años leídos por visión de dos recopilaciones escaneadas de
Wuolah (RECOPILACION.pdf de Pepe Gálvez, 40 páginas; «Recopilatorio de exámenes · parte de Rosety», 28 páginas)
y los casos clínicos de la Actividad 1 de Santiago.

Entrada: apuntes_extra/anat3-examenes-2026-11-23/lote*.jsonl (una pregunta por línea, formato del SPEC:
q, options, correct, clave, exp, nota, src, pag, examen, n, fig) y apuntes_extra/anat3-actividad1-casos-2026-11-23.json.
- Asigna el banco por la cabecera `examen` (ver BANCOS); las figuras se recortan de los PNG renderizados
  (RUTA_PNG/<src>/page<pag>.png, bbox en píxeles) a anat3_img/ex23-<src>-p<pag>-n<n>.jpg.
- Anota al final de la explicación si la clave la marcó un alumno o la resolvió el lector.
- Carga con tools/cargar_examenes_wuolah.py, que no duplica lo que ya está (le anota «caida») y da ids nuevos.
Uso: python3 tools/anat3_examenes_2026-11-23.py [--prueba]   (con --prueba solo prepara y cuenta)
"""
import glob, json, os, re, subprocess, sys

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(R, "tools"))
H = os.path.join(R, "plataforma_anatomia3.html")
D = os.path.join(R, "apuntes_extra", "anat3-examenes-2026-11-23")
CASOS = os.path.join(R, "apuntes_extra", "anat3-actividad1-casos-2026-11-23.json")
RUTA_PNG = os.environ.get("RUTA_PNG", "/private/tmp/claude-501/-Users-santi/413357e9-9d6f-4407-a8b5-46f0af76d970/scratchpad/anat")
PRUEBA = "--prueba" in sys.argv

# Cabecera del examen (campo `examen`, normalizado) → banco de la plataforma. El primero que case.
BANCOS = [
    (r"modelo 3|snc.*2018|2018.*snc", "📝 Examen SNC · 23 febrero 2018 · modelo 3"),
    (r"modelo 4|cabeza.*2018|2018.*cabeza", "📝 Examen Cabeza · 23 febrero 2018 · modelo 4"),
    (r"2018", "📝 Examen Cabeza · febrero 2018 (Rosety)"),
    (r"2013", "📝 Examen Cabeza · 8 febrero 2013 (Rosety)"),
    (r"2011", "📝 Examen Cabeza · febrero 2011 (Rosety)"),
    (r"2012", "📝 Examen Cabeza · febrero 2012 (Rosety)"),
    (r"2014", "📝 Examen Cabeza · 2014 (Rosety)"),
    (r"2015", "📝 Examen Cabeza · 2015 (Rosety)"),
    (r"2016", "📝 Examen Cabeza · 2016 (Rosety)"),
    (r"2017", "📝 Examen Cabeza · 2017 (Rosety)"),
    (r"2019", "📝 Examen Cabeza · 2019 (Rosety)"),
]
POR_DEFECTO = {"p1": "📝 Recopilación de exámenes Anatomía II (sin fecha)", "p6": "📝 Recopilatorio Rosety · exámenes de cabeza (sin fecha)"}
NOTA = {"marcada": "\n\n✏️ Clave marcada por un alumno (sin corrección oficial), revisada.",
        "resuelta": "\n\n🧩 Clave resuelta al transcribir (el documento no la marcaba)."}


def norma(s):
    import unicodedata
    s = unicodedata.normalize("NFKD", (s or "").lower())
    return "".join(c for c in s if not unicodedata.combining(c))


def banco_de(p):
    e = norma(p.get("examen") or "")
    for rx, b in BANCOS:
        if re.search(rx, e): return b
    return POR_DEFECTO.get(p.get("src"), POR_DEFECTO["p1"])


def recorte(p):
    f = p.get("fig")
    if not f or not isinstance(f, dict) or not f.get("bbox"): return None
    png = os.path.join(RUTA_PNG, p["src"], f.get("png") or ("page%d.png" % p["pag"]))
    x, y, w, h = [int(round(v)) for v in f["bbox"]]
    dest_rel = "anat3_img/ex23-%s-p%d-n%s.jpg" % (p["src"], p["pag"], re.sub(r"\W+", "", str(p.get("n") or "x")))
    dest = os.path.join(R, dest_rel)
    if os.path.exists(dest): return dest_rel
    if not os.path.exists(png) or w < 40 or h < 40: return None
    tmp = dest + ".png"
    if subprocess.run(["sips", "-c", str(h), str(w), "--cropOffset", str(y), str(x), png, "--out", tmp], capture_output=True).returncode != 0: return None
    subprocess.run(["sips", "-s", "format", "jpeg", "-s", "formatOptions", "85", tmp, "--out", dest], capture_output=True)
    os.remove(tmp)
    return dest_rel if os.path.exists(dest) else None


def main():
    nuevas, sin_fig, omitidas = [], 0, []
    for f in sorted(glob.glob(os.path.join(D, "lote*.jsonl"))):
        for l in open(f, encoding="utf-8"):
            if not l.strip(): continue
            p = json.loads(l)
            if re.search(r"provisional|reconstru|inventad|sin enunciado|no se transcrib", norma(p.get("nota") or "")):
                omitidas.append("%s p%s n%s %s" % (p.get("src"), p.get("pag"), p.get("n"), p["q"][:50])); continue
            ops = [str(o).strip() for o in p["options"]]
            assert len(ops) >= 2 and 0 <= p["correct"] < len(ops), p["q"][:60]
            exp = p["exp"].strip() + NOTA.get(p.get("clave"), "")
            if p.get("nota") and p.get("clave") == "marcada" and re.search(r"alumno|marc", norma(p["nota"])):
                exp += " " + p["nota"].strip()
            q = {"banco": banco_de(p), "q": p["q"].strip(), "options": ops, "correct": p["correct"], "exp": exp, "n": str(p.get("n") or "")}
            img = recorte(p)
            if img: q["img"] = img
            elif p.get("fig"): sin_fig += 1
            nuevas.append(q)
    nuevas += json.load(open(CASOS, encoding="utf-8"))
    import collections
    for o in omitidas: print("  omitida (incompleta o reconstruida):", o)
    print("preparadas:", len(nuevas), "| con imagen:", sum(1 for q in nuevas if q.get("img")), "| figuras sin recortar:", sin_fig)
    for b, n in collections.Counter(q["banco"] for q in nuevas).items(): print("  %3d  %s" % (n, b))
    salida = os.path.join(D, "preguntas.json")
    json.dump(nuevas, open(salida, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    if PRUEBA: return
    import cargar_examenes_wuolah as C
    inf = C.main(H, salida)
    json.dump(inf, open(os.path.join(D, "informe.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("cargadas:", inf["cargadas"], "| ya estaban (anotadas como caídas):", len(inf["ya_estaban"]), "| repetidas entre sí:", inf["repetidas"])
    distinta = [x for x in inf["ya_estaban"] if not x["misma_clave"]]
    print("ya estaban con OTRA clave:", len(distinta))
    for x in distinta[:40]: print("   #%s %s · %s" % (x["id"], x["q"][:70], x["banco"][:30]))


main()
