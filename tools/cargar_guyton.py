#!/usr/bin/env python3
"""Carga los bancos del Repaso del Guyton en la plataforma de Fisiología.

Los bancos van AL FINAL de `ALL_QUESTIONS`, con ids propios a partir de
ID_BASE, para que ninguna pregunta ya existente cambie de id: el progreso
guardado y la repetición espaciada van por `q.id`.

ID_BASE es 95000 y no 90000 a propósito: `add_apuntes.py` reparte los ids de
los bancos «Apuntes:» desde 90000 hacia arriba según el orden del JSON, así
que si el Guyton empezara ahí, una recarga de apuntes acabaría pisándolo.

Es idempotente: antes de cargar quita los bancos «📕 Guyton» que ya hubiera,
de modo que volver a ejecutarlo sustituye en lugar de duplicar.

La explicación se arma con el razonamiento del propio Repaso, que en este doc
viene completo (mediana de 244 caracteres y dice por qué, no solo qué), y se
le añade al final la página del Guyton y el número del Repaso para poder ir al
libro. Las que se quedan cortas se amplían a mano en AMPLIADAS.

Uso:  python3 tools/cargar_guyton.py <plataforma.html> <guyton.json>
"""
import json, re, sys, collections

ID_BASE = 95000
PREFIJO = "\U0001F4D5 Guyton"       # 📕

# Razonamientos del doc que se quedan en una línea y no explican por sí solos.
AMPLIADAS = {
 "G12.3": ("El volumen residual no se mide directamente con la espirometría, se despeja: "
           "es lo que queda de la capacidad residual funcional al descontarle el volumen de "
           "reserva espiratoria, porque la CRF es justamente lo que hay en el pulmón al final "
           "de una espiración normal, y de ahí todavía se puede expulsar el VRE. Así que "
           "VR = CRF − VRE = 3 − 1,5 = 1,5 l. Los demás datos del enunciado (espacio muerto, "
           "volumen corriente) sobran para esta pregunta: están para las otras del caso."),
}


def explicacion(p):
    base = AMPLIADAS.get(p["ref"]) or p["porque"]
    refs = [x for x in (p.get("libro"), p.get("repaso")) if x]
    if refs:
        return "%s (%s)" % (base.rstrip(), " · ".join(refs))
    return base


def main(ruta_html, ruta_json):
    s = open(ruta_html, encoding="utf-8").read()
    m = re.search(r"const ALL_QUESTIONS = (\[.*?\]);\n", s, re.S)
    qs = json.loads(m.group(1))

    antes = len(qs)
    qs = [q for q in qs if not q["topic"].startswith(PREFIJO)]
    quitadas = antes - len(qs)

    d = json.load(open(ruta_json, encoding="utf-8"))
    sig = ID_BASE
    choques = [q["id"] for q in qs if q["id"] >= ID_BASE]
    if choques:
        sys.exit("hay ids >= %d que no son del Guyton: %s" % (ID_BASE, choques[:5]))

    nuevas = 0
    for banco in d["bancos"]:
        for i, p in enumerate(banco["preguntas"], 1):
            qs.append({
                "id": sig,
                "topic": banco["banco"],
                "topicBase": banco["banco"],
                "fileId": sig,
                "origQ": p["ref"],
                "q": p["q"],
                "options": p["options"],
                "correct": p["correct"],
                "exp": explicacion(p),
                "n": i,
            })
            sig += 1
            nuevas += 1

    counts = collections.Counter(q["topic"] for q in qs)
    s = s[:m.start()] + "const ALL_QUESTIONS = %s;\n" % json.dumps(qs, ensure_ascii=False) + s[m.end():]
    s = re.sub(r"const TOPIC_COUNTS = \{.*?\};\n",
               "const TOPIC_COUNTS = %s;\n" % json.dumps(dict(counts), ensure_ascii=False),
               s, count=1, flags=re.S)
    open(ruta_html, "w", encoding="utf-8").write(s)

    cortas = sum(1 for q in qs if len(re.sub(r"\s*\([^)]*\)\s*$", "", q["exp"]).strip()) < 60)
    print("%s: %d preguntas (%d quitadas del Guyton anterior, %d nuevas)"
          % (ruta_html, len(qs), quitadas, nuevas))
    print("  bancos del Guyton: %d · ids %d-%d"
          % (sum(1 for t in counts if t.startswith(PREFIJO)), ID_BASE, sig - 1))
    print("  sin explicación en toda la plataforma: %d" % sum(1 for q in qs if not (q.get("exp") or "").strip()))
    print("  con explicación real < 60 caracteres: %d" % cortas)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
