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

  // Preguntas que no se preguntan en una asignatura. En Anatomía 3 los profesores dijeron
  // que preguntan lo que dicen en clase, así que las que Claude propuso por su cuenta
  // («no dicha en clase») se retiran de todos los modos. Siguen en el archivo y conservan
  // su progreso: para recuperarlas basta quitar la línea de aquí.
  var BLOQUEAR = { anat3: /^🤖 Propuesta por Claude, no dicha en clase/ };
  (function () {
    var re = BLOQUEAR[STORAGE_KEY.replace(/_study_v\d+$/, "")];
    if (!re) return;
    var fuera = 0;
    for (var i = ALL_QUESTIONS.length - 1; i >= 0; i--) {
      var q = ALL_QUESTIONS[i];
      if (!re.test(q.exp || "")) continue;
      ALL_QUESTIONS.splice(i, 1);
      BY_ID.delete(q.id);
      var l = BY_TOPIC.get(q.topicBase);
      if (l) { var k = l.indexOf(q); if (k >= 0) l.splice(k, 1); }
      fuera++;
    }
    if (!fuera) return;
    try {
      var tot = document.getElementById("total-q-count");
      if (tot) tot.textContent = ALL_QUESTIONS.length.toLocaleString("es");
      App.renderTopicsGrid();
    } catch (e) { console.warn("entrenador", e); }
  })();

  var MODO = "coach";
  var TANDA = 30;        // preguntas por sesión si el selector está en «todas»
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

  // ------------------------------------------------- de dónde sale cada pregunta
  // Se deduce del nombre del banco, así que vale para los bancos que se añadan.
  // tipo: examen (cayó en un examen) · recop (recopilación de años anteriores,
  // sin convocatoria) · oficial (cuestionarios del campus) · profesor (la puso
  // el profesor en clase) · clase (de tus apuntes) · entreno · ia
  var RE_EXAMEN = /ex[aá]men(es)?|parcial|convocatoria|\bglobal\b|\b(enero|febrero|junio|julio|septiembre|diciembre)\b|a[ñn]os anteriores/i;
  function limpio(t) { return String(t).replace(/^[^A-Za-zÁÉÍÓÚÑáéíóúñ0-9¿¡«]+/, "").trim(); }
  function origenBanco(t) {
    var n = limpio(t);
    if (t.indexOf("🧠") === 0) return { tipo: "ia", txt: "🤖 Entrenamiento · escrita por la IA para una confusión tuya" };
    if (/kahoot|taller|seminario/i.test(n) && t.indexOf("🎯") !== 0 && t.indexOf("🧪") !== 0 && t.indexOf("Apuntes:") !== 0) return { tipo: "profesor", txt: "🎯 De clase (Kahoot, taller o seminario) · " + n };
    if (t.indexOf("📝") === 0 && RE_EXAMEN.test(t)) return { tipo: "examen", txt: "📝 Salió en examen · " + n };
    if (t.indexOf("📝") === 0 || /^Banco (General|Parcial)|Recopilaci[oó]n/i.test(n)) return { tipo: "recop", txt: "📝 De recopilaciones de años anteriores · " + n };
    if (t.indexOf("💻") === 0) return { tipo: "oficial", txt: "💻 Cuestionario del campus · " + n };
    if (t.indexOf("🎯") === 0) return { tipo: "profesor", txt: "🎯 La puso el profesor en clase · " + n };
    if (t.indexOf("🧪") === 0) return { tipo: "profesor", txt: "🧪 De un seminario de clase · " + n };
    // Bancos que cuelgan de «Apuntes:» pero recogen preguntas reales, no de entrenamiento
    if (t.indexOf("Apuntes:") === 0 && /examen real/i.test(n)) return { tipo: "examen", txt: "📝 Salió en examen · " + n.replace(/^Apuntes:\s*/, "") };
    if (t.indexOf("Apuntes:") === 0 && /cuestionario|test de clase|test del campus|kahoot/i.test(n)) return { tipo: "profesor", txt: "🎯 La puso el profesor en clase · " + n.replace(/^Apuntes:\s*/, "") };
    if (t.indexOf("Apuntes:") === 0) return { tipo: "clase", txt: "📓 Entrenamiento · de tus apuntes de clase" };
    if (t.indexOf("⭐") === 0) return { tipo: "clase", txt: "⭐ Entrenamiento · sobre una imagen que el profesor marcó como importante" };
    if (t.indexOf("🖼️") === 0) return { tipo: "entreno", txt: "🖼️ Entrenamiento · sobre una imagen de clase o del atlas" };
    return { tipo: "entreno", txt: "🏋️ Entrenamiento · banco por temas" };
  }
  function norma(x) { return String(x).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim(); }
  // Enunciado + respuesta correcta de todo lo que cayó en examen, para reconocer
  // la misma pregunta cuando aparece repetida en un banco de entrenamiento
  var _caidas = null, _caidasN = 0;
  function caidas() {
    if (_caidas && _caidasN === ALL_QUESTIONS.length) return _caidas;
    _caidas = new Map(); _caidasN = ALL_QUESTIONS.length;
    ALL_QUESTIONS.forEach(function (q) {
      var k = norma(q.q);
      if (k.length < 25) return;
      // q.caida: exámenes en que cayó una pregunta que solo está en un banco de entrenamiento
      var en = (q.caida || []).slice();
      if (origenBanco(q.topicBase).tipo === "examen") en.push(limpio(q.topicBase));
      if (!en.length) return;
      if (!_caidas.has(k)) _caidas.set(k, new Set());
      en.forEach(function (n) { _caidas.get(k).add(n); });
    });
    return _caidas;
  }
  function origen(q) {
    var o = origenBanco(q.topicBase);
    if (o.tipo === "clase" && /kahoot/i.test(q.exp || "")) o = { tipo: "profesor", txt: "🎯 La puso el profesor en clase (Kahoot)" };
    var ex = caidas().get(norma(q.q));
    if (o.tipo === "examen") {
      if (ex && ex.size > 1) o.txt += " · repetida en " + ex.size + " exámenes";
      o.veces = ex ? ex.size : 1;
    } else if (ex) {
      o = { tipo: "examen", txt: o.txt.split(" · ")[0].replace("Entrenamiento", "Banco de entrenamiento") + " · y además cayó en: " + Array.from(ex).slice(0, 3).join("; "), veces: ex.size };
    }
    // q.cae: el profesor dijo en clase que esto se pregunta (lo marca tools/marcar_cae.py con la cita)
    if (q.cae) { o.cae = q.cae; o.txt += " · 🔴 El profesor dijo que cae" + (q.cae.c ? ": «" + q.cae.c + "»" : ""); }
    return o;
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
  // Bancos que tratan de lo mismo aunque se llamen distinto («Apuntes: Tema 6 —
  // Diencéfalo», «Tema 9: Diencéfalo», «⭐ Imágenes clave · … Diencéfalo»): los
  // une compartir una palabra poco corriente del nombre. Los bancos de examen,
  // que mezclan temas, no forman familia con nadie.
  var _fam = null, _famN = 0;
  function familias() {
    if (_fam && _famN === TOPIC_NAMES.length) return _fam;
    var df = new Map(), pal = new Map();
    TOPIC_NAMES.forEach(function (t) {
      var tipo = origenBanco(t).tipo;
      var w = tipo === "examen" || tipo === "recop" ? [] : (norma(limpio(t)).match(/[a-z]{6,}/g) || []);
      var set = new Set(w);
      pal.set(t, set);
      set.forEach(function (x) { df.set(x, (df.get(x) || 0) + 1); });
    });
    var tope = Math.max(4, Math.round(TOPIC_NAMES.length * 0.07));
    _fam = new Map(); _famN = TOPIC_NAMES.length;
    TOPIC_NAMES.forEach(function (t) {
      var f = [t];
      TOPIC_NAMES.forEach(function (u) {
        if (u === t) return;
        var comun = false;
        pal.get(t).forEach(function (x) { if (df.get(x) <= tope && pal.get(u).has(x)) comun = true; });
        if (comun) f.push(u);
      });
      _fam.set(t, f);
    });
    return _fam;
  }
  function familia(t) { return familias().get(t) || [t]; }

  // ------------------------------------------------------------ ámbito de la sesión
  // Hasta dónde va el temario y qué parcial se prepara. «Dado» es lo que ya tiene
  // banco de clase (apuntes, imágenes de clase, Kahoot, seminarios): al cargar
  // los apuntes de un tema nuevo, entra solo. Las preguntas de bancos que mezclan
  // temas (exámenes, recopilaciones) se asignan al tema al que más se parecen.
  var K_AMBITO = STORAGE_KEY + "_ambito";
  function leerAmbito() {
    var a = null;
    try { a = JSON.parse(localStorage.getItem(K_AMBITO) || "null"); } catch (e) {}
    a = a || {};
    if (a.alcance !== "todo") a.alcance = "dado";
    if (!Array.isArray(a.parciales) || !a.parciales.length) a.parciales = [1, 2];
    if (!a.mapa) a.mapa = {};
    return a;
  }
  function guardarAmbito(a) { try { localStorage.setItem(K_AMBITO, JSON.stringify(a)); } catch (e) {} }

  function esTematico(t) { var tp = origenBanco(t).tipo; return tp !== "examen" && tp !== "recop" && tp !== "oficial" && tp !== "ia"; }
  function esDeClase(t) { return /^(Apuntes:|⭐|🖼️ Más imágenes|🎯|🧪)/.test(t); }
  var _dados = null, _dadosN = 0;
  function temasDados() {
    if (_dados && _dadosN === TOPIC_NAMES.length) return _dados;
    _dados = new Set(); _dadosN = TOPIC_NAMES.length;
    TOPIC_NAMES.forEach(function (t) {
      if (t.indexOf("🧠") === 0) { var base = t.replace(/^🧠 A tu medida · /, ""); if (esDeClase(base)) _dados.add(t); return; }
      if (esDeClase(t)) familia(t).forEach(function (u) { if (esTematico(u)) _dados.add(u); });
    });
    return _dados;
  }
  // Qué parcial es cada tema cuando el usuario no lo ha cambiado a mano. Sale de lo que dicen
  // los apuntes de cada asignatura; sin regla, lo dado hasta hoy cuenta como 1.º y lo demás como 2.º
  var PARCIAL_TEMA = {
    // «1.er parcial: teoría hasta el Tema 12 (vascularización del SN), prácticas hasta la 6».
    // Las vías y las funciones y recorridos de los pares craneales son del 2.º
    anat3: function (t) {
      if (/formaci[oó]n reticular|Tema 4 \(II\)/i.test(t)) return 1;
      if (/v[ií]as? (motoras|sensitivas|[oó]ptica|piramidal|extrapiramidal|y pares)|piramidal|par(es)? craneal|globo ocular|Tema 1[4-9] —|Pr[aá]ctica ([7-9]|1\d)\b/i.test(t)) return 2;
      return 1;
    },
    // Visto en los exámenes de parcial de otros años: el 1.º es etiología general, propedéutica,
    // cardiovascular y respiratorio; el 2.º, digestivo, renal, sangre, endocrino, metabolismo,
    // locomotor y nervioso. Los capítulos del Sisinio, por número (hasta el 34, 1.º)
    medint: function (t) {
      var m = /Sisinio cap\. (\d+)/i.exec(t);
      if (m) return +m[1] <= 34 ? 1 : 2;
      if (/digestiv|renal|hematolog|endocrin|metabolism|locomotor|nervios|hígado|tiroides|g[oó]nadas|vías urinarias/i.test(t)) return 2;
      return 1;
    }
  };
  function parcialPorDefecto(t) {
    var f = PARCIAL_TEMA[STORAGE_KEY.replace(/_study_v\d+$/, "")];
    return f ? f(limpio(t).replace(/^Apuntes:\s*/, "")) : (temasDados().has(t) ? 1 : 2);
  }
  function hayParciales() { return TOPIC_NAMES.some(function (t) { return /parcial/i.test(t); }); }
  function parcialDelNombre(t) {
    if (/(1er|1\.?º|primer)\s+parcial/i.test(t)) return 1;
    if (/(2\.?º|2do|segundo)\s+parcial|parcial\s+2\b/i.test(t)) return 2;
    return 0;
  }

  // Tema al que pertenece una pregunta de un banco mezclado: el banco temático con el que
  // comparte más palabras poco corrientes. Si no destaca ninguno, se queda sin asignar.
  var _voc = null, _vocN = 0, _temaDe = new Map();
  function vocabulario() {
    if (_voc && _vocN === ALL_QUESTIONS.length) return _voc;
    var porBanco = new Map(), df = new Map();
    TOPIC_NAMES.forEach(function (t) {
      if (!esTematico(t)) return;
      var set = new Set(norma(limpio(t)).match(/[a-z]{5,}/g) || []);
      (BY_TOPIC.get(t) || []).forEach(function (q) { palabras(q).forEach(function (w) { set.add(w); }); });
      porBanco.set(t, set);
      set.forEach(function (w) { df.set(w, (df.get(w) || 0) + 1); });
    });
    _voc = { porBanco: porBanco, df: df, n: porBanco.size }; _vocN = ALL_QUESTIONS.length; _temaDe = new Map();
    return _voc;
  }
  function temaDe(q) {
    if (esTematico(q.topicBase)) return q.topicBase;
    if (_temaDe.has(q.id) && _vocN === ALL_QUESTIONS.length) return _temaDe.get(q.id);
    var v = vocabulario(), w = Array.from(palabras(q)), mejor = null, p1 = 0, p2 = 0;
    v.porBanco.forEach(function (set, t) {
      var p = 0;
      for (var i = 0; i < w.length; i++) if (set.has(w[i])) p += Math.log(1 + v.n / v.df.get(w[i]));
      if (p > p1) { p2 = p1; p1 = p; mejor = t; } else if (p > p2) p2 = p;
    });
    var r = mejor && p1 >= 3 && p1 >= p2 * 1.15 ? mejor : null;
    _temaDe.set(q.id, r);
    return r;
  }
  function parcialDe(q, a) {
    var p = parcialDelNombre(q.topicBase);
    if (p) return p;
    var t = temaDe(q);
    if (!t) return 0;
    return a.mapa[t] || parcialPorDefecto(t);
  }
  // ¿Entra la pregunta en lo que se ha elegido?
  function enAmbito(q, a) {
    if (q.ia) return true;
    if (a.alcance === "dado") {
      var t = temaDe(q);
      if (!t || !temasDados().has(t)) return false;
    }
    if (a.conParciales && a.parciales.length === 1) {
      var p = parcialDe(q, a);
      if (p !== a.parciales[0]) return false;
    }
    return true;
  }

  // Cuadro que aparece al pulsar «Entrenador»: qué entra en la sesión
  function abrirAmbito() {
    var a = leerAmbito(), dados = temasDados(), caja = document.getElementById("coach-ambito");
    if (!dados.size && !hayParciales()) { empezar(); return; }   // nada que elegir todavía
    if (!caja) {
      caja = document.createElement("div"); caja.id = "coach-ambito";
      var rej = document.querySelector(".mode-grid");
      rej.parentNode.insertBefore(caja, rej.nextSibling);
    }
    var tematicos = TOPIC_NAMES.filter(esTematico).filter(function (t) { return t.indexOf("🧠") !== 0; });
    var clase = TOPIC_NAMES.filter(function (t) { return t.indexOf("Apuntes:") === 0; });
    var nDado = ALL_QUESTIONS.filter(function (q) { return enAmbito(q, { alcance: "dado", parciales: [1, 2], mapa: a.mapa }); }).length;
    var con = hayParciales();
    var h = (window.PlanExamen ? window.PlanExamen.brief() : "") + '<b>🧠 ¿Qué entra en esta sesión?</b>' +
      '<p class="sub">Temario dado hasta hoy: <b>' + clase.length + ' temas con apuntes de clase</b>' +
      (clase.length ? ' (el último, «' + esc(limpio(clase[0].replace(/^Apuntes:\s*/, ""))) + '»)' : '') + '.</p>' +
      (!dados.size ? "" : '<label><input type="radio" name="amb-alc" value="dado"' + (a.alcance === "dado" ? " checked" : "") + '> Solo hasta donde va el temario <span class="sub">(' + nDado.toLocaleString("es") + ' preguntas)</span></label>') +
      '<label><input type="radio" name="amb-alc" value="todo"' + (a.alcance === "todo" || !dados.size ? " checked" : "") + '> Todo el temario <span class="sub">(' + ALL_QUESTIONS.length.toLocaleString("es") + ' preguntas)</span></label>';
    if (con) {
      h += '<p style="margin-top:10px"><b>Parcial que preparas</b></p>' +
        '<label><input type="checkbox" id="amb-p1"' + (a.parciales.indexOf(1) >= 0 ? " checked" : "") + '> 1.er parcial</label>' +
        '<label><input type="checkbox" id="amb-p2"' + (a.parciales.indexOf(2) >= 0 ? " checked" : "") + '> 2.º parcial</label>' +
        '<details><summary>Ajustar qué tema entra en cada parcial</summary><p class="sub">Por defecto va según lo que dicen tus apuntes (o, si no dicen nada, lo dado hasta hoy cuenta como 1.er parcial y lo demás como 2.º). Cámbialo aquí si no es así: el plan de examen usa este mismo reparto.</p>' +
        tematicos.map(function (t, i) {
          var p = a.mapa[t] || parcialPorDefecto(t);
          return '<div class="tm"><span>' + esc(t) + '</span><select data-i="' + i + '"><option value="1"' + (p === 1 ? " selected" : "") + '>1.º</option><option value="2"' + (p === 2 ? " selected" : "") + '>2.º</option></select></div>';
        }).join("") + '</details>';
    }
    h += '<div class="fila"><button id="amb-ir">Empezar</button><button id="amb-no" class="sec">Cancelar</button></div>';
    caja.innerHTML = h;
    caja.hidden = false;
    caja.scrollIntoView && caja.scrollIntoView({ block: "nearest" });
    caja.onchange = function (ev) {
      var sel = ev.target;
      if (!sel || sel.tagName !== "SELECT") return;
      var t = tematicos[+sel.getAttribute("data-i")], v = +sel.value;
      familia(t).forEach(function (u) { if (esTematico(u)) a.mapa[u] = v; });
      guardarAmbito(a);
    };
    document.getElementById("amb-no").onclick = function () { caja.hidden = true; };
    document.getElementById("amb-ir").onclick = function () {
      a.alcance = (caja.querySelector('input[name="amb-alc"]:checked') || {}).value === "todo" ? "todo" : "dado";
      if (con) {
        a.parciales = [];
        if (document.getElementById("amb-p1").checked) a.parciales.push(1);
        if (document.getElementById("amb-p2").checked) a.parciales.push(2);
        if (!a.parciales.length) a.parciales = [1, 2];
        if (window.PlanExamen && window.PlanExamen.fijarObjetivo) window.PlanExamen.fijarObjetivo(a.parciales.length === 1 ? "p" + a.parciales[0] : "final");
      }
      guardarAmbito(a);
      caja.hidden = true;
      empezar();
    };
  }

  // Reparto de una sesión: que se avance aunque haya fallos
  var CUOTA = { nuevo: 0.42, repaso: 0.36, fallo: 0.22 };
  var BLOQUE = 3;   // preguntas de la batería que se dedican a un tema que no controlas, y se acabó por hoy

  // Sesión completa de hoy («🏁» en el plan de examen): no tiene largo fijo. Sigue mientras
  // queden las nuevas que pide el plan para hoy, los repasos vencidos de lo que se prepara o
  // algo por consolidar: tras un fallo, otra de la misma idea hasta acertarla sin adivinar, y
  // en un tema que no se controla, de su batería hasta acertar dos seguidas (como mucho
  // BLOQUE_MAX). Al acabar, rondas con las falladas de la sesión hasta acertarlas todas.
  // Va en sess.completa = {dia, nuevas, ronda, ids0}; se copia en K_COMP para seguir tras recargar.
  var COLA = 8, BLOQUE_MAX = 8, EXTRA = 15;
  var K_COMP = STORAGE_KEY + "_completa";

  function nuevoCtx(completa) {
    return { completa: completa || null, usadas: new Set(), deuda: new Map(), racha: new Map(), cerrados: new Set(), ult: [],
             cuenta: new Map(), resp: new Map(), fallos: new Map(), flojos: [], bloque: new Map(), cat: { nuevo: 0, repaso: 0, fallo: 0 }, total: 0 };
  }

  function categoria(q) {
    var k = saber((State.data.qs || {})[q.id]);
    return k == null ? "nuevo" : k === 0 ? "fallo" : "repaso";
  }

  function temaReal(q) { return temaDe(q) || q.topicBase; }

  function avanzar(ctx, q, ans, pos, cat) {
    var t = temaReal(q);
    ctx.usadas.add(q.id);
    ctx.ult.push(t);
    ctx.total++;
    ctx.cuenta.set(t, (ctx.cuenta.get(t) || 0) + 1);
    if (cat) ctx.cat[cat]++;
    // Una pregunta de seguimiento salda la deuda del tema; las del bloque de un tema flojo se van gastando
    // (la de seguimiento puede salir de un banco de la misma familia que el de la fallada)
    var dk = ctx.deuda.has(t) ? t : null;
    if (!dk) ctx.deuda.forEach(function (x, k) { if (!dk && familia(k).indexOf(t) >= 0) dk = k; });
    var d = dk ? ctx.deuda.get(dk) : null;
    if (d && d.ref.id !== q.id) ctx.deuda.delete(dk);
    var b = ctx.bloque.get(t);
    if (b && pos > b.desde && b.n > 0) { b.n--; b.ultima = pos; }
    if (!ans) return;
    if (ctx.completa) {
      // Consolidar: el bloque de un tema flojo sigue hasta acertar dos seguidas sin adivinar
      if (b && pos > b.desde && !b.hecho) {
        b.usadas = (b.usadas || 0) + 1;
        b.seguidas = ans.wasCorrect && ans.conf !== 3 ? (b.seguidas || 0) + 1 : 0;
        if (b.seguidas >= 2) { b.n = 0; b.hecho = true; }
        else if (b.n === 0 && b.usadas < BLOQUE_MAX) b.n = 1;
        else if (b.usadas >= BLOQUE_MAX) b.hecho = true;
      }
      // Acertar adivinando la de seguimiento no salda el fallo: otra más de la idea
      if (d && d.ref.id !== q.id && ans.wasCorrect && ans.conf === 3 && !ctx.bloque.has(t)) ctx.deuda.set(dk, { ref: d.ref, desde: pos });
    }
    ctx.resp.set(t, (ctx.resp.get(t) || 0) + 1);
    if (!ans.wasCorrect) {
      var f = (ctx.fallos.get(t) || 0) + 1;
      ctx.fallos.set(t, f);
      ctx.racha.set(t, 0);
      if (ctx.bloque.has(t)) return;                     // ya está en bloque: no se abre nada más
      if (f >= 2 && f / ctx.resp.get(t) >= 0.5) {
        // No lo controla: tres de la batería sobre ese tema, espaciadas, y a otra cosa
        var bl = { n: BLOQUE, desde: pos, ultima: pos, tema: t, ref: q };
        familia(t).forEach(function (u) { if (!ctx.bloque.has(u)) ctx.bloque.set(u, bl); });
        ctx.flojos.push(t);
        ctx.deuda.delete(t);
      } else {
        ctx.deuda.set(t, { ref: q, desde: pos });        // una sola de seguimiento
      }
    } else if (ans.conf !== 2 && ans.conf !== 3) {
      var r = (ctx.racha.get(t) || 0) + 1;
      ctx.racha.set(t, r);
      if (r >= RACHA_CIERRE) ctx.cerrados.add(t);
    } else {
      ctx.racha.set(t, 0);
    }
  }

  function dias(n) { return n === 1 ? "1 día" : n + " días"; }

  function ambitoCtx(ctx) {
    return ctx.ambito || (ctx.ambito = (function () { var a = leerAmbito(); a.conParciales = hayParciales(); if (!temasDados().size) a.alcance = "todo"; a.libre = a.alcance === "todo" && !(a.conParciales && a.parciales.length === 1); return a; })());
  }
  // Lo que falta de la sesión completa: nuevas del plan, repasos vencidos y cosas por consolidar
  function pendientesHoy(ctx) {
    var c = ctx.completa;
    if (!c) return null;
    var amb = ambitoCtx(ctx), plan = window.PlanExamen || null, qs = State.data.qs || {}, venc = 0, quedan = new Set();
    for (var i = 0; i < ALL_QUESTIONS.length; i++) {
      var q = ALL_QUESTIONS[i];
      if (ctx.usadas.has(q.id) || effCorrectOrig(q) == null) continue;
      if (!amb.libre && !enAmbito(q, amb)) continue;
      if (plan && plan.factor(q) <= 0) continue;
      quedan.add(temaReal(q));
      if (isDue(qs[q.id])) venc++;
    }
    // Solo se consolida lo que aún tiene preguntas sin usar en la sesión (si no, no acabaría nunca)
    var hay = function (t) { return familia(t).some(function (u) { return quedan.has(u); }); };
    var cons = new Set();
    ctx.deuda.forEach(function (d, t) { if (hay(t)) cons.add(t); });
    ctx.bloque.forEach(function (b) { if (!b.hecho && (b.n > 0 || (b.usadas || 0) < BLOQUE_MAX) && hay(b.tema)) cons.add(b.tema); });
    var r = { nuevas: Math.max(0, c.nuevas - ctx.cat.nuevo), venc: venc, cons: cons.size };
    r.fin = !r.nuevas && !r.venc && !r.cons;
    return r;
  }

  function elegir(ctx, temas, pos, largo) {
    var qs = State.data.qs || {}, hoy = today(), mejor = null, mejorP = -1;
    var ult = ctx.ult, n = ult.length;
    var repetido = n >= 2 && ult[n - 1] === ult[n - 2] ? ult[n - 1] : null;
    var haceSemana = Date.now() / 1000 - 7 * 86400;
    var topeTema = Math.max(4, Math.round((largo || TANDA) * 0.2));
    var amb = ambitoCtx(ctx);
    var plan = window.PlanExamen || null, semana = plan ? (ctx.semana || (ctx.semana = plan.temasSemana())) : null;
    var cuota = (plan && plan.cuota()) || CUOTA;
    var deudaFam = new Map();
    ctx.deuda.forEach(function (d, t) { familia(t).forEach(function (u) { if (!deudaFam.has(u)) deudaFam.set(u, d); }); });

    for (var i = 0; i < ALL_QUESTIONS.length; i++) {
      var q = ALL_QUESTIONS[i];
      if (ctx.usadas.has(q.id) || effCorrectOrig(q) == null) continue;
      if (!amb.libre && !enAmbito(q, amb)) continue;
      var t = q.topicBase, tm = temas.get(t), s = qs[q.id], k = saber(s);
      var p, por, cat;

      if (k == null) {
        cat = "nuevo";
        if (tm.estado === "flojo") { p = 1.8; por = "Tema flojo: una que aún no habías visto"; }
        else if (tm.estado === "marcha") { p = 2.2; por = "Tema en marcha: una nueva para avanzar"; }
        else if (tm.estado === "sabido") { p = 0.3; por = "Tema sabido: una que te faltaba por ver"; }
        else { p = 1.2; por = "Tema nuevo: para avanzar"; }
        if (tm.reciente > haceSemana) p += 1;                 // sigue con lo que estás estudiando estos días
        if (t.indexOf("Apuntes:") === 0) p += 0.8;            // lo de clase va antes
        else if (t.indexOf("⭐") === 0) p += 0.6;
        if (ctx.cerrados.has(temaReal(q))) p *= 0.15;
        if (q.ia) { p += 2; por = "Escrita por la IA para una confusión tuya"; }
      } else if (k === 0) {
        cat = "fallo";
        if (isSureFail(s)) { p = 3.6; por = "La fallaste yendo seguro: es un error de concepto"; }
        else { p = 3; por = "La fallaste la última vez"; }
      } else if (isDue(s)) {
        cat = "repaso";
        var atraso = hoy - s.du;
        p = 3 + Math.min(1.5, atraso * 0.2) + (1 - k);
        por = atraso > 0 ? "Repaso programado: vencía hace " + dias(atraso) : "Repaso programado para hoy";
        if (k <= 0.3) por = "La acertaste adivinando: toca comprobarla";
      } else if (k <= 0.3) {
        cat = "repaso"; p = 1.2; por = "La acertaste adivinando";
      } else {
        cat = "repaso"; p = 0.05; por = "Mantenimiento";
        if (tm.estado === "sabido") por = "Tema sabido: comprobación de mantenimiento";
      }

      // Sesión completa: cumplidas las nuevas de hoy, ni más nuevas ni mantenimiento (salvo que no quede otra cosa)
      if (ctx.completa) {
        if (cat === "nuevo" && ctx.cat.nuevo >= ctx.completa.nuevas) p *= 0.02;
        else if (cat === "repaso" && !isDue(s) && k > 0.3) p *= 0.02;
      }

      // Lo que ya cayó en un examen o puso el profesor va antes que el resto, a igualdad de lo demás.
      // Con el plan de examen, cuánto vale cada origen lo decide el usuario (0 = fuera)
      var og = origenBanco(t).tipo;
      if (plan) {
        var fx = plan.factor(q);
        if (fx <= 0) continue;
        p *= fx;
        if (cat === "nuevo" && semana.has(temaReal(q))) { p += 1.2; por = "Plan de examen: tema de esta semana · " + por; }
      } else if (og === "examen") p *= 1.3; else if (og === "profesor" || og === "oficial") p *= 1.2;

      var tt = temaReal(q);
      var b = ctx.bloque.get(tt), d = deudaFam.get(tt), dirigido = false;
      if (b) {
        // Tema que no controlas: unas pocas de la batería, espaciadas; después no se insiste más hoy
        if (b.n > 0 && pos - b.ultima >= 2) {
          p += 5 + 4 * parecido(q, b.ref) + (q.ia ? 3 : 0) + (og === "examen" || og === "profesor" ? 1 : 0);
          por = q.ia ? "Para aclarar el tema que se te resiste: una escrita por la IA" : "Para aclarar el tema que se te resiste: una de la batería";
          dirigido = true;
        } else {
          p *= 0.08;
        }
      } else if (d && d.ref.id !== q.id) {
        // Tras un fallo, una sola de la batería sobre la misma idea, dejando una por medio
        if (pos - d.desde >= 2) {
          p += 4 + 5 * parecido(q, d.ref);
          por = "Fallaste una de este tema hace un momento: otra de la batería sobre la misma idea";
          dirigido = true;
        }
      }

      if (!dirigido) {
        if (repetido === tt) p *= 0.3;                         // alternar temas fija mejor que machacar uno
        if ((ctx.cuenta.get(tt) || 0) >= topeTema) p *= 0.2;   // ningún tema se come la sesión
        // Reparto: si una clase de pregunta va pasada de su parte, cede el sitio
        if (ctx.total >= 4) {
          var parte = ctx.cat[cat] / ctx.total;
          if (parte > cuota[cat] + 0.08) p *= 0.35;
          else if (parte < cuota[cat] - 0.12) p *= 1.7;
        }
      }

      p *= 0.85 + Math.random() * 0.3;
      if (p > mejorP) { mejorP = p; mejor = { q: q, por: por, cat: cat }; }
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
  function reproducir(sess, hasta) {
    var ctx = nuevoCtx(completaDe(sess)), cats = sess.coachCat || {};
    for (var i = 0; i < hasta; i++) {
      var q = sess.questions[i];
      avanzar(ctx, q, sess.answers[q.id], i, cats[q.id] || categoria(q));
    }
    return ctx;
  }

  // Fija lo ya mostrado y vuelve a decidir todo lo que queda por delante
  function replanificar(sess) {
    var temas = todosLosTemas();
    var fijo = sess.questions.slice(0, sess.currentIdx + 1);
    if (!sess.coachPor) sess.coachPor = {};
    if (!sess.coachCat) sess.coachCat = {};
    var comp = completaDe(sess);
    if (comp && comp.ronda) return { flojos: [], racha: new Map(), bloque: new Map() };   // la ronda final es fija
    var ctx = reproducir(sess, fijo.length);
    var total = Math.max(sess.questions.length, fijo.length), lista = fijo.slice();
    var real = { flojos: ctx.flojos.slice(), racha: new Map(ctx.racha), bloque: new Map(ctx.bloque) };
    if (comp) {
      // Siempre unas cuantas por delante hasta que no quede nada de lo de hoy
      comp.pend = pendientesHoy(ctx);
      // El total del día que se enseña: lo ya visto + lo que falta (nuevas, repasos y consolidar)
      var falta = comp.pend.nuevas + comp.pend.venc + comp.pend.cons;
      comp.total = fijo.length + falta;
      if (comp.total0 == null) comp.total0 = comp.total;
      total = comp.pend.fin ? fijo.length : fijo.length + Math.min(COLA, Math.max(1, falta));
      guardarCompleta(sess);
    }
    for (var pos = fijo.length; pos < total; pos++) {
      var e = elegir(ctx, temas, pos, total);
      if (!e) break;
      lista.push(preparar(e.q));
      sess.coachPor[e.q.id] = e.por;
      sess.coachCat[e.q.id] = e.cat;
      avanzar(ctx, e.q, null, pos, e.cat);
    }
    sess.questions = lista;
    return real;
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
      msg = "Acierto adivinando: no la doy por sabida y vuelve mañana.";
    } else if (ans.wasCorrect && conf === 2) {
      if (s.iv > 3) { s.iv = 3; s.du = today() + 3; }
      msg = "Acierto con dudas: la repaso en " + dias(Math.max(1, s.iv)) + ".";
    } else if (ans.wasCorrect && conf === 1 && s.a === 1 && secs <= lento() / 2) {
      s.iv = 4; s.du = today() + 4;
      msg = "Segura y rápida a la primera: no la verás hasta dentro de 4 días.";
    } else if (!ans.wasCorrect && conf === 1) {
      s.ef = Math.max(1.3, (typeof s.ef === "number" ? s.ef : 2.5) - 0.15);
      msg = "Ibas seguro y era otra: error de concepto. Una más de la batería sobre esta idea y seguimos avanzando; esta vuelve mañana.";
    } else if (!ans.wasCorrect) {
      msg = "Anotada. Una más de la batería sobre esta idea y seguimos avanzando; esta vuelve en el próximo repaso.";
    }
    touchQS(s);
    saveData();
    return msg;
  }

  // ------------------------------------------------------------------ interfaz
  var css = document.createElement("style");
  css.textContent =
    "#q-coach{font-size:.8rem;color:var(--text2);border-left:3px solid var(--accent);padding:6px 10px;margin:0 0 10px;background:var(--surface2);border-radius:0 8px 8px 0}" +
    "#q-origen{font-size:.76rem;color:var(--text2);margin:0 0 8px}#q-origen.examen{color:#fbbf24;font-weight:600}#q-origen.profesor,#q-origen.oficial{color:#34d399}" +
    "#q-coach .esq{margin-top:8px;color:var(--text)}#q-coach .esq summary{cursor:pointer;font-weight:600}" +
    "#q-coach table{border-collapse:collapse;margin:8px 0;font-size:.8rem;width:100%}#q-coach th,#q-coach td{border:1px solid var(--border);padding:4px 6px;text-align:left;vertical-align:top}#q-coach th{background:var(--surface)}" +
    "#coach-res button{background:#7c3aed;color:#fff;border:0;border-radius:6px;padding:6px 12px;font-size:.85rem;cursor:pointer;margin:4px 6px 0 0}" +
    "#coach-ambito{margin:14px 0 0;border:1px solid #a78bfa;border-radius:12px;background:var(--surface);padding:12px 16px;font-size:.88rem}" +
    "#coach-ambito label{display:block;margin:6px 0;cursor:pointer}#coach-ambito .sub{color:var(--text2);font-size:.8rem}#coach-ambito p{margin:4px 0}" +
    "#coach-ambito details{margin-top:8px}#coach-ambito summary{cursor:pointer;color:var(--text2)}#coach-ambito .tm{display:flex;gap:8px;align-items:center;padding:3px 0;border-top:1px solid var(--border)}#coach-ambito .tm span{flex:1;min-width:0;font-size:.8rem}" +
    "#coach-ambito select{background:var(--surface2);color:var(--text);border:1px solid var(--border);border-radius:6px;padding:2px 6px}" +
    "#coach-ambito .fila{display:flex;gap:8px;margin-top:12px}#coach-ambito button{background:#7c3aed;color:#fff;border:0;border-radius:6px;padding:8px 16px;font-size:.9rem;cursor:pointer}#coach-ambito .sec{background:none;color:var(--text2);border:1px solid var(--border)}" +
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

  // Si la IA está conectada, se le pide un esquema que aclare el tema que no se controla
  // (y una o dos preguntas suyas). Llega mientras se sigue respondiendo.
  function pedirEsquema(sess, tema) {
    var ia = window.EntrenadorIA;
    if (!ia || typeof ia.aclarar !== "function" || !ia.conectada()) return;
    if (!sess.esquemas) sess.esquemas = {};
    if (sess.esquemas[tema]) return;
    sess.esquemas[tema] = { html: "<i>La IA está preparando un esquema de este tema…</i>", nuevo: false };
    var fallos = sess.questions.filter(function (q) { var a = sess.answers[q.id]; return a && !a.wasCorrect && familia(tema).indexOf(temaReal(q)) >= 0; });
    ia.aclarar(tema, fallos, sess).then(function (html) {
      var e = { html: html, nuevo: true };
      familia(tema).forEach(function (u) { sess.esquemas[u] = e; });
      if (State.session === sess) avisoPregunta();
    }).catch(function (err) {
      delete sess.esquemas[tema];
      console.warn("entrenador: esquema", err);
    });
  }

  // Sesión específica de un tema: todos los bancos de su familia, primero lo fallado
  // y lo que cayó en examen, después lo que no has visto
  function especifico(tema, n) {
    var qs = State.data.qs || {}, lista = [], fam = familia(tema);
    ALL_QUESTIONS.forEach(function (q) {
      if (fam.indexOf(temaReal(q)) < 0 && fam.indexOf(q.topicBase) < 0) return;
      (function () {
        if (effCorrectOrig(q) == null) return;
        var s = qs[q.id], k = saber(s), og = origen(q).tipo;
        var p = k == null ? 2 : k === 0 ? (isSureFail(s) ? 6 : 5) : k <= 0.3 ? 3 : k < 0.7 ? 1.5 : 0.3;
        if (og === "examen") p += 3; else if (og === "profesor" || og === "oficial") p += 2.5; else if (og === "clase") p += 1;
        if (q.cae) p += og === "examen" ? 1 : 3;
        lista.push([p * (0.8 + Math.random() * 0.4), q]);
      })();
    });
    if (!lista.length) { alert("No hay preguntas de ese tema."); return; }
    lista.sort(function (a, b) { return b[0] - a[0]; });
    App.beginSession(shuffle(lista.slice(0, n || 25).map(function (x) { return x[1]; })), "especifico");
  }

  function chipOrigen() {
    var sess = State.session, chip = document.getElementById("q-origen");
    if (!sess) return;
    if (!chip) {
      chip = document.createElement("div"); chip.id = "q-origen";
      var txt = document.getElementById("q-text");
      txt.parentNode.insertBefore(chip, txt);
    }
    var o = origen(sess.questions[sess.currentIdx]);
    chip.className = o.tipo;
    chip.textContent = o.txt;
  }

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
    var esq = (sess.esquemas || {})[temaReal(q)];
    var plan = sess.currentIdx === 0 && window.PlanExamen ? window.PlanExamen.brief() : "";
    var comp = avisoCompleta(sess);
    caja.hidden = !por && !dec && !esq && !plan && !comp;
    caja.innerHTML = plan + comp + (por ? "🧠 <b>Por qué esta:</b> " + esc(por) : "") + (dec ? '<span class="dec">→ ' + esc(dec) + "</span>" : "") +
      (esq ? '<details class="esq"' + (esq.nuevo || sess.answers[q.id] ? " open" : "") + "><summary>📐 Esquema para aclarar este tema</summary>" + esq.html + "</details>" : "");
    if (esq && esq.nuevo && sess.answers[q.id]) esq.nuevo = false;
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
      btn.onclick = abrirAmbito;
      rejilla.insertBefore(btn, hoyBtn);
    }
    var temas = todosLosTemas(), c = { flojo: [], marcha: [], sabido: [], nuevo: [] }, vencidas = 0;
    temas.forEach(function (t) { c[t.estado].push(t); vencidas += t.vencidas; });
    document.getElementById("coach-desc").textContent =
      "Decide cada pregunta según cómo respondes · " + TOPIC_NAMES.filter(function (t) { return t.indexOf("Apuntes:") === 0; }).length + " temas dados · " + vencidas + " repasos pendientes · " +
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
      if (!f) return;
      var tm = f.getAttribute("data-tema");
      if (estadoTema(tm).estado === "flojo") especifico(tm); else App.startSingleTopic(tm);
    };
  }

  function empezar(completa) {
    var sel = document.getElementById("sel-limit");
    if (!completa || typeof completa !== "object" || !("nuevas" in completa)) completa = null;
    var n = completa ? COLA + 1 : (sel && parseInt(sel.value)) || TANDA;
    _lento = null;
    var temas = todosLosTemas(), ctx = nuevoCtx(completa);
    var primera = elegir(ctx, temas, 0, n);
    if (!primera) { alert("No hay preguntas disponibles."); return; }
    App.beginSession([primera.q], MODO);
    var sess = State.session;
    sess.coachPor = {}; sess.coachDec = {}; sess.coachCat = {}; sess.esquemas = {};
    if (completa) { completa.ids0 = primera.q.id; sess.completa = completa; }
    sess.coachCat[primera.q.id] = primera.cat;
    sess.coachPor[primera.q.id] = primera.por;
    planInicial(sess, n);
    if (completa) replanificar(sess);
    App.saveSession();
    App.renderQuizQuestion();
    App.renderSidebar();
  }
  function planInicial(sess, n) {
    var temas = todosLosTemas(), ctx = nuevoCtx(completaDe(sess));
    avanzar(ctx, sess.questions[0], null, 0, sess.coachCat[sess.questions[0].id]);
    for (var pos = 1; pos < n; pos++) {
      var e = elegir(ctx, temas, pos, n);
      if (!e) break;
      sess.questions.push(preparar(e.q));
      sess.coachPor[e.q.id] = e.por;
      sess.coachCat[e.q.id] = e.cat;
      avanzar(ctx, e.q, null, pos, e.cat);
    }
  }


  function claveHoy() { var d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
  // La sesión completa de esta sesión (el motor no la guarda: se recupera de K_COMP tras recargar)
  function completaDe(sess) {
    if (!sess || sess.mode !== MODO) return null;
    if (sess.completa) return sess.completa;
    try {
      var c = JSON.parse(localStorage.getItem(K_COMP) || "null");
      if (c && c.dia === claveHoy() && sess.questions[0] && c.ids0 === sess.questions[0].id) return (sess.completa = c);
    } catch (e) {}
    return null;
  }
  function guardarCompleta(sess) { try { localStorage.setItem(K_COMP, JSON.stringify(sess.completa)); } catch (e) {} }
  // Nuevas que pide hoy el plan, descontando las que ya se han visto hoy
  function nuevasPendientesHoy() {
    var p = window.PlanExamen && window.PlanExamen.plan ? window.PlanExamen.plan() : null, obj = p && p.objNuevas || 0;
    var qs = State.data.qs || {}, d = new Date(); d.setHours(0, 0, 0, 0);
    var desde = d.getTime() / 1000, hechas = 0;
    for (var id in qs) { var h = qs[id] && qs[id].h; if (Array.isArray(h) && h.length && h[0][0] >= desde && (qs[id].a || 0) <= h.length) hechas++; }
    return { obj: obj, hechas: hechas, quedan: Math.max(0, obj - hechas) };
  }
  // Lo atrasado: las nuevas que pedía el plan en los últimos días y no se hicieron (con lo que
  // pide hoy como referencia, como mucho tres días de cuota). Los repasos atrasados ya entran
  // siempre: un repaso vencido hace días sigue vencido.
  var DIAS_ATRASO = 7;
  function atrasoNuevas() {
    var p = window.PlanExamen && window.PlanExamen.plan ? window.PlanExamen.plan() : null, obj = p && p.objNuevas || 0;
    if (!obj) return { n: 0, dias: 0 };
    var qs = State.data.qs || {}, hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    var h0 = hoy.getTime() / 1000, desde = h0 - DIAS_ATRASO * 86400, porDia = {};
    for (var id in qs) {
      var h = qs[id] && qs[id].h;
      if (!Array.isArray(h) || !h.length || (qs[id].a || 0) > h.length) continue;   // solo primeras veces
      var t = h[0][0];
      if (t >= desde && t < h0) { var k = Math.floor((t - desde) / 86400); porDia[k] = (porDia[k] || 0) + 1; }
    }
    var falta = 0, dias = 0;
    for (var i = 0; i < DIAS_ATRASO; i++) { var f = Math.max(0, obj - (porDia[i] || 0)); if (f) { falta += f; dias++; } }
    return { n: Math.min(falta, obj * 3), dias: dias };
  }
  // «🏁 Sesión completa de hoy» del plan de examen (con lo atrasado si se pide; «extra» = un poco más al acabar)
  function empezarCompleta(modo) {
    var a = leerAmbito(), o = window.PlanExamen ? window.PlanExamen.objetivo() : "final";
    a.alcance = "todo";
    a.parciales = o === "p1" ? [1] : o === "p2" ? [2] : [1, 2];
    guardarAmbito(a);
    var caja = document.getElementById("coach-ambito");
    if (caja) caja.hidden = true;
    var n = modo === "extra" ? EXTRA : nuevasPendientesHoy().quedan + (modo === "atrasado" ? atrasoNuevas().n : 0);
    empezar({ dia: claveHoy(), nuevas: n, ronda: 0, modo: modo || "hoy" });
  }
  // Ronda final: las falladas de la sesión (o de la ronda anterior), hasta acertarlas todas
  function rondaFinal(ids, n) {
    var qs = ids.map(function (id) { return BY_ID.get(id); }).filter(Boolean);
    if (!qs.length) return;
    App.beginSession(shuffle(qs), MODO);
    var sess = State.session;
    sess.coachPor = {}; sess.coachDec = {}; sess.coachCat = {}; sess.esquemas = {};
    sess.questions.forEach(function (q) { sess.coachPor[q.id] = "Ronda final: la fallaste hoy y vuelve hasta que la aciertes"; sess.coachCat[q.id] = "fallo"; });
    sess.completa = { dia: claveHoy(), nuevas: 0, ronda: n, ids0: sess.questions[0].id };
    guardarCompleta(sess);
    App.saveSession();
    App.renderQuizQuestion();
    App.renderSidebar();
  }
  function avisoCompleta(sess) {
    var c = completaDe(sess);
    if (!c) return "";
    if (c.ronda) {
      var quedan = sess.questions.filter(function (q) { return !sess.answers[q.id]; }).length;
      return '<div class="plan-brief">🔁 <b>Ronda final ' + c.ronda + "</b>: las que has fallado hoy, hasta acertarlas todas · quedan " + quedan + " en esta ronda.</div>";
    }
    var p = c.pend;
    if (!p) return "";
    contadorCompleta(sess, c);
    if (p.fin) return '<div class="plan-brief">🏁 <b>Sesión completa de hoy</b>: ya está todo lo que pedía el plan. Esta es la última' + (sess.questions.some(function (q) { var a = sess.answers[q.id]; return a && !a.wasCorrect; }) ? "; después, la ronda final con lo que has fallado." : ".") + "</div>";
    var f = [];
    if (p.nuevas) f.push(p.nuevas + " nuevas");
    if (p.venc) f.push(p.venc + " repasos vencidos");
    if (p.cons) f.push(p.cons + (p.cons === 1 ? " idea por consolidar" : " ideas por consolidar"));
    return '<div class="plan-brief">' + (c.modo === "extra" ? "➕ <b>Un poco más: " : c.modo === "atrasado" ? "⏪ <b>Hoy + lo atrasado: " : "🏁 <b>Sesión completa de hoy: ") + c.total + " preguntas</b>" + (c.total > c.total0 ? " (empezó en " + c.total0 + "; el resto es para consolidar lo que has fallado)" : "") +
      " · vas por la " + (sess.currentIdx + 1) + " y te faltan " + f.join(", ") + ". No acaba hasta terminarlo y aclarar lo que falles.</div>";
  }
  // El contador de arriba (n / total) cuenta el total del día, no las que hay preparadas por delante
  function contadorCompleta(sess, c) {
    var tot = c.pend.fin ? sess.questions.length : Math.max(c.total, sess.currentIdx + 1);
    var el = document.getElementById("q-progress"), bar = document.getElementById("q-progress-bar");
    if (el) el.textContent = (sess.currentIdx + 1) + " / " + tot;
    if (bar) bar.style.width = Math.min(100, (sess.currentIdx + 1) * 100 / tot) + "%";
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
    var ctx = replanificar(sess), t = temaReal(q);
    var bl = ctx.bloque.get(t);
    if (!ans.wasCorrect && bl && bl.tema === t && bl.desde === sess.currentIdx) {
      msg = "Segundo fallo en este tema: todavía no lo controlas. Te pongo " + BLOQUE + " de la batería para aclararlo y no insisto más hoy; seguimos avanzando y al final te propongo un específico.";
      pedirEsquema(sess, t);
    } else if (!ans.wasCorrect && bl && completaDe(sess)) {
      msg = "Este tema se te resiste: sigo con preguntas de su batería hasta que aciertes dos seguidas.";
    } else if (!ans.wasCorrect && bl) {
      msg = "Este tema se te resiste: no insisto más hoy. Al final te propongo un específico.";
    } else if (ans.wasCorrect && ans.conf !== 2 && ans.conf !== 3 && (ctx.racha.get(t) || 0) === RACHA_CIERRE) {
      msg = RACHA_CIERRE + " seguidas sin dudar en este tema: lo dejo por hoy y paso a otra cosa.";
    }
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
    try { chipOrigen(); } catch (e) { console.warn("entrenador", e); }
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
    var comp = completaDe(sess), falladas = sess.questions.filter(function (q) { var a = sess.answers[q.id]; return a && !a.wasCorrect; }).map(function (q) { return q.id; });
    caja.innerHTML = finCompleta(sess, comp, falladas) + (comp && comp.ronda ? "" : resumen(sess));
    caja.onclick = function (ev) {
      var b = ev.target && ev.target.closest ? ev.target.closest("button") : null;
      if (!b) return;
      if (b.hasAttribute("data-esp")) especifico(b.getAttribute("data-esp"));
      else if (b.hasAttribute("data-ronda")) rondaFinal(falladas, +b.getAttribute("data-ronda"));
      else if (b.hasAttribute("data-seguir")) empezarCompleta(comp && comp.modo === "atrasado" ? "atrasado" : undefined);
      else if (b.hasAttribute("data-mas")) empezarCompleta("extra");
    };
  };

  // Cómo queda la sesión completa al terminar: seguir, ronda final o concluida
  function finCompleta(sess, comp, falladas) {
    if (!comp) return "";
    var h = '<div class="plan-brief" style="margin-bottom:8px">';
    var acabada = comp.ronda || (comp.pend && comp.pend.fin);
    if (!acabada) {
      var p = comp.pend || {}, f = [];
      if (p.nuevas) f.push(p.nuevas + " nuevas");
      if (p.venc) f.push(p.venc + " repasos vencidos");
      if (p.cons) f.push(p.cons + (p.cons === 1 ? " idea por consolidar" : " ideas por consolidar"));
      return h + "🏁 <b>Has parado la sesión completa antes de acabar</b>" + (f.length ? ": te faltan " + f.join(", ") : "") + '.<br><button data-seguir="1">▶️ Seguir con la sesión completa</button>' +
        (falladas.length ? ' <button data-ronda="1">🔁 Ronda con las ' + falladas.length + " que has fallado</button>" : "") + "</div>";
    }
    var mas = '<button data-mas="1">➕ Un poco más: ' + EXTRA + " nuevas (adelantas lo de mañana)</button>";
    if (falladas.length) return h + (comp.ronda ? "🔁 <b>Ronda " + comp.ronda + " hecha</b>: aún fallas " + falladas.length + "." : "🏁 <b>Lo que pedía el plan para hoy, hecho.</b> Falta cerrar las " + falladas.length + " que has fallado.") +
      '<br><button data-ronda="' + ((comp.ronda || 0) + 1) + '">🔁 Ronda final: las ' + falladas.length + " falladas, hasta acertarlas</button> " + mas + "</div>";
    try { localStorage.removeItem(K_COMP); } catch (e) {}
    return h + "✅ <b>" + (comp.modo === "extra" ? "Extra hecho" : "Sesión de hoy concluida") + "</b>: hecho todo lo que pedía el plan y acertado todo lo que habías fallado.<br>" + mas + "</div>";
  }

  var MOTIVOS = ["", "no lo sabías", "confundiste conceptos", "leíste mal el enunciado", "dudaste entre dos", "caíste en un «todas/ninguna»"];
  function resumen(sess) {
    var porTema = new Map(), motivos = [0, 0, 0, 0, 0, 0], seguroMal = 0, adivina = 0;
    sess.questions.forEach(function (q) {
      var a = sess.answers[q.id];
      if (!a) return;
      var tr = temaReal(q), t = porTema.get(tr) || { ok: 0, mal: 0 };
      if (a.wasCorrect) t.ok++; else t.mal++;
      porTema.set(tr, t);
      if (!a.wasCorrect && a.conf === 1) seguroMal++;
      if (a.wasCorrect && a.conf === 3) adivina++;
      var h = ultimo(State.data.qs[q.id]);
      if (!a.wasCorrect && h && h[5]) motivos[h[5]]++;
    });
    var li = [], deExamen = 0, ctxFin = reproducir(sess, sess.questions.length);
    var recom = ctxFin.flojos.slice();
    porTema.forEach(function (v, t) { if (recom.indexOf(t) < 0 && v.mal >= 2 && v.mal >= v.ok) recom.push(t); });
    sess.questions.forEach(function (q) {
      var a = sess.answers[q.id];
      if (a && !a.wasCorrect && origen(q).tipo === "examen") deExamen++;
    });
    if (deExamen) li.push("<b>" + deExamen + " de tus fallos " + (deExamen > 1 ? "eran preguntas" : "era una pregunta") + " que ya " + (deExamen > 1 ? "cayeron" : "cayó") + " en examen</b>: son lo primero que hay que cerrar.");
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
    var esp = "";
    if (recom.length) {
      esp = "<p><b>Te recomiendo un específico</b> de lo que no controlas todavía (las de la batería sobre ese tema: primero las falladas y las de examen):</p>" +
        recom.slice(0, 3).map(function (t) { return '<button data-esp="' + esc(t) + '">🎯 Específico · ' + esc(limpio(t)) + "</button>"; }).join("");
    }
    return "<b>🧠 Lo que ha visto el entrenador</b><ul>" + li.map(function (x) { return "<li>" + x + "</li>"; }).join("") + "</ul>" + esp;
  }

  var stats0 = App.updateHomeStats;
  App.updateHomeStats = function () {
    stats0.apply(this, arguments);
    try { pintarPortada(); } catch (e) { console.warn("entrenador", e); }
  };
  try { pintarPortada(); } catch (e) { console.warn("entrenador", e); }

  if (window.MPSync && typeof MPSync.usar === "function") {
    try { MPSync.usar({ clave: K_AMBITO, modo: "reciente" }); } catch (e) {}
  }
  // «Hacer lo de hoy» del plan de examen: sin preguntar, todo lo que entra en lo que se prepara
  // (el parcial elegido entero, o todo el temario si es el examen final)
  function empezarPlan() {
    var a = leerAmbito(), o = window.PlanExamen ? window.PlanExamen.objetivo() : "final";
    a.alcance = "todo";
    a.parciales = o === "p1" ? [1] : o === "p2" ? [2] : [1, 2];
    guardarAmbito(a);
    var caja = document.getElementById("coach-ambito");
    if (caja) caja.hidden = true;
    empezar();
  }
  // El plan de examen fija el parcial que se prepara
  function fijarParcial(n) {
    var a = leerAmbito();
    a.parciales = n === 1 || n === 2 ? [n] : [1, 2];
    guardarAmbito(a);
  }
  window.Entrenador = { ambito: leerAmbito, enAmbito: enAmbito, parcialDe: parcialDe, hayParciales: hayParciales, fijarParcial: fijarParcial, empezarPlan: empezarPlan, empezarCompleta: empezarCompleta, nuevasHoy: nuevasPendientesHoy, atraso: atrasoNuevas, temaDe: temaDe, temasDados: temasDados, abrir: abrirAmbito, origen: origen, familia: familia, especifico: especifico, estadoTema: estadoTema, temas: todosLosTemas, saber: saber, empezar: empezar };
})();
