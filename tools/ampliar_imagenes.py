#!/usr/bin/env python3
"""Añade a un banco de apuntes preguntas de ampliación sobre sus imágenes.

Son preguntas escritas por Claude sobre las micrografías que el doc ya usa:
no están en el doc, así que `add_apuntes.py` no las conoce. Aquí se insertan
detrás de la última pregunta de su banco, con ids nuevos por encima del mayor
que haya, de modo que ninguna pregunta existente cambia de id y el progreso
guardado no se toca.

Es idempotente: una pregunta que ya esté (mismo banco, enunciado e imagen) no
se vuelve a añadir.

Uso:  python3 tools/ampliar_imagenes.py <plataforma.html> <ampliacion.json>...

El JSON es una lista de {"banco": "...", "preguntas": [{"img", "q", "options",
"correct", "exp"}]}; `img` puede venir con la ruta absoluta del clon.
"""
import json, os, re, sys

ETIQUETA = "\U0001F916 Propuesta por Claude, no dicha en clase."
ID_BASE = 90000


def main():
    html_path, fuentes = sys.argv[1], sys.argv[2:]
    s = open(html_path, encoding="utf-8").read()
    m = re.search(r"const ALL_QUESTIONS = (\[.*?\]);\n", s, re.S)
    qs = json.loads(m.group(1))
    raiz = os.path.dirname(os.path.abspath(html_path))
    siguiente = max(q["id"] for q in qs if q["id"] >= ID_BASE) + 1
    total = 0
    for fuente in fuentes:
        for bloque in json.load(open(fuente, encoding="utf-8")):
            banco = bloque["banco"]
            del_banco = [i for i, q in enumerate(qs) if q.get("topic") == banco]
            if not del_banco:
                sys.exit("no existe el banco: " + banco)
            imgs = {q.get("img") for q in qs if q.get("topic") == banco and q.get("img")}
            ya = {(q["q"], q.get("img")) for q in qs if q.get("topic") == banco}
            pos = del_banco[-1] + 1
            n = max(qs[i].get("n", 0) for i in del_banco)
            nuevas = 0
            for p in bloque["preguntas"]:
                img = p["img"]
                if os.path.isabs(img):
                    img = os.path.relpath(img, raiz)
                assert img in imgs, "imagen ajena al banco: %s" % img
                assert os.path.exists(os.path.join(raiz, img)), img
                assert len(p["options"]) == 4 and len(set(p["options"])) == 4, p["q"]
                assert 0 <= p["correct"] <= 3 and len(p["exp"]) > 80, p["q"]
                if (p["q"], img) in ya:
                    continue
                n += 1
                qs.insert(pos, {
                    "id": siguiente, "topic": banco, "topicBase": banco,
                    "fileId": siguiente, "origQ": n, "q": p["q"],
                    "options": p["options"], "correct": p["correct"],
                    "exp": ETIQUETA + " " + p["exp"], "n": n, "img": img,
                })
                ya.add((p["q"], img))
                pos += 1; siguiente += 1; nuevas += 1
            total += nuevas
            print("  %-62s +%d" % (banco[:62], nuevas))
    assert len({q["id"] for q in qs}) == len(qs), "ids duplicados"
    nuevo = json.dumps(qs, ensure_ascii=False, separators=(",", ":"))
    open(html_path, "w", encoding="utf-8").write(s[:m.start(1)] + nuevo + s[m.end(1):])
    print("añadidas %d · total %d" % (total, len(qs)))


if __name__ == "__main__":
    main()
