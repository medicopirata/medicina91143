#!/usr/bin/env python3
"""Extrae las preguntas de una clase de los apuntes de Histología.

Formato del doc, una clase por grupo de apartados:

    ### Clase del 28/9 · A · Dichas por la profesora
    **1.** Los capilares del miocardio son: a) Fenestrados · b) … · c) … · d) …
    **Soluciones A:** 1 c · 2 b · …

    ### Clase del 28/9 · D · Imágenes (dos preguntas cada una)
    **H1**
    [imagen]
    (a) La doble flecha señala: a) … · b) … · c) … · d) …
    (b) Su revestimiento más superficial es: a) … · b) … · c) … · d) …
    **Soluciones D:** H1 b / b · H2 b / a · …

Hay apartados sueltos que no siguen el patrón "<clase> · <letra> · …", como el
repaso oral, donde las preguntas van numeradas R1, R2… y el solucionario pone
"Soluciones R:". Para esos se pasa la letra con dos puntos delante:

    python3 tools/extraer_clase_histo.py doc.xml ":R" "Apuntes: Repaso oral" \\
        --titulo "Repaso oral del 28/9 · preguntas que leyó en clase (sangre y circulatorio)"

Uso:  python3 tools/extraer_clase_histo.py <doc.xml> "<texto del encabezado>" \\
          "<nombre del banco>" [prefijo-imagen] [--titulo "<encabezado exacto>"]
"""
import html, json, re, sys

def plano(x):
    return html.unescape(re.sub(r"<[^>]+>", "", x)).replace(" ", " ").strip()


def opciones(txt):
    """Parte 'enunciado: a) X · b) Y · c) Z · d) W' en (enunciado, [X,Y,Z,W])."""
    m = re.search(r"(?:^|[:·\s])a\)\s", txt)
    if not m:
        return None, None
    enunciado = txt[:m.start()].rstrip(" :·")
    trozos = re.split(r"\s·\s(?=[b-d]\))", txt[m.start():].lstrip(" :·"))
    ops = []
    for t in trozos:
        o = re.match(r"^[a-d]\)\s*(.+)$", t.strip(), re.S)
        if not o:
            return None, None
        ops.append(o.group(1).strip().rstrip("."))
    return enunciado, ops


def soluciones_simples(txt, prefijo=""):
    """'1 c · 2 b · 3 c (nota) · …' -> {1: ('c', 'nota')}

    Con prefijo ("R") acepta además 'R1 b · R2 c · …'.
    """
    sol = {}
    for m in re.finditer(r"%s(\d{1,2})\s+([a-d])\b\s*(\([^)]*\))?" % re.escape(prefijo), txt):
        sol[int(m.group(1))] = (m.group(2), (m.group(3) or "").strip("()"))
    return sol


def soluciones_dobles(txt):
    """'H1 b / b · H2 b / a · …' -> {'H1': ('b','b')}"""
    sol = {}
    for m in re.finditer(r"([A-Z]\d{1,2})\s+([a-d])\s*/\s*([a-d])", txt):
        sol[m.group(1)] = (m.group(2), m.group(3))
    return sol


def seccion(xml, titulo):
    """El trozo que va desde ese encabezado de nivel 3 hasta el siguiente."""
    ini = None
    for m in re.finditer(r"<paragraph\b[^>]*heading='3'[^>]*>(.*?)</paragraph>", xml, re.S):
        if ini is not None:
            return xml[ini:m.start()]
        if plano(m.group(1)) == titulo:
            ini = m.end()
    if ini is None:
        raise SystemExit("no encuentro el apartado %r" % titulo)
    return xml[ini:]


def main():
    argv = sys.argv[1:]
    titulo_suelto = None
    if "--titulo" in argv:
        i = argv.index("--titulo")
        titulo_suelto = argv[i + 1]
        argv = argv[:i] + argv[i + 2:]
    if len(argv) not in (3, 4):
        raise SystemExit(__doc__)
    xml = open(argv[0], encoding="utf-8").read()
    cabecera, banco = argv[1], argv[2]
    prefijo = argv[3] if len(argv) == 4 else "histo"

    # ":R" = un apartado suelto cuyas preguntas van numeradas R1, R2…
    suelto = cabecera.startswith(":")
    letras = [cabecera[1:]] if suelto else ["A", "B", "C", "D"]

    preguntas, blobs = [], {}
    for letra in letras:
        if suelto:
            if titulo_suelto is None:
                raise SystemExit("con ':X' hace falta --titulo")
            titulos = [titulo_suelto]
        else:
            titulos = [t for t in re.findall(r"<paragraph\b[^>]*heading='3'[^>]*>(.*?)</paragraph>", xml, re.S)
                       if plano(t).startswith("%s · %s ·" % (cabecera, letra))]
        if not titulos:
            continue
        cuerpo = seccion(xml, plano(titulos[0]))

        # unos apartados ponen "Soluciones A:" y otros solo "Soluciones:"
        m = (re.search(r"Soluciones\s*%s\s*:(.*?)</paragraph>" % letra, cuerpo, re.S)
             or re.search(r"Soluciones\s*:(.*?)</paragraph>", cuerpo, re.S))
        if not m:
            raise SystemExit("el apartado %s no trae solucionario" % letra)
        crudo = plano(m.group(1))

        if letra == "D":
            sol = soluciones_dobles(crudo)
            # cada imagen: <bold>Hn</bold>, su media, y los apartados (a) y (b)
            for bloque in re.finditer(
                    r"<bold>([A-Z]\d{1,2})</bold>.*?<media\b[^>]*blob='blob/([0-9a-f-]+)'"
                    r"(.*?)(?=<bold>[A-Z]\d{1,2}</bold>|Soluciones)", cuerpo, re.S):
                clave, blob, resto = bloque.group(1), bloque.group(2), bloque.group(3)
                if clave not in sol:
                    raise SystemExit("%s no está en el solucionario" % clave)
                blobs[clave] = blob
                img = "apuntes_img/%s-%s.jpg" % (prefijo, blob.split("-")[0])
                for k, (marca, letra_ok) in enumerate(zip("ab", sol[clave])):
                    # Los dos apartados pueden ir en el mismo párrafo —«(a) … d)
                    # Manto (b) El 2 es: a) Cápsula …»—, así que el (a) se corta
                    # al llegar al (b); si no, se lleva pegado todo el segundo.
                    p = re.search(r"\(%s\)\s*(.*?)(?=\(%s\)|</paragraph>)"
                                  % (marca, "b" if marca == "a" else "\uffff"),
                                  resto, re.S)
                    if not p:
                        raise SystemExit("falta el apartado (%s) de %s" % (marca, clave))
                    enun, ops = opciones(plano(p.group(1)))
                    if not ops:
                        raise SystemExit("no entiendo las opciones de %s(%s)" % (clave, marca))
                    preguntas.append({"g": "D", "q": enun, "options": ops,
                                      "correct": "abcd".index(letra_ok), "exp": "", "img": img})
        else:
            sol = soluciones_simples(crudo, letra if suelto else "")
            # Algunas preguntas reparten enunciado, imagen y opciones en tres
            # párrafos seguidos, así que se toma todo lo que hay hasta la
            # siguiente pregunta en vez de un solo párrafo.
            pre = re.escape(letra) if suelto else ""
            for p in re.finditer(r"<bold>%s(\d{1,2})\.([^<]*)</bold>(.*?)"
                                 r"(?=<bold>%s\d{1,2}\.|Soluciones)" % (pre, pre), cuerpo, re.S):
                n = int(p.group(1))
                if n not in sol:
                    continue
                trozo = p.group(3)
                img = re.search(r"<media\b[^>]*blob='blob/([0-9a-f-]+)'", trozo)
                # el resto del párrafo de la pregunta + los párrafos que sigan
                cabo = (plano(p.group(2)) + " "
                        + plano(re.split(r"</paragraph>", trozo, 1)[0])).strip()
                cola = [plano(t) for t in re.findall(r"<paragraph\b[^>]*>(.*?)</paragraph>", trozo, re.S)]
                texto = " ".join(x for x in [cabo] + cola if x)
                enun, ops = opciones(texto)
                if not ops:
                    raise SystemExit("no entiendo las opciones de %s%d" % (letra, n))
                letra_ok, nota = sol[n]
                q = {"g": "A" if suelto else letra, "q": enun, "options": ops,
                     "correct": "abcd".index(letra_ok), "exp": nota}
                if img:
                    blobs["%s%d" % (letra, n)] = img.group(1)
                    q["img"] = "apuntes_img/%s-%s.jpg" % (prefijo, img.group(1).split("-")[0])
                preguntas.append(q)

    from collections import Counter
    print("preguntas: %d · por grupo %s · con imagen %d"
          % (len(preguntas), dict(Counter(p["g"] for p in preguntas)),
             sum(1 for p in preguntas if p.get("img"))), file=sys.stderr)
    print("blobs: %s" % json.dumps(blobs, ensure_ascii=False), file=sys.stderr)
    json.dump({"bancos": [{"banco": banco, "preguntas": preguntas}]},
              sys.stdout, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
