#!/usr/bin/env python3
"""Marca en plataforma_fisio1.html qué preguntas del Guyton (bancos «📕 Guyton …») son casos
clínicos: les pone `cc: 1` (el enunciado presenta un paciente o una situación con datos de una
persona concreta) y se lo quita a las de teoría. entrenador.js lo usa para que el alumno pueda
dejar fuera la teoría del Guyton, los casos clínicos, o los dos grupos. Idempotente: vuelve a
ejecutarse cada vez que se cargan bancos nuevos del Guyton.

Uso: python3 tools/fisio1_guyton_casos.py [plataforma_fisio1.html]
"""
import json, re, sys, collections

CASO = re.compile(
    r"(\bpacientes?\b|\bdel caso\b"
    r"|\b(varón|varon|mujer|hombre|niñ[oa]|lactante|ancian[oa]|adolescente|recién nacido|persona|individuo|sujeto|estudiante|deportista|corredor|montañero|buceador|alpinista|piloto)\b.{0,50}\b(de \d+|años|que|con|tiene|presenta|acude|sufre|es|se|no)\b"
    r"|\bacude\b|\bingresa\b|\burgencias\b|\bUCI\b|\bse (le )?(administra|inyecta|transfunde|extrae|somete|aplica)\b|\bsuponga que\b"
    r"|\btras (un|una) (accidente|hemorragia|cirugía|intervención|transfusión|ingesta|comida)\b|\bdiagn[oó]stico (más )?probable\b|\banalítica\b|\bgasometría\b)",
    re.I)
# Enunciados que el patrón clasifica mal: True = caso clínico, False = teoría
MANUAL = {
    r"^Diagramas de Darrow-Yannet": False,
    r"^Se realiza un experimento en dos personas": False,
    r"^Un hombre bajo los efectos de la anestesia": True,
    r"^Un recién nacido no evacua el meconio": True,
}


def es_caso(q):
    for pat, v in MANUAL.items():
        if re.search(pat, q["q"]):
            return v
    return bool(CASO.search(q["q"]))


def main(ruta):
    s = open(ruta, encoding="utf-8").read()
    m = re.search(r"const ALL_QUESTIONS = (\[.*?\]);\n", s, re.S)
    qs = json.loads(m.group(1))
    c = collections.Counter()
    for q in qs:
        if not q["topicBase"].startswith("📕 Guyton"):
            continue
        if es_caso(q):
            q["cc"] = 1; c["casos"] += 1
        else:
            q.pop("cc", None); c["teoria"] += 1
    s = s[:m.start()] + "const ALL_QUESTIONS = %s;\n" % json.dumps(qs, ensure_ascii=False) + s[m.end():]
    open(ruta, "w", encoding="utf-8").write(s)
    print("Guyton: %d casos clínicos · %d de teoría" % (c["casos"], c["teoria"]))


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "plataforma_fisio1.html")
