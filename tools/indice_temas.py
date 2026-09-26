#!/usr/bin/env python3
"""Genera el índice de temas que usa el escritorio.

El progreso guarda el id de cada pregunta, pero no a qué tema pertenece: eso
vive dentro del HTML de cada plataforma, que pesa megas. Cargar todo eso en
el inicio para agrupar los fallos por tema no es viable.

Aquí se extrae solo lo imprescindible. Como los ids van casi seguidos dentro
de cada banco, en vez de una entrada por pregunta se guardan rangos:

    { "clave": { "t": ["Tema 1 …", "Tema 2 …"], "r": [[2776, 2906, 0], …] } }

donde cada rango es [primer id, último id, índice del tema]. Con eso el
escritorio sabe de qué tema es cualquier pregunta leyendo unas decenas de KB.

De paso pone al día los totales de preguntas que están escritos a mano en
escritorio.js y en catalogo.js, para que la barra de progreso y las tarjetas
no se queden cortas cuando se añaden apuntes.

Uso:  python3 tools/indice_temas.py
"""
import json, re, os, glob

# Solo las de segundo: son las que mira el escritorio.
PLATAFORMAS = {
    "fisio1_study_v1":    "plataforma_fisio1.html",
    "histo21_study_v1":   "plataforma_histologia2.1.html",
    "anat3_study_v1":     "plataforma_anatomia3.html",
    "medint_study_v1":    "plataforma_medint.html",
    "genetica_study_v1":  "plataforma_genetica.html",
    "fisio2_study_v1":    "plataforma_fisio2.html",
    "histoesp2_study_v1": "plataforma_histoesp2.html",
}


def preguntas(ruta):
    s = open(ruta, encoding="utf-8").read()
    m = re.search(r"^const ALL_QUESTIONS = (.*?);$", s, re.M | re.S)
    return json.loads(m.group(1))


def comprimir(qs):
    """Ordena por id y agrupa en rangos consecutivos del mismo tema."""
    temas, indice = [], {}
    pares = []
    for q in qs:
        t = q.get("topicBase") or "(sin tema)"
        if t not in indice:
            indice[t] = len(temas)
            temas.append(t)
        pares.append((q["id"], indice[t]))

    pares.sort()
    rangos = []
    for id_, ti in pares:
        if rangos and rangos[-1][2] == ti and id_ == rangos[-1][1] + 1:
            rangos[-1][1] = id_          # el rango continúa
        else:
            rangos.append([id_, id_, ti])
    return temas, rangos


def reescribir(ruta, campo, busca, totales):
    """Pone al día los contadores escritos a mano en un .js.

    `busca` dice cómo localizar la línea de cada plataforma (por su clave de
    progreso o por su archivo) y `campo` cuál es el número que hay que tocar.
    """
    if not os.path.exists(ruta):
        print("  falta %s" % os.path.basename(ruta)); return
    s = open(ruta, encoding="utf-8").read()
    cambios = []
    for clave, archivo in PLATAFORMAS.items():
        aguja = clave if busca == "clave" else archivo
        patron = re.compile(r'("%s".*?%s:\s*)(\d+)' % (re.escape(aguja), campo), re.S)
        m = patron.search(s)
        if not m:
            print("  %s: no encuentro %s" % (os.path.basename(ruta), aguja)); continue
        n = totales[clave]
        if int(m.group(2)) != n:
            cambios.append("%s %s->%d" % (clave.split("_")[0], m.group(2), n))
            s = s[:m.start(2)] + str(n) + s[m.end(2):]
    if cambios:
        open(ruta, "w", encoding="utf-8").write(s)
        print("  %s: %s" % (os.path.basename(ruta), ", ".join(cambios)))
    else:
        print("  %s: los contadores ya estaban bien" % os.path.basename(ruta))


def actualizar_totales(base, totales):
    reescribir(os.path.join(base, "escritorio.js"), "total", "clave", totales)
    reescribir(os.path.join(base, "catalogo.js"), "n", "archivo", totales)


def main():
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    salida, filas, totales = {}, [], {}
    for clave, archivo in PLATAFORMAS.items():
        ruta = os.path.join(base, archivo)
        if not os.path.exists(ruta):
            print("  falta:", archivo); continue
        qs = preguntas(ruta)
        temas, rangos = comprimir(qs)
        salida[clave] = {"t": temas, "r": rangos}
        filas.append((archivo, len(qs), len(temas), len(rangos)))
        totales[clave] = len(qs)

    destino = os.path.join(base, "indice_temas.json")
    with open(destino, "w", encoding="utf-8") as f:
        json.dump(salida, f, ensure_ascii=False, separators=(",", ":"))

    for a, nq, nt, nr in filas:
        print("  %-32s %5d preguntas · %3d temas · %4d rangos" % (a, nq, nt, nr))
    print("  -> indice_temas.json  (%.1f KB)" % (os.path.getsize(destino) / 1024))
    actualizar_totales(base, totales)


if __name__ == "__main__":
    main()
