/* Entrenador con IA: al acabar una sesión, Claude lee lo que has fallado o
 * adivinado, dice qué idea concreta se te escapa y escribe preguntas nuevas
 * dirigidas a eso. Va encima de entrenador.js y es opcional: sin clave, la
 * plataforma funciona igual que antes.
 *
 * La clave de la API la escribe el usuario en la portada y se guarda solo en
 * el navegador (localStorage, clave "mp_ia_clave"). No va al repositorio ni a
 * la nube: hay que ponerla una vez en cada dispositivo.
 *
 * Las preguntas que escribe la IA se guardan aparte (STORAGE_KEY + "_ia"), se
 * sincronizan entre dispositivos y aparecen en bancos «🧠 A tu medida · <tema>».
 * No se mezclan con los bancos de clase ni con los exámenes: son material sin
 * revisar y van marcadas como tal.
 */
(function () {
  "use strict";
  if (typeof App === "undefined" || typeof State === "undefined" || typeof ALL_QUESTIONS === "undefined") return;

  var K_CLAVE = "mp_ia_clave", K_MODELO = "mp_ia_modelo";
  var MODELO = "claude-opus-5-5";
  var ALMACEN = STORAGE_KEY + "_ia";
  var PREFIJO = "🧠 A tu medida · ";
  var MAX_GUARDADAS = 400;

  function lee(k) { try { return localStorage.getItem(k) || ""; } catch (e) { return ""; } }
  function pon(k, v) { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) {} }
  function clave() { return lee(K_CLAVE).trim(); }
  function modelo() { return lee(K_MODELO).trim() || MODELO; }

  // ------------------------------------------------------------- almacén
  function cargar() {
    try {
      var d = JSON.parse(lee(ALMACEN) || "{}");
      if (!Array.isArray(d.qs)) d.qs = [];
      if (!Array.isArray(d.inf)) d.inf = [];
      return d;
    } catch (e) { return { qs: [], inf: [] }; }
  }
  function guardar(d) {
    if (d.qs.length > MAX_GUARDADAS) d.qs = d.qs.slice(-MAX_GUARDADAS);
    if (d.inf.length > 10) d.inf = d.inf.slice(-10);
    pon(ALMACEN, JSON.stringify(d));
  }

  // Mete en el motor las preguntas guardadas que aún no estén
  function inyectar() {
    var d = cargar(), nuevas = 0;
    d.qs.forEach(function (g) {
      if (BY_ID.has(g.id) || !Array.isArray(g.options) || !Number.isInteger(g.correct)) return;
      var tema = PREFIJO + g.de;
      var q = { id: g.id, topic: tema, topicBase: tema, fileId: "ia", origQ: 0, q: g.q, options: g.options, correct: g.correct,
                exp: "🤖 Pregunta escrita por la IA a partir de tus fallos; sin revisar. " + g.exp, ia: 1 };
      ALL_QUESTIONS.push(q);
      BY_ID.set(q.id, q);
      if (!BY_TOPIC.has(tema)) { BY_TOPIC.set(tema, []); TOPIC_NAMES.push(tema); }
      BY_TOPIC.get(tema).push(q);
      nuevas++;
    });
    return nuevas;
  }

  if (typeof SECTIONS !== "undefined" && !SECTIONS.some(function (s) { return s.id === "ia"; }))
    SECTIONS.push({ id: "ia", title: "🧠 A tu medida · escritas por la IA", color: "#a78bfa", first: true,
                    match: function (t) { return t.indexOf(PREFIJO) === 0; } });

  // ------------------------------------------------------------ la llamada
  function llamar(sistema, usuario) {
    return fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": clave(),
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({ model: modelo(), max_tokens: 8000, system: sistema, messages: [{ role: "user", content: usuario }] })
    }).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok) throw new Error((j && j.error && j.error.message) || ("Error " + r.status));
        var txt = (j.content || []).filter(function (b) { return b.type === "text"; }).map(function (b) { return b.text; }).join("");
        return { txt: txt, uso: j.usage || {} };
      });
    });
  }

  var SISTEMA =
    "Eres el entrenador de un estudiante de 2.º de Medicina que prepara exámenes tipo test. " +
    "Recibes lo que ha fallado, adivinado o respondido con dudas en una sesión, con la explicación de cada pregunta " +
    "(sale de sus apuntes de clase) y más material del mismo tema. " +
    "Tu trabajo: 1) decir qué idea concreta se le escapa en cada caso, mirando qué opción eligió y con cuánta seguridad " +
    "(fallar seguro es un error de concepto; fallar dudando entre dos es una distinción que no tiene clara); " +
    "agrupa los fallos que nacen de la misma confusión. 2) Escribir preguntas tipo test nuevas que ataquen justo esa confusión " +
    "desde otro ángulo, no la misma pregunta reformulada. " +
    "Reglas estrictas: usa SOLO hechos que estén en el material que recibes; si para una confusión el material no basta, no escribas pregunta. " +
    "No escribas preguntas que necesiten ver una imagen. Cuatro opciones, una sola correcta, distractores verosímiles " +
    "(a ser posible, aquello con lo que lo confunde), la correcta en posiciones variadas, sin «todas las anteriores». " +
    "La explicación de cada pregunta dice por qué es esa y por qué no la que él habría elegido. Todo en español. " +
    "Responde SOLO con un objeto JSON, sin texto alrededor, con esta forma: " +
    '{"diagnostico":[{"idea":"la confusión, en una frase","por_que":"qué delata en sus respuestas","regla":"cómo distinguirlo, en una frase que pueda memorizar"}],' +
    '"preguntas":[{"tema":"nombre EXACTO del tema del que sale","q":"enunciado","opciones":["","","",""],"correcta":0,"explicacion":""}],' +
    '"consejo":"qué hacer antes de la próxima sesión, dos frases como mucho"}. ' +
    "Entre 1 y 2 preguntas por confusión, 10 como máximo.";

  var CONF = ["sin indicar", "seguro", "con dudas", "adivinando"];
  var MOTIVO = ["", "no lo sabía", "confundí conceptos", "leí mal", "dudé entre dos", "todas/ninguna"];
  function corta(s, n) { s = String(s || ""); return s.length > n ? s.slice(0, n) + "…" : s; }
  function letra(i) { return String.fromCharCode(65 + i); }

  function expediente(sess) {
    var casos = [], temas = new Map(), qs = State.data.qs || {};
    sess.questions.forEach(function (q) {
      var a = sess.answers[q.id];
      if (!a) return;
      if (a.wasCorrect && a.conf !== 2 && a.conf !== 3) return;
      var s = qs[q.id] || {}, h = Array.isArray(s.h) && s.h.length ? s.h[s.h.length - 1] : null;
      var dc = dispCorrect(q);
      casos.push(
        "TEMA: " + q.topicBase + "\n" +
        "PREGUNTA" + (q.img ? " (lleva una imagen que no puedes ver)" : "") + ": " + q.q + "\n" +
        q.displayOptions.map(function (o, i) { return letra(i) + ") " + o; }).join("\n") + "\n" +
        "Eligió: " + letra(a.chosen) + " · Correcta: " + letra(dc) + " · " + (a.wasCorrect ? "ACERTÓ" : "FALLÓ") +
        " · iba " + CONF[a.conf || 0] + (h && h[4] ? " · tardó " + h[4] + " s" : "") +
        (h && h[5] ? " · él dice: " + MOTIVO[h[5]] : "") +
        (s.a > 1 ? " · historial: " + s.c + " aciertos de " + s.a : "") + "\n" +
        "EXPLICACIÓN: " + corta(q.exp, 700));
      if (!temas.has(q.topicBase)) temas.set(q.topicBase, new Set());
      temas.get(q.topicBase).add(q.id);
    });
    if (!casos.length) return null;

    // Material del mismo tema: otras preguntas con su respuesta y su explicación
    var material = [];
    temas.forEach(function (ids, tema) {
      var base = tema.indexOf(PREFIJO) === 0 ? tema.slice(PREFIJO.length) : tema;
      var otras = (BY_TOPIC.get(base) || []).filter(function (q) { return !ids.has(q.id) && !q.img && q.exp && q.exp.length > 60 && Number.isInteger(q.correct); });
      otras = shuffle(otras).slice(0, 12);
      if (!otras.length) return;
      material.push("== " + base + " ==\n" + otras.map(function (q) {
        return "· " + corta(q.q, 220) + " → " + corta(q.options[q.correct], 120) + ". " + corta(q.exp, 420);
      }).join("\n"));
    });

    var estado = "";
    if (window.Entrenador) {
      var flojos = [];
      window.Entrenador.temas().forEach(function (t) { if (t.estado === "flojo") flojos.push(t.tema + " (" + Math.round(t.dominio * 100) + " %)"); });
      if (flojos.length) estado = "\n\nTEMAS QUE LLEVA FLOJOS: " + flojos.slice(0, 12).join("; ");
    }
    return {
      n: casos.length,
      texto: "ASIGNATURA: " + document.title + "\n\nLO QUE HA FALLADO, ADIVINADO O DUDADO EN ESTA SESIÓN (" + casos.length + "):\n\n" +
             casos.slice(0, 25).join("\n\n") + "\n\nMATERIAL DE CLASE DE ESOS TEMAS:\n\n" + material.join("\n\n") + estado,
      temas: Array.from(temas.keys())
    };
  }

  function sacarJSON(txt) {
    var a = txt.indexOf("{"), b = txt.lastIndexOf("}");
    if (a < 0 || b <= a) throw new Error("La IA no ha devuelto un informe legible.");
    return JSON.parse(txt.slice(a, b + 1));
  }

  function analizar(sess) {
    var caja = cajaResultados();
    var exp = expediente(sess);
    if (!exp) { caja.innerHTML = "<b>🧠 IA</b> · Sin fallos ni dudas en esta sesión: no hay nada que analizar."; return Promise.resolve(); }
    caja.innerHTML = "<b>🧠 IA</b> · Analizando " + exp.n + " respuestas…";
    return llamar(SISTEMA, exp.texto).then(function (r) {
      var inf = sacarJSON(r.txt), d = cargar(), base = Math.floor(Date.now() / 1000) * 20, n = 0;
      (inf.preguntas || []).forEach(function (p, i) {
        if (!p || !p.q || !Array.isArray(p.opciones) || p.opciones.length < 3 || !Number.isInteger(p.correcta) || !p.opciones[p.correcta]) return;
        var de = String(p.tema || "");
        if (de.indexOf(PREFIJO) === 0) de = de.slice(PREFIJO.length);
        if (!BY_TOPIC.has(de)) de = exp.temas[0].indexOf(PREFIJO) === 0 ? exp.temas[0].slice(PREFIJO.length) : exp.temas[0];
        d.qs.push({ id: base + i, de: de, q: String(p.q), options: p.opciones.map(String), correct: p.correcta, exp: String(p.explicacion || ""), t: Date.now() });
        n++;
      });
      d.inf.push({ t: Date.now(), diag: inf.diagnostico || [], consejo: inf.consejo || "", n: n, uso: r.uso });
      guardar(d);
      inyectar();
      caja.innerHTML = pintarInforme(d.inf[d.inf.length - 1]) +
        (n ? '<p style="margin-top:8px">He escrito <b>' + n + " preguntas nuevas</b> sobre esto. El entrenador te las pondrá de las primeras en la próxima sesión.</p>" : "");
    }).catch(function (e) {
      caja.innerHTML = "<b>🧠 IA</b> · No se ha podido analizar: " + esc(e.message || String(e));
    });
  }

  function pintarInforme(inf) {
    var h = "<b>🧠 Lo que ha visto la IA</b>";
    if (inf.diag && inf.diag.length) {
      h += "<ul>" + inf.diag.map(function (x) {
        return "<li><b>" + esc(x.idea || "") + "</b>" + (x.por_que ? " — " + esc(x.por_que) : "") +
               (x.regla ? '<br><span style="color:var(--accent)">Regla: ' + esc(x.regla) + "</span>" : "") + "</li>";
      }).join("") + "</ul>";
    }
    if (inf.consejo) h += "<p><b>Antes de la próxima sesión:</b> " + esc(inf.consejo) + "</p>";
    return h;
  }

  // -------------------------------------------------------------- interfaz
  var css = document.createElement("style");
  css.textContent =
    "#ia-res,#ia-caja{margin:14px auto 0;text-align:left;border:1px solid #a78bfa;border-radius:12px;padding:12px 16px;font-size:.88rem;background:var(--surface)}" +
    "#ia-res{max-width:560px}#ia-res li,#ia-caja li{margin:6px 0 6px 18px}" +
    "#ia-caja input,#ia-caja select{background:var(--surface2);color:var(--text);border:1px solid var(--border);border-radius:6px;padding:6px 8px;font-size:.85rem;max-width:100%}" +
    "#ia-caja button,#ia-res button{background:#7c3aed;color:#fff;border:0;border-radius:6px;padding:6px 12px;font-size:.85rem;cursor:pointer}" +
    "#ia-caja .sec{background:none;color:var(--text2);border:1px solid var(--border)}" +
    "#ia-caja .fila{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:8px}";
  document.head.appendChild(css);

  function cajaResultados() {
    var caja = document.getElementById("ia-res");
    if (!caja) {
      caja = document.createElement("div"); caja.id = "ia-res";
      var ancla = document.getElementById("coach-res") || document.getElementById("res-exam");
      ancla.parentNode.insertBefore(caja, ancla.nextSibling);
    }
    return caja;
  }

  function pintarPortada() {
    var ancla = document.getElementById("coach-panel") || document.querySelector(".mode-grid");
    if (!ancla) return;
    var caja = document.getElementById("ia-caja");
    if (!caja) {
      caja = document.createElement("div"); caja.id = "ia-caja";
      ancla.parentNode.insertBefore(caja, ancla.nextSibling);
    }
    var d = cargar(), ult = d.inf.length ? d.inf[d.inf.length - 1] : null;
    if (!clave()) {
      caja.innerHTML = "<b>🧠 Entrenador con IA: sin conectar</b><br>Pega aquí tu clave de la API de Anthropic. Se guarda solo en este navegador; hay que ponerla una vez en cada dispositivo." +
        '<div class="fila"><input id="ia-clave" type="password" placeholder="sk-ant-…" autocomplete="off" style="flex:1;min-width:180px"><button id="ia-guardar">Conectar</button></div>';
      document.getElementById("ia-guardar").onclick = function () {
        var v = document.getElementById("ia-clave").value.trim();
        if (!v) return;
        pon(K_CLAVE, v); pintarPortada();
      };
      return;
    }
    caja.innerHTML = "<b>🧠 Entrenador con IA: conectado</b> · " + d.qs.length + " preguntas escritas para ti" +
      (ult ? " · último análisis " + new Date(ult.t).toLocaleString("es", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "") +
      '<div class="fila"><select id="ia-modelo"><option value="claude-opus-5-5">Opus 5.5</option><option value="claude-sonnet-5-5">Sonnet 5.5</option><option value="claude-fable-5-1">Fable 5.1</option></select>' +
      '<button class="sec" id="ia-probar">Probar conexión</button><button class="sec" id="ia-quitar">Quitar la clave</button><span id="ia-estado" style="color:var(--text2)"></span></div>' +
      (ult ? '<details style="margin-top:8px"><summary style="cursor:pointer">Último informe</summary>' + pintarInforme(ult) + "</details>" : "");
    var sel = document.getElementById("ia-modelo");
    sel.value = modelo();
    sel.onchange = function () { pon(K_MODELO, sel.value); };
    document.getElementById("ia-quitar").onclick = function () { pon(K_CLAVE, ""); pintarPortada(); };
    document.getElementById("ia-probar").onclick = function () {
      var est = document.getElementById("ia-estado");
      est.textContent = "Probando…";
      llamar("Responde con una sola palabra.", "Di «conectado».").then(function () { est.textContent = "✓ Funciona"; })
        .catch(function (e) { est.textContent = "✗ " + (e.message || e); });
    };
  }

  // ----------------------------------------------------- engancharse al motor
  var fin0 = App.finishQuiz;
  App.finishQuiz = function () {
    var sess = State.session;
    fin0.apply(this, arguments);
    var vieja = document.getElementById("ia-res");
    if (vieja) vieja.remove();
    if (!sess || sess.exam && !Object.keys(sess.answers).length) return;
    if (!clave()) return;
    if (sess.mode === "coach") { analizar(sess); return; }
    var caja = cajaResultados();
    caja.innerHTML = "<button>🧠 Analizar esta sesión con IA</button>";
    caja.firstChild.onclick = function () { analizar(sess); };
  };

  var stats0 = App.updateHomeStats;
  App.updateHomeStats = function () {
    stats0.apply(this, arguments);
    try { pintarPortada(); } catch (e) { console.warn("entrenador_ia", e); }
  };

  function refrescar() {
    if (inyectar() && typeof App.renderTopicsGrid === "function") App.renderTopicsGrid();
    try { App.updateHomeStats(); } catch (e) { console.warn("entrenador_ia", e); }
  }
  if (window.MPSync && typeof MPSync.usar === "function") {
    try { MPSync.usar({ clave: ALMACEN, modo: "reciente", alCambiar: refrescar }); } catch (e) {}
  }
  refrescar();

  window.EntrenadorIA = { analizar: analizar, expediente: expediente };
})();
