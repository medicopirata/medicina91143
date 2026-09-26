#!/usr/bin/env python3
"""Añade preguntas de los apuntes de clase a una plataforma de estudio.

Crea (o actualiza) bancos "Apuntes: ..." dentro de un bloque propio
"📓 Apuntes de clase" que se pinta ANTES de la rejilla principal.

Es idempotente: volver a ejecutarlo con los mismos temas sustituye ese banco
en vez de duplicar preguntas. Los ids arrancan en ID_BASE para no colisionar
nunca con los existentes, de modo que el progreso guardado no se toca.

Uso:  python3 tools/add_apuntes.py <plataforma.html> <preguntas.json>
      python3 tools/add_apuntes.py <plataforma.html> <preguntas.json> --reemplazar-todo
      python3 tools/add_apuntes.py <plataforma.html> --solo-motor

Con --reemplazar-todo se borran TODOS los bancos de apuntes antes de cargar,
no solo los que trae el JSON. Es para cuando el doc de apuntes se reorganiza y
algún banco cambia de nombre: sin esta opción el banco viejo se quedaría ahí
duplicando preguntas. El JSON tiene que traer entonces todos los bancos de esa
asignatura y en el mismo orden, porque los ids se reparten por ese orden y el
progreso guardado va por id.
"""
import json, os, re, sys, unicodedata

ID_BASE = 90000
SECTION_JS = ("SECTIONS.unshift({id:'apuntes', title:'\U0001F4D3 Apuntes de clase', "
              "color:'#34d399', first:true, match: t => t.startsWith('Apuntes:')});")
ETIQUETA = {
    "A": "\U0001F393 Dicha en clase.",
    "B": "\U0001F4CC Deducida de sus pistas.",
    "C": "\U0001F916 Propuesta por Claude, no dicha en clase.",
    "D": "\U0001F5BC️ Pregunta con imagen.",
}

# --- bloque de render actual, idéntico en las nueve plataformas -------------
RENDER_VIEJO = """    const extra = document.getElementById('extra-sections');
    extra.innerHTML = SECTIONS.map(s => {"""
RENDER_NUEVO = """    const renderSections = list => list.map(s => {"""
RENDER_CIERRE_VIEJO = """    }).join('');
  },

  startSingleTopic(topic) {"""
RENDER_CIERRE_NUEVO = """    }).join('');
    const apuntesEl = document.getElementById('apuntes-sections');
    if (apuntesEl) apuntesEl.innerHTML = renderSections(SECTIONS.filter(s => s.first));
    document.getElementById('extra-sections').innerHTML = renderSections(SECTIONS.filter(s => !s.first));
  },

  startSingleTopic(topic) {"""


def parchear_motor(html):
    """Añade el contenedor, la sección y el render partido. Idempotente."""
    cambios = []

    if 'id="apuntes-sections"' not in html:
        m = re.search(r'([ \t]*)<div class="topics-section"[^>]*>\s*\n\s*<p class="section-title">[^<]*</p>\s*\n\s*<div class="topics-grid" id="topics-grid">', html)
        if not m:
            raise SystemExit("No encuentro el contenedor de la rejilla principal")
        sangria = m.group(1)
        html = html[:m.start()] + f'{sangria}<div id="apuntes-sections"></div>\n' + html[m.start():]
        cambios.append("contenedor #apuntes-sections")

    if "SECTIONS.unshift({id:'apuntes'" not in html:
        m = re.search(r'^const SECTIONS = .*?;$', html, re.M)
        if not m:
            raise SystemExit("No encuentro const SECTIONS")
        html = html[:m.end()] + "\n" + SECTION_JS + html[m.end():]
        cambios.append("sección 📓 Apuntes de clase")

    if "renderSections" not in html:
        if RENDER_VIEJO not in html or RENDER_CIERRE_VIEJO not in html:
            raise SystemExit("El bloque de render no tiene la forma esperada")
        html = html.replace(RENDER_VIEJO, RENDER_NUEVO, 1)
        html = html.replace(RENDER_CIERRE_VIEJO, RENDER_CIERRE_NUEVO, 1)
        cambios.append("render partido (apuntes arriba)")

    return html, cambios


def cargar_array(html, nombre):
    m = re.search(r'^const %s = (.*?);$' % nombre, html, re.M | re.S)
    if not m:
        raise SystemExit("No encuentro const %s" % nombre)
    return json.loads(m.group(1)), m.span(1)


def normaliza(s):
    """Para comparar enunciados sin que acentos o espacios den falsos negativos."""
    s = unicodedata.normalize("NFKD", s.lower())
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", s).strip()



def regenerar_indice(ruta_html):
    """Rehace el índice de temas si la plataforma tocada está en él.

    El escritorio del inicio agrupa los fallos por tema con ese índice, así
    que si se añaden preguntas y no se regenera, los temas nuevos no
    aparecen entre los puntos flacos. Antes había que acordarse a mano.
    """
    import importlib.util
    aqui = os.path.dirname(os.path.abspath(__file__))
    spec = importlib.util.spec_from_file_location(
        "indice_temas", os.path.join(aqui, "indice_temas.py"))
    if spec is None or spec.loader is None:
        print("  índice: no encuentro tools/indice_temas.py"); return
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)

    nombre = os.path.basename(ruta_html)
    if nombre not in mod.PLATAFORMAS.values():
        print("  índice: %s no está en el escritorio, no hace falta" % nombre)
        return

    print("  índice de temas:")
    mod.main()


def main():
    if len(sys.argv) not in (3, 4):
        raise SystemExit(__doc__)
    ruta_html, ruta_json = sys.argv[1], sys.argv[2]
    todo = len(sys.argv) == 4
    if todo and sys.argv[3] != "--reemplazar-todo":
        raise SystemExit(__doc__)

    html = open(ruta_html, encoding="utf-8").read()

    html, cambios = parchear_motor(html)
    for c in cambios:
        print("  motor: +%s" % c)
    if not cambios:
        print("  motor: ya estaba parcheado")

    # Solo dejar la plataforma preparada, sin preguntas todavía
    if ruta_json == "--solo-motor":
        open(ruta_html, "w", encoding="utf-8").write(html)
        print("  sin preguntas: la plataforma queda lista para la primera carga")
        return

    datos = json.load(open(ruta_json, encoding="utf-8"))

    preguntas, span_q = cargar_array(html, "ALL_QUESTIONS")

    bancos_nuevos = {b["banco"]: b["preguntas"] for b in datos["bancos"]}
    for nombre in bancos_nuevos:
        if not nombre.startswith("Apuntes:"):
            raise SystemExit("El banco %r debe empezar por 'Apuntes:'" % nombre)

    # Fuera los bancos de apuntes que vamos a reescribir (idempotencia)
    antes = len(preguntas)
    if todo:
        fuera = lambda t: t.startswith("Apuntes:")
    else:
        fuera = lambda t: t in bancos_nuevos
    preguntas = [q for q in preguntas if not fuera(q.get("topicBase", ""))]
    reemplazadas = antes - len(preguntas)

    # Los ids ya usados por apuntes de OTROS bancos no se deben pisar
    usados = {q["id"] for q in preguntas}
    siguiente = max([i for i in usados if i >= ID_BASE] or [ID_BASE - 1]) + 1

    nuevas = []
    for banco, lista in bancos_nuevos.items():
        for i, p in enumerate(lista, 1):
            if not 0 <= p["correct"] < len(p["options"]):
                raise SystemExit("correct fuera de rango en %r" % p["q"][:60])
            exp = p.get("exp", "").strip()
            etiqueta = ETIQUETA.get(p.get("g", ""), "")
            nuevas.append({
                "id": siguiente, "topic": banco, "topicBase": banco,
                "fileId": siguiente, "origQ": i,
                "q": p["q"], "options": p["options"], "correct": p["correct"],
                "exp": (etiqueta + " " + exp).strip() if etiqueta else exp,
                "n": i,
                **({"img": p["img"]} if p.get("img") else {}),
            })
            siguiente += 1

    # Enunciados repetidos dentro de los propios apuntes. La imagen entra en
    # la comparación: "¿Qué célula nucleada se observa?" sobre dos
    # micrografías distintas son dos preguntas, no una repetida.
    vistos = {}
    for q in nuevas:
        k = (normaliza(q["q"]), q.get("img", ""))
        if k in vistos:
            print("  aviso: enunciado repetido en %s y %s" % (vistos[k], q["topicBase"]))
        vistos[k] = q["topicBase"]

    preguntas = nuevas + preguntas          # los apuntes, al principio
    conteos = {}
    for q in preguntas:
        conteos[q["topicBase"]] = conteos.get(q["topicBase"], 0) + 1

    def dump(o):
        return json.dumps(o, ensure_ascii=False, separators=(",", ":"))

    html = html[:span_q[0]] + dump(preguntas) + html[span_q[1]:]
    _, span_c = cargar_array(html, "TOPIC_COUNTS")
    html = html[:span_c[0]] + dump(conteos) + html[span_c[1]:]

    open(ruta_html, "w", encoding="utf-8").write(html)

    print("  bancos: %d (%d preguntas nuevas, %d reemplazadas)"
          % (len(bancos_nuevos), len(nuevas), reemplazadas))
    for b in bancos_nuevos:
        print("    · %s — %d" % (b, conteos[b]))

    regenerar_indice(ruta_html)


if __name__ == "__main__":
    main()
