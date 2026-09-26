#!/usr/bin/env python3
"""Quita las bandas muertas (negras o blancas) de los bordes de las imágenes.

Uso:  python3 tools/recortar_imagenes.py <carpeta o patrón>


Varias vienen de capturas de diapositiva y traen una franja negra abajo o
márgenes blancos enormes. En la pantalla del ejercicio esa franja es alto
desperdiciado, y en el móvil se nota.

Se recorta solo lo que es uniforme de borde a borde, así que nunca se come
un número ni una flecha.
"""
import glob, os, sys
from PIL import Image

def franja_uniforme(px, ancho, y, umbral=12):
    """¿La fila y es de un solo color (negro o blanco)?"""
    primero = px[0, y]
    for x in range(0, ancho, max(1, ancho // 60)):
        c = px[x, y]
        if max(abs(a - b) for a, b in zip(c[:3], primero[:3])) > umbral:
            return False
    # solo se recortan franjas muy oscuras o muy claras
    m = sum(primero[:3]) / 3
    return m < 40 or m > 235

def banda_negra(px, ancho, y, umbral=0.55):
    """¿La fila y es mayoritariamente negra? Es la barra con la que Santi tapa
    la leyenda original: no llega de borde a borde, así que la anterior no la
    pilla."""
    negros = tot = 0
    for x in range(0, ancho, max(1, ancho // 80)):
        c = px[x, y]
        tot += 1
        if sum(c[:3]) / 3 < 45:
            negros += 1
    return tot and negros / tot >= umbral


def marca(c):
    """¿Es el rojo (o el azul) con el que están puestos los números?"""
    r, g, b = c[:3]
    return (r > 120 and g < 90 and b < 90) or (b > 120 and r < 90 and g < 110)


def limites_numeros(px, an, al, margen=30):
    """Primera y última fila donde hay un número, con un poco de aire.

    Es la red de seguridad del recorte: por muy muerta que parezca una franja,
    si tiene un número dentro no se toca. Ya pasó una vez: la barra negra del
    tronco se llevó por delante el número 18.
    """
    pa, pb = None, None
    for y in range(0, al, 2):
        for x in range(0, an, 3):
            if marca(px[x, y]):
                if pa is None:
                    pa = y
                pb = y
                break
    if pa is None:
        return 0, al - 1
    return max(0, pa - margen), min(al - 1, pb + margen)


def recortar(ruta):
    im = Image.open(ruta).convert("RGB")
    px, an, al = im.load(), im.width, im.height
    tope_a, tope_b = limites_numeros(px, an, al)
    arriba = 0
    while arriba < tope_a and franja_uniforme(px, an, arriba):
        arriba += 1
    abajo = al - 1
    while abajo > tope_b and franja_uniforme(px, an, abajo):
        abajo -= 1
    # segunda pasada: la barra negra con la que se tapa la leyenda
    while abajo > tope_b and banda_negra(px, an, abajo):
        abajo -= 1
    while arriba < tope_a and banda_negra(px, an, arriba):
        arriba += 1
    # y otra vez lo uniforme que haya quedado debajo de la barra
    while abajo > tope_b and franja_uniforme(px, an, abajo):
        abajo -= 1

    if arriba == 0 and abajo == al - 1:
        return 0
    recorte = im.crop((0, arriba, an, abajo + 1))
    recorte.save(ruta, quality=88, optimize=True)
    return al - recorte.height

if len(sys.argv) != 2:
    raise SystemExit(__doc__)
patron = sys.argv[1]
if os.path.isdir(patron):
    patron = os.path.join(patron, "*.jpg")

total = 0
for f in sorted(glob.glob(patron)):
    q = recortar(f)
    total += q
    im = Image.open(f)
    print("%-26s %4dx%-4d  %s" % (os.path.basename(f), im.width, im.height,
                                  "-%d px" % q if q else "sin tocar"))
print("recortados %d px en total" % total)
