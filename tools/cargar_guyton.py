#!/usr/bin/env python3
"""Carga los bancos del Repaso del Guyton en la plataforma de Fisiología.

Los bancos van AL FINAL de `ALL_QUESTIONS`, con ids propios a partir de
ID_BASE, para que ninguna pregunta ya existente cambie de id: el progreso
guardado y la repetición espaciada van por `q.id`.

ID_BASE es 95000 y no 90000 a propósito: `add_apuntes.py` reparte los ids de
los bancos «Apuntes:» desde 90000 hacia arriba según el orden del JSON, así
que si el Guyton empezara ahí, una recarga de apuntes acabaría pisándolo.

Es idempotente: antes de cargar quita los bancos «📕 Guyton» que ya hubiera,
de modo que volver a ejecutarlo sustituye en lugar de duplicar.

La explicación se arma con el razonamiento del propio Repaso, que en este doc
viene completo (mediana de 244 caracteres y dice por qué, no solo qué), y se
le añade al final la página del Guyton y el número del Repaso para poder ir al
libro. Las que se quedan cortas se amplían a mano en AMPLIADAS.

Uso:  python3 tools/cargar_guyton.py <plataforma.html> <guyton.json>
"""
import json, re, sys, collections, unicodedata

ID_BASE = 95000
PREFIJO = "\U0001F4D5 Guyton"       # 📕

# Razonamientos del doc que se quedan en una línea y no explican por sí solos.
AMPLIADAS = {
 "G12.3": ("El volumen residual no se mide directamente con la espirometría, se despeja: "
           "es lo que queda de la capacidad residual funcional al descontarle el volumen de "
           "reserva espiratoria, porque la CRF es justamente lo que hay en el pulmón al final "
           "de una espiración normal, y de ahí todavía se puede expulsar el VRE. Así que "
           "VR = CRF − VRE = 3 − 1,5 = 1,5 l. Los demás datos del enunciado (espacio muerto, "
           "volumen corriente) sobran para esta pregunta: están para las otras del caso."),
}


def _clave_texto(t, corte=120):
    t = unicodedata.normalize("NFD", (t or "").lower())
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    t = re.sub(r"[^a-z0-9]", "", t)
    return t[:corte] if corte else t


NOTA_REPE = ("\u25b8 En la fuente esta pregunta ten\u00eda dos opciones id\u00e9nticas; se ha quitado "
             "la copia, de modo que aqu\u00ed tiene una opci\u00f3n menos que en el original.")


def sin_opciones_repetidas(p):
    """Quita las opciones idénticas dentro de una pregunta y recoloca la clave.

    El Repaso trae alguna pregunta con un distractor duplicado («Aumentada,
    normal» dos veces): dos opciones iguales son un empate imposible. Esto va
    aquí y no en una herramienta aparte porque cada recarga del Guyton
    regenera las preguntas desde el doc y volvería a meterlas.
    """
    # OJO: aquí la clave va SIN truncar. _clave_texto corta a 120 caracteres,
    # que vale para emparejar preguntas entre recargas pero no para comparar
    # opciones: dos opciones largas que empiezan igual se tomaban por la misma
    # y se borraban 40 en vez de las 3 que de verdad están repetidas.
    # Y sin quitar la puntuación: «↑ ↑ ↑» y «↑ ↓ ↑» son opciones distintas y
    # al borrar todo lo que no fuera letra o número quedaban las dos vacías,
    # de modo que se «limpiaban» 40 preguntas en vez de 3. Solo se ignoran
    # mayúsculas, tildes, espacios y el punto final.
    def norma(t):
        t = unicodedata.normalize("NFD", (t or "").lower())
        t = "".join(c for c in t if unicodedata.category(c) != "Mn")
        return re.sub(r"\s+", "", t).rstrip(".")
    vistas, nuevas = set(), []
    for o in p["options"]:
        k = norma(o)
        if k in vistas:
            continue
        vistas.add(k)
        nuevas.append(o)
    if len(nuevas) == len(p["options"]):
        return False
    correcta = p["options"][p["correct"]]
    p["options"] = nuevas
    p["correct"] = next(i for i, o in enumerate(nuevas) if norma(o) == norma(correcta))
    p["porque"] = (p.get("porque", "").rstrip() + " " + NOTA_REPE).strip()
    return True


def explicacion(p):
    base = AMPLIADAS.get(p["ref"]) or p["porque"]
    refs = [x for x in (p.get("libro"), p.get("repaso")) if x]
    if refs:
        return "%s (%s)" % (base.rstrip(), " · ".join(refs))
    return base


def main(ruta_html, ruta_json):
    s = open(ruta_html, encoding="utf-8").read()
    m = re.search(r"const ALL_QUESTIONS = (\[.*?\]);\n", s, re.S)
    qs = json.loads(m.group(1))

    # Los ids se conservan por REFERENCIA del Repaso (G15.9, D12, R3), que es
    # lo único estable: los bancos se renombran y las preguntas cambian de
    # banco según se van dando los temas —las 11 de motilidad pasaron de la
    # reserva al Tema 16—, y si el id dependiera del orden, un trasvase así
    # reasignaría las 381 y el progreso guardado dejaría de corresponder.
    previos = {q.get("origQ"): q["id"] for q in qs
               if q["topic"].startswith(PREFIJO) and q.get("origQ")}
    # Y un respaldo por enunciado, porque la referencia tampoco es eterna: al
    # darse el tema 16, sus 11 preguntas pasaron de la reserva al tema y el
    # doc las renumeró de D1-D11 a G16.1-G16.11. Son las mismas preguntas, así
    # que deben conservar su id aunque la referencia haya cambiado.
    por_texto = {_clave_texto(q["q"]): q["id"] for q in qs
                 if q["topic"].startswith(PREFIJO)}

    antes = len(qs)
    qs = [q for q in qs if not q["topic"].startswith(PREFIJO)]
    quitadas = antes - len(qs)

    d = json.load(open(ruta_json, encoding="utf-8"))
    sig = ID_BASE
    choques = [q["id"] for q in qs if q["id"] >= ID_BASE]
    if choques:
        sys.exit("hay ids >= %d que no son del Guyton: %s" % (ID_BASE, choques[:5]))

    ocupados = set(previos.values())
    libres = (i for i in range(ID_BASE, ID_BASE + 100000) if i not in ocupados)

    nuevas, heredados, limpiadas = 0, 0, 0
    for banco in d["bancos"]:
        for i, p in enumerate(banco["preguntas"], 1):
            if sin_opciones_repetidas(p):
                limpiadas += 1
            previo = previos.get(p["ref"])
            if previo is None:
                previo = por_texto.get(_clave_texto(p["q"]))
            if previo is not None:
                sig = previo
                heredados += 1
            else:
                sig = next(libres)
                nuevas += 1
            qs.append({
                "id": sig,
                "topic": banco["banco"],
                "topicBase": banco["banco"],
                "fileId": sig,
                "origQ": p["ref"],
                "q": p["q"],
                "options": p["options"],
                "correct": p["correct"],
                "exp": explicacion(p),
                "n": i,
            })

    counts = collections.Counter(q["topic"] for q in qs)
    s = s[:m.start()] + "const ALL_QUESTIONS = %s;\n" % json.dumps(qs, ensure_ascii=False) + s[m.end():]
    s = re.sub(r"const TOPIC_COUNTS = \{.*?\};\n",
               "const TOPIC_COUNTS = %s;\n" % json.dumps(dict(counts), ensure_ascii=False),
               s, count=1, flags=re.S)
    open(ruta_html, "w", encoding="utf-8").write(s)

    cortas = sum(1 for q in qs if len(re.sub(r"\s*\([^)]*\)\s*$", "", q["exp"]).strip()) < 60)
    ids_g = [q["id"] for q in qs if q["topic"].startswith(PREFIJO)]
    print("%s: %d preguntas (%d recargadas, %d con id conservado, %d nuevas)"
          % (ruta_html, len(qs), quitadas, heredados, nuevas))
    print("  bancos del Guyton: %d · ids %d-%d"
          % (sum(1 for t in counts if t.startswith(PREFIJO)), min(ids_g), max(ids_g)))
    if limpiadas:
        print("  preguntas con opciones repetidas en la fuente, limpiadas: %d" % limpiadas)
    print("  sin explicación en toda la plataforma: %d" % sum(1 for q in qs if not (q.get("exp") or "").strip()))
    print("  con explicación real < 60 caracteres: %d" % cortas)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
