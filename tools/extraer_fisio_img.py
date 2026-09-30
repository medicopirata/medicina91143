#!/usr/bin/env python3
"""Extrae las preguntas con imagen de los apuntes de Fisiología.

Ahí la imagen va en un párrafo propio y las preguntas que se refieren a
ella vienen justo después, en una lista, cada una con sus opciones y su
línea «Respuesta: N»:

    <paragraph><media blob='blob/…' alt='…'/></paragraph>
    <list kind='ordered'>
      <listItem>
        <paragraph>En el esquema, ¿qué letras…?</paragraph>
        <list kind='ordered'> … las cuatro opciones … </list>
        <list kind='bullet'><listItem>Respuesta: 2. …</listItem></list>
      </listItem>
      …
    </list>

Uso:  python3 tools/extraer_fisio_img.py <lectura.json> [<lectura2.json> …]
"""
import json, re, sys, html

RE_RESPUESTA = re.compile(r"Respuesta:\s*(\d)\s*\.?\s*(.*)", re.S)


def plano(x):
    return html.unescape(re.sub(r"<[^>]+>", "", x)).strip()


def items(fragmento):
    """listItem de primer nivel, emparejando etiquetas con una pila."""
    salida, pila, arranque = [], [], 0
    for t in re.finditer(r"<(/?)listItem\b[^>]*?(/?)>", fragmento):
        if t.group(2):
            continue
        if not t.group(1):
            pila.append(t.end())
            if len(pila) == 1:
                arranque = t.end()
        elif pila:
            pila.pop()
            if not pila:
                salida.append(fragmento[arranque:t.start()])
    return salida


def listas(fragmento):
    """listas de primer nivel, con su atributo kind y su contenido."""
    salida, pila, arranque, kind = [], [], 0, None
    for t in re.finditer(r"<(/?)list\b([^>]*?)(/?)>", fragmento):
        if t.group(3):
            continue
        if not t.group(1):
            pila.append(t.end())
            if len(pila) == 1:
                arranque = t.end()
                k = re.search(r"kind='(\w+)'", t.group(2))
                kind = k.group(1) if k else None
        elif pila:
            pila.pop()
            if not pila:
                salida.append((kind, fragmento[arranque:t.start()]))
    return salida


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    xml = ""
    for ruta in sys.argv[1:]:
        b = open(ruta, encoding="utf-8").read()
        if b.lstrip().startswith("["):
            b = next(t["text"] for t in json.loads(b)
                     if t.get("text", "").lstrip().startswith("{"))
        xml += json.loads(b)["data"]["xml"] if b.lstrip().startswith("{") else b

    salida = []
    # cada imagen, con el trozo de documento que va detrás
    for m in re.finditer(r"<paragraph\b[^>]*>\s*<media\b([^>]*)/>\s*</paragraph>",
                         xml, re.S):
        blob = re.search(r"blob='blob/([0-9a-f-]+)'", m.group(1))
        alt = re.search(r"alt='([^']*)'", m.group(1))
        if not blob:
            continue
        resto = xml[m.end():m.end() + 20000]
        lista = re.match(r"\s*<list\b[^>]*kind='ordered'[^>]*>", resto)
        if not lista:
            continue
        cuerpo = listas(resto[lista.start():])[0][1]
        for it in items(cuerpo):
            partes = listas(it)
            ops = [c for k, c in partes if k == "ordered"]
            resp = [c for k, c in partes if k == "bullet"]
            enun = re.search(r"<paragraph\b[^>]*>(.*?)</paragraph>", it, re.S)
            if not (ops and resp and enun):
                continue
            opciones = [plano(x) for x in items(ops[0])]
            r = RE_RESPUESTA.search(plano(resp[0]))
            if len(opciones) != 4 or not r:
                continue
            salida.append({
                "q": plano(enun.group(1)),
                "options": opciones,
                "correct": int(r.group(1)) - 1,
                "exp": r.group(2).strip(),
                "blob": blob.group(1),
                "alt": html.unescape(alt.group(1)) if alt else "",
            })

    json.dump(salida, open("/tmp/apuntes/fisio_img.json", "w"),
              ensure_ascii=False, indent=1)
    print("preguntas con imagen: %d" % len(salida))
    for p in salida[:3]:
        print("  %s -> %s" % (p["q"][:52], p["options"][p["correct"]][:32]))


if __name__ == "__main__":
    main()
