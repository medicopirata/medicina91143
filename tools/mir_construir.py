#!/usr/bin/env python3
"""Construye plataforma_mir.html a partir del repo de preguntas del MIR.

El motor es el mismo de las demás plataformas (se clona de una existente y se
le sustituyen los dos bloques de datos). Lo propio del MIR es la organización
en DOS niveles, que el motor ya soporta con `SECTIONS`:

    bloque temático (Cardiología, Digestivo…)   -> sección de la portada
      └─ examen (MIR 2014 … MIR 2026)           -> una tarjeta por año

Cada banco se llama «<Bloque> · MIR <año>» y la sección se queda el prefijo,
de modo que en la tarjeta solo se lee el año.

Qué entra y qué no:
  - entran las preguntas con clave oficial, no anuladas y sin imagen;
  - quedan fuera las de imagen (los cuadernillos no están en el repo de
    origen, así que no se pueden responder), las anuladas y las que no tienen
    clave (todo el examen de 2018 y unas pocas más).
Las que quedan fuera se listan en el informe para irlas incorporando.

Los ids son estables y no dependen del orden: id = (año-2000)*1000 + nº de
pregunta. Así, añadir un examen nuevo no desplaza ningún id y el progreso
guardado sigue valiendo.

Uso:  python3 tools/mir_construir.py <preguntas.jsonl> [--plantilla plataforma_genetica.html]
"""
import json, re, sys, collections, importlib.util

# Orden y aspecto de los bloques en la portada. El emoji y el color son los
# que distinguen un bloque de otro de un vistazo.
BLOQUES_UI = [
 ("Cardiología",                  "🫀", "#f87171"),
 ("Neumología",                   "🫁", "#60a5fa"),
 ("Digestivo",                    "🍽", "#fbbf24"),
 ("Nefrología",                   "🫘", "#34d399"),
 ("Urología",                     "🚹", "#22d3ee"),
 ("Endocrinología",               "🦋", "#a78bfa"),
 ("Hematología",                  "🩸", "#fb7185"),
 ("Oncología",                    "🎗", "#c084fc"),
 ("Reumatología",                 "🦴", "#facc15"),
 ("Neurología",                   "🧠", "#38bdf8"),
 ("Psiquiatría",                  "🧩", "#f472b6"),
 ("Dermatología",                 "🩹", "#fda4af"),
 ("Oftalmología",                 "👁", "#67e8f9"),
 ("Otorrinolaringología",         "👂", "#fcd34d"),
 ("Ginecología y Obstetricia",    "🤰", "#f9a8d4"),
 ("Pediatría",                    "🧒", "#7dd3fc"),
 ("Traumatología",                "🦵", "#fdba74"),
 ("Infecciosas y Microbiología",  "🦠", "#4ade80"),
 ("Inmunología",                  "🛡", "#2dd4bf"),
 ("Genética",                     "🧬", "#8b5cf6"),
 ("Farmacología",                 "💊", "#e879f9"),
 ("Anestesia y Cuidados Críticos","💉", "#94a3b8"),
 ("Estadística y Epidemiología",  "📊", "#fde047"),
 ("Salud Pública y Preventiva",   "🏥", "#86efac"),
 ("Bioética y Medicina Legal",    "⚖️", "#cbd5e1"),
 ("Anatomía Patológica",          "🔬", "#d8b4fe"),
 ("Fisiología y Bioquímica",      "⚙️", "#5eead4"),
 ("Anatomía",                     "🫀", "#fca5a5"),
 ("Geriatría y Nutrición",        "🧓", "#fed7aa"),
 ("Por clasificar",               "📂", "#64748b"),
]


def cargar_clasificador(ruta="tools/mir_clasificar.py"):
    spec = importlib.util.spec_from_file_location("mc", ruta)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def construir_preguntas(origen, mc):
    qs = [json.loads(l) for l in open(origen, encoding="utf-8")]
    fuera = collections.Counter()
    preguntas, por_bloque = [], collections.Counter()
    for q in qs:
        if q["correcta"] is None:
            fuera["sin clave"] += 1
            continue
        if q["anulada"]:
            fuera["anuladas"] += 1
            continue
        if q.get("imagen"):
            fuera["dependen de imagen"] += 1
            continue
        bloque = mc.clasificar(q)[0] or "Por clasificar"
        por_bloque[bloque] += 1
        topic = "%s · MIR %d" % (bloque, q["anio_examen"])
        preguntas.append({
            "id": (q["anio_examen"] - 2000) * 1000 + q["num"],
            "topic": topic,
            "topicBase": topic,
            "fileId": q["anio_examen"],
            "origQ": q["num"],
            "q": q["enunciado"],
            "options": q["opciones"],
            "correct": q["correcta"] - 1,     # la fuente es 1-5, el motor 0-4
            "exp": "",
            "n": q["num"],
        })
    # orden estable: bloque como en la portada, y dentro por año y nº
    orden = {b: i for i, (b, _, _) in enumerate(BLOQUES_UI)}
    preguntas.sort(key=lambda p: (orden.get(p["topic"].split(" · MIR ")[0], 99),
                                  p["fileId"], p["origQ"]))
    return preguntas, por_bloque, fuera


def secciones_js(por_bloque):
    """Una sección por bloque con preguntas, en el orden de BLOQUES_UI."""
    lineas = ["const SECTIONS = [];"]
    for bloque, emoji, color in BLOQUES_UI:
        if not por_bloque.get(bloque):
            continue
        pref = bloque + " · "
        lineas.append(
            "SECTIONS.push({id:%s, title:'%s %s', color:'%s', first:true, "
            "match: t => t.startsWith(%s), strip: %s});"
            % (json.dumps(bloque.lower().replace(" ", "-")), emoji, bloque, color,
               json.dumps(pref), json.dumps(pref)))
    # para los temas de apuntes que se añadan más adelante
    lineas.append("SECTIONS.push({id:'apuntes', title:'📓 Apuntes de clase', "
                  "color:'#34d399', first:true, match: t => t.startsWith('Apuntes:')});")
    return "\n".join(lineas)


def heredar(preguntas, ruta="plataforma_mir.html"):
    """Rescata de una plataforma ya construida lo que se hizo a mano.

    La clasificación automática es solo un andamio y las explicaciones se
    escriben una a una, así que reconstruir no puede tirar ese trabajo: se
    conservan, por id, la explicación y el bloque si se había recolocado.
    """
    import os
    if not os.path.exists(ruta):
        return 0, 0
    viejo = open(ruta, encoding="utf-8").read()
    m = re.search(r"const ALL_QUESTIONS = (\[.*?\]);\n", viejo, re.S)
    if not m:
        return 0, 0
    previo = {q["id"]: q for q in json.loads(m.group(1))}
    exps = bloques = 0
    for p in preguntas:
        v = previo.get(p["id"])
        if not v:
            continue
        if v.get("exp"):
            p["exp"] = v["exp"]; exps += 1
        if v.get("topic") and v["topic"] != p["topic"]:
            p["topic"] = p["topicBase"] = v["topic"]; bloques += 1
    return exps, bloques


def main(argv):
    origen = [a for a in argv if not a.startswith("--")][0]
    plantilla = "plataforma_genetica.html"
    if "--plantilla" in argv:
        plantilla = argv[argv.index("--plantilla") + 1]

    mc = cargar_clasificador()
    preguntas, por_bloque, fuera = construir_preguntas(origen, mc)
    heredadas, recolocadas = heredar(preguntas)
    if heredadas or recolocadas:
        print("heredado de la versión anterior: %d explicaciones, %d bloques corregidos a mano"
              % (heredadas, recolocadas), file=sys.stderr)
        por_bloque = collections.Counter(p["topic"].split(" · MIR ")[0] for p in preguntas)
    counts = collections.Counter(p["topic"] for p in preguntas)

    s = open(plantilla, encoding="utf-8").read()

    # --- los dos bloques de datos ---
    s = re.sub(r"const ALL_QUESTIONS = \[.*?\];\n",
               "const ALL_QUESTIONS = %s;\n" % json.dumps(preguntas, ensure_ascii=False),
               s, count=1, flags=re.S)
    s = re.sub(r"const TOPIC_COUNTS = \{.*?\};\n",
               "const TOPIC_COUNTS = %s;\n" % json.dumps(dict(counts), ensure_ascii=False),
               s, count=1, flags=re.S)

    # --- identidad de la plataforma ---
    s = s.replace("<title>Genética Médica — Plataforma de Estudio</title>",
                  "<title>MIR — Plataforma de Estudio</title>", 1)
    s = s.replace("<h1>🧬 Genética Médica</h1>", "<h1>🩺 MIR</h1>", 1)
    s = s.replace("const STORAGE_KEY = 'genetica_study_v1';",
                  "const STORAGE_KEY = 'mir_study_v1';", 1)
    # la fuente oficial no trae explicaciones: todas las de aquí están escritas
    # por Claude, y eso se dice una vez en la portada y no en cada pregunta
    s = s.replace("<p>Plataforma de Estudio Inteligente &middot; "
                  "<span id=\"total-q-count\"></span> preguntas</p>",
                  "<p>Preguntas oficiales del Ministerio &middot; "
                  "<span id=\"total-q-count\"></span> preguntas &middot; "
                  "explicaciones escritas por Claude</p>", 1)

    # --- secciones: un bloque temático por sección, el año dentro ---
    viejo = ("const SECTIONS = [];\n"
             "SECTIONS.unshift({id:'apuntes', title:'📓 Apuntes de clase', color:'#34d399', "
             "first:true, match: t => t.startsWith('Apuntes:')});")
    if viejo not in s:
        m = re.search(r"const SECTIONS = \[\];\nSECTIONS\.unshift\(\{id:'apuntes'.*?\}\);", s, re.S)
        if not m:
            sys.exit("no encuentro el bloque SECTIONS de la plantilla")
        viejo = m.group(0)
    s = s.replace(viejo, secciones_js(por_bloque), 1)

    # --- poder marcar la clave a mano (preguntas sin clave oficial) ---
    s = s.replace("}, {});\n\nfunction sectionOf", "}, {answerKey: true});\n\nfunction sectionOf", 1)
    if "answerKey: true" not in s:
        s = re.sub(r"(highlight: \[\],[^\n]*\n\}, )\{\}\)", r"\1{answerKey: true})", s, count=1)

    # --- la rejilla «Temas» queda vacía hasta que haya temas de apuntes: ocúltala ---
    ancla = "document.getElementById('extra-sections').innerHTML = renderSections(SECTIONS.filter(s => !s.first));"
    s = s.replace(ancla, ancla +
        "\n      const grid = document.getElementById('topics-grid');"
        "\n      if (grid && !grid.innerHTML.trim()) grid.closest('.topics-section').style.display = 'none';", 1)

    open("plataforma_mir.html", "w", encoding="utf-8").write(s)

    # --- informe ---
    tot = len(preguntas)
    print("plataforma_mir.html · %d preguntas · %d bancos · %d bloques"
          % (tot, len(counts), len(por_bloque)), file=sys.stderr)
    print("\nPor bloque:", file=sys.stderr)
    for bloque, _, _ in BLOQUES_UI:
        if por_bloque.get(bloque):
            anios = sorted({p["fileId"] for p in preguntas
                            if p["topic"].startswith(bloque + " · ")})
            print("   %4d  %-30s %d exámenes (%d-%d)"
                  % (por_bloque[bloque], bloque, len(anios), min(anios), max(anios)),
                  file=sys.stderr)
    print("\nFuera de la plataforma:", file=sys.stderr)
    for k, n in fuera.most_common():
        print("   %4d  %s" % (n, k), file=sys.stderr)
    print("\nSin explicación todavía: %d de %d" % (sum(1 for p in preguntas if not p["exp"]), tot),
          file=sys.stderr)


if __name__ == "__main__":
    main(sys.argv[1:])
