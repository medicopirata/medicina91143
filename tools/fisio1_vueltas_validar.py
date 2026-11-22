#!/usr/bin/env python3
"""Valida un lote de vueltas: python3 tools/fisio1_vueltas_validar.py NN [NN…] | todos
Comprueba 4 vueltas por pregunta base, 4 opciones distintas, clave en rango, explicación
suficiente, ángulos distintos y que ningún enunciado repita la base ni otra vuelta."""
import json, re, sys, glob, unicodedata, collections

D = "apuntes_extra/fisio1-vueltas"
ANG = {"inversa", "distractor", "aplicada", "mecanismo"}


def nn(t):
    t = unicodedata.normalize("NFKD", (t or "").lower())
    t = "".join(c for c in t if not unicodedata.combining(c))
    return set(w for w in re.findall(r"[a-z0-9]+", t) if len(w) > 3)


def jac(a, b):
    return len(a & b) / max(1, len(a | b))


def validar(n):
    err = []
    try:
        lote = json.load(open(f"{D}/base/lote-{n:02d}.json", encoding="utf-8"))
        v = json.load(open(f"{D}/vueltas-{n:02d}.json", encoding="utf-8"))
    except Exception as e:
        return [f"no se puede leer el lote o las vueltas: {e}"], 0
    base = {q["id"]: q for q in lote["preguntas"]}
    ps = v.get("preguntas", [])
    por = collections.defaultdict(list)
    for i, p in enumerate(ps):
        d = p.get("de")
        if d not in base:
            err.append(f"#{i}: 'de' {d} no está en el lote"); continue
        por[d].append(p)
        if not isinstance(p.get("q"), str) or len(p["q"].strip()) < 15: err.append(f"#{i} (de {d}): enunciado vacío o muy corto")
        o = p.get("options")
        if not isinstance(o, list) or len(o) != 4 or any(not isinstance(x, str) or not x.strip() for x in o): err.append(f"#{i} (de {d}): hacen falta 4 opciones con texto")
        elif len(set(x.strip().lower() for x in o)) < 4: err.append(f"#{i} (de {d}): opciones repetidas")
        elif any(re.search(r"todas las anteriores|ninguna de las anteriores|\b[abcd] y [abcd]\b", x, re.I) for x in o): err.append(f"#{i} (de {d}): opción «todas/ninguna/a y b»")
        if not isinstance(p.get("correct"), int) or not 0 <= p["correct"] <= 3: err.append(f"#{i} (de {d}): 'correct' debe ser 0-3")
        if not isinstance(p.get("exp"), str) or len(p["exp"]) < 100: err.append(f"#{i} (de {d}): explicación de menos de 100 caracteres")
        elif "Vuelta a la pregunta" not in p["exp"]: err.append(f"#{i} (de {d}): la explicación no termina con «▸ Vuelta a la pregunta de …»")
        if p.get("angulo") not in ANG: err.append(f"#{i} (de {d}): ángulo desconocido {p.get('angulo')!r}")
        if isinstance(p.get("q"), str) and jac(nn(p["q"]), nn(base[d]["q"])) > 0.6: err.append(f"#{i} (de {d}): el enunciado repite la pregunta base")
    for d, q in base.items():
        l = por.get(d, [])
        if len(l) != 4: err.append(f"base {d}: tiene {len(l)} vueltas, no 4")
        angs = [p.get("angulo") for p in l]
        if len(set(angs)) != len(angs): err.append(f"base {d}: ángulos repetidos {angs}")
        for i in range(len(l)):
            for j in range(i + 1, len(l)):
                if jac(nn(l[i].get("q", "")), nn(l[j].get("q", ""))) > 0.6: err.append(f"base {d}: dos vueltas con el mismo enunciado")
    return err, len(ps)


if __name__ == "__main__":
    args = sys.argv[1:] or ["todos"]
    ns = sorted(int(re.search(r"(\d+)", f).group(1)) for f in glob.glob(f"{D}/vueltas-??.json")) if args == ["todos"] else [int(a) for a in args]
    tot = 0
    for n in ns:
        err, k = validar(n)
        tot += len(err)
        print(f"lote {n:02d}: {k} vueltas · {len(err)} errores")
        for e in err[:40]: print("  ·", e)
        if len(err) > 40: print(f"  · … y {len(err) - 40} más")
    if args != ["todos"]: print(f"{tot} errores")
