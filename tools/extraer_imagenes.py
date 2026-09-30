#!/usr/bin/env python3
"""Localiza en el XML de un documento las preguntas que llevan imagen.

Estas preguntas reparten su contenido en tres bloques seguidos:

    <paragraph>30. En la imagen se observa:</paragraph>
    <paragraph><media blob='blob/1c35251e-46e2' …/></paragraph>
    <paragraph>a) Neutrófilo · b) … · c) … · d) …</paragraph>

Por eso el extractor normal no las ve. Aquí se emparejan los tres y se
imprime el blob que hay que descargar de cada una.

Uso:  python3 tools/extraer_imagenes.py <lectura.json> [<lectura2.json> …]
"""
import json, re, sys, html

RE_OPCIONES = re.compile(
    r"^a\)\s*(.+?)\s*[·|]\s*b\)\s*(.+?)\s*[·|]\s*c\)\s*(.+?)\s*[·|]\s*d\)\s*(.+?)\s*$", re.S)
RE_NUM = re.compile(r"^(?:[ABCD])?(\d{1,3})[\.\)]\s*(.+)$", re.S)


def plano(x):
    return html.unescape(re.sub(r"<[^>]+>", "", x)).strip()


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    xml = ""
    for ruta in sys.argv[1:]:
        b = open(ruta, encoding="utf-8").read()
        if b.lstrip().startswith("["):          # salida envuelta en varios fragmentos
            b = next(t["text"] for t in json.loads(b)
                     if t.get("text", "").lstrip().startswith("{"))
        xml += json.loads(b)["data"]["xml"] if b.lstrip().startswith("{") else b

    # bloques en orden, guardando el blob si lo llevan
    bloques = []
    for m in re.finditer(r"<paragraph\b([^>]*)>(.*?)</paragraph>", xml, re.S):
        attrs, cuerpo = m.group(1), m.group(2)
        blob = re.search(r"blob='blob/([0-9a-f-]+)'", cuerpo)
        alt = re.search(r"alt='([^']*)'", cuerpo)
        bloques.append({
            "texto": plano(cuerpo),
            "blob": blob.group(1) if blob else None,
            "alt": html.unescape(alt.group(1)) if alt else "",
            "cab": "heading=" in attrs,
        })

    grupo, bloque, salida = None, "1", []
    for i, b in enumerate(bloques):
        if b["cab"]:
            # el número de bloque forma parte de la clave: cada bloque repite
            # los grupos A/B/C y tiene su propio solucionario
            nb = re.match(r"Bloque\s+(\d+)", b["texto"])
            if nb:
                bloque, grupo = nb.group(1), None
                continue
            g = re.match(r"([A-D])\s*[·.]", b["texto"])
            if g:
                grupo = g.group(1)
            continue
        if not b["blob"]:
            continue
        # el enunciado es el bloque anterior con texto; las opciones, el siguiente
        enun = bloques[i - 1]["texto"] if i and bloques[i - 1]["texto"] else ""
        ops = bloques[i + 1]["texto"] if i + 1 < len(bloques) else ""
        m = RE_OPCIONES.match(ops)
        if not (enun and m):
            continue
        n = RE_NUM.match(enun)
        salida.append({
            "bloque": bloque,
            "grupo": grupo,
            "n": int(n.group(1)) if n else None,
            "q": (n.group(2) if n else enun).strip().rstrip(":") + ":",
            "options": [m.group(k).strip().rstrip(".") for k in (1, 2, 3, 4)],
            "blob": b["blob"],
            "alt": b["alt"],
        })

    json.dump(salida, open("/tmp/apuntes/con_imagen.json", "w"),
              ensure_ascii=False, indent=1)
    print("preguntas con imagen encontradas: %d" % len(salida))
    for p in salida:
        print("  bloque %s  %s%s  blob %s  · %s"
              % (p["bloque"], p["grupo"], p["n"], p["blob"], p["q"][:50]))


if __name__ == "__main__":
    main()
