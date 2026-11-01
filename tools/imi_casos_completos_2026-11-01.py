#!/usr/bin/env python3
"""IMI · preguntas que remitían a un caso que no está en su enunciado.

«En el caso anterior…», «con respecto a Waldemira…», «este paciente…» sin que
el caso aparezca: así no se pueden responder. Para cada una se ha buscado el
caso real (la pregunta anterior del mismo banco, otra versión del mismo caso en
otro banco, los apuntes o el texto original de la batería) y el enunciado pasa
a empezar por «📋 Caso: …» con los datos que hacen falta, seguido de la
pregunta reformulada para que se entienda sola. La clave, las opciones y el id
no cambian.

- El enunciado de antes se guarda en `qAntes` (si ya existía, no se pisa).
- Si la explicación tampoco se entendía sin el caso, se le añade la frase que
  faltaba (`exp_add`).
- Si el caso no aparece en ningún sitio, no se inventa: se añade al final de
  la explicación «⚠️ Falta el caso original de esta pregunta.».
- «muletilla»: preguntas que ya traían el caso dentro pero decían «del caso
  anterior»; solo se corrige esa expresión.

Los datos están en apuntes_extra/imi-casos-2026-11-01.json. Idempotente.

Uso:  python3 tools/imi_casos_completos_2026-11-01.py [plataforma_medint.html]
"""
import json, os, re, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATOS = os.path.join(RAIZ, "apuntes_extra", "imi-casos-2026-11-01.json")
FALTA = "⚠️ Falta el caso original de esta pregunta."


def main(ruta):
    s = open(ruta, encoding="utf-8").read()
    m = re.search(r"^const ALL_QUESTIONS = (\[.*?\]);$", s, re.M | re.S)
    qs = json.loads(m.group(1))
    por_id = {q["id"]: q for q in qs}
    cambios = json.load(open(DATOS, encoding="utf-8"))["cambios"]

    cuenta = {"arreglar": 0, "muletilla": 0, "falta": 0, "exp": 0}
    for c in cambios:
        acc = c["accion"]
        if acc == "descartar":
            continue
        q = por_id[c["id"]]
        antes = (q["options"], q["correct"])
        if acc in ("arreglar", "muletilla"):
            nuevo = c["q"].strip()
            assert nuevo and (acc == "muletilla" or nuevo.startswith("📋 Caso")), c["id"]
            if q["q"] != nuevo:
                q.setdefault("qAntes", q["q"])
                q["q"] = nuevo
                cuenta[acc] += 1
        extra = (c.get("exp_add") or "").strip()
        if acc == "falta":
            extra = FALTA
        if extra and extra not in q["exp"]:
            q["exp"] = q["exp"].rstrip() + "\n\n" + extra
            cuenta["falta" if acc == "falta" else "exp"] += 1
        assert (q["options"], q["correct"]) == antes, c["id"]

    nuevo_js = "const ALL_QUESTIONS = %s;" % json.dumps(qs, ensure_ascii=False)
    s = s[:m.start()] + nuevo_js + s[m.end():]
    open(ruta, "w", encoding="utf-8").write(s)
    print("enunciados con el caso: %d · muletillas corregidas: %d · explicaciones completadas: %d · "
          "avisos de caso que falta: %d" % (cuenta["arreglar"], cuenta["muletilla"], cuenta["exp"], cuenta["falta"]))


main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(RAIZ, "plataforma_medint.html"))
