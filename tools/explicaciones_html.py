#!/usr/bin/env python3
"""Pone explicaciones escritas a mano directamente en una plataforma.

Hermano de `explicaciones.py`, para las asignaturas cuyas preguntas no vienen
de un JSON de apuntes sino que viven ya dentro del `plataforma_*.html`
(Genética, Fisio II, Histo Esp II, IMI…).

El JSON es el mismo: `{enunciado: texto}`. Si dos preguntas comparten
enunciado la clave puede llevar detrás la imagen (`enunciado || img.jpg`) o la
respuesta correcta (`enunciado || =texto de la correcta`), por si dos
preguntas con el mismo enunciado piden cosas distintas.

Por defecto solo rellena las que están vacías: si la pregunta ya tiene
explicación, se deja como está (lo normal es que la clave case también con
preguntas parecidas de otros bancos que ya la tenían bien). Con `--ampliar`
se añade el texto detrás del que ya hubiera, sin pisarlo, y con
`--ampliar-hasta=N` solo detrás de las que apenas tienen explicación: las que,
quitada la etiqueta de procedencia, no llegan a N caracteres.

Uso:  python3 tools/explicaciones_html.py <plataforma.html> <explicaciones.json>
                [--ampliar | --ampliar-hasta=N]
"""
import json, re, sys, unicodedata

# Los bancos de apuntes llevan delante la etiqueta de procedencia («🎓 Dicha en
# clase.»), que no explica nada: con --ampliar-hasta=N se amplían las preguntas
# que, descontada esa etiqueta, no llegan a N caracteres de explicación de
# verdad (las de los demás bancos no la llevan y cuentan su texto entero).
def nfc(s):
    """Las preguntas copiadas del PDF traen la ñ descompuesta (n + tilde): sin
    normalizar, la misma frase no casa con la clave del JSON."""
    return unicodedata.normalize("NFC", s or "")


ETIQUETA = re.compile(r"^\s*(?:🎓 Dicha en clase\.|📌 Deducida de sus pistas\.|"
                      r"🤖 Propuesta por Claude, no dicha en clase\.|"
                      r"🖼️ Pregunta con imagen\.)\s*")


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    ampliar = "--ampliar" in sys.argv
    hasta = 0
    for a in sys.argv[1:]:
        if a.startswith("--ampliar-hasta="):
            hasta = int(a.split("=", 1)[1])
    if len(args) != 2:
        raise SystemExit(__doc__)
    ruta_html, ruta_exp = args
    html = open(ruta_html, encoding="utf-8").read()
    m = re.search(r'^const ALL_QUESTIONS = (.*?);$', html, re.M | re.S)
    if not m:
        raise SystemExit("No encuentro const ALL_QUESTIONS en %s" % ruta_html)
    preguntas = json.loads(m.group(1))

    exp = {nfc(k): v for k, v in json.load(open(ruta_exp, encoding="utf-8")).items()
           if not k.startswith("_")}

    usadas, puestas, añadidas = set(), 0, 0
    for p in preguntas:
        correcta = ""
        if isinstance(p.get("correct"), int) and p.get("options"):
            correcta = p["options"][p["correct"]]
        for clave in (nfc("%s || %s" % (p.get("q", ""), p.get("img", ""))),
                      nfc("%s || =%s" % (p.get("q", ""), correcta)),
                      nfc(p.get("q", ""))):
            if clave in exp:
                break
        else:
            continue
        usadas.add(clave)
        texto = exp[clave]
        viejo = (p.get("exp") or "").strip()
        if not viejo:
            p["exp"] = texto; puestas += 1
        elif hasta and texto not in viejo \
                and len(ETIQUETA.sub("", viejo).strip()) < hasta:
            p["exp"] = viejo.rstrip(".") + ". " + texto; añadidas += 1
        elif ampliar and texto not in viejo:
            p["exp"] = viejo.rstrip(".") + ". " + texto; añadidas += 1

    dump = json.dumps(preguntas, ensure_ascii=False, separators=(",", ":"))
    open(ruta_html, "w", encoding="utf-8").write(
        html[:m.start(1)] + dump + html[m.end(1):])

    sobran = sorted(set(exp) - usadas)
    sin = [p["q"] for p in preguntas if not (p.get("exp") or "").strip()]
    print("  explicaciones puestas: %d · ampliadas: %d" % (puestas, añadidas))
    if sobran:
        print("  sobran en el JSON (no casan con ninguna pregunta): %d" % len(sobran))
        for s in sobran[:8]:
            print("     ·", s[:80])
    print("  siguen sin explicación: %d" % len(sin))
    for s in sin[:8]:
        print("     ·", s[:80])


if __name__ == "__main__":
    main()
