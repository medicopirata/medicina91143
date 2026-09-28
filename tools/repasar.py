#!/usr/bin/env python3
"""Repasa las preguntas de una plataforma y saca lo que huele mal.

No juzga medicina: comprueba lo que se puede comprobar solo mirando los datos,
que es donde están los fallos que de verdad fastidian al estudiar —una pregunta
repetida con dos respuestas distintas, una opción duplicada, un enunciado
cortado, una imagen que no carga—.

Uso:  python3 tools/repasar.py <plataforma.html> [más plataformas…]
"""
import json, os, re, sys, unicodedata
from collections import Counter, defaultdict

ETIQUETAS = ("\U0001F393 Dicha en clase.", "\U0001F4CC Deducida de sus pistas.",
             "\U0001F916 Propuesta por Claude, no dicha en clase.",
             "\U0001F5BC️ Pregunta con imagen.")


def norm(s):
    """Normaliza para comparar, sin cargarse lo que distingue dos opciones.

    Aquí «2α + 2β» y «2α + 2δ» son respuestas distintas, igual que «CD4⁺» y
    «CD4⁻», «+0,4 mV» y «−0,4 mV», o «FENa >2 %» y «FENa =2 %». Una
    normalización que borre todo lo que no sea a-z0-9 las iguala y luego las da
    por repetidas, que fueron los primeros falsos positivos. Así que se quitan
    los acentos y la puntuación de adorno, pero se conservan las letras griegas,
    los signos y los operadores de comparación.
    """
    s = (s or "").lower()
    s = s.replace("\u2212", "-").replace("\u207a", "+").replace("\u207b", "-")
    s = "".join(c for c in unicodedata.normalize("NFD", s)
                if not unicodedata.combining(c))
    s = re.sub(r"[^0-9a-z\u0370-\u03ff+\-/<>=\u2264\u2265 ]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def cuerpo_exp(e):
    e = e or ""
    for t in ETIQUETAS:
        if e.startswith(t):
            return e[len(t):].strip()
    return e.strip()


def preguntas(ruta):
    s = open(ruta, encoding="utf-8").read()
    return json.loads(re.search(r"^const ALL_QUESTIONS = (.*?);$", s, re.M | re.S).group(1))


def revisar(ruta):
    qs = preguntas(ruta)
    base = os.path.dirname(os.path.abspath(ruta))
    fallos = defaultdict(list)

    for q in qs:
        ident = "%s · %s" % (q["id"], (q.get("q") or "")[:60])
        ops = q.get("options") or []

        if not (q.get("q") or "").strip():
            fallos["enunciado vacío"].append(ident)
        elif len(q["q"].strip()) < 12:
            fallos["enunciado demasiado corto"].append(ident)
        elif q["q"].rstrip().endswith(("...", "…")) and "?" not in q["q"]:
            fallos["enunciado que parece cortado"].append(ident)

        if len(ops) < 2:
            fallos["menos de dos opciones"].append(ident)
        if any(not (o or "").strip() for o in ops):
            fallos["alguna opción vacía"].append(ident)
        if not isinstance(q.get("correct"), int) or not 0 <= q["correct"] < len(ops):
            fallos["respuesta fuera de rango"].append(ident)

        rep = [o for o, n in Counter(norm(o) for o in ops).items() if n > 1 and o]
        if rep:
            fallos["opciones repetidas dentro de la pregunta"].append(ident)

        if q.get("img"):
            if not os.path.exists(os.path.join(base, q["img"])) and not q["img"].startswith("data:"):
                fallos["imagen que no existe"].append(ident)

        if not cuerpo_exp(q.get("exp")):
            fallos["sin explicación"].append(ident)

    # Repetidas: mismo enunciado y mismas opciones. La imagen entra en la clave
    # porque hay enunciados genéricos («Conteste sobre la zona señalada (C)»)
    # que se repiten sobre láminas distintas: son preguntas diferentes.
    porclave = defaultdict(list)
    for q in qs:
        porclave[(norm(q.get("q")),
                  tuple(sorted(norm(o) for o in q.get("options") or [])),
                  q.get("img", ""))].append(q)
    for grupo in porclave.values():
        if len(grupo) < 2:
            continue
        correctas = {norm((g.get("options") or [""])[g["correct"]])
                     for g in grupo if isinstance(g.get("correct"), int)
                     and 0 <= g["correct"] < len(g.get("options") or [])}
        etiqueta = ("repetida CON RESPUESTAS DISTINTAS" if len(correctas) > 1
                    else "repetida (misma respuesta)")
        fallos[etiqueta].append("ids %s · %s" % (
            ", ".join(str(g["id"]) for g in grupo), (grupo[0].get("q") or "")[:60]))

    return len(qs), fallos


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    total_general = Counter()
    for ruta in sys.argv[1:]:
        n, fallos = revisar(ruta)
        print("\n=== %s · %d preguntas" % (os.path.basename(ruta), n))
        if not fallos:
            print("   nada que señalar")
        for k in sorted(fallos, key=lambda x: -len(fallos[x])):
            total_general[k] += len(fallos[k])
            print("   %-42s %5d" % (k, len(fallos[k])))
            if "RESPUESTAS DISTINTAS" in k or len(fallos[k]) <= 6:
                for x in fallos[k][:6]:
                    print("        ·", x[:110])
    print("\n=== total")
    for k, v in total_general.most_common():
        print("   %-42s %5d" % (k, v))


if __name__ == "__main__":
    main()
