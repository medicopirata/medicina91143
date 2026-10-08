#!/usr/bin/env python3
"""Genera la página de ejercicios de rellenar a partir de ejercicios.json.

Cada ejercicio es una imagen de los apuntes con las estructuras numeradas y el
nombre tapado, y un desplegable por número. Las respuestas salen del
solucionario del doc, así que si el doc cambia basta con volver a pasar
rellenar_parsear.py y este script.

Uso:  python3 tools/rellenar_generar.py <ejercicios.json> <salida.html>
"""
import json, os, sys

if len(sys.argv) != 3:
    raise SystemExit(__doc__)
EJ = json.load(open(sys.argv[1], encoding="utf-8"))
datos = []
for e in EJ:
    datos.append({
        "t": e["titulo"],
        "tema": e["tema"],
        "img": "apuntes_img/rellenar/%s.jpg" % e["img"],
        "e": e["enunciado"],
        "c": e["coletilla"],
        "i": [[it["n"], it["etiqueta"], it["nota"]] for it in e["items"]],
    })

CABECERA = """<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Rellenar · Anatomía 3</title>
<link rel="manifest" href="manifest.webmanifest">
<meta name="theme-color" content="#14364a">
<script src="acceso.js"></script>
<script src="sync.js"></script>
<style>
:root{
  --bg:#f6f0e5; --card:#fffdf8; --ink:#173140; --muted:#5c6f78;
  --line:rgba(23,49,64,.12); --navy:#14364a; --gold:#d4a85d;
  --ok:#2d7b57; --ok-soft:#e8f4ee; --mal:#b43e36; --mal-soft:#fbeceb;
  --radius:18px; --sombra:0 10px 30px rgba(13,34,46,.10);
}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);
     font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
     -webkit-text-size-adjust:100%}
a{color:inherit}
.cab{position:sticky;top:0;z-index:20;background:var(--navy);color:#fff;
     padding:14px 16px;padding-top:calc(14px + env(safe-area-inset-top));
     display:flex;align-items:center;gap:12px;box-shadow:0 2px 12px rgba(0,0,0,.18)}
.cab h1{margin:0;font-size:17px;font-weight:650;letter-spacing:.2px;flex:1}
.cab .volver{color:#fff;text-decoration:none;font-size:14px;opacity:.85;
     border:1px solid rgba(255,255,255,.35);border-radius:999px;padding:5px 12px;white-space:nowrap}
.cab .volver:hover{opacity:1}
.env{max-width:1100px;margin:0 auto;padding:18px 16px 60px}

/* --- portada ---------------------------------------------------------- */
.intro{color:var(--muted);margin:0 0 20px}
.grupo{margin-bottom:26px}
.grupo h2{font-size:13px;text-transform:uppercase;letter-spacing:1.4px;
          color:var(--muted);margin:0 0 10px;font-weight:700}
.rej{display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(250px,1fr))}
.tarjeta{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);
         padding:14px 16px;cursor:pointer;text-align:left;font:inherit;color:inherit;
         box-shadow:var(--sombra);transition:transform .12s,box-shadow .12s;display:block;width:100%}
.tarjeta:hover{transform:translateY(-2px);box-shadow:0 14px 34px rgba(13,34,46,.14)}
.tarjeta b{display:block;font-size:16px;margin:0 0 4px;line-height:1.3}
.tarjeta .pie{display:flex;align-items:center;gap:8px;color:var(--muted);font-size:13px}
.marca{margin-left:auto;font-size:12px;font-weight:700;padding:2px 9px;border-radius:999px;
       background:#eee;color:var(--muted);white-space:nowrap}
.marca.bien{background:var(--ok-soft);color:var(--ok)}
.marca.regular{background:#fdf3e0;color:#9a6b14}

/* --- ejercicio -------------------------------------------------------- */
.ejer{display:none}
.ejer.on{display:block}
.enun{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);
      padding:14px 16px;margin:0 0 16px;box-shadow:var(--sombra)}
.enun h2{margin:0 0 6px;font-size:19px}
.enun p{margin:0;color:var(--muted);font-size:14.5px}
.dos{display:grid;gap:18px;grid-template-columns:minmax(0,1.25fr) minmax(280px,1fr);align-items:start}
@media(max-width:820px){.dos{grid-template-columns:1fr}}
.lienzo{position:sticky;top:76px;background:var(--card);border:1px solid var(--line);
        border-radius:var(--radius);padding:8px;box-shadow:var(--sombra)}
@media(max-width:820px){.lienzo{position:static}}
.lienzo img{width:100%;height:auto;display:block;border-radius:12px;cursor:zoom-in}
.pista{margin:6px 2px 0;font-size:12.5px;color:var(--muted);text-align:center}
.filas{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.fila{display:flex;align-items:center;gap:10px;background:var(--card);
      border:1px solid var(--line);border-radius:12px;padding:8px 10px}
.num{flex:0 0 30px;height:30px;border-radius:50%;background:#b8322b;color:#fff;
     display:grid;place-items:center;font-weight:700;font-size:14px}
.fila select{flex:1;min-width:0;font:inherit;font-size:15px;padding:8px 6px;
     border:1px solid var(--line);border-radius:9px;background:#fff;color:var(--ink)}
.fila.bien{background:var(--ok-soft);border-color:#b7ddc8}
.fila.bien select{background:transparent;border-color:transparent;color:var(--ok);font-weight:600}
.fila.mal{background:var(--mal-soft);border-color:#eec3bf}
.fila.mal select{border-color:#e0a49d}
.sol{font-size:13px;color:var(--muted);margin:2px 0 0 40px}
.sol b{color:var(--ok)}
.barra{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:16px 0 0}
button.acc{font:inherit;font-weight:650;border:0;border-radius:999px;padding:11px 20px;cursor:pointer}
.corregir{background:var(--navy);color:#fff}
.otra{background:#fff;color:var(--navy);border:1px solid var(--line)}
.nota{font-weight:700;margin-left:auto}
.coletilla{margin:14px 0 0;padding:12px 14px;background:#fff8e8;border:1px solid #efdcb4;
           border-radius:12px;font-size:14.5px}
.coletilla b{color:#8a6414}
/* lupa */
.lupa{position:fixed;inset:0;background:rgba(10,24,32,.92);display:none;z-index:50;
      align-items:center;justify-content:center;padding:12px}
.lupa.on{display:flex}
.lupa img{max-width:100%;max-height:100%;border-radius:8px}
</style>
</head>
<body>
<header class="cab">
  <a class="volver" href="index.html">‹ Bitácora</a>
  <h1>Rellenar · Anatomía 3</h1>
</header>
<div class="env">
  <div id="portada">
    <p class="intro">Las imágenes de los apuntes con los nombres tapados. Elige en cada
      desplegable qué señala cada número.</p>
    <div id="lista"></div>
  </div>
  <div id="ejercicio" class="ejer"></div>
</div>
<div class="lupa" id="lupa"><img alt=""></div>
<script>
const EJERCICIOS = __DATOS__;
</script>
<script>
/* Marca de cada ejercicio, para saber cuáles ya te salen. */
const CLAVE = "mp_rellenar_a3";
function marcas() {
  try { return JSON.parse(localStorage.getItem(CLAVE) || "{}"); } catch (e) { return {}; }
}
function guardarMarca(i, pct) {
  try {
    const m = marcas();
    if (!(i in m) || pct > m[i]) { m[i] = pct; localStorage.setItem(CLAVE, JSON.stringify(m)); }
  } catch (e) { /* almacenamiento bloqueado: se estudia igual, sin marcas */ }
}

const esc = s => String(s).replace(/[&<>"]/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* --- portada ---------------------------------------------------------- */
function pintarPortada() {
  const m = marcas(), temas = [];
  EJERCICIOS.forEach((e, i) => {
    let g = temas.find(x => x.tema === e.tema);
    if (!g) { g = { tema: e.tema, ej: [] }; temas.push(g); }
    g.ej.push([e, i]);
  });
  document.getElementById("lista").innerHTML = temas.map(g => '<div class="grupo">'
    + '<h2>' + esc(g.tema) + '</h2><div class="rej">'
    + g.ej.map(([e, i]) => {
        const pct = m[i];
        const cls = pct === undefined ? "" : (pct === 100 ? " bien" : " regular");
        const txt = pct === undefined ? "sin hacer" : pct + "%";
        return '<button class="tarjeta" onclick="abrir(' + i + ')">'
          + '<b>' + esc(e.t) + '</b>'
          + '<span class="pie">' + e.i.length + ' estructuras'
          + '<span class="marca' + cls + '">' + txt + '</span></span></button>';
      }).join("")
    + '</div></div>').join("");
  document.getElementById("portada").style.display = "";
  document.getElementById("ejercicio").classList.remove("on");
}

/* --- un ejercicio ----------------------------------------------------- */
let actual = -1, intento = 0, primera = null;
function abrir(i) {
  actual = i;
  intento = 0;
  primera = null;
  const e = EJERCICIOS[i];
  // Las opciones son las propias etiquetas del ejercicio, en orden alfabético:
  // lo que hay que acertar es a qué número va cada una.
  const opciones = [...new Set(e.i.map(x => x[1]))].sort((a, b) => a.localeCompare(b, "es"));
  const filas = e.i.map((x, k) => '<li class="fila" id="f' + k + '">'
      + '<span class="num">' + esc(x[0]) + '</span>'
      + '<select id="s' + k + '"><option value="">— elige —</option>'
      + opciones.map(o => '<option>' + esc(o) + '</option>').join("")
      + '</select></li>').join("");

  document.getElementById("ejercicio").innerHTML =
      '<div class="enun"><h2>' + esc(e.t) + '</h2><p>' + esc(e.e) + '</p></div>'
    + '<div class="dos">'
    +   '<div class="lienzo"><img src="' + esc(e.img) + '" alt="' + esc(e.t) + '" onclick="ampliar(this.src)">'
    +     '<p class="pista">Toca la imagen para verla grande</p></div>'
    +   '<div><ul class="filas">' + filas + '</ul>'
    +     '<div class="barra">'
    +       '<button class="acc corregir" id="bt-corregir" onclick="corregir()">Corregir</button>'
    +       '<button class="acc otra" id="bt-soluciones" onclick="rendirse()" hidden>Ver soluciones</button>'
    +       '<button class="acc otra" onclick="abrir(actual)">Empezar de cero</button>'
    +       '<button class="acc otra" onclick="pintarPortada()">Volver</button>'
    +       '<span class="nota" id="nota"></span>'
    +     '</div>'
    +     '<div id="cola"></div>'
    +   '</div>'
    + '</div>';
  document.getElementById("portada").style.display = "none";
  document.getElementById("ejercicio").classList.add("on");
  window.scrollTo(0, 0);
}

function corregir() {
  const e = EJERCICIOS[actual];
  intento++;
  let bien = 0, pendientes = 0;
  e.i.forEach((x, k) => {
    const sel = document.getElementById("s" + k);
    const fila = document.getElementById("f" + k);
    if (fila.classList.contains("bien")) { bien++; return; }   // ya acertada
    if (sel.value === x[1]) {
      bien++;
      fila.className = "fila bien";
      sel.disabled = true;
    } else {
      pendientes++;
      fila.className = "fila mal";
      // se borra la elección para que la pienses otra vez, y no se enseña
      // la respuesta: para eso está el botón de soluciones
      sel.value = "";
    }
  });
  const pct = Math.round(bien * 100 / e.i.length);
  if (primera === null) { primera = pct; guardarMarca(actual, pct); }

  const nota = document.getElementById("nota");
  nota.textContent = bien + "/" + e.i.length
    + (intento > 1 ? " · intento " + intento : "")
    + (primera !== null && intento > 1 ? " · a la primera " + primera + "%" : "");

  document.getElementById("bt-soluciones").hidden = pendientes === 0;
  if (pendientes === 0) {
    document.getElementById("bt-corregir").hidden = true;
    revelar(true);
  }
}

/* Enseña la respuesta de lo que quede sin acertar y cierra el ejercicio. */
function rendirse() { revelar(false); }

function revelar(todoBien) {
  const e = EJERCICIOS[actual];
  e.i.forEach((x, k) => {
    const sel = document.getElementById("s" + k);
    const fila = document.getElementById("f" + k);
    const acierta = fila.classList.contains("bien");
    if (!acierta) { sel.value = x[1]; sel.disabled = true; fila.className = "fila mal"; }
    const viejo = fila.nextElementSibling;
    if (viejo && viejo.className === "sol") viejo.remove();
    if (!acierta || x[2]) {
      const p = document.createElement("li");
      p.className = "sol";
      p.innerHTML = (acierta ? "" : "<b>" + esc(x[1]) + "</b>") + (x[2] ? " " + esc(x[2]) : "");
      fila.after(p);
    }
  });
  document.getElementById("bt-corregir").hidden = true;
  document.getElementById("bt-soluciones").hidden = true;
  const cola = document.getElementById("cola");
  cola.innerHTML = (todoBien ? '<p class="coletilla"><b>Todas.</b> '
                      + (primera === 100 ? "Y a la primera." : "A la primera te salieron " + primera + "%.")
                      + '</p>' : "")
    + (e.c ? '<p class="coletilla"><b>Además:</b> ' + esc(e.c) + '</p>' : "");
}

function ampliar(src) {
  const l = document.getElementById("lupa");
  l.querySelector("img").src = src;
  l.classList.add("on");
}
document.getElementById("lupa").onclick = function () { this.classList.remove("on"); };
document.addEventListener("keydown", e => {
  if (e.key === "Escape") document.getElementById("lupa").classList.remove("on");
});

pintarPortada();

// Las notas se comparten entre dispositivos; si llega una nueva con la portada
// a la vista, se repinta.
MPSync.usar({ clave: CLAVE, modo: "max", alCambiar: function () {
  if (!document.getElementById("ejercicio").classList.contains("on")) pintarPortada();
} });
</script>
</body>
</html>
"""

html = CABECERA.replace("__DATOS__", json.dumps(datos, ensure_ascii=False))
ruta = sys.argv[2]
open(ruta, "w", encoding="utf-8").write(html)
print("%s · %.1f KB · %d ejercicios · %d huecos"
      % (os.path.basename(ruta), os.path.getsize(ruta) / 1024,
         len(datos), sum(len(d["i"]) for d in datos)))
