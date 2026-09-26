#!/usr/bin/env python3
"""Extrae preguntas de una pestaña «Tema N · Preguntas» de los apuntes.

Es el formato en el que Santi reorganizó los docs en septiembre de 2026:

    | Bloque | Qué son | N.º |          ← de aquí sale el grupo de cada número
    | A      | …       | 1–3 |

    **1.** Enunciado
    - a) …
    - b) …

    | N.º | Resp. | Por qué |          ← solucionario al final
    | 1   | a     | …       |

Las imágenes van en un párrafo propio (<media blob=…>) y valen para las
preguntas que vienen detrás, hasta la siguiente imagen.

Uso:  python3 tools/extraer_tema.py <lectura.json> "<nombre del banco>"
      python3 tools/extraer_tema.py <lectura.json> --blobs
"""
import html, json, re, sys

RE_OPCION = re.compile(r"^([a-d])\)\s*(.+)$", re.S)


def plano(x):
    return html.unescape(re.sub(r"<[^>]+>", "", x)).replace(" ", " ").strip()


def xml_de(ruta):
    b = open(ruta, encoding="utf-8").read()
    if b.lstrip().startswith("["):
        b = next(t["text"] for t in json.loads(b)
                 if t.get("text", "").lstrip().startswith("{"))
    i = b.index("{")
    return json.loads(b[i:])["data"]["xml"]


def grupos_por_numero(xml):
    """La primera tabla dice qué números son del grupo A, B, C o D."""
    tabla = re.search(r"<table\b.*?</table>", xml, re.S)
    mapa = {}
    if not tabla:
        return mapa
    for fila in re.finditer(r"<row\b.*?</row>", tabla.group(0), re.S):
        celdas = [plano(c) for c in re.findall(r"<cell\b.*?</cell>", fila.group(0), re.S)]
        if len(celdas) < 3 or celdas[0] not in "ABCD" or len(celdas[0]) != 1:
            continue
        rango = celdas[-1].replace("–", "-").replace("—", "-")
        m = re.match(r"(\d+)\s*-\s*(\d+)$", rango)
        if m:
            for n in range(int(m.group(1)), int(m.group(2)) + 1):
                mapa[n] = celdas[0]
        elif rango.isdigit():
            mapa[int(rango)] = celdas[0]
    return mapa


def soluciones(xml):
    """Última tabla: N.º | Resp. | Por qué."""
    sol = {}
    for tabla in re.findall(r"<table\b.*?</table>", xml, re.S):
        for fila in re.finditer(r"<row\b.*?</row>", tabla, re.S):
            celdas = [plano(c) for c in re.findall(r"<cell\b.*?</cell>", fila.group(0), re.S)]
            if len(celdas) >= 2 and celdas[0].isdigit() and re.fullmatch(r"[a-d]", celdas[1]):
                sol[int(celdas[0])] = (celdas[1], celdas[2] if len(celdas) > 2 else "")
    return sol


def main():
    if len(sys.argv) < 3:
        raise SystemExit(__doc__)
    xml = xml_de(sys.argv[1])
    banco = sys.argv[2]

    if banco == "--blobs":
        print(json.dumps(sorted(set(re.findall(r"blob='blob/([0-9a-f-]+)'", xml)))))
        return

    grupo = grupos_por_numero(xml)
    sol = soluciones(xml)

    # Se recorre el documento en orden: las imágenes valen para lo que viene detrás
    trozos = re.finditer(
        r"<media\b[^>]*blob='blob/([0-9a-f-]+)'[^>]*/>"
        r"|<paragraph\b[^>]*>(?:(?!</paragraph>).)*?<bold>(\d+)\.</bold>(.*?)</paragraph>"
        r"|<list\b[^>]*>.*?</list>", xml, re.S)

    imagen, pendiente, preguntas = None, None, []
    for m in trozos:
        if m.group(1):
            imagen = m.group(1)
        elif m.group(2):
            pendiente = (int(m.group(2)), plano(m.group(3)), imagen)
        elif pendiente:
            n, enunciado, img = pendiente
            pendiente = None
            opciones, letras = [], []
            for li in re.findall(r"<listItem\b.*?</listItem>", m.group(0), re.S):
                o = RE_OPCION.match(plano(li))
                if o:
                    letras.append(o.group(1))
                    opciones.append(o.group(2))
            if len(opciones) < 2:
                continue
            if n not in sol:
                raise SystemExit("la pregunta %d no está en el solucionario" % n)
            letra, porque = sol[n]
            if letra not in letras:
                raise SystemExit("la respuesta %r de la %d no está entre sus opciones" % (letra, n))
            p = {"g": grupo.get(n, ""), "q": enunciado, "options": opciones,
                 "correct": letras.index(letra), "exp": porque}
            if img:
                p["img"] = "apuntes_img/fisio-%s.png" % img.split("-")[0]
            preguntas.append(p)

    faltan = sorted(set(sol) - {i + 1 for i in range(len(preguntas))})
    print("preguntas: %d" % len(preguntas), file=sys.stderr)
    if faltan:
        print("aviso: en el solucionario hay %s sin pregunta" % faltan, file=sys.stderr)
    from collections import Counter
    print("por grupo: %s" % dict(Counter(p["g"] for p in preguntas)), file=sys.stderr)
    print("con imagen: %d" % sum(1 for p in preguntas if p.get("img")), file=sys.stderr)

    json.dump({"bancos": [{"banco": banco, "preguntas": preguntas}]},
              sys.stdout, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
