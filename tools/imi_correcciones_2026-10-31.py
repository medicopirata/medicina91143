#!/usr/bin/env python3
"""Correcciones de IMI del 31-10-2026 (doc rev 163 → 168; Vol. 2 rev 2 → 8;
Vol. 3 y Vol. 4 rehechos en pestañas nuevas, rev 5 y 6).

Se pasa DESPUÉS de cargar con tools/imi_cargar_nuevas.py los JSON del día
(imi-tema19, imi-examenes-tema19, imi-companeros-vol2-4).

1. Notas «📒 Tus apuntes»: preguntas ya cargadas en las que el doc (apartado B del
   Tema 19, banco de compañeros de la Parte G y volúmenes 3 y 4) razona otra
   respuesta. Se añade la nota al final de la explicación y la clave se mantiene.
   Datos en apuntes_extra/imi-correcciones-2026-10-31.json («notas»).
2. `caida`: exámenes de la recopilación «Preparación IMI» en que salieron preguntas
   ya cargadas (marcas 📌 del doc y referencias del apartado B del Tema 19).
   Mismo JSON («caida»).
3. Preguntas nuevas: `n` = número de la pregunta en su examen (bancos 📝 Preparación),
   con `origQ` siguiendo la numeración del banco, y `ns` = 1 si la explicación cita
   opciones por su letra (no se barajan).

Idempotente. Uso: python3 tools/imi_correcciones_2026-10-31.py plataforma_medint.html
"""
import json, re, sys

EXTRA = "apuntes_extra/"
LETRA = re.compile(r"(?<![\wáéíóúñ])[a-e]\)|\b[Ll]as? [a-e](?=[\s,.;:])")
NUEVOS = ("imi-tema19.json", "imi-examenes-tema19.json", "imi-companeros-vol2-4.json")
PRIMER_ID_NUEVO = 97526


def main(ruta):
    s = open(ruta, encoding="utf-8").read()
    m = re.search(r"^const ALL_QUESTIONS = (\[.*?\]);$", s, re.M | re.S)
    qs = json.loads(m.group(1))
    Q = {q["id"]: q for q in qs}
    hechos = []
    d = json.load(open(EXTRA + "imi-correcciones-2026-10-31.json", encoding="utf-8"))

    # 1. Notas
    for i, (marca, texto) in d["notas"].items():
        q = Q[int(i)]
        if marca in q["exp"] and texto[:40] in q["exp"]:
            continue
        q["exp"] = q["exp"].rstrip() + "\n\n%s: %s La clave de este banco se mantiene." % (marca, texto)
        hechos.append("%s nota %s" % (i, marca))

    # 2. Caídas
    for i, nombres in d["caida"].items():
        q = Q[int(i)]
        for nombre in nombres:
            if nombre not in q.setdefault("caida", []):
                q["caida"].append(nombre)
                hechos.append("%s caida + %s" % (i, nombre))

    # 3. Campos de las preguntas nuevas
    nuevos = set()
    for f in NUEVOS:
        dd = json.load(open(EXTRA + f, encoding="utf-8"))
        for b in dd["bancos"]:
            for p in b["preguntas"]:
                nuevos.add((b["banco"], p["q"]))
        for banco, enun, n in dd.get("numeros", []):
            for q in qs:
                if q["topic"] == banco and q["q"] == enun and q.get("n") != n:
                    q["n"] = n
                    otros = [x.get("origQ") or 0 for x in qs if x["topic"] == banco and x is not q]
                    q["origQ"] = max(otros) + 1
                    hechos.append("%d n=%s origQ=%d" % (q["id"], n, q["origQ"]))
    for q in qs:
        if (q["topic"], q["q"]) in nuevos and q["id"] >= PRIMER_ID_NUEVO:
            if LETRA.search(q["exp"]) and not q.get("ns"):
                q["ns"] = 1
                hechos.append("%d ns" % q["id"])

    s = s[:m.start(1)] + json.dumps(qs, ensure_ascii=False) + s[m.end(1):]
    open(ruta, "w", encoding="utf-8").write(s)
    print("\n".join(hechos) or "nada que cambiar")


if __name__ == "__main__":
    main(*sys.argv[1:])
