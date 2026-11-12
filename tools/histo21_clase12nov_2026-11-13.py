#!/usr/bin/env python3
"""Histología Esp. I: clase del 12/11 (repaso del ovario, la trompa y el ciclo;
vulva y mama). Doc «Histología 1» en rev 156 (13-11-2026).

1. Carga los dos bancos de `apuntes_extra/histo-bloque8-1211.json` AL FINAL de
   la plataforma, con ids tras el máximo, sin mover nada
   (tools/histo_cargar_bancos_al_final.py; no llama a indice_temas.py):
     · «Apuntes: Bloque 8 — Repaso, vulva y mama (12/11)»: A (dichas por la
       profesora), B (con sus pistas), C (refuerzo) y D (P280–P291, con imagen).
     · «Apuntes: Repaso oral del 12/11 (vulva y mama)»: R71–R73.
2. Marca «cae» las cuatro del cuerpo lúteo («habrá preguntas así, para separar
   el aprobado de la matrícula»): apuntes_extra/histo21-cae-2026-11-13.json.
3. Sala de estudio:
     · tema 24 (Bloque 8 IV, vulva y mama), escrito a mano: aquí se le rellena
       la batería (preguntas de examen y bancos que tratan de vulva y mama + las
       B, C, D y R del 12/11).
     · temas 22 y 23: recuadro «🎯 Así lo preguntan» del repaso del 12/11 en el
       apartado que toca y las A del repaso en su batería. Los recuadros llevan
       `"repaso": "2026-11-12"`: al volver a ejecutarlo se quitan y se ponen.
4. Después: python3 tools/estudio_validar.py histo21

Idempotente. Uso:  python3 tools/histo21_clase12nov_2026-11-13.py
"""
import json, os, re, subprocess, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HTML = os.path.join(RAIZ, "plataforma_histologia2.1.html")
EXTRA = os.path.join(RAIZ, "apuntes_extra", "histo-bloque8-1211.json")
CAE = os.path.join(RAIZ, "apuntes_extra", "histo21-cae-2026-11-13.json")
SALA = os.path.join(RAIZ, "estudio", "histo21")
MARCA = "2026-11-12"
BANCO = "Apuntes: Bloque 8 — Repaso, vulva y mama (12/11)"
BANCO_R = "Apuntes: Repaso oral del 12/11 (vulva y mama)"

# Preguntas ya existentes de vulva y mama (exámenes y bancos primero),
# confirmadas a mano entre las que nombran mama, areola, pezón, galactóforo,
# Montgomery, vulva, labios, Bartholin, clítoris…
EXISTENTES_24 = [
    6333,                                   # 📝 Examen 2020
    1119, 1125, 1089,                       # Banco Parcial 2
    326, 327, 339, 527, 528, 841,           # bancos de otros cursos
    1212, 1213, 1222,                       # práctica Femenino II
    3016, 3019, 3020, 3021, 3031, 3032, 3036, 3038, 3039, 3040, 3041, 3042,
    3043, 3044, 3045, 3046, 3047, 3050,     # imágenes práctica 11
    5992, 5994, 5995, 5996, 5998, 5999, 6000, 6001, 6002, 6003, 6004, 6005,
    6007, 6008, 6009, 6011, 6013, 6015, 6016, 6017, 6018, 6019, 6020, 6021,
    6113, 6115, 6116, 6117, 6118, 6120,     # Atlas · útero, vagina, vulva y mama
    6130, 6133, 6145, 6150, 6155, 6156,     # cuestionarios de prácticas
    91491, 91540,                           # «confundís la próstata con la mama» (3/11)
]

# n.º de pregunta (1 = primera) del banco del 12/11 → (tema, apartado)
A_DESTINO = {1: (22, "s5"), 2: (22, "s5"), 3: (22, "s5"), 4: (22, "s5"),
             5: (22, "s5"), 6: (22, "s5"), 7: (22, "s1"), 8: (22, "s6"),
             9: (22, "s6"), 10: (23, "s4"), 11: (23, "s4"), 12: (23, "s4"),
             13: (23, "s5"), 14: (23, "s5")}

ASI = {
    (22, "s1"): "- Repaso del 12/11, en voz alta y con la imagen: **«estrella verde = teca interna»**, y **«¿qué células tienen receptores para la LH?»** → las de la **teca interna**.\n- En la misma imagen del folículo: **círculo = cuerpo de Call-Exner**, **estrella verde = granulosa**, **estrella roja = citoplasma del ovocito primario**.",
    (22, "s5"): "- Repaso del 12/11: **«Habrá preguntas más así, porque habrá que diferenciar entre un aprobado, un notable y una matrícula»**, por ejemplo **qué produce cada célula del cuerpo lúteo**.\n- **«¿Qué producen las células de la granulosa luteinizadas?»** → **progesterona**, y **transforman en estrógenos los andrógenos de la teca**. Una alumna dijo «andrógenos» y lo corrigió: los andrógenos son de la **teca**.\n- **«¿Qué porcentaje del cuerpo lúteo son las de la teca luteinizadas?»** → el **20 %**.\n- **«¿Encontrarías un cuerpo albicans en una niña de 8 años?»** → **no**, aún no ha ovulado; en una **posmenopáusica sí pueden quedar**, aunque pocos.",
    (22, "s6"): "- Repaso del 12/11: **«¿Cómo se llaman las células secretoras del epitelio de la trompa?»** → **intercalares o en clavo**, de citoplasma **basófilo**.",
    (23, "s4"): "- Repaso del 12/11, con las imágenes del ciclo: **rectas** con pseudoestratificación y mitosis → **proliferativo**; **sinuosas con vacuolas subnucleares** → **secretor inicial**; **aserradas con secreción en la luz** → **secretor establecido o tardío**.",
    (23, "s5"): "- Repaso del 12/11: **«parece secretor pero con hemorragia»** → **premenstrual**; **«queso gruyer»** → **atrófico-quístico**. Endocérvix, exocérvix y vagina los repasó igual que el 10/11.",
}

CITA_CAE = "«Habrá preguntas más así, porque habrá que diferenciar entre un aprobado, un notable y una matrícula»: qué produce cada célula del cuerpo lúteo"
RUTA_CAE = "Histología 1 › Bloque 8 · Aparato reproductor femenino › 14. Repaso en clase del 12/11"


def preguntas():
    s = open(HTML, encoding="utf-8").read()
    m = re.search(r"^const ALL_QUESTIONS = (.*?);$", s, re.M | re.S)
    return json.loads(m.group(1))


def tema(n):
    ruta = os.path.join(SALA, "tema-%02d.json" % n)
    return ruta, json.load(open(ruta, encoding="utf-8"))


def guardar(ruta, t):
    with open(ruta, "w", encoding="utf-8") as f:
        json.dump(t, f, ensure_ascii=False, indent=1)


def main():
    subprocess.run([sys.executable, os.path.join(RAIZ, "tools", "histo_cargar_bancos_al_final.py"), HTML, EXTRA], check=True)
    qs = preguntas()
    banco = sorted((q for q in qs if q["topicBase"] == BANCO), key=lambda q: q["n"])
    banco_r = sorted((q for q in qs if q["topicBase"] == BANCO_R), key=lambda q: q["n"])
    if len(banco) != 49 or len(banco_r) != 7:
        sys.exit("bancos con tamaño inesperado: %d / %d" % (len(banco), len(banco_r)))

    # 2 · marcas «cae» (el cargador rehace las preguntas y les quita la marca)
    cae = [{"id": q["id"], "pista": "Qué produce cada célula del cuerpo lúteo y en qué proporción",
            "cita": CITA_CAE, "ruta": RUTA_CAE, "f": 2} for q in banco[:4]]
    json.dump(cae, open(CAE, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    subprocess.run([sys.executable, os.path.join(RAIZ, "tools", "marcar_cae.py"), HTML, CAE], check=True)

    # 3a · temas 22 y 23: recuadros y batería
    por_tema = {}
    for n, (t, _) in A_DESTINO.items():
        por_tema.setdefault(t, []).append(banco[n - 1]["id"])
    for t in (22, 23):
        ruta, d = tema(t)
        for s in d["secciones"]:
            s["bloques"] = [b for b in s["bloques"] if b.get("repaso") != MARCA]
            md = ASI.get((t, s["id"]))
            if md:
                # detrás del último «asi» del apartado (o al final si no hay)
                pos = max([i for i, b in enumerate(s["bloques"]) if b["tipo"] == "asi"] or [len(s["bloques"]) - 1]) + 1
                s["bloques"].insert(pos, {"tipo": "asi", "md": md, "repaso": MARCA})
        for i in por_tema[t]:
            if i not in d["bateria"]:
                d["bateria"].append(i)
        guardar(ruta, d)
        print("  tema %d: %d en la batería" % (t, len(d["bateria"])))

    # 3b · tema 24: batería
    ruta, d = tema(24)
    existen = {q["id"] for q in qs}
    faltan = [i for i in EXISTENTES_24 if i not in existen]
    if faltan:
        sys.exit("ids que ya no existen: %s" % faltan)
    nuevos = [q["id"] for q in banco[14:]] + [q["id"] for q in banco_r]
    d["bateria"] = list(dict.fromkeys(EXISTENTES_24 + nuevos))
    guardar(ruta, d)
    print("  tema 24: %d en la batería" % len(d["bateria"]))


if __name__ == "__main__":
    main()
