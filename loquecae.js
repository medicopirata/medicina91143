/* Lo que va a preguntar: un apartado que reúne todo lo que sabemos que cae.
 *
 * Junta en un solo conjunto las preguntas de exámenes de otros años, las que
 * son pistas del profesor (lo que dijo que cae y lo deducido de sus pistas),
 * las tareas hechas en clase (Kahoot, cuestionarios en papel, seminarios,
 * prácticas, campus) y las «vueltas»: 4 preguntas nuevas por cada pregunta de
 * examen y de tarea, que preguntan lo mismo de otra forma (las carga
 * tools/fisio1_vueltas_cargar.py y llevan `de` = id de la pregunta original).
 *
 * El conjunto se reparte en bloques fijos de ~100 preguntas mezcladas (el
 * reparto es determinista: el bloque 7 es siempre el mismo mientras no cambie
 * el conjunto), y hay un modo con las falladas de todo el apartado y otro con
 * las que aún no se han visto. No guarda nada propio: lee el historial de cada
 * pregunta (State.data.qs) y lo calcula al vuelo.
 *
 * Se carga después del motor, el entrenador y el plan:  <script src="loquecae.js"></script>
 */
(function () {
  "use strict";
  if (typeof App === "undefined" || typeof State === "undefined" || typeof ALL_QUESTIONS === "undefined") return;
  var ASIG = STORAGE_KEY.replace(/_study_v\d+$/, "");
  var CONFS = {
    fisio1: { tam: 100, semilla: 20261122,
              tarea: /^(🎯|💻|🧪|🔬)|^Apuntes: (Cuestionario|Test de clase|Examen real)|^📝 Cuestionarios de seminarios/ }
  };
  var CONF = CONFS[ASIG];
  if (!CONF) return;
  var K_SALTA = STORAGE_KEY + "_cae_salta";
  var GRUPOS = { examen: "📝 Exámenes de otros años", pista: "🔴 Pistas del profesor", tarea: "🎯 Tareas de clase", vuelta: "🔁 Vueltas" };

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function grupoDe(q) {
    if (/^📕/.test(q.topicBase)) return null;
    if (q.de) return "vuelta";
    var P = window.PlanExamen, t = P && P.tipo ? P.tipo(q) : null;
    if (t === "examen") return "examen";
    if (CONF.tarea.test(q.topicBase)) return "tarea";
    if (t === "cae" || t === "pistas") return "pista";
    return null;
  }

  // ------------------------------------------------------------ el conjunto
  var _conj = null, _n = -1;
  function conjunto() {
    if (_conj && _n === ALL_QUESTIONS.length) return _conj;
    var l = [], c = { examen: 0, pista: 0, tarea: 0, vuelta: 0 };
    ALL_QUESTIONS.forEach(function (q) {
      if (!Number.isInteger(q.correct)) return;
      var g = grupoDe(q);
      if (!g) return;
      l.push({ q: q, g: g }); c[g]++;
    });
    _conj = { lista: l, cuenta: c }; _n = ALL_QUESTIONS.length;
    return _conj;
  }
  // Generador determinista (mulberry32): el reparto en bloques no cambia entre visitas
  function azar(semilla) {
    var s = semilla | 0;
    return function () { s = s + 0x6D2B79F5 | 0; var t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  var _bloq = null, _bloqN = -1;
  function bloques() {
    var c = conjunto();
    if (_bloq && _bloqN === c.lista.length) return _bloq;
    var ids = c.lista.map(function (x) { return x.q; }).sort(function (a, b) { return a.id - b.id; });
    var r = azar(CONF.semilla + ids.length);
    for (var i = ids.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = ids[i]; ids[i] = ids[j]; ids[j] = t; }
    var n = Math.max(1, Math.round(ids.length / CONF.tam)), tam = Math.ceil(ids.length / n), out = [];
    for (var k = 0; k < n; k++) out.push(ids.slice(k * tam, (k + 1) * tam));
    _bloq = out; _bloqN = c.lista.length;
    return out;
  }
  function estado(q) {
    var s = State.data.qs && State.data.qs[q.id];
    if (!s || !s.a) return "nueva";
    return isFailed(s) ? "fallada" : "bien";
  }
  function resumenBloque(b) {
    var r = { n: b.length, hechas: 0, falladas: 0, bien: 0 };
    b.forEach(function (q) { var e = estado(q); if (e !== "nueva") r.hechas++; if (e === "fallada") r.falladas++; if (e === "bien") r.bien++; });
    return r;
  }
  function saltaBien() { try { return localStorage.getItem(K_SALTA) !== "0"; } catch (e) { return true; } }

  // ------------------------------------------------------------- sesiones
  function empezar(qs, nombre) {
    if (!qs.length) { alert("No hay preguntas en «" + nombre + "»."); return; }
    App.beginSession(qs, "loquecae");
  }
  function abrirBloque(k) {
    var b = bloques()[k] || [];
    var qs = saltaBien() ? b.filter(function (q) { return estado(q) !== "bien"; }) : b.slice();
    if (!qs.length) { alert("El bloque " + (k + 1) + " ya está entero bien. Desmarca «saltar las que ya tengo bien» para repetirlo."); return; }
    empezar(qs, "Bloque " + (k + 1));
  }
  function falladas() { return conjunto().lista.map(function (x) { return x.q; }).filter(function (q) { return estado(q) === "fallada"; }); }
  function sinVer() { return conjunto().lista.map(function (x) { return x.q; }).filter(function (q) { return estado(q) === "nueva"; }); }
  function mezcla(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  // ------------------------------------------------------------- interfaz
  var css = document.createElement("style");
  css.textContent =
    ".mode-btn.cae{border-color:#f59e0b}" +
    "#cae-panel{margin:14px 0 0;border:1px solid #f59e0b;border-radius:12px;background:var(--surface);padding:12px 16px;font-size:.88rem}" +
    "#cae-panel .sub{color:var(--text2);font-size:.8rem}#cae-panel p{margin:4px 0}" +
    "#cae-panel .cae-grupos{display:flex;flex-wrap:wrap;gap:4px 16px;margin:6px 0}" +
    "#cae-panel .cae-acciones{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}" +
    "#cae-panel button{background:var(--surface2);color:var(--text);border:1px solid var(--border);border-radius:8px;padding:6px 12px;cursor:pointer;font-size:.86rem}" +
    "#cae-panel button:hover{border-color:#f59e0b}#cae-panel button.pri{border-color:#f59e0b;font-weight:600}" +
    "#cae-panel label{display:flex;align-items:center;gap:8px;cursor:pointer;margin:6px 0}#cae-panel input[type=checkbox]{accent-color:#f59e0b;width:15px;height:15px}" +
    "#cae-panel .cae-bloques{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin-top:8px}" +
    "#cae-panel .cae-bloque{text-align:left;padding:8px 10px;display:flex;flex-direction:column;gap:4px}" +
    "#cae-panel .cae-bloque b{font-size:.9rem}#cae-panel .cae-bloque .m{font-size:.76rem;color:var(--text2)}" +
    "#cae-panel .cae-bloque .barra{height:5px;border-radius:3px;background:var(--border);overflow:hidden;display:flex}" +
    "#cae-panel .cae-bloque .barra i{display:block;height:100%}#cae-panel .cae-bloque .barra .ok{background:#34d399}#cae-panel .cae-bloque .barra .ko{background:#f87171}" +
    "#cae-panel .cae-bloque.hecho{border-color:#34d399}#cae-panel .cae-bloque.enmarcha{border-color:#fbbf24}";
  document.head.appendChild(css);

  function pintarPanel() {
    var panel = document.getElementById("cae-panel");
    if (!panel) return;
    var c = conjunto(), bl = bloques(), tot = c.lista.length, f = falladas().length, nv = sinVer().length;
    var h = "<b>🎯 Lo que va a preguntar</b> <span class=\"sub\">· todo lo que sabemos que cae, en bloques de ~" + CONF.tam + " preguntas mezcladas</span>" +
      '<div class="cae-grupos">' + ["examen", "pista", "tarea", "vuelta"].map(function (g) { return "<span>" + esc(GRUPOS[g]) + " <b>" + c.cuenta[g].toLocaleString("es") + "</b></span>"; }).join("") +
      "<span>Total <b>" + tot.toLocaleString("es") + "</b></span></div>" +
      '<p class="sub">Exámenes de otros años, lo que el profesor dijo o dio a entender que cae, las tareas de clase y, por cada pregunta de examen o de tarea, 4 vueltas que preguntan lo mismo de otra forma. Hechas ' + (tot - nv).toLocaleString("es") + " de " + tot.toLocaleString("es") + " · falladas " + f + ".</p>" +
      '<div class="cae-acciones"><button class="pri" data-cae="falladas">❌ Falladas de este apartado (' + f + ")</button>" +
      '<button data-cae="nuevas">⚪ Sin ver (' + nv.toLocaleString("es") + ")</button>" +
      '<button data-cae="azar">🔀 ' + CONF.tam + " al azar de todo</button></div>" +
      '<label><input type="checkbox" id="cae-salta"' + (saltaBien() ? " checked" : "") + "> Al abrir un bloque, saltar las que ya tengo bien</label>" +
      '<div class="cae-bloques">' + bl.map(function (b, k) {
        var r = resumenBloque(b), cls = r.hechas === r.n && !r.falladas ? "hecho" : r.hechas ? "enmarcha" : "";
        return '<button class="cae-bloque ' + cls + '" data-cae="bloque" data-k="' + k + '"><b>Bloque ' + (k + 1) + "</b>" +
          '<span class="barra"><i class="ok" style="width:' + (r.bien * 100 / r.n) + '%"></i><i class="ko" style="width:' + (r.falladas * 100 / r.n) + '%"></i></span>' +
          '<span class="m">' + r.n + " preguntas · " + r.hechas + " hechas" + (r.falladas ? " · " + r.falladas + " ✗" : "") + "</span></button>";
      }).join("") + "</div>";
    panel.innerHTML = h;
  }
  function pintarPortada() {
    var rejilla = document.querySelector(".mode-grid"), hoyBtn = document.getElementById("btn-today");
    if (!rejilla || !hoyBtn) return;
    var btn = document.getElementById("btn-cae");
    if (!btn) {
      btn = document.createElement("button");
      btn.className = "mode-btn cae"; btn.id = "btn-cae";
      btn.innerHTML = '<span class="icon">🎯</span><span class="title">Lo que va a preguntar</span><span class="desc" id="cae-desc"></span>';
      btn.onclick = function () {
        var p = document.getElementById("cae-panel");
        p.open = !p.open;
        if (p.open) { pintarPanel(); p.scrollIntoView && p.scrollIntoView({ block: "nearest" }); }
      };
      rejilla.insertBefore(btn, hoyBtn);
    }
    var panel = document.getElementById("cae-panel");
    if (!panel) {
      panel = document.createElement("details");
      panel.id = "cae-panel";
      panel.innerHTML = "<summary style=\"display:none\"></summary>";
      var coach = document.getElementById("coach-ambito") || rejilla;
      coach.parentNode.insertBefore(panel, coach.nextSibling);
      panel.addEventListener("click", function (ev) {
        var b = ev.target.closest ? ev.target.closest("[data-cae]") : null;
        if (!b) return;
        ev.preventDefault();
        var a = b.getAttribute("data-cae");
        if (a === "bloque") abrirBloque(+b.getAttribute("data-k"));
        else if (a === "falladas") empezar(mezcla(falladas()), "Falladas de este apartado");
        else if (a === "nuevas") empezar(mezcla(sinVer()).slice(0, CONF.tam), "Sin ver");
        else if (a === "azar") empezar(mezcla(conjunto().lista.map(function (x) { return x.q; })).slice(0, CONF.tam), "Al azar");
      });
      panel.addEventListener("change", function (ev) {
        if (ev.target && ev.target.id === "cae-salta") { try { localStorage.setItem(K_SALTA, ev.target.checked ? "1" : "0"); } catch (e) {} }
      });
    }
    var c = conjunto(), bl = bloques(), hechos = bl.filter(function (b) { var r = resumenBloque(b); return r.hechas === r.n && !r.falladas; }).length;
    document.getElementById("cae-desc").textContent =
      c.lista.length.toLocaleString("es") + " preguntas que sabemos que caen · " + bl.length + " bloques de ~" + CONF.tam + " · " + hechos + " hechos · " + falladas().length + " falladas";
    if (panel.open) pintarPanel();
  }

  var stats0 = App.updateHomeStats;
  App.updateHomeStats = function () {
    stats0.apply(this, arguments);
    try { pintarPortada(); } catch (e) { console.warn("loquecae", e); }
  };
  try { pintarPortada(); } catch (e) { console.warn("loquecae", e); }

  window.LoQueCae = { conjunto: conjunto, bloques: bloques, falladas: falladas, sinVer: sinVer, grupo: grupoDe, abrirBloque: abrirBloque, pintar: pintarPortada };
})();
