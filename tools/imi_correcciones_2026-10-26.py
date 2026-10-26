#!/usr/bin/env python3
"""Correcciones de IMI del 26-10-2026 sobre preguntas ya cargadas (doc rev 102 → 123).

1. 90325 (Apuntes: Tema 11): la explicación decía que las hemorroides internas
   «se palpan mal». El doc (11.5, rev 109) recoge ahora la versión del profesor:
   se pueden tocar en el tacto rectal; los libros dicen que se palpan mal salvo
   trombosadas, y en el examen se contesta con la del profesor.
2. 4590 (📝 2018 · Septiembre, EPOC y alteraciones digestivas): el Tema 17 del doc
   (apartado E) la da como caída en septiembre de 2018; se anota en `caida`, como
   ya tenía 4587 del mismo examen. La clave coincide.

Idempotente. Uso: python3 tools/imi_correcciones_2026-10-26.py plataforma_medint.html
"""
import json, re, sys


def main(ruta):
    s = open(ruta, encoding="utf-8").read()
    m = re.search(r"^const ALL_QUESTIONS = (\[.*?\]);$", s, re.M | re.S)
    qs = json.loads(m.group(1))
    Q = {q["id"]: q for q in qs}
    hechos = []

    q = Q[90325]
    viejo = "Las hemorroides internas son blandas y se palpan mal."
    if viejo in q["exp"]:
        q["exp"] = q["exp"].replace(viejo, (
            "Las hemorroides internas, según el profesor, se pueden tocar en el tacto rectal; "
            "⚠️ los libros dicen que se palpan mal porque son blandas, salvo que estén trombosadas, "
            "y en el examen se contesta con la versión del profesor."))
        hechos.append("90325 explicación: hemorroides internas según el profesor")

    q = Q[4590]
    assert q["topic"] == "📝 2018 · Septiembre" and "ulcus" in q["options"][q["correct"]]
    nombre = "Preparación IMI · Septiembre 2018"
    if nombre not in q.setdefault("caida", []):
        q["caida"].append(nombre)
        hechos.append("4590 caida + %s" % nombre)

    # 3. «Asma crónica»: la pregunta proyectada en clase el 26/10 (Tema 17, 97290)
    #    se dio por buena con la b (origen en la infancia, con ⚠️ por el audio); las
    #    recopilaciones de cursos anteriores (5522, 668) tienen la c (fibrosis). Regla
    #    de IMI: se mantiene la clave de cada banco y se cruzan las notas.
    MARCA = "📒 Tus apuntes (Tema 17)"
    for i in (5522, 668):
        q = Q[i]
        assert "lesiones fibróticas" in q["options"][q["correct"]]
        if MARCA not in q["exp"]:
            q["exp"] = q["exp"].rstrip() + (
                "\n\n%s: esta pregunta se proyectó en clase el 26/10 y se dio por buena «Es típico su origen "
                "en la infancia» (el asma suele debutar en la infancia y «el asmático es asmático» toda la vida); "
                "⚠️ el audio es confuso y el profesor quitará la pregunta del PDF. La clave de este banco se mantiene." % MARCA)
            hechos.append("%d nota Tema 17" % i)
    q = Q[97290]
    nota = "En las recopilaciones de cursos anteriores (ids 5522 y 668) la clave es la c), las lesiones fibróticas."
    if nota not in q["exp"]:
        q["exp"] = q["exp"].rstrip() + " " + nota
        hechos.append("97290 nota recopilaciones")

    s = s[:m.start(1)] + json.dumps(qs, ensure_ascii=False) + s[m.end(1):]
    open(ruta, "w", encoding="utf-8").write(s)
    print("\n".join(hechos) or "nada que cambiar")


if __name__ == "__main__":
    main(*sys.argv[1:])
