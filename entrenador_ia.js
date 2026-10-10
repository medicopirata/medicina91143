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
      body: JSON.stringify({ model: modelo(), max_tokens: 12000, system: sistema, messages: [{ role: "user", content: usuario }] })
    }).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok) throw new Error((j && j.error && j.error.message) || ("Error " + r.status));
        var txt = (j.content || []).filter(function (b) { return b.type === "text"; }).map(function (b) { return b.text; }).join("");
        return { txt: txt, uso: j.usage || {} };
      });
    });
  }

  // ------------------------------------------------------ apuntes de clase
  // apuntes_txt/<clave>.json lo genera tools/apuntes_volcar.py a partir de los
  // documentos de apuntes. Se pide solo al analizar y sin caché, para leer
  // siempre la última versión volcada.
  var CLAVE_APUNTES = STORAGE_KEY.replace(/_study_v\d+$/, "");
  var _apuntes = null;
  function apuntes() {
    if (!_apuntes) _apuntes = fetch("apuntes_txt/" + CLAVE_APUNTES + ".json", { cache: "no-cache" })
      .then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
    return _apuntes;
  }
  var MARCADO = /🔴|🟠|▶|⭐|⚠|pista|se pregunta|lo pregunt|esto (cae|entra)|importante|ten[eé]is que saber/i;
  var GENERAL = /^(🎯\s*)?(el examen|pistas para el examen|pistas de examen( · chuleta)?|▶ pistas de examen.*|c[oó]mo funciona la asignatura|ficha de la asignatura|c[oó]mo preguntan.*|las reglas del juego|formato y puntuaci[oó]n|las trampas que m[aá]s se repiten|checklist.*)$/i;
  function fichas(s) {
    return (String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").match(/[a-z]{5,}/g) || []);
  }
  // Para cada fallo, los dos apartados de los apuntes que más palabras raras comparten con él
  function trozosPara(d, consultas, tope) {
    if (!d || !Array.isArray(d.trozos) || !d.trozos.length) return [];
    if (!d._ix) {
      var df = new Map();
      d._ix = d.trozos.map(function (t) {
        var set = new Set(fichas(t[0] + " " + t[1]));
        set.forEach(function (w) { df.set(w, (df.get(w) || 0) + 1); });
        return set;
      });
      d._df = df;
    }
    var N = d.trozos.length, elegidos = [], vistos = new Set();
    consultas.forEach(function (c) {
      var q = new Set(fichas(c)), punt = [];
      d._ix.forEach(function (set, i) {
        var p = 0;
        q.forEach(function (w) { if (set.has(w)) p += Math.log(1 + N / d._df.get(w)); });
        if (p > 0) punt.push([p / Math.sqrt(20 + set.size) * (MARCADO.test(d.trozos[i][0] + d.trozos[i][1]) ? 1.35 : 1), i]);
      });
      punt.sort(function (a, b) { return b[0] - a[0]; });
      punt.slice(0, 2).forEach(function (x) { if (!vistos.has(x[1]) && elegidos.length < tope) { vistos.add(x[1]); elegidos.push(x[1]); } });
    });
    // Las pistas de examen de los temas que han salido y las generales de la asignatura van siempre
    var raices = new Set(elegidos.map(function (i) { return d.trozos[i][0].split(" › ")[0]; })), extra = 0;
    d.trozos.forEach(function (t, i) {
      if (vistos.has(i) || extra >= 10) return;
      var partes = t[0].split(" › "), ultimo = partes[partes.length - 1];
      var delTema = raices.has(partes[0]) && /pistas|lo esencial/i.test(ultimo);
      if (delTema || GENERAL.test(ultimo) || (partes.length <= 2 && GENERAL.test(partes[0]))) { vistos.add(i); elegidos.push(i); extra++; }
    });
    elegidos.sort(function (a, b) { return a - b; });
    return elegidos.map(function (i) { return "[" + d.trozos[i][0] + "]\n" + d.trozos[i][1]; });
  }

  var SISTEMA = [
    "Eres el entrenador personal de Santiago, estudiante de 2.º de Medicina (Universidad de Cádiz). Su objetivo es sacar la nota más alta posible en exámenes tipo test, y tú decides en qué tiene que trabajar.",
    "QUÉ RECIBES. (1) Lo que ha fallado, adivinado o respondido con dudas en la sesión: qué opción eligió, con cuánta seguridad, cuánto tardó, el motivo que él mismo marcó y el ORIGEN de cada pregunta. (2) Los apartados de sus APUNTES DE CLASE más cercanos a cada fallo, y las pistas de examen del tema y de la asignatura. (3) Otras preguntas del mismo tema con su respuesta. (4) Preguntas reales de exámenes anteriores, como muestra de estilo.",
    "CÓMO LEER SUS APUNTES. Están hechos con las transcripciones de clase y las diapositivas. Lo que el profesor considera importante está señalado: los apartados «Pistas de examen», «Lo esencial» y «Pistas para el examen»; las marcas 🔴 (lo dijo expresamente: se pregunta) y 🟠 (insistió en ello), ▶ o «Pista de examen», ⭐, ⚠ (trampas y confusiones típicas) y las citas literales del profesor entre comillas («esto cae», «lo tenéis que saber»). ⚪ es lo que dijo que no entra. «Nota de Claude» o 🤖 es un añadido que no viene del profesor. Lo marcado pesa más, pero NO descartes el resto: todo lo explicado en clase puede caer; solo cambia la prioridad.",
    "CÓMO LEER EL ORIGEN DE UNA PREGUNTA. «Salió en examen» o «cayó en» = pregunta real de una convocatoria anterior: fallarla es lo más grave, porque los profesores repiten preguntas y, sobre todo, repiten ideas. «La puso el profesor en clase» y «Cuestionario del campus» = casi tan valiosas. «Recopilaciones de años anteriores» = probablemente de examen, sin confirmar. «Entrenamiento» = escritas para practicar.",
    "TU TRABAJO. 1) Diagnóstico: di qué idea concreta se le escapa, mirando qué opción eligió y con cuánta seguridad (fallar seguro = concepto equivocado; dudar entre dos = distinción que no domina; acertar adivinando = no la sabe; «leí mal» = fallo de técnica de examen, no de conocimiento). Agrupa los fallos que nacen de la misma confusión. Ordena por prioridad real para el examen: primero lo que ya cayó en examen o el profesor marcó, después lo demás. Cita lo que dicen sus apuntes sobre ese punto. 2) Preguntas nuevas: escribe preguntas tipo test que ataquen esa confusión desde otro ángulo (no la misma pregunta reformulada), con el estilo de las preguntas reales de examen que recibes, y dando preferencia a lo que el profesor marcó como importante dentro de ese tema. 3) Consejo: qué apartado concreto de sus apuntes releer y qué hacer antes de la próxima sesión.",
    "REGLAS. Usa SOLO hechos que estén en los apuntes o en el material que recibes; si no basta para una confusión, no escribas pregunta sobre ella. Si los apuntes y otra fuente se contradicen, mandan los apuntes de clase. No escribas preguntas que necesiten ver una imagen. Cuatro opciones, una sola correcta, distractores verosímiles (a ser posible aquello con lo que él lo confunde), la correcta en posiciones variadas, sin «todas las anteriores». La explicación dice por qué es esa y por qué no la que él habría elegido. Sé directo y concreto; nada de ánimos ni generalidades. Todo en español.",
    "FORMATO. Responde SOLO con un objeto JSON, sin texto alrededor: " +
      '{"diagnostico":[{"idea":"la confusión, en una frase","prioridad":"alta|media|baja","motivo_prioridad":"p. ej. cayó en el examen de febrero / el profesor dijo «…» / no está marcado","por_que":"qué lo delata en sus respuestas","apuntes":"lo que dicen sus apuntes, con cita breve y el apartado","regla":"cómo distinguirlo, en una frase que pueda memorizar"}],' +
      '"preguntas":[{"tema":"nombre EXACTO del TEMA de la pregunta fallada de la que sale","q":"enunciado","opciones":["","","",""],"correcta":0,"explicacion":""}],' +
      '"consejo":"qué releer y qué hacer antes de la próxima sesión, tres frases como mucho"}. ' +
      "Diagnóstico ordenado de mayor a menor prioridad. Entre 1 y 2 preguntas por confusión, 12 como máximo."
  ].join("\n\n");

  var CONF = ["sin indicar", "seguro", "con dudas", "adivinando"];
  var MOTIVO = ["", "no lo sabía", "confundí conceptos", "leí mal", "dudé entre dos", "todas/ninguna"];
  function corta(s, n) { s = String(s || ""); return s.length > n ? s.slice(0, n) + "…" : s; }
  function letra(i) { return String.fromCharCode(65 + i); }

  function expediente(sess, ap) {
    var casos = [], consultas = [], temas = new Map(), qs = State.data.qs || {};
    sess.questions.forEach(function (q) {
      var a = sess.answers[q.id];
      if (!a) return;
      if (a.wasCorrect && a.conf !== 2 && a.conf !== 3) return;
      var s = qs[q.id] || {}, h = Array.isArray(s.h) && s.h.length ? s.h[s.h.length - 1] : null;
      var dc = dispCorrect(q);
      casos.push(
        "TEMA: " + q.topicBase + "\n" +
        "ORIGEN: " + (window.Entrenador ? window.Entrenador.origen(q).txt : "sin datos") + "\n" +
        "PREGUNTA" + (q.img ? " (lleva una imagen que no puedes ver)" : "") + ": " + q.q + "\n" +
        q.displayOptions.map(function (o, i) { return letra(i) + ") " + o; }).join("\n") + "\n" +
        "Eligió: " + letra(a.chosen) + " · Correcta: " + letra(dc) + " · " + (a.wasCorrect ? "ACERTÓ" : "FALLÓ") +
        " · iba " + CONF[a.conf || 0] + (h && h[4] ? " · tardó " + h[4] + " s" : "") +
        (h && h[5] ? " · él dice: " + MOTIVO[h[5]] : "") +
        (s.a > 1 ? " · historial: " + s.c + " aciertos de " + s.a : "") + "\n" +
        "EXPLICACIÓN: " + corta(q.exp, 700));
      consultas.push(q.q + " " + q.displayOptions.join(" ") + " " + (q.exp || ""));
      if (!temas.has(q.topicBase)) temas.set(q.topicBase, new Set());
      temas.get(q.topicBase).add(q.id);
    });
    if (!casos.length) return null;

    // Material del mismo tema: otras preguntas con su respuesta y su explicación
    var material = [];
    temas.forEach(function (ids, tema) {
      var base = tema.indexOf(PREFIJO) === 0 ? tema.slice(PREFIJO.length) : tema;
      var otras = (BY_TOPIC.get(base) || []).filter(function (q) { return !ids.has(q.id) && !q.img && q.exp && q.exp.length > 60 && Number.isInteger(q.correct); });
      otras = shuffle(otras).slice(0, ap ? 6 : 12);
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
    var clase = trozosPara(ap, consultas.slice(0, 25), 18);
    var muestras = !window.Entrenador ? [] : shuffle(ALL_QUESTIONS.filter(function (q) {
      return !q.img && !q.ia && Number.isInteger(q.correct) && q.q.length > 30 && window.Entrenador.origen(q).tipo === "examen";
    })).slice(0, 5).map(function (q) {
      return "· " + corta(q.q, 260) + "\n" + q.options.map(function (o, i) { return "   " + letra(i) + ") " + corta(o, 110) + (i === q.correct ? "  ✔" : ""); }).join("\n");
    });
    return {
      n: casos.length,
      texto: "ASIGNATURA: " + document.title + "\n\nLO QUE HA FALLADO, ADIVINADO O DUDADO EN ESTA SESIÓN (" + casos.length + "):\n\n" +
             casos.slice(0, 25).join("\n\n") +
             (clase.length ? "\n\nAPUNTES DE CLASE (los apartados más cercanos a cada fallo):\n\n" + clase.join("\n\n---\n\n") : "") +
             "\n\nOTRAS PREGUNTAS DE ESOS TEMAS, CON SU RESPUESTA Y EXPLICACIÓN:\n\n" + material.join("\n\n") +
             (muestras.length ? "\n\nASÍ PREGUNTAN EN LOS EXÁMENES DE ESTA ASIGNATURA (muestras reales, solo como estilo):\n\n" + muestras.join("\n\n") : "") + estado,
      conApuntes: clase.length,
      temas: Array.from(temas.keys())
    };
  }

  function sacarJSON(txt) {
    var a = txt.indexOf("{"), b = txt.lastIndexOf("}");
    if (a < 0 || b <= a) throw new Error("La IA no ha devuelto un informe legible.");
    return JSON.parse(txt.slice(a, b + 1));
  }

  function analizar(sess) {
    var caja = cajaResultados(), exp = null;
    caja.innerHTML = "<b>🧠 IA</b> · Preparando el análisis…";
    return apuntes().then(function (ap) {
      exp = expediente(sess, ap);
      if (!exp) { caja.innerHTML = "<b>🧠 IA</b> · Sin fallos ni dudas en esta sesión: no hay nada que analizar."; return null; }
      caja.innerHTML = "<b>🧠 IA</b> · Analizando " + exp.n + " respuestas" + (exp.conApuntes ? " con " + exp.conApuntes + " apartados de tus apuntes" : " (sin apuntes volcados de esta asignatura)") + "…";
      return llamar(SISTEMA, exp.texto);
    }).then(function (r) {
      if (!r) return;
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
        var pr = String(x.prioridad || "").toLowerCase();
        var col = pr === "alta" ? "#f87171" : pr === "media" ? "#fbbf24" : "var(--text2)";
        return "<li>" + (pr ? '<span style="color:' + col + ';font-weight:700">' + (pr === "alta" ? "🔴 Prioridad alta" : pr === "media" ? "🟠 Prioridad media" : "⚪ Prioridad baja") + "</span>" +
               (x.motivo_prioridad ? ' <span style="color:var(--text2)">(' + esc(x.motivo_prioridad) + ")</span>" : "") + "<br>" : "") +
               "<b>" + esc(x.idea || "") + "</b>" + (x.por_que ? " — " + esc(x.por_que) : "") +
               (x.apuntes ? '<br><span style="color:var(--text2)">📓 ' + esc(x.apuntes) + "</span>" : "") +
               (x.regla ? '<br><span style="color:var(--accent)">Regla: ' + esc(x.regla) + "</span>" : "") + "</li>";
      }).join("") + "</ul>";
    }
    if (inf.consejo) h += "<p><b>Antes de la próxima sesión:</b> " + esc(inf.consejo) + "</p>";
    return h;
  }

  // ------------------------------------------------------ peticiones a la carta
  // «Hazme un cuestionario de…», «reúne las preguntas de la práctica 3»…
  // Primero se buscan aquí las preguntas que más se parecen a lo pedido; la IA
  // elige entre ellas, puede pedir bancos enteros por su nombre y escribe las
  // que falten con los apuntes delante.
  var SISTEMA_CARTA = [
    "Eres el entrenador personal de Santiago, estudiante de 2.º de Medicina que prepara exámenes tipo test. Te hace una petición sobre su banco de preguntas: un cuestionario a la carta sobre algo concreto, o reunir las preguntas de un tema, una práctica o un seminario.",
    "RECIBES: su petición; la lista de BANCOS de la asignatura con su número de preguntas; las PREGUNTAS CANDIDATAS que más se parecen a lo pedido (id, banco, origen y enunciado); y los apartados de sus APUNTES DE CLASE más cercanos. En los apuntes, lo que el profesor considera importante está marcado (🔴, 🟠, ▶, ⭐, «Pista de examen», citas literales); ⚪ es lo que no entra.",
    "QUÉ HACES. Si pide REUNIR las preguntas de un tema, práctica o seminario: devuelve en «bancos» los nombres EXACTOS de los bancos que lo cubren y en «ids» las candidatas sueltas de otros bancos que también traten de eso. Si pide un CUESTIONARIO A LA CARTA: elige en «ids» las candidatas que mejor responden, primero las que cayeron en examen o puso el profesor, sin repetir la misma pregunta dos veces; y si lo que hay no cubre bien lo pedido, escribe en «nuevas» las que falten. Respeta el número de preguntas si lo indica; si no, entre 15 y 30. Si pide algo distinto (un plan, una duda), contéstale en «nota» y deja lo demás vacío.",
    "REGLAS PARA LAS NUEVAS: solo hechos que estén en los apuntes recibidos, con preferencia por lo que el profesor marcó; nada que necesite ver una imagen; cuatro opciones, una correcta, distractores verosímiles, sin «todas las anteriores»; explicación breve con lo que dicen los apuntes. Si los apuntes no dan para lo que pide, dilo en «nota» en vez de inventar.",
    'FORMATO: responde SOLO con JSON: {"titulo":"nombre corto de la sesión","bancos":["nombre exacto"],"ids":[123],"nuevas":[{"tema":"nombre EXACTO de un banco de la lista","q":"","opciones":["","","",""],"correcta":0,"explicacion":""}],"nota":"qué has reunido y qué falta, dos frases; di cuántas cayeron en examen"}'
  ].join("\n\n");

  var _ixq = null;
  function indicePreguntas() {
    if (_ixq && _ixq.n === ALL_QUESTIONS.length) return _ixq;
    var df = new Map(), sets = ALL_QUESTIONS.map(function (q) {
      var set = new Set(fichas(q.topicBase + " " + q.q + " " + q.options.join(" ")));
      set.forEach(function (w) { df.set(w, (df.get(w) || 0) + 1); });
      return set;
    });
    _ixq = { n: ALL_QUESTIONS.length, df: df, sets: sets };
    return _ixq;
  }
  function candidatas(texto, tope) {
    var ix = indicePreguntas(), q = new Set(fichas(texto)), N = ix.n, punt = [];
    ix.sets.forEach(function (set, i) {
      var p = 0;
      q.forEach(function (w) { if (set.has(w)) p += Math.log(1 + N / ix.df.get(w)); });
      if (p > 0) punt.push([p / Math.sqrt(12 + set.size), i]);
    });
    punt.sort(function (a, b) { return b[0] - a[0]; });
    return punt.slice(0, tope).map(function (x) { return ALL_QUESTIONS[x[1]]; });
  }

  function pedir(texto, estado) {
    var cand = candidatas(texto, 90);
    estado("Buscando en tus preguntas y apuntes…");
    return apuntes().then(function (ap) {
      var bancos = Array.from(BY_TOPIC.entries()).map(function (e) { return "· " + e[0] + " (" + e[1].length + ")"; });
      var lista = cand.map(function (q) {
        return "#" + q.id + " | " + q.topicBase + " | " + (window.Entrenador ? window.Entrenador.origen(q).txt.split(" · ")[0] : "") + (q.img ? " | con imagen" : "") + " | " + corta(q.q, 200) + " → " + corta(q.options[q.correct] || "", 80);
      });
      var clase = trozosPara(ap, [texto, texto + " " + cand.slice(0, 12).map(function (q) { return q.q; }).join(" ")], 12);
      var usuario = "ASIGNATURA: " + document.title + "\n\nPETICIÓN DE SANTIAGO: " + texto +
        "\n\nBANCOS DE LA ASIGNATURA:\n" + bancos.join("\n") +
        "\n\nPREGUNTAS CANDIDATAS (" + lista.length + "):\n" + lista.join("\n") +
        (clase.length ? "\n\nAPUNTES DE CLASE MÁS CERCANOS:\n\n" + clase.join("\n\n---\n\n") : "\n\n(Esta asignatura no tiene apuntes volcados: no escribas preguntas nuevas.)");
      estado("Pensando la sesión…");
      return llamar(SISTEMA_CARTA, usuario);
    }).then(function (r) {
      var inf = sacarJSON(r.txt), d = cargar(), base = Math.floor(Date.now() / 1000) * 20, nuevasIds = [];
      (inf.nuevas || []).forEach(function (p, i) {
        if (!p || !p.q || !Array.isArray(p.opciones) || p.opciones.length < 3 || !Number.isInteger(p.correcta) || !p.opciones[p.correcta]) return;
        var de = String(p.tema || "");
        if (de.indexOf(PREFIJO) === 0) de = de.slice(PREFIJO.length);
        if (!BY_TOPIC.has(de)) de = "Peticiones";
        d.qs.push({ id: base + i, de: de, q: String(p.q), options: p.opciones.map(String), correct: p.correcta, exp: String(p.explicacion || ""), t: Date.now() });
        nuevasIds.push(base + i);
      });
      if (nuevasIds.length) { guardar(d); inyectar(); if (typeof App.renderTopicsGrid === "function") App.renderTopicsGrid(); }
      var vistas = new Set(), sesion = [];
      function mete(q) { if (q && !vistas.has(q.id)) { vistas.add(q.id); sesion.push(q); } }
      (inf.bancos || []).forEach(function (b) { (BY_TOPIC.get(String(b)) || []).forEach(mete); });
      (inf.ids || []).forEach(function (id) { mete(BY_ID.get(+id)); });
      nuevasIds.forEach(function (id) { mete(BY_ID.get(id)); });
      var deExamen = sesion.filter(function (q) { return window.Entrenador && window.Entrenador.origen(q).tipo === "examen"; }).length;
      return { titulo: String(inf.titulo || "Sesión a la carta"), nota: String(inf.nota || ""), preguntas: sesion, nuevas: nuevasIds.length, deExamen: deExamen };
    });
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
      '<br><span id="ia-apuntes" style="color:var(--text2)"></span>' +
      '<div class="fila"><select id="ia-modelo"><option value="claude-opus-5-5">Opus 5.5</option><option value="claude-sonnet-5-5">Sonnet 5.5</option><option value="claude-fable-5-1">Fable 5.1</option></select>' +
      '<button class="sec" id="ia-probar">Probar conexión</button><button class="sec" id="ia-quitar">Quitar la clave</button><span id="ia-estado" style="color:var(--text2)"></span></div>' +
      '<div style="margin-top:10px"><b>Pídele algo al entrenador</b><br><span style="color:var(--text2)">Por ejemplo: «hazme 20 preguntas de las vías del tálamo, sobre todo lo que cayó en examen» o «reúne todo lo del seminario 2».</span>' +
      '<div class="fila"><textarea id="ia-peticion" rows="2" style="flex:1;min-width:220px;background:var(--surface2);color:var(--text);border:1px solid var(--border);border-radius:6px;padding:6px 8px;font:inherit;font-size:.85rem"></textarea><button id="ia-pedir">Pedir</button></div>' +
      '<div id="ia-respuesta" style="margin-top:6px"></div></div>' +
      (ult ? '<details style="margin-top:8px"><summary style="cursor:pointer">Último informe</summary>' + pintarInforme(ult) + "</details>" : "");
    document.getElementById("ia-pedir").onclick = function () {
      var txt = document.getElementById("ia-peticion").value.trim(), out = document.getElementById("ia-respuesta"), btn = this;
      if (!txt || btn.disabled) return;
      btn.disabled = true;
      pedir(txt, function (m) { out.textContent = m; }).then(function (r) {
        btn.disabled = false;
        out.innerHTML = "<b>" + esc(r.titulo) + "</b>" + (r.nota ? " — " + esc(r.nota) : "") +
          (r.preguntas.length ? "<br>" + r.preguntas.length + " preguntas · " + r.deExamen + " cayeron en examen · " + r.nuevas + " escritas ahora " +
            '<div class="fila"><button id="ia-empezar">Empezar esta sesión</button></div>' : "");
        var b = document.getElementById("ia-empezar");
        if (b) b.onclick = function () { App.beginSession(r.preguntas, "carta"); };
      }).catch(function (e) { btn.disabled = false; out.textContent = "No se ha podido: " + (e.message || e); });
    };
    var _fin = 0;
    apuntes().then(function (ap) {
      var el = document.getElementById("ia-apuntes");
      if (el) el.textContent = ap && ap.trozos ? "Apuntes de clase cargados: " + ap.trozos.length + " apartados, volcados el " + ap.v.split("-").reverse().join("-")
                                               : "Esta asignatura aún no tiene apuntes volcados: trabajo con las explicaciones de las preguntas.";
    });
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

  window.EntrenadorIA = { analizar: analizar, expediente: expediente, pedir: pedir };
})();
