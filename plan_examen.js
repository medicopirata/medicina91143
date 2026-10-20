/* Plan de examen: la estrategia global hasta el día del examen.
 *
 * El entrenador decide pregunta a pregunta dentro de una sesión; esto mira el
 * curso entero. Sabe cuántos días faltan, cuánto pesa cada tema, cuánto
 * dominas de cada uno y a qué ritmo vas, y con eso:
 *   · reparte lo que queda en semanas hasta el examen (cobertura,
 *     consolidación y repaso final),
 *   · dice qué toca hoy y si vas por delante o por detrás,
 *   · le pasa al entrenador cuánto vale cada pregunta y qué temas son los de
 *     esta semana, para que la sesión siga el plan,
 *   · recuerda lo que va pasando (una foto diaria de la preparación y las
 *     confusiones que ha visto la IA, con si siguen o ya están resueltas) y se
 *     lo da a la IA para que no empiece de cero cada vez.
 *
 * Cuánto vale cada pregunta depende de su origen y lo decide el usuario:
 * exámenes de otros años, lo que dan los profesores, lo deducido de sus
 * pistas, apuntes, entrenamiento… Se calcula todo al vuelo sobre
 * ALL_QUESTIONS, así que cargar apuntes nuevos no obliga a regenerar nada.
 *
 * Guarda en STORAGE_KEY + "_plan" (sincronizado entre dispositivos):
 *   pesos, fecha (si se cambia a mano), diario {día: foto}, confus [..],
 *   estrategia (la última revisión de la IA).
 *
 * Se carga después de entrenador.js y entrenador_ia.js.
 */
(function () {
  "use strict";
  if (typeof App === "undefined" || typeof State === "undefined" || typeof ALL_QUESTIONS === "undefined") return;

  var CLAVE = STORAGE_KEY.replace(/_study_v\d+$/, "");
  var K_PLAN = STORAGE_KEY + "_plan";
  var DIA = 86400000;

  // Primera convocatoria de 2027 (la bitácora deja las fechas buenas en mp_examenes)
  var FECHAS = { medint: "2027-01-15", genetica: "2027-01-20", fisio1: "2027-01-25", anat3: "2027-01-29",
                 histoesp2: "2027-02-01", fisio2: "2027-02-02", histo21: "2027-02-04" };

  // ------------------------------------------------------------ orígenes
  var ORIGENES = [
    { k: "examen",   nom: "📝 Exámenes de otros años",          sub: "preguntas que cayeron en una convocatoria",        def: 3 },
    { k: "repetida", nom: "🔁 Extra por cada examen en que se repite", sub: "si cayó en varios, suma esto por cada uno más", def: 0.75, extra: true },
    { k: "profesor", nom: "🎯 Las que dan los profesores",       sub: "dichas en clase, Kahoot, seminarios, campus, ⭐ imágenes que marcó", def: 2.5 },
    { k: "pistas",   nom: "📌 Sacadas de sus pistas",            sub: "construidas con lo que dijo que cae",             def: 2 },
    { k: "recop",    nom: "📚 Recopilaciones sin convocatoria",  sub: "probablemente de examen, sin confirmar",          def: 1.8 },
    { k: "clase",    nom: "📓 Resto de los apuntes de clase",    sub: "",                                                 def: 1.3 },
    { k: "entreno",  nom: "🏋️ Bancos de entrenamiento",          sub: "baterías por temas, atlas e imágenes",             def: 1 },
    { k: "refuerzo", nom: "🤖 Escritas por Claude",              sub: "refuerzo y atlas: no dichas por el profesor",      def: 0.6 },
    { k: "ia",       nom: "🧠 A tu medida (IA)",                 sub: "escritas para una confusión tuya",                def: 1.2 }
  ];
  var POR_K = {};
  ORIGENES.forEach(function (o) { POR_K[o.k] = o; });

  function tipoDe(q) {
    if (q.ia) return "ia";
    var e = q.exp || "", E = window.Entrenador, o = E ? E.origen(q) : { tipo: "entreno" };
    if (o.tipo === "examen") return "examen";
    if (o.tipo === "profesor" || o.tipo === "oficial" || /^(🎓 Dicha en clase|⭐ En clase)/.test(e)) return "profesor";
    if (/^📌 Deducida de sus pistas/.test(e)) return "pistas";
    if (o.tipo === "recop") return "recop";
    if (/^🤖/.test(e)) return "refuerzo";
    if (o.tipo === "clase") return "clase";
    return "entreno";
  }

  // ------------------------------------------------------------- almacén
  function leer() {
    var d = null;
    try { d = JSON.parse(localStorage.getItem(K_PLAN) || "null"); } catch (e) {}
    d = d || {};
    if (!d.pesos) d.pesos = {};
    ORIGENES.forEach(function (o) { if (typeof d.pesos[o.k] !== "number") d.pesos[o.k] = o.def; });
    if (!d.diario) d.diario = {};
    if (!Array.isArray(d.confus)) d.confus = [];
    return d;
  }
  var _d = leer();
  function guardar() {
    var dias = Object.keys(_d.diario).sort();
    if (dias.length > 240) dias.slice(0, dias.length - 240).forEach(function (k) { delete _d.diario[k]; });
    if (_d.confus.length > 60) _d.confus = _d.confus.slice(-60);
    try { localStorage.setItem(K_PLAN, JSON.stringify(_d)); } catch (e) {}
  }

  // ------------------------------------------------------------- fecha
  function fechaExamen() {
    if (_d.fecha) return _d.fecha;
    try {
      var ex = JSON.parse(localStorage.getItem("mp_examenes") || "{}")[STORAGE_KEY];
      if (ex && ex.convocatoria === "junio" && ex.junio) return ex.junio;
      if (ex && ex.fecha) return ex.fecha;
    } catch (e) {}
    return FECHAS[CLAVE] || null;
  }
  function hoy0() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
  function diasHasta(iso) { return iso ? Math.round((new Date(iso + "T00:00:00") - hoy0()) / DIA) : null; }
  var MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  function fmt(d) { return d.getDate() + " " + MESES[d.getMonth()]; }
  function fmtIso(iso) { return fmt(new Date(iso + "T00:00:00")); }
  function claveDia(d) { var x = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return x.toISOString().slice(0, 10); }

  // ------------------------------------------------------------- pesos
  var _w = null, _wN = 0, _wV = "";
  function firmaPesos() { return JSON.stringify(_d.pesos); }
  function pesos() {
    var v = firmaPesos();
    if (_w && _wN === ALL_QUESTIONS.length && _wV === v) return _w;
    _w = new Map(); _wN = ALL_QUESTIONS.length; _wV = v;
    var E = window.Entrenador;
    ALL_QUESTIONS.forEach(function (q) {
      var t = tipoDe(q), w = _d.pesos[t];
      if (t === "examen" && w > 0) {
        var veces = E ? (E.origen(q).veces || 1) : 1;
        w += Math.min(3, _d.pesos.repetida * (veces - 1));
      }
      _w.set(q.id, { tipo: t, w: Math.max(0, w) });
    });
    return _w;
  }
  function peso(q) { var x = pesos().get(q.id); return x ? x.w : 1; }
  // Para el entrenador: cuánto más (o menos) que una pregunta normal de entrenamiento
  function factor(q) { var w = peso(q); return w <= 0 ? 0 : 0.55 + 0.45 * w; }

  // ------------------------------------------------------------- medir
  function temaReal(q) { var E = window.Entrenador; return (E && E.temaDe(q)) || q.topicBase; }
  function saber(q) {
    var E = window.Entrenador, s = (State.data.qs || {})[q.id];
    return E ? E.saber(s) : (s && s.a ? (s.c / s.a) : null);
  }

  // Bancos que mezclan temas: cuentan en la preparación, pero el plan prefiere repartir por temas de verdad
  var MEZCLA = /bater[ií]a|recopilaci|banco general|simulacro|mezcla|miscel/i;

  // Lo de cada tema y el total, todo ponderado por el peso de cada pregunta
  function medir() {
    var E = window.Entrenador, dados = E ? E.temasDados() : new Set(), W = pesos();
    var temas = new Map(), tot = { w: 0, sab: 0, vistoW: 0, n: 0, sinVer: 0, sinVerImp: 0, exN: 0, exDom: 0, impN: 0, impDom: 0 };
    ALL_QUESTIONS.forEach(function (q) {
      var x = W.get(q.id); if (!x || x.w <= 0) return;
      if (typeof effCorrectOrig === "function" && effCorrectOrig(q) == null) return;
      var td = E ? E.temaDe(q) : q.topicBase, t = td || q.topicBase, k = saber(q), imp = x.w >= 2;
      var m = temas.get(t);
      if (!m) { m = { tema: t, w: 0, sab: 0, n: 0, sinVer: 0, sinVerImp: 0, fallos: 0, exFall: 0, dado: dados.has(t) || /^(Apuntes:|⭐)/.test(t), mezcla: !td, tipos: {} }; temas.set(t, m); }
      m.w += x.w; m.n++; m.tipos[x.tipo] = (m.tipos[x.tipo] || 0) + 1;
      tot.w += x.w; tot.n++;
      if (k == null) { m.sinVer++; tot.sinVer++; if (imp) { m.sinVerImp++; tot.sinVerImp++; } }
      else {
        m.sab += x.w * k; tot.sab += x.w * k; tot.vistoW += x.w;
        if (k === 0) { m.fallos++; if (x.tipo === "examen") m.exFall++; }
      }
      if (x.tipo === "examen") { tot.exN++; if (k != null && k >= 0.6) tot.exDom++; }
      if (imp) { tot.impN++; if (k != null && k >= 0.6) tot.impDom++; }
    });
    temas.forEach(function (m) {
      m.dominio = m.w ? m.sab / m.w : 0;
      // Lo que queda por ganar en el tema; lo ya dado en clase va antes
      m.prio = (m.w - m.sab) * (m.dado ? 1.5 : 1) * (m.mezcla || MEZCLA.test(m.tema) ? 0.4 : 1);
    });
    tot.prep = tot.w ? tot.sab / tot.w : 0;
    tot.cob = tot.w ? tot.vistoW / tot.w : 0;
    return { temas: temas, tot: tot };
  }

  // Nuevas al día que llevas de verdad: preguntas cuyo primer intento cae en los últimos 14 días
  function ritmo() {
    var qs = State.data.qs || {}, desde = Date.now() / 1000 - 14 * 86400, nuevas = 0;
    for (var id in qs) {
      var h = qs[id] && qs[id].h;
      if (Array.isArray(h) && h.length && h[0][0] >= desde && (qs[id].a || 0) <= h.length) nuevas++;
    }
    var daily = State.data.daily || {}, resp = 0, dias = 0, d = hoy0();
    for (var i = 0; i < 14; i++) {
      var k = claveDia(new Date(d.getTime() - i * DIA)), n = (daily[k] || {}).n || 0;
      resp += n; if (n) dias++;
    }
    return { nuevasDia: nuevas / 14, respDia: resp / 14, diasActivos: dias };
  }
  function vencidasHoy() {
    var n = 0, qs = State.data.qs || {};
    ALL_QUESTIONS.forEach(function (q) { if (typeof isDue === "function" && isDue(qs[q.id]) && peso(q) > 0) n++; });
    return n;
  }

  // ------------------------------------------------------------- el plan
  // Fases según los días que quedan: primero verlo todo, luego afianzar, al final repaso de alto rendimiento
  var FASES = {
    cobertura:     { nom: "Fase 1 · Cobertura", txt: "Ver todo lo que pesa al menos una vez, empezando por lo que cae en examen y lo dado en clase. Los repasos, al día.", cuota: { nuevo: 0.5, repaso: 0.32, fallo: 0.18 } },
    consolidacion: { nom: "Fase 2 · Consolidación", txt: "Ya casi nada nuevo: cerrar los temas flojos, los fallos y las acertadas con dudas. Un simulacro por semana.", cuota: { nuevo: 0.22, repaso: 0.46, fallo: 0.32 } },
    final:         { nom: "Fase 3 · Repaso final", txt: "Solo lo que más puntúa: preguntas de examen falladas o dudadas, fallos yendo seguro y simulacros cronometrados. Nada nuevo los dos últimos días.", cuota: { nuevo: 0.08, repaso: 0.5, fallo: 0.42 } }
  };
  var CONSOLIDA = 21, FINAL = 7;
  function faseDe(dias) { return dias > CONSOLIDA ? "cobertura" : dias > FINAL ? "consolidacion" : "final"; }

  function plan() {
    var iso = fechaExamen(), dias = diasHasta(iso);
    var med = medir(), r = ritmo(), out = { fecha: iso, dias: dias, med: med, ritmo: r, semanas: [] };
    if (dias == null || dias < 0) return out;
    out.fase = faseDe(dias);
    var diasCob = Math.max(1, dias - CONSOLIDA);
    out.necAll = Math.ceil(med.tot.sinVer / diasCob);
    out.necImp = Math.ceil(med.tot.sinVerImp / diasCob);
    // Objetivo diario de nuevas: verlo todo si es razonable; si no, como mínimo lo importante
    out.objNuevas = out.fase === "cobertura" ? Math.min(out.necAll, Math.max(out.necImp, 60)) : out.fase === "consolidacion" ? Math.min(out.necImp, 25) : 0;
    out.vencidas = vencidasHoy();
    out.vaBien = r.nuevasDia >= out.objNuevas * 0.9;

    // Reparto por semanas: los temas por lo que queda por ganar, llenando la capacidad de cada semana
    // Primero lo ya dado en clase, después el resto del temario; los bancos que mezclan temas, al final
    function grupo(m) { return m.mezcla || MEZCLA.test(m.tema) ? 2 : m.dado ? 0 : 1; }
    var orden = Array.from(med.temas.values()).filter(function (m) { return m.sinVer > 0; })
      .sort(function (a, b) { return grupo(a) - grupo(b) || b.prio - a.prio; });
    var pend = orden.map(function (m) { return { tema: m.tema, quedan: m.sinVer, m: m }; });
    var inicio = hoy0(), examen = new Date(iso + "T00:00:00");
    var flojos = Array.from(med.temas.values()).filter(function (m) { return m.n >= 4 && m.n - m.sinVer >= 4 && m.dominio < 0.55; })
      .sort(function (a, b) { return (b.w - b.sab) - (a.w - a.sab); });
    for (var ini = new Date(inicio); ini < examen; ini = new Date(ini.getTime() + 7 * DIA)) {
      var fin = new Date(Math.min(ini.getTime() + 6 * DIA, examen.getTime() - DIA));
      var dIni = Math.round((examen - ini) / DIA), fase = faseDe(dIni);
      var s = { ini: claveDia(ini), fin: claveDia(fin), txtFechas: fmt(ini) + (fin > ini ? "–" + fmt(fin) : ""), fase: fase, temas: [], nuevas: 0 };
      var diasSem = Math.round((fin - ini) / DIA) + 1;
      var diasCobSem = 0;
      for (var j = 0; j < diasSem; j++) if (faseDe(dIni - j) === "cobertura") diasCobSem++;
      var cap = diasCobSem * Math.max(out.objNuevas, 1);
      while (cap > 0 && pend.length) {
        var p = pend[0], toma = Math.min(p.quedan, cap);
        s.temas.push({ tema: p.tema, n: toma });
        s.nuevas += toma; p.quedan -= toma; cap -= toma;
        if (!p.quedan) pend.shift();
      }
      if (fase === "consolidacion") s.foco = flojos.slice(0, 5).map(function (m) { return m.tema; });
      out.semanas.push(s);
    }
    out.sinPlan = pend.reduce(function (a, p) { return a + p.quedan; }, 0);
    out.flojos = flojos;
    out.prioridades = Array.from(med.temas.values()).sort(function (a, b) { return b.prio - a.prio; }).slice(0, 10);
    return out;
  }

  var _plan = null, _planT = 0;
  function planCache() {
    if (!_plan || Date.now() - _planT > 15000) { _plan = plan(); _planT = Date.now(); }
    return _plan;
  }
  function invalidar() { _plan = null; }

  // Temas que el plan pone esta semana (el entrenador les da preferencia a sus nuevas)
  function temasSemana() {
    var p = planCache(), set = new Set();
    var s = p.semanas && p.semanas[0];
    if (s) s.temas.forEach(function (t) { set.add(t.tema); });
    var e = _d.estrategia, k = claveDia(hoy0());
    if (e && Array.isArray(e.semanas)) e.semanas.forEach(function (w) {
      if (w && w.desde <= k && k <= w.hasta && Array.isArray(w.temas)) w.temas.forEach(function (t) { if (BY_TOPIC.has(t)) set.add(t); });
    });
    return set;
  }
  function cuota() { var p = planCache(); return p.fase ? FASES[p.fase].cuota : null; }

  // ------------------------------------------------------------- memoria
  // Una foto por día: preparación, cobertura y preguntas de examen dominadas
  function foto() {
    var m = medir().tot, k = claveDia(hoy0());
    var f = { p: Math.round(m.prep * 1000) / 10, c: Math.round(m.cob * 1000) / 10, ex: m.exDom, exN: m.exN, imp: m.impDom, impN: m.impN };
    if (JSON.stringify(f) !== JSON.stringify(_d.diario[k])) { _d.diario[k] = f; guardar(); }   // solo si cambia: no subir a la nube en cada pintada
    return f;
  }
  function fotoHace(n) {
    var k = claveDia(new Date(hoy0().getTime() - n * DIA)), dias = Object.keys(_d.diario).sort(), r = null;
    for (var i = 0; i < dias.length; i++) if (dias[i] <= k) r = _d.diario[dias[i]];
    return r;
  }

  // Confusiones que ha visto la IA, con las preguntas que las delataron
  function recordar(diag, ids) {
    if (!Array.isArray(diag)) return;
    var t = Date.now();
    diag.forEach(function (x) {
      if (!x || !x.idea) return;
      _d.confus.push({ t: t, idea: String(x.idea).slice(0, 300), regla: String(x.regla || "").slice(0, 300), pr: String(x.prioridad || ""), ids: (ids || []).slice(0, 30) });
    });
    guardar();
  }
  // ¿Sigue? Mira lo que ha respondido de esas preguntas desde que se diagnosticó
  function estadoConfusion(c) {
    var qs = State.data.qs || {}, ok = 0, mal = 0, desde = c.t / 1000;
    (c.ids || []).forEach(function (id) {
      var h = qs[id] && qs[id].h;
      if (!Array.isArray(h)) return;
      h.forEach(function (x) { if (x[0] > desde) { if (x[1] === 1 && x[3] !== 3) ok++; else mal++; } });
    });
    if (mal) return { e: "sigue", txt: "sigue: " + mal + " fallo" + (mal > 1 ? "s" : "") + " desde entonces" };
    if (ok >= 2) return { e: "resuelta", txt: "resuelta: " + ok + " aciertos desde entonces" };
    return { e: "pendiente", txt: "sin comprobar todavía" };
  }

  // Lo que la IA necesita saber de él para no empezar de cero cada vez
  function contexto() {
    var p = planCache(), t = p.med.tot, h7 = fotoHace(7), h30 = fotoHace(30), out = [];
    if (p.fase) {
      out.push("PLAN DE EXAMEN: examen el " + fmtIso(p.fecha) + " (faltan " + p.dias + " días) · " + FASES[p.fase].nom + ".");
      out.push("Preparación ponderada " + Math.round(t.prep * 100) + " %" + (h7 ? " (hace 7 días " + Math.round(h7.p) + " %)" : "") + (h30 ? " (hace 30 días " + Math.round(h30.p) + " %)" : "") +
        " · cobertura " + Math.round(t.cob * 100) + " % · preguntas de examen dominadas " + t.exDom + " de " + t.exN + ".");
      out.push("Ritmo: " + Math.round(p.ritmo.nuevasDia) + " nuevas/día en las dos últimas semanas (" + p.ritmo.diasActivos + " de 14 días con estudio); el plan pide " + p.objNuevas + "/día.");
      var s = p.semanas[0];
      if (s && s.temas.length) out.push("Temas del plan para esta semana: " + s.temas.map(function (x) { return x.tema; }).join("; ") + ".");
    }
    out.push("PESOS QUE ÉL HA ELEGIDO para cada origen de pregunta: " + ORIGENES.map(function (o) { return o.nom.replace(/^\S+\s/, "") + " " + _d.pesos[o.k]; }).join(" · ") + ".");
    var conf = _d.confus.slice(-15).map(function (c) {
      var st = estadoConfusion(c);
      return "· [" + new Date(c.t).toLocaleDateString("es") + ", " + st.txt + "] " + c.idea + (c.regla ? " — regla: " + c.regla : "");
    });
    if (conf.length) out.push("CONFUSIONES QUE YA DIAGNOSTICASTE EN SESIONES ANTERIORES (con lo que ha pasado después):\n" + conf.join("\n"));
    var e = _d.estrategia;
    if (e && e.resumen) out.push("TU ÚLTIMA ESTRATEGIA (" + new Date(e.t).toLocaleDateString("es") + "): " + e.resumen);
    return out.join("\n");
  }

  // ------------------------------------------------------- estrategia con IA
  var SISTEMA_ESTRATEGIA = [
    "Eres el entrenador personal de Santiago, estudiante de 2.º de Medicina (Universidad de Cádiz). Prepara un examen tipo test y quiere la nota más alta posible. Ahora no corriges una sesión: revisas su ESTRATEGIA GLOBAL hasta el examen.",
    "RECIBES: los días que faltan y la fase; su preparación ponderada y cómo ha evolucionado; su ritmo real; la lista de TEMAS con lo que pesa cada uno (según el origen de sus preguntas y los pesos que él ha elegido), su dominio, lo que le queda por ver y sus fallos (sobre todo en preguntas que cayeron en examen); el reparto por semanas que propone la plataforma; las confusiones diagnosticadas antes y si siguen; y las pistas de examen generales de sus apuntes.",
    "QUÉ HACES. 1) Un diagnóstico de dónde está respecto al examen, con números, en dos o tres frases. 2) Un plan por semanas desde hoy hasta el examen: para cada semana, el objetivo concreto, los temas (nombres EXACTOS de la lista) y cuántas preguntas nuevas y de repaso al día. Respeta las fases: cobertura primero, consolidación en las tres últimas semanas, repaso final en la última; ajusta el reparto de la plataforma si ves algo mejor (p. ej. adelantar lo que más cae en examen, juntar temas que se confunden, dejar margen para el temario que aún no se ha dado). 3) Las prioridades: los temas donde más nota se juega y por qué. 4) Alertas: lo que pone en riesgo la nota (ritmo insuficiente, temas de mucho peso sin empezar, confusiones que no se resuelven). 5) Qué hacer hoy, en una o dos frases.",
    "REGLAS. Sé concreto y realista con su ritmo; si no llega a todo, di qué sacrificar (lo de menos peso) en vez de pedirle lo imposible. Nada de ánimos ni generalidades. Todo en español.",
    'FORMATO: responde SOLO con JSON: {"resumen":"","semanas":[{"desde":"AAAA-MM-DD","hasta":"AAAA-MM-DD","objetivo":"","temas":["nombre exacto"],"nuevas_dia":0,"repasos_dia":0}],"prioridades":[{"tema":"nombre exacto","por_que":""}],"alertas":[""],"hoy":""}'
  ].join("\n\n");

  function revisarConIA() {
    var ia = window.EntrenadorIA;
    if (!ia || !ia.conectada() || typeof ia.llamar !== "function") return Promise.reject(new Error("La IA no está conectada: pon la clave en el cuadro del entrenador con IA."));
    var p = plan(), t = p.med.tot;
    if (!p.fase) return Promise.reject(new Error("Pon antes la fecha del examen."));
    var filas = Array.from(p.med.temas.values()).sort(function (a, b) { return b.w - a.w; }).slice(0, 60).map(function (m) {
      return "· " + m.tema + " | peso " + Math.round(m.w * 100 / t.w * 10) / 10 + " % | dominio " + Math.round(m.dominio * 100) + " % | sin ver " + m.sinVer + "/" + m.n +
        " | falladas " + m.fallos + (m.exFall ? " (" + m.exFall + " de examen)" : "") + (m.dado ? " | dado en clase" : " | aún sin apuntes de clase");
    });
    var sem = p.semanas.map(function (s) {
      return "· " + s.ini + " a " + s.fin + " (" + FASES[s.fase].nom + "): " + (s.temas.length ? s.temas.map(function (x) { return x.tema + " (" + x.n + ")"; }).join("; ") : (s.foco ? "repaso de flojos: " + s.foco.join("; ") : "repaso"));
    });
    var daily = State.data.daily || {}, hist = [];
    for (var i = 20; i >= 0; i--) { var k = claveDia(new Date(hoy0().getTime() - i * DIA)), x = daily[k] || {}; hist.push(k.slice(5) + ": " + (x.n || 0) + (x.n ? " (" + Math.round((x.ok || 0) * 100 / x.n) + " % bien)" : "")); }
    return (ia.apuntes ? ia.apuntes() : Promise.resolve(null)).then(function (ap) {
      var pistas = ia.pistasGenerales ? ia.pistasGenerales(ap, 7000) : "";
      var usuario = "ASIGNATURA: " + document.title + "\nHOY: " + claveDia(hoy0()) + "\n\n" + contexto() +
        "\n\nRESPUESTAS POR DÍA (últimos 21 días):\n" + hist.join(" · ") +
        "\n\nTEMAS (ordenados por peso):\n" + filas.join("\n") +
        "\n\nREPARTO POR SEMANAS QUE PROPONE LA PLATAFORMA:\n" + sem.join("\n") +
        (p.sinPlan ? "\n(Con el ritmo del plan quedan " + p.sinPlan + " preguntas de poco peso sin ver antes de la consolidación.)" : "") +
        (pistas ? "\n\nPISTAS DE EXAMEN DE SUS APUNTES:\n" + pistas : "");
      return ia.llamar(SISTEMA_ESTRATEGIA, usuario);
    }).then(function (r) {
      var txt = r.txt, a = txt.indexOf("{"), b = txt.lastIndexOf("}");
      if (a < 0 || b <= a) throw new Error("La IA no ha devuelto una estrategia legible.");
      var e = JSON.parse(txt.slice(a, b + 1));
      e.t = Date.now(); e.fase = p.fase;
      _d.estrategia = e; guardar(); invalidar();
      return e;
    });
  }
  function estrategiaVieja() {
    var e = _d.estrategia, p = planCache();
    return !e || Date.now() - e.t > 7 * DIA || (p.fase && e.fase !== p.fase);
  }

  // ------------------------------------------------------------- interfaz
  var css = document.createElement("style");
  css.textContent =
    "#plan-ex{margin:14px 0 0;border:1px solid #38bdf8;border-radius:12px;background:var(--surface);padding:12px 16px;font-size:.86rem}" +
    "#plan-ex>summary{cursor:pointer;font-weight:700;font-size:.95rem}#plan-ex .sub{color:var(--text2);font-size:.8rem}" +
    "#plan-ex .kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin:10px 0}" +
    "#plan-ex .kpi{background:var(--surface2);border-radius:8px;padding:8px 10px}#plan-ex .kpi b{display:block;font-size:1.25rem;color:var(--text)}#plan-ex .kpi span{font-size:.74rem;color:var(--text2)}" +
    "#plan-ex h4{margin:14px 0 6px;font-size:.82rem;color:var(--text2);font-weight:600;text-transform:uppercase;letter-spacing:.03em}" +
    "#plan-ex .sem{border-top:1px solid var(--border);padding:6px 0;display:flex;gap:10px}#plan-ex .sem .f{width:92px;flex:none;color:var(--text2);font-size:.78rem}#plan-ex .sem .c{flex:1;min-width:0}" +
    "#plan-ex .sem.ahora{background:rgba(56,189,248,.08);border-radius:6px;padding-left:6px}" +
    "#plan-ex .tag{display:inline-block;font-size:.7rem;padding:1px 6px;border-radius:9px;margin-right:4px;background:var(--surface2);color:var(--text2)}" +
    "#plan-ex .tag.cobertura{color:#38bdf8}#plan-ex .tag.consolidacion{color:#fbbf24}#plan-ex .tag.final{color:#f87171}" +
    "#plan-ex .peso{display:flex;gap:8px;align-items:center;padding:4px 0;border-top:1px solid var(--border)}#plan-ex .peso .n{flex:1;min-width:0}#plan-ex .peso input{width:110px}#plan-ex .peso .v{width:34px;text-align:right;font-variant-numeric:tabular-nums}" +
    "#plan-ex button{background:#0284c7;color:#fff;border:0;border-radius:6px;padding:6px 12px;font-size:.84rem;cursor:pointer;margin:4px 6px 0 0}#plan-ex button.sec{background:none;color:var(--text2);border:1px solid var(--border)}" +
    "#plan-ex .pr{display:flex;gap:8px;padding:4px 0;border-top:1px solid var(--border);cursor:pointer}#plan-ex .pr:hover{color:var(--accent)}#plan-ex .pr .n{flex:1;min-width:0}#plan-ex .pr .x{color:var(--text2);font-size:.76rem;white-space:nowrap}" +
    "#plan-ex .alerta{color:#f87171}#plan-ex li{margin:3px 0 3px 18px}#plan-ex input[type=date]{background:var(--surface2);color:var(--text);border:1px solid var(--border);border-radius:6px;padding:3px 6px}" +
    ".plan-brief{border-left:3px solid #38bdf8;background:var(--surface2);border-radius:0 8px 8px 0;padding:8px 10px;margin:0 0 10px;font-size:.84rem}";
  document.head.appendChild(css);

  function pct(x) { return Math.round(x * 100) + " %"; }
  function flecha(ahora, antes) {
    if (antes == null) return "";
    var d = Math.round((ahora - antes) * 10) / 10;
    return d > 0 ? ' <span style="color:#34d399">▲ ' + d + "</span>" : d < 0 ? ' <span style="color:#f87171">▼ ' + (-d) + "</span>" : ' <span class="sub">=</span>';
  }

  function sparkline() {
    var dias = Object.keys(_d.diario).sort().slice(-60);
    if (dias.length < 2) return "";
    var v = dias.map(function (k) { return _d.diario[k].p; }), max = Math.max.apply(null, v.concat([10])), W = 260, H = 40;
    var pts = v.map(function (y, i) { return (i * W / (v.length - 1)).toFixed(1) + "," + (H - 2 - y / max * (H - 4)).toFixed(1); }).join(" ");
    return '<svg viewBox="0 0 ' + W + " " + H + '" width="100%" height="' + H + '" preserveAspectRatio="none" style="max-width:360px;display:block;margin-top:4px"><polyline fill="none" stroke="#38bdf8" stroke-width="2" points="' + pts + '"/></svg>' +
      '<span class="sub">Preparación ponderada día a día desde el ' + fmtIso(dias[0]) + "</span>";
  }

  // Lo que se enseña antes de empezar una sesión del entrenador y arriba de la primera pregunta
  function brief() {
    var p = planCache();
    if (!p.fase) return "";
    var s = p.semanas[0], t = p.med.tot;
    var temas = s && s.temas.length ? s.temas.slice(0, 3).map(function (x) { return "«" + esc(x.tema) + "»"; }).join(", ") : "";
    var e = _d.estrategia;
    return '<div class="plan-brief">📅 <b>Plan de examen</b> · faltan <b>' + p.dias + " días</b> · " + FASES[p.fase].nom +
      " · preparación " + pct(t.prep) + "<br>Hoy toca: " + (p.objNuevas ? "<b>" + p.objNuevas + " nuevas</b>" + (temas ? " (" + temas + ")" : "") + " y " : "") +
      "<b>" + p.vencidas + " repasos</b>." + (p.fase === "cobertura" ? (p.vaBien ? " Vas al ritmo." : " Vas por detrás: llevas " + Math.round(p.ritmo.nuevasDia) + " nuevas al día.") : "") +
      (e && e.hoy && !estrategiaVieja() ? '<br><span class="sub">🧠 La IA: ' + esc(e.hoy) + "</span>" : "") + "</div>";
  }

  function pintar() {
    var rejilla = document.querySelector(".mode-grid");
    if (!rejilla) return;
    var caja = document.getElementById("plan-ex");
    if (!caja) {
      caja = document.createElement("details");
      caja.id = "plan-ex";
      try { caja.open = localStorage.getItem(K_PLAN + "_abierto") !== "0"; } catch (e) { caja.open = true; }
      caja.addEventListener("toggle", function () { try { localStorage.setItem(K_PLAN + "_abierto", caja.open ? "1" : "0"); } catch (e) {} });
      rejilla.parentNode.insertBefore(caja, rejilla.nextSibling);
    }
    invalidar();
    var p = planCache(), t = p.med.tot, f = foto(), h7 = fotoHace(7);
    var h = "<summary>📅 Mi plan de examen" + (p.fase ? " · faltan " + p.dias + " días · " + FASES[p.fase].nom : "") + "</summary>";
    h += '<p class="sub" style="margin-top:6px">Examen: ' + (p.fecha ? "<b>" + fmtIso(p.fecha) + "</b>" : "sin fecha") +
      ' · <label>cambiar <input type="date" id="plan-fecha" value="' + (p.fecha || "") + '"></label>' + (_d.fecha ? ' <a href="#" id="plan-fecha-x">usar la de la bitácora</a>' : "") + "</p>";
    if (!p.fase) { caja.innerHTML = h + "<p>Pon la fecha del examen para que pueda planificar.</p>"; enganchar(caja); return; }
    h += '<div class="kpis">' +
      '<div class="kpi"><b>' + pct(t.prep) + flecha(f.p, h7 && h7.p) + '</b><span>preparación ponderada' + (h7 ? " (vs. hace 7 días)" : "") + "</span></div>" +
      '<div class="kpi"><b>' + t.exDom + " / " + t.exN + '</b><span>preguntas de examen dominadas</span></div>' +
      '<div class="kpi"><b>' + t.impDom + " / " + t.impN + '</b><span>importantes dominadas (examen, profesores, pistas)</span></div>' +
      '<div class="kpi"><b>' + pct(t.cob) + '</b><span>cobertura ponderada</span></div>' +
      '<div class="kpi"><b>' + Math.round(p.ritmo.nuevasDia) + " / " + p.objNuevas + '</b><span>nuevas al día: llevas / pide el plan</span></div>' +
      "</div>" + sparkline();
    h += "<p><b>" + FASES[p.fase].nom + ".</b> " + FASES[p.fase].txt + "</p>";
    h += "<p>Hoy: " + (p.objNuevas ? "<b>" + p.objNuevas + " nuevas</b> y " : "") + "<b>" + p.vencidas + " repasos</b>. " +
      (p.fase === "cobertura" ? (p.vaBien ? "Vas al ritmo que pide el plan." : '<span class="alerta">Vas por detrás:</span> para ver todo lo importante antes de la consolidación hacen falta ' + p.necImp + " nuevas al día; para verlo todo, " + p.necAll + ".") : "") +
      " El entrenador ya sigue este plan: da prioridad a los temas de la semana y a lo que más pesa.</p>";

    // Estrategia de la IA
    var e = _d.estrategia;
    h += "<h4>🧠 Estrategia de la IA</h4>";
    if (e) {
      h += "<p>" + esc(e.resumen || "") + ' <span class="sub">(' + new Date(e.t).toLocaleDateString("es") + (estrategiaVieja() ? ", conviene revisarla" : "") + ")</span></p>";
      if (e.hoy) h += "<p><b>Hoy:</b> " + esc(e.hoy) + "</p>";
      if (Array.isArray(e.alertas) && e.alertas.length) h += "<ul>" + e.alertas.map(function (a) { return '<li class="alerta">' + esc(a) + "</li>"; }).join("") + "</ul>";
      if (Array.isArray(e.prioridades) && e.prioridades.length) h += "<ul>" + e.prioridades.slice(0, 6).map(function (x) { return "<li><b>" + esc(x.tema || "") + "</b> — " + esc(x.por_que || "") + "</li>"; }).join("") + "</ul>";
    } else {
      h += '<p class="sub">Todavía no la ha revisado. ' + (window.EntrenadorIA && window.EntrenadorIA.conectada() ? "Se hace sola al acabar una sesión del entrenador, o pulsa el botón." : "Conecta la IA (cuadro del entrenador con IA) para que la revise.") + "</p>";
    }
    h += '<button id="plan-ia">' + (e ? "Revisar la estrategia con la IA" : "Pedir a la IA una estrategia") + '</button><span id="plan-ia-est" class="sub"></span>';

    // Semanas
    var semIA = e && Array.isArray(e.semanas) ? e.semanas : [];
    h += "<h4>Semana a semana</h4>";
    h += p.semanas.map(function (s, i) {
      var w = semIA.filter(function (x) { return x && x.desde <= s.fin && x.hasta >= s.ini; })[0];
      var cont = w && w.objetivo ? "<b>" + esc(w.objetivo) + "</b>" + (Array.isArray(w.temas) && w.temas.length ? '<br><span class="sub">' + w.temas.map(esc).join(" · ") + "</span>" : "") +
        (w.nuevas_dia || w.repasos_dia ? '<br><span class="sub">' + (w.nuevas_dia || 0) + " nuevas y " + (w.repasos_dia || 0) + " repasos al día</span>" : "") :
        s.temas.length ? "Nuevas: " + s.temas.slice(0, 6).map(function (x) { return esc(x.tema) + ' <span class="sub">(' + x.n + ")</span>"; }).join(" · ") + (s.temas.length > 6 ? " y " + (s.temas.length - 6) + " temas más" : "") :
        s.fase === "consolidacion" ? "Cerrar lo flojo" + (s.foco && s.foco.length ? ": " + s.foco.map(esc).join(" · ") : "") + ". Simulacro el fin de semana." :
        s.fase === "final" ? "Preguntas de examen falladas o dudadas, fallos yendo seguro, simulacros cronometrados. Los dos últimos días, solo repaso." : "Repasos y lo que se haya dado nuevo en clase.";
      return '<div class="sem' + (i === 0 ? " ahora" : "") + '"><div class="f">' + s.txtFechas + '<br><span class="tag ' + s.fase + '">' + FASES[s.fase].nom.split(" · ")[1] + "</span></div><div class=\"c\">" + cont + "</div></div>";
    }).join("");
    if (p.sinPlan) h += '<p class="sub">Al ritmo del plan, ' + p.sinPlan + " preguntas de poco peso se quedan sin ver antes de la consolidación. Si subes el ritmo, entran.</p>";

    // Prioridades
    h += "<h4>Dónde más nota te juegas</h4>";
    h += p.prioridades.map(function (m) {
      return '<div class="pr" data-tema="' + esc(m.tema) + '"><span class="n">' + esc(m.tema) + '</span><span class="x">' + Math.round(m.w * 1000 / t.w) / 10 + " % del peso · dominio " + pct(m.dominio) +
        (m.sinVer ? " · " + m.sinVer + " sin ver" : "") + (m.exFall ? " · " + m.exFall + " de examen falladas" : "") + "</span></div>";
    }).join("");

    // Confusiones
    if (_d.confus.length) {
      var abiertas = _d.confus.slice().reverse().map(function (c) { return [c, estadoConfusion(c)]; }).filter(function (x) { return x[1].e !== "resuelta"; }).slice(0, 8);
      var resueltas = _d.confus.filter(function (c) { return estadoConfusion(c).e === "resuelta"; }).length;
      h += "<h4>Lo que el entrenador recuerda de ti</h4>";
      h += abiertas.length ? "<ul>" + abiertas.map(function (x) { return "<li><b>" + esc(x[0].idea) + '</b> <span class="sub">(' + new Date(x[0].t).toLocaleDateString("es") + ", " + x[1].txt + ")</span>" + (x[0].regla ? '<br><span class="sub">Regla: ' + esc(x[0].regla) + "</span>" : "") + "</li>"; }).join("") + "</ul>" : "<p>Ninguna confusión abierta.</p>";
      if (resueltas) h += '<p class="sub">' + resueltas + " confusiones ya resueltas.</p>";
    }

    // Pesos
    var W = pesos(), cuenta = {};
    W.forEach(function (x) { cuenta[x.tipo] = (cuenta[x.tipo] || 0) + 1; });
    h += "<details style=\"margin-top:12px\"><summary style=\"cursor:pointer;font-weight:600\">⚖️ Qué pesa más para ti</summary>" +
      '<p class="sub">Cuánto vale cada pregunta según de dónde sale. Mueve el valor y el plan y el entrenador se reajustan. Con 0, ese tipo de pregunta no entra en el plan ni en el entrenador.</p>' +
      ORIGENES.map(function (o) {
        return '<div class="peso"><span class="n">' + o.nom + (o.extra ? "" : ' <span class="sub">(' + (cuenta[o.k] || 0).toLocaleString("es") + ")</span>") + (o.sub ? '<br><span class="sub">' + o.sub + "</span>" : "") + "</span>" +
          '<input type="range" min="0" max="5" step="0.25" data-k="' + o.k + '" value="' + _d.pesos[o.k] + '"><span class="v">' + _d.pesos[o.k] + "</span></div>";
      }).join("") + '<button class="sec" id="plan-pesos-def">Volver a los de serie</button></details>';
    caja.innerHTML = h;
    enganchar(caja);
  }

  function enganchar(caja) {
    var fe = document.getElementById("plan-fecha");
    if (fe) fe.onchange = function () { _d.fecha = fe.value || null; guardar(); pintar(); };
    var fx = document.getElementById("plan-fecha-x");
    if (fx) fx.onclick = function (ev) { ev.preventDefault(); _d.fecha = null; guardar(); pintar(); };
    var bia = document.getElementById("plan-ia");
    if (bia) bia.onclick = function () {
      var est = document.getElementById("plan-ia-est");
      bia.disabled = true; est.textContent = " Pensando la estrategia…";
      revisarConIA().then(function () { pintar(); }).catch(function (e) { bia.disabled = false; est.textContent = " " + (e.message || e); });
    };
    caja.oninput = function (ev) {
      var el = ev.target;
      if (!el || el.type !== "range") return;
      el.nextSibling.textContent = el.value;
    };
    caja.onchange = function (ev) {
      var el = ev.target;
      if (!el || el.type !== "range") return;
      _d.pesos[el.getAttribute("data-k")] = +el.value; guardar(); invalidar();
      var abierto = el.closest("details");
      pintar();
      if (abierto) { var d = caja.querySelector("details"); if (d) d.open = true; }
    };
    var def = document.getElementById("plan-pesos-def");
    if (def) def.onclick = function () { ORIGENES.forEach(function (o) { _d.pesos[o.k] = o.def; }); guardar(); invalidar(); pintar(); };
    caja.onclick = function (ev) {
      var f = ev.target.closest ? ev.target.closest(".pr") : null;
      if (f && window.Entrenador) window.Entrenador.especifico(f.getAttribute("data-tema"));
    };
  }

  // Al acabar una sesión del entrenador: cómo va el día respecto al plan
  function cierre() {
    invalidar();
    var p = planCache();
    if (!p.fase) return "";
    var f = foto(), h7 = fotoHace(7), hoy = (State.data.daily || {})[claveDia(hoy0())] || { n: 0 };
    var qs = State.data.qs || {}, desde = hoy0().getTime() / 1000, nuevasHoy = 0;
    for (var id in qs) { var h = qs[id] && qs[id].h; if (Array.isArray(h) && h.length && h[0][0] >= desde && (qs[id].a || 0) <= h.length) nuevasHoy++; }
    return '<div class="plan-brief" style="margin-top:10px">📅 <b>Plan de examen</b> · hoy llevas ' + hoy.n + " respuestas y " + nuevasHoy + " nuevas" +
      (p.objNuevas ? " de las " + p.objNuevas + " que pide el plan" : "") + ". Preparación " + f.p + " %" + (h7 ? flecha(f.p, h7.p) + " en una semana" : "") +
      ". Faltan " + p.dias + " días.</div>";
  }

  // ------------------------------------------------------- engancharse al motor
  var fin0 = App.finishQuiz;
  App.finishQuiz = function () {
    var sess = State.session, esCoach = sess && sess.mode === "coach";
    fin0.apply(this, arguments);
    try {
      var vieja = document.getElementById("plan-cierre");
      if (vieja) vieja.remove();
      if (!sess) return;
      var c = cierre();
      if (!c) return;
      var div = document.createElement("div"); div.id = "plan-cierre"; div.innerHTML = c;
      var ancla = document.getElementById("coach-res") || document.getElementById("res-exam");
      if (ancla) ancla.parentNode.insertBefore(div, ancla.nextSibling);
      // La estrategia se revisa sola una vez por semana (o al cambiar de fase)
      if (esCoach && window.EntrenadorIA && window.EntrenadorIA.conectada() && estrategiaVieja()) revisarConIA().catch(function (e) { console.warn("plan: estrategia", e); });
    } catch (e) { console.warn("plan", e); }
  };

  var stats0 = App.updateHomeStats;
  App.updateHomeStats = function () {
    stats0.apply(this, arguments);
    try { pintar(); } catch (e) { console.warn("plan", e); }
  };
  try { pintar(); } catch (e) { console.warn("plan", e); }

  if (window.MPSync && typeof MPSync.usar === "function") {
    try { MPSync.usar({ clave: K_PLAN, modo: "reciente", alCambiar: function () { _d = leer(); invalidar(); try { pintar(); } catch (e) {} } }); } catch (e) {}
  }

  window.PlanExamen = { plan: planCache, peso: peso, factor: factor, tipo: tipoDe, temasSemana: temasSemana, cuota: cuota, contexto: contexto,
                        recordar: recordar, brief: brief, revisarConIA: revisarConIA, foto: foto, pintar: pintar, _datos: function () { return _d; } };
})();
