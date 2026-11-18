#!/usr/bin/env python3
"""Fisiología I, mejora de la sala del 18-11-2026: preguntas nuevas escritas por los ayudantes para las
negritas de las presentaciones y los seminarios que no tenían pregunta. Idempotente.

Lee apuntes_extra/fisio1-carga-2026-11-18.json ({"nota", "bancos": [{"banco", "preguntas": [...]}], "siglas": {...}}):
- comprueba cada pregunta (4 opciones distintas, clave, explicación >= 60 con etiqueta, id en el rango de la
  carga y sin repetir, enunciado no repetido en el banco);
- preguntas para bancos que ya existen: detrás de la última del banco (n y origQ siguen); bancos «Apuntes:»
  nuevos: detrás del último banco «Apuntes:»; otros bancos nuevos: al final;
- si una pregunta de la carga ya estaba (mismo id), la sustituye sin mover nada; TOPIC_COUNTS al día;
- añade las siglas nuevas a estudio/fisio1/siglas.json.
Uso: python3 tools/fisio1_carga_2026-11-18.py [--prueba]
"""
import json, os, re, sys, unicodedata

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
H = os.path.join(R, "plataforma_fisio1.html")
J = os.path.join(R, "apuntes_extra", "fisio1-carga-2026-11-18.json")
SIGLAS = os.path.join(R, "estudio", "fisio1", "siglas.json")
RANGO = (97886, 98165)
ETIQUETA = {"A": "🎓 Dicha en clase.", "B": "📌 Deducida de sus pistas.", "C": "🤖 Propuesta por Claude, no dicha en clase."}
PRUEBA = "--prueba" in sys.argv


def norma(s):
    s = unicodedata.normalize("NFKD", (s or "").lower())
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"\W+", " ", s).strip()


def es_imagen(banco):
    return banco.startswith(("⭐", "🖼️"))


def main():
    X = json.load(open(J, encoding="utf-8"))
    s = open(H, encoding="utf-8").read()
    m = re.search(r"const ALL_QUESTIONS = (\[.*?\]);\n", s, re.S)
    qs = json.loads(m.group(1))
    por_id = {q["id"]: q for q in qs}
    errores = []
    nuevas = []
    vistos = set()
    for b in X["bancos"]:
        banco = b["banco"]
        for p in b["preguntas"]:
            i = p.get("id")
            ctx = "%s #%s %s" % (banco[:30], i, (p.get("q") or "")[:50])
            if not isinstance(i, int) or not RANGO[0] <= i <= RANGO[1]:
                errores.append("id fuera de rango: " + ctx); continue
            if i in vistos:
                errores.append("id repetido: " + ctx); continue
            vistos.add(i)
            ops = [str(o).strip() for o in p.get("options") or []]
            if len(ops) != 4 or len({norma(o) for o in ops}) != 4:
                errores.append("opciones: " + ctx); continue
            if not isinstance(p.get("correct"), int) or not 0 <= p["correct"] < 4:
                errores.append("clave: " + ctx); continue
            exp = (p.get("exp") or "").strip()
            if es_imagen(banco):
                if not exp.startswith(("🔬", "⭐")):
                    exp = "🔬 " + exp
            else:
                et = ETIQUETA.get(p.get("g") or "")
                if not exp.startswith(("🎓", "📌", "🤖")):
                    if not et:
                        errores.append("sin etiqueta g: " + ctx); continue
                    exp = et + " " + exp
            if len(exp) < 60:
                errores.append("explicación corta: " + ctx); continue
            q = {"id": i, "topic": banco, "topicBase": banco, "fileId": i, "origQ": 0,
                 "q": p["q"].strip(), "options": ops, "correct": p["correct"], "exp": exp, "n": 0}
            if p.get("img"):
                if not os.path.exists(os.path.join(R, p["img"])):
                    errores.append("imagen inexistente %s: %s" % (p["img"], ctx)); continue
                q["img"] = p["img"]
            if es_imagen(banco):
                q["w"] = 2
            c = p.get("cae")
            if c and c.get("p"):
                q["cae"] = {"p": str(c["p"])[:300], "c": str(c.get("c", ""))[:200], "r": str(c.get("r", ""))[:200], "f": 2 if c.get("f") == 2 else 1}
            nuevas.append(q)
    # duplicados de enunciado dentro del mismo banco (contra lo que ya hay, sin contar la propia carga)
    ya = {}
    for q in qs:
        if q["id"] not in vistos:
            ya.setdefault(q["topic"], set()).add(norma(q["q"]))
    for q in nuevas:
        if norma(q["q"]) in ya.get(q["topic"], ()):
            errores.append("enunciado ya existente en el banco: %s #%d %s" % (q["topic"][:30], q["id"], q["q"][:50]))
    if errores:
        print("\n".join(errores)); sys.exit("%d errores: no se escribe nada" % len(errores))

    # quitar las de esta carga si ya estaban (idempotencia) y colocar
    qs = [q for q in qs if q["id"] not in vistos]
    existentes = {q["topic"] for q in qs}
    bancos_orden = list(dict.fromkeys(q["topic"] for q in nuevas))
    por_banco = {b: [q for q in nuevas if q["topic"] == b] for b in bancos_orden}
    for b in bancos_orden:
        lote = por_banco[b]
        if b in existentes:
            pos = max(k for k, q in enumerate(qs) if q["topic"] == b) + 1
            n0 = max((q.get("n") or q.get("origQ") or 0) for q in qs if q["topic"] == b)
        elif b.startswith("Apuntes:"):
            pos = max(k for k, q in enumerate(qs) if q["topic"].startswith("Apuntes:")) + 1
            n0 = 0
        else:
            pos = len(qs); n0 = 0
        for k, q in enumerate(lote, 1):
            q["n"] = q["origQ"] = n0 + k
        qs = qs[:pos] + lote + qs[pos:]
        existentes.add(b)
    # correcciones (Taller 6, solución oficial)
    por_id = {q["id"]: q for q in qs}
    ncorr = 0
    for c in X.get("correcciones") or []:
        q = por_id.get(c["id"])
        if not q:
            print("corrección a id inexistente", c["id"]); continue
        if "antes" not in c:
            c["antes"] = {"q": q["q"], "options": q["options"], "correct": q["correct"], "exp": q["exp"], "cae": q.get("cae"), "also": q.get("also")}
        if c.get("options"): q["options"] = c["options"]
        if isinstance(c.get("correct"), int): q["correct"] = c["correct"]
        if c.get("exp"): q["exp"] = c["exp"]
        if c.get("q"): q["q"] = c["q"]
        if "also" in c:
            if c["also"]: q["also"] = c["also"]
            else: q.pop("also", None)
        if c.get("cae") and c["cae"].get("p"):
            cc = c["cae"]; q["cae"] = {"p": str(cc["p"])[:300], "c": str(cc.get("c", ""))[:200], "r": str(cc.get("r", ""))[:200], "f": 2 if cc.get("f") == 2 else 1}
        assert 0 <= q["correct"] < len(q["options"])
        ncorr += 1
    assert len({q["id"] for q in qs}) == len(qs)
    s = s[:m.start(1)] + json.dumps(qs, ensure_ascii=False) + s[m.end(1):]
    m2 = re.search(r"const TOPIC_COUNTS = (\{.*?\});\n", s, re.S)
    tc = {}
    for q in qs:
        tc[q["topic"]] = tc.get(q["topic"], 0) + 1
    s = s[:m2.start(1)] + json.dumps(tc, ensure_ascii=False) + s[m2.end(1):]
    m3 = re.search(r"(SECTIONS\.push\(\{id:'imgclase'.*?ord:)(\{.*?\})", s)
    if m3:
        orden = json.loads(m3.group(2))
        for b in bancos_orden:
            if es_imagen(b) and b not in orden:
                orden[b] = max(orden.values()) + 1
        s = s[:m3.start(2)] + json.dumps(orden, ensure_ascii=False, separators=(",", ":")) + s[m3.end(2):]
    print("plataforma:", len(qs), "preguntas;", {b: tc[b] for b in bancos_orden}, "| correcciones:", ncorr,
          "| cae nuevas:", sum(1 for q in nuevas if q.get("cae")))
    if PRUEBA:
        return
    open(H, "w", encoding="utf-8").write(s)
    if ncorr:
        json.dump(X, open(J, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    sig = json.load(open(SIGLAS, encoding="utf-8"))
    nsig = 0
    for k, v in (X.get("siglas") or {}).items():
        if k not in sig and v:
            sig[k] = v; nsig += 1
    if nsig:
        json.dump(sig, open(SIGLAS, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("siglas nuevas:", nsig)


main()
