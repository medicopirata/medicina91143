#!/usr/bin/env python3
"""Extrae las preguntas del Repaso del Guyton de las pestañas del doc de Fisio.

Formato del doc, muy regular:

    Tema 4 · Electrocardiografía · 48 preguntas

    G4.12. <enunciado>

    - a) <opción>
    - b) <opción>
    ...

    Soluciones · Tema 4

    | N.º | Sol. | Por qué | Guyton (TFM13) | Repaso |
    | G4.12 | c | <razonamiento> | TFM13 pág. 123 | IV-45 |

Las preguntas se numeran con prefijo según la pestaña: `G<tema>.<n>` las de
los temas dados, `D<n>` las de reserva del digestivo y `R<n>` las de refuerzo
cardiovascular. La tabla de soluciones da la letra y el razonamiento del
propio repaso, con la página del libro.

Uso:  python3 tools/extraer_guyton.py <fichero.txt> [...] > bancos.json
"""
import json, re, sys, unicodedata, collections

# «Tema 4 · Electrocardiografía · 48 preguntas» | «Shock circulatorio · 15 preguntas»
# | «Reserva para los temas 16–19 (aún no dados) · 49 preguntas» | «Motilidad (…) · 11»
SECCION = re.compile(r"^(?!Soluciones)(.+?) · (\d+)(?: preguntas)?$")
SOLUCIONES = re.compile(r"^Soluciones · (.+)$")
PREGUNTA = re.compile(r"^([GDR]\d+(?:\.\d+)?)\.\s+(.*)$")
OPCION = re.compile(r"^-\s+([a-h])\)\s*(.+)$")
FILA_SOL = re.compile(r"^\|\s*([GDR]\d+(?:\.\d+)?)\s*\|\s*([a-h])\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|$")

LETRAS = "abcdefgh"


def nfc(s):
    return unicodedata.normalize("NFC", re.sub(r"[ \t]+", " ", s)).strip()


def parsear(ruta):
    """Devuelve (sección -> lista de preguntas, id -> datos de solución)."""
    secciones, soluciones = [], {}
    actual, pendiente = None, None   # pendiente = pregunta a medio leer
    en_soluciones = False

    def cerrar():
        nonlocal pendiente
        if pendiente and actual is not None:
            actual["preguntas"].append(pendiente)
        pendiente = None

    for linea in open(ruta, encoding="utf-8"):
        t = linea.rstrip("\n")
        bruto = t.strip()

        s = SOLUCIONES.match(bruto)
        if s:
            cerrar()
            en_soluciones = True
            continue

        f = FILA_SOL.match(bruto)
        if f:
            soluciones[f.group(1)] = {
                "letra": f.group(2),
                "porque": nfc(f.group(3)),
                "libro": nfc(f.group(4)),
                "repaso": nfc(f.group(5)),
            }
            continue
        if bruto.startswith("| N.º"):       # cabecera de la tabla
            continue

        # Las opciones van primero: hay opciones numéricas con « · » dentro
        # («- e) 98 · 140 · 20 — 75 · 40») que si no se leerían como encabezado
        # de sección y partirían la pregunta en dos.
        o = OPCION.match(bruto)
        if o and pendiente:
            pendiente["options"].append(nfc(o.group(2)))
            continue

        p = PREGUNTA.match(bruto)
        if p:
            cerrar()
            pendiente = {"ref": p.group(1), "q": nfc(p.group(2)), "options": []}
            continue

        m = SECCION.match(bruto)
        if m and not bruto.startswith(("|", "-")):
            cerrar()
            en_soluciones = False
            actual = {"seccion": nfc(m.group(1)), "anunciadas": int(m.group(2)), "preguntas": []}
            secciones.append(actual)
            continue

        if en_soluciones:
            continue

        # línea suelta: continúa el enunciado si aún no hay opciones
        if pendiente and bruto and not pendiente["options"]:
            pendiente["q"] = nfc(pendiente["q"] + " " + bruto)

    cerrar()
    return [s for s in secciones if s["preguntas"]], soluciones


def nombre_banco(seccion, archivo):
    """Nombre del banco en la plataforma, con el prefijo 📕 del Guyton."""
    m = re.match(r"^Tema (\d+) · (.+)$", seccion)
    if m:
        return "📕 Guyton · Tema %s — %s" % (m.group(1), m.group(2))
    if seccion.startswith("Reserva para los temas"):
        return "📕 Guyton · Reserva temas 16–19"
    if "refuerzo" in archivo:
        return "📕 Guyton · Refuerzo cardiovascular — %s" % seccion
    if "tema15" in archivo:
        return "📕 Guyton · Reserva temas 16–19 — %s" % seccion
    return "📕 Guyton · %s" % seccion


def main(rutas):
    bancos, incidencias = [], []
    for ruta in rutas:
        secciones, soluciones = parsear(ruta)
        corto = ruta.rsplit("/", 1)[-1]
        for sec in secciones:
            preguntas = []
            for i, p in enumerate(sec["preguntas"], 1):
                sol = soluciones.get(p["ref"])
                if not sol:
                    incidencias.append("%s %s: sin fila de solución" % (corto, p["ref"]))
                    continue
                if len(p["options"]) < 3:
                    incidencias.append("%s %s: %d opciones" % (corto, p["ref"], len(p["options"])))
                    continue
                idx = LETRAS.index(sol["letra"])
                if idx >= len(p["options"]):
                    incidencias.append("%s %s: clave «%s» fuera de %d opciones"
                                       % (corto, p["ref"], sol["letra"], len(p["options"])))
                    continue
                preguntas.append({
                    "ref": p["ref"], "n": i, "q": p["q"], "options": p["options"],
                    "correct": idx, "porque": sol["porque"],
                    "libro": sol["libro"], "repaso": sol["repaso"],
                })
            if preguntas:
                bancos.append({"banco": nombre_banco(sec["seccion"], corto),
                               "anunciadas": sec["anunciadas"], "preguntas": preguntas})
            if sec["anunciadas"] != len(preguntas):
                incidencias.append("%s «%s»: anuncia %d y salen %d"
                                   % (corto, sec["seccion"], sec["anunciadas"], len(preguntas)))

    total = sum(len(b["preguntas"]) for b in bancos)
    print("%d bancos · %d preguntas" % (len(bancos), total), file=sys.stderr)
    for b in bancos:
        cortas = sum(1 for p in b["preguntas"] if len(p["porque"]) < 60)
        print("   %3d  %-58s %s" % (len(b["preguntas"]), b["banco"],
              "⚠ %d razonamientos cortos" % cortas if cortas else ""), file=sys.stderr)
    if incidencias:
        print("\nIncidencias (%d):" % len(incidencias), file=sys.stderr)
        for x in incidencias:
            print("   ", x, file=sys.stderr)
    json.dump({"bancos": bancos}, sys.stdout, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main(sys.argv[1:])
