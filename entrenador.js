/* Entrenador: una sesión que se decide pregunta a pregunta.
 *
 * Es un modo más de la plataforma: no sustituye a ninguno de los que hay y no
 * guarda nada propio. Lee lo que el motor ya apunta de cada intento
 * (qs.h = [fecha, acierto, opción, seguridad, segundos, motivo del fallo]) y
 * lo calcula todo al vuelo sobre ALL_QUESTIONS, así que cuando se cargan
 * apuntes o bancos nuevos no hay nada que regenerar.
 *
 * Qué decide:
 *   · Cuánto sabes de cada pregunta: no vale lo mismo acertar seguro que
 *     acertar adivinando, ni fallar dudando que fallar yendo seguro.
 *   · El estado de cada tema: sabido, en marcha, flojo o sin empezar.
 *   · La siguiente pregunta, después de cada respuesta: si fallas, otra de la
 *     misma idea al momento; si llevas varias seguras de un tema, lo deja por
 *     hoy; entre medias, los repasos que vencen y lo nuevo de los temas flojos.
 *   · Cuándo vuelve cada pregunta: corrige el calendario de repasos con la
 *     seguridad que declaraste.
 *
 * Se carga después del motor:  <script src="entrenador.js"></script>
 */
(function () {
  "use strict";
  if (typeof App === "undefined" || typeof State === "undefined" || typeof ALL_QUESTIONS === "undefined") return;

  var MODO = "coach";
  var TANDA = 30;        // preguntas por sesión si el selector está en «todas»
  var EXTRA_MAX = 10;    // lo que puede alargarse una sesión para cerrar lo fallado
  var RACHA_CIERRE = 4;  // aciertos seguros seguidos para dejar un tema por hoy

  // ------------------------------------------------------------------ medir
  function ultimo(s) {
    return s && Array.isArray(s.h) && s.h.length ? s.h[s.h.length - 1] : null;
  }

  // Lo que tardas normalmente: a partir del doble, la respuesta cuenta como lenta
  var _lento = null;
  function lento() {
    if (_lento != null) return _lento;
    var t = [], qs = State.data.qs || {};
    for (var id in qs) {
      var h = qs[id] && qs[id].h;
      if (Array.isArray(h)) for (var i = 0; i < h.length; i++) if (h[i][4] > 1 && h[i][4] < 600) t.push(h[i][4]);
    }
    t.sort(function (a, b) { return a - b; });
    _lento = Math.max(25, t.length >= 20 ? 2 * t[Math.floor(t.length / 2)] : 45);
    return _lento;
  }

  // Cuánto sabes de una pregunta, de 0 a 1 (null si no la has visto)
  function saber(s) {
    if (!s || !s.a) return null;
    var h = ultimo(s);
    var ok = h ? h[1] === 1 : !isFailed(s);
    if (!ok) return 0;
    var conf = h ? h[3] : 0, secs = h ? h[4] : 0;
    var k = conf === 1 ? 1 : conf === 2 ? 0.6 : conf === 3 ? 0.3 : 0.8;
    if (secs > lento()) k -= 0.1;
    if (s.a >= 2 && s.c / s.a < 0.5) k -= 0.15;   // la has fallado más veces de las que la has acertado
    if (isDue(s)) k *= 0.75;                      // ya le tocaba repaso: algo se habrá ido
    return Math.max(0.05, Math.min(1, k));
  }

  function estadoTema(tema) {
    var lista = BY_TOPIC.get(tema) || [], qs = State.data.qs || {};
    var vistas = 0, suma = 0, fallos = 0, vencidas = 0, reciente = 0;
    for (var i = 0; i < lista.length; i++) {
      var s = qs[lista[i].id], k = saber(s);
      if (k == null) continue;
      vistas++; suma += k;
      if (k === 0) fallos++;
      if (isDue(s)) vencidas++;
      var h = ultimo(s);
      if (h && h[0] > reciente) reciente = h[0];
    }
    var n = lista.length, dominio = vistas ? suma / vistas : 0;
    var minimo = Math.min(n, Math.max(8, Math.ceil(n * 0.5)));
    var estado = "nuevo";
    if (vistas) {
      if (vistas >= minimo && dominio >= 0.85 && fallos / vistas <= 0.05) estado = "sabido";
      else if (vistas >= 4 && dominio < 0.55) estado = "flojo";
      else estado = "marcha";
    }
    return { tema: tema, n: n, vistas: vistas, dominio: dominio, fallos: fallos, vencidas: vencidas, estado: estado, reciente: reciente };
  }

  function todosLosTemas() {
    var m = new Map();
    BY_TOPIC.forEach(function (_, t) { m.set(t, estadoTema(t)); });
    return m;
  }

  // ------------------------------------------------- parecido entre preguntas
  var VACIAS = /^(cual|cuales|siguiente|siguientes|sobre|entre|respecto|senale|senala|indique|indica|correcta|incorrecta|falsa|verdadera|afirmacion|afirmaciones|respuesta|imagen|estructura|numero|senalada|corresponde|siguientes)$/;
  var _pal = new Map();
  function palabras(q) {
    var p = _pal.get(q.id);
    if (p) return p;
    var txt = q.q + " " + (Number.isInteger(q.correct) && q.options[q.correct] ? q.options[q.correct] : "");
    txt = txt.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    p = new Set((txt.match(/[a-z]{5,}/g) || []).filter(function (w) { return !VACIAS.test(w); }));
    _pal.set(q.id, p);
    return p;
  }
  function parecido(a, b) {
    var A = palabras(a), B = palabras(b), comun = 0;
    if (!A.size || !B.size) return 0;
    A.forEach(function (w) { if (B.has(w)) comun++; });
    return comun / (A.size + B.size - comun);
  }

  // ------------------------------------------------------ decidir la siguiente
  // El contexto se reconstruye siempre desde la sesión (qué se ha puesto y qué
  // se ha respondido), así que reanudar una sesión guardada no pierde nada.
  function nuevoCtx() { return { usadas: new Set(), deuda: new Map(), racha: new Map(), cerrados: new Set(), ult: [] }; }

  function avanzar(ctx, q, ans, pos) {
    var t = q.topicBase;
    ctx.usadas.add(q.id);
    var d = ctx.deuda.get(t);
    if (d && d.n > 0 && d.ref.id !== q.id) d.n--;
    ctx.ult.push(t);
    if (!ans) return;
    if (!ans.wasCorrect) {
      ctx.deuda.set(t, { n: Math.min(3, (d ? d.n : 0) + 2), ref: q, desde: pos, tipo: "fallo" });
      ctx.racha.set(t, 0); ctx.cerrados.delete(t);
    } else if (ans.conf === 3) {
      ctx.deuda.set(t, { n: Math.min(3, (d ? d.n : 0) + 1), ref: q, desde: pos, tipo: "adivina" });
      ctx.racha.set(t, 0);
    } else if (ans.conf !== 2) {
      var r = (ctx.racha.get(t) || 0) + 1;
      ctx.racha.set(t, r);
      if (r >= RACHA_CIERRE) ctx.cerrados.add(t);
    }
  }

  function dias(n) { return n === 1 ? "1 día" : n + " días"; }

  function elegir(ctx, temas, pos) {
    var qs = State.data.qs || {}, hoy = today(), mejor = null, mejorP = -1;
    var ult = ctx.ult, n = ult.length;
    var repetido = n >= 3 && ult[n - 1] === ult[n - 2] && ult[n - 2] === ult[n - 3] ? ult[n - 1] : null;
    var haceSemana = Date.now() / 1000 - 7 * 86400;

    for (var i = 0; i < ALL_QUESTIONS.length; i++) {
      var q = ALL_QUESTIONS[i];
      if (ctx.usadas.has(q.id) || effCorrectOrig(q) == null) continue;
      var t = q.topicBase, tm = temas.get(t), s = qs[q.id], k = saber(s);
      var p, por;

      if (k == null) {
        if (tm.estado === "flojo") { p = 2.0; por = "Tema flojo: una que aún no habías visto"; }
        else if (tm.estado === "marcha") { p = 2.2; por = "Tema en marcha: una nueva para avanzar"; }
        else if (tm.estado === "sabido") { p = 0.3; por = "Tema sabido: una que te faltaba por ver"; }
        else { p = 1.0; por = "Tema sin empezar"; }
        if (tm.reciente > haceSemana) p += 1;                 // sigue con lo que estás estudiando estos días
        if (t.indexOf("Apuntes:") === 0) p += 0.8;            // lo de clase va antes
        else if (t.indexOf("⭐") === 0) p += 0.6;
        if (ctx.cerrados.has(t)) p *= 0.15;
      } else if (k === 0) {
        if (isSureFail(s)) { p = 6; por = "La fallaste yendo seguro: es un error de concepto"; }
        else { p = 4.5; por = "La fallaste la última vez"; }
      } else if (isDue(s)) {
        var atraso = hoy - s.du;
        p = 3 + Math.min(2, atraso * 0.2) + (1 - k);
        por = atraso > 0 ? "Repaso programado: vencía hace " + dias(atraso) : "Repaso programado para hoy";
        if (k <= 0.3) por = "La acertaste adivinando: toca comprobarla";
      } else if (k <= 0.3) {
        p = 1.2; por = "La acertaste adivinando";
      } else {
        p = 0.05; por = "Mantenimiento";
        if (tm.estado === "sabido") por = "Tema sabido: comprobación de mantenimiento";
      }

      // Lo recién fallado o adivinado: otra del mismo tema, la más parecida, dejando una por medio
      var d = ctx.deuda.get(t);
      if (d && d.n > 0 && (k == null || k < 0.7)) {
        var cerca = parecido(q, d.ref);
        var plus = 5 + 6 * cerca;
        if (pos - d.desde < 2) plus *= 0.5;
        p += plus;
        por = d.tipo === "fallo" ? "Acabas de fallar una de este tema: otra de la misma idea"
                                 : "Acertaste adivinando en este tema: otra para confirmar";
      } else if (repetido === t) {
        p *= 0.3;                                             // alternar temas fija mejor que machacar uno
      }

      p *= 0.85 + Math.random() * 0.3;
      if (p > mejorP) { mejorP = p; mejor = { q: q, por: por }; }
    }
    return mejor;
  }

  function preparar(q) {
    var perm = null, chk = document.getElementById("chk-shuffle-opts");
    if (chk && chk.checked) {
      var orden = shuffledOptionOrder(q);
      if (orden.some(function (v, i) { return v !== i; })) perm = orden;
    }
    return App._prepareQuestion(q, perm);
  }

  // Fija lo ya mostrado y vuelve a decidir todo lo que queda por delante
  function replanificar(sess) {
    var temas = todosLosTemas(), ctx = nuevoCtx();
    var fijo = sess.questions.slice(0, sess.currentIdx + 1);
    if (!sess.coachBase) sess.coachBase = sess.questions.length;
    if (!sess.coachPor) sess.coachPor = {};
    for (var i = 0; i < fijo.length; i++) avanzar(ctx, fijo[i], sess.answers[fijo[i].id], i);

    var total = Math.max(sess.questions.length, fijo.length), lista = fijo.slice();
    var tope = sess.coachBase + EXTRA_MAX;
    for (var pos = fijo.length; pos < total || (pos < tope && quedaDeuda(ctx)); pos++) {
      var e = elegir(ctx, temas, pos);
      if (!e) break;
      lista.push(preparar(e.q));
      sess.coachPor[e.q.id] = e.por;
      avanzar(ctx, e.q, null, pos);
    }
    sess.questions = lista;
    return ctx;
  }
  function quedaDeuda(ctx) {
    var hay = false;
    ctx.deuda.forEach(function (d) { if (d.n > 0) hay = true; });
    return hay;
  }

  // -------------------------------------------- corregir el calendario de repasos
  // El motor programa el repaso solo con acierto/fallo. Aquí se ajusta con la
  // seguridad declarada: acertar adivinando no es saberla.
  function ajustarRepaso(q, ans) {
    var s = State.data.qs[q.id], h = ultimo(s);
    if (!s || !h) return "";
    var conf = ans.conf || 0, secs = h[4] || 0, msg = "";
    if (ans.wasCorrect && conf === 3) {
      s.iv = 1; s.du = today() + 1;
      msg = "Acierto adivinando: no la doy por sabida. Vuelve mañana y te pongo otra parecida.";
    } else if (ans.wasCorrect && conf === 2) {
      if (s.iv > 3) { s.iv = 3; s.du = today() + 3; }
      msg = "Acierto con dudas: la repaso en " + dias(Math.max(1, s.iv)) + ".";
    } else if (ans.wasCorrect && conf === 1 && s.a === 1 && secs <= lento() / 2) {
      s.iv = 4; s.du = today() + 4;
      msg = "Segura y rápida a la primera: no la verás hasta dentro de 4 días.";
    } else if (!ans.wasCorrect && conf === 1) {
      s.ef = Math.max(1.3, (typeof s.ef === "number" ? s.ef : 2.5) - 0.15);
      msg = "Ibas seguro y era otra: error de concepto. Insisto en este tema y esta vuelve mañana.";
    } else if (!ans.wasCorrect) {
      msg = "Anotada. Te pongo otra de este tema enseguida y esta vuelve en el próximo repaso.";
    }
    touchQS(s);
    saveData();
    return msg;
  }

  // ------------------------------------------------------------------ interfaz
  var css = document.createElement("style");
  css.textContent =
    "#q-coach{font-size:.8rem;color:var(--text2);border-left:3px solid var(--accent);padding:6px 10px;margin:0 0 10px;background:var(--surface2);border-radius:0 8px 8px 0}" +
    "#q-coach b{color:var(--text)}#q-coach .dec{display:block;margin-top:4px;color:var(--text)}" +
    ".mode-btn.coach{border-color:#a78bfa;background:linear-gradient(135deg,rgba(167,139,250,.18),rgba(167,139,250,.03))}" +
    "#coach-panel{margin:14px 0 0;border:1px solid var(--border);border-radius:12px;background:var(--surface);padding:10px 14px;font-size:.85rem}" +
    "#coach-panel summary{cursor:pointer;font-weight:600}" +
    "#coach-panel h4{margin:12px 0 4px;font-size:.8rem;color:var(--text2);font-weight:600}" +
    "#coach-panel .fila{display:flex;gap:8px;align-items:center;padding:4px 0;border-top:1px solid var(--border);cursor:pointer}" +
    "#coach-panel .fila:hover{color:var(--accent)}#coach-panel .fila .nom{flex:1;min-width:0}" +
    "#coach-panel .fila .num{color:var(--text2);font-size:.75rem;white-space:nowrap}" +
    "#coach-res{margin:14px auto 0;max-width:560px;text-align:left;border:1px solid var(--border);border-radius:12px;padding:12px 16px;font-size:.88rem;background:var(--surface)}" +
    "#coach-res li{margin:4px 0 4px 18px}";
  document.head.appendChild(css);

  function avisoPregunta() {
    var sess = State.session, caja = document.getElementById("q-coach");
    if (!sess || sess.mode !== MODO) { if (caja) caja.hidden = true; return; }
    if (!caja) {
      caja = document.createElement("div");
      caja.id = "q-coach";
      var txt = document.getElementById("q-text");
      txt.parentNode.insertBefore(caja, txt);
    }
    var q = sess.questions[sess.currentIdx];
    var por = (sess.coachPor || {})[q.id] || "";
    var dec = (sess.coachDec || {})[q.id] || "";
    caja.hidden = !por && !dec;
    caja.innerHTML = (por ? "🧠 <b>Por qué esta:</b> " + esc(por) : "") + (dec ? '<span class="dec">→ ' + esc(dec) + "</span>" : "");
  }

  var NOMBRES = { flojo: "🔴 Flojos", marcha: "🟡 En marcha", sabido: "🟢 Sabidos", nuevo: "⚪ Sin empezar" };

  function pintarPortada() {
    var rejilla = document.querySelector(".mode-grid"), hoyBtn = document.getElementById("btn-today");
    if (!rejilla || !hoyBtn) return;
    var btn = document.getElementById("btn-coach");
    if (!btn) {
      btn = document.createElement("button");
      btn.className = "mode-btn coach"; btn.id = "btn-coach";
      btn.innerHTML = '<span class="icon">🧠</span><span class="title">Entrenador</span><span class="desc" id="coach-desc"></span>';
      btn.onclick = empezar;
      rejilla.insertBefore(btn, hoyBtn);
    }
    var temas = todosLosTemas(), c = { flojo: [], marcha: [], sabido: [], nuevo: [] }, vencidas = 0;
    temas.forEach(function (t) { c[t.estado].push(t); vencidas += t.vencidas; });
    document.getElementById("coach-desc").textContent =
      "Decide cada pregunta según cómo respondes · " + vencidas + " repasos pendientes · " +
      c.flojo.length + " temas flojos · " + c.sabido.length + " sabidos de " + temas.size;

    var panel = document.getElementById("coach-panel");
    if (!panel) {
      panel = document.createElement("details");
      panel.id = "coach-panel";
      rejilla.parentNode.insertBefore(panel, rejilla.nextSibling);
    }
    var html = "<summary>🧠 Estado de los temas según el entrenador</summary>";
    ["flojo", "marcha", "sabido", "nuevo"].forEach(function (e) {
      if (!c[e].length) return;
      c[e].sort(function (a, b) { return a.dominio - b.dominio || a.tema.localeCompare(b.tema, "es"); });
      html += "<h4>" + NOMBRES[e] + " (" + c[e].length + ")</h4>";
      c[e].forEach(function (t) {
        html += '<div class="fila" data-tema="' + esc(t.tema) + '"><span class="nom">' + esc(t.tema) + '</span><span class="num">' +
          (t.vistas ? Math.round(t.dominio * 100) + " % · " : "") + t.vistas + "/" + t.n + " vistas" +
          (t.fallos ? " · " + t.fallos + " falladas" : "") + "</span></div>";
      });
    });
    panel.innerHTML = html;
    panel.onclick = function (ev) {
      var f = ev.target.closest ? ev.target.closest(".fila") : null;
      if (f) App.startSingleTopic(f.getAttribute("data-tema"));
    };
  }

  function empezar() {
    var sel = document.getElementById("sel-limit");
    var n = (sel && parseInt(sel.value)) || TANDA;
    _lento = null;
    var temas = todosLosTemas(), ctx = nuevoCtx();
    var primera = elegir(ctx, temas, 0);
    if (!primera) { alert("No hay preguntas disponibles."); return; }
    App.beginSession([primera.q], MODO);
    var sess = State.session;
    sess.coachBase = n;
    sess.coachPor = {}; sess.coachDec = {};
    sess.coachPor[primera.q.id] = primera.por;
    planInicial(sess, n);
    App.saveSession();
    App.renderQuizQuestion();
    App.renderSidebar();
  }
  function planInicial(sess, n) {
    var temas = todosLosTemas(), ctx = nuevoCtx();
    avanzar(ctx, sess.questions[0], null, 0);
    for (var pos = 1; pos < n; pos++) {
      var e = elegir(ctx, temas, pos);
      if (!e) break;
      sess.questions.push(preparar(e.q));
      sess.coachPor[e.q.id] = e.por;
      avanzar(ctx, e.q, null, pos);
    }
  }

  // ------------------------------------------------------- engancharse al motor
  var responder0 = App.answer;
  App.answer = function (i) {
    var sess = State.session;
    var esCoach = sess && sess.mode === MODO && !sess.exam && !sess.cards;
    var q = sess ? sess.questions[sess.currentIdx] : null;
    var antes = sess && q ? !!sess.answers[q.id] : true;
    responder0.call(this, i);
    if (!esCoach || antes || !sess.answers[q.id]) return;
    var ans = sess.answers[q.id];
    var msg = ajustarRepaso(q, ans);
    var largo = sess.questions.length;
    var ctx = replanificar(sess);
    if (ans.wasCorrect && ans.conf !== 2 && ans.conf !== 3 && (ctx.racha.get(q.topicBase) || 0) === RACHA_CIERRE)
      msg = RACHA_CIERRE + " seguidas sin dudar en este tema: lo dejo por hoy y paso a otra cosa.";
    if (sess.questions.length > largo)
      msg += (msg ? " " : "") + "Alargo la sesión " + (sess.questions.length - largo) + " para cerrar lo fallado.";
    if (!sess.coachDec) sess.coachDec = {};
    sess.coachDec[q.id] = msg;
    this.saveSession();
    this.renderSidebar();
    document.getElementById("q-progress").textContent = (sess.currentIdx + 1) + " / " + sess.questions.length;
    document.getElementById("btn-next").textContent = sess.currentIdx === sess.questions.length - 1 ? "Finalizar ✓" : "Siguiente →";
    avisoPregunta();
  };

  var pintar0 = App.renderQuizQuestion;
  App.renderQuizQuestion = function () {
    pintar0.apply(this, arguments);
    avisoPregunta();
  };

  // En el entrenador la seguridad se pregunta siempre: es el dato que más pesa
  var conf0 = App.confEnabled;
  App.confEnabled = function () {
    return (State.session && State.session.mode === MODO) || conf0.call(this);
  };

  var fin0 = App.finishQuiz;
  App.finishQuiz = function () {
    var sess = State.session, esCoach = sess && sess.mode === MODO;
    fin0.apply(this, arguments);
    var caja = document.getElementById("coach-res");
    if (!esCoach) { if (caja) caja.remove(); return; }
    if (!caja) {
      caja = document.createElement("div"); caja.id = "coach-res";
      var ancla = document.getElementById("res-exam");
      ancla.parentNode.insertBefore(caja, ancla.nextSibling);
    }
    caja.innerHTML = resumen(sess);
  };

  var MOTIVOS = ["", "no lo sabías", "confundiste conceptos", "leíste mal el enunciado", "dudaste entre dos", "caíste en un «todas/ninguna»"];
  function resumen(sess) {
    var porTema = new Map(), motivos = [0, 0, 0, 0, 0, 0], seguroMal = 0, adivina = 0;
    sess.questions.forEach(function (q) {
      var a = sess.answers[q.id];
      if (!a) return;
      var t = porTema.get(q.topicBase) || { ok: 0, mal: 0 };
      if (a.wasCorrect) t.ok++; else t.mal++;
      porTema.set(q.topicBase, t);
      if (!a.wasCorrect && a.conf === 1) seguroMal++;
      if (a.wasCorrect && a.conf === 3) adivina++;
      var h = ultimo(State.data.qs[q.id]);
      if (!a.wasCorrect && h && h[5]) motivos[h[5]]++;
    });
    var li = [];
    var peores = Array.from(porTema.entries()).filter(function (e) { return e[1].mal > 0; })
      .sort(function (a, b) { return b[1].mal - a[1].mal; }).slice(0, 3);
    if (peores.length) li.push("Donde más has fallado: " + peores.map(function (e) { return esc(e[0]) + " (" + e[1].mal + ")"; }).join("; ") + ".");
    if (seguroMal) li.push(seguroMal + " fallo" + (seguroMal > 1 ? "s" : "") + " yendo seguro: son errores de concepto, relee ese punto en los apuntes antes de la próxima sesión.");
    if (adivina) li.push(adivina + " acierto" + (adivina > 1 ? "s" : "") + " adivinando: no cuentan como sabidas y vuelven mañana.");
    var top = 0;
    for (var k = 1; k <= 5; k++) if (motivos[k] > motivos[top]) top = k;
    if (top && motivos[top] >= 2) li.push("El motivo que más se repite: " + MOTIVOS[top] + " (" + motivos[top] + ")." +
      (top === 3 ? " Lee el enunciado entero antes de mirar las opciones." : top === 2 ? " Compara los dos conceptos que mezclas en una nota de la pregunta." : ""));
    var man = today() + 1, toca = 0, qs = State.data.qs || {};
    for (var id in qs) if (qs[id] && qs[id].a > 0 && typeof qs[id].du === "number" && qs[id].du <= man) toca++;
    li.push("Para mañana hay " + toca + " repasos programados.");
    var temas = todosLosTemas(), c = { flojo: 0, marcha: 0, sabido: 0, nuevo: 0 };
    temas.forEach(function (t) { c[t.estado]++; });
    li.push("Temas: " + c.sabido + " sabidos, " + c.marcha + " en marcha, " + c.flojo + " flojos y " + c.nuevo + " sin empezar.");
    return "<b>🧠 Lo que ha visto el entrenador</b><ul>" + li.map(function (x) { return "<li>" + x + "</li>"; }).join("") + "</ul>";
  }

  var stats0 = App.updateHomeStats;
  App.updateHomeStats = function () {
    stats0.apply(this, arguments);
    try { pintarPortada(); } catch (e) { console.warn("entrenador", e); }
  };
  try { pintarPortada(); } catch (e) { console.warn("entrenador", e); }

  window.Entrenador = { estadoTema: estadoTema, temas: todosLosTemas, saber: saber, empezar: empezar };
})();
