#!/usr/bin/env python3
"""Extrae las preguntas tipo test de un tema de los apuntes de Anatomía 3,
leyendo el EXPORT EN TEXTO del doc en vez del XML.

El XML de un tema largo no cabe en una sola lectura y la paginación parte las
listas, así que para los temas grandes sale más a cuenta el texto plano, que
el export entrega entero. El formato es:

    B. Tipo test sobre lo que remarcó

    1. El LCR se produce en:
       - a) Las granulaciones aracnoideas.
       - b) Los plexos coroideos.
       ...

    15. Solucionario

    B. Tipo test

    | N.º | Resp. | Clave |
    | B1 | b | Plexos coroideos |

Uso:  python3 tools/extraer_texto_anat.py <doc.txt> "<título del tema>" \
          "<nombre del banco>" > banco.json
"""
import json, re, sys, unicodedata


def nfc(s):
    return unicodedata.normalize("NFC", s)


def etiqueta_de(titulo):
    t = titulo.lower()
    if "imagen" in t:
        return "D"
    if "refuerzo" in t:
        return "C"
    if "kahoot" in t or "plantea" in t or "avisad" in t:
        return "A"
    return "B"


def tramo_del_tema(lineas, titulo):
    """Las líneas que van del encabezado del tema al del tema siguiente."""
    ini = None
    for i, l in enumerate(lineas):
        t = l.strip()
        if ini is None and t == titulo:
            ini = i
        elif ini is not None and re.match(r"^(Tema [\d (IVX)]+\.|Desarrollo del sistema|Osteología del)", t) \
                and len(t) < 100 and "Ficha" not in t and t != titulo:
            return lineas[ini:i]
    if ini is None:
        raise SystemExit("no encuentro el tema %r" % titulo)
    return lineas[ini:]


def main():
    if len(sys.argv) != 4:
        raise SystemExit(__doc__)
    lineas = [l.rstrip("\n") for l in open(sys.argv[1], encoding="utf-8")]
    cuerpo = tramo_del_tema(lineas, sys.argv[2])

    # --- solucionario: filas "B1 | b | clave" --------------------------------
    sol, grupo = {}, None
    en_solucionario = False
    for l in cuerpo:
        t = l.strip()
        if re.fullmatch(r"\d{1,2}\. Solucionario", t):
            en_solucionario = True
            continue
        if not en_solucionario:
            continue
        g = re.match(r"^([A-D])\.\s", t)
        if g:
            grupo = g.group(1)
            continue
        if not t.startswith("|"):
            continue
        celdas = [c.strip() for c in t.strip("|").split("|")]
        if len(celdas) < 2:
            continue
        m = re.fullmatch(r"([A-D])?(\d{1,3})", celdas[0])
        letra = celdas[1].lower()
        if m and letra in list("abcd") and len(letra) == 1:
            clave = (m.group(1) or grupo, int(m.group(2)))
            sol[clave] = ("abcd".index(letra), celdas[2] if len(celdas) > 2 else "")

    # --- preguntas ----------------------------------------------------------
    preguntas, grupo, en_preguntas = [], None, False
    i = 0
    while i < len(cuerpo):
        t = cuerpo[i].strip()
        if re.fullmatch(r"\d{1,2}\. Preguntas", t):
            en_preguntas, grupo = True, None
        elif re.fullmatch(r"\d{1,2}\. Solucionario", t):
            en_preguntas = False
        elif en_preguntas and re.match(r"^[A-D]\.\s", t):
            grupo = etiqueta_de(t)
        elif en_preguntas and grupo:
            # la numeración va como "1." o con el prefijo del grupo, "B1."
            m = re.match(r"^([A-D])?(\d{1,3})\.\s+(.+)$", t)
            if m:
                g = m.group(1) or grupo
                n, enun = int(m.group(2)), m.group(3).strip()
                # el enunciado puede seguir en las líneas siguientes hasta la
                # primera opción, y entre medias hay líneas en blanco
                ops, j = [], i + 1
                while j < len(cuerpo) and not re.match(r"^-\s*a\)", cuerpo[j].strip()):
                    extra = cuerpo[j].strip()
                    if extra and not re.match(r"^([A-D])?\d{1,3}\.\s", extra):
                        enun += " " + extra
                    elif extra:
                        break
                    j += 1
                while j < len(cuerpo):
                    linea = cuerpo[j].strip()
                    if not linea:
                        j += 1
                        continue
                    o = re.match(r"^-\s*([a-d])\)\s*(.+)$", linea)
                    if not o:
                        break
                    ops.append(o.group(2).strip())
                    j += 1
                if len(ops) == 4 and (g, n) in sol:
                    correcta, clave = sol[(g, n)]
                    preguntas.append({"g": g, "n": n, "q": nfc(enun),
                                      "options": [nfc(o) for o in ops],
                                      "correct": correcta, "exp": nfc(clave)})
                    i = j
                    continue
        i += 1

    from collections import Counter
    print("preguntas: %d · por grupo %s · soluciones en el doc: %d"
          % (len(preguntas), dict(Counter(p["g"] for p in preguntas)), len(sol)),
          file=sys.stderr)
    json.dump({"bancos": [{"banco": sys.argv[3], "preguntas": preguntas}]},
              sys.stdout, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
