#!/usr/bin/env python3
"""Pone explicaciones escritas a mano en un banco de preguntas.

Los extractores sacan el «porqué» de la columna del solucionario del doc, que
muchas veces está vacía o es una coletilla de tres palabras («Meseta»,
«drepanocitos»). Fuera de la tabla del doc eso no explica nada, y al corregir
en la plataforma solo ves la respuesta buena.

Aquí se cargan explicaciones de un JSON `{enunciado: texto}`. Si dos preguntas
del mismo banco comparten enunciado (pasa con las de imagen: «El 1 es»), la
clave lleva la imagen detrás: `enunciado || ruta/de/la/imagen.jpg`.

No pisa lo que ya hubiera: si la pregunta trae explicación del doc, la nueva se
añade detrás. Lo que dijo la profesora manda sobre lo que escriba yo.

Uso:  python3 tools/explicaciones.py <preguntas.json> <explicaciones.json> [banco]
"""
import json, sys


def main():
    if len(sys.argv) not in (3, 4):
        raise SystemExit(__doc__)
    ruta_bancos, ruta_exp = sys.argv[1], sys.argv[2]
    solo = sys.argv[3] if len(sys.argv) == 4 else None

    datos = json.load(open(ruta_bancos, encoding="utf-8"))
    exp = {k: v for k, v in json.load(open(ruta_exp, encoding="utf-8")).items()
           if not k.startswith("_")}

    usadas, puestas, añadidas = set(), 0, 0
    for banco in datos["bancos"]:
        if solo and solo not in banco["banco"]:
            continue
        for p in banco["preguntas"]:
            clave = None
            con_img = "%s || %s" % (p["q"], p.get("img", ""))
            if con_img in exp:
                clave = con_img
            elif p["q"] in exp:
                clave = p["q"]
            if clave is None:
                continue
            usadas.add(clave)
            texto = exp[clave]
            viejo = (p.get("exp") or "").strip()
            if not viejo:
                p["exp"] = texto; puestas += 1
            elif texto not in viejo:
                # lo del doc primero, lo mío detrás
                p["exp"] = viejo.rstrip(".") + ". " + texto; añadidas += 1

    json.dump(datos, open(ruta_bancos, "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)

    sobran = sorted(set(exp) - usadas)
    sin = [p["q"] for b in datos["bancos"] if not solo or solo in b["banco"]
           for p in b["preguntas"] if not (p.get("exp") or "").strip()]
    print("  explicaciones puestas: %d · ampliadas: %d" % (puestas, añadidas))
    if sobran:
        print("  sobran en el JSON (no casan con ninguna pregunta): %d" % len(sobran))
        for s in sobran[:8]:
            print("     ·", s[:80])
    if sin:
        print("  siguen sin explicación: %d" % len(sin))
        for s in sin[:8]:
            print("     ·", s[:80])


if __name__ == "__main__":
    main()
