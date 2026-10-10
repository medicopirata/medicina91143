#!/usr/bin/env python3
"""Vuelca el texto de los apuntes (exportado de los documentos de Claude) a
apuntes_txt/<clave>.json, troceado por apartados, para que el entrenador con IA
(entrenador_ia.js) pueda leer el apartado que toca cuando analiza una sesión.

Uso:  python3 tools/apuntes_volcar.py <clave> <archivo.md|.txt> [más archivos…]

<clave> es la de la plataforma sin el sufijo: anat3, fisio1, histo21, genetica…
(lo que queda de STORAGE_KEY al quitarle «_study_vN»).

Se dejan fuera los apartados de preguntas, solucionario e índice: las preguntas
ya están en la plataforma y solo harían ruido. Las imágenes no se vuelcan.

Hay que volver a pasarlo cada vez que cambian los apuntes; el procedimiento
completo está en tools/apuntes_volcar_instrucciones.md.
"""
import json, os, re, sys, datetime

MAX = 1800
FUERA = re.compile(r'^[\d.]*\s*(preguntas|solucionario|índice|indice|índice de temas|fe de erratas)\b', re.I)

def trocear(texto, origen):
    ruta, fuera_nivel, buf, out = [], None, [], []
    def soltar():
        cuerpo = "\n".join(buf).strip(); buf.clear()
        if len(cuerpo) < 40: return
        titulo = " › ".join(t for _, t in ruta) or origen
        partes, act = [], ""
        pars = []
        for par in re.split(r'\n\s*\n', cuerpo):      # un párrafo larguísimo (texto sacado de PDF) se parte por líneas
            while len(par) > MAX:
                c = par.rfind('\n', 0, MAX)
                c = c if c > MAX // 2 else MAX
                pars.append(par[:c]); par = par[c:].lstrip('\n')
            pars.append(par)
        for par in pars:
            if act and len(act) + len(par) > MAX: partes.append(act); act = ""
            act += ("\n\n" if act else "") + par
        if act: partes.append(act)
        for p in partes: out.append([titulo, p[:MAX * 2]])
    for linea in texto.splitlines():
        m = re.match(r'^(#{1,4})\s+(.*)', linea)
        if m:
            soltar()
            nivel, tit = len(m.group(1)), re.sub(r'[*_`]', '', m.group(2)).strip()
            if fuera_nivel is not None and nivel <= fuera_nivel: fuera_nivel = None
            ruta[:] = [(n, t) for n, t in ruta if n < nivel] + [(nivel, tit)]
            if fuera_nivel is None and FUERA.match(tit): fuera_nivel = nivel
            continue
        if fuera_nivel is None:
            linea = re.sub(r'!\[[^\]]*\]\([^)]*\)', '', linea)           # imágenes
            linea = re.sub(r'\[([^\]]*)\]\(#[^)]*\)', r'\1', linea)      # enlaces internos
            buf.append(linea)
    soltar()
    return out

def main():
    if len(sys.argv) < 3: raise SystemExit(__doc__)
    clave, trozos = sys.argv[1], []
    for f in sys.argv[2:]:
        origen = re.sub(r'[-_]+', ' ', os.path.splitext(os.path.basename(f))[0])
        t = open(f, encoding='utf-8').read()
        if not re.search(r'^#{1,4}\s', t, re.M): t = "# " + origen + "\n\n" + t   # texto plano: una pestaña = un tema
        trozos += trocear(t, origen)
    raiz = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    sal = os.path.join(raiz, 'apuntes_txt', clave + '.json')
    json.dump({"v": datetime.date.today().isoformat(), "trozos": trozos}, open(sal, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print("%s · %d trozos · %.0f KB" % (sal, len(trozos), os.path.getsize(sal) / 1024))

main()
