#!/usr/bin/env python3
"""Histología Esp. I: quita del export en markdown los apartados de preguntas
tipo test antes de volcarlo con tools/apuntes_volcar.py.

En el doc de Histología las preguntas van en «## Bloque N · Preguntas», en
subapartados «### <clase> · A|B|C|D · …» (o «### A · …» en el Bloque 1), con
las opciones en la misma línea («**1.** enunciado: (a) …; (b) …») y el
solucionario dentro. Ese formato no lo reconoce quitar_preguntas() de
apuntes_volcar.py (que busca «N. enunciado» + líneas «- a) …»), así que poner
histo21 en QUITAR_PREGUNTAS no basta. Este filtro quita esos subapartados
enteros (con sus #### hijos) y deja todo lo demás: los apuntes, los repasos
orales, el seminario y el glosario.

Uso:  python3 tools/histo21_quitar_preguntas.py <entrada.md> <salida.md>
      python3 tools/apuntes_volcar.py histo21 <salida.md>
"""
import re, sys

PREG = re.compile(r'(^|·\s*)[A-D]\s*·\s')

def filtrar(texto):
    out, en_preg, quitar = [], False, None
    for l in texto.splitlines():
        m = re.match(r'^(#{1,4})\s+(.*)', l)
        if m:
            n, tit = len(m.group(1)), re.sub(r'[*_`]', '', m.group(2)).strip()
            if n <= 2:
                en_preg = 'Preguntas' in tit
                quitar = None
            elif quitar is not None and n <= quitar:
                quitar = None
            if quitar is None and en_preg and n == 3 and PREG.search(tit):
                quitar = n
        if quitar is None:
            out.append(l)
    return "\n".join(out) + "\n"

if __name__ == '__main__':
    if len(sys.argv) != 3: raise SystemExit(__doc__)
    t = open(sys.argv[1], encoding='utf-8').read()
    open(sys.argv[2], 'w', encoding='utf-8').write(filtrar(t))
