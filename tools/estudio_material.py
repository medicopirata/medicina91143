#!/usr/bin/env python3
"""Reúne el material para escribir el modo estudio de un tema (estudio.js).

Uso:  python3 tools/estudio_material.py <clave> <N> [salida.md]
      p. ej.  python3 tools/estudio_material.py fisio1 7 /tmp/t7.md
      Unidades que no son «Tema N» (Anatomía 3: «Tema 4 (II)», «Osteología…», talleres):
      python3 tools/estudio_material.py anat3 - salida.md --unidad "Tema 4 (II)." --banco "Tema 4 \(II\)"
      (--unidad: comienzo del título de la unidad en los apuntes; --banco: regex de sus bancos propios,
      que se buscan en «Apuntes: …», «⭐ Imágenes clave · …» y «🖼️ Más imágenes · …»)
      Unidades hechas de apartados sueltos (Histología: un bloque partido en varias unidades):
      python3 tools/estudio_material.py histo21 3 salida.md --mapa mapa.json
      mapa.json = {"3": {"trozo": "regex sobre el título del trozo", "banco": "regex sobre topicBase"}, …};
      todas las unidades del mapa entran en el parecido por vocabulario.

Saca, en un markdown para leer:
  1. Los apuntes del tema (apuntes_txt/<clave>.json, trozos «Tema N · …»).
  2. Las pistas de examen que nombran el tema.
  3. Las preguntas de los bancos del propio tema («… Tema N …»: apuntes,
     Guyton, Kahoot), con su id, clave, origen y en qué examen cayeron.
  4. Las preguntas de exámenes, bloques, seminarios y prácticas que más se
     parecen al tema (por vocabulario), con su puntuación: son candidatas,
     hay que confirmar a mano que de verdad son de este tema.

El formato del archivo de estudio está en tools/estudio_instrucciones.md.
"""
import json, math, os, re, sys, unicodedata
from collections import Counter

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLATAFORMA = {"fisio1": "plataforma_fisio1.html", "medint": "plataforma_medint.html", "anat3": "plataforma_anatomia3.html",
              "histo21": "plataforma_histologia2.1.html"}
PROPIOS = re.compile(r"^(Apuntes: |⭐ Imágenes clave · |🖼️ Más imágenes · )")
# Título de un trozo de apuntes que es del Tema N: «Tema 7 · …» (Fisio) o «… › Tema 7. …» (IMI)
RE_TROZO = r"(?:^|› )Tema (\d+)(?:[ .·]|$)"
# Lecciones que se preparan por el libro (IMI): «… › Lección 6. … (Sisinio cap. 5; …)». Se piden como L6
RE_LECCION = r"› Lección (\d+)\. [^›]*Sisinio cap\. (\d+)"
MAX_CAND = 300

VACIAS = set("""sobre entre desde hasta cuando donde porque aunque mientras tambien siempre puede pueden
tiene tienen hacia segun respecto cual cuales esta estas este estos esa esas ese esos aquel otra otras otro
otros todo todos toda todas mayor menor mismo misma cada sino solo tanto tanta parte forma modo caso lugar
señale senale correcta incorrecta falsa verdadera respuesta afirmacion siguiente siguientes enunciado
ninguna anteriores todas produce producen mediante dentro fuera antes despues durante""".split())


def norma(t):
    t = unicodedata.normalize("NFD", str(t).lower())
    return "".join(c for c in t if unicodedata.category(c) != "Mn")


def palabras(t):
    return [w for w in re.findall(r"[a-z0-9]{4,}", norma(t)) if w not in VACIAS]


def preguntas(clave):
    s = open(os.path.join(RAIZ, PLATAFORMA[clave]), encoding="utf-8").read()
    i = s.index("const ALL_QUESTIONS = ") + len("const ALL_QUESTIONS = ")
    qs, _ = json.JSONDecoder().raw_decode(s[i:])
    return qs


def origen(q):
    t, e = q["topicBase"], q.get("exp", "")
    if t.startswith("📝") or "Examen" in t: return "examen"
    if q.get("caida"): return "examen"
    if t.startswith("🎯"): return "profesor (Kahoot/prueba de clase)"
    if t.startswith("🧪") or t.startswith("🔬"): return "seminario/práctica"
    if t.startswith("📕"): return "Guyton"
    if t.startswith("Bloque"): return "recopilación"
    if e.startswith("🎓"): return "dicha en clase"
    if e.startswith("📌"): return "deducida de sus pistas"
    if e.startswith("🤖"): return "refuerzo"
    return "apuntes"


def fmt_q(q, extra=""):
    ops = "\n".join("   %s%s) %s" % ("✅ " if i == q["correct"] else "", "abcdefgh"[i], o) for i, o in enumerate(q["options"]))
    caida = (" · cayó en: " + ", ".join(q["caida"])) if q.get("caida") else ""
    img = (" · img: " + q["img"]) if q.get("img") else ""
    return "- **id %d** [%s · %s%s%s]%s\n   %s\n%s\n   _exp:_ %s\n" % (
        q["id"], q["topicBase"], origen(q), caida, img, extra, q["q"], ops, q.get("exp", "")[:500])


def main():
    if len(sys.argv) < 3: raise SystemExit(__doc__)
    args = sys.argv[1:]
    opc = {}
    for k in ("--unidad", "--banco", "--mapa"):
        if k in args: i = args.index(k); opc[k] = args[i + 1]; del args[i:i + 2]
    clave, n = args[0], args[1].upper()
    n = int(n) if n.isdigit() else n
    sal = args[2] if len(args) > 2 else None
    if "--mapa" in opc: return por_mapa(clave, str(args[1]), json.load(open(opc["--mapa"], encoding="utf-8")), sal)
    if "--unidad" in opc: return por_unidad(clave, opc["--unidad"], opc.get("--banco") or re.escape(opc["--unidad"].rstrip(".")), sal)
    ap = json.load(open(os.path.join(RAIZ, "apuntes_txt", clave + ".json"), encoding="utf-8"))["trozos"]
    caps = {}
    def num(t):
        m = re.search(RE_LECCION, t)
        if m and not re.search(RE_TROZO, t):
            caps["L" + m.group(1)] = int(m.group(2))
            return "L" + m.group(1)
        m = re.search(RE_TROZO, t)
        return int(m.group(1)) if m else None
    tema = [(t, x) for t, x in ap if num(t) == n]
    pistas = [(t, x) for t, x in ap if t.startswith("Pistas") and re.search(r"\b[Tt]ema %s\b|\bT%s\b" % (n, n), t + " " + x)]
    qs = preguntas(clave)
    # Banco propio: «… Tema N …», o para una lección, la autoevaluación de su capítulo del Sisinio
    re_tema = re.compile(r"\bTema %d\b" % n) if isinstance(n, int) else re.compile(r"Sisinio cap\. %d\b" % caps.get(n, -1))
    propias = [q for q in qs if re_tema.search(q["topicBase"])]
    otras = [q for q in qs if not re.search(r"\bTema \d+\b", q["topicBase"]) and not re_tema.search(q["topicBase"])]

    # Parecido por vocabulario: tf-idf del tema contra cada pregunta sin tema
    docs = {}
    for t, x in ap:
        k = num(t)
        if k is not None: docs.setdefault(k, Counter()).update(palabras(x))
    df = Counter()
    for c in docs.values(): df.update(set(c))
    N = len(docs)
    def peso(w): return math.log((N + 1) / (df.get(w, 0) + 1))
    def vec(c): return {w: (1 + math.log(f)) * peso(w) for w, f in c.items()}
    vt = {k: vec(c) for k, c in docs.items()}
    def puntua(q, k):
        c = Counter(palabras(q["q"] + " " + " ".join(q["options"]) + " " + q.get("exp", "")))
        v = vec(c); a = vt[k]
        num = sum(v[w] * a.get(w, 0) for w in v)
        den = math.sqrt(sum(x * x for x in v.values())) * math.sqrt(sum(x * x for x in a.values())) or 1
        return num / den
    cand = []
    for q in otras:
        sc = {k: puntua(q, k) for k in vt}
        mejor = max(sc, key=sc.get)
        if mejor == n and sc[n] > 0.04: cand.append((sc[n], q))
    cand.sort(key=lambda x: -x[0])
    if len(cand) > MAX_CAND: print("aviso: %d candidatas; salen las %d más parecidas" % (len(cand), MAX_CAND)); cand = cand[:MAX_CAND]

    out = ["# Material para el modo estudio · %s · %s\n" % (clave, ("Tema %d" % n) if isinstance(n, int) else "Lección %s (Sisinio cap. %s)" % (n[1:], caps.get(n)))]
    out.append("## 1. Apuntes del tema (%d trozos)\n" % len(tema))
    for t, x in tema: out.append("### %s\n\n%s\n" % (t, x))
    out.append("## 2. Pistas de examen que nombran el tema (%d)\n" % len(pistas))
    for t, x in pistas: out.append("### %s\n\n%s\n" % (t, x))
    out.append("## 3. Preguntas de los bancos del tema (%d)\n" % len(propias))
    for q in propias: out.append(fmt_q(q))
    out.append("## 4. Candidatas de exámenes, bloques, seminarios y prácticas (%d; confirmar)\n" % len(cand))
    for s_, q in cand: out.append(fmt_q(q, " · parecido %.2f" % s_))
    texto = "\n".join(out)
    if sal: open(sal, "w", encoding="utf-8").write(texto); print("%s · %d KB · %d propias · %d candidatas" % (sal, len(texto) // 1024, len(propias), len(cand)))
    else: print(texto)


def por_unidad(clave, unidad, banco, sal):
    """Material de una unidad por el comienzo de su título (primer nivel del trozo de apuntes)."""
    ap = json.load(open(os.path.join(RAIZ, "apuntes_txt", clave + ".json"), encoding="utf-8"))["trozos"]
    def uni(t): return t.split(" › ")[0].strip()
    def es_unidad(u): return re.match(r"(Tema \d|Desarrollo|Osteolog|Taller)", u)
    tema = [(t, x) for t, x in ap if uni(t).startswith(unidad)]
    if not tema: raise SystemExit("no hay trozos de apuntes que empiecen por %r" % unidad)
    clave_u = uni(tema[0][0])
    generales = [(t, x) for t, x in ap if not es_unidad(uni(t)) and re.search(r"Pistas|examen", t, re.I)]
    qs = preguntas(clave)
    re_b = re.compile(banco)
    propias = [q for q in qs if PROPIOS.match(q["topicBase"]) and re_b.search(q["topicBase"])]
    otras = [q for q in qs if not PROPIOS.match(q["topicBase"])]
    docs = {}
    for t, x in ap:
        if es_unidad(uni(t)): docs.setdefault(uni(t), Counter()).update(palabras(x))
    df = Counter()
    for c in docs.values(): df.update(set(c))
    N = len(docs)
    def peso(w): return math.log((N + 1) / (df.get(w, 0) + 1))
    def vec(c): return {w: (1 + math.log(f)) * peso(w) for w, f in c.items()}
    vt = {k: vec(c) for k, c in docs.items()}
    def puntua(q, k):
        v = vec(Counter(palabras(q["q"] + " " + " ".join(q["options"]) + " " + q.get("exp", "")))); a = vt[k]
        num = sum(v[w] * a.get(w, 0) for w in v)
        den = math.sqrt(sum(x * x for x in v.values())) * math.sqrt(sum(x * x for x in a.values())) or 1
        return num / den
    cand = []
    for q in otras:
        sc = {k: puntua(q, k) for k in vt}
        mejor = max(sc, key=sc.get)
        if mejor == clave_u and sc[mejor] > 0.04: cand.append((sc[mejor], q))
    cand.sort(key=lambda x: -x[0])
    if len(cand) > MAX_CAND: print("aviso: %d candidatas; salen las %d más parecidas" % (len(cand), MAX_CAND)); cand = cand[:MAX_CAND]
    out = ["# Material para el modo estudio · %s · %s\n" % (clave, clave_u)]
    out.append("## 1. Apuntes de la unidad (%d trozos)\n" % len(tema))
    for t, x in tema: out.append("### %s\n\n%s\n" % (t, x))
    out.append("## 2. Pistas generales de examen (%d)\n" % len(generales))
    for t, x in generales: out.append("### %s\n\n%s\n" % (t, x))
    out.append("## 3. Preguntas de los bancos de la unidad (%d)\n" % len(propias))
    for q in propias: out.append(fmt_q(q))
    out.append("## 4. Candidatas de exámenes, bancos de otros cursos, prácticas y Kahoot (%d; confirmar)\n" % len(cand))
    for s_, q in cand: out.append(fmt_q(q, " · parecido %.2f" % s_))
    texto = "\n".join(out)
    if sal: open(sal, "w", encoding="utf-8").write(texto); print("%s · %d KB · %d propias · %d candidatas" % (sal, len(texto) // 1024, len(propias), len(cand)))
    else: print(texto)


def por_mapa(clave, n, mapa, sal):
    """Material de la unidad n del mapa: trozos cuyo título casa con su regex «trozo»; banco propio, el de «banco»."""
    ap = json.load(open(os.path.join(RAIZ, "apuntes_txt", clave + ".json"), encoding="utf-8"))["trozos"]
    res = {k: re.compile(v["trozo"]) for k, v in mapa.items()}
    def uni(t):
        for k, r in res.items():
            if r.search(t): return k
    tema = [(t, x) for t, x in ap if uni(t) == n]
    if not tema: raise SystemExit("ningún trozo casa con la unidad %s" % n)
    generales = [(t, x) for t, x in ap if uni(t) is None and re.search(r"Pistas|examen", t, re.I)]
    qs = preguntas(clave)
    bancos = {k: re.compile(v["banco"]) for k, v in mapa.items()}
    propias = [q for q in qs if bancos[n].search(q["topicBase"])]
    de_otra = lambda q: any(r.search(q["topicBase"]) for k, r in bancos.items() if k != n) and q["topicBase"].startswith("Apuntes:")
    otras = [q for q in qs if not bancos[n].search(q["topicBase"]) and not de_otra(q)]
    docs = {}
    for t, x in ap:
        k = uni(t)
        if k: docs.setdefault(k, Counter()).update(palabras(x))
    df = Counter()
    for c in docs.values(): df.update(set(c))
    N = len(docs)
    def peso(w): return math.log((N + 1) / (df.get(w, 0) + 1))
    def vec(c): return {w: (1 + math.log(f)) * peso(w) for w, f in c.items()}
    vt = {k: vec(c) for k, c in docs.items()}
    def puntua(q, k):
        v = vec(Counter(palabras(q["q"] + " " + " ".join(q["options"]) + " " + q.get("exp", "")))); a = vt[k]
        num = sum(v[w] * a.get(w, 0) for w in v)
        den = math.sqrt(sum(x * x for x in v.values())) * math.sqrt(sum(x * x for x in a.values())) or 1
        return num / den
    cand = []
    for q in otras:
        sc = {k: puntua(q, k) for k in vt}
        mejor = max(sc, key=sc.get)
        if mejor == n and sc[n] > 0.04: cand.append((sc[n], q))
    cand.sort(key=lambda x: -x[0])
    if len(cand) > MAX_CAND: print("aviso: %d candidatas; salen las %d más parecidas" % (len(cand), MAX_CAND)); cand = cand[:MAX_CAND]
    out = ["# Material para el modo estudio · %s · unidad %s\n" % (clave, n)]
    out.append("## 1. Apuntes de la unidad (%d trozos)\n" % len(tema))
    for t, x in tema: out.append("### %s\n\n%s\n" % (t, x))
    out.append("## 2. Pistas generales de examen (%d)\n" % len(generales))
    for t, x in generales: out.append("### %s\n\n%s\n" % (t, x))
    out.append("## 3. Preguntas de los bancos de la unidad (%d; si un banco abarca varias unidades, quédate con las que son de esta)\n" % len(propias))
    for q in propias: out.append(fmt_q(q))
    out.append("## 4. Candidatas de otros bancos parecidas por vocabulario (%d; confirmar)\n" % len(cand))
    for s_, q in cand: out.append(fmt_q(q, " · parecido %.2f" % s_))
    texto = "\n".join(out)
    if sal: open(sal, "w", encoding="utf-8").write(texto); print("%s · %d KB · %d propias · %d candidatas" % (sal, len(texto) // 1024, len(propias), len(cand)))
    else: print(texto)


main()
