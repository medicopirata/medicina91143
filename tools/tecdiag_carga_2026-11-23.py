#!/usr/bin/env python3
"""Técnicas de Diagnóstico Anatómicas, carga del 23-11-2026: preguntas de examen (55),
cuestionarios de los profesores Alfredo y José (5 bloques × 15) y preguntas dichas en clase (20).
Idempotente.

Lee apuntes_extra/tecdiag-carga-2026-11-23.json ({"cae_r", "bancos": [{"banco", "id0", "preguntas"}]}).
En el JSON la PRIMERA opción es siempre la correcta; aquí se rotan para que la clave quede
repartida (si la última opción es del tipo «Todas son falsas» se deja al final). Comprueba
opciones, clave, explicación e imagen; las preguntas con «cae» (las que leyó la profesora
María en su repaso) llevan {p, c, r, f: 2}. Los bancos van al final de ALL_QUESTIONS, cada
uno con sus ids (id0 + n - 1); si ya estaban, se sustituyen sin mover nada más.
Uso: python3 tools/tecdiag_carga_2026-11-23.py [--prueba]
"""
import json, os, re, sys, unicodedata

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
H = os.path.join(R, "plataforma_tecdiag.html")
J = os.path.join(R, "apuntes_extra", "tecdiag-carga-2026-11-23.json")
PRUEBA = "--prueba" in sys.argv
PIN = re.compile(r"^(todas?|ningun[ao])\b", re.I)


def norma(s):
    s = unicodedata.normalize("NFKD", (s or "").lower())
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"\W+", " ", s).strip()


def main():
    X = json.load(open(J, encoding="utf-8"))
    s = open(H, encoding="utf-8").read()
    m = re.search(r"const ALL_QUESTIONS = (\[.*?\]);\n", s, re.S)
    qs = json.loads(m.group(1))
    errores, nuevas, ids = [], [], set()
    for b in X["bancos"]:
        banco, id0 = b["banco"], b["id0"]
        vistos = set()
        for n, p in enumerate(b["preguntas"], 1):
            i = id0 + n - 1
            ctx = "%s #%d %s" % (banco[:28], i, p["q"][:50])
            if i in ids: errores.append("id repetido: " + ctx); continue
            ids.add(i)
            ops = [str(o).strip() for o in p["options"]]
            if not 4 <= len(ops) <= 5 or len({norma(o) for o in ops}) != len(ops): errores.append("opciones: " + ctx); continue
            if norma(p["q"]) in vistos: errores.append("enunciado repetido en el banco: " + ctx); continue
            vistos.add(norma(p["q"]))
            exp = p["exp"].strip()
            if len(exp) < 80: errores.append("explicación corta: " + ctx); continue
            # rotar: la correcta (primera) va a la posición n % k, sin mover «Todas son falsas» del final
            fijo = ops[-1] if PIN.match(ops[-1]) else None
            cuerpo = ops[:-1] if fijo else ops
            k = len(cuerpo); pos = n % k
            rot = cuerpo[-pos:] + cuerpo[:-pos] if pos else cuerpo[:]
            assert rot[pos] == ops[0]
            if fijo: rot.append(fijo)
            q = {"id": i, "topic": banco, "topicBase": banco, "fileId": i, "origQ": n,
                 "q": p["q"].strip(), "options": rot, "correct": pos, "exp": exp, "n": n}
            if p.get("img"):
                if not os.path.exists(os.path.join(R, p["img"])): errores.append("imagen inexistente: " + ctx); continue
                q["img"] = p["img"]
            if p.get("cae"):
                q["cae"] = {"p": p["cae"][:300], "c": "", "r": X["cae_r"], "f": 2}
            nuevas.append(q)
    if errores:
        print("\n".join(errores)); sys.exit("%d errores: no se escribe nada" % len(errores))
    bancos = [b["banco"] for b in X["bancos"]]
    qs = [q for q in qs if q["id"] not in ids and q["topic"] not in bancos] + nuevas
    assert len({q["id"] for q in qs}) == len(qs)
    s = s[:m.start(1)] + json.dumps(qs, ensure_ascii=False) + s[m.end(1):]
    m2 = re.search(r"const TOPIC_COUNTS = (\{.*?\});\n", s, re.S)
    tc = {}
    for q in qs: tc[q["topic"]] = tc.get(q["topic"], 0) + 1
    s = s[:m2.start(1)] + json.dumps(tc, ensure_ascii=False) + s[m2.end(1):]
    import collections
    print("plataforma: %d preguntas · nuevas %d · con cae %d · con imagen %d" % (len(qs), len(nuevas), sum(1 for q in nuevas if q.get("cae")), sum(1 for q in nuevas if q.get("img"))))
    for b in bancos: print("  %3d  %s" % (tc[b], b))
    print("  clave por posición:", dict(sorted(collections.Counter(q["correct"] for q in nuevas).items())))
    if PRUEBA: return
    open(H, "w", encoding="utf-8").write(s)


main()
