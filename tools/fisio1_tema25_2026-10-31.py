#!/usr/bin/env python3
"""Fisio I: carga el Tema 25 (Regulación hidroelectrolítica y ácido-base, clase del 30/10/26) desde
apuntes_extra/fisio1-tema25.json con tools/add_apuntes.py, SIN regenerar el índice
de temas (tools/indice_temas.py se pasa aparte, en el commit que lo integre).

Idempotente (add_apuntes sustituye el banco). Uso:
    python3 tools/fisio1_tema25_2026-10-31.py [plataforma_fisio1.html]
"""
import importlib.util, os, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location("add_apuntes", os.path.join(RAIZ, "tools", "add_apuntes.py"))
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
mod.regenerar_indice = lambda ruta: print("  índice: sin regenerar (a propósito)")
html = sys.argv[1] if len(sys.argv) > 1 else os.path.join(RAIZ, "plataforma_fisio1.html")
sys.argv = [sys.argv[0], html, os.path.join(RAIZ, "apuntes_extra", "fisio1-tema25.json")]
mod.main()
