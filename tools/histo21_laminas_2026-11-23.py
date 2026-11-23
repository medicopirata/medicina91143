#!/usr/bin/env python3
"""Histología Especial I, 23-11-2026: láminas del libro de prácticas (fotos del PDF «IMÁGENES DE HISTOLOGÍA CON
SOLUCIÓN», láminas 10-33 con sus respuestas) convertidas en preguntas de imagen por cuatro ayudantes
(apuntes_extra/histo21-laminas-2026-11-23/lote*.jsonl, formato del SPEC.md de esa carpeta). Idempotente.

- Recorta cada figura (una vez por lámina+figura) de los PNG renderizados (RUTA_PNG/pageN.png, bbox en píxeles)
  a histo21_img/lamina-<lámina>-<figura>.jpg y la comparte entre todas las preguntas de esa figura.
- Un banco por apartado de la portada: «📷 Láminas del libro de prácticas · <apartado>», ids desde 93001,
  y da de alta el banco en SEC_MAPA para que salga en su apartado.
- Rota las opciones para que la correcta no caiga siempre en el mismo sitio.
Uso: python3 tools/histo21_laminas_2026-11-23.py [--prueba]
"""
import collections, glob, json, os, re, subprocess, sys, unicodedata

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
H = os.path.join(R, "plataforma_histologia2.1.html")
D = os.path.join(R, "apuntes_extra", "histo21-laminas-2026-11-23")
RUTA_PNG = os.environ.get("RUTA_PNG", "/private/tmp/claude-501/-Users-santi/413357e9-9d6f-4407-a8b5-46f0af76d970/scratchpad/histo/h2")
ID0 = 93001
PRUEBA = "--prueba" in sys.argv
PREFIJO = "📷 Láminas del libro de prácticas · "
APARTADOS = {"sangre": "Tejido sanguíneo y hematopoyesis", "linf": "Órganos linfoides", "circ": "Aparato circulatorio",
             "resp": "Aparato respiratorio", "dig": "Tubo digestivo", "gla": "Glándulas anejas del digestivo",
             "uri": "Aparato urinario", "masc": "Reproductor masculino", "fem": "Reproductor femenino", "teg": "Sistema tegumentario"}


def norma(s):
    s = unicodedata.normalize("NFKD", (s or "").lower())
    return "".join(c for c in s if not unicodedata.combining(c))


def apartado(p):
    lam = int(re.match(r"\d+", str(p["lamina"])).group())
    org = norma(p.get("organo", "") + " " + p.get("q", ""))
    if lam <= 12:
        return "linf" if re.search(r"ganglio|bazo|timo|amigdal|linfoid|malt|placa de peyer", org) else "sangre"
    if lam <= 14: return "circ"
    if lam <= 16: return "resp"
    if lam <= 25:
        return "gla" if re.search(r"higado|hepat|pancrea|salival|parotid|submandibular|sublingual|vesicula biliar", org) else "dig"
    if lam <= 27: return "uri"
    if lam <= 29: return "masc"
    if lam <= 32: return "fem"
    return "teg"


def recorte(p):
    lam = str(p["lamina"]).replace("(", "").replace(")", "").replace(" ", "")
    dest_rel = "histo21_img/lamina-%s-%s.jpg" % (lam, str(p["figura"]).strip())
    dest = os.path.join(R, dest_rel)
    if os.path.exists(dest): return dest_rel
    png = os.path.join(RUTA_PNG, "page%d.png" % int(p["pag"]))
    x, y, w, h = [int(round(v)) for v in p["bbox"]]
    if not os.path.exists(png) or w < 60 or h < 60: return None
    tmp = dest + ".png"
    if subprocess.run(["sips", "-c", str(h), str(w), "--cropOffset", str(y), str(x), png, "--out", tmp], capture_output=True).returncode != 0: return None
    subprocess.run(["sips", "-s", "format", "jpeg", "-s", "formatOptions", "85", tmp, "--out", dest], capture_output=True)
    os.remove(tmp)
    return dest_rel if os.path.exists(dest) else None


def main():
    filas = []
    for f in sorted(glob.glob(os.path.join(D, "lote*.jsonl"))):
        for l in open(f, encoding="utf-8"):
            if l.strip(): filas.append(json.loads(l))
    errores, nuevas, vistos = [], [], set()
    for k, p in enumerate(filas):
        ops = [str(o).strip() for o in p["options"]]
        ctx = "lámina %s fig %s n.º %s %s" % (p.get("lamina"), p.get("figura"), p.get("numero"), p["q"][:40])
        if len(ops) != 4 or len({norma(o) for o in ops}) != 4: errores.append("opciones: " + ctx); continue
        if not 0 <= p["correct"] < 4: errores.append("clave: " + ctx); continue
        if len(p["exp"].strip()) < 80: errores.append("explicación corta: " + ctx); continue
        if norma(p["q"]) in vistos: errores.append("repetida: " + ctx); continue
        vistos.add(norma(p["q"]))
        img = recorte(p)
        if not img: errores.append("sin recorte: " + ctx); continue
        ap = apartado(p)
        banco = PREFIJO + APARTADOS[ap]
        c = k % 4                                   # posición final de la correcta: repartida
        pos = (c - p["correct"]) % 4
        rot = ops[-pos:] + ops[:-pos] if pos else ops[:]
        assert rot[c] == ops[p["correct"]]
        exp = "🔬 " + p["exp"].strip()
        if p.get("nota"): exp += "\n\n⚠️ " + p["nota"].strip()
        nuevas.append({"topic": banco, "topicBase": banco, "q": p["q"].strip(), "options": rot, "correct": c, "exp": exp, "img": img, "w": 2, "_ap": ap})
    if errores:
        print("\n".join(errores)); sys.exit("%d errores: no se escribe nada" % len(errores))
    # ids estables por (banco, enunciado), en el orden de los apartados
    orden = list(APARTADOS)
    nuevas.sort(key=lambda q: orden.index(q["_ap"]))
    s = open(H, encoding="utf-8").read()
    m = re.search(r"const ALL_QUESTIONS = (\[.*?\]);\n", s, re.S)
    qs = json.loads(m.group(1))
    bancos = {q["topic"] for q in nuevas}
    previos = {(q["topic"], q["q"]): q["id"] for q in qs if q["topic"] in bancos}
    qs = [q for q in qs if q["topic"] not in bancos]
    ocupados = {q["id"] for q in qs} | set(previos.values())
    libre = (i for i in range(ID0, ID0 + 50000) if i not in ocupados)
    n_banco = collections.Counter()
    for q in nuevas:
        i = previos.get((q["topic"], q["q"])) or next(libre)
        n_banco[q["topic"]] += 1
        q.update({"id": i, "fileId": i, "origQ": n_banco[q["topic"]], "n": n_banco[q["topic"]]})
        del q["_ap"]
    qs += nuevas
    assert len({q["id"] for q in qs}) == len(qs)
    s = s[:m.start(1)] + json.dumps(qs, ensure_ascii=False) + s[m.end(1):]
    m2 = re.search(r"const TOPIC_COUNTS = (\{.*?\});\n", s, re.S)
    tc = collections.OrderedDict()
    for q in qs: tc[q["topic"]] = tc.get(q["topic"], 0) + 1
    s = s[:m2.start(1)] + json.dumps(tc, ensure_ascii=False) + s[m2.end(1):]
    m3 = re.search(r"const SEC_MAPA = (\{.*?\});", s)
    sec = json.loads(m3.group(1))
    for ap, nom in APARTADOS.items(): sec.setdefault(PREFIJO + nom, ap)
    s = s[:m3.start(1)] + json.dumps(sec, ensure_ascii=False) + s[m3.end(1):]
    print("plataforma: %d preguntas · láminas: %d en %d bancos · figuras recortadas: %d" % (len(qs), len(nuevas), len(bancos), len({q["img"] for q in nuevas})))
    for b in bancos: print("  %3d  %s" % (tc[b], b))
    print("  clave por posición:", dict(sorted(collections.Counter(q["correct"] for q in nuevas).items())))
    if PRUEBA: return
    open(H, "w", encoding="utf-8").write(s)


main()
