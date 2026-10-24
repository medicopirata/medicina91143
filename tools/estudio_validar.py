#!/usr/bin/env python3
"""Comprueba los temas del modo estudio y rehace el índice.

Uso:  python3 tools/estudio_validar.py <clave>      (p. ej. fisio1)

Mira estudio/<clave>/tema-NN.json: campos obligatorios, tipos de bloque, que
los ids de previa/comprueba/bateria existen en la plataforma, que las preguntas
propias están bien formadas y que el cuadro de rellenar tiene huecos. Después
escribe estudio/<clave>/indice.json. Formato en tools/estudio_instrucciones.md.
"""
import glob, json, os, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLATAFORMA = {"fisio1": ("plataforma_fisio1.html", "Fisiología I"), "medint": ("plataforma_medint.html", "Introducción a la Medicina Interna (IMI)")}
TIPOS = {"texto": ["md"], "clave": ["md"], "cuadro": ["cab", "filas"], "flujo": [],
         "bucle": ["estimulo", "respuesta"], "parejas": ["pares"], "cifras": ["items"], "formula": ["expr"], "porque": ["pregunta", "respuesta"],
         "asi": ["md"], "trampa": ["md"], "libro": ["md"], "img": ["src"]}


def ids_plataforma(clave):
    s = open(os.path.join(RAIZ, PLATAFORMA[clave][0]), encoding="utf-8").read()
    i = s.index("const ALL_QUESTIONS = ") + len("const ALL_QUESTIONS = ")
    qs, _ = json.JSONDecoder().raw_decode(s[i:])
    return {q["id"] for q in qs}


def imagenes(clave):
    s = open(os.path.join(RAIZ, PLATAFORMA[clave][0]), encoding="utf-8").read()
    i = s.index("const ALL_QUESTIONS = ") + len("const ALL_QUESTIONS = ")
    qs, _ = json.JSONDecoder().raw_decode(s[i:])
    return {q["id"]: q["img"] for q in qs if q.get("img")}


def main():
    if len(sys.argv) != 2: raise SystemExit(__doc__)
    clave = sys.argv[1]
    ids = ids_plataforma(clave)
    carpeta = os.path.join(RAIZ, "estudio", clave)
    errores, errores_suaves, indice = [], [], []
    qimg = imagenes(clave)
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
                       "bateria": len(t.get("bateria", []))})
        for k in ("etiqueta", "corta"):
            if t.get(k): indice[-1][k] = t[k]
    indice.sort(key=lambda x: x["tema"])
    json.dump({"asignatura": PLATAFORMA[clave][1], "temas": indice}, open(os.path.join(carpeta, "indice.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    for e in errores_suaves: print("· aviso:", e)
    for e in errores: print("✗", e)
    print("%d temas · %d errores · índice rehecho" % (len(indice), len(errores)))
    sys.exit(1 if errores else 0)

main()
