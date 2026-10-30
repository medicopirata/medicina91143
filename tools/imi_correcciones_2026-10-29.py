#!/usr/bin/env python3
"""Correcciones de IMI del 29-10-2026 (doc rev 123 → 163, cuatro pestañas).

Se pasa DESPUÉS de cargar con tools/imi_cargar_nuevas.py los JSON del día
(imi-tema16-diapositivas-L15, imi-tema18, imi-lecciones19-23, imi-examenes-tema18).

1. Tema 16: el doc coteja ahora las diapositivas de la Lección 15 (16.9, «mandan»).
   97128: la FEVI tiene tres categorías en la diapositiva 13 (reducida < 40 %,
   intermedia 40-50 %, preservada ≥ 50 %), no «la intermedia está desapareciendo».
   97129: la diapositiva 65 da cuatro mecanismos de la DPN, no dos. Claves iguales.
2. Preguntas de exámenes del Tema 18, la Lección 19 y la Lección 23A que ya estaban
   en la plataforma: se anota en `caida` el examen de la recopilación «Preparación
   Medicina Interna» en que salieron. En 4530 (angor en la insuficiencia aórtica) el
   doc razona otra respuesta: nota 📒 sin tocar la clave.
3. Pestañas «Vol. 3» y «Vol. 4» (material de compañeros para temas aún no dados):
   las 141 preguntas ya están en la plataforma; donde el doc da otra respuesta se
   añade la nota 📒 al final de la explicación y la clave se mantiene.
4. Preguntas nuevas: `n` = número de la pregunta en su examen (bancos 📝 Preparación),
   `ns` = 1 si la explicación cita opciones por su letra (no se barajan) y `dudosa`
   en la de «trofismo cardíaco» de septiembre de 2025.

Idempotente. Uso: python3 tools/imi_correcciones_2026-10-29.py plataforma_medint.html
"""
import json, re, sys

EXTRA = "apuntes_extra/"
LETRA = re.compile(r"(?<![\wáéíóúñ])[a-e]\)|\b[Ll]as? [a-e](?=[\s,.;:])")


def nota(q, marca, texto, hechos):
    if marca in q["exp"]:
        return
    q["exp"] = q["exp"].rstrip() + "\n\n%s: %s La clave de este banco se mantiene." % (marca, texto)
    hechos.append("%d nota %s" % (q["id"], marca))


def main(ruta):
    s = open(ruta, encoding="utf-8").read()
    m = re.search(r"^const ALL_QUESTIONS = (\[.*?\]);$", s, re.M | re.S)
    qs = json.loads(m.group(1))
    Q = {q["id"]: q for q in qs}
    hechos = []

    # 1. Tema 16 según las diapositivas de la Lección 15
    q = Q[97128]
    viejo = ("La preservada es la que conserva una FE normal, y la categoría intermedia, según el profesor, la está quitando "
             "el Congreso Europeo de Cardiología. ⚠️ El Sisinio da otros cortes (≥ 50 % preservada, 40-49 % intermedia, < 40 % "
             "reducida); en el examen, la versión del profesor.")
    if viejo in q["exp"]:
        q["exp"] = q["exp"].replace(viejo, (
            "Las diapositivas de la Lección 15 (que mandan) clasifican la IC por la FEVI en tres categorías: reducida < 40 %, "
            "intermedia 40-50 % y preservada ≥ 50 % (diapositiva 13); con un 25 % es reducida. En clase comentó que el Congreso "
            "Europeo está revisando la intermedia, pero la diapositiva la mantiene: en el examen, las tres. El Sisinio da casi "
            "los mismos cortes (40-49 % intermedia)."))
        hechos.append("97128 explicación: tres categorías de FEVI (diapositiva 13)")
    q = Q[97129]
    añadido = "la diapositiva 65 de la Lección 15 da cuatro mecanismos"
    if añadido not in q["exp"]:
        q["exp"] = q["exp"].rstrip() + (
            " Para el examen, la diapositiva 65 de la Lección 15 da cuatro mecanismos: menor actividad del centro respiratorio "
            "durante el sueño, aumento del volumen sanguíneo y de la presión capilar pulmonar en decúbito, reabsorción de los "
            "edemas por la noche y una mecánica respiratoria más pobre.")
        hechos.append("97129 explicación: cuatro mecanismos de la DPN")

    # 2. Exámenes de la recopilación en los que salieron preguntas ya cargadas
    CAIDA = {
        5113: ["Preparación IMI · Parcial enero 2024", "Preparación IMI · Septiembre 2022"],  # T18 B1
        4865: ["Preparación IMI · 1er parcial 2022"],                                        # T18 B2
        5093: ["Preparación IMI · Septiembre 2025"],                                         # T18 B6
        4870: ["Preparación IMI · 1er parcial 2022"],                                        # T18 B7
        4882: ["Preparación IMI · 1er parcial 2022"],                                        # T18 B8
        4530: ["Preparación IMI · 1er parcial 2022", "Preparación IMI · Junio 2022"],         # T18 B9
        5041: ["Preparación IMI · Junio 2026", "Preparación IMI · Septiembre 2023"],          # T18 B10, L23B
        4922: ["Preparación IMI · Junio 2022"],                                              # T18 B14
        4545: ["Preparación IMI · Septiembre 2018"],                                         # T18 B19
        5122: ["Preparación IMI · Septiembre 2022"],                                         # L19 B2
        4572: ["Preparación IMI · Septiembre 2018"],                                         # L19 B4
        4585: ["Preparación IMI · Septiembre 2018"],                                         # L23A B2
        5003: ["Preparación IMI · Septiembre 2023"],                                         # L23A B3
    }
    for i, nombres in CAIDA.items():
        q = Q[i]
        for nombre in nombres:
            if nombre not in q.setdefault("caida", []):
                q["caida"].append(nombre)
                hechos.append("%d caida + %s" % (i, nombre))
    q = Q[4530]
    assert q["options"][q["correct"]] == "Sobrecarga de volumen del VI"
    nota(q, "📒 Tus apuntes (Tema 18)",
         "«Ninguna es cierta». Según la diapositiva 11 de la Lección 17 y el Sisinio, en la insuficiencia aórtica el angor se "
         "debe a que cae la presión diastólica aórtica y con ella la perfusión coronaria, y esa opción no aparece; las marcas "
         "del alumno discrepan entre los exámenes de junio de 2022.", hechos)

    # 3. Vol. 3 y Vol. 4: respuestas razonadas por los compañeros que no coinciden con la clave
    M = "📒 Tus apuntes (temas pendientes)"
    VOL = {
        2939: ("Miocardiopatía hipertrófica en ritmo sinusal",
               "«Miocardiopatía hipertrófica en ritmo sinusal», que es la clave que trae el recurso del cuestionario de "
               "valvulopatías: el inotrópico aumenta el gradiente obstructivo del tracto de salida del VI."),
        2930: ("Un 50% de los casos",
               "«Un 50 % de los casos»: solo la mitad de los enfermos con estenosis mitral reumática recuerda el episodio de "
               "fiebre reumática."),
        2934: ("1,5",
               "«1,5»: para operar se busca un INR inferior a 1,5."),
        490: ("Infecciosa.",
              "«Infecciosa»: la vírica (Coxsackie, echo) o la «idiopática», que es vírica no demostrada."),
        5047: ("Abarca todas o casi todas las derivaciones, excepto aVL",
               "«Abarca todas o casi todas las derivaciones»: la elevación es difusa, cóncava hacia arriba, con descenso del "
               "PR, y respeta aVR y V1 (el enunciado dice aVL, probablemente una errata); dura días y después la T se invierte."),
        1346: ("Todas son ciertas, por lo que no hay ninguna falsa",
               "«Todas son ciertas, por lo que no hay ninguna falsa», que es la clave del banco de preguntas de renal de los "
               "compañeros."),
    }
    for i, (opcion, texto) in VOL.items():
        q = Q[i]
        assert opcion in q["options"] and q["options"][q["correct"]] != opcion, i
        nota(q, M, texto, hechos)

    # 4. Campos de las preguntas nuevas
    nuevos = set()
    for f in ("imi-tema16-diapositivas-L15.json", "imi-tema18.json", "imi-lecciones19-23.json", "imi-examenes-tema18.json"):
        d = json.load(open(EXTRA + f, encoding="utf-8"))
        for b in d["bancos"]:
            for p in b["preguntas"]:
                nuevos.add((b["banco"], p["q"]))
        for banco, enun, n in d.get("numeros", []):
            for q in qs:
                if q["topic"] == banco and q["q"] == enun and q.get("n") != n:
                    q["n"] = n
                    # imi_cargar_nuevas no ve los «n» de texto del banco y numera desde 1:
                    # origQ sigue la numeración del banco
                    otros = [x.get("origQ") or 0 for x in qs if x["topic"] == banco and x is not q]
                    q["origQ"] = max(otros) + 1
                    hechos.append("%d n=%s origQ=%d" % (q["id"], n, q["origQ"]))
    for q in qs:
        if (q["topic"], q["q"]) in nuevos and q["id"] > 97437:
            if LETRA.search(q["exp"]) and not q.get("ns"):
                q["ns"] = 1
                hechos.append("%d ns" % q["id"])
            if q["topic"] == "📝 Preparación IMI · Septiembre 2025" and "trofismo" in q["q"] and not q.get("dudosa"):
                q["dudosa"] = 1
                hechos.append("%d dudosa" % q["id"])

    s = s[:m.start(1)] + json.dumps(qs, ensure_ascii=False) + s[m.end(1):]
    open(ruta, "w", encoding="utf-8").write(s)
    print("\n".join(hechos) or "nada que cambiar")


if __name__ == "__main__":
    main(*sys.argv[1:])
