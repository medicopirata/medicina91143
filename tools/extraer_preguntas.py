#!/usr/bin/env python3
"""Extrae preguntas tipo test del XML que devuelve el lector de Claude Docs.

Reconoce el formato de los apuntes de Histología y Anatomía:

    38. Enunciado de la pregunta: a) Una · b) Otra · c) Tercera · d) Cuarta

y los solucionarios en línea:

    1 c (aclaración) · 2 d · 3 b · 4 c …

Admite varios ficheros: se concatenan en el orden dado, de modo que un
documento leído por trozos se procesa de una vez.

Uso:  python3 tools/extraer_preguntas.py <trozo1.json> [trozo2.json …]
"""
import json, re, sys, html

# "38. Enunciado: a) … · b) … · c) … · d) …"   (el número es opcional)
RE_PREGUNTA = re.compile(
    r"^(?:(\d+)[\.\)]\s*)?(.+?)\s*"
    r"a\)\s*(.+?)\s*[·|]\s*b\)\s*(.+?)\s*[·|]\s*c\)\s*(.+?)\s*[·|]\s*d\)\s*(.+?)\s*$",
    re.S)
# "12 b" dentro de una línea de soluciones
RE_SOLUCION = re.compile(
    r"(?:^|[·|])\s*(\d{1,3})\s+([a-dA-D])(?=[\s·|(.,]|$)\s*(?:\(([^)]*)\))?")


def texto_plano(fragmento):
    """Todo el texto de un bloque, sin etiquetas."""
    return html.unescape(re.sub(r"<[^>]+>", "", fragmento)).strip()


def bloques(xml):
    """Devuelve (etiqueta, atributos, texto) por cada bloque de contenido."""
    salida = []
    for m in re.finditer(r"<(paragraph|listItem)\b([^>]*)>(.*?)</\1>", xml, re.S):
        etiqueta, attrs, cuerpo = m.group(1), m.group(2), m.group(3)
        # un listItem que contiene otros bloques se trata por sus hijos
        if etiqueta == "listItem" and re.search(r"<(list|table)\b", cuerpo):
            continue
        t = texto_plano(cuerpo)
        if t:
            salida.append((etiqueta, attrs, t, m.start()))
    return salida


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    xml = ""
    for ruta in sys.argv[1:]:
        bruto = open(ruta, encoding="utf-8").read()
        xml += json.loads(bruto)["data"]["xml"] if bruto.lstrip().startswith("{") else bruto

    preguntas, soluciones, seccion, bloque = [], {}, None, "1"
    for etiqueta, attrs, t, pos in bloques(xml):
        cab = re.search(r"heading='(\d)'", attrs)

        # "Bloque 2 · Preguntas": cada bloque repite los grupos A/B/C, así que
        # forma parte de la clave; si no, sus soluciones pisan las del bloque 1
        m_blo = re.match(r"Bloque\s+(\d+)", t)
        if cab and m_blo:
            bloque, seccion = m_blo.group(1), None
            continue

        # cabecera de grupo: "A · Dichas por la profesora", "Soluciones B"…
        m_sol = re.match(r"Soluciones\s+([A-D])", t)
        m_grp = re.match(r"([A-D])\s*[·.]", t)
        if cab and m_sol:
            seccion = ("sol", m_sol.group(1)); continue
        if cab and m_grp:
            seccion = ("preg", m_grp.group(1)); continue
        if cab:
            continue

        if seccion and seccion[0] == "sol":
            for num, letra, nota in RE_SOLUCION.findall(t):
                soluciones[(bloque, seccion[1], int(num))] = (
                    "abcd".index(letra.lower()), nota.strip())
            continue

        m = RE_PREGUNTA.match(t)
        if m and seccion:
            num = int(m.group(1)) if m.group(1) else None
            preguntas.append({
                "bloque": bloque, "grupo": seccion[1], "n": num,
                "q": m.group(2).rstrip(":").strip(),
                "options": [m.group(i).strip().rstrip(".") for i in (3, 4, 5, 6)],
            })

    # numerar las que venían de una lista (sin número propio)
    contador = {}
    for p in preguntas:
        k = (p["bloque"], p["grupo"])
        contador[k] = contador.get(k, 0) + 1
        if p["n"] is None:
            p["n"] = contador[k]
        else:
            contador[k] = p["n"]

    # Una pregunta cuyo enunciado es un resto ("23 (el 2)") o en cuyas opciones
    # asoma otra tanda de a)/b)/c)/d) es una pregunta de imagen mal cortada:
    # su texto vive en varios bloques y aquí solo ha caído un trozo.
    RE_OPCION_SUELTA = re.compile(r"\b[a-d]\)\s")
    # "23 (el 2)", "1 (¿qué es el 2?)": el enunciado es en realidad la coletilla
    # que numera una imagen, no una pregunta. Un enunciado corto de verdad
    # ("Las HDL llevan") es legítimo, así que el corte por longitud va bajo.
    RE_RESTO = re.compile(r"^\d+\s*[(:]")
    sospechosas = []
    for p in list(preguntas):
        motivo = None
        if RE_RESTO.match(p["q"]):
            motivo = "el enunciado numera una imagen"
        elif len(p["q"]) < 10:
            motivo = "enunciado demasiado corto"
        elif any(RE_OPCION_SUELTA.search(o) for o in p["options"]):
            motivo = "hay otra pregunta dentro de una opción"
        if motivo:
            p["motivo"] = motivo
            sospechosas.append(p)
            preguntas.remove(p)

    if sospechosas:
        print("DESCARTADAS por formato (%d):" % len(sospechosas))
        for p in sospechosas:
            print("  bloque %s %s%s — %s: %r"
                  % (p["bloque"], p["grupo"], p["n"], p["motivo"], p["q"][:50]))

    emparejadas, huerfanas = [], []
    for p in preguntas:
        clave = (p["bloque"], p["grupo"], p["n"])
        if clave in soluciones:
            p["correct"], p["exp"] = soluciones[clave]
            emparejadas.append(p)
        else:
            huerfanas.append(p)

    print("preguntas encontradas: %d" % len(preguntas))
    print("soluciones encontradas: %d" % len(soluciones))
    print("emparejadas: %d" % len(emparejadas))
    if huerfanas:
        print("SIN solución (%d): %s" % (
            len(huerfanas),
            ", ".join("bloque %s %s%s" % (p["bloque"], p["grupo"], p["n"])
                      for p in huerfanas)))
    json.dump(emparejadas, open("/tmp/apuntes/extraidas.json", "w"),
              ensure_ascii=False, indent=1)
    print("-> /tmp/apuntes/extraidas.json")


if __name__ == "__main__":
    main()
