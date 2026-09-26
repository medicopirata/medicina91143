#!/usr/bin/env python3
"""Extrae preguntas cuyas opciones van en una lista anidada.

Es el formato de los apuntes de Anatomía 3:

    <listItem>
      <paragraph><bold>¿Cuál NO deriva de la cresta neural?</bold></paragraph>
      <list kind='bullet'>
        <listItem><paragraph>a) Ganglios raquídeos.</paragraph></listItem>
        …
      </list>
    </listItem>

con el solucionario en una tabla aparte (N.º | Resp. | Clave).

Uso:  python3 tools/extraer_lista.py <lectura.json> [etiqueta_del_banco]
"""
import json, re, sys, html

RE_OPCION = re.compile(r"^([a-d])\)\s*(.+)$", re.S)

# La letra del apartado (A, B, C, D) sirve para emparejar con el solucionario,
# pero la etiqueta que ve Santi depende de lo que diga el título: un apartado
# «De refuerzo» son preguntas mías, aunque en ese tema le toque la letra B.
def etiqueta_de(titulo):
    t = titulo.lower()
    if "imagen" in t:
        return "D"
    if "refuerzo" in t:
        return "C"
    if "kahoot" in t or "avisad" in t or "plantea" in t:
        return "A"
    return "B"


def plano(x):
    return html.unescape(re.sub(r"<[^>]+>", "", x)).strip()


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    b = open(sys.argv[1], encoding="utf-8").read()
    if b.lstrip().startswith("["):
        # la respuesta puede venir envuelta en varios fragmentos; el que
        # lleva el documento es el que empieza por "{"
        b = next(t["text"] for t in json.loads(b)
                 if t.get("text", "").lstrip().startswith("{"))
    xml = json.loads(b)["data"]["xml"] if b.lstrip().startswith("{") else b

    # --- solucionario: filas "A1 | a | clave" de las tablas -----------------
    soluciones, grupo_tabla = {}, None
    for m in re.finditer(r"<(paragraph|table)\b([^>]*)>(.*?)</\1>", xml, re.S):
        tag, attrs, cuerpo = m.group(1), m.group(2), m.group(3)
        if tag == "paragraph" and "heading=" in attrs:
            g = re.match(r"([A-D])\.\s", plano(cuerpo))
            if g:
                grupo_tabla = g.group(1)
            continue
        if tag != "table" or not grupo_tabla:
            continue
        for fila in re.finditer(r"<row\b[^>]*>(.*?)</row>", cuerpo, re.S):
            celdas = [plano(c) for c in
                      re.findall(r"<cell\b[^>]*>(.*?)</cell>", fila.group(1), re.S)]
            if len(celdas) < 2:
                continue
            n = re.match(r"([A-D])?(\d{1,3})$", celdas[0].strip())
            letra = celdas[1].strip().lower()
            if n and letra in "abcd" and len(letra) == 1:
                g = n.group(1) or grupo_tabla
                soluciones[(g, int(n.group(2)))] = (
                    "abcd".index(letra), celdas[2] if len(celdas) > 2 else "")

    # --- preguntas: listItem con enunciado + lista de opciones --------------
    # Los listItem se anidan (la lista de opciones vive dentro del listItem de
    # la pregunta), así que hay que emparejar las etiquetas con una pila: una
    # expresión regular no-greedy cortaría en el </listItem> de la opción.
    def items(fragmento, desplazamiento=0):
        """listItem de primer nivel dentro de `fragmento`, con su posición."""
        salida, pila = [], []
        for t in re.finditer(r"<(/?)listItem\b[^>]*?(/?)>", fragmento):
            cierra, vacio = t.group(1), t.group(2)
            if vacio:
                continue
            if not cierra:
                pila.append(t.end())
                if len(pila) == 1:
                    arranque = t.end()
            else:
                if not pila:
                    continue
                pila.pop()
                if not pila:
                    salida.append((arranque + desplazamiento,
                                   fragmento[arranque:t.start()]))
        return salida

    cabeceras = []
    grupo = None
    for m in re.finditer(r"<paragraph\b([^>]*)>(.*?)</paragraph>", xml, re.S):
        if "heading=" not in m.group(1):
            continue
        titulo = plano(m.group(2))
        g = re.match(r"([A-D])\.\s*(?:⭐\s*)?", titulo)
        if g:
            grupo = g.group(1)
            cabeceras.append((m.start(), grupo, etiqueta_de(titulo)))

    preguntas, cuenta = [], {}
    for pos, cuerpo in items(xml):
        enun = re.search(r"<paragraph\b[^>]*>(.*?)</paragraph>", cuerpo, re.S)
        lista = re.search(r"<list\b[^>]*kind='bullet'[^>]*>(.*?)</list>", cuerpo, re.S)
        if not (enun and lista):
            continue
        opciones = {}
        for _, li in items(lista.group(1)):
            o = RE_OPCION.match(plano(li))
            if o:
                opciones[o.group(1)] = o.group(2).strip()
        if sorted(opciones) != ["a", "b", "c", "d"]:
            continue
        g = etiq = None
        for cpos, gr, et in cabeceras:
            if cpos < pos:
                g, etiq = gr, et
        if not g:
            continue
        cuenta[g] = cuenta.get(g, 0) + 1
        preguntas.append({
            "g": etiq, "apartado": g, "n": cuenta[g],
            "q": plano(enun.group(1)).rstrip(":") + ":",
            "options": [opciones[k] for k in "abcd"],
        })

    ok, sin = [], []
    for p in preguntas:
        k = (p.pop("apartado"), p["n"])
        if k in soluciones:
            p["correct"], p["exp"] = soluciones[k]
            ok.append(p)
        else:
            sin.append(p)

    print("preguntas: %d · soluciones: %d · emparejadas: %d"
          % (len(preguntas), len(soluciones), len(ok)))
    if sin:
        print("SIN solución: %s" % ", ".join("%s%s" % (p["g"], p["n"]) for p in sin))
    from collections import Counter
    print("por etiqueta: %s" % dict(Counter(p["g"] for p in ok)))
    json.dump(ok, open("/tmp/apuntes/lista.json", "w"), ensure_ascii=False, indent=1)
    for p in ok[:3]:
        print("  %s%s %s -> %s) %s"
              % (p["g"], p["n"], p["q"][:45], "abcd"[p["correct"]],
                 p["options"][p["correct"]][:35]))


if __name__ == "__main__":
    main()
