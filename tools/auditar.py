#!/usr/bin/env python3
"""Audita la integridad y el peso de todas las plataformas de estudio.

Comprueba de golpe lo que se ha ido rompiendo alguna vez: claves fuera de
rango, ids repetidos, contadores desfasados, preguntas sin explicación,
enunciados cortados, restos de solucionario dentro de las opciones y
duplicados reales. Y mide lo que tarda el navegador en arrancar: tamaño del
archivo, del bloque de preguntas y de las imágenes embebidas.

No cambia nada: solo informa. Las correcciones van en herramientas aparte.

Uso:  python3 tools/auditar.py                 # todas
      python3 tools/auditar.py plataforma_mir.html [...]
      python3 tools/auditar.py --detalle        # lista los casos, no solo cuenta
"""
import glob, json, os, re, sys, collections, unicodedata

LIMITE_EXP = 60          # caracteres de explicación real por debajo de los cuales no explica
LIMITE_MB = 3.0          # a partir de aquí el arranque en móvil se nota


def normaliza(s):
    """Minúsculas sin tildes, sin espacios y sin el punto final.

    No se quita nada más porque todo lo demás significa: al quitar la
    puntuación a lo bruto, «+0,4 mV» y «−0,4 mV» quedaban idénticas, «5,25» y
    «52,5» también, las opciones de flechas (↑↑↑, ↑↓↑) se quedaban vacías y el
    × y el / de las fórmulas desaparecían. Eso daba 173 falsos positivos de
    opciones repetidas.
    """
    s = unicodedata.normalize("NFD", (s or "").lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = re.sub(r"[\u2212\u2013\u2014]", "-", s)
    return re.sub(r"\s+", "", s).rstrip(".")


def exp_real(q):
    """Explicación quitando la etiqueta de procedencia y la referencia final."""
    e = (q.get("exp") or "").strip()
    e = re.sub(r"^(?:[\U0001F300-\U0001FAFF☀-➿]️?\s*)+", "", e)
    e = re.sub(r"^(Dicha en clase|Deducida de sus pistas|Propuesta por Claude[^.]*|"
               r"Pregunta con imagen)\.\s*", "", e)
    e = re.sub(r"\s*\([^)]*\)\s*$", "", e)
    return e.strip()


def datos(ruta):
    s = open(ruta, encoding="utf-8").read()
    mq = re.search(r"const ALL_QUESTIONS = (\[.*?\]);\n", s, re.S)
    mt = re.search(r"const TOPIC_COUNTS = (\{.*?\});\n", s, re.S)
    if not mq:
        return None
    return {
        "html": s,
        "qs": json.loads(mq.group(1)),
        "counts": json.loads(mt.group(1)) if mt else None,
        "bytes_q": mq.end() - mq.start(),
    }


def auditar(ruta, detalle=False):
    d = datos(ruta)
    if d is None:
        return {"archivo": ruta, "error": "sin ALL_QUESTIONS"}
    qs, s = d["qs"], d["html"]
    r = {"archivo": ruta, "preguntas": len(qs), "bancos": len({q["topic"] for q in qs}),
         "casos": collections.defaultdict(list)}

    def anota(clave, q, extra=""):
        r["casos"][clave].append("%s%s" % (q.get("id"), " " + extra if extra else ""))

    ids = collections.Counter(q.get("id") for q in qs)
    for q in qs:
        if ids[q.get("id")] > 1:
            anota("id repetido", q)
        opts = q.get("options")
        # Una sola opción «Mostrar respuesta» es una pregunta de desarrollo de
        # examen real, no una pregunta rota: se cuentan aparte.
        if isinstance(opts, list) and len(opts) == 1 and normaliza(opts[0]) == "mostrarrespuesta":
            r.setdefault("abiertas", 0)
            r["abiertas"] += 1
            continue
        if not isinstance(opts, list) or len(opts) < 2:
            anota("menos de 2 opciones", q)
            continue
        c = q.get("correct")
        if c is None or not isinstance(c, int):
            if not q.get("also"):
                anota("sin clave", q)
        elif not (0 <= c < len(q["options"])):
            anota("clave fuera de rango", q)
        if q.get("also"):
            anota("campo also (doble respuesta)", q)
        if not (q.get("q") or "").strip():
            anota("enunciado vacio", q)
        if not exp_real(q):
            anota("sin explicacion", q)
        elif len(exp_real(q)) < LIMITE_EXP:
            anota("explicacion corta", q)
        # opciones iguales entre sí dentro de la misma pregunta
        vistos = collections.Counter(normaliza(o) for o in q["options"])
        if any(v > 1 for v in vistos.values()):
            anota("opciones duplicadas", q)
        # restos de solucionario u OCR dentro de las opciones
        # Restos de solucionario o de OCR dentro de una opción. Ojo con las
        # mayúsculas: «TRABAJO» en caja alta es un título de trabajo de clase
        # pegado por el OCR, pero «trabajo respiratorio» es una opción normal,
        # así que estos dos patrones van sin re.I.
        for o in q["options"]:
            if (re.search(r"respuesta\s+correcta|soluci[oó]n\s*:", o, re.I)
                    or re.search(r"^\s*[a-e]\)\s*[a-e]\)", o)
                    or re.search(r"\bTRABAJO\b|\bGRUPO \d", o)):
                anota("resto de solucionario en opcion", q, o[:40])
                break
        # Enunciado probablemente cortado. Las preguntas de imagen quedan
        # fuera: las suyas son frases abiertas a propósito («El 2 es», «La
        # flecha señala»), no enunciados truncados.
        # Solo se marca lo que parece truncado de verdad: acabar en coma o en
        # conjunción. Acabar en «es», «a», «de» es el patrón normal de las
        # preguntas para completar («El disco articular está unido a…»), que
        # son correctas y eran casi todo lo que marcaba antes esta regla.
        t = (q.get("q") or "").strip()
        if (t and not q.get("img") and len(t) > 25 and not t.endswith("…")
                and re.search(r"(,|\s+[yoe]|\s+pero|\s+aunque)\s*$", t)):
            anota("enunciado posiblemente cortado", q)

    # Duplicados reales: mismo enunciado, mismas opciones, misma clave Y misma
    # imagen. La imagen es imprescindible en la firma: muchas preguntas de
    # imagen comparten enunciado genérico («El 2 es», «¿Qué tinción es?») y
    # sin ella 465 preguntas distintas de Histología parecían repetidas.
    firmas = collections.defaultdict(list)
    for q in qs:
        if isinstance(q.get("correct"), int) and 0 <= q["correct"] < len(q.get("options") or []):
            firmas[(normaliza(q.get("q")), tuple(sorted(normaliza(o) for o in q["options"])),
                    normaliza(q["options"][q["correct"]]),
                    q.get("img") or "")].append(q["id"])
    r["duplicadas"] = sum(len(v) - 1 for v in firmas.values() if len(v) > 1)

    # contadores
    if d["counts"] is not None:
        real = dict(collections.Counter(q["topic"] for q in qs))
        r["contadores"] = "ok" if real == d["counts"] else "desfasados"
    else:
        r["contadores"] = "no hay"

    # peso
    r["mb"] = os.path.getsize(ruta) / 1048576
    r["mb_preguntas"] = d["bytes_q"] / 1048576
    data_uris = re.findall(r'data:image/[a-z+]+;base64,', s)
    r["imagenes_embebidas"] = len(data_uris)
    r["mb_imagenes"] = sum(len(x) for x in re.findall(r'data:image/[a-z+]+;base64,[A-Za-z0-9+/=]+', s)) / 1048576
    r["detalle"] = detalle
    return r


def main(argv):
    detalle = "--detalle" in argv
    rutas = [a for a in argv if not a.startswith("--")] or sorted(glob.glob("plataforma_*.html"))
    filas = [auditar(r, detalle) for r in rutas]

    print("%-30s %6s %5s %6s %7s %6s  %s" %
          ("plataforma", "preg.", "banc", "MB", "MB preg", "contad", "problemas"))
    print("-" * 110)
    totales = collections.Counter()
    for f in filas:
        if "error" in f:
            print("%-30s  %s" % (f["archivo"], f["error"])); continue
        probs = []
        for k, v in sorted(f["casos"].items(), key=lambda kv: -len(kv[1])):
            probs.append("%s:%d" % (k, len(v)))
            totales[k] += len(v)
        if f["duplicadas"]:
            probs.append("duplicadas:%d" % f["duplicadas"]); totales["duplicadas"] += f["duplicadas"]
        if f["contadores"] == "desfasados":
            totales["contadores desfasados"] += 1
        if f["mb"] > LIMITE_MB:
            totales["archivos pesados"] += 1
        print("%-30s %6d %5d %6.2f %7.2f %6s  %s" %
              (f["archivo"], f["preguntas"], f["bancos"], f["mb"], f["mb_preguntas"],
               f["contadores"][:6], ", ".join(probs) or "—"))

    print("\nTOTALES")
    for k, v in totales.most_common():
        print("   %-38s %d" % (k, v))

    pesadas = [f for f in filas if "error" not in f and f["mb"] > LIMITE_MB]
    if pesadas:
        print("\nArchivos por encima de %.1f MB (arranque lento en móvil):" % LIMITE_MB)
        for f in sorted(pesadas, key=lambda x: -x["mb"]):
            extra = ""
            if f["imagenes_embebidas"]:
                extra = " · %d imágenes embebidas (%.2f MB)" % (f["imagenes_embebidas"], f["mb_imagenes"])
            print("   %-30s %.2f MB (preguntas %.2f MB)%s" % (f["archivo"], f["mb"], f["mb_preguntas"], extra))

    if detalle:
        print("\nDETALLE")
        for f in filas:
            if "error" in f or not f["casos"]:
                continue
            print("\n== %s" % f["archivo"])
            for k, v in sorted(f["casos"].items()):
                print("   %s (%d): %s" % (k, len(v), ", ".join(v[:12]) + (" …" if len(v) > 12 else "")))


if __name__ == "__main__":
    main(sys.argv[1:])
