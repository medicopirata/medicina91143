#!/usr/bin/env python3
"""Anatomía 3, 24-11-2026: programa de la sala «Repaso completo del 1.er parcial» (estudio/anat3/programa-p1-completo.json)
con TODAS las preguntas anteriores de la asignatura (exámenes de otros años, kahoots, pruebas de clase, recopilatorios de
los profesores) cuya materia es del 1.er parcial. Idempotente.

- Las de las baterías de los temas del parcial entran solas (programa_repaso.py con "origen": "anteriores").
- Las de bancos que mezclan los dos parciales las clasificaron cuatro ayudantes (SPEC.md de la carpeta):
  apuntes_extra/anat3-p1-completo-2026-11-24/resultado*.jsonl → {id, p1, tema, dudosa, motivo}; las p1 van a
  «huerfanas» {id: tema} (si no estaban ya en una batería del programa). revisadas.json corrige a mano lo que haga falta.
- El parcial 2025-26 queda como examen fijo con nombre, igual que en el repaso de «las que más caen».
Uso: python3 tools/anat3_repaso_p1_completo.py [--prueba]
"""
import glob, json, os, re, subprocess, sys

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
H = os.path.join(R, "plataforma_anatomia3.html")
D = os.path.join(R, "apuntes_extra", "anat3-p1-completo-2026-11-24")
SALA = os.path.join(R, "estudio", "anat3")
NOM = "programa-p1-completo.json"
TEMAS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 20, 21, 25, 28, 29, 30, 31, 32, 35]
PARCIAL = "📝 1er Parcial Neuroanatomía · Curso 2025-26"
PRUEBA = "--prueba" in sys.argv


def main():
    s = open(H, encoding="utf-8").read()
    qs = {q["id"]: q for q in json.loads(re.search(r"const ALL_QUESTIONS = (\[.*?\]);\n", s, re.S).group(1))}
    clas = {}
    for f in sorted(glob.glob(os.path.join(D, "resultado*.jsonl"))):
        for l in open(f, encoding="utf-8"):
            if l.strip(): r = json.loads(l); clas[int(r["id"])] = r
    rev = os.path.join(D, "revisadas.json")
    if os.path.exists(rev):
        for k, v in json.load(open(rev, encoding="utf-8")).items(): clas[int(k)] = dict(clas.get(int(k), {}), **v)
    en_bat = set()
    for f in glob.glob(os.path.join(SALA, "tema-*.json")):
        t = json.load(open(f, encoding="utf-8"))
        if t["tema"] in TEMAS: en_bat.update(x for x in t.get("bateria", []) if isinstance(x, int))
    t12 = json.load(open(os.path.join(SALA, "programa-t12.json"), encoding="utf-8"))
    huerfanas = {k: v for k, v in t12.get("huerfanas", {}).items() if int(k) in qs}
    errores, p1, no = [], 0, 0
    for i, r in sorted(clas.items()):
        if i not in qs: errores.append("id %d no existe" % i); continue
        if r.get("p1"):
            p1 += 1
            if r.get("tema") not in TEMAS: errores.append("id %d: tema %s no es del parcial" % (i, r.get("tema"))); continue
            if i not in en_bat: huerfanas.setdefault(str(i), r["tema"])
        else: no += 1
    if errores: print("\n".join(errores)); sys.exit("%d errores" % len(errores))
    ruta = os.path.join(SALA, NOM)
    p = json.load(open(ruta, encoding="utf-8")) if os.path.exists(ruta) else {}
    parcial = [i for i, q in qs.items() if q["topic"] == PARCIAL]
    parcial.sort(key=lambda i: qs[i].get("n") or 0)
    p.update({
        "titulo": "Repaso completo del 1.er parcial · todas las preguntas anteriores (exámenes, kahoots, pruebas y recopilatorios)",
        "despues": 17, "temas": TEMAS, "tam": 100, "origen": "anteriores",
        "intro": "Todas las preguntas que ya se han hecho alguna vez sobre materia del 1.er parcial: exámenes y parciales de otros años, kahoots y cuestionarios de los profesores, pruebas de clase y los recopilatorios de preguntas de otros cursos. De los bancos que mezclan los dos parciales (recopilatorios, exámenes de cabeza, «2.º parcial») entran solo las que tratan temas del primero (osteología, ATM, base del cráneo, cavidad bucal, meninges, médula, tronco, cerebelo, diencéfalo, telencéfalo, ventrículos, vegetativo y vascularización). El parcial de 2025-26 va entero como examen propio; el resto, repartido en exámenes de unas 100 con todos los temas mezclados.",
        "huerfanas": huerfanas,
    })
    if parcial and not p.get("examenes"):
        p["examenes"] = [parcial]; p["fijos"] = [0]; p["nombres"] = {"0": "1.er parcial 2025-26, el examen real completo"}
    print("clasificadas: %d (p1 %d · no %d · dudosas %d) · huérfanas del programa: %d" % (len(clas), p1, no, sum(1 for r in clas.values() if r.get("dudosa")), len(huerfanas)))
    if PRUEBA: return
    json.dump(p, open(ruta, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    subprocess.run([sys.executable, os.path.join(R, "tools", "programa_repaso.py"), "anat3", NOM], check=True)
    subprocess.run([sys.executable, os.path.join(R, "tools", "estudio_validar.py"), "anat3"], check=True)


main()
