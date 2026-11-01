#!/usr/bin/env python3
"""Completa el caso de las preguntas que remiten a información que no está en su enunciado
(«el niño del caso anterior», «Y sus hijas serán», «esa capa», «ese vaso de mayor calibre»
en una secuencia sobre la misma imagen, «la tabla de aclaramientos» sin tabla…).

Datos en apuntes_extra/casos-2026-11-01.json, por plataforma:
  casos:    id -> {orig, caso, q, exp_mas?}
            · guarda el enunciado original en "qAntes" (si ya existe, no lo pisa);
            · "q" pasa a «📋 Caso: <caso> <q>»;
            · si hay "exp_mas", se añade al final de la explicación.
            No toca la clave, las opciones ni el id.
  sin_caso: ids cuyo caso no aparece en ningún sitio: se añade a "exp"
            «⚠️ Falta el caso original de esta pregunta.» y el enunciado no se toca.

Idempotente: lo ya aplicado se salta. Si el enunciado actual no es ni el original
esperado ni el ya arreglado, avisa y no toca esa pregunta.

Uso:  python3 tools/casos_completos_2026-11-01.py [plataforma.html ...]
      (sin argumentos: las cuatro plataformas del JSON)
"""
import json, os, re, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATOS = os.path.join(RAIZ, "apuntes_extra", "casos-2026-11-01.json")
AVISO = "⚠️ Falta el caso original de esta pregunta."
RE_QS = re.compile(r"^const ALL_QUESTIONS = (\[.*?\]);$", re.M | re.S)


def volcar(qs, original):
    """Mismo formato que el que había: con o sin espacios tras , y :."""
    compacto = json.dumps(json.loads(original), ensure_ascii=False, separators=(",", ":")) == original
    if compacto:
        return json.dumps(qs, ensure_ascii=False, separators=(",", ":"))
    return json.dumps(qs, ensure_ascii=False)


def aplicar(ruta, bloque):
    s = open(ruta, encoding="utf-8").read()
    m = RE_QS.search(s)
    qs = json.loads(m.group(1))
    Q = {str(q["id"]): q for q in qs}
    hechos, avisos = [], []

    for i, d in bloque.get("casos", {}).items():
        q = Q.get(i)
        if q is None:
            avisos.append("%s: no existe" % i)
            continue
        nuevo = "📋 Caso: %s %s" % (d["caso"], d["q"])
        if q["q"] == nuevo:
            pass
        elif q["q"] == d["orig"]:
            q.setdefault("qAntes", q["q"])
            q["q"] = nuevo
            hechos.append("%s caso" % i)
        else:
            avisos.append("%s: el enunciado ha cambiado, no se toca" % i)
            continue
        if d.get("exp_mas") and d["exp_mas"] not in (q.get("exp") or ""):
            q["exp"] = (q.get("exp") or "").rstrip() + " " + d["exp_mas"]
            hechos.append("%s exp" % i)

    for i in bloque.get("sin_caso", []):
        q = Q.get(str(i))
        if q is None:
            avisos.append("%s: no existe" % i)
            continue
        if AVISO not in (q.get("exp") or ""):
            q["exp"] = (q.get("exp") or "").rstrip() + " " + AVISO
            hechos.append("%s sin caso" % i)

    if hechos:
        s = s[:m.start(1)] + volcar(qs, m.group(1)) + s[m.end(1):]
        open(ruta, "w", encoding="utf-8").write(s)
    print("%s: %d cambios%s" % (os.path.basename(ruta), len(hechos),
                                 "" if not avisos else "\n  ⚠ " + "\n  ⚠ ".join(avisos)))


def main(args):
    datos = json.load(open(DATOS, encoding="utf-8"))["plataformas"]
    rutas = args or [os.path.join(RAIZ, p) for p in datos]
    for ruta in rutas:
        nombre = os.path.basename(ruta)
        if nombre not in datos:
            print("%s: no está en %s" % (nombre, os.path.basename(DATOS)))
            continue
        aplicar(ruta, datos[nombre])


if __name__ == "__main__":
    main(sys.argv[1:])
