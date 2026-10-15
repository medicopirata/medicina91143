#!/usr/bin/env python3
"""Saca a archivo las imágenes que están embebidas en base64 dentro del HTML.

La mayoría de las preguntas con imagen apuntan a un archivo (`anat3_img/…`),
pero unas pocas llevan la imagen incrustada como `data:image/...;base64,…`.
Eso tiene tres costes: el base64 ocupa un 33 % más que el binario, engorda el
HTML que el navegador tiene que descargar y parsear entero antes de mostrar
nada, y no se puede cachear por separado, así que se vuelve a bajar con cada
cambio de la plataforma.

Aquí se escriben a su carpeta de imágenes con el nombre derivado del
contenido (sha256 corto), de modo que dos preguntas con la misma imagen
comparten archivo, y el campo `img` pasa a apuntar a la ruta.

Uso:  python3 tools/extraer_img_embebidas.py <plataforma.html> <carpeta> [...]
      python3 tools/extraer_img_embebidas.py --simular <plataforma.html> <carpeta>
"""
import base64, hashlib, json, os, re, sys

EXT = {"jpeg": "jpg", "jpg": "jpg", "png": "png", "gif": "gif", "webp": "webp", "svg+xml": "svg"}


def main(argv):
    simular = "--simular" in argv
    args = [a for a in argv if not a.startswith("--")]
    pares = list(zip(args[::2], args[1::2]))
    for ruta, carpeta in pares:
        s = open(ruta, encoding="utf-8").read()
        m = re.search(r"const ALL_QUESTIONS = (\[.*?\]);\n", s, re.S)
        qs = json.loads(m.group(1))

        sacadas, reutilizadas, bytes_antes, bytes_despues = 0, 0, 0, 0
        por_hash = {}
        for q in qs:
            img = q.get("img") or ""
            if not img.startswith("data:"):
                continue
            mm = re.match(r"data:image/([a-z+]+);base64,(.+)$", img, re.S)
            if not mm:
                print("  %s: id %s tiene un data: que no sé leer" % (ruta, q["id"]))
                continue
            tipo, b64 = mm.group(1), mm.group(2)
            try:
                crudo = base64.b64decode(b64)
            except Exception as e:
                print("  %s: id %s no decodifica (%s)" % (ruta, q["id"], e))
                continue
            h = hashlib.sha256(crudo).hexdigest()[:16]
            nombre = "%s/emb-%s.%s" % (carpeta, h, EXT.get(tipo, "img"))
            bytes_antes += len(img)
            bytes_despues += len(nombre)
            if h in por_hash:
                reutilizadas += 1
            else:
                por_hash[h] = (nombre, crudo)
                sacadas += 1
            q["img"] = nombre

        if not sacadas and not reutilizadas:
            print("%-30s no tiene imágenes embebidas" % ruta)
            continue

        print("%-30s %d imágenes (%d archivos nuevos, %d repetidas) · el HTML baja %.2f MB"
              % (ruta, sacadas + reutilizadas, sacadas, reutilizadas,
                 (bytes_antes - bytes_despues) / 1048576))
        if simular:
            continue

        os.makedirs(carpeta, exist_ok=True)
        escritos = 0
        for nombre, crudo in por_hash.values():
            if not os.path.exists(nombre):
                open(nombre, "wb").write(crudo)
                escritos += 1
        s = s[:m.start()] + "const ALL_QUESTIONS = %s;\n" % json.dumps(qs, ensure_ascii=False) + s[m.end():]
        open(ruta, "w", encoding="utf-8").write(s)
        peso = sum(len(c) for _, c in por_hash.values()) / 1048576
        print("   %d archivos escritos en %s (%.2f MB en disco, cacheables por el navegador)"
              % (escritos, carpeta, peso))


if __name__ == "__main__":
    main(sys.argv[1:])
