#!/usr/bin/env python3
"""Arreglos del repaso del 28-09-2026 sobre las 13.695 preguntas de segundo.

Se guarda por dejar constancia de qué se cambió y por qué; ya está aplicado.
`tools/repasar.py` es lo que se vuelve a pasar cada vez.

La regla al decidir: si la pregunta viene de un examen real de la facultad, la
clave se respeta aunque sea discutible —es lo que van a corregir— y se avisa en
la explicación; si viene de un banco de tema, no hay clave oficial que respetar
y el error se arregla.
"""

import json, re, sys

CORREGIR = {
    # (archivo, id): (texto de la opción que pasa a ser la correcta, por qué)
    ("plataforma_anatomia3.html", 1315): (
        "Los orificios de Luschka drenan directamente a la cisterna magna o cerebromedular",
        "Los agujeros de Luschka son los laterales y drenan a la cisterna pontocerebelosa; "
        "el que va a la cisterna magna es el de Magendie, el medio. Por eso esa afirmación "
        "es la falsa y no vale «todas son ciertas». La misma pregunta, en el examen de "
        "Febrero 2018, está corregida así."),
    ("plataforma_genetica.html", 617): (
        "Tiene un tratamiento eficaz",
        "La fenilalanina es un aminoácido esencial: la dieta la restringe, no la elimina del "
        "todo. Lo cierto es que la fenilcetonuria sí tiene tratamiento eficaz si se detecta "
        "en el cribado neonatal. La misma pregunta, en la batería, está corregida así."),
    ("plataforma_genetica.html", 343): (
        "El padre puede portar una translocación equilibrada",
        "En el Down por translocación transmitida el riesgo no depende de la edad materna "
        "—eso es la trisomía 21 libre por no disyunción—, sino de que un progenitor porte "
        "una translocación robertsoniana equilibrada. La misma pregunta, dos números antes, "
        "está corregida así."),
}

QUITAR_OPCION = {
    # (archivo, id): texto exacto de la opción repetida que sobra
    ("plataforma_medint.html", 6728): "Excesiva actividad de la acetilcolinesterasa",
    ("plataforma_medint.html", 5973): "Es la disnea que aparece en el decúbito supino",
}

AVISO = "⚠️ Ojo: esta misma pregunta aparece en «%s» con otra respuesta (%s). %s"
DISCUTIBLES = [
    # (archivo, [ids], por qué discrepan)
    ("plataforma_histologia2.1.html", [138, 477],
     "Las fúndicas son tubulares rectas o poco enrolladas; las pilóricas y cardiales sí son "
     "enrolladas. Según se entienda «glándulas gástricas» cabe marcar solo las células "
     "mucosas o también lo tubular enrollado."),
    ("plataforma_histologia2.1.html", [386, 1066],
     "A la rete testis llegan los tubos rectos y de ella salen los conductillos eferentes: "
     "«se continúa con» vale para los dos y el enunciado no dice en qué sentido."),
    ("plataforma_histologia2.1.html", [400, 832, 1080],
     "Las células de Leydig están en el intersticio, fuera del tubo seminífero, así que "
     "hablando en rigor de «tubos seminíferos» solo persisten las Sertoli; hablando del "
     "testículo senil en conjunto, también las de Leydig."),
    ("plataforma_histologia2.1.html", [487, 1471],
     "En el colon las caliciformes aumentan mucho respecto al delgado, pero la mayoría de "
     "los textos siguen dando los colonocitos como más numerosos. Depende del libro."),
    ("plataforma_fisio1.html", [319, 279],
     "Las dos dicen lo mismo con otras palabras: la mitral se cierra al empezar la sístole "
     "ventricular, que es justo cuando la presión del ventrículo supera a la de la aurícula. "
     "La pregunta original admitía las dos."),
    ("plataforma_anatomia3.html", [1086, 1340],
     "Las dos afirmaciones son ciertas: el área posterolateral del hipotálamo controla el "
     "simpático y el bulbo tiene las neuronas simpático-excitadoras. La pregunta, tal como "
     "está, no tiene una única respuesta."),
]


def cargar(f):
    s = open(f, encoding="utf-8").read()
    m = re.search(r"^const ALL_QUESTIONS = (.*?);$", s, re.M | re.S)
    return s, json.loads(m.group(1)), m.span(1)


def guardar(f, s, qs, span):
    nuevo = s[:span[0]] + json.dumps(qs, ensure_ascii=False, separators=(",", ":")) + s[span[1]:]
    open(f, "w", encoding="utf-8").write(nuevo)


def main_discrepancias():
    porarchivo = {}
    for f in {k[0] for k in CORREGIR} | {k[0] for k in QUITAR_OPCION} | {x[0] for x in DISCUTIBLES}:
        porarchivo[f] = cargar(f)

    for (f, qid), (opcion, motivo) in CORREGIR.items():
        s, qs, span = porarchivo[f]
        q = next(x for x in qs if x["id"] == qid)
        i = next(k for k, o in enumerate(q["options"]) if o.strip().rstrip(".") == opcion.rstrip("."))
        antes = q["options"][q["correct"]]
        q["correct"] = i
        q["exp"] = ((q.get("exp") or "").strip().rstrip(".") + ". " if q.get("exp") else "") \
            + "✅ Corregida: antes daba por buena «%s». %s" % (antes.rstrip("."), motivo)
        print("  %s id %s: %s -> %s" % (f[11:-5], qid, antes[:40], opcion[:40]))

    for (f, qid), opcion in QUITAR_OPCION.items():
        s, qs, span = porarchivo[f]
        q = next(x for x in qs if x["id"] == qid)
        pos = [k for k, o in enumerate(q["options"]) if o.strip().rstrip(".") == opcion.rstrip(".")]
        if len(pos) < 2:
            print("  %s id %s: ya no está repetida" % (f[11:-5], qid)); continue
        fuera = pos[-1]
        correcta = q["options"][q["correct"]]
        del q["options"][fuera]
        q["correct"] = q["options"].index(correcta)
        print("  %s id %s: quitada la opción repetida «%s»" % (f[11:-5], qid, opcion[:45]))

    for f, ids, motivo in DISCUTIBLES:
        s, qs, span = porarchivo[f]
        grupo = [x for x in qs if x["id"] in ids]
        for q in grupo:
            otros = [o for o in grupo if o["id"] != q["id"]]
            texto = AVISO % (
                "» y «".join(o["topicBase"] for o in otros),
                " / ".join(o["options"][o["correct"]].strip().rstrip(".") for o in otros),
                motivo)
            viejo = (q.get("exp") or "").strip()
            if "⚠️ Ojo:" in viejo:
                continue
            q["exp"] = (viejo.rstrip(".") + ". " if viejo else "") + texto
        print("  %s ids %s: aviso de discrepancia" % (f[11:-5], ids))

    for f, (s, qs, span) in porarchivo.items():
        guardar(f, s, qs, span)




# --- segunda tanda ---

import json, re

CAMBIOS = {
    ("plataforma_genetica.html", 676): (
        "Hay que dar analgésicos",
        "En la anemia falciforme la HbS polimeriza al desoxigenarse y deforma el hematíe en "
        "hoz o media luna, no en anillo. Los analgésicos son el pilar del tratamiento de las "
        "crisis vasooclusivas."),
    ("plataforma_genetica.html", 264): (
        "Cromosoma 16",
        "La trisomía 16 es la anomalía cromosómica más frecuente en los abortos espontáneos "
        "del primer trimestre, y es siempre letal en el embrión: por eso no se ve en recién "
        "nacidos. La 21 es la más frecuente entre los que llegan a nacer, que no es lo mismo."),
    ("plataforma_genetica.html", 329): (
        "45 cromosomas",
        "El portador sano de una translocación robertsoniana equilibrada tiene dos "
        "acrocéntricos fusionados en uno, así que cuenta 45. Los 46 solo aparecen cuando la "
        "translocación del hijo ha surgido de novo."),
    ("plataforma_genetica.html", 124): (
        "Se determina por el porcentaje de homocigotos que desarrollan el fenotipo",
        "La penetrancia mide qué proporción de los que tienen el genotipo de riesgo expresa "
        "la enfermedad. En una recesiva ese genotipo es el homocigoto (o heterocigoto "
        "compuesto); el portador obligado es heterocigoto y por definición no la desarrolla."),
    ("plataforma_genetica.html", 443): (
        "Por muestra de tejido trofoblástico",
        "La biopsia de vellosidades coriales se puede hacer desde las semanas 10-12 y da un "
        "diagnóstico citogenético de verdad. La ecografía solo ve marcadores indirectos "
        "(translucencia nucal, malformaciones), nunca un cariotipo."),
}


def limpiar(exp):
    """Quita de la explicación el aviso de la auditoría vieja, que decía que la
    clave se mantenía: ahora ya está corregida y se contradiría."""
    exp = re.sub(r"⚠️\s*Se (?:mantiene|respeta) la clave[^.]*\.\s*", "", exp)
    exp = re.sub(r"⚠️\s*", "", exp, count=1)
    exp = re.sub(r"La respuesta (?:correcta|esperable|médicamente correcta) ser[ií]a[^.]*\.\s*", "", exp)
    return re.sub(r"\s{2,}", " ", exp).strip()


def main_claves_viejas():
    porarchivo = {}
    for f in {k[0] for k in CAMBIOS}:
        s = open(f, encoding="utf-8").read()
        m = re.search(r"^const ALL_QUESTIONS = (.*?);$", s, re.M | re.S)
        porarchivo[f] = (s, json.loads(m.group(1)), m.span(1))

    for (f, qid), (opcion, motivo) in CAMBIOS.items():
        s, qs, span = porarchivo[f]
        q = next(x for x in qs if x["id"] == qid)
        cand = [k for k, o in enumerate(q["options"])
                if o.strip().rstrip(".").lower() == opcion.rstrip(".").lower()]
        if not cand:
            print("  %s id %s: NO encuentro la opción %r" % (f[11:-5], qid, opcion))
            print("      opciones:", [o[:60] for o in q["options"]])
            continue
        antes = q["options"][q["correct"]]
        q["correct"] = cand[0]
        q["exp"] = "✅ Corregida: la clave del banco daba «%s». %s" % (antes.rstrip("."), motivo)
        print("  %s id %s: %s -> %s" % (f[11:-5], qid, antes[:45], opcion[:45]))

    for f, (s, qs, span) in porarchivo.items():
        open(f, "w", encoding="utf-8").write(
            s[:span[0]] + json.dumps(qs, ensure_ascii=False, separators=(",", ":")) + s[span[1]:])


if __name__ == "__main__":
    main_discrepancias()
    main_claves_viejas()
