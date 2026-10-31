#!/usr/bin/env python3
"""Candidatas para el diccionario de siglas de una sala de estudio.

Uso:  python3 tools/estudio_siglas.py <clave> salida.md

Junta las siglas que aparecen en los temas de estudio/<clave>/ (palabras con
dos o más mayúsculas: PAM, FG, ADH, PaO₂, HbA1c…), cuántas veces y en qué
temas, y para cada una las frases de los apuntes (apuntes_txt/<clave>.json) y
de los temas donde se define: «presión arterial media (PAM)» o «PAM (presión
arterial media)». Con eso se escribe a mano estudio/<clave>/siglas.json:

    {"PAM": "presión arterial media", "FG": "filtrado glomerular", …}

La sala enseña, junto al texto, las siglas del diccionario que salen en el
apartado que se está leyendo y en el resto del tema.
"""
import glob, json, os, re, sys
from collections import Counter, defaultdict

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APUNTES = {"fisio1": "fisio1", "medint": "medint", "anat3": "anat3", "histo21": "histo21", "genetica": "genetica"}
# Sigla: empieza por mayúscula, tiene al menos dos mayúsculas y como mucho 8 caracteres.
RE_SIGLA = re.compile(r"(?<![\wÁÉÍÓÚÑáéíóúñ])([A-ZÁÉÍÓÚÑ][A-Za-z0-9ÁÉÍÓÚÑ₀-₉⁺⁻αβγ\-]{1,7})(?![\wÁÉÍÓÚÑáéíóúñ])")
NO = {"NO", "SI", "II", "III", "IV", "VI", "VII", "VIII", "IX", "XI", "XII", "OK", "UCA", "MIR", "ECG"}  # ECG sí entra: se quita de NO abajo
NO.discard("ECG")
ROMANOS = re.compile(r"^[IVXL]+$")


def textos(x):
    if isinstance(x, str): yield x
    elif isinstance(x, list):
        for y in x: yield from textos(y)
    elif isinstance(x, dict):
        for k, y in x.items():
            if k not in ("bateria", "previa", "comprueba", "src", "archivo"): yield from textos(y)


def es_sigla(s):
    if ROMANOS.match(s) or s in NO: return False
    return sum(1 for c in s if c.isupper()) >= 2


def main():
    if len(sys.argv) != 3: raise SystemExit(__doc__)
    clave, salida = sys.argv[1:]
    carpeta = os.path.join(RAIZ, "estudio", clave)
    cuenta, donde = Counter(), defaultdict(set)
    frases_tema = []
    for f in sorted(glob.glob(os.path.join(carpeta, "tema-*.json"))):
        t = json.load(open(f, encoding="utf-8"))
        corto = t.get("corta") or "T%s" % t.get("tema")
        for tx in textos(t):
            frases_tema.append(tx)
            for m in RE_SIGLA.finditer(tx):
                s = m.group(1)
                if es_sigla(s): cuenta[s] += 1; donde[s].add(corto)
    ap = json.load(open(os.path.join(RAIZ, "apuntes_txt", APUNTES[clave] + ".json"), encoding="utf-8"))["trozos"]
    frases = [x for _, x in ap] + frases_tema
    try:
        sig = json.load(open(os.path.join(carpeta, "siglas.json"), encoding="utf-8"))
    except Exception:
        sig = {}
    # Definiciones en una sola pasada: «… texto (SIGLA)» y «SIGLA (texto)».
    defs = defaultdict(list)
    re_a = re.compile(r"([^.;:\n()]{3,80})\(\s*([A-ZÁÉÍÓÚÑ][A-Za-z0-9₀-₉⁺⁻αβγ\-]{1,7})\s*[),;]")
    re_b = re.compile(r"(?<![\wÁÉÍÓÚÑáéíóúñ])([A-ZÁÉÍÓÚÑ][A-Za-z0-9₀-₉⁺⁻αβγ\-]{1,7})\s*\(([^)]{3,90})\)")
    for fr in frases:
        for m in re_a.finditer(fr):
            k, d = m.group(2), m.group(1).strip()
            if k in cuenta and len(defs[k]) < 4 and d not in defs[k]: defs[k].append(d)
        for m in re_b.finditer(fr):
            k, d = m.group(1), m.group(2).strip()
            if k in cuenta and len(defs[k]) < 4 and d not in defs[k]: defs[k].append(d)
    out = ["# Siglas candidatas · %s\n" % clave,
           "%d siglas distintas en los temas de la sala. Para cada una: veces, temas y frases donde parece definirse.\n" % len(cuenta)]
    for s, n in cuenta.most_common():
        out.append("## %s · %d× · %s%s" % (s, n, ", ".join(sorted(donde[s])), " · YA: " + sig[s] if s in sig else ""))
        for d in defs[s]: out.append("- …" + d)
        if not defs[s]: out.append("- (sin definición encontrada)")
        out.append("")
    open(salida, "w", encoding="utf-8").write("\n".join(out))
    print("%s · %d siglas" % (salida, len(cuenta)))


main()
