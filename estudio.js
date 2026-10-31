/* Modo estudio: la «sala de estudio» de la plataforma.
 *
 * Cada tema se estudia por apartados cortos: una pregunta real antes de leer
 * (no cuenta: prepara la memoria), la explicación con cuadros y esquemas, lo
 * que cae en examen marcado (🔥 peso, 🎯 así lo preguntan, ⚠️ trampa) y una
 * comprobación al acabar. Al final del tema, un cuadro para rellenar, un
 * «explícalo sin mirar» y la batería de preguntas del tema, que va por el
 * motor de siempre (cuenta para el avance, los repasos y el plan).
 *
 * No toca nada de lo que hay: añade su cuadro en la portada y su pantalla.
 * Los temas viven en estudio/<clave>/tema-NN.json (formato en
 * tools/estudio_instrucciones.md); si la plataforma no tiene carpeta, no hace nada.
 * Guarda en STORAGE_KEY + "_estudio" (sincronizado entre dispositivos).
 *
 * Se carga después del motor:  <script src="estudio.js"></script>
 */
(function () {
  "use strict";
  if (typeof App === "undefined" || typeof State === "undefined" || typeof ALL_QUESTIONS === "undefined") return;

  var CLAVE = STORAGE_KEY.replace(/_study_v\d+$/, "");
  var K = STORAGE_KEY + "_estudio";
  var CARPETA = "estudio/" + CLAVE + "/";
  var indice = null, temas = {}, vista = null;

  // ------------------------------------------------------------------ estado
  // { t: { "7": { paso, resp: {clave: 0|1}, huecos: {i: 0|1}, expl: {i: 0|1|2}, ini, fin } } }
  function leer() { try { var d = JSON.parse(localStorage.getItem(K) || "{}"); return d && typeof d === "object" ? d : {}; } catch (e) { return {}; } }
  var _d = leer();
  if (!_d.t) _d.t = {};
  function guardar() { try { localStorage.setItem(K, JSON.stringify(_d)); } catch (e) {} }
  function est(n) { return _d.t[n] || (_d.t[n] = { paso: 0, resp: {}, huecos: {}, expl: {} }); }

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function md(s) {
    var lineas = esc(s).split(/\n/), out = [], lista = false;
    lineas.forEach(function (l) {
      var m = l.match(/^\s*[-•]\s+(.*)/);
      if (m) { if (!lista) { out.push("<ul>"); lista = true; } out.push("<li>" + inl(m[1]) + "</li>"); return; }
      if (lista) { out.push("</ul>"); lista = false; }
      if (l.trim()) out.push("<p>" + inl(l) + "</p>");
    });
    if (lista) out.push("</ul>");
    return out.join("");
  }
  function inl(s) { return s.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/(^|[^*])\*([^*\s][^*]*?)\*/g, "$1<i>$2</i>"); }
  // Nombre de un tema en pantalla: «Tema 7» o, si el índice trae etiqueta, «Lección 6» (corta: «L6»)
  function nombre(e) { return e.etiqueta || "Tema " + e.tema; }
  function corto(e) { return e.corta || "T" + e.tema; }
  function fuego(p) { p = p || 0; return p ? "🔥".repeat(p) : "·"; }
  function norma(x) { return String(x).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9⁺⁻₀-₉]+/g, " ").trim(); }

  // ------------------------------------------------------------------ datos
  function pedir(ruta) {
    return fetch(CARPETA + ruta, { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
  }
  function cargarIndice() {
    return pedir("indice.json").then(function (d) { indice = d; return d; });
  }
  function cargarTema(n) {
    if (temas[n]) return Promise.resolve(temas[n]);
    var e = (indice.temas || []).filter(function (x) { return x.tema === n; })[0];
    return pedir(e.archivo).then(function (t) { temas[n] = t; return t; });
  }

  // Pasos de un tema: intro · un paso por apartado · rellenar · explícalo · batería
  function pasos(t) {
    var p = [{ k: "intro" }];
    t.secciones.forEach(function (s, i) { p.push({ k: "sec", i: i }); });
    if (t.rellenar && !Array.isArray(t.rellenar)) t.rellenar = [t.rellenar];
    if (t.rellenar && t.rellenar.length) p.push({ k: "rellenar" });
    if (t.explicalo && t.explicalo.length) p.push({ k: "explicalo" });
    p.push({ k: "fin" });
    return p;
  }

  // Lo que se sabe de la batería, con lo que el motor ya apunta de cada pregunta
  function dominioBateria(ids) {
    var hechas = 0, bien = 0, ultima = 0;
    (ids || []).forEach(function (id) {
      var s = State.data.qs && State.data.qs[id];
      if (!s || !s.a) return;
      hechas++;
      var ult = Array.isArray(s.h) && s.h.length ? s.h[s.h.length - 1] : null;
      if (ult ? ult[1] : s.c >= s.a / 2) bien++;
      if (ult && ult[0] * 1000 > ultima) ultima = ult[0] * 1000;
    });
    return { n: (ids || []).length, hechas: hechas, bien: bien, ultima: ultima };
  }

  // Cuánto lleva hecho de un tema, de 0 a 1: la lectura pesa la mitad y la batería la otra mitad
  function avanceTema(e) {
    var s = _d.t[e.tema];
    if (!s) return 0;
    var tot = (e.secciones || 1) + 3, lectura = s.fin ? 1 : Math.min(1, (s.paso || 0) / tot);
    var b = s.bat, bat = b && b.n ? Math.min(1, b.bien / (b.n * 0.8)) : 0;
    return lectura * 0.5 + bat * 0.5;
  }
  // Repaso espaciado del tema: el intervalo crece con lo bien que va la batería (2, 3, 6, 12 o 20 días)
  function intervaloTema(e) {
    var s = _d.t[e.tema], b = s && s.bat;
    if (!b || !b.n || !b.hechas) return 2;
    var p = b.bien / b.n;
    return p >= 0.8 && b.hechas >= b.n * 0.8 ? 20 : p >= 0.7 ? 12 : p >= 0.5 ? 6 : p >= 0.3 ? 3 : 2;
  }
  // Días que faltan para repasar el tema (0 o menos: toca hoy); null si aún no se ha leído
  function proximoRepaso(e) {
    var s = _d.t[e.tema];
    if (!s || !s.fin) return null;
    return intervaloTema(e) - diasSinTocar(e);
  }
  // Días desde que se estudió o se hizo la batería por última vez (para el repaso espaciado)
  function diasSinTocar(e) {
    var s = _d.t[e.tema];
    if (!s || !s.fin) return 0;
    var ult = Math.max(s.fin, (s.bat && s.bat.ultima) || 0);
    return Math.floor((Date.now() - ult) / 864e5);
  }

  function estadoTema(e) {
    var s = _d.t[e.tema], b = s && s.bat;
    if (!s || (!s.paso && !s.fin)) return { txt: "Sin empezar", cls: "nada" };
    if (!s.fin) return { txt: "Leyendo · apartado " + Math.max(1, Math.min(s.paso, e.secciones)) + "/" + e.secciones, cls: "curso" };
    var pr = proximoRepaso(e), cuando = pr <= 0 ? "" : " · repaso " + (pr === 1 ? "mañana" : "en " + pr + " días");
    if (pr !== null && pr <= 0 && (b && b.hechas)) return { txt: "🔁 Toca repasar (hace " + diasSinTocar(e) + " días) · batería " + b.bien + "/" + b.n + " bien", cls: "hecho repasar" + (b.n && b.hechas >= b.n * 0.8 && b.bien >= b.hechas * 0.8 ? " dominado" : "") };
    if (b && b.n && b.hechas >= b.n * 0.8 && b.bien >= b.hechas * 0.8) return { txt: "Dominado" + cuando, cls: "dominado" };
    if (b && b.hechas) return { txt: "Estudiado · batería " + b.bien + "/" + b.n + " bien" + cuando, cls: "hecho" };
    return { txt: "Estudiado · falta la batería", cls: "hecho" };
  }

  // ------------------------------------------------------------------ portada
  function pintarPortada() {
    if (!indice) return;
    var ancla = document.getElementById("plan-ex") || document.querySelector(".mode-grid");
    if (!ancla) return;
    var caja = document.getElementById("estudio-home");
    if (!caja) {
      caja = document.createElement("details");
      caja.id = "estudio-home";
      try { caja.open = localStorage.getItem(K + "_abierto") !== "0"; } catch (e) { caja.open = true; }
      caja.addEventListener("toggle", function () { try { localStorage.setItem(K + "_abierto", caja.open ? "1" : "0"); } catch (e) {} });
      ancla.parentNode.insertBefore(caja, ancla);
      caja.addEventListener("click", function (ev) {
        var b = ev.target.closest("[data-est]");
        if (!b) return;
        ev.preventDefault();
        var n = +b.getAttribute("data-n");
        var acc = b.getAttribute("data-est");
        if (acc === "abrir") abrir(n);
        else if (acc === "rep") repasoInteligente(n);
        else if (acc === "tutor") Tutor.abrir(null);
        else bateria(n, acc === "bat-ex");
      });
    }
    var lista = indice.temas || [];
    lista.forEach(function (e) {
      var s = _d.t[e.tema];
      if (s && temas[e.tema]) s.bat = dominioBateria(temas[e.tema].bateria);
    });
    var hechos = lista.filter(function (e) { return _d.t[e.tema] && _d.t[e.tema].fin; }).length;
    var sig = lista.filter(function (e) { return !(_d.t[e.tema] && _d.t[e.tema].fin); })[0];
    var bloques = [];
    lista.forEach(function (e) { if (bloques.indexOf(e.bloque) < 0) bloques.push(e.bloque); });
    var cuenta = { dominado: 0, hecho: 0, curso: 0, nada: 0 }, pct = 0, minTot = 0, minHechos = 0, batN = 0, batHechas = 0, batBien = 0;
    lista.forEach(function (e) {
      var c = estadoTema(e).cls.split(" ")[0], s = _d.t[e.tema];
      cuenta[c]++;
      pct += avanceTema(e);
      minTot += e.minutos || 0;
      if (s && s.fin) minHechos += e.minutos || 0;
      if (s && s.bat) { batN += s.bat.n; batHechas += s.bat.hechas; batBien += s.bat.bien; }
    });
    pct = lista.length ? Math.round(pct * 100 / lista.length) : 0;
    var h = '<summary><b>📖 Sala de estudio</b> <span class="sub">· estudia los temas uno a uno, sabiendo qué cae · ' + hechos + "/" + lista.length + " estudiados · " + pct + "%</span></summary>";
    h += '<div class="est-cuerpo">';
    h += '<div class="est-prog"><div class="est-prog-barra">' + ["dominado", "hecho", "curso"].map(function (c) {
      return cuenta[c] ? '<div class="' + c + '" style="width:' + (cuenta[c] * 100 / lista.length) + '%"></div>' : "";
    }).join("") + "</div>";
    h += '<div class="est-prog-ley"><span><i class="dominado"></i>' + cuenta.dominado + " dominados</span><span><i class=\"hecho\"></i>" + cuenta.hecho + " estudiados</span><span><i class=\"curso\"></i>" + cuenta.curso + " a medias</span><span><i></i>" + cuenta.nada + " sin empezar</span></div>";
    h += '<div class="est-prog-num"><div><b>' + pct + "%</b><span>de la asignatura</span></div><div><b>" + Math.round(minHechos / 60 * 10) / 10 + "/" + Math.round(minTot / 60) + " h</b><span>de lectura</span></div>" +
      (batN ? "<div><b>" + batBien + "/" + batN + "</b><span>baterías bien (" + batHechas + " hechas)</span></div>" : "") + "</div></div>";
    if (sig) {
      var ss = _d.t[sig.tema];
      h += '<button class="est-sig" data-est="abrir" data-n="' + sig.tema + '">▶️ ' + (ss && ss.paso ? "Seguir con" : "Estudiar") + " " + (sig.etiqueta || "el Tema " + sig.tema) + " · " + esc(sig.titulo) + ' <span class="sub">(' + (sig.minutos || "?") + " min)</span></button>";
    }
    h += cuadroRepasos(lista);
    h += '<p class="est-ayuda">Un tema por sesión: lee por apartados, responde antes y después de cada uno, y termina con la batería del tema. 🔥 = cuánto cae en examen.</p>';
    bloques.forEach(function (bl) {
      h += '<div class="est-bloque"><div class="est-bloque-t">' + esc(bl) + "</div>";
      lista.filter(function (e) { return e.bloque === bl; }).forEach(function (e) {
        var st = estadoTema(e), s = _d.t[e.tema];
        var av = Math.round(avanceTema(e) * 100);
        h += '<div class="est-fila ' + st.cls + '"><button class="est-tema" data-est="abrir" data-n="' + e.tema + '"><span class="n">' + esc(corto(e)) + "</span> " + esc(e.titulo) +
          '<span class="meta"><span title="Peso en examen">' + fuego(e.peso) + "</span> · " + (e.minutos || "?") + " min · " + st.txt + "</span>" +
          '<span class="est-mini" title="' + av + '% del tema (lectura y batería)"><span style="width:' + av + '%"></span></span></button>' +
          '<button class="est-bat" data-est="bat" data-n="' + e.tema + '" title="Batería de preguntas del tema">🎯 ' + (e.bateria || "") + "</button></div>";
      });
      h += "</div>";
    });
    h += "</div>";
    caja.innerHTML = h;
  }

  // ------------------------------------------------------------------ pantalla
  function pantalla() {
    var p = document.getElementById("estudio-screen");
    if (!p) {
      p = document.createElement("div");
      p.id = "estudio-screen";
      p.className = "hidden";
      var home = document.getElementById("home-screen");
      home.parentNode.insertBefore(p, home.nextSibling);
      p.addEventListener("click", clic);
      p.addEventListener("input", function (ev) { if (ev.target.matches(".est-hueco")) ev.target.classList.remove("ok", "mal"); });
    }
    return p;
  }
  function mostrar(si) {
    var p = pantalla();
    ["home-screen", "quiz-screen", "results-screen"].forEach(function (id) { var x = document.getElementById(id); if (x && si) x.classList.add("hidden"); });
    p.classList.toggle("hidden", !si);
    if (si) window.scrollTo(0, 0);
  }
  var show0 = App.showScreen;
  App.showScreen = function () { var p = document.getElementById("estudio-screen"); if (p) p.classList.add("hidden"); return show0.apply(this, arguments); };

  function abrir(n) {
    cargarTema(n).then(function (t) {
      var s = est(n);
      if (!s.ini) { s.ini = Date.now(); guardar(); }
      vista = { n: n, t: t, pasos: pasos(t) };
      if (s.paso >= vista.pasos.length) s.paso = vista.pasos.length - 1;
      mostrar(true);
      pintar();
    }).catch(function (e) { console.warn("estudio", e); alert("No se ha podido cargar el tema. Revisa la conexión."); });
  }
  function salir() { vista = null; mostrar(false); App.goHome(); }

  function irPaso(i) {
    var s = est(vista.n);
    s.paso = Math.max(0, Math.min(i, vista.pasos.length - 1));
    guardar();
    pintar();
    window.scrollTo(0, 0);
  }

  // ----- preguntas dentro del estudio
  function pregunta(ref, clave, etiqueta) {
    var q = typeof ref === "number" ? BY_ID.get(ref) : ref;
    if (!q) return "";
    var s = est(vista.n), r = s.resp[clave], hecha = r !== undefined;
    var orden = q.options.map(function (_, i) { return i; });
    var h = '<div class="est-q' + (hecha ? " hecha" : "") + '" data-clave="' + esc(clave) + '">';
    var deExamen = q.topicBase && (/^📝/.test(q.topicBase) || /Examen/.test(q.topicBase));
    h += '<div class="est-q-et">' + etiqueta + (deExamen ? " · 📝 " + esc(q.topicBase.replace(/^📝\s*/, "")) : q.caida ? " · 📝 cayó en " + esc(q.caida.join(", ")) : /^🎯/.test(q.topicBase || "") ? " · 🎯 Kahoot / clase" : "") + "</div>";
    if (q.img) h += '<img class="est-img" src="' + esc(q.img) + '" alt="" loading="lazy">';
    h += '<div class="est-q-txt">' + esc(q.q) + "</div>";
    orden.forEach(function (i) {
      var cls = "";
      if (hecha) cls = i === q.correct ? " ok" : (s.resp[clave + "_o"] === i ? " mal" : " apag");
      h += '<button class="est-op' + cls + '" data-q="' + esc(clave) + '" data-o="' + i + '"' + (hecha ? " disabled" : "") + ">" + "abcdefgh"[i] + ") " + esc(q.options[i]) + "</button>";
    });
    if (hecha) h += '<div class="est-exp">' + (r ? "✅ " : "❌ ") + esc(q.exp || "") + "</div>";
    return h + "</div>";
  }
  function refDe(clave) {
    var t = vista.t, m = clave.split(":");
    if (m[0] === "pre" || m[0] === "com") {
      var s = t.secciones[+m[1]], arr = m[0] === "pre" ? s.previa : s.comprueba;
      return arr[+m[2]];
    }
    return null;
  }

  // ----- bloques de contenido
  function bloque(b) {
    switch (b.tipo) {
      case "texto": return '<div class="est-txt">' + md(b.md) + "</div>";
      case "clave": return '<div class="est-caja clave"><b>💡 La idea</b>' + md(b.md) + "</div>";
      case "asi": return '<div class="est-caja asi"><b>🎯 Así lo preguntan</b>' + md(b.md) + "</div>";
      case "libro": return '<div class="est-caja libro"><b>📗 ' + esc(b.titulo || "Qué dice el Sisinio") + '</b>' + md(b.md) + "</div>";
      case "trampa": return '<div class="est-caja trampa"><b>⚠️ Trampa</b>' + md(b.md) + "</div>";
      case "porque": return '<details class="est-caja porque"><summary><b>🤔 ' + esc(b.pregunta) + '</b> <span class="sub">(piénsalo antes de abrir)</span></summary>' + md(b.respuesta) + "</details>";
      case "formula": return '<div class="est-formula"><div class="expr">' + esc(b.expr) + "</div>" + (b.md ? md(b.md) : "") + "</div>";
      case "img": return '<figure class="est-fig"><img class="est-img" src="' + esc(b.src) + '" alt="" loading="lazy">' + (b.pie ? "<figcaption>" + esc(b.pie) + "</figcaption>" : "") + "</figure>";
      case "cuadro":
        var h = '<div class="est-cuadro">' + (b.titulo ? '<div class="est-cuadro-t">' + esc(b.titulo) + "</div>" : "") + '<div class="est-scroll"><table><thead><tr>';
        b.cab.forEach(function (c) { h += "<th>" + inl(esc(c)) + "</th>"; });
        h += "</tr></thead><tbody>";
        b.filas.forEach(function (f) { h += "<tr>" + f.map(function (c, i) { return (i ? "<td>" : "<th>") + inl(esc(c)) + (i ? "</td>" : "</th>"); }).join("") + "</tr>"; });
        return h + "</tbody></table></div></div>";
      case "parejas":
        return '<div class="est-parejas">' + (b.titulo ? '<div class="est-cuadro-t">' + esc(b.titulo) + "</div>" : "") + '<div class="sub">Piensa la pareja y toca para comprobar.</div>' +
          b.pares.map(function (x) { return '<div class="par"><span class="izq">' + inl(esc(x[0])) + '</span><button class="der" data-acc="par">' + inl(esc(x[1])) + "</button></div>"; }).join("") + "</div>";
      case "cifras":
        return '<div class="est-cifras">' + (b.titulo ? '<div class="est-cuadro-t">' + esc(b.titulo) + "</div>" : "") + '<div class="rej">' +
          b.items.map(function (x) { return '<div class="cifra"><b>' + inl(esc(x[0])) + "</b><span>" + inl(esc(x[1])) + "</span></div>"; }).join("") + "</div></div>";
      case "flujo":
        if (b.ramas) return '<div class="est-flujo">' + (b.titulo ? '<div class="est-cuadro-t">' + esc(b.titulo) + "</div>" : "") + (b.pasos && b.pasos.length ? '<div class="pasos">' + b.pasos.map(function (p) { return '<div class="paso">' + inl(esc(p)) + "</div>"; }).join('<div class="flecha">↓</div>') + '<div class="flecha">↙ ↘</div></div>' : "") +
          '<div class="ramas">' + b.ramas.map(function (r) { return '<div class="pasos">' + (r.titulo ? '<div class="rama-t">' + esc(r.titulo) + "</div>" : "") + r.pasos.map(function (p) { return '<div class="paso">' + inl(esc(p)) + "</div>"; }).join('<div class="flecha">↓</div>') + "</div>"; }).join("") + "</div></div>";
        return '<div class="est-flujo">' + (b.titulo ? '<div class="est-cuadro-t">' + esc(b.titulo) + "</div>" : "") + '<div class="pasos">' +
          b.pasos.map(function (p) { return '<div class="paso">' + inl(esc(p)) + "</div>"; }).join('<div class="flecha">↓</div>') + "</div></div>";
      case "bucle":
        var ps = [["Estímulo", b.estimulo], ["Sensor", b.sensor], ["Centro", b.centro], ["Efector", b.efector], ["Respuesta", b.respuesta]].filter(function (x) { return x[1] && x[1] !== "—"; });
        return '<div class="est-flujo bucle">' + (b.titulo ? '<div class="est-cuadro-t">' + esc(b.titulo) + "</div>" : "") + '<div class="pasos">' +
          ps.map(function (x) { return '<div class="paso"><span class="rol">' + x[0] + "</span>" + inl(esc(x[1])) + "</div>"; }).join('<div class="flecha">↓</div>') +
          '</div><div class="vuelta">↺ retroalimentación ' + esc(b.signo || "negativa") + ": la respuesta corrige el estímulo</div></div>";
    }
    return "";
  }

  // ----- pintar el paso actual
  function pintar() {
    if (!vista) return;
    var t = vista.t, s = est(vista.n), p = vista.pasos[s.paso], tot = vista.pasos.length;
    var h = '<div class="est-top"><button class="est-salir" data-acc="salir">← Salir</button><div class="est-tit">' + esc(nombre(t)) + " · " + esc(t.titulo) + "</div>" +
      '<div class="est-barra"><div style="width:' + Math.round(s.paso * 100 / (tot - 1)) + '%"></div></div>' +
      '<div class="est-donde">' + (p.k === "sec" ? "Apartado " + (p.i + 1) + " de " + t.secciones.length : p.k === "intro" ? "Inicio" : p.k === "rellenar" ? "Rellenar" : p.k === "explicalo" ? "Explícalo" : "Batería") + " · " + Math.round(s.paso * 100 / (tot - 1)) + "% del tema</div>" +
      '<div class="est-migas">' + vista.pasos.map(function (x, i) {
        var nom = x.k === "intro" ? "Inicio" : x.k === "sec" ? (i) + "" : x.k === "rellenar" ? "✍️" : x.k === "explicalo" ? "🗣️" : "🎯";
        var ok = x.k === "sec" ? notaSeccion(s, t, x.i) : null;
        return '<button class="miga' + (i === s.paso ? " act" : i < s.paso || s.fin ? " vista" : "") + (ok === 1 ? " bien" : ok === 0 ? " floja" : "") + '" data-acc="ir" data-i="' + i + '" title="' + esc(x.k === "sec" ? t.secciones[x.i].titulo + (ok === 1 ? " · comprobación bien" : ok === 0 ? " · falló alguna comprobación" : "") : "") + '">' + nom + (ok === 1 ? "✓" : "") + "</button>";
      }).join("") + "</div></div>";
    h += '<div class="est-pag">';
    if (p.k === "intro") {
      h += "<h2>" + esc(nombre(t)) + " · " + esc(t.titulo) + "</h2>" + '<div class="est-meta">' + fuego(t.peso) + " · unos " + (t.minutos || "?") + " min · " + t.secciones.length + " apartados</div>";
      h += md(t.intro);
      if (t.pesoPorQue) h += '<div class="est-caja asi"><b>🔥 Qué cae de este tema</b>' + md(t.pesoPorQue) + "</div>";
      h += '<ol class="est-indice">' + t.secciones.map(function (x, i) { var ok = notaSeccion(s, t, i); return '<li><button data-acc="ir" data-i="' + (i + 1) + '">' + esc(x.titulo) + "</button> " + fuego(x.peso) + (ok === 1 ? ' <span class="est-ok">✓ hecho</span>' : ok === 0 ? ' <span class="est-flojo">✓ hecho · repásalo</span>' : "") + "</li>"; }).join("") + "</ol>";
      if (s.notas && s.notas.length) h += '<details class="est-caja notas" open><summary><b>🗂️ Tus notas del tutor</b> <span class="sub">(' + s.notas.length + ")</span></summary>" + s.notas.map(function (x, i) { return '<div class="est-nota">' + pintarRespuesta(x) + '<button class="est-mini-b" data-acc="borra-nota" data-i="' + i + '">Quitar</button></div>'; }).join("") + "</details>";
      h += '<div class="est-caja clave"><b>Cómo se usa</b><ul><li>En cada apartado, primero una pregunta real <b>antes de leer</b>: respóndela aunque no la sepas (no cuenta; así lo retienes mejor).</li><li>Lee con calma y abre los 🤔 solo después de pensarlos.</li><li>Al final del apartado, la comprobación. Al final del tema, el cuadro para rellenar, el «explícalo» y la batería.</li></ul></div>';
      h += '<button class="est-sigue" data-acc="ir" data-i="1">Empezar →</button>';
    } else if (p.k === "sec") {
      var sec = t.secciones[p.i], previas = sec.previa || [], pend = previas.some(function (_, j) { return s.resp["pre:" + p.i + ":" + j] === undefined; });
      h += '<div class="est-meta">Apartado ' + (p.i + 1) + " de " + t.secciones.length + ' · <span title="Peso en examen">' + fuego(sec.peso) + "</span></div><h2>" + esc(sec.titulo) + "</h2>";
      if (sec.pesoPorQue) h += '<div class="est-peso">🔥 ' + esc(sec.pesoPorQue) + "</div>";
      if (previas.length) {
        h += '<div class="est-previa"><div class="est-sec-t">🧩 Antes de leer <span class="sub">(no cuenta: respóndela aunque no la sepas)</span></div>';
        previas.forEach(function (r, j) { h += pregunta(r, "pre:" + p.i + ":" + j, "Pregunta previa"); });
        h += "</div>";
      }
      if (pend && !s["leer" + p.i]) {
        h += '<div class="est-velo">Responde la pregunta previa para abrir el apartado. <button data-acc="velo" data-i="' + p.i + '">Abrir sin responder</button></div>';
      } else {
        h += '<div class="est-lectura">' + (sec.bloques || []).map(bloque).join("") + "</div>";
        var com = sec.comprueba || [];
        if (com.length) {
          h += '<div class="est-comprueba"><div class="est-sec-t">✅ Comprueba que lo tienes</div>';
          com.forEach(function (r, j) { h += pregunta(r, "com:" + p.i + ":" + j, "Comprobación"); });
          h += "</div>";
        }
        h += '<button class="est-sigue" data-acc="ir" data-i="' + (s.paso + 1) + '">' + (p.i + 1 < t.secciones.length ? "Siguiente apartado →" : "Terminar la lectura →") + "</button>";
      }
    } else if (p.k === "rellenar") {
      var k = 0;
      h += "<h2>✍️ Rellena sin mirar</h2><p class=\"est-ayuda\">Escribe lo que falta. Recordar cuesta más que releer, y por eso funciona.</p>";
      t.rellenar.forEach(function (r) {
      h += '<div class="est-cuadro"><div class="est-cuadro-t">' + esc(r.titulo || "") + '</div><div class="est-scroll"><table><thead><tr>' + r.cab.map(function (c) { return "<th>" + esc(c) + "</th>"; }).join("") + "</tr></thead><tbody>";
      r.filas.forEach(function (f) {
        h += "<tr>" + f.map(function (c, i) {
          var tag = i ? "td" : "th";
          if (c && typeof c === "object") { var j = k++, v = s.huecos[j]; return "<" + tag + '><input class="est-hueco' + (v === 1 ? " ok" : v === 0 ? " mal" : "") + '" data-j="' + j + '" data-h="' + esc(c.h) + '" autocomplete="off" spellcheck="false">' + (v === 0 ? '<span class="sol">' + esc(c.h) + "</span>" : "") + "</" + tag + ">"; }
          return "<" + tag + ">" + inl(esc(c)) + "</" + tag + ">";
        }).join("") + "</tr>";
      });
      h += "</tbody></table></div></div>";
      });
      h += '<div class="est-botones"><button data-acc="corregir">Comprobar</button><button data-acc="soluciones">Ver soluciones</button></div>';
      h += '<button class="est-sigue" data-acc="ir" data-i="' + (s.paso + 1) + '">Seguir →</button>';
    } else if (p.k === "explicalo") {
      h += '<h2>🗣️ Explícalo sin mirar</h2><p class="est-ayuda">Respóndelo en voz alta o por escrito, y solo después mira la respuesta modelo y puntúate con sinceridad.</p>';
      t.explicalo.forEach(function (x, i) {
        var v = s.expl[i];
        h += '<div class="est-expl"><div class="est-q-txt">' + esc(x.pide) + '</div><textarea rows="3" placeholder="Tu explicación (opcional)…"></textarea>';
        h += '<details' + (v !== undefined ? " open" : "") + '><summary>Ver la respuesta modelo</summary>' + md(x.modelo) +
          '<div class="est-botones">' + ["❌ No me salía", "〰️ A medias", "✅ Lo tenía"].map(function (nm, j) { return '<button class="' + (v === j ? "act" : "") + '" data-acc="expl" data-i="' + i + '" data-v="' + j + '">' + nm + "</button>"; }).join("") + "</div></details></div>";
      });
      h += '<button class="est-sigue" data-acc="ir" data-i="' + (s.paso + 1) + '">Seguir →</button>';
    } else {
      var claves = Object.keys(s.resp).filter(function (c) { return /^(pre|com):\d+:\d+$/.test(c); });
      var com2 = claves.filter(function (c) { return c.indexOf("com") === 0; }), comOk = com2.filter(function (c) { return s.resp[c]; }).length;
      var hu = Object.keys(s.huecos), huOk = hu.filter(function (j) { return s.huecos[j]; }).length;
      var bat = dominioBateria(t.bateria), ex = examenes(t);
      h += "<h2>🎯 Tema leído</h2>";
      h += '<div class="est-res"><div><b>' + comOk + "/" + com2.length + "</b><span>comprobaciones</span></div><div><b>" + huOk + "/" + hu.length + "</b><span>huecos</span></div><div><b>" + bat.bien + "/" + bat.n + "</b><span>batería bien</span></div></div>";
      h += '<p class="est-ayuda">Ahora la batería del tema: todas sus preguntas reales (exámenes, Kahoot, clase y Guyton). Lo que falles entrará en tus repasos y en el plan de examen. Mejor hoy mismo, con el tema fresco.</p>';
      h += '<div class="est-botones grande"><button class="est-sigue" data-acc="bat">▶️ Batería del tema (' + t.bateria.length + ")</button>" + (ex.length ? '<button data-acc="bat-ex">📝 Solo las de examen (' + ex.length + ")</button>" : "") + "</div>";
      var rt = repasoTema(t);
      h += '<div class="est-botones"><button data-acc="rep">🎯 Repaso inteligente (' + Math.min(20, rt.lista.length) + ')</button><button data-acc="tutor">💬 Pregúntale al tutor</button></div>';
      h += '<p class="est-ayuda">Repaso inteligente: primero lo que has fallado, lo que te toca por repaso espaciado y lo que acertaste dudando; después lo que no has visto. ' +
        (proximoRepaso({ tema: vista.n }) !== null ? "Próximo repaso de este tema: " + textoRepaso(proximoRepaso({ tema: vista.n })) + "." : "Repasa este tema dentro de 2–3 días con la batería (sin releer): recordar espaciado es lo que fija.") + "</p>";
      h += '<div class="est-botones"><button data-acc="ir" data-i="0">↺ Volver al inicio del tema</button><button data-acc="salir">← Salir</button></div>';
      if (!s.fin) { s.fin = Date.now(); guardar(); }
    }
    h += "</div>";
    h += '<button class="est-flota" data-acc="tutor" title="Tutor con IA: tablas, explicaciones, repasos y preguntas de este tema">💬 Tutor</button>';
    pantalla().innerHTML = h;
  }

  // Un apartado está hecho cuando se han respondido sus comprobaciones: 1 si todas bien, 0 si falló alguna, null si no
  function notaSeccion(s, t, i) {
    var com = t.secciones[i].comprueba || [];
    if (!com.length) return null;
    var r = com.map(function (_, j) { return s.resp["com:" + i + ":" + j]; });
    if (r.some(function (x) { return x === undefined; })) return null;
    return r.every(function (x) { return x === 1; }) ? 1 : 0;
  }

  function examenes(t) {
    return (t.bateria || []).filter(function (id) { var q = BY_ID.get(id); return q && (/^📝/.test(q.topicBase) || /Examen/.test(q.topicBase) || (q.caida && q.caida.length)); });
  }
  function bateria(n, soloExamen) {
    cargarTema(n).then(function (t) {
      var ids = soloExamen ? examenes(t) : t.bateria;
      var qs = ids.map(function (id) { return BY_ID.get(id); }).filter(Boolean);
      if (!qs.length) return alert("Este tema aún no tiene batería.");
      vista = null;
      document.getElementById("estudio-screen") && document.getElementById("estudio-screen").classList.add("hidden");
      App.beginSession(shuffle(qs), "estudio");
    });
  }

  function corregirHuecos(revelar) {
    var s = est(vista.n);
    document.querySelectorAll("#estudio-screen .est-hueco").forEach(function (inp) {
      var j = inp.getAttribute("data-j"), sol = inp.getAttribute("data-h"), v = norma(inp.value);
      if (revelar) { if (s.huecos[j] !== 1) s.huecos[j] = 0; return; }
      if (!v) return;
      var ok = v === norma(sol) || (v.length >= 4 && (norma(sol).indexOf(v) >= 0 || v.indexOf(norma(sol)) >= 0)) ||
        norma(sol).split(/ o | \/ /).some(function (alt) { return alt && v === alt.trim(); });
      s.huecos[j] = ok ? 1 : 0;
    });
    guardar();
    var vals = {};
    document.querySelectorAll("#estudio-screen .est-hueco").forEach(function (inp) { vals[inp.getAttribute("data-j")] = inp.value; });
    pintar();
    document.querySelectorAll("#estudio-screen .est-hueco").forEach(function (inp) { var j = inp.getAttribute("data-j"); if (vals[j]) inp.value = vals[j]; else if (revelar) inp.value = inp.getAttribute("data-h"); });
  }

  function clic(ev) {
    var b = ev.target.closest("button");
    if (!b || !vista) return;
    var s = est(vista.n);
    if (b.hasAttribute("data-o")) {
      var clave = b.getAttribute("data-q"), o = +b.getAttribute("data-o"), ref = refDe(clave);
      var q = typeof ref === "number" ? BY_ID.get(ref) : ref;
      if (!q || s.resp[clave] !== undefined) return;
      s.resp[clave] = o === q.correct ? 1 : 0;
      s.resp[clave + "_o"] = o;
      guardar();
      var y = window.scrollY;
      pintar();
      window.scrollTo(0, y);
      return;
    }
    var acc = b.getAttribute("data-acc");
    if (acc === "salir") salir();
    else if (acc === "ir") irPaso(+b.getAttribute("data-i"));
    else if (acc === "velo") { s["leer" + b.getAttribute("data-i")] = 1; guardar(); pintar(); }
    else if (acc === "corregir") corregirHuecos(false);
    else if (acc === "soluciones") corregirHuecos(true);
    else if (acc === "expl") { s.expl[b.getAttribute("data-i")] = +b.getAttribute("data-v"); guardar(); var y2 = window.scrollY; pintar(); window.scrollTo(0, y2); }
    else if (acc === "par") b.classList.add("vista");
    else if (acc === "bat") bateria(vista.n, false);
    else if (acc === "rep") repasoInteligente(vista.n);
    else if (acc === "tutor") Tutor.abrir(vista.n);
    else if (acc === "borra-nota") { (s.notas || []).splice(+b.getAttribute("data-i"), 1); guardar(); pintar(); }
    else if (acc === "bat-ex") bateria(vista.n, true);
  }

  // ------------------------------------------------------------------ repaso inteligente
  // Sin IA: ordena las preguntas de la batería de un tema por lo que más conviene repasar.
  function puntoRepaso(id) {
    var q = BY_ID.get(id), s = State.data.qs && State.data.qs[id];
    if (!q) return null;
    var ex = /^📝/.test(q.topicBase) || /Examen/.test(q.topicBase) || (q.caida && q.caida.length);
    var p = 0, por = "";
    if (!s || !s.a) { p = ex ? 1.5 : 0.6; por = "nueva"; }
    else {
      var h = Array.isArray(s.h) && s.h.length ? s.h[s.h.length - 1] : null, ok = h ? h[1] === 1 : s.l !== 0;
      if (!ok) { p += 5; por = "fallada"; if (h && h[3] === 1) { p += 2; por = "fallada con seguridad"; } }
      if (typeof isDue === "function" && isDue(s)) { p += 4; por = por || "le toca repaso"; }
      if (ok && h && (h[3] === 2 || h[3] === 3)) { p += 1.5; por = por || "acertada dudando"; }
    }
    if (ex) p *= 1.3;
    return { q: q, p: p, por: por, ex: !!ex };
  }
  function repasoTema(t) {
    var l = (t.bateria || []).map(puntoRepaso).filter(function (x) { return x && x.p > 0; });
    l.sort(function (a, b) { return b.p - a.p; });
    var c = { fallos: 0, vencidas: 0, dudosas: 0, nuevas: 0 };
    l.forEach(function (x) { if (/fallada/.test(x.por)) c.fallos++; else if (x.por === "le toca repaso") c.vencidas++; else if (x.por === "acertada dudando") c.dudosas++; else if (x.por === "nueva") c.nuevas++; });
    return { lista: l, c: c };
  }
  function repasoInteligente(n, cuantas) {
    cargarTema(n).then(function (t) {
      var l = repasoTema(t).lista.slice(0, cuantas || 20).map(function (x) { return x.q; });
      if (!l.length) return alert("No hay nada que repasar en este tema ahora mismo.");
      vista = null;
      var p = document.getElementById("estudio-screen"); if (p) p.classList.add("hidden");
      App.beginSession(shuffle(l), "estudio");
    });
  }
  function textoRepaso(d) { return d <= 0 ? "hoy" : d === 1 ? "mañana" : "en " + d + " días"; }
  // Qué temas conviene repasar ya, con el motivo, de más a menos urgente
  function queRepasar(lista) {
    var r = [];
    (lista || (indice && indice.temas) || []).forEach(function (e) {
      var s = _d.t[e.tema], t = temas[e.tema];
      if (!s || !s.ini || !t) return;
      var rt = repasoTema(t), pr = proximoRepaso(e), mot = [], p = 0;
      if (s.fin && !(s.bat && s.bat.hechas)) { p += 8; mot.push("aún no has hecho la batería"); }
      if (pr !== null && pr <= 0) { p += 6 + Math.min(10, -pr); mot.push("le toca repaso espaciado (hace " + diasSinTocar(e) + " días)"); }
      if (!s.fin) { p += 3; mot.push("lo dejaste a medias"); }
      if (rt.c.fallos) { p += rt.c.fallos * 0.6; mot.push(rt.c.fallos + " falladas"); }
      if (rt.c.vencidas) { p += rt.c.vencidas * 0.4; mot.push(rt.c.vencidas + " con repaso pendiente"); }
      p *= 1 + (e.peso || 0) * 0.15;
      if (p > 0) r.push({ e: e, p: p, mot: mot, rt: rt, pr: pr });
    });
    r.sort(function (a, b) { return b.p - a.p; });
    return r;
  }
  function cuadroRepasos(lista) {
    var r = queRepasar(lista);
    var h = '<div class="est-hoy"><div class="est-hoy-t"><b>🔁 Hoy te conviene repasar</b><button class="est-mini-b" data-est="tutor" data-n="0">💬 Tutor</button></div>';
    if (!r.length) return h + '<div class="sub">Cuando hayas estudiado algún tema, aquí te diré cuál repasar y cuándo.</div></div>';
    r.slice(0, 3).forEach(function (x) {
      h += '<div class="est-hoy-f"><span><b>' + esc(nombre(x.e)) + "</b> · " + esc(x.e.titulo) + '<span class="sub"> — ' + esc(x.mot.join(", ")) + "</span></span>" +
        '<button class="est-mini-b" data-est="rep" data-n="' + x.e.tema + '">🎯 ' + Math.min(20, x.rt.lista.length) + "</button></div>";
    });
    var prox = (lista || []).map(function (e) { return { e: e, d: proximoRepaso(e) }; }).filter(function (x) { return x.d !== null && x.d > 0; }).sort(function (a, b) { return a.d - b.d; })[0];
    if (prox) h += '<div class="sub">📅 Siguiente repaso programado: ' + esc(corto(prox.e)) + " " + textoRepaso(prox.d) + ".</div>";
    return h + "</div>";
  }

  // ------------------------------------------------------------------ tutor con IA
  // Panel lateral para hablar con la IA sobre el tema que estás estudiando (o sobre la asignatura):
  // tablas, explicaciones, qué y cuándo repasar, y preguntas (de la batería o nuevas) para practicar.
  // Usa la clave de la IA de la plataforma (entrenador_ia.js); sin ella, funciona la parte local.
  var K_CHAT = K + "_chat";
  function leerChat() { try { return JSON.parse(localStorage.getItem(K_CHAT) || "{}") || {}; } catch (e) { return {}; } }
  function guardarChat(c) { try { localStorage.setItem(K_CHAT, JSON.stringify(c)); } catch (e) {} }
  function pintarTabla(tb) {
    if (!tb || !Array.isArray(tb.filas) || !tb.filas.length) return "";
    var cols = Array.isArray(tb.columnas) ? tb.columnas : [];
    return '<div class="est-cuadro">' + (tb.titulo ? '<div class="est-cuadro-t">' + esc(tb.titulo) + "</div>" : "") + '<div class="est-scroll"><table>' +
      (cols.length ? "<thead><tr>" + cols.map(function (c) { return "<th>" + inl(esc(c)) + "</th>"; }).join("") + "</tr></thead>" : "") + "<tbody>" +
      tb.filas.map(function (f) { return "<tr>" + (Array.isArray(f) ? f : [f]).map(function (c, i) { return (i ? "<td>" : "<th>") + inl(esc(c)) + (i ? "</td>" : "</th>"); }).join("") + "</tr>"; }).join("") + "</tbody></table></div></div>";
  }
  function pintarRespuesta(r) { return (r.md ? md(r.md) : "") + (r.tablas || []).map(pintarTabla).join(""); }

  var Tutor = (function () {
    var n = null, ocupado = false;
    function clave() { return n === null ? "general" : "t" + n; }
    function panel() {
      var p = document.getElementById("est-tutor");
      if (!p) {
        p = document.createElement("div"); p.id = "est-tutor"; p.className = "hidden";
        document.body.appendChild(p);
        p.addEventListener("click", clicTutor);
        p.addEventListener("keydown", function (ev) { if (ev.key === "Enter" && !ev.shiftKey && ev.target.id === "est-tutor-in") { ev.preventDefault(); enviar(); } });
      }
      return p;
    }
    function abrir(tema) {
      n = tema === 0 ? null : tema;
      var go = function () { pintarT(); panel().classList.remove("hidden"); var i = document.getElementById("est-tutor-in"); if (i) i.focus(); };
      if (n !== null && !temas[n]) cargarTema(n).then(go); else go();
    }
    function cerrar() { panel().classList.add("hidden"); }
    function conIA() { return window.EntrenadorIA && EntrenadorIA.conectada(); }
    function pintarT() {
      var c = leerChat()[clave()] || [], e = n !== null ? (indice.temas || []).filter(function (x) { return x.tema === n; })[0] : null;
      var h = '<div class="tu-top"><b>💬 Tutor</b> <span class="sub">' + (e ? esc(nombre(e)) + " · " + esc(e.titulo) : "toda la asignatura") + '</span><button class="tu-x" data-tu="cerrar">✕</button></div>';
      h += '<div class="tu-chips">' + [
        ["rep", "🎯 Repaso inteligente"], ["que", "🔁 ¿Qué repaso y cuándo?"],
        ["p:Hazme una tabla comparativa de ", "📊 Hazme una tabla de…"], ["p:Explícame ", "🤔 Explícame…"],
        ["p:Hazme preguntas para repasar ", "📝 Preguntas de…"], ["p:Elige las preguntas que más me convenga repasar ahora y escríbeme alguna nueva sobre lo que más fallo", "🧠 Las que más me convengan"]
      ].filter(function (x) { return n !== null || x[0] !== "rep"; }).map(function (x) { return '<button data-tu="' + esc(x[0]) + '">' + x[1] + "</button>"; }).join("") + "</div>";
      h += '<div class="tu-log">';
      if (!c.length) h += '<div class="tu-msg ia">' + (n !== null ? "Pregúntame lo que quieras de este tema: te hago una tabla, te lo explico de otra forma, te digo qué repasar o te preparo preguntas." : "Puedo decirte qué repasar y cuándo, explicarte algo de la asignatura o prepararte preguntas.") +
        (conIA() ? "" : '<br><span class="sub">Para hablar conmigo, conecta la IA en la portada (🧠 Entrenador con IA). Sin ella funcionan el repaso inteligente y «¿qué repaso?».</span>') + "</div>";
      c.forEach(function (m, i) {
        if (m.yo) { h += '<div class="tu-msg yo">' + esc(m.yo) + "</div>"; return; }
        h += '<div class="tu-msg ia">' + pintarRespuesta(m) +
          (m.ids && m.ids.length ? '<button class="tu-go" data-tu="hacer" data-i="' + i + '">▶️ Hacer estas ' + m.ids.length + " preguntas" + (m.nuevas ? " (" + m.nuevas + " nuevas)" : "") + "</button>" : "") +
          (n !== null && (m.md || (m.tablas && m.tablas.length)) ? '<button class="est-mini-b" data-tu="nota" data-i="' + i + '">📌 Guardar en el tema</button>' : "") + "</div>";
      });
      if (ocupado) h += '<div class="tu-msg ia sub">Pensando…</div>';
      h += "</div>";
      h += '<div class="tu-in"><textarea id="est-tutor-in" rows="2" placeholder="' + (conIA() ? "Escribe tu pregunta…" : "Conecta la IA para escribirme") + '"' + (conIA() ? "" : " disabled") + "></textarea><button data-tu=\"enviar\"" + (conIA() && !ocupado ? "" : " disabled") + ">Enviar</button></div>" +
        (c.length ? '<button class="tu-borra" data-tu="borrar">Borrar la conversación</button>' : "");
      var p = panel(); p.innerHTML = h;
      var log = p.querySelector(".tu-log"); if (log) log.scrollTop = log.scrollHeight;
    }
    function añadir(m) { var c = leerChat(), k = clave(); (c[k] = c[k] || []).push(m); if (c[k].length > 30) c[k] = c[k].slice(-30); guardarChat(c); }
    function clicTutor(ev) {
      var b = ev.target.closest("[data-tu]"); if (!b) return;
      var a = b.getAttribute("data-tu");
      if (a === "cerrar") return cerrar();
      if (a === "enviar") return enviar();
      if (a === "borrar") { var c = leerChat(); delete c[clave()]; guardarChat(c); return pintarT(); }
      if (a === "rep") { cerrar(); return repasoInteligente(n); }
      if (a === "que") { añadir({ yo: "¿Qué repaso y cuándo?" }); añadir(respuestaLocalRepaso()); return pintarT(); }
      if (a.indexOf("p:") === 0) { var i = document.getElementById("est-tutor-in"); if (i && !i.disabled) { i.value = a.slice(2); i.focus(); } else alert("Conecta la IA en la portada para pedir esto."); return; }
      var m = (leerChat()[clave()] || [])[+b.getAttribute("data-i")];
      if (a === "hacer" && m) { var qs = m.ids.map(function (id) { return BY_ID.get(id); }).filter(Boolean); if (!qs.length) return; cerrar(); vista = null; var sc = document.getElementById("estudio-screen"); if (sc) sc.classList.add("hidden"); return App.beginSession(qs, "estudio"); }
      if (a === "nota" && m && n !== null) { var s = est(n); (s.notas = s.notas || []).push({ t: Date.now(), md: m.md || "", tablas: m.tablas || [] }); guardar(); b.textContent = "✓ Guardado"; b.disabled = true; if (vista && vista.n === n) { var y = window.scrollY; pintar(); window.scrollTo(0, y); } }
    }
    function respuestaLocalRepaso() {
      var lista = indice.temas || [], r = queRepasar(lista), out = [];
      if (n !== null) {
        var e = lista.filter(function (x) { return x.tema === n; })[0], rt = temas[n] ? repasoTema(temas[n]) : null, pr = proximoRepaso(e);
        out.push("**" + nombre(e) + "**: " + (pr === null ? "aún no lo has terminado de leer; acaba la lectura y haz la batería." : "próximo repaso " + textoRepaso(pr) + " (intervalo de " + intervaloTema(e) + " días según cómo va tu batería)."));
        if (rt) out.push("En su batería: " + rt.c.fallos + " falladas, " + rt.c.vencidas + " con repaso pendiente, " + rt.c.dudosas + " acertadas dudando y " + rt.c.nuevas + " sin ver. El «🎯 Repaso inteligente» te pone primero las falladas y las pendientes.");
      }
      if (r.length) { out.push("**Lo más urgente de la asignatura:**"); r.slice(0, 5).forEach(function (x) { out.push("- " + nombre(x.e) + " · " + x.e.titulo + ": " + x.mot.join(", ")); }); }
      else out.push("Aún no hay temas estudiados que repasar.");
      var prox = lista.map(function (e) { return { e: e, d: proximoRepaso(e) }; }).filter(function (x) { return x.d !== null && x.d > 0; }).sort(function (a, b) { return a.d - b.d; }).slice(0, 4);
      if (prox.length) { out.push("**Próximos repasos programados:**"); prox.forEach(function (x) { out.push("- " + nombre(x.e) + ": " + textoRepaso(x.d)); }); }
      return { md: out.join("\n") };
    }
    var SISTEMA_TUTOR = [
      "Eres el tutor personal de Santiago, estudiante de 2.º de Medicina (Universidad de Cádiz), dentro de su «sala de estudio». Está estudiando un tema (o la asignatura entera) y te pide ayuda: tablas, explicaciones, qué y cuándo repasar, o preguntas para practicar. Su objetivo es sacar la mejor nota en exámenes tipo test.",
      "RECIBES: el tema que está estudiando tal como está escrito en su sala (apartados, ideas clave, trampas, «así lo preguntan»), los apartados más cercanos de sus APUNTES DE CLASE (lo que manda), su estado (preguntas falladas, pendientes de repaso, acertadas dudando, con su texto), lo que le toca repasar en la asignatura, su plan de examen y la conversación hasta ahora.",
      "CÓMO RESPONDER. Concreto y útil para el examen; sin ánimos ni relleno. Si pide una TABLA, haz una tabla comparativa corta (como mucho 7 filas y 5 columnas, celdas de pocas palabras). Si pide que le EXPLIQUES algo, explícalo de otra forma que la de los apuntes (causa → efecto, un ejemplo, una regla para no confundirse), en pocas frases, y di qué suelen preguntar de ello. Si pregunta QUÉ o CUÁNDO repasar, usa su estado y el repaso programado que recibes. Si pide PREGUNTAS, elige ids de las listas que recibes (las que más le convengan: falladas, pendientes y de examen primero) y, si te lo pide o hace falta para atacar una confusión, escribe preguntas nuevas.",
      "REGLAS. Usa solo hechos de sus apuntes y del material que recibes; si no basta, dilo. Si los apuntes y otra fuente chocan, mandan los apuntes de clase (y si es una asignatura donde manda la clave del test, dilo así). Las preguntas nuevas: cuatro opciones, una correcta, sin imágenes, distractores verosímiles, explicación que diga por qué. Todo en español.",
      'FORMATO: responde SOLO con JSON: {"md":"tu respuesta en markdown sencillo (**negrita**, listas con - )","tablas":[{"titulo":"","columnas":["",""],"filas":[["",""]]}],"ids":[ids de preguntas de la plataforma para practicar, solo de las listas recibidas],"nuevas":[{"q":"","opciones":["","","",""],"correcta":0,"explicacion":""}]}. Deja vacío lo que no uses. Como mucho 25 ids y 8 nuevas.'
    ].join("\n\n");
    function resumenTema(t) {
      var out = ["TEMA EN LA SALA: " + nombre(t) + " · " + t.titulo + " (peso " + (t.peso || 0) + "/3). " + (t.pesoPorQue || "")];
      t.secciones.forEach(function (sec, i) {
        var txt = (sec.bloques || []).map(function (b) {
          if (b.md) return b.md; if (b.tipo === "cuadro") return (b.titulo || "") + ": " + b.filas.map(function (f) { return f.join(" | "); }).join(" ; ");
          if (b.tipo === "flujo") return (b.titulo || "") + ": " + (b.pasos || []).join(" → ");
          if (b.tipo === "parejas") return (b.titulo || "") + ": " + b.pares.map(function (x) { return x[0] + " → " + x[1]; }).join(" ; ");
          if (b.tipo === "cifras") return (b.titulo || "") + ": " + b.items.map(function (x) { return x[0] + " = " + x[1]; }).join(" ; ");
          if (b.tipo === "porque") return b.pregunta + " " + b.respuesta;
          return "";
        }).join("\n");
        out.push("## " + (i + 1) + ". " + sec.titulo + " (peso " + (sec.peso || 0) + ")\n" + txt.slice(0, 2500));
      });
      return out.join("\n\n").slice(0, 16000);
    }
    function lineaQ(x) { return "#" + x.q.id + " [" + (x.por || "") + (x.ex ? ", de examen" : "") + "] " + String(x.q.q).slice(0, 180) + " → " + String(x.q.options[x.q.correct] || "").slice(0, 70); }
    function enviar() {
      var i = document.getElementById("est-tutor-in"), txt = i && i.value.trim();
      if (!txt || ocupado || !conIA()) return;
      i.value = "";
      var hist = (leerChat()[clave()] || []).slice(-8);
      añadir({ yo: txt }); ocupado = true; pintarT();
      var t = n !== null ? temas[n] : null, rt = t ? repasoTema(t) : null, r = queRepasar(indice.temas || []);
      var cand = rt ? rt.lista.slice(0, 70) : [];
      if (!t) r.slice(0, 4).forEach(function (x) { cand = cand.concat(x.rt.lista.slice(0, 15)); });
      var consultas = [txt, (t ? t.titulo + " " : "") + txt];
      (EntrenadorIA.trozos ? EntrenadorIA.trozos(consultas, 10) : Promise.resolve([])).then(function (ap) {
        var u = ["ASIGNATURA: " + document.title, "PETICIÓN: " + txt];
        if (hist.length) u.push("CONVERSACIÓN PREVIA:\n" + hist.map(function (m) { return m.yo ? "Santiago: " + m.yo : "Tutor: " + String(m.md || "").slice(0, 800); }).join("\n"));
        if (t) u.push(resumenTema(t));
        if (rt) u.push("SU ESTADO EN ESTE TEMA: " + rt.c.fallos + " falladas, " + rt.c.vencidas + " pendientes de repaso, " + rt.c.dudosas + " acertadas dudando, " + rt.c.nuevas + " sin ver. Próximo repaso del tema: " + (proximoRepaso({ tema: n }) === null ? "aún no lo ha terminado de leer" : textoRepaso(proximoRepaso({ tema: n }))) + ".");
        u.push("QUÉ LE TOCA REPASAR EN LA ASIGNATURA:\n" + (r.slice(0, 6).map(function (x) { return "- " + nombre(x.e) + " · " + x.e.titulo + ": " + x.mot.join(", "); }).join("\n") || "(nada todavía)"));
        if (window.PlanExamen && PlanExamen.contexto) { try { u.push(PlanExamen.contexto()); } catch (e) {} }
        u.push("PREGUNTAS DE LA PLATAFORMA QUE PUEDES PROPONER (las primeras son las que más le convienen):\n" + cand.map(lineaQ).join("\n"));
        if (ap && ap.length) u.push("APUNTES DE CLASE MÁS CERCANOS:\n\n" + ap.join("\n\n---\n\n"));
        return EntrenadorIA.llamar(SISTEMA_TUTOR, u.join("\n\n"));
      }).then(function (res) {
        var j; try { var m = String(res.txt).match(/\{[\s\S]*\}/); j = JSON.parse(m ? m[0] : res.txt); } catch (e) { j = { md: res.txt }; }
        var validos = new Set(cand.map(function (x) { return x.q.id; })), ids = (Array.isArray(j.ids) ? j.ids : []).map(Number).filter(function (id) { return validos.has(id) || BY_ID.has(id); }).slice(0, 25);
        var tema = t ? (BY_ID.get((t.bateria || [])[0]) || {}).topicBase : "";
        var nuevas = EntrenadorIA.guardarNuevas ? EntrenadorIA.guardarNuevas(Array.isArray(j.nuevas) ? j.nuevas.slice(0, 8) : [], tema) : [];
        añadir({ md: String(j.md || ""), tablas: Array.isArray(j.tablas) ? j.tablas.slice(0, 4) : [], ids: ids.concat(nuevas), nuevas: nuevas.length });
      }).catch(function (e) { añadir({ md: "⚠️ No he podido responder: " + (e && e.message || e) }); })
        .then(function () { ocupado = false; pintarT(); });
    }
    return { abrir: abrir, cerrar: cerrar };
  })();

  // ------------------------------------------------------------------ estilos
  var css = document.createElement("style");
  css.textContent = [
    "#estudio-home{background:var(--surface);border:1px solid var(--accent);border-radius:var(--radius);padding:12px 16px;margin:0 0 18px}",
    "#estudio-home summary{cursor:pointer;color:var(--text)} #estudio-home .sub,#estudio-screen .sub{color:var(--text2);font-size:.82rem;font-weight:400}",
    ".est-cuerpo{margin-top:10px} .est-ayuda{color:var(--text2);font-size:.85rem;margin:8px 0}",
    ".est-sig{width:100%;text-align:left;background:var(--accent);color:#04120c;border:0;border-radius:8px;padding:12px 14px;font-weight:700;cursor:pointer;font-size:.95rem}",
    ".est-bloque{margin-top:12px} .est-bloque-t{font-size:.75rem;text-transform:uppercase;letter-spacing:.06em;color:var(--text2);margin-bottom:6px}",
    ".est-fila{display:flex;gap:6px;margin-bottom:6px} .est-tema{flex:1;text-align:left;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:9px 12px;color:var(--text);cursor:pointer}",
    ".est-tema:hover,.est-bat:hover{border-color:var(--accent)} .est-tema .n{color:var(--accent2);font-weight:700} .est-tema .meta{display:block;font-size:.75rem;color:var(--text2);margin-top:2px}",
    ".est-bat{background:var(--surface2);border:1px solid var(--border);border-radius:8px;color:var(--text);padding:0 10px;cursor:pointer;white-space:nowrap}",
    ".est-fila.hecho .est-tema{border-left:3px solid var(--warning)} .est-fila.dominado .est-tema{border-left:3px solid var(--success)} .est-fila.curso .est-tema{border-left:3px solid var(--accent)}",
    "#estudio-screen{max-width:820px;margin:0 auto;padding:0 16px 60px;line-height:1.6}",
    ".est-top{position:sticky;top:0;background:var(--bg);padding:10px 0 8px;z-index:5;border-bottom:1px solid var(--border)}",
    ".est-salir{background:none;border:1px solid var(--border);color:var(--text2);border-radius:6px;padding:4px 10px;cursor:pointer;float:right}",
    ".est-tit{font-weight:700;color:var(--accent2);font-size:.95rem;padding-right:90px} .est-barra{height:4px;background:var(--border);border-radius:2px;margin:8px 0 6px;overflow:hidden} .est-barra div{height:100%;background:var(--accent)}",
    ".est-migas{display:flex;gap:4px;flex-wrap:wrap} .miga{min-width:28px;height:24px;border-radius:12px;border:1px solid var(--border);background:var(--surface);color:var(--text2);font-size:.75rem;cursor:pointer;padding:0 6px}",
    ".miga.vista{border-color:var(--accent);color:var(--text)} .miga.act{background:var(--accent);color:#04120c;border-color:var(--accent);font-weight:700}",
    ".est-pag h2{color:var(--text);font-size:1.35rem;margin:18px 0 6px;line-height:1.3} .est-pag p{margin:8px 0} .est-pag ul,.est-pag ol{margin:6px 0 6px 22px}",
    ".est-meta{color:var(--text2);font-size:.82rem;margin-top:14px} .est-peso{background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.35);border-radius:8px;padding:6px 10px;font-size:.82rem;color:var(--text);margin:8px 0}",
    ".est-indice button{background:none;border:0;color:var(--accent2);cursor:pointer;font-size:.95rem;text-align:left;padding:2px 0}",
    ".est-sec-t{font-weight:700;margin:14px 0 6px}",
    ".est-previa,.est-comprueba{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:10px 14px;margin:14px 0}",
    ".est-velo{border:1px dashed var(--border);border-radius:8px;padding:14px;color:var(--text2);text-align:center;margin:14px 0} .est-velo button{margin-left:8px;background:none;border:1px solid var(--border);color:var(--text2);border-radius:6px;padding:3px 8px;cursor:pointer}",
    ".est-q{margin:10px 0 14px} .est-q-et{font-size:.72rem;color:var(--text2);text-transform:uppercase;letter-spacing:.05em} .est-q-txt{font-weight:600;margin:4px 0 8px}",
    ".est-op{display:block;width:100%;text-align:left;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px 12px;margin:5px 0;color:var(--text);cursor:pointer;font-size:.92rem;line-height:1.4}",
    ".est-op:hover:not([disabled]){border-color:var(--accent)} .est-op.ok{border-color:var(--success);background:rgba(34,197,94,.15)} .est-op.mal{border-color:var(--danger);background:rgba(239,68,68,.15)} .est-op.apag{opacity:.55}",
    ".est-exp{font-size:.88rem;background:var(--surface2);border-radius:8px;padding:8px 12px;margin-top:6px;color:var(--text)}",
    ".est-lectura{margin-top:10px} .est-txt{margin:10px 0}",
    ".est-caja{border-radius:var(--radius);padding:10px 14px;margin:12px 0;border:1px solid var(--border);background:var(--surface)} .est-caja>b:first-child{display:block;margin-bottom:2px}",
    ".est-caja.clave{border-left:4px solid var(--accent)} .est-caja.asi{border-left:4px solid #60a5fa;background:rgba(96,165,250,.08)} .est-caja.trampa{border-left:4px solid var(--danger);background:rgba(239,68,68,.07)}",
    ".est-caja.libro{border-left:4px solid #34d399;background:rgba(52,211,153,.07)}",
    ".est-caja.porque{border-left:4px solid #a78bfa} .est-caja.porque summary{cursor:pointer}",
    ".est-formula{text-align:center;margin:14px 0;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:10px 14px} .est-formula .expr{font-family:ui-monospace,Menlo,monospace;font-size:1.15rem;color:var(--accent2);font-weight:700}",
    ".est-formula p{color:var(--text2);font-size:.88rem}",
    ".est-cuadro{margin:14px 0} .est-cuadro-t{font-weight:700;font-size:.9rem;margin-bottom:6px;color:var(--text)} .est-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}",
    ".est-cuadro table{border-collapse:collapse;width:100%;font-size:.86rem;min-width:420px} .est-cuadro th,.est-cuadro td{border:1px solid var(--border);padding:6px 8px;vertical-align:top;text-align:left}",
    ".est-cuadro thead th{background:var(--surface2);color:var(--accent2)} .est-cuadro tbody th{background:var(--surface);font-weight:600}",
    ".est-flujo{margin:14px 0;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:10px 14px} .est-flujo .pasos{display:flex;flex-direction:column;align-items:center}",
    ".est-flujo .paso{background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:6px 12px;text-align:center;max-width:520px;width:100%;font-size:.9rem} .est-flujo .flecha{color:var(--accent);font-weight:700;line-height:1.2}",
    ".est-flujo .rol{display:block;font-size:.68rem;text-transform:uppercase;letter-spacing:.06em;color:var(--text2)} .est-flujo .vuelta{text-align:center;color:#a78bfa;font-size:.82rem;margin-top:6px}",
    ".est-fig{margin:12px 0;text-align:center} .est-img{max-width:100%;border-radius:8px;margin:6px 0} .est-fig figcaption{color:var(--text2);font-size:.8rem}",
    ".est-hueco{width:100%;min-width:90px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:5px 7px;font-size:.86rem}",
    ".est-hueco.ok{border-color:var(--success);background:rgba(34,197,94,.12)} .est-hueco.mal{border-color:var(--danger);background:rgba(239,68,68,.1)} .est-cuadro .sol{display:block;color:var(--success);font-size:.78rem;margin-top:2px}",
    ".est-expl{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:10px 14px;margin:12px 0} .est-expl textarea{width:100%;background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:6px;padding:6px 8px;font:inherit;font-size:.88rem}",
    ".est-expl summary{cursor:pointer;color:var(--accent2);margin-top:6px}",
    ".est-botones{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0} .est-botones button{background:var(--surface2);border:1px solid var(--border);color:var(--text);border-radius:8px;padding:8px 12px;cursor:pointer}",
    ".est-botones button.act{border-color:var(--accent);background:rgba(16,185,129,.15)} .est-botones.grande button{font-size:1rem;padding:12px 16px}",
    ".est-sigue{display:block;margin:22px 0 0 auto;background:var(--accent);color:#04120c;border:0;border-radius:8px;padding:11px 18px;font-weight:700;cursor:pointer;font-size:.95rem}",
    ".est-botones .est-sigue{margin:0}",
    ".est-res{display:flex;gap:10px;margin:14px 0} .est-res div{flex:1;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:12px;text-align:center}",
    ".est-res b{display:block;font-size:1.5rem;color:var(--accent2)} .est-res span{font-size:.75rem;color:var(--text2)}",
    ".est-parejas,.est-cifras{margin:14px 0;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:10px 14px}",
    ".est-parejas .par{display:flex;gap:8px;align-items:stretch;margin:6px 0} .est-parejas .izq{flex:1;padding:6px 8px;background:var(--surface2);border-radius:6px;font-size:.9rem}",
    ".est-parejas .der{flex:1;text-align:left;border:1px dashed var(--border);border-radius:6px;background:var(--bg);color:transparent;text-shadow:0 0 8px var(--text2);cursor:pointer;font-size:.9rem;padding:6px 8px}",
    ".est-parejas .der.vista{color:var(--text);text-shadow:none;border-style:solid;border-color:var(--accent)}",
    ".est-cifras .rej{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px} .est-cifras .cifra{background:var(--surface2);border-radius:8px;padding:8px 10px}",
    ".est-cifras .cifra b{display:block;color:var(--accent2);font-size:1.05rem} .est-cifras .cifra span{font-size:.8rem;color:var(--text2)}",
    ".est-flujo .ramas{display:flex;gap:10px;flex-wrap:wrap} .est-flujo .ramas>.pasos{flex:1;min-width:200px} .est-flujo .rama-t{font-weight:700;font-size:.82rem;color:var(--accent2);margin-bottom:4px}",
    ".est-prog{background:var(--surface2);border-radius:8px;padding:10px 12px;margin:0 0 10px} .est-prog-barra{display:flex;height:10px;border-radius:5px;background:var(--border);overflow:hidden}",
    ".est-prog-barra .dominado,.est-prog-ley i.dominado{background:var(--success)} .est-prog-barra .hecho,.est-prog-ley i.hecho{background:var(--warning)} .est-prog-barra .curso,.est-prog-ley i.curso{background:var(--accent)}",
    ".est-prog-ley{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:.75rem;color:var(--text2);margin-top:6px} .est-prog-ley i{display:inline-block;width:9px;height:9px;border-radius:2px;background:var(--border);margin-right:4px;vertical-align:-1px}",
    ".est-prog-num{display:flex;gap:8px;margin-top:8px} .est-prog-num div{flex:1;text-align:center} .est-prog-num b{display:block;color:var(--accent2);font-size:1.1rem} .est-prog-num span{font-size:.72rem;color:var(--text2)}",
    ".est-mini{display:block;height:4px;background:var(--border);border-radius:2px;margin-top:6px;overflow:hidden} .est-mini span{display:block;height:100%;background:var(--accent)}",
    ".est-fila.dominado .est-mini span{background:var(--success)} .est-fila.repasar .est-tema{border-left-color:#60a5fa}",
    ".est-donde{font-size:.75rem;color:var(--text2);margin-bottom:6px} .miga.bien{border-color:var(--success);color:var(--success)} .miga.floja{border-color:var(--warning);color:var(--warning)}",
    ".est-ok{color:var(--success);font-size:.78rem} .est-flojo{color:var(--warning);font-size:.78rem}",
    ".est-hoy{background:var(--surface2);border:1px solid #a78bfa55;border-radius:8px;padding:10px 12px;margin:0 0 10px}",
    ".est-hoy-t{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px} .est-hoy-f{display:flex;justify-content:space-between;gap:8px;align-items:center;padding:4px 0;border-top:1px solid var(--border);font-size:.86rem}",
    ".est-mini-b{background:var(--surface);border:1px solid var(--border);color:var(--text);border-radius:6px;padding:3px 9px;cursor:pointer;font-size:.8rem;white-space:nowrap}",
    ".est-flota{position:fixed;right:16px;bottom:16px;z-index:20;background:#7c3aed;color:#fff;border:0;border-radius:22px;padding:10px 16px;font-weight:700;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.35)}",
    ".est-caja.notas{border-left:4px solid #a78bfa} .est-nota{border-top:1px solid var(--border);padding-top:6px;margin-top:6px}",
    "#est-tutor{position:fixed;top:0;right:0;bottom:0;width:min(440px,100vw);z-index:30;background:var(--bg);border-left:1px solid #a78bfa;display:flex;flex-direction:column;box-shadow:-6px 0 20px rgba(0,0,0,.35)}",
    "#est-tutor.hidden{display:none} .tu-top{padding:12px 14px;border-bottom:1px solid var(--border);display:flex;gap:8px;align-items:center} .tu-top .sub{flex:1;font-size:.8rem;color:var(--text2)}",
    ".tu-x{background:none;border:0;color:var(--text2);font-size:1.1rem;cursor:pointer} .tu-chips{display:flex;flex-wrap:wrap;gap:6px;padding:8px 14px;border-bottom:1px solid var(--border)}",
    ".tu-chips button{background:var(--surface2);border:1px solid var(--border);color:var(--text);border-radius:14px;padding:4px 10px;font-size:.78rem;cursor:pointer} .tu-chips button:hover{border-color:#a78bfa}",
    ".tu-log{flex:1;overflow-y:auto;padding:10px 14px;font-size:.88rem;line-height:1.5} .tu-msg{margin:8px 0;padding:8px 10px;border-radius:10px} .tu-msg.yo{background:#7c3aed22;margin-left:30px}",
    ".tu-msg.ia{background:var(--surface);border:1px solid var(--border)} .tu-msg .est-cuadro table{min-width:0} .tu-msg p{margin:4px 0} .tu-msg ul{margin:4px 0 4px 18px}",
    ".tu-go{display:block;margin:8px 0 4px;background:#7c3aed;color:#fff;border:0;border-radius:8px;padding:7px 12px;cursor:pointer;font-weight:600}",
    ".tu-in{display:flex;gap:8px;padding:10px 14px;border-top:1px solid var(--border)} .tu-in textarea{flex:1;background:var(--surface2);color:var(--text);border:1px solid var(--border);border-radius:8px;padding:6px 8px;font:inherit;font-size:16px;resize:none}",
    ".tu-in button{background:#7c3aed;color:#fff;border:0;border-radius:8px;padding:0 14px;cursor:pointer} .tu-in button[disabled]{opacity:.5} .tu-borra{background:none;border:0;color:var(--text2);font-size:.75rem;cursor:pointer;margin:0 14px 10px;text-align:left}",
    "@media (max-width:600px){#estudio-screen{padding:0 12px 50px}.est-pag h2{font-size:1.15rem}.est-res b{font-size:1.2rem}}"
  ].join("\n");
  document.head.appendChild(css);

  // ------------------------------------------------------------------ arranque
  var stats0 = App.updateHomeStats;
  App.updateHomeStats = function () {
    stats0.apply(this, arguments);
    try { pintarPortada(); } catch (e) { console.warn("estudio", e); }
  };
  cargarIndice().then(function () {
    // Se cargan en segundo plano los temas empezados, para saber cómo va su batería
    (indice.temas || []).forEach(function (e) { if (_d.t[e.tema]) cargarTema(e.tema).then(pintarPortada).catch(function () {}); });
    pintarPortada();
  }).catch(function () { /* esta plataforma aún no tiene sala de estudio */ });

  if (window.MPSync && typeof MPSync.usar === "function") {
    try { MPSync.usar({ clave: K, modo: "reciente", alCambiar: function () { _d = leer(); if (!_d.t) _d.t = {}; try { pintarPortada(); if (vista) pintar(); } catch (e) {} } }); } catch (e) {}
  }

  window.Estudio = { abrir: abrir, bateria: bateria, repaso: repasoInteligente, queRepasar: queRepasar, tutor: Tutor, indice: function () { return indice; }, _datos: function () { return _d; } };
})();
