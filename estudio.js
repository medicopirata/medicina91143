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
  // Días con actividad en la sala (_d.dias["AAAA-MM-DD" local] = {a: acciones, t: [temas]}),
  // para que la racha, el ritmo del plan y la IA sepan que también se estudia leyendo
  function claveHoy(d) { d = d || new Date(); var x = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return x.toISOString().slice(0, 10); }
  function marcarDia(n) {
    if (!_d.dias) _d.dias = {};
    var k = claveHoy(), x = _d.dias[k] || (_d.dias[k] = { a: 0, t: [] });
    x.a++;
    if (n != null && x.t.indexOf(n) < 0) x.t.push(n);
    var ks = Object.keys(_d.dias).sort();
    while (ks.length > 400) delete _d.dias[ks.shift()];
  }
  // La primera vez se reconstruye lo que se pueda de antes con las fechas que ya se guardaban
  function sembrarDias() {
    if (_d.diasIni) return;
    if (!_d.dias) _d.dias = {};
    var pon = function (t, n) {
      if (!t) return;
      var k = claveHoy(new Date(t)), x = _d.dias[k] || (_d.dias[k] = { a: 0, t: [] });
      x.a++;
      if (n != null && x.t.indexOf(n) < 0) x.t.push(n);
    };
    Object.keys(_d.t || {}).forEach(function (n) {
      var s = _d.t[n]; n = +n;
      pon(s.ini, n); pon(s.fin, n); pon(s.vis, n);
      (s.vueltas || []).forEach(function (v) { pon(v.t, n); });
    });
    Object.keys(_d.p || {}).forEach(function (a) { Object.keys(_d.p[a] || {}).forEach(function (k) { (_d.p[a][k] || []).forEach(function (y) { pon(y.t, null); }); }); });
    _d.diasIni = 1;
  }
  sembrarDias();
  function diaSala(k) { var x = (_d.dias || {})[k]; return x && x.a ? x : null; }
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
  // Diccionario de siglas de la asignatura (estudio/<clave>/siglas.json): {"PAM": "presión arterial media", …}
  var siglas = null;
  function cargarSiglas() {
    if (siglas) return Promise.resolve(siglas);
    return pedir("siglas.json").then(function (d) { siglas = d || {}; return siglas; }, function () { siglas = {}; return siglas; });
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

  // Lo que ha cambiado desde la última vez que se abrió el tema. El índice trae
  // «mod» (cuándo cambió el contenido) y «nov» (los últimos cambios, con las
  // huellas de los apartados que entraron o se retocaron); lo saca
  // tools/estudio_validar.py del historial de git. Un tema que nunca se ha abierto
  // no se marca: entero es nuevo.
  function ultimaVisita(n) { var s = _d.t[n]; return s ? s.vis || Math.max(s.ini || 0, s.fin || 0) : 0; }
  function cambiada(e) { var v = ultimaVisita(e.tema); return !!(v && e.mod && e.mod > v); }
  // Índices de los apartados nuevos o retocados después de «desde»
  function novedades(e, desde) {
    var hs = {};
    (e.nov || []).forEach(function (c) { if (c.t > desde) (c.s || []).forEach(function (x) { hs[x] = 1; }); });
    return (e.sh || []).map(function (x, i) { return hs[x] ? i : -1; }).filter(function (i) { return i >= 0; });
  }
  function diaMes(ms) { var d = new Date(ms); return d.getDate() + "/" + (d.getMonth() + 1); }
  var cambiosVistos = {};   // lo que había cambiado al abrir cada tema, mientras dure la página

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
        if (acc === "prog") abrirPrograma(b.getAttribute("data-a"));
        else if (acc === "abrir") abrir(n);
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
    var nCamb = lista.filter(cambiada).length;
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
    var h = '<summary><b>📖 Sala de estudio</b> <span class="sub">· estudia los temas uno a uno, sabiendo qué cae · ' + hechos + "/" + lista.length + " estudiados · " + pct + "%" + (nCamb ? ' · <span class="est-nuevo">🆕 ' + nCamb + (nCamb === 1 ? " lección cambiada" : " lecciones cambiadas") + "</span>" : "") + "</span></summary>";
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
    h += '<p class="est-ayuda">Un tema por sesión: lee por apartados, responde antes y después de cada uno, y termina con la batería del tema. 🔥 = cuánto cae en examen · 📝 = las que más caen (exámenes de otros años y lo que el profesor dijo que cae).</p>';
    bloques.forEach(function (bl) {
      h += '<div class="est-bloque"><div class="est-bloque-t">' + esc(bl) + "</div>";
      lista.filter(function (e) { return e.bloque === bl; }).forEach(function (e) {
        var st = estadoTema(e), s = _d.t[e.tema];
        var av = Math.round(avanceTema(e) * 100);
        h += '<div class="est-fila ' + st.cls + '"><button class="est-tema" data-est="abrir" data-n="' + e.tema + '"><span class="n">' + esc(corto(e)) + "</span> " + esc(e.titulo) +
          '<span class="meta">' + (cambiada(e) ? '<span class="est-nuevo" title="Ha cambiado desde que la abriste el ' + diaMes(ultimaVisita(e.tema)) + '">🆕 Cambiada el ' + diaMes(e.mod) + "</span> · " : "") + '<span title="Peso en examen">' + fuego(e.peso) + "</span> · " + (e.minutos || "?") + " min · " + st.txt + "</span>" +
          '<span class="est-mini" title="' + av + '% del tema (lectura y batería)"><span style="width:' + av + '%"></span></span></button>' +
          '<button class="est-bat" data-est="bat" data-n="' + e.tema + '" title="Batería de preguntas del tema">🎯 ' + (e.bateria || "") + "</button>" +
          ((e.caen || e.examen) ? '<button class="est-bat ex" data-est="bat-ex" data-n="' + e.tema + '" title="Las que más caen: exámenes de otros años y lo que el profesor dijo que cae">📝 ' + (e.caen || e.examen) + "</button>" : "") + "</div>";
        h += filasPrograma(e.tema);
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
      p.addEventListener("input", function (ev) {
        if (ev.target.matches(".est-hueco")) ev.target.classList.remove("ok", "mal");
        // Lo que escribe en «explícalo» se guarda, para que no se pierda al corregir o al volver
        if (ev.target.matches(".est-expl textarea") && vista) { var s = est(vista.n); (s.explTxt = s.explTxt || {})[ev.target.getAttribute("data-i")] = ev.target.value; guardar(); }
      });
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
  App.showScreen = function () { var p = document.getElementById("estudio-screen"); if (p) p.classList.add("hidden"); var r = show0.apply(this, arguments); botonTutorQuiz(); return r; };

  // Botón del tutor mientras se hacen las preguntas de la batería (o el repaso) de un tema:
  // la pantalla de preguntas es la del motor, fuera de la sala, y no tenía forma de abrirlo.
  // Al abrirlo desde aquí, el tutor ya sabe de qué tema es y deja escrita la pregunta en curso.
  var temaBateria = null;
  function botonTutorQuiz() {
    var b = document.getElementById("est-tutor-quiz"), qz = document.getElementById("quiz-screen");
    var ses = State.session, en = temaBateria !== null && ses && ses.mode === "estudio" && qz && !qz.classList.contains("hidden");
    if (!en) { if (b) b.classList.add("hidden"); return; }
    if (!b) {
      b = document.createElement("button");
      b.id = "est-tutor-quiz"; b.className = "est-flota";
      b.title = "Tutor con IA de este tema: pregúntale por la pregunta que estás haciendo";
      b.textContent = "💬 Tutor";
      b.addEventListener("click", function () {
        var ses = State.session, q = ses && ses.questions && ses.questions[ses.currentIdx];
        Tutor.abrir(temaBateria === "prog" ? temaDePrograma(q) : temaBateria, q ? "Explícame esta pregunta: «" + q.q + "» (opciones: " + q.options.join(" / ") + "). " : "");
      });
      document.body.appendChild(b);
    }
    b.classList.remove("hidden");
  }

  function abrir(n, paso) {
    cargarTema(n).then(function (t) {
      var s = est(n), e = (indice.temas || []).filter(function (x) { return x.tema === n; })[0] || {};
      if (!cambiosVistos[n] && cambiada(e)) { var desde = ultimaVisita(n); cambiosVistos[n] = { desde: desde, mod: e.mod, secs: novedades(e, desde) }; }
      if (!s.ini) s.ini = Date.now();
      s.vis = Date.now(); marcarDia(n); guardar();
      vista = { n: n, t: t, pasos: pasos(t), cambios: cambiosVistos[n] || null };
      if (typeof paso === "number") s.paso = paso;
      if (s.paso >= vista.pasos.length) s.paso = vista.pasos.length - 1;
      mostrar(true);
      pintar();
    }).catch(function (e) { console.warn("estudio", e); alert("No se ha podido cargar el tema. Revisa la conexión."); });
  }
  function salir() { vista = null; mostrar(false); App.goHome(); }

  // Empezar de cero las preguntas del tema (previas, comprobaciones, huecos y explícalo) para
  // volver a hacerlo sin ver lo que respondió antes. Lo hecho no se pierde: queda sumado en
  // s.vueltas, y lo que cuenta en la portada (tema estudiado, batería, repasos) no se toca.
  function respondidas(s) { return Object.keys(s.resp || {}).filter(function (c) { return /^(pre|com):\d+:\d+$/.test(c); }); }
  function reiniciar(n) {
    var s = est(n), cl = respondidas(s), hu = Object.keys(s.huecos || {});
    (s.vueltas = s.vueltas || []).push({ t: Date.now(), n: cl.length, ok: cl.filter(function (c) { return s.resp[c]; }).length,
      hu: hu.length, huOk: hu.filter(function (j) { return s.huecos[j]; }).length });
    s.resp = {}; s.huecos = {}; s.expl = {};
    delete s.explTxt; delete s.explIA;
    Object.keys(s).forEach(function (k) { if (/^leer\d+$/.test(k)) delete s[k]; });
    s.paso = 0;
    guardar();
  }
  function botonReiniciar(s) {
    if (!respondidas(s).length && !Object.keys(s.huecos || {}).length && !Object.keys(s.expl || {}).length) return "";
    return '<button class="est-reini" data-acc="reini" title="Borra tus respuestas de este tema para volver a hacerlo. Lo estudiado sigue contando.">🔄 Hacer el tema otra vez desde cero</button>';
  }
  function textoVueltas(s) {
    var v = s.vueltas || [];
    if (!v.length) return "";
    var u = v[v.length - 1];
    return '<p class="est-ayuda">🔄 Vuelta ' + (v.length + 1) + " a este tema. La anterior (" + diaMes(u.t) + "): " + u.ok + "/" + u.n + " preguntas bien" + (u.hu ? " · " + u.huOk + "/" + u.hu + " huecos" : "") + ".</p>";
  }

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
    h += '<div class="est-q-et">' + etiqueta + (deExamen ? " · 📝 " + esc(q.topicBase.replace(/^📝\s*/, "")) : q.caida ? " · 📝 cayó en " + esc(q.caida.join(", ")) : /^🎯/.test(q.topicBase || "") ? " · 🎯 Kahoot / clase" : "") +
      (q.cae ? ' · <span class="est-cae" title="' + esc(q.cae.p || "") + '">🔴 el profesor dijo que cae</span>' : "") + "</div>";
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

  // ----- lo que ha cambiado desde la última visita
  function esNueva(i) { return !!(vista && vista.cambios && vista.cambios.secs.indexOf(i) >= 0); }
  function cajaCambios(p) {
    var c = vista.cambios;
    if (!c) return "";
    var t = vista.t, enlaces = c.secs.map(function (i) {
      return '<button class="est-mini-b" data-acc="ir" data-i="' + (i + 1) + '">' + (i + 1) + ". " + esc(t.secciones[i] ? t.secciones[i].titulo : "") + "</button>";
    }).join(" ");
    if (p.k !== "intro") return c.secs.length ? '<div class="est-nuevo-caja corta">🆕 Cambiado desde tu última visita: ' + enlaces + "</div>" : "";
    return '<div class="est-nuevo-caja"><b>🆕 Esta lección ha cambiado</b> el ' + diaMes(c.mod) + " (la abriste por última vez el " + diaMes(c.desde) + "). " +
      (c.secs.length ? "Apartados nuevos o retocados:<div class=\"est-botones\">" + enlaces + "</div>" : "El cambio está en la introducción o en el cierre del tema.") + "</div>";
  }

  // ----- pintar el paso actual
  function pintar() {
    if (!vista) return;
    if (vista.prog) return pintarPrograma();
    var t = vista.t, s = est(vista.n), p = vista.pasos[s.paso], tot = vista.pasos.length;
    var h = '<div class="est-top"><button class="est-salir" data-acc="salir">← Salir</button><div class="est-tit">' + esc(nombre(t)) + " · " + esc(t.titulo) + "</div>" +
      '<div class="est-barra"><div style="width:' + Math.round(s.paso * 100 / (tot - 1)) + '%"></div></div>' +
      '<div class="est-donde">' + (p.k === "sec" ? "Apartado " + (p.i + 1) + " de " + t.secciones.length : p.k === "intro" ? "Inicio" : p.k === "rellenar" ? "Rellenar" : p.k === "explicalo" ? "Explícalo" : "Batería") + " · " + Math.round(s.paso * 100 / (tot - 1)) + "% del tema</div>" +
      '<div class="est-migas">' + vista.pasos.map(function (x, i) {
        var nom = x.k === "intro" ? "Inicio" : x.k === "sec" ? (i) + "" : x.k === "rellenar" ? "✍️" : x.k === "explicalo" ? "🗣️" : "🎯";
        var ok = x.k === "sec" ? notaSeccion(s, t, x.i) : null;
        var nueva = x.k === "sec" && esNueva(x.i);
        return '<button class="miga' + (i === s.paso ? " act" : i < s.paso || s.fin ? " vista" : "") + (ok === 1 ? " bien" : ok === 0 ? " floja" : "") + (nueva ? " nueva" : "") + '" data-acc="ir" data-i="' + i + '" title="' + esc(x.k === "sec" ? t.secciones[x.i].titulo + (nueva ? " · 🆕 cambiado desde tu última visita" : "") + (ok === 1 ? " · comprobación bien" : ok === 0 ? " · falló alguna comprobación" : "") : "") + '">' + nom + (ok === 1 ? "✓" : "") + "</button>";
      }).join("") + "</div></div>";
    h += '<div class="est-pag">';
    h += cajaCambios(p);
    if (p.k === "intro") {
      h += "<h2>" + esc(nombre(t)) + " · " + esc(t.titulo) + "</h2>" + '<div class="est-meta">' + fuego(t.peso) + " · unos " + (t.minutos || "?") + " min · " + t.secciones.length + " apartados</div>";
      h += md(t.intro);
      h += textoVueltas(s);
      if (t.pesoPorQue) h += '<div class="est-caja asi"><b>🔥 Qué cae de este tema</b>' + md(t.pesoPorQue) + "</div>";
      var cc = cuentaCae(t);
      if (cc.n) h += '<div class="est-caja cae"><b>📝 Lo que más cae, en preguntas</b><p>' +
        [cc.ex ? cc.ex + " de exámenes de otros años" + (cc.rep ? " (" + cc.rep + " repetidas en varias convocatorias)" : "") : "", cc.cae ? "🔴 " + cc.cae + " sobre lo que el profesor dijo que cae" : ""].filter(Boolean).join(" · ") +
        ". " + (cc.sinVer === cc.n ? "Aún no has hecho ninguna." : "Te faltan " + cc.sinVer + " por ver y fallas " + cc.falladas + ".") + "</p>" +
        '<div class="est-botones"><button data-acc="bat-ex">▶️ Hacer primero las que más caen (' + cc.n + ")</button></div></div>";
      h += cajaConfusiones(confusionesTema(vista.n), true);
      h += '<ol class="est-indice">' + t.secciones.map(function (x, i) { var ok = notaSeccion(s, t, i); return '<li><button data-acc="ir" data-i="' + (i + 1) + '">' + esc(x.titulo) + "</button> " + fuego(x.peso) + (esNueva(i) ? ' <span class="est-nuevo">🆕 cambiado</span>' : "") + (ok === 1 ? ' <span class="est-ok">✓ hecho</span>' : ok === 0 ? ' <span class="est-flojo">✓ hecho · repásalo</span>' : "") + "</li>"; }).join("") + "</ol>";
      if (s.notas && s.notas.length) h += '<details class="est-caja notas" open><summary><b>🗂️ Tus notas del tutor</b> <span class="sub">(' + s.notas.length + ")</span></summary>" + s.notas.map(function (x, i) { return '<div class="est-nota">' + pintarRespuesta(x) + '<button class="est-mini-b" data-acc="borra-nota" data-i="' + i + '">Quitar</button></div>'; }).join("") + "</details>";
      h += '<div class="est-caja clave"><b>Cómo se usa</b><ul><li>En cada apartado, primero una pregunta real <b>antes de leer</b>: respóndela aunque no la sepas (no cuenta; así lo retienes mejor).</li><li>Lee con calma y abre los 🤔 solo después de pensarlos.</li><li>Al final del apartado, la comprobación. Al final del tema, el cuadro para rellenar, el «explícalo» y la batería.</li></ul></div>';
      h += '<button class="est-sigue" data-acc="ir" data-i="1">Empezar →</button>';
      h += botonReiniciar(s);
    } else if (p.k === "sec") {
      var sec = t.secciones[p.i], previas = sec.previa || [], pend = previas.some(function (_, j) { return s.resp["pre:" + p.i + ":" + j] === undefined; });
      h += '<div class="est-meta">Apartado ' + (p.i + 1) + " de " + t.secciones.length + ' · <span title="Peso en examen">' + fuego(sec.peso) + "</span></div><h2>" + esc(sec.titulo) + (esNueva(p.i) ? ' <span class="est-nuevo">🆕 cambiado desde tu última visita</span>' : "") + "</h2>";
      if (sec.pesoPorQue) h += '<div class="est-peso">🔥 ' + esc(sec.pesoPorQue) + "</div>";
      h += cajaConfusiones(confusionesTema(vista.n).filter(function (c) { return c.sala.i === p.i; }), false);
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
      var ia = window.EntrenadorIA && EntrenadorIA.conectada();
      if (ia) h += '<p class="est-ayuda">🧠 Si lo escribes, la IA te lo corrige como en un examen: qué tienes, qué te falta (primero lo que cae) y qué está mal.</p>';
      t.explicalo.forEach(function (x, i) {
        var v = s.expl[i], cor = (s.explIA || {})[i], txt = (s.explTxt || {})[i] || "";
        h += '<div class="est-expl"><div class="est-q-txt">' + esc(x.pide) + '</div><textarea rows="' + (ia ? 5 : 3) + '" data-i="' + i + '" placeholder="Tu explicación' + (ia ? "" : " (opcional)") + '…">' + esc(txt) + "</textarea>";
        if (ia) h += '<div class="est-botones"><button data-acc="corrige" data-i="' + i + '"' + (corrigiendo[i] ? " disabled" : "") + ">" + (corrigiendo[i] ? "Corrigiendo…" : cor ? "🧠 Corregir otra vez" : "🧠 Corrígemelo") + "</button></div>";
        if (cor) h += pintarCorreccion(cor);
        h += '<details' + (v !== undefined || cor ? " open" : "") + '><summary>Ver la respuesta modelo</summary>' + md(x.modelo) +
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
      h += botonReiniciar(s);
      if (!s.fin) { s.fin = Date.now(); guardar(); }
    }
    h += "</div>";
    h += '<button class="est-flota" data-acc="tutor" title="Tutor con IA: tablas, explicaciones, repasos y preguntas de este tema">💬 Tutor</button>';
    h += '<button class="est-flota siglas-b" data-acc="siglas" title="Siglas de este tema y su significado">🔤 Siglas</button><aside id="est-siglas"></aside>';
    pantalla().innerHTML = h;
    cargarSiglas().then(pintarSiglas);
  }

  // ----- ventana de siglas: a la derecha del texto (en pantalla ancha), fija mientras se lee.
  // Arriba, las siglas del apartado que se está leyendo, por orden de aparición; debajo, las del resto del tema.
  function textoDe(x, acc) {
    if (typeof x === "string") acc.push(x);
    else if (Array.isArray(x)) x.forEach(function (y) { textoDe(y, acc); });
    else if (x && typeof x === "object") Object.keys(x).forEach(function (k) { if (k !== "bateria" && k !== "src") textoDe(x[k], acc); });
    return acc;
  }
  function siglasEn(txt) {
    var out = [];
    Object.keys(siglas || {}).forEach(function (sg) {
      var re = new RegExp("(^|[^\\wÁÉÍÓÚÑáéíóúñ])" + sg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?![\\wÁÉÍÓÚÑáéíóúñ])");
      var m = re.exec(txt);
      if (m) out.push([m.index, sg]);
    });
    return out.sort(function (a, b) { return a[0] - b[0]; }).map(function (x) { return x[1]; });
  }
  function pintarSiglas() {
    var box = document.getElementById("est-siglas");
    if (!box || !vista) return;
    if (!siglas || !Object.keys(siglas).length) { box.innerHTML = ""; box.classList.add("vacia"); return; }
    var pag = document.querySelector("#estudio-screen .est-pag");
    var aqui = siglasEn(pag ? pag.textContent : "");
    var cache = vista.siglasTema || (vista.siglasTema = siglasEn(textoDe(vista.t, []).join("\n")));
    var resto = cache.filter(function (x) { return aqui.indexOf(x) < 0; });
    var fila = function (sg) { return '<div class="sg"><b>' + esc(sg) + "</b><span>" + esc(siglas[sg]) + "</span></div>"; };
    var plegado = false; try { plegado = localStorage.getItem(K + "_siglas_resto") === "0"; } catch (e) {}
    var h = '<div class="sg-top"><b>🔤 Siglas</b><button class="sg-x" data-acc="siglas" title="Cerrar">✕</button></div><div class="sg-cuerpo">';
    h += '<div class="sg-t">En lo que estás leyendo</div>' + (aqui.length ? aqui.map(fila).join("") : '<div class="sub">Aquí no sale ninguna sigla.</div>');
    if (resto.length) h += '<details class="sg-resto"' + (plegado ? "" : " open") + '><summary class="sg-t">Resto del tema (' + resto.length + ")</summary>" + resto.map(fila).join("") + "</details>";
    box.innerHTML = h + "</div>";
    box.classList.remove("vacia");
    var d = box.querySelector(".sg-resto");
    if (d) d.addEventListener("toggle", function () { try { localStorage.setItem(K + "_siglas_resto", d.open ? "1" : "0"); } catch (e) {} });
  }

  // Un apartado está hecho cuando se han respondido sus comprobaciones: 1 si todas bien, 0 si falló alguna, null si no
  function notaSeccion(s, t, i) {
    var com = t.secciones[i].comprueba || [];
    if (!com.length) return null;
    var r = com.map(function (_, j) { return s.resp["com:" + i + ":" + j]; });
    if (r.some(function (x) { return x === undefined; })) return null;
    return r.every(function (x) { return x === 1; }) ? 1 : 0;
  }

  function deExamen(q) { return !!q && (/^📝/.test(q.topicBase) || /Examen/.test(q.topicBase) || !!(q.caida && q.caida.length) || (window.Entrenador && Entrenador.origen(q).tipo === "examen")); }
  // Las que más caen: las de exámenes de otros años y las de lo que el profesor dijo en clase que se pregunta
  function examenes(t) {
    return (t.bateria || []).filter(function (id) { var q = BY_ID.get(id); return q && (deExamen(q) || q.cae); });
  }
  // Cuánto vale una pregunta para el examen (1 = entrenamiento normal): el mismo peso que usa el plan
  function valor(q) {
    if (window.PlanExamen && PlanExamen.factor) { try { return PlanExamen.factor(q); } catch (e) {} }
    return deExamen(q) && q.cae ? 2.2 : deExamen(q) || q.cae ? 1.9 : /^🎯/.test(q.topicBase || "") ? 1.6 : 1;
  }
  // Orden de una batería: primero lo que cayó en examen y además dijo que cae, luego examen o «cae»,
  // luego lo que puso el profesor y al final el resto; dentro de cada grupo, al azar
  function porPrioridad(qs) {
    return shuffle(qs).map(function (q, i) { return [q, i, Math.round(valor(q) * 4)]; }).sort(function (a, b) {
      return b[2] - a[2] || a[1] - b[1];
    }).map(function (x) { return x[0]; });
  }
  function bateria(n, soloExamen) {
    cargarTema(n).then(function (t) {
      var ids = soloExamen ? examenes(t) : t.bateria;
      var qs = ids.map(function (id) { return BY_ID.get(id); }).filter(Boolean);
      if (!qs.length) return alert("Este tema aún no tiene batería.");
      vista = null;
      document.getElementById("estudio-screen") && document.getElementById("estudio-screen").classList.add("hidden");
      temaBateria = n;
      App.beginSession(porPrioridad(qs), "estudio");
      botonTutorQuiz();
    });
  }
  // Lo que cae de un tema, contado: exámenes (y cuántas repetidas), lo que dijo el profesor y cuántas fallas
  function cuentaCae(t) {
    var c = { ex: 0, rep: 0, cae: 0, falladas: 0, sinVer: 0, n: 0 }, qs = State.data.qs || {};
    examenes(t).forEach(function (id) {
      var q = BY_ID.get(id), s = qs[id];
      c.n++;
      if (deExamen(q)) { c.ex++; if (window.Entrenador && (Entrenador.origen(q).veces || 1) > 1) c.rep++; }
      if (q.cae) c.cae++;
      if (!s || !s.a) c.sinVer++;
      else { var h = Array.isArray(s.h) && s.h.length ? s.h[s.h.length - 1] : null; if (h ? h[1] !== 1 : s.l === 0) c.falladas++; }
    });
    return c;
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
    if (vista.prog) return clicPrograma(b);
    var s = est(vista.n);
    marcarDia(vista.n);
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
    if (acc === "siglas") { var sg = document.getElementById("est-siglas"); if (sg) sg.classList.toggle("abierta"); return; }
    if (acc === "reini") {
      // Dos toques, sin ventana de confirmación: el primero pregunta, el segundo borra
      if (!b.classList.contains("seguro")) { b.classList.add("seguro"); b.textContent = "¿Seguro? Toca otra vez: se borran tus respuestas de este tema (lo estudiado sigue contando)"; return; }
      reiniciar(vista.n); pintar(); window.scrollTo(0, 0); return;
    }
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
    else if (acc === "corrige") corregirExplicalo(+b.getAttribute("data-i"));
    else if (acc === "conf-ir") irPaso(+b.getAttribute("data-i") + 1);
    else if (acc === "conf-ok") { if (window.PlanExamen && PlanExamen.resolver) PlanExamen.resolver(+b.getAttribute("data-t")); var y3 = window.scrollY; pintar(); window.scrollTo(0, y3); }
  }

  // ------------------------------------------------------------------ programa de repaso
  // Un apartado de la sala hecho solo de preguntas (estudio/<clave>/programa-NN.json, lo
  // rehace tools/programa_repaso.py): las que más caen de unos temas y las preguntas de examen
  // huérfanas de esos temas, repartidas en exámenes fijos de unas 100 con los temas mezclados.
  // Los exámenes son fijos para ver cómo mejora la nota al repetirlos. Cada intento se guarda
  // en _d.p[archivo][nº de examen] = [{t, n, ok, mal}]; «fall» son todas las que ha fallado alguna vez
  // en el programa (_d.pf[archivo]) y «azar» uno
  // al azar. Lo que se responde cuenta en el motor como cualquier otra pregunta.
  var programas = {}, progActivo = null;
  if (!_d.p) _d.p = {};
  function cargarPrograma(a) {
    if (programas[a]) return Promise.resolve(programas[a]);
    return pedir(a).then(function (p) { programas[a] = p; return p; });
  }
  function intentos(a, ex) { var x = (_d.p || {})[a]; return (x && x[ex]) || []; }
  function temaDePrograma(q) {
    var a = progActivo && progActivo.a, p = a && programas[a];
    return (p && q && p.tema[q.id]) || null;
  }
  function filasPrograma(n) {
    return ((indice && indice.programas) || []).filter(function (g) { return g.despues === n; }).map(function (g) {
      var hechos = g.examenes.filter(function (_, i) { return intentos(g.archivo, i).length; }).length;
      var ult = [];
      g.examenes.forEach(function (_, i) { var l = intentos(g.archivo, i); if (l.length) ult.push(l[l.length - 1]); });
      var ok = ult.reduce(function (a, x) { return a + x.ok; }, 0), tot = ult.reduce(function (a, x) { return a + x.n; }, 0);
      return '<div class="est-fila prog' + (hechos === g.examenes.length ? " dominado" : hechos ? " curso" : "") + '"><button class="est-tema" data-est="prog" data-a="' + esc(g.archivo) + '"><span class="n">📋</span> ' + esc(g.titulo) +
        '<span class="meta">Solo preguntas · ' + g.examenes.length + " exámenes de ~" + Math.round(g.preguntas / g.examenes.length) + " · " + g.preguntas + " preguntas · " +
        (hechos ? hechos + "/" + g.examenes.length + " hechos · " + Math.round(ok * 100 / (tot || 1)) + "% bien" : "sin empezar") + "</span></button></div>";
    }).join("");
  }
  function abrirPrograma(a) {
    cargarPrograma(a).then(function (p) {
      vista = { prog: a, p: p };
      mostrar(true);
      pintar();
    }).catch(function (e) { console.warn("estudio", e); alert("No se ha podido cargar el programa. Revisa la conexión."); });
  }
  function ultimaRespuesta(id) {
    var s = State.data.qs && State.data.qs[id];
    if (!s || !s.a) return null;
    var h = Array.isArray(s.h) && s.h.length ? s.h[s.h.length - 1] : null;
    return h ? h[1] === 1 : s.l !== 0;
  }
  function todasPrograma(p) { return [].concat.apply([], p.examenes); }
  // Todas las que ha fallado alguna vez haciendo este programa (_d.pf[archivo]), aunque luego
  // las acierte. La primera vez se rellena con lo que tenía fallado y con los fallos del
  // historial desde un día antes del primer examen apuntado.
  function falladasPrograma(a, p) {
    if (!_d.pf) _d.pf = {};
    if (!_d.pfIni) _d.pfIni = {};
    var l = _d.pf[a] || (_d.pf[a] = []);
    if (!_d.pfIni[a]) {
      var t0 = Infinity, x = _d.p[a] || {};
      Object.keys(x).forEach(function (k) { (x[k] || []).forEach(function (r) { t0 = Math.min(t0, r.t); }); });
      t0 = (t0 - 864e5) / 1000;
      todasPrograma(p).forEach(function (id) {
        var s = State.data.qs && State.data.qs[id];
        var mal = ultimaRespuesta(id) === false || (s && Array.isArray(s.h) && s.h.some(function (h) { return h[1] !== 1 && h[0] >= t0; }));
        if (mal && l.indexOf(id) < 0) l.push(id);
      });
      _d.pfIni[a] = 1; guardar();
    }
    return l;
  }
  function apuntarFallo(a, id) {
    if (!_d.pf) _d.pf = {};
    var l = _d.pf[a] || (_d.pf[a] = []);
    if (l.indexOf(id) < 0) { l.push(id); guardar(); }
  }
  // Al azar, pero primero lo que no ha visto nunca y lo que falló
  function azarPrograma(p) {
    var l = shuffle(todasPrograma(p)).map(function (id) { var r = ultimaRespuesta(id); return [id, r === false ? 0 : r === null ? 1 : 2]; });
    l.sort(function (x, y) { return x[1] - y[1]; });
    return l.slice(0, p.tam || 100).map(function (x) { return x[0]; });
  }
  // Por defecto corrige cada pregunta; el simulacro (corrige al final) hay que elegirlo
  function comoExamen() { try { return localStorage.getItem(K + "_prog_corr") === "examen"; } catch (e) { return false; } }
  function nota(x) { return Math.round(x.ok * 100 / (x.n || 1)); }
  function pintarPrograma() {
    var a = vista.prog, p = vista.p, ex = comoExamen();
    var porTema = {};
    Object.keys(p.tema).forEach(function (id) { porTema[p.tema[id]] = (porTema[p.tema[id]] || 0) + 1; });
    var ets = {};
    (indice.temas || []).forEach(function (e) { ets[e.tema] = e; });
    var todas = todasPrograma(p), vistas = 0, bien = 0;
    todas.forEach(function (id) { var r = ultimaRespuesta(id); if (r !== null) { vistas++; if (r) bien++; } });
    var fall = falladasPrograma(a, p), sig = -1, yaBien = fall.filter(function (id) { return ultimaRespuesta(id) === true; }).length;
    p.examenes.forEach(function (_, i) { if (sig < 0 && !intentos(a, i).length) sig = i; });
    var h = '<div class="est-top"><button class="est-salir" data-acc="salir">← Salir</button><div class="est-tit">📋 ' + esc(p.titulo) + "</div></div>";
    h += '<div class="est-pag"><h2>📋 ' + esc(p.titulo) + "</h2>";
    h += '<div class="est-meta">' + todas.length + " preguntas · " + p.examenes.length + " exámenes · " + vistas + " respondidas alguna vez · " + bien + " bien la última vez</div>";
    if (p.intro) h += '<div class="est-txt">' + md(p.intro) + "</div>";
    h += '<div class="est-prog-temas">' + p.temas.map(function (n) {
      return '<span title="' + esc(ets[n] ? ets[n].titulo : "") + '">' + esc(ets[n] ? corto(ets[n]) : "T" + n) + " · " + (porTema[n] || 0) + "</span>";
    }).join("") + "</div>";
    h += '<div class="est-prog-modo"><button data-acc="pmodo" data-v="cada" class="' + (ex ? "" : "act") + '">✅ Corrigiendo cada pregunta (con tutor)</button>' +
      '<button data-acc="pmodo" data-v="examen" class="' + (ex ? "act" : "") + '">📝 Como en el examen: corrige al final</button></div>';
    h += '<p class="est-ayuda">' + (ex ? "📝 Modo examen: no verás si aciertas ni la explicación hasta terminar; al acabar, «🔍 Revisar respuestas» te las enseña todas."
      : "✅ Cada pregunta se corrige al responderla y sale su explicación.") + "</p>";
    h += '<div class="est-pex-lista">';
    p.examenes.forEach(function (ids, i) {
      var l = intentos(a, i), u = l[l.length - 1], mejor = l.reduce(function (m, x) { return Math.max(m, nota(x)); }, 0);
      h += '<div class="est-pex' + (u ? (nota(u) >= 80 ? " bien" : nota(u) >= 50 ? " medio" : " flojo") : "") + (i === sig ? " sig" : "") + '"><div class="est-pex-t"><b>Examen ' + (i + 1) + "</b> · " + ids.length + " preguntas" +
        '<span class="meta">' + (u ? "Último (" + diaMes(u.t) + "): " + u.ok + "/" + u.n + " · " + nota(u) + "%" + (l.length > 1 ? " · mejor " + mejor + "% · " + l.length + " veces" : "") : i === sig ? "▶️ Te toca este" : "Sin hacer") + "</span></div>" +
        '<button data-acc="pex" data-i="' + i + '">' + (u ? "🔁 Repetir" : "▶️ Hacer") + "</button></div>";
    });
    h += "</div>";
    var lf = intentos(a, "fall"), lz = intentos(a, "azar");
    h += '<div class="est-botones">' + (fall.length ? '<button data-acc="pex" data-i="fall">❌ Repasar todas las que he fallado (' + fall.length + (yaBien ? " · " + yaBien + " ya acertadas después" : "") + ")</button>" : "") +
      '<button data-acc="pex" data-i="azar">🎲 Un examen al azar de ' + Math.min(todas.length, p.tam || 100) + " (primero lo no visto y lo fallado)</button></div>";
    if (lf.length || lz.length) h += '<p class="est-ayuda">' + [lf.length ? "Falladas, la última vez: " + lf[lf.length - 1].ok + "/" + lf[lf.length - 1].n : "", lz.length ? "Al azar, la última vez: " + lz[lz.length - 1].ok + "/" + lz[lz.length - 1].n : ""].filter(Boolean).join(" · ") + "</p>";
    h += '<p class="est-ayuda">Cada examen tiene siempre las mismas preguntas, en otro orden cada vez, para que veas cómo sube la nota al repetirlo. Lo que respondes aquí cuenta para el avance, los repasos y el plan como cualquier otra pregunta.</p>';
    h += '<div class="est-botones"><button data-acc="salir">← Salir</button></div></div>';
    var pan = pantalla();
    pan.innerHTML = h;
  }
  function clicPrograma(b) {
    var acc = b.getAttribute("data-acc"), p = vista.p, a = vista.prog;
    if (acc === "salir") return salir();
    if (acc === "pmodo") { try { localStorage.setItem(K + "_prog_corr", b.getAttribute("data-v")); } catch (e) {} return pintar(); }
    if (acc !== "pex") return;
    var i = b.getAttribute("data-i"), ids = i === "fall" ? falladasPrograma(a, p).slice() : i === "azar" ? azarPrograma(p) : p.examenes[+i];
    var qs = (ids || []).map(function (id) { return BY_ID.get(id); }).filter(Boolean);
    if (!qs.length) return alert("No hay preguntas para este examen.");
    var ex = comoExamen(), pen = document.getElementById("exam-pen");
    progActivo = { a: a, ex: i, ids: qs.map(function (q) { return q.id; }) };
    _d.pAct = progActivo; guardar();
    vista = null;
    document.getElementById("estudio-screen").classList.add("hidden");
    temaBateria = ex ? null : "prog";
    App.beginSession(shuffle(qs), ex ? "exam" : "estudio", ex ? { exam: true, penaliza: !!(pen && pen.checked) } : undefined);
    botonTutorQuiz();
  }
  // Cada fallo dentro del programa queda apuntado para «Repasar todas las que he fallado»
  var resp0 = App.answer;
  App.answer = function () {
    var ses = State.session, q = ses && ses.questions && ses.questions[ses.currentIdx], ya = q && ses.answers && ses.answers[q.id];
    var r = resp0.apply(this, arguments);
    try {
      var act = progActivo || _d.pAct, x = q && !ya && ses.answers[q.id];
      if (act && x && !x.wasCorrect && act.ids.indexOf(q.id) >= 0) apuntarFallo(act.a, q.id);
    } catch (e) { console.warn("estudio", e); }
    return r;
  };
  // Al acabar un examen del programa se apunta la nota (si la sesión es la que se empezó aquí)
  var fin0 = App.finishQuiz;
  App.finishQuiz = function () {
    var ses = State.session, act = progActivo || _d.pAct;
    var r = fin0.apply(this, arguments);
    var vuelta = document.getElementById("est-prog-volver");
    if (vuelta) vuelta.remove();
    try {
      // (el motor quita las repetidas al empezar, así que puede traer alguna menos)
      if (act && ses && ses.questions && ses.questions.length && ses.questions.length >= act.ids.length * 0.8 && ses.questions.every(function (q) { return act.ids.indexOf(q.id) >= 0; })) {
        if (!_d.p) _d.p = {};
        var x = _d.p[act.a] || (_d.p[act.a] = {});
        (x[act.ex] = x[act.ex] || []).push({ t: Date.now(), n: ses.questions.length, ok: ses.correct, mal: ses.wrong });
        if (x[act.ex].length > 30) x[act.ex].shift();
        progActivo = null; delete _d.pAct; guardar();
        if (temaBateria === "prog") temaBateria = null;
        var res = document.getElementById("results-screen");
        if (res) {
          vuelta = document.createElement("button");
          vuelta.id = "est-prog-volver"; vuelta.className = "btn btn-primary";
          vuelta.textContent = "📋 Volver al programa de repaso";
          vuelta.style.margin = "12px auto"; vuelta.style.display = "block";
          vuelta.addEventListener("click", function () { vuelta.remove(); abrirPrograma(act.a); });
          res.insertBefore(vuelta, res.firstChild);
        }
      }
    } catch (e) { console.warn("estudio", e); }
    return r;
  };

  // ------------------------------------------------------------------ repaso inteligente
  // Sin IA: ordena las preguntas de la batería de un tema por lo que más conviene repasar.
  function puntoRepaso(id) {
    var q = BY_ID.get(id), s = State.data.qs && State.data.qs[id];
    if (!q) return null;
    var ex = deExamen(q) || !!q.cae, v = valor(q);
    var p = 0, por = "";
    if (!s || !s.a) { p = 0.5 * v * v; por = "nueva"; }
    else {
      var h = Array.isArray(s.h) && s.h.length ? s.h[s.h.length - 1] : null, ok = h ? h[1] === 1 : s.l !== 0;
      if (!ok) { p += 5; por = "fallada"; if (h && h[3] === 1) { p += 2; por = "fallada con seguridad"; } }
      if (typeof isDue === "function" && isDue(s)) { p += 4; por = por || "le toca repaso"; }
      if (ok && h && (h[3] === 2 || h[3] === 3)) { p += 1.5; por = por || "acertada dudando"; }
    }
    if (s && s.a) p *= v;
    return { q: q, p: p, por: por, ex: !!ex, cae: !!q.cae };
  }
  function repasoTema(t) {
    var l = (t.bateria || []).map(puntoRepaso).filter(function (x) { return x && x.p > 0; });
    l.sort(function (a, b) { return b.p - a.p; });
    var c = { fallos: 0, fallosEx: 0, vencidas: 0, dudosas: 0, nuevas: 0 };
    l.forEach(function (x) { if (/fallada/.test(x.por) && x.ex) c.fallosEx++; if (/fallada/.test(x.por)) c.fallos++; else if (x.por === "le toca repaso") c.vencidas++; else if (x.por === "acertada dudando") c.dudosas++; else if (x.por === "nueva") c.nuevas++; });
    return { lista: l, c: c };
  }
  function repasoInteligente(n, cuantas) {
    cargarTema(n).then(function (t) {
      var l = repasoTema(t).lista.slice(0, cuantas || 20).map(function (x) { return x.q; });
      if (!l.length) return alert("No hay nada que repasar en este tema ahora mismo.");
      vista = null;
      var p = document.getElementById("estudio-screen"); if (p) p.classList.add("hidden");
      temaBateria = n;
      App.beginSession(shuffle(l), "estudio");
      botonTutorQuiz();
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
      if (rt.c.fallos) { p += rt.c.fallos * 0.6 + rt.c.fallosEx * 0.6; mot.push(rt.c.fallos + " falladas" + (rt.c.fallosEx ? " (" + rt.c.fallosEx + " de las que caen)" : "")); }
      var cf = confusionesTema(e.tema).length;
      if (cf) { p += 4 * cf; mot.push(cf + (cf === 1 ? " confusión pendiente" : " confusiones pendientes")); }
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

  // ------------------------------------------------------------------ confusiones de la IA
  // Las que ha diagnosticado la IA (tras una sesión o al corregir un «explícalo») y no están resueltas,
  // con el apartado de la sala donde se explica. Viven en el plan de examen (plan_examen.js).
  function confusionesTema(n) {
    if (!(window.PlanExamen && PlanExamen.confusiones)) return [];
    try { return PlanExamen.confusiones().filter(function (c) { return c.sala && c.sala.n === n && c.e !== "resuelta"; }); } catch (e) { return []; }
  }
  function cajaConfusiones(l, conEnlace) {
    if (!l.length) return "";
    return '<div class="est-caja confus"><b>🧠 ' + (l.length === 1 ? "Una confusión tuya pendiente" : l.length + " confusiones tuyas pendientes") + (conEnlace ? " en este tema" : " en este apartado") + "</b>" +
      l.map(function (c) {
        var t = (vista && vista.t && vista.t.secciones[c.sala.i]) ? vista.t.secciones[c.sala.i].titulo : "";
        return '<div class="est-conf"><b>' + esc(c.idea) + "</b>" + (c.regla ? '<div class="regla">Regla: ' + esc(c.regla) + "</div>" : "") +
          '<div class="sub">' + (c.de === "explícalo" ? "Al corregir tu «explícalo»" : "Tras una sesión de test") + " · " + new Date(c.t).toLocaleDateString("es") + " · " + esc(c.txt) + "</div>" +
          '<div class="est-botones">' + (conEnlace && t ? '<button data-acc="conf-ir" data-i="' + c.sala.i + '">📖 ' + esc(t) + "</button>" : "") +
          '<button data-acc="conf-ok" data-t="' + c.t + '">✓ Ya lo tengo claro</button></div></div>';
      }).join("") + "</div>";
  }

  // ----- dónde se explica algo en la sala: el apartado que más palabras poco corrientes comparte con ello
  function palabrasDe(x) { return norma(x).match(/[a-z]{5,}/g) || []; }
  var _ixs = null, _ixsN = -1;
  function indiceSecciones() {
    var cargados = Object.keys(temas).length;
    if (_ixs && _ixsN === cargados) return _ixs;
    var secs = [], df = new Map();
    (indice && indice.temas || []).forEach(function (e) {
      var t = temas[e.tema];
      if (!t) return;
      var bat = new Set(t.bateria || []);
      t.secciones.forEach(function (sec, i) {
        var set = new Set(palabrasDe(sec.titulo + " " + sec.titulo + " " + textoDe(sec.bloques || [], []).join(" ")));
        set.forEach(function (w) { df.set(w, (df.get(w) || 0) + 1); });
        secs.push({ n: e.tema, i: i, tit: nombre(e) + " · " + sec.titulo, set: set, bat: bat });
      });
    });
    _ixs = { secs: secs, df: df }; _ixsN = cargados;
    return _ixs;
  }
  function mejorSeccion(texto, ids, soloTema) {
    var ix = indiceSecciones(), N = ix.secs.length || 1, q = new Set(palabrasDe(texto)), mejor = null;
    ix.secs.forEach(function (sc) {
      if (soloTema != null && sc.n !== soloTema) return;
      var p = 0, comun = 0;
      q.forEach(function (w) { if (sc.set.has(w)) { p += Math.log(1 + N / ix.df.get(w)); comun++; } });
      if (comun < 2) return;
      p = p / Math.sqrt(15 + sc.set.size);
      if ((ids || []).some(function (id) { return sc.bat.has(id); })) p *= 2.5;
      if (!mejor || p > mejor.p) mejor = { n: sc.n, i: sc.i, tit: sc.tit, p: p };
    });
    return mejor;
  }
  // Para entrenador_ia.js: el apartado de la sala de cada confusión diagnosticada (o null)
  function ubicar(items, ids) {
    var listo = indice ? Promise.resolve(indice) : cargarIndice();
    return listo.then(function () {
      return Promise.all((indice.temas || []).map(function (e) { return cargarTema(e.tema).catch(function () { return null; }); }));
    }).then(function () {
      return (items || []).map(function (x) {
        if (!x || !x.idea) return null;
        var m = mejorSeccion([x.idea, x.regla, x.apuntes, x.por_que].join(" "), x.ids || ids);
        return m ? { n: m.n, i: m.i, tit: m.tit } : null;
      });
    });
  }
  // Las preguntas de la batería que más se parecen a una idea (para seguir si la confusión se resuelve)
  function parecidas(t, texto, tope) {
    var q = new Set(palabrasDe(texto));
    return (t.bateria || []).map(function (id) {
      var x = BY_ID.get(id); if (!x) return null;
      var comun = 0; new Set(palabrasDe(x.q + " " + (x.options[x.correct] || ""))).forEach(function (w) { if (q.has(w)) comun++; });
      return comun >= 2 ? [comun, id] : null;
    }).filter(Boolean).sort(function (a, b) { return b[0] - a[0]; }).slice(0, tope).map(function (x) { return x[1]; });
  }

  // ------------------------------------------------------------------ «explícalo» corregido por la IA
  var corrigiendo = {};
  var SISTEMA_CORRIGE = [
    "Eres el profesor que corrige a Santiago, estudiante de 2.º de Medicina (Universidad de Cádiz), en su sala de estudio. Le has pedido que explique algo sin mirar, como una pregunta de desarrollo, y ahora corriges lo que ha escrito.",
    "RECIBES: la pregunta, la respuesta modelo (sacada de sus apuntes), lo que ha escrito él, los apartados más cercanos de sus APUNTES DE CLASE y lo que el profesor dijo que cae en ese tema.",
    "CÓMO CORRIGES. Compara sus ideas con las de la respuesta modelo, no sus palabras: no le quites nota por redacción, orden o sinónimos; sí por imprecisiones de concepto. Si escribe algo correcto que no está en la modelo pero sí en los apuntes, cuenta a su favor. En «falta», pon primero lo que el profesor dijo que cae o lo que se pregunta en examen, y di que es eso. En «errores», lo que afirma mal, con la corrección según los apuntes. Si un error muestra una CONFUSIÓN de concepto (no un simple olvido), descríbela en «confusion» con una regla corta para distinguirlo; si no la hay, null. Nivel: 2 si tiene las ideas clave y nada mal; 1 si le faltan ideas importantes o hay algún error menor; 0 si no contesta lo que se pide o tiene errores de concepto graves. Nota de 0 a 10 como en un examen de desarrollo.",
    "REGLAS. Solo hechos de la respuesta modelo y de los apuntes; si los apuntes y otra fuente chocan, mandan los apuntes de clase. Frases cortas y concretas, sin ánimos ni relleno. Todo en español.",
    'FORMATO: responde SOLO con JSON: {"nivel":0,"nota":0,"bien":["idea que tiene"],"falta":["idea que falta"],"errores":["lo que dice mal → lo correcto"],"confusion":{"idea":"la confusión, en una frase","regla":"cómo distinguirlo"},"consejo":"qué releer, una frase"}'
  ].join("\n\n");
  function pintarCorreccion(c) {
    var niv = ["❌ No te salía", "〰️ A medias", "✅ Lo tenías"][c.nivel] || "";
    var lista = function (tit, l, cls) { return l && l.length ? '<div class="' + cls + '"><b>' + tit + "</b><ul>" + l.map(function (x) { return "<li>" + inl(esc(x)) + "</li>"; }).join("") + "</ul></div>" : ""; };
    return '<div class="est-corr"><div class="est-corr-t">🧠 Corrección' + (typeof c.nota === "number" ? " · <b>" + c.nota + "/10</b>" : "") + " · " + niv + '<span class="sub"> · ' + new Date(c.t).toLocaleDateString("es") + "</span></div>" +
      lista("✅ Lo que tienes", c.bien, "bien") + lista("➕ Lo que te falta", c.falta, "falta") + lista("⚠️ Lo que está mal", c.errores, "mal") +
      (c.confusion && c.confusion.idea ? '<div class="conf"><b>🧩 Confusión:</b> ' + esc(c.confusion.idea) + (c.confusion.regla ? "<br>Regla: " + esc(c.confusion.regla) : "") + '<br><span class="sub">Apuntada en tus confusiones: la verás en el apartado donde se explica y en «Hoy te conviene repasar».</span></div>' : "") +
      (c.consejo ? '<div class="sub">📖 ' + esc(c.consejo) + "</div>" : "") + "</div>";
  }
  function repintar() { var y = window.scrollY; pintar(); window.scrollTo(0, y); }
  function corregirExplicalo(i) {
    if (!vista || !(window.EntrenadorIA && EntrenadorIA.conectada())) return;
    var n = vista.n, t = vista.t, x = t.explicalo[i], s = est(n), txt = String((s.explTxt || {})[i] || "").trim();
    if (!txt) return alert("Escribe primero tu explicación: la IA corrige lo que escribas.");
    if (corrigiendo[i]) return;
    corrigiendo[i] = true; repintar();
    var cae = [], vistas = {};
    examenes(t).forEach(function (id) { var q = BY_ID.get(id); if (q && q.cae && !vistas[q.cae.p]) { vistas[q.cae.p] = 1; cae.push(q.cae.p); } });
    EntrenadorIA.trozos([x.pide + " " + x.modelo, t.titulo + " " + x.pide], 8).then(function (ap) {
      var u = ["ASIGNATURA: " + document.title, "TEMA: " + nombre(t) + " · " + t.titulo,
        t.pesoPorQue ? "QUÉ CAE DE ESTE TEMA (según su sala de estudio): " + t.pesoPorQue : "",
        cae.length ? "LO QUE EL PROFESOR DIJO QUE CAE EN ESTE TEMA:\n- " + cae.slice(0, 15).join("\n- ") : "",
        "PREGUNTA: " + x.pide, "RESPUESTA MODELO:\n" + x.modelo, "LO QUE HA ESCRITO SANTIAGO:\n" + txt,
        ap && ap.length ? "APUNTES DE CLASE MÁS CERCANOS:\n\n" + ap.join("\n\n---\n\n") : ""];
      return EntrenadorIA.llamar(SISTEMA_CORRIGE, u.filter(Boolean).join("\n\n"));
    }).then(function (res) {
      var j; try { var m = String(res.txt).match(/\{[\s\S]*\}/); j = JSON.parse(m ? m[0] : res.txt); } catch (e) { throw new Error("la IA no ha devuelto una corrección legible"); }
      var arr = function (v) { return Array.isArray(v) ? v.map(String).slice(0, 8) : []; };
      var nivel = [0, 1, 2].indexOf(+j.nivel) >= 0 ? +j.nivel : 1;
      var cor = { t: Date.now(), nivel: nivel, nota: isFinite(+j.nota) ? Math.max(0, Math.min(10, Math.round(+j.nota * 10) / 10)) : null,
        bien: arr(j.bien), falta: arr(j.falta), errores: arr(j.errores), consejo: String(j.consejo || ""), txt: txt.slice(0, 3000) };
      var prev = (s.explIA || {})[i];
      if (j.confusion && j.confusion.idea && window.PlanExamen && PlanExamen.recordar) {
        cor.confusion = { idea: String(j.confusion.idea), regla: String(j.confusion.regla || "") };
        var texto = x.pide + " " + cor.confusion.idea + " " + cor.confusion.regla, sec = mejorSeccion(texto, [], n);
        PlanExamen.recordar([{ idea: cor.confusion.idea, regla: cor.confusion.regla, prioridad: nivel === 0 ? "alta" : "media", de: "explícalo",
          sala: sec ? { n: n, i: sec.i, tit: sec.tit } : null, ids: parecidas(t, texto, 6) }], []);
        var ult = PlanExamen.confusiones().slice(-1)[0]; if (ult) cor.ct = ult.t;
      }
      // Si antes le salió una confusión y ahora lo explica bien, queda resuelta
      if (nivel === 2 && prev && prev.ct && window.PlanExamen && PlanExamen.resolver) PlanExamen.resolver(prev.ct);
      (s.explIA = s.explIA || {})[i] = cor;
      s.expl[i] = nivel;
      guardar();
    }).catch(function (e) { alert("No se ha podido corregir: " + (e && e.message || e)); })
      .then(function () { corrigiendo[i] = false; if (vista && vista.n === n) repintar(); });
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
    function abrir(tema, borrador) {
      n = tema === 0 ? null : tema;
      var go = function () { pintarT(); panel().classList.remove("hidden"); var i = document.getElementById("est-tutor-in"); if (i) { if (borrador && !i.disabled && !i.value) i.value = borrador; i.focus(); } };
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
      if (a === "hacer" && m) { var qs = m.ids.map(function (id) { return BY_ID.get(id); }).filter(Boolean); if (!qs.length) return; cerrar(); vista = null; var sc = document.getElementById("estudio-screen"); if (sc) sc.classList.add("hidden"); temaBateria = n === null ? 0 : n; App.beginSession(qs, "estudio"); return botonTutorQuiz(); }
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
    ".est-fila.prog .est-tema{border-left:3px solid var(--warning);background:linear-gradient(90deg,rgba(245,158,11,.10),var(--surface2) 60%)}",
    ".est-prog-temas{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0} .est-prog-temas span{background:var(--surface2);border:1px solid var(--border);border-radius:999px;padding:2px 9px;font-size:.78rem;color:var(--text2)}",
    ".est-prog-modo{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0} .est-prog-modo button{flex:1;min-width:200px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;color:var(--text);padding:8px 10px;cursor:pointer}",
    ".est-prog-modo button.act{border-color:var(--accent);box-shadow:inset 0 0 0 1px var(--accent);font-weight:600}",
    ".est-pex{display:flex;gap:8px;align-items:center;background:var(--surface2);border:1px solid var(--border);border-left:3px solid var(--border);border-radius:8px;padding:9px 12px;margin-bottom:6px}",
    ".est-pex-t{flex:1;min-width:0} .est-pex-t .meta{display:block;font-size:.78rem;color:var(--text2);margin-top:2px}",
    ".est-pex button{background:var(--surface);border:1px solid var(--border);border-radius:8px;color:var(--text);padding:7px 12px;cursor:pointer;white-space:nowrap} .est-pex button:hover{border-color:var(--accent)}",
    ".est-pex.sig{border-left-color:var(--accent)} .est-pex.bien{border-left-color:var(--success)} .est-pex.medio{border-left-color:var(--warning)} .est-pex.flojo{border-left-color:var(--danger)}",
    ".est-sig{width:100%;text-align:left;background:var(--accent);color:#04120c;border:0;border-radius:8px;padding:12px 14px;font-weight:700;cursor:pointer;font-size:.95rem}",
    ".est-bloque{margin-top:12px} .est-bloque-t{font-size:.75rem;text-transform:uppercase;letter-spacing:.06em;color:var(--text2);margin-bottom:6px}",
    ".est-fila{display:flex;gap:6px;margin-bottom:6px} .est-tema{flex:1;text-align:left;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:9px 12px;color:var(--text);cursor:pointer}",
    ".est-tema:hover,.est-bat:hover{border-color:var(--accent)} .est-tema .n{color:var(--accent2);font-weight:700} .est-tema .meta{display:block;font-size:.75rem;color:var(--text2);margin-top:2px}",
    ".est-bat{background:var(--surface2);border:1px solid var(--border);border-radius:8px;color:var(--text);padding:0 10px;cursor:pointer;white-space:nowrap}",
    ".est-bat{min-width:66px} .est-bat.ex{color:var(--warning)} @media (max-width:600px){.est-bat{padding:0 7px;font-size:.85rem}}",
    ".est-fila.hecho .est-tema{border-left:3px solid var(--warning)} .est-fila.dominado .est-tema{border-left:3px solid var(--success)} .est-fila.curso .est-tema{border-left:3px solid var(--accent)}",
    "#estudio-screen{max-width:820px;margin:0 auto;padding:0 16px 60px;line-height:1.6}",
    // Pantalla ancha: el texto a la izquierda y el lado derecho para la ventana de siglas y el tutor (que ya no tapa lo que se lee).
    "@media (min-width:1100px){#estudio-screen{max-width:min(780px,calc(100vw - 500px));margin:0 0 0 max(32px,calc((100vw - 780px - 500px)/2))} #est-siglas:not(.vacia){display:flex} .est-flota.siglas-b{display:none}}",
    "#est-siglas{display:none;position:fixed;top:60px;right:24px;bottom:72px;width:380px;z-index:15;flex-direction:column;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:0 4px 18px rgba(0,0,0,.18);font-size:.88rem;line-height:1.4}",
    "#est-siglas .sg-top{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid var(--border)} #est-siglas .sg-x{display:none;background:none;border:0;color:var(--text2);font-size:1rem;cursor:pointer}",
    "#est-siglas .sg-cuerpo{overflow-y:auto;padding:6px 14px 12px} #est-siglas .sg-t{font-size:.72rem;text-transform:uppercase;letter-spacing:.06em;color:var(--text2);margin:10px 0 4px;cursor:default} #est-siglas summary.sg-t{cursor:pointer}",
    "#est-siglas .sg{display:grid;grid-template-columns:minmax(52px,auto) 1fr;gap:10px;padding:5px 0;border-bottom:1px dashed var(--border)} #est-siglas .sg:last-child{border-bottom:0} #est-siglas .sg b{color:var(--accent2);font-weight:700;white-space:nowrap} #est-siglas .sg span{color:var(--text)}",
    ".est-flota.siglas-b{right:128px;background:var(--surface2);color:var(--text);border:1px solid var(--border)}",
    "@media (max-width:1099px){#est-siglas.abierta:not(.vacia){display:flex;left:12px;right:12px;width:auto;top:auto;bottom:70px;max-height:60vh;z-index:25} #est-siglas .sg-x{display:block}}",
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
    "#est-tutor-quiz.hidden{display:none} #est-tutor.hidden{display:none} .tu-top{padding:12px 14px;border-bottom:1px solid var(--border);display:flex;gap:8px;align-items:center} .tu-top .sub{flex:1;font-size:.8rem;color:var(--text2)}",
    ".tu-x{background:none;border:0;color:var(--text2);font-size:1.1rem;cursor:pointer} .tu-chips{display:flex;flex-wrap:wrap;gap:6px;padding:8px 14px;border-bottom:1px solid var(--border)}",
    ".tu-chips button{background:var(--surface2);border:1px solid var(--border);color:var(--text);border-radius:14px;padding:4px 10px;font-size:.78rem;cursor:pointer} .tu-chips button:hover{border-color:#a78bfa}",
    ".tu-log{flex:1;overflow-y:auto;padding:10px 14px;font-size:.88rem;line-height:1.5} .tu-msg{margin:8px 0;padding:8px 10px;border-radius:10px} .tu-msg.yo{background:#7c3aed22;margin-left:30px}",
    ".tu-msg.ia{background:var(--surface);border:1px solid var(--border)} .tu-msg .est-cuadro table{min-width:0} .tu-msg p{margin:4px 0} .tu-msg ul{margin:4px 0 4px 18px}",
    ".tu-go{display:block;margin:8px 0 4px;background:#7c3aed;color:#fff;border:0;border-radius:8px;padding:7px 12px;cursor:pointer;font-weight:600}",
    ".tu-in{display:flex;gap:8px;padding:10px 14px;border-top:1px solid var(--border)} .tu-in textarea{flex:1;background:var(--surface2);color:var(--text);border:1px solid var(--border);border-radius:8px;padding:6px 8px;font:inherit;font-size:16px;resize:none}",
    ".tu-in button{background:#7c3aed;color:#fff;border:0;border-radius:8px;padding:0 14px;cursor:pointer} .tu-in button[disabled]{opacity:.5} .tu-borra{background:none;border:0;color:var(--text2);font-size:.75rem;cursor:pointer;margin:0 14px 10px;text-align:left}",
    ".est-cae{color:#f87171;font-weight:700;text-transform:none;letter-spacing:0}",
    ".est-reini{display:block;margin:14px auto 0;background:none;border:1px dashed var(--border);color:var(--text2,var(--text));border-radius:8px;padding:8px 14px;cursor:pointer} .est-reini.seguro{border-color:#f87171;color:#f87171;font-weight:700}",
    ".est-nuevo{color:#38bdf8;font-weight:700} .est-nuevo-caja{border:1px solid #38bdf8;background:rgba(56,189,248,.08);border-radius:8px;padding:10px 12px;margin:10px 0} .est-nuevo-caja.corta{padding:6px 10px;font-size:.9em}",
    ".est-nuevo-caja .est-mini-b{margin:4px 4px 0 0;white-space:normal;text-align:left} .miga.nueva{box-shadow:inset 0 -3px 0 #38bdf8}",
    ".est-caja.cae{border-left:4px solid #f87171;background:rgba(248,113,113,.07)} .est-caja.confus{border-left:4px solid #a78bfa;background:rgba(167,139,250,.08)}",
    ".est-conf{border-top:1px solid var(--border);padding-top:8px;margin-top:8px} .est-conf:first-of-type{border-top:0;margin-top:4px;padding-top:0} .est-conf .regla{color:var(--accent);font-size:.9rem} .est-conf .est-botones{margin:6px 0 0}",
    ".est-corr{background:rgba(167,139,250,.08);border:1px solid #a78bfa66;border-radius:8px;padding:8px 12px;margin:8px 0;font-size:.9rem} .est-corr-t{margin-bottom:4px} .est-corr ul{margin:2px 0 6px 20px}",
    ".est-corr .falta b{color:var(--warning)} .est-corr .mal b{color:var(--danger)} .est-corr .bien b{color:var(--success)} .est-corr .conf{margin:6px 0;padding:6px 8px;border-radius:6px;background:var(--surface)}",
    "@media (max-width:600px){#estudio-screen{padding:0 12px 50px}.est-pag h2{font-size:1.15rem}.est-res b{font-size:1.2rem}}"
  ].join("\n");
  document.head.appendChild(css);

  // ------------------------------------------------------------------ la sala, para «qué hacer hoy»
  // Lo que pasa en la sala resumido para el resto de la plataforma: lo hecho hoy, el tema a
  // medias, lo que toca repasar, el siguiente sin empezar y cómo va el repaso de examen. Lo
  // pintan «🎯 Qué hacer hoy» de las estadísticas y el plan de examen de la portada
  // (#plan-sala), y plan_examen.js se lo pasa en texto al entrenador y a su IA.
  // Si se prepara un parcial, solo cuentan los temas de ese parcial. El parcial de un tema es el
  // de la mayoría de su batería, con el mismo reparto que usan el entrenador y el plan.
  var parcialMemo = {};
  function parcialObjetivo() { var P = window.PlanExamen, o = P && P.objetivo ? P.objetivo() : "final"; return o === "p1" ? 1 : o === "p2" ? 2 : 0; }
  function parcialTema(e) {
    var En = window.Entrenador, t = temas[e.tema];
    if (!En || !En.parcialDe || !t) return 0;
    var a = En.ambito(), firma = e.tema + JSON.stringify(a.mapa || {});
    if (parcialMemo[firma] !== undefined) return parcialMemo[firma];
    var c = {};
    (t.bateria || []).forEach(function (id) { var q = BY_ID.get(id); if (q) { var p = En.parcialDe(q, a); if (p) c[p] = (c[p] || 0) + 1; } });
    var mejor = 0;
    Object.keys(c).forEach(function (p) { if (!mejor || c[p] > c[mejor]) mejor = +p; });
    return (parcialMemo[firma] = mejor);
  }
  function entraTema(e) { var n = parcialObjetivo(); if (!n) return true; var p = parcialTema(e); return !p || p === n; }
  function resumenSala() {
    if (!indice) return null;
    var todos = indice.temas || [], l = todos.filter(entraTema), d0 = new Date(); d0.setHours(0, 0, 0, 0); d0 = d0.getTime();
    var np = parcialObjetivo();
    var r = { total: l.length, fuera: todos.length - l.length, parcial: np, estudiados: 0, hoy: [], medias: [], siguiente: null, repasar: queRepasar(l).slice(0, 3), programas: [], dias: [] };
    for (var i = 13; i >= 0; i--) { var dd = new Date(); dd.setDate(dd.getDate() - i); var x = diaSala(claveHoy(dd)); if (x) r.dias.push({ k: claveHoy(dd), a: x.a, t: x.t }); }
    l.forEach(function (e) {
      var s = _d.t[e.tema];
      if (!s || (!s.paso && !s.fin)) { if (!r.siguiente) r.siguiente = e; return; }
      if (s.fin) r.estudiados++; else r.medias.push(e);
      var q = [];
      if (s.fin >= d0) q.push("terminado de leer");
      else if (!s.fin && (s.vis || 0) >= d0) q.push("leyendo, apartado " + Math.max(1, Math.min(s.paso, e.secciones)) + "/" + e.secciones);
      else if ((s.vis || 0) >= d0) q.push("repasado");
      if (s.bat && s.bat.ultima >= d0) q.push("batería " + s.bat.bien + "/" + s.bat.n + " bien");
      if (q.length) r.hoy.push(nombre(e) + " (" + q.join(", ") + ")");
    });
    (indice.programas || []).forEach(function (g) {
      var tras = todos.filter(function (e) { return e.tema === g.despues; })[0];
      if (tras && !entraTema(tras)) return;
      var hechos = 0, sig = -1, ult = null, hoy = 0;
      g.examenes.forEach(function (_, i) {
        var x = intentos(g.archivo, i);
        if (x.length) { hechos++; var u = x[x.length - 1]; if (!ult || u.t > ult.t) ult = { i: i, t: u.t, ok: u.ok, n: u.n }; x.forEach(function (y) { if (y.t >= d0) hoy++; }); }
        else if (sig < 0) sig = i;
      });
      ["fall", "azar"].forEach(function (k) { intentos(g.archivo, k).forEach(function (y) { if (y.t >= d0) hoy++; }); });
      r.programas.push({ g: g, hechos: hechos, sig: sig, ult: ult, hoy: hoy, fall: ((_d.pf || {})[g.archivo] || []).length });
    });
    return r;
  }
  // En texto, para el plan de examen y la IA del entrenador
  function salaTexto() {
    var r = resumenSala();
    if (!r || !r.total) return "";
    var porN = {};
    (indice.temas || []).forEach(function (e) { porN[e.tema] = e; });
    var o = ["SALA DE ESTUDIO (temas escritos para leer, con comprobaciones y batería; leer y hacer las comprobaciones también es estudiar, aunque no sume preguntas en el historial): " +
      r.estudiados + " de " + r.total + " temas estudiados" + (r.parcial ? " del " + r.parcial + (r.parcial === 1 ? ".er" : ".º") + " parcial, que es lo único que entra en lo que prepara" + (r.fuera ? " (los " + r.fuera + " temas del otro parcial no entran y no se cuentan aquí)" : "") : "") + "."];
    if (r.parcial) o.push("Temas de la sala que entran en el " + (r.parcial === 1 ? "1.er" : "2.º") + " parcial: " + (indice.temas || []).filter(entraTema).map(function (e) { return nombre(e) + " (" + e.titulo + ")"; }).join("; ") + ".");
    o.push(r.hoy.length ? "Hoy en la sala: " + r.hoy.join("; ") + "." : "Hoy aún no ha pasado por la sala.");
    o.push(r.dias.length ? "Días con estudio en la sala en las dos últimas semanas: " + r.dias.map(function (x) { return x.k.slice(5) + " (" + x.t.map(function (n) { return porN[n] ? nombre(porN[n]) : "repaso de examen"; }).join(", ") + ")"; }).join("; ") + "." : "No ha usado la sala en las dos últimas semanas.");
    if (r.medias.length) o.push("A medias: " + r.medias.map(function (e) { return nombre(e) + " (" + e.titulo + ")"; }).join("; ") + ".");
    if (r.repasar.length) o.push("Le toca repasar en la sala: " + r.repasar.map(function (x) { return nombre(x.e) + " — " + x.mot.join(", "); }).join("; ") + ".");
    if (r.siguiente) o.push("Siguiente tema sin empezar: " + nombre(r.siguiente) + " (" + r.siguiente.titulo + ").");
    r.programas.forEach(function (x) {
      o.push("Repaso de examen «" + x.g.titulo + "»: " + x.hechos + " de " + x.g.examenes.length + " exámenes hechos" +
        (x.ult ? ", el último (examen " + (x.ult.i + 1) + ") " + x.ult.ok + "/" + x.ult.n : "") + (x.sig >= 0 ? ", le toca el examen " + (x.sig + 1) : "") +
        (x.fall ? ", " + x.fall + " falladas en él para repasar" : "") + (x.hoy ? ", hoy ha hecho " + x.hoy : "") + ".");
    });
    return o.join("\n");
  }
  // Las mismas cosas como filas con botón
  function salaFilas() {
    var r = resumenSala();
    if (!r || !r.total) return [];
    var f = [], b = function (acc, v, txt) { return ' <button class="est-mini-b" data-sala="' + acc + '" data-v="' + esc(String(v)) + '">' + txt + "</button>"; };
    f.push("📖 Sala de estudio: <strong>" + r.estudiados + "/" + r.total + "</strong> temas estudiados" + (r.parcial ? " del " + r.parcial + (r.parcial === 1 ? ".er" : ".º") + " parcial" : "") + (r.hoy.length ? ". Hoy: " + esc(r.hoy.slice(0, 4).join("; ")) + (r.hoy.length > 4 ? " y " + (r.hoy.length - 4) + " más" : "") : ". Hoy aún no has entrado") + ".");
    r.medias.slice(0, 2).forEach(function (e) { f.push("📖 Tienes a medias <strong>" + esc(nombre(e)) + "</strong> · " + esc(e.titulo) + b("tema", e.tema, "▶️ Seguir")); });
    r.repasar.forEach(function (x) { f.push("🔁 Repasa <strong>" + esc(nombre(x.e)) + "</strong>: " + esc(x.mot.join(", ")) + b("rep", x.e.tema, "🎯 Repaso")); });
    if (!r.medias.length && r.siguiente) f.push("🆕 Siguiente tema por estudiar: <strong>" + esc(nombre(r.siguiente)) + "</strong> · " + esc(r.siguiente.titulo) + b("tema", r.siguiente.tema, "▶️ Empezar"));
    r.programas.forEach(function (x) {
      var g = x.g;
      f.push("📋 <strong>" + esc(g.titulo) + "</strong>: " + x.hechos + "/" + g.examenes.length + " exámenes" + (x.ult ? " · último " + x.ult.ok + "/" + x.ult.n : "") +
        (x.sig >= 0 ? " · te toca el " + (x.sig + 1) : "") + (x.fall ? " · " + x.fall + " falladas para repasar" : "") + b("prog", g.archivo, "📋 Abrir"));
    });
    return f;
  }
  function pintarSalaPlan() {
    var c = document.getElementById("plan-sala");
    if (!c) return;
    var f = salaFilas();
    c.innerHTML = f.length ? '<ul class="todo-list">' + f.map(function (x) { return "<li>" + x + "</li>"; }).join("") + "</ul>" : "";
  }
  // La racha cuenta también los días de sala (el motor solo mira las preguntas respondidas)
  if (typeof window.streakDays === "function") window.streakDays = function () {
    var d = State.data.daily || {}, n = 0;
    for (var i = 0; ; i++) {
      var t = new Date(Date.now() - i * 864e5), k = t.toISOString().slice(0, 10);
      if ((d[k] && d[k].n > 0) || diaSala(claveHoy(t))) n++;
      else if (i > 0) break;
    }
    return n;
  };
  var ins0 = App.renderInsights;
  if (ins0) App.renderInsights = function () {
    var r = ins0.apply(this, arguments);
    try {
      var ul = document.getElementById("stats-todo"); if (ul) ul.insertAdjacentHTML("beforeend", salaFilas().map(function (x) { return "<li>" + x + "</li>"; }).join(""));
      // En «Últimos 7 días», 📖 en los días con sala
      document.querySelectorAll("#stats-trend .bar").forEach(function (b) {
        var k = (b.getAttribute("title") || "").slice(0, 10), x = diaSala(k);
        if (!x) return;
        b.setAttribute("title", b.getAttribute("title") + " · 📖 sala: " + x.t.length + (x.t.length === 1 ? " tema" : " temas"));
        var bb = b.querySelector("b"); if (bb) bb.textContent = (bb.textContent ? bb.textContent + " " : "") + "📖";
        if (parseFloat(b.style.height) < 12) b.style.height = "12%";
      });
    } catch (e) { console.warn("estudio", e); }
    return r;
  };
  document.addEventListener("click", function (ev) {
    var b = ev.target.closest && ev.target.closest("[data-sala]");
    if (!b) return;
    var acc = b.getAttribute("data-sala"), v = b.getAttribute("data-v"), st = document.getElementById("stats-panel");
    if (st) st.classList.add("hidden");
    if (acc === "tema") abrir(+v);
    else if (acc === "rep") repasoInteligente(+v);
    else if (acc === "prog") abrirPrograma(v);
  });

  // ------------------------------------------------------------------ arranque
  var stats0 = App.updateHomeStats;
  App.updateHomeStats = function () {
    stats0.apply(this, arguments);
    try { pintarPortada(); pintarSalaPlan(); } catch (e) { console.warn("estudio", e); }
  };
  // Enlaces directos desde la portada de la bitácora:
  //   #estudio=9 (tema 9) · #estudio=9.2 (tema 9, apartado 3) · #repaso=9 · #estudio (la sala) · #entrenador
  function irPorEnlace() {
    var m = String(location.hash).match(/^#(estudio|repaso|entrenador)(?:=(\d+)(?:\.(\d+))?)?$/);
    if (!m) return;
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
    if (m[1] === "entrenador") { if (window.Entrenador && Entrenador.abrir) Entrenador.abrir(); return; }
    if (!indice) return;
    var n = m[2] != null ? +m[2] : null, e = n != null && (indice.temas || []).filter(function (x) { return x.tema === n; })[0];
    if (m[1] === "repaso" && e) return repasoInteligente(n);
    if (m[1] === "estudio" && e) return abrir(n, m[3] != null ? +m[3] + 1 : undefined);
    var caja = document.getElementById("estudio-home");
    if (caja) { caja.open = true; caja.scrollIntoView({ behavior: "smooth" }); }
  }
  cargarIndice().then(function () {
    // Se cargan en segundo plano los temas empezados, para saber cómo va su batería
    var hayParc = !!parcialObjetivo();
    (indice.temas || []).forEach(function (e) { if (_d.t[e.tema] || hayParc) cargarTema(e.tema).then(function () { pintarPortada(); pintarSalaPlan(); }).catch(function () {}); });
    pintarPortada(); pintarSalaPlan();
    setTimeout(irPorEnlace, 300);
  }).catch(function () { /* esta plataforma aún no tiene sala de estudio */ });

  if (window.MPSync && typeof MPSync.usar === "function") {
    try { MPSync.usar({ clave: K, modo: "reciente", alCambiar: function () { _d = leer(); if (!_d.t) _d.t = {}; sembrarDias(); try { pintarPortada(); if (vista) pintar(); } catch (e) {} } }); } catch (e) {}
  }

  // Para el plan de examen: bancos de los temas que la sala tiene a medias (1) o como siguiente (2),
  // sacados de las baterías ya cargadas (banco mayoritario de cada tema)
  function bancosSala() {
    var r = resumenSala(), m = new Map();
    function marca(e, v) {
      var t = e && temas[e.tema]; if (!t || !t.bateria) return;
      var c = new Map();
      t.bateria.forEach(function (id) { var q = BY_ID.get(id); if (q) c.set(q.topicBase, (c.get(q.topicBase) || 0) + 1); });
      c.forEach(function (n, b) { if (n >= 3 && (m.get(b) || 0) < v) m.set(b, v); });
    }
    if (r.siguiente) marca(r.siguiente, 2);
    (r.medias || []).forEach(function (e) { marca(e, 1); });
    return m;
  }
  window.Estudio = { abrir: abrir, bateria: bateria, bancosSala: bancosSala, repaso: repasoInteligente, queRepasar: queRepasar, resumen: resumenSala, texto: salaTexto, diaSala: diaSala, entraTema: entraTema, filas: salaFilas, pintarPlan: pintarSalaPlan, tutor: Tutor, ubicar: ubicar, indice: function () { return indice; }, _datos: function () { return _d; } };
})();
