/* Aspecto de las plataformas: tema de color, tamaño de letra, color propio de
 * cada asignatura, índice de números plegado y portada ordenada por grupos.
 *
 * Todo se añade encima de lo que ya hay: el tema «Oscuro» es el de siempre y
 * nada se borra (los modos sin preguntas se ocultan mientras estén apagados y
 * vuelven a salir solos). Las preferencias son del dispositivo (localStorage
 * «mp_aspecto»), no se sincronizan: de día en el portátil puede apetecer el
 * claro y de noche en el móvil el oscuro.
 *
 * Se carga después de estudio.js en las plataformas de cada asignatura.
 */
(function () {
  var CLAVE = "mp_aspecto";
  var LETRAS = [90, 100, 110, 120, 135];

  // Color de cada asignatura. Se evitan el rojo (errores), el ámbar (avisos) y
  // el verde (aciertos) para que el color de la asignatura no se confunda con ellos.
  // [acento, acento claro] para los temas oscuros; [acento, acento oscuro] para el claro.
  var ASIGNATURAS = {
    "plataforma_fisio1.html":        { oscuro: ["#06b6d4", "#67e8f9"], claro: ["#0e7490", "#155e75"] },
    "plataforma_medint.html":        { oscuro: ["#3b82f6", "#93c5fd"], claro: ["#1d4ed8", "#1e40af"] },
    "plataforma_anatomia3.html":     { oscuro: ["#6366f1", "#a5b4fc"], claro: ["#4338ca", "#3730a3"] },
    "plataforma_histologia2.1.html": { oscuro: ["#ec4899", "#f9a8d4"], claro: ["#be185d", "#9d174d"] },
    "plataforma_genetica.html":      { oscuro: ["#8b5cf6", "#c4b5fd"], claro: ["#6d28d9", "#5b21b6"] }
  };
  var TEMAS = {
    oscuro: { nombre: "Oscuro", vars: null, meta: "#0f1923" },
    suave: { nombre: "Oscuro suave", meta: "#16191d",
      vars: { bg: "#16191d", surface: "#1f2329", surface2: "#272c33", border: "#343a42", text: "#d9dde2", text2: "#9aa3ad" } },
    claro: { nombre: "Claro (papel)", meta: "#f5f3ee",
      vars: { bg: "#f5f3ee", surface: "#ffffff", surface2: "#f0ede6", border: "#dcd6ca", text: "#1f2a33", text2: "#5d6873",
              success: "#16a34a", danger: "#dc2626", warning: "#d97706" } }
  };

  var archivo = (location.pathname.split("/").pop() || "").toLowerCase();
  var asig = ASIGNATURAS[archivo];

  function leer() {
    var p = {};
    try { p = JSON.parse(localStorage.getItem(CLAVE) || "{}") || {}; } catch (e) {}
    if (!TEMAS[p.tema]) p.tema = "oscuro";
    if (LETRAS.indexOf(p.letra) < 0) p.letra = 100;
    if (typeof p.color !== "boolean") p.color = true;
    if (typeof p.indice !== "boolean") p.indice = false;   // false = índice de números plegado
    return p;
  }
  function guardar(p) { try { localStorage.setItem(CLAVE, JSON.stringify(p)); } catch (e) {} }

  var pref = leer();
  var hoja = document.createElement("style");
  hoja.id = "aspecto-css";

  // ------------------------------------------------------------------ tema
  function aplicar() {
    var t = TEMAS[pref.tema], v = [];
    if (t.vars) for (var k in t.vars) v.push("--" + k + ":" + t.vars[k]);
    if (asig && pref.color) {
      var c = pref.tema === "claro" ? asig.claro : asig.oscuro;
      v.push("--accent:" + c[0], "--accent2:" + c[1]);
    } else if (pref.tema === "claro") {
      v.push("--accent:#0f8a63", "--accent2:#0b6e4f");
    }
    if (pref.tema === "claro") v.push("color-scheme:light");
    hoja.textContent = ":root{" + v.join(";") + "}html{font-size:" + pref.letra + "%}" + FIJO;
    document.documentElement.setAttribute("data-aspecto", pref.tema);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", t.meta);
    pintarPanel();
  }

  var FIJO = [
    // Lectura de la sala de estudio: letra algo mayor, más interlineado y líneas más cortas.
    "#estudio-screen{font-size:1.0625rem;line-height:1.7}",
    "#estudio-screen .est-pag p,#estudio-screen .est-pag li{max-width:70ch}",
    "#estudio-screen .est-pag h2{font-size:1.45rem}",
    // Botones con fondo de acento: texto blanco, que se lee con cualquier color de asignatura.
    ".est-sig,.est-sigue,.miga.act{color:#fff!important}",
    ".est-sig .sub,.est-sig small{color:rgba(255,255,255,.8)!important}",
    // Tema claro: textos de color pensados para fondo oscuro, más oscuros para que se lean.
    "[data-aspecto=claro] #q-origen.examen{color:#b45309}[data-aspecto=claro] #q-origen.profesor,[data-aspecto=claro] #q-origen.oficial{color:#047857}",
    // Tema claro: sombras suaves en vez de bordes oscuros.
    "[data-aspecto=claro] .mode-btn,[data-aspecto=claro] .stat-card,[data-aspecto=claro] .topic-card{box-shadow:0 1px 2px rgba(31,42,51,.06)}",
    "[data-aspecto=claro] .mode-btn:hover{box-shadow:0 3px 10px rgba(31,42,51,.10)}",
    // Portada ordenada: grupos dentro de la rejilla de modos y modos apagados ocultos.
    ".mode-grid .mode-btn.disabled{display:none}",
    ".mode-grupo{grid-column:1/-1;font-size:.8rem;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--text2);margin:10px 0 0}",
    ".mode-grupo[data-g=practicar]{margin-top:0} .mode-grupo .sub{text-transform:none;letter-spacing:0;font-weight:400;margin-left:6px;opacity:.85}",
    ".grupo-estudiar{font-size:.8rem;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--text2);margin:24px 0 10px}",
    // Panel de aspecto.
    "#aspecto-btn{position:fixed;left:14px;bottom:14px;z-index:60;width:42px;height:42px;border-radius:50%;border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:1.15rem;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.25)}",
    "#aspecto-panel{position:fixed;left:14px;bottom:64px;z-index:61;width:270px;max-width:calc(100vw - 28px);background:var(--surface);color:var(--text);border:1px solid var(--border);border-radius:12px;padding:12px 14px;box-shadow:0 8px 24px rgba(0,0,0,.3);font-size:.9rem}",
    "#aspecto-panel b{display:block;font-size:.75rem;text-transform:uppercase;letter-spacing:.05em;color:var(--text2);margin:10px 0 6px} #aspecto-panel b:first-child{margin-top:0}",
    "#aspecto-panel .fila{display:flex;gap:6px;flex-wrap:wrap;align-items:center}",
    "#aspecto-panel button{background:var(--surface2);border:1px solid var(--border);color:var(--text);border-radius:8px;padding:6px 10px;cursor:pointer;font:inherit;font-size:.85rem}",
    "#aspecto-panel button.act{border-color:var(--accent);box-shadow:inset 0 0 0 1px var(--accent);font-weight:600}",
    "#aspecto-panel label{display:flex;gap:8px;align-items:center;margin:6px 0;cursor:pointer;font-size:.86rem} #aspecto-panel input{accent-color:var(--accent)}",
    "#aspecto-panel .muestra{display:inline-block;width:12px;height:12px;border-radius:3px;background:var(--accent);vertical-align:-1px;margin-right:2px}",
    "body.en-quiz #aspecto-btn,body.en-quiz #aspecto-panel{display:none}"
  ].join("");

  // ------------------------------------------------------------------ panel
  var btn, panel;
  function montarPanel() {
    btn = document.createElement("button");
    btn.id = "aspecto-btn"; btn.type = "button"; btn.title = "Aspecto: colores y tamaño de letra"; btn.textContent = "🎨";
    panel = document.createElement("div");
    panel.id = "aspecto-panel"; panel.hidden = true;
    btn.onclick = function () { panel.hidden = !panel.hidden; };
    document.addEventListener("click", function (ev) {
      if (!panel.hidden && !panel.contains(ev.target) && ev.target !== btn) panel.hidden = true;
    });
    panel.addEventListener("click", function (ev) {
      var b = ev.target.closest("[data-a]");
      if (!b) return;
      var a = b.getAttribute("data-a"), v = b.getAttribute("data-v");
      if (a === "tema") pref.tema = v;
      if (a === "letra") {
        var i = LETRAS.indexOf(pref.letra) + (v === "+" ? 1 : v === "-" ? -1 : 0);
        pref.letra = v === "0" ? 100 : LETRAS[Math.max(0, Math.min(LETRAS.length - 1, i))];
      }
      guardar(pref); aplicar();
    });
    panel.addEventListener("change", function (ev) {
      var k = ev.target.getAttribute("data-k");
      if (!k) return;
      pref[k] = ev.target.checked;
      guardar(pref); aplicar();
      if (k === "indice") plegarIndice();
    });
    document.body.appendChild(btn);
    document.body.appendChild(panel);
    pintarPanel();
  }

  function pintarPanel() {
    if (!panel) return;
    var h = "<b>Colores</b><div class='fila'>";
    for (var k in TEMAS) h += "<button data-a='tema' data-v='" + k + "' class='" + (pref.tema === k ? "act" : "") + "'>" + TEMAS[k].nombre + "</button>";
    h += "</div><b>Tamaño de letra</b><div class='fila'>" +
      "<button data-a='letra' data-v='-'>A−</button><button data-a='letra' data-v='0'>" + pref.letra + " %</button><button data-a='letra' data-v='+'>A+</button></div>";
    h += "<b>Más</b>";
    if (asig) h += "<label><input type='checkbox' data-k='color'" + (pref.color ? " checked" : "") + "> <span><span class='muestra'></span> Color propio de la asignatura</span></label>";
    h += "<label><input type='checkbox' data-k='indice'" + (pref.indice ? " checked" : "") + "> Ver siempre el índice de números al hacer preguntas</label>";
    panel.innerHTML = h;
  }

  // ------------------------------------------------------------------ índice de números
  // En pantalla ancha el índice (la rejilla con el número de cada pregunta) sale plegado;
  // se abre con «☰ Índice» como siempre. En el móvil ya iba plegado.
  function plegarIndice() {
    if (typeof State === "undefined") return;
    var sb = document.getElementById("quiz-sidebar");
    if (!sb || window.innerWidth <= 700) return;
    State.sidebarHidden = !pref.indice;
    sb.classList.toggle("collapsed", State.sidebarHidden);
  }

  // ------------------------------------------------------------------ portada por grupos
  var GRUPOS = [
    { id: "practicar", titulo: "🎯 Practicar", sub: "preguntas nuevas, simulacro y temas",
      botones: ["#btn-resume", "#btn-coach", "#btn-today", "[onclick*=openExamSetup]", "[onclick*=\"'all'\"]", "[onclick*=\"'topic'\"]", "#btn-cards"] },
    { id: "repasar", titulo: "🔁 Repasar", sub: "los modos sin preguntas todavía se ocultan",
      botones: ["#btn-due", "#btn-spaced", "#btn-failed", "#btn-surefail", "#btn-marked", "#btn-hard", "#btn-combo"] }
  ];
  function ordenarPortada() {
    var rej = document.querySelector(".mode-grid");
    if (!rej) return;
    var orden = 0;
    GRUPOS.forEach(function (g) {
      var t = rej.querySelector(".mode-grupo[data-g='" + g.id + "']");
      if (!t) {
        t = document.createElement("div");
        t.className = "mode-grupo"; t.setAttribute("data-g", g.id);
        t.innerHTML = g.titulo + "<span class='sub'>· " + g.sub + "</span>";
        rej.insertBefore(t, rej.firstChild);
      }
      t.style.order = orden++;
      g.botones.forEach(function (s) {
        var b = rej.querySelector(s);
        if (b) b.style.order = orden++;
      });
      // Botones que no estén en la lista (modos nuevos): al final de «Practicar».
      if (g.id === "practicar") orden += 20;
    });
    rej.querySelectorAll(".mode-btn").forEach(function (b) { if (!b.style.order) b.style.order = 20; });
    var tit = rej.parentNode.querySelector(".section-title");
    if (tit && !tit.getAttribute("data-aspecto")) { tit.setAttribute("data-aspecto", "1"); tit.style.display = "none"; }
    subirSala();
  }

  // La sala de estudio arriba, como primer grupo: «📖 Estudiar».
  function subirSala() {
    var sala = document.getElementById("estudio-home"), sec = document.querySelector(".mode-section");
    if (!sala || !sec || sala.getAttribute("data-subida")) return;
    var t = document.createElement("div");
    t.className = "grupo-estudiar"; t.textContent = "📖 Estudiar";
    sec.parentNode.insertBefore(t, sec);
    sec.parentNode.insertBefore(sala, sec);
    sala.setAttribute("data-subida", "1");
  }

  // ------------------------------------------------------------------ arranque
  document.head.appendChild(hoja);
  aplicar();
  function iniciar() {
    montarPanel();
    ordenarPortada();
    plegarIndice();
    var home = document.getElementById("home-screen"), quiz = document.getElementById("quiz-screen");
    if (home && window.MutationObserver) {
      new MutationObserver(function () { ordenarPortada(); }).observe(home, { childList: true, subtree: true });
    }
    if (quiz && window.MutationObserver) {
      var marcar = function () { document.body.classList.toggle("en-quiz", !quiz.classList.contains("hidden")); };
      new MutationObserver(marcar).observe(quiz, { attributes: true, attributeFilter: ["class"] });
      marcar();
    }
    // Si se abre el índice a mano y se vuelve a pulsar, se respeta lo elegido en esa sesión.
    window.addEventListener("resize", function () { if (window.innerWidth <= 700) { var sb = document.getElementById("quiz-sidebar"); if (sb) sb.classList.remove("collapsed"); } });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();

  window.Aspecto = { preferencias: function () { return JSON.parse(JSON.stringify(pref)); }, aplicar: aplicar };
})();
