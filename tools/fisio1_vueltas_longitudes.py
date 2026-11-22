#!/usr/bin/env python3
"""Comprueba que en las vueltas la longitud de la opción correcta no la delate.
   python3 tools/fisio1_vueltas_longitudes.py NN [NN…] | todos
Regla por pregunta: la correcta no puede medir más de 1,10 × el distractor más largo ni
menos de 0,90 × el distractor más corto. Regla por lote: la correcta es la más larga en
el 15-35 % de las preguntas y la más corta en el 15-35 % (si nunca es la más larga, la
opción más larga delata que es falsa)."""
import json, re, sys, glob

D = "apuntes_extra/fisio1-vueltas"


def revisar(n, mostrar=True):
    v = json.load(open(f"{D}/vueltas-{n:02d}.json", encoding="utf-8"))
    ps = v["preguntas"]; mal = []; mx = mn = 0
    for i, p in enumerate(ps):
        L = [len(o.strip()) for o in p["options"]]; c = L[p["correct"]]; otros = L[:p["correct"]] + L[p["correct"] + 1:]
        if c == max(L) and L.count(c) == 1: mx += 1
        if c == min(L) and L.count(c) == 1: mn += 1
        if c > 1.10 * max(otros): mal.append((i, p["de"], "correcta demasiado larga", L, p["correct"]))
        elif c < 0.90 * min(otros): mal.append((i, p["de"], "correcta demasiado corta", L, p["correct"]))
    pmx, pmn = mx * 100 // max(1, len(ps)), mn * 100 // max(1, len(ps))
    errores = len(mal) + (pmx > 35 or pmx < 15) + (pmn > 35 or pmn < 15)
    if mostrar:
        print(f"lote {n:02d}: {len(ps)} vueltas · correcta la más larga {pmx} % · la más corta {pmn} % · {len(mal)} preguntas fuera de regla · {'OK' if not errores else 'CORREGIR'}")
        for i, d, m, L, c in mal[:60]: print(f"  · #{i} (de {d}): {m}; longitudes {L}, correcta la {'abcd'[c]}")
        if len(mal) > 60: print(f"  · … y {len(mal) - 60} más")
        if pmx > 35: print("  · la correcta es la más larga en más del 35 % de las preguntas: acorta correctas o alarga distractores en más preguntas")
        if pmn > 35: print("  · la correcta es la más corta en más del 35 % de las preguntas")
        if pmx < 15: print("  · la correcta es la más larga en menos del 15 %: deja que en ~1 de cada 4 preguntas la correcta sea la más larga (sin pasarse del 10 % sobre el siguiente distractor)")
        if pmn < 15: print("  · la correcta es la más corta en menos del 15 %: en ~1 de cada 4 preguntas la correcta debe ser la más corta")
    return errores


if __name__ == "__main__":
    args = sys.argv[1:] or ["todos"]
    ns = sorted(int(re.search(r"vueltas-(\d+)", f).group(1)) for f in glob.glob(f"{D}/vueltas-??.json")) if args == ["todos"] else [int(a) for a in args]
    tot = sum(revisar(n) for n in ns)
    print(f"{tot} problemas" if args != ["todos"] else "")
