#!/usr/bin/env python3
"""Correcciones de IMI del 24-10-2026 sobre preguntas ya cargadas (rev 102 del doc).

1. Claves del campus que el doc da como «Respuesta correcta» de los cuestionarios
   de este curso y que la versión de cursos anteriores (💻 Tests online · 1er
   parcial) tenía de otra forma: reflejo cremastérico (3056), uretritis (3057) y
   la úlcera indolora de bordes indurados (3059, cuyas opciones no traían el
   chancro sifilítico).
2. Preguntas de examen ya cargadas a las que la Parte D del doc da otra respuesta
   razonada: la clave del examen se respeta (regla de IMI: ante la duda manda la
   clave del test) y se añade al final de la explicación lo que dicen los apuntes.
   La lista sale del informe de cargar_examenes_wuolah.py (misma_clave False).

Idempotente: cada cambio comprueba el estado anterior o la marca 📒.

Uso: python3 tools/imi_correcciones_2026-10-24.py plataforma_medint.html [informe.json parteD_carga.json]
"""
import json, re, sys, unicodedata

MARCA = "📒 Tus apuntes (Parte D)"


def nn(t):
    t = unicodedata.normalize("NFKD", (t or "").lower())
    t = "".join(c for c in t if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", " ", t).strip()


def main(ruta, informe=None, carga=None):
    s = open(ruta, encoding="utf-8").read()
    m = re.search(r"^const ALL_QUESTIONS = (\[.*?\]);$", s, re.M | re.S)
    qs = json.loads(m.group(1))
    Q = {q["id"]: q for q in qs}
    hechos = []

    q = Q[3056]
    if q["correct"] == 4:
        assert q["options"][1].startswith("Se obtiene golpeando")
        q["correct"] = 1
        q["exp"] = ("El cuestionario del campus da por buena la de la cara interna del muslo: se estimula la piel cerca de su raíz y la "
                    "respuesta NORMAL es la contracción del cremáster con elevación del testículo del mismo lado (arco L1-L2). ⚠️ En "
                    "rigor se provoca rozando o rascando la piel, no golpeando, y por eso antes se marcaba «ninguna»; pero la clave "
                    "del campus de este curso (tus apuntes, 23 oct) es esta.")
        hechos.append("3056 clave 4→1")
    q = Q[3057]
    if q["correct"] == 1:
        assert q["options"][3] == "Una infección gonocócica"
        q["correct"] = 3
        q["exp"] = ("La secreción purulenta, espesa y cremosa que aflora al exprimir la uretra es la típica del gonococo; la uretritis "
                    "no gonocócica (Chlamydia) da una secreción más escasa y clara. «Una ETS» es cierta pero menos específica, y el "
                    "cuestionario del campus de este curso da por buena la infección gonocócica (tus apuntes, 23 oct).")
        hechos.append("3057 clave 1→3")
    q = Q[3059]
    if "Chancro sifilítico" not in q["options"]:
        assert q["options"][4] == "Varicocele" and q["correct"] == 2
        q["options"][4] = "Chancro sifilítico"
        q["correct"] = 4
        q["exp"] = ("La úlcera única, indolora, crateriforme y de bordes indurados es el chancro de la sífilis primaria. Los condilomas "
                    "acuminados (VPH) son lesiones verrugosas en coliflor y el herpes da vesículas dolorosas. La versión anterior no "
                    "traía el chancro entre las opciones; el cuestionario de este curso sí (tus apuntes, 23 oct).")
        hechos.append("3059 opción e Varicocele→Chancro sifilítico, clave 2→4")

    if informe and carga:
        inf = json.load(open(informe, encoding="utf-8"))
        C = {nn(p["q"])[:90]: p for p in json.load(open(carga, encoding="utf-8"))}
        for x in inf["ya_estaban"]:
            if x["misma_clave"]:
                continue
            p = C.get(nn(x["q"])[:90]) or next((v for k, v in C.items() if k.startswith(nn(x["q"])[:60])), None)
            if not p:
                continue
            q = Q[x["id"]]
            if MARCA in q["exp"]:
                continue
            resp = p["options"][p["correct"]]
            # si la respuesta de los apuntes es la misma opción que la clave, no hay discrepancia real
            if nn(resp) == nn(q["options"][q["correct"]]):
                continue
            razon = p["exp"].split("\n\n✏️")[0].strip()
            q["exp"] = q["exp"].rstrip() + "\n\n%s: «%s». %s La clave de este banco se mantiene." % (MARCA, resp.rstrip("."), razon)
            hechos.append("%d nota Parte D" % q["id"])

    # 3. Parte D: copias que cargar_examenes_wuolah.py no reconoció como ya cargadas
    #    (los «5.º», «2.º» de las opciones cuentan como números distintos). Se quitan
    #    las copias recién añadidas —ningún id publicado— y el examen queda en `caida`
    #    de la original; si los apuntes razonan otra respuesta, también la nota.
    COPIAS = {97231: 4848, 97240: 4864, 97241: 4896, 97245: 4567, 97246: 4893, 97251: 4893,
              97254: 4900, 97262: 4888, 97263: 4552, 97268: 4842, 97269: 4849, 97272: 4505,
              97279: 4840, 97280: 4872, 97237: 4962, 97278: 5125}
    fuera = set()
    for nueva, orig in COPIAS.items():
        if nueva not in Q:
            continue
        p, q = Q[nueva], Q[orig]
        nombre = re.sub(r"^\W+", "", p["topic"]).strip()
        if nombre not in q.setdefault("caida", []):
            q["caida"].append(nombre)
        resp = p["options"][p["correct"]]
        if nn(resp) != nn(q["options"][q["correct"]]) and MARCA not in q["exp"]:
            razon = p["exp"].split("\n\n✏️")[0].strip()
            q["exp"] = q["exp"].rstrip() + "\n\n%s: «%s». %s La clave de este banco se mantiene." % (MARCA, resp.rstrip("."), razon)
        fuera.add(nueva)
        hechos.append("%d copia de %d: fuera" % (nueva, orig))
    qs = [q for q in qs if q["id"] not in fuera]

    s = s[:m.start(1)] + json.dumps(qs, ensure_ascii=False) + s[m.end(1):]
    mc = re.search(r"^const TOPIC_COUNTS = (\{.*?\});$", s, re.M | re.S)
    tc = json.loads(mc.group(1))
    cuenta = {}
    for q in qs:
        cuenta[q["topic"]] = cuenta.get(q["topic"], 0) + 1
    tc = {k: cuenta[k] for k in tc if k in cuenta}
    for k in cuenta:
        tc.setdefault(k, cuenta[k])
    s = s[:mc.start(1)] + json.dumps(tc, ensure_ascii=False) + s[mc.end(1):]
    open(ruta, "w", encoding="utf-8").write(s)
    print("\n".join(hechos) or "nada que cambiar")


if __name__ == "__main__":
    main(*sys.argv[1:])
