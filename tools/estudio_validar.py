#!/usr/bin/env python3
"""Comprueba los temas del modo estudio y rehace el índice.

Uso:  python3 tools/estudio_validar.py <clave>      (p. ej. fisio1)

Mira estudio/<clave>/tema-NN.json: campos obligatorios, tipos de bloque, que
los ids de previa/comprueba/bateria existen en la plataforma, que las preguntas
propias están bien formadas y que el cuadro de rellenar tiene huecos. Después
escribe estudio/<clave>/indice.json. Formato en tools/estudio_instrucciones.md.
"""
import glob, hashlib, json, os, subprocess, sys, time

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLATAFORMA = {"fisio1": ("plataforma_fisio1.html", "Fisiología I"), "medint": ("plataforma_medint.html", "Introducción a la Medicina Interna (IMI)"), "anat3": ("plataforma_anatomia3.html", "Anatomía Humana III"), "histo21": ("plataforma_histologia2.1.html", "Histología Especial I"), "genetica": ("plataforma_genetica.html", "Genética Clínica"), "tecdiag": ("plataforma_tecdiag.html", "Técnicas de Diagnóstico Anatómicas")}
TIPOS = {"texto": ["md"], "clave": ["md"], "cuadro": ["cab", "filas"], "flujo": [],
         "bucle": ["estimulo", "respuesta"], "parejas": ["pares"], "cifras": ["items"], "formula": ["expr"], "porque": ["pregunta", "respuesta"],
         "asi": ["md"], "trampa": ["md"], "libro": ["md"], "img": ["src"]}


def ids_plataforma(clave):
    s = open(os.path.join(RAIZ, PLATAFORMA[clave][0]), encoding="utf-8").read()
    i = s.index("const ALL_QUESTIONS = ") + len("const ALL_QUESTIONS = ")
    qs, _ = json.JSONDecoder().raw_decode(s[i:])
    return {q["id"] for q in qs}


def de_examen(clave):
    """Ids de preguntas de examen (mismo criterio que examenes() en estudio.js)."""
    s = open(os.path.join(RAIZ, PLATAFORMA[clave][0]), encoding="utf-8").read()
    i = s.index("const ALL_QUESTIONS = ") + len("const ALL_QUESTIONS = ")
    qs, _ = json.JSONDecoder().raw_decode(s[i:])
    return {q["id"] for q in qs if (q.get("topicBase") or "").startswith("📝") or "Examen" in (q.get("topicBase") or "") or q.get("caida")}


def de_cae(clave):
    """Ids de preguntas sobre lo que el profesor dijo que cae (q.cae, tools/marcar_cae.py)."""
    s = open(os.path.join(RAIZ, PLATAFORMA[clave][0]), encoding="utf-8").read()
    i = s.index("const ALL_QUESTIONS = ") + len("const ALL_QUESTIONS = ")
    qs, _ = json.JSONDecoder().raw_decode(s[i:])
    return {q["id"] for q in qs if q.get("cae")}


def imagenes(clave):
    s = open(os.path.join(RAIZ, PLATAFORMA[clave][0]), encoding="utf-8").read()
    i = s.index("const ALL_QUESTIONS = ") + len("const ALL_QUESTIONS = ")
    qs, _ = json.JSONDecoder().raw_decode(s[i:])
    return {q["id"]: q["img"] for q in qs if q.get("img")}


# ------------------------------------------------------------- qué ha cambiado
# La sala marca las lecciones que han cambiado desde la última vez que se
# abrieron, y dentro de ellas los apartados nuevos o retocados. Para eso el
# índice lleva, de cada tema, «mod» (cuándo cambió por última vez su contenido,
# en ms) y «nov» (los últimos cambios: [{t, s: [huellas de los apartados que
# entraron o cambiaron]}]). Se saca del historial de git del archivo, así que
# no depende de cómo estuviera el índice antes. La batería y las preguntas de
# previa/comprueba no cuentan: solo lo que se lee.
def huellas(t):
    h = lambda x: hashlib.sha1(json.dumps(x, ensure_ascii=False, sort_keys=True).encode()).hexdigest()[:8]
    secs = [{k: v for k, v in s.items() if k not in ("previa", "comprueba")} for s in t.get("secciones", [])]
    resto = {k: v for k, v in t.items() if k not in ("bateria", "secciones")}
    sh = [h(x) for x in secs]
    return h([resto, sh]), sh


def historia(ruta, actual):
    rel = os.path.relpath(ruta, RAIZ)
    try:
        log = subprocess.run(["git", "log", "--format=%H %ct", "--", rel], cwd=RAIZ, capture_output=True, text=True).stdout.split()
    except Exception:
        log = []
    versiones = []
    for i in range(len(log) - 2, -1, -2):          # de la más antigua a la más reciente
        try:
            txt = subprocess.run(["git", "show", "%s:%s" % (log[i], rel)], cwd=RAIZ, capture_output=True, text=True).stdout
            versiones.append((int(log[i + 1]) * 1000, huellas(json.loads(txt))))
        except Exception:
            pass
    ha = huellas(actual)
    if not versiones or versiones[-1][1][0] != ha[0]:   # cambios sin publicar todavía
        versiones.append((int(time.time() * 1000), ha))
    mod, nov = versiones[0][0], []
    for (t0, (h0, s0)), (t1, (h1, s1)) in zip(versiones, versiones[1:]):
        if h1 == h0: continue
        mod = t1
        nuevas = [x for x in s1 if x not in s0]
        if nov and t1 - nov[-1]["t"] < 6 * 3600 * 1000:   # varias tandas del mismo día: un solo cambio
            nov[-1]["t"] = t1
            nov[-1]["s"] = [x for x in nov[-1]["s"] if x in s1] + [x for x in nuevas if x not in nov[-1]["s"]]
        else:
            nov.append({"t": t1, "s": nuevas})
    return mod, ha[1], nov[-12:]


def main():
    if len(sys.argv) != 2: raise SystemExit(__doc__)
    clave = sys.argv[1]
    ids = ids_plataforma(clave)
    carpeta = os.path.join(RAIZ, "estudio", clave)
    errores, errores_suaves, indice = [], [], []
    qimg = imagenes(clave)
    examen = de_examen(clave)
    caen = examen | de_cae(clave)
    for f in sorted(glob.glob(os.path.join(carpeta, "tema-*.json"))):
        nom = os.path.basename(f)
        def mal(m): errores.append("%s: %s" % (nom, m))
        try: t = json.load(open(f, encoding="utf-8"))
        except Exception as e: mal("JSON inválido: %s" % e); continue
        for k in ("tema", "titulo", "bloque", "intro", "secciones", "bateria"):
            if k not in t: mal("falta «%s»" % k)
        def ref(x, donde):
            if isinstance(x, int):
                if x not in ids: mal("%s: id %d no existe" % (donde, x))
            elif isinstance(x, dict):
                ops = x.get("options") or []
                if not x.get("q") or len(ops) < 3 or not isinstance(x.get("correct"), int) or not 0 <= x["correct"] < len(ops) or not x.get("exp"):
                    mal("%s: pregunta propia mal formada" % donde)
            else: mal("%s: referencia rara %r" % (donde, x))
        avisos_tema = []
        def aviso(m): errores_suaves.append("%s: %s" % (nom, m))
        if not 0 <= t.get("peso", 0) <= 3: mal("peso fuera de 0–3")
        if not 4 <= len(t.get("secciones", [])) <= 8: aviso("%d secciones (lo normal, 4–7)" % len(t.get("secciones", [])))
        imgs = set()
        for s in t.get("secciones", []):
            d = "sección %s" % s.get("id")
            if not s.get("titulo"): mal(d + ": sin título")
            for x in s.get("previa", []): ref(x, d + " previa")
            for x in s.get("comprueba", []): ref(x, d + " comprueba")
            if not s.get("comprueba"): mal(d + ": sin comprueba")
            if not 0 <= s.get("peso", 0) <= 3: mal(d + ": peso fuera de 0–3")
            if set(x for x in s.get("previa", []) if isinstance(x, int)) & set(x for x in s.get("comprueba", []) if isinstance(x, int)): mal(d + ": la misma pregunta en previa y comprueba")
            if len(s.get("previa", [])) > 2: aviso(d + ": más de 2 previas")
            for b in s.get("bloques", []):
                if b.get("tipo") == "img": imgs.add(b.get("src"))
            for b in s.get("bloques", []):
                tp = b.get("tipo")
                if tp not in TIPOS: mal("%s: tipo de bloque «%s»" % (d, tp)); continue
                for k in TIPOS[tp]:
                    if not b.get(k): mal("%s: bloque %s sin «%s»" % (d, tp, k))
                if tp == "flujo" and not (b.get("pasos") or b.get("ramas")): mal("%s: flujo sin pasos ni ramas" % d)
                if tp == "img" and not os.path.exists(os.path.join(RAIZ, b["src"])): mal("%s: no existe la imagen %s" % (d, b["src"]))
                if tp == "cuadro" and any(len(r) != len(b["cab"]) for r in b.get("filas", [])): mal("%s: cuadro «%s» con filas de distinto ancho" % (d, b.get("titulo")))
        rs = t.get("rellenar") or []
        if isinstance(rs, dict): rs = [rs]
        huecos = 0
        for r in rs:
            huecos += sum(1 for fila in r.get("filas", []) for c in fila if isinstance(c, dict) and c.get("h"))
            if any(len(fila) != len(r.get("cab", [])) for fila in r.get("filas", [])): mal("rellenar «%s» con filas de distinto ancho" % r.get("titulo"))
        if rs and huecos < 3: mal("rellenar con %d huecos" % huecos)
        if huecos > 24: aviso("rellenar con %d huecos (mucho)" % huecos)
        if not 2 <= len(t.get("explicalo", [])) <= 5: aviso("%d explícalo (lo normal, 2–4)" % len(t.get("explicalo", [])))
        for s in t.get("secciones", []):
            for x in s.get("comprueba", []) + s.get("previa", []):
                q = qimg.get(x) if isinstance(x, int) else None
                if q and q in imgs: aviso("sección %s: la pregunta %d usa una imagen que ya se enseña en el texto (mira que el pie no dé la respuesta)" % (s.get("id"), x))
        for x in t.get("bateria", []): ref(x, "batería")
        if len(set(t.get("bateria", []))) != len(t.get("bateria", [])): mal("batería con ids repetidos")
        indice.append({"tema": t.get("tema"), "titulo": t.get("titulo"), "bloque": t.get("bloque"), "archivo": nom,
                       "peso": t.get("peso", 0), "minutos": t.get("minutos", 0), "secciones": len(t.get("secciones", [])),
                       "bateria": len(t.get("bateria", [])),
                       "examen": sum(1 for x in t.get("bateria", []) if x in examen),
                       "caen": sum(1 for x in t.get("bateria", []) if x in caen)})
        mod, sh, nov = historia(f, t)
        indice[-1].update({"mod": mod, "sh": sh, "nov": nov})
        for k in ("etiqueta", "corta"):
            if t.get(k): indice[-1][k] = t[k]
    indice.sort(key=lambda x: x["tema"])
    json.dump({"asignatura": PLATAFORMA[clave][1], "temas": indice}, open(os.path.join(carpeta, "indice.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    for e in errores_suaves: print("· aviso:", e)
    for e in errores: print("✗", e)
    print("%d temas · %d errores · índice rehecho" % (len(indice), len(errores)))
    sys.exit(1 if errores else 0)

main()
