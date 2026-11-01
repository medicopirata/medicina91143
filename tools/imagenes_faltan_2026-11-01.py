#!/usr/bin/env python3
"""Preguntas que remiten a una imagen que no está (revisión del 01-11-2026).

Se revisaron, en busca de enunciados que dependen de una imagen, gráfica, trazado,
tabla o datos ausentes y sin "img": plataforma_fisio1, plataforma_anatomia3,
plataforma_histologia2.1 y plataforma_genetica (IMI va aparte, en
apuntes_extra/imi-imagenes-2026-11-01*.json, porque la aplica el coordinador).

Resultado: solo dos preguntas de anatomia3 lo necesitaban (1640 y 1641, taller de
vascularización). El original (wuolah «4-Taller-Vascularizacion», capturas de un
Kahoot) solo conserva una miniatura ilegible de la imagen numerada, así que se
reconstruye en el enunciado lo mínimo para poder razonarlas (vista medial del
hemisferio y territorio por el que discurre la arteria numerada), coherente con la
clave marcada en el original. El enunciado anterior queda en "qAntes".

Uso:  python3 tools/imagenes_faltan_2026-11-01.py [plataforma_anatomia3.html]
Idempotente: si ya está aplicado no cambia nada.
"""
import json, os, re, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NOTA = ("\n\n📋 Datos reconstruidos: la imagen original no se conserva; "
        "los valores son coherentes con la respuesta.")

CAMBIOS = {
    "plataforma_anatomia3.html": {
        1640: {
            "q": ("En una imagen del taller (vista medial de un hemisferio cerebral con las arterias "
                  "numeradas), el nº 1 señala la arteria que recorre la cara medial del lóbulo frontal, "
                  "rodeando la rodilla del cuerpo calloso y siguiendo por encima de él hacia el lóbulo "
                  "parietal. ¿Qué arteria es?"),
            "exp_extra": ("La arteria que discurre por la cara medial del hemisferio, rodeando la rodilla "
                          "y el tronco del cuerpo calloso (ramas pericallosa y callosomarginal), es la "
                          "cerebral anterior; la cerebral posterior irriga la cara medial del lóbulo "
                          "occipital y la cerebelosa superior y la basilar quedan por debajo del cerebro."),
        },
        1641: {
            "q": ("En la misma imagen del taller (vista medial de un hemisferio cerebral con las arterias "
                  "numeradas), el nº 7 señala la arteria que irriga la cara medial del lóbulo occipital, "
                  "con ramas a lo largo de la cisura calcarina y hacia el esplenio del cuerpo calloso. "
                  "¿Qué arteria es?"),
            "exp_extra": ("La cara medial del lóbulo occipital y la corteza de la cisura calcarina "
                          "(arteria calcarina) dependen de la cerebral posterior; la cerebral anterior "
                          "se queda en la cara medial frontal y parietal, y la cerebelosa superior "
                          "irriga la cara superior del cerebelo."),
        },
    },
}


def aplicar(ruta, cambios):
    s = open(ruta, encoding="utf-8").read()
    m = re.search(r"const ALL_QUESTIONS = (\[.*?\]);\n", s, re.S)
    qs = json.loads(m.group(1))
    por_id = {q["id"]: q for q in qs}
    hechas = 0
    for i, c in cambios.items():
        q = por_id[i]
        if q["q"] == c["q"]:
            continue
        q.setdefault("qAntes", q["q"])
        q["q"] = c["q"]
        exp = q.get("exp", "")
        exp = exp.replace(" ⚠️ Falta el caso original de esta pregunta.", "")
        exp = exp.replace("⚠️ Falta el caso original de esta pregunta.", "").rstrip()
        if c["exp_extra"] not in exp:
            exp = (exp + " " + c["exp_extra"]).strip()
        if "Datos reconstruidos" not in exp:
            exp += NOTA
        q["exp"] = exp
        hechas += 1
    if hechas:
        s = s[:m.start()] + "const ALL_QUESTIONS = %s;\n" % json.dumps(qs, ensure_ascii=False) + s[m.end():]
        open(ruta, "w", encoding="utf-8").write(s)
    print("%s: %d preguntas reescritas" % (os.path.basename(ruta), hechas))


if __name__ == "__main__":
    pedidas = sys.argv[1:] or list(CAMBIOS)
    for p in pedidas:
        aplicar(os.path.join(RAIZ, os.path.basename(p)), CAMBIOS[os.path.basename(p)])
