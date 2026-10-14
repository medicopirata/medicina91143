#!/usr/bin/env python3
"""Extrae las autoevaluaciones del Sisinio del doc de IMI.

El doc las recoge ya resueltas, una por línea:

    1. ¿Quién definió «especie morbosa»? a) Charcot · b) Müller · c) Koch ·
       d) Sydenham · e) Vesalio → d) Sydenham (s. XVII) elaboró la idea…

es decir: número, enunciado, opciones separadas por « · », flecha, letra
correcta y el razonamiento del propio manual. Se agrupan por el encabezado
«Capítulo N. Título», que da el nombre del banco.

Uso:  python3 tools/extraer_autoeval_imi.py <doc.txt> > bancos.json
"""
import json, re, sys, unicodedata

CAPITULO = re.compile(r"^Cap[íi]tulo\s+(\d+)\.\s*(.+)$")
# en la Parte B el encabezado va al revés: «Autoevaluación del Sisinio, capítulo 6»
CAPITULO_B = re.compile(r"^Autoevaluaci[óo]n del Sisinio,\s*cap[íi]tulo\s+(\d+)\s*$")
PREGUNTA = re.compile(r"^(\d{1,3})\.\s+(.*?)\s+→\s*([a-e])\)?\s*(.*)$")


def nfc(s):
    return unicodedata.normalize("NFC", re.sub(r"\s+", " ", s)).strip()


def partir(texto):
    """Separa «enunciado: a) X · b) Y …» en enunciado y lista de opciones."""
    m = re.search(r"(?:^|[:;.]\s|\s)(a\)\s)", texto)
    if not m:
        return None, None
    enunciado = texto[:m.start(1)].rstrip(" :;.")
    resto = texto[m.start(1):].lstrip()
    trozos = re.split(r"\s·\s(?=[b-e]\))", resto)
    opciones = []
    for t in trozos:
        o = re.match(r"^[a-e]\)\s*(.+)$", t.strip())
        if not o:
            return None, None
        opciones.append(o.group(1).strip().rstrip(" ·"))
    return enunciado, opciones


def main(ruta):
    bancos, actual, nombre = [], None, None
    for linea in open(ruta, encoding="utf-8"):
        t = linea.strip()
        b = CAPITULO_B.match(t)
        if b:
            nombre = "Apuntes: Sisinio cap. %s — autoevaluación" % b.group(1)
            actual = {"banco": nombre, "preguntas": []}
            bancos.append(actual)
            continue
        c = CAPITULO.match(t)
        if c:
            # el título trae entre paréntesis los temas de clase a los que toca
            titulo = re.sub(r"\s*\(.*?\)\s*$", "", c.group(2)).strip().rstrip(":")
            nombre = "Apuntes: Sisinio cap. %s — %s" % (c.group(1), titulo)
            actual = {"banco": nombre, "preguntas": []}
            bancos.append(actual)
            continue
        if actual is None:
            continue
        p = PREGUNTA.match(t)
        if not p:
            continue
        enun, ops = partir(p.group(2))
        if not ops or len(ops) < 4:
            continue
        letra, razon = p.group(3), p.group(4).strip()
        # la clave impresa del libro a veces contradice su propia explicación;
        # el doc lo marca con ⚠️ y ese aviso se conserva en la explicación
        razon = re.sub(r"^\)\s*", "", razon)
        actual["preguntas"].append({
            "g": "A", "n": int(p.group(1)), "q": nfc(enun),
            "options": [nfc(o) for o in ops],
            "correct": "abcde".index(letra),
            "exp": nfc(razon),
        })
    bancos = [b for b in bancos if b["preguntas"]]
    total = sum(len(b["preguntas"]) for b in bancos)
    print("%d bancos · %d preguntas" % (len(bancos), total), file=sys.stderr)
    for b in bancos:
        print("   %3d  %s" % (len(b["preguntas"]), b["banco"]), file=sys.stderr)
    json.dump({"bancos": bancos}, sys.stdout, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main(sys.argv[1])
