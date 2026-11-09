#!/usr/bin/env python3
"""Rehace los exámenes de un programa de repaso de la sala de estudio.

Uso:  python3 tools/programa_repaso.py <clave> <archivo>
      (p. ej. anat3 programa-t12.json)

Un programa es un apartado de la sala hecho solo de preguntas: «las que más
caen» (exámenes de otros años y lo que el profesor dijo que cae) de las
baterías de unos temas, más las preguntas de examen huérfanas (no están en
ninguna batería) que se han asignado a mano a esos temas en «huerfanas»
({id: tema}). Con "todos": true entran todos los temas de la sala y el
programa va detrás del último (crece cuando se añaden temas). Se reparten en exámenes de unas «tam» preguntas, mezclando
todos los temas en la misma proporción en cada examen.

El reparto se conserva entre ejecuciones: las preguntas que ya estaban en un
examen se quedan en él (así su historial sigue valiendo) y las nuevas van a
los exámenes más cortos; si todos se pasan de tam + 10, se abre uno nuevo.
Las preguntas repetidas (mismo enunciado y mismas opciones) entran una vez.
Después hay que pasar tools/estudio_validar.py <clave> para el índice.
"""
import glob, json, os, random, re, sys, unicodedata

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def preguntas(clave):
    from estudio_validar import PLATAFORMA
    s = open(os.path.join(RAIZ, PLATAFORMA[clave][0]), encoding="utf-8").read()
    i = s.index("const ALL_QUESTIONS = ") + len("const ALL_QUESTIONS = ")
    return {q["id"]: q for q in json.JSONDecoder().raw_decode(s[i:])[0]}


RE_EXAMEN = re.compile(r"ex[aá]men(es)?|parcial|convocatoria|\bglobal\b|\b(enero|febrero|junio|julio|septiembre|diciembre)\b|a[ñn]os anteriores", re.I)
CAIDAS = set()


def examen_real(q):
    tb = q.get("topicBase") or ""
    return bool(q.get("caida")) or (tb.startswith("📝") and bool(RE_EXAMEN.search(tb))) or (tb.startswith("Apuntes:") and "examen real" in tb.lower())


def de_examen(q):
    """Mismo criterio que deExamen() de estudio.js (con Entrenador.origen): también las de
    un banco de entrenamiento cuyo enunciado es el de una pregunta que cayó en examen."""
    tb = q.get("topicBase") or ""
    return tb.startswith("📝") or "Examen" in tb or examen_real(q) or norma(q["q"]) in CAIDAS


def norma(x):
    x = unicodedata.normalize("NFD", str(x).lower())
    return re.sub(r"[^a-z0-9]+", " ", "".join(c for c in x if unicodedata.category(c) != "Mn")).strip()


def main():
    if len(sys.argv) != 3: raise SystemExit(__doc__)
    clave, nom = sys.argv[1:]
    carpeta = os.path.join(RAIZ, "estudio", clave)
    ruta = os.path.join(carpeta, nom)
    p = json.load(open(ruta, encoding="utf-8"))
    qs = preguntas(clave)
    CAIDAS.update(k for k in (norma(q["q"]) for q in qs.values() if examen_real(q)) if len(k) >= 25)
    tam = p.get("tam", 100)
    # «todos»: el programa es de la asignatura entera y crece con la sala (va detrás del último tema)
    if p.get("todos"):
        p["temas"] = sorted(json.load(open(f, encoding="utf-8"))["tema"] for f in glob.glob(os.path.join(carpeta, "tema-*.json")))
        p["despues"] = p["temas"][-1]

    archivo = {json.load(open(f, encoding="utf-8"))["tema"]: f for f in glob.glob(os.path.join(carpeta, "tema-*.json"))}
    # Qué entra, y de qué tema es cada una (el primero que la tenga en su batería)
    tema = {}
    for n in p["temas"]:
        t = json.load(open(archivo[n], encoding="utf-8"))
        for x in t.get("bateria", []):
            if isinstance(x, int) and x in qs and x not in tema and (de_examen(qs[x]) or qs[x].get("cae")):
                tema[x] = n
    for x, n in p.get("huerfanas", {}).items():
        x = int(x)
        if x not in qs: print("✗ huérfana %d no existe" % x); continue
        if n not in p["temas"]: print("✗ huérfana %d va al tema %s, fuera del programa" % (x, n)); continue
        tema.setdefault(x, n)

    # Sin repetidas: se queda la de examen antes que la de «cae», y la de id más bajo
    vistas, fuera = {}, set()
    for x in sorted(tema, key=lambda x: (not de_examen(qs[x]), x)):
        k = norma(qs[x]["q"]) + "|" + "|".join(sorted(norma(o) for o in qs[x]["options"]))
        if k in vistas: fuera.add(x)
        else: vistas[k] = x
    for x in fuera: del tema[x]

    # Lo que ya estaba repartido se queda donde estaba
    exs = [[x for x in e if x in tema] for e in p.get("examenes", [])]
    puestas = {x for e in exs for x in e}
    nuevas = [x for x in tema if x not in puestas]
    if not exs:
        exs = [[] for _ in range(max(1, round(len(nuevas) / tam)))]
    # Reparto por temas y, dentro de cada tema, alternando las de examen y las de «cae»,
    # para que cada examen tenga de todo en la misma proporción
    rnd = random.Random(clave + nom)
    cola = []
    for n in p["temas"]:
        de_n = [x for x in nuevas if tema[x] == n]
        rnd.shuffle(de_n)
        de_n.sort(key=lambda x: not de_examen(qs[x]))
        cola += de_n
    for x in cola:
        e = min(exs, key=len)
        if len(e) >= tam + 10:
            e = []
            exs.append(e)
        e.append(x)

    p["examenes"] = exs
    p["tema"] = {str(x): tema[x] for e in exs for x in e}
    json.dump(p, open(ruta, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    por_tema = {n: sum(1 for x in tema.values() if x == n) for n in p["temas"]}
    print("%s: %d preguntas (%d huérfanas, %d repetidas fuera) en %d exámenes de %s" % (
        nom, len(tema), sum(1 for x in p.get("huerfanas", {}) if int(x) in tema), len(fuera), len(exs), "/".join(str(len(e)) for e in exs)))
    print("por tema:", ", ".join("T%d %d" % kv for kv in por_tema.items()))


main()
