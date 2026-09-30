#!/usr/bin/env python3
"""Hace instalables las plataformas y arregla lo que estorbaba en el móvil.

Dos cosas, las dos idempotentes:

1. PWA: enlaza el manifest, los iconos de iOS y registra el service worker,
   para que el teléfono ofrezca "Añadir a la pantalla de inicio".

2. Móvil: tres arreglos sobre lo que se veía mal a 390 px —
   - la barra de sesión iba fija y flotaba tapando el contenido al hacer scroll;
   - las cinco tarjetas de estadísticas ocupaban la primera pantalla entera;
   - los modos de estudio caían a una columna y obligaban a mucho scroll.

Uso:  python3 tools/pwa_movil.py <archivo.html> [<archivo2.html> …]
"""
import re, sys

CABECERA = """<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="icono-192.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Médico Pirata">
<meta name="mobile-web-app-capable" content="yes">"""

REGISTRO = """<script>
// Registro del service worker: sin él, Chrome no ofrece instalar la aplicación.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  });
}
</script>"""

CSS_MOVIL = """
    /* ===== Móvil: ajustes para usarla como aplicación en el teléfono ===== */
    @media (max-width: 700px) {
      /* La barra de sesión era position:fixed y se quedaba flotando sobre el
         contenido al hacer scroll, tapando el título y las tarjetas. */
      /* El position:fixed viene en un atributo style= del propio HTML, así que
         hace falta !important para ganarle; si no, la regla no se aplica. */
      #fb-bar { position: absolute !important; padding: 4px 10px !important; }
      #fb-login-area button { font-size: 0.72rem !important; padding: 5px 11px !important; }

      /* Las cinco tarjetas de estadísticas se comían la primera pantalla. */
      .stats-row { grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 14px 0; }
      .stat-card { padding: 10px 6px; }
      .stat-card .num { font-size: 1.4rem; }
      .stat-card .lbl { font-size: 0.68rem; line-height: 1.25; }

      /* Los modos de estudio caían en una sola columna: demasiado scroll
         hasta llegar a los temas, que es a lo que se entra. */
      .mode-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
      .mode-btn { padding: 12px 11px; }
      .mode-btn .icon { font-size: 1.4rem; margin-bottom: 6px; }
      .mode-btn .title { font-size: 0.86rem; }
      .mode-btn .desc { font-size: 0.72rem; line-height: 1.3; }
      /* "descartar" flotaba a la derecha y se amontonaba con el título
         al estrechar la tarjeta a dos columnas. */
      .mode-btn .discard { float: none; display: inline-block; font-size: 0.66rem;
                           padding: 2px 6px; margin-top: 6px; }
      /* El título cabe en una línea en pantallas de 390 px. */
      .home-header h1 { font-size: 1.32rem; }
    }"""


def parchear(ruta):
    html = open(ruta, encoding="utf-8").read()
    hecho = []

    if 'rel="manifest"' not in html:
        m = re.search(r'<meta name="theme-color"[^>]*>', html)
        if m:
            html = html[:m.end()] + "\n" + CABECERA + html[m.end():]
        else:                                   # sin theme-color: tras <head>
            m = re.search(r'<head[^>]*>', html)
            if not m:
                raise SystemExit("%s: no encuentro <head>" % ruta)
            html = html[:m.end()] + "\n" + CABECERA + html[m.end():]
        hecho.append("manifest + iconos")

    if "navigator.serviceWorker.register('sw.js')" not in html:
        i = html.rfind("</body>")
        if i == -1:
            raise SystemExit("%s: no encuentro </body>" % ruta)
        html = html[:i] + REGISTRO + "\n" + html[i:]
        hecho.append("service worker")

    if "Móvil: ajustes para usarla como aplicación" not in html:
        i = html.rfind("</style>")
        if i == -1:
            hecho.append("SIN CSS (no hay <style>)")
        else:
            html = html[:i] + CSS_MOVIL + "\n  " + html[i:]
            hecho.append("css móvil")

    open(ruta, "w", encoding="utf-8").write(html)
    return hecho


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    for ruta in sys.argv[1:]:
        h = parchear(ruta)
        print("  %-34s %s" % (ruta.split("/")[-1], ", ".join(h) if h else "ya estaba"))
