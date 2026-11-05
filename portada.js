/* Portada de la bitácora: lo que toca estudiar hoy.
 *
 * Desde el 25-09-2026 la bitácora es solo de Santiago, así que la portada ya
 * no es un portal con perfiles, rangos y mensajes: es su mesa de estudio.
 * Junta lo que cada plataforma guarda en la nube (users/<uid>):
 *   · <clave>            avance de las preguntas (qs con su repaso «du» e
 *                        historial «h», daily por día)
 *   · _extras/<clave>_plan     el plan de examen (foto diaria de la
 *                        preparación, confusiones de la IA, parcial elegido)
 *   · _extras/<clave>_estudio  la sala de estudio (temas leídos, baterías)
 * y las fechas de examen (examenes/<uid>), y con eso dice qué hacer hoy, por
 * orden, con enlaces que abren la plataforma justo donde toca (#estudio=9,
 * #repaso=9, #entrenador: los entiende estudio.js).
 *
 * Aquí solo hay cálculo y pintado: index.html es quien habla con Firebase.
 */
(function () {
  "use strict";

  var DIA = 86400000;
  // Las de segundo, en el orden en que se estudian. sala = tiene sala de estudio.
  var ASIGNATURAS = [
    { k: "anat3",     nombre: "Anatomía 3",          emoji: "🧠", archivo: "plataforma_anatomia3.html",     cuatri: 1, sala: true },
    { k: "fisio1",    nombre: "Fisiología I",        emoji: "🫀", archivo: "plataforma_fisio1.html",        cuatri: 1, sala: true },
    { k: "histo21",   nombre: "Histología Esp. I",   emoji: "🔬", archivo: "plataforma_histologia2.1.html", cuatri: 1, sala: true },
    { k: "tecdiag",   nombre: "Técnicas Diagnósticas", emoji: "🩻", archivo: "plataforma_tecdiag.html",     cuatri: 1, sala: true },
    { k: "medint",    nombre: "Medicina Interna",    emoji: "🩺", archivo: "plataforma_medint.html",        cuatri: 0, sala: true },
    { k: "genetica",  nombre: "Genética",            emoji: "🧬", archivo: "plataforma_genetica.html",      cuatri: 0, sala: true },
    { k: "historia",  nombre: "Historia de la Medicina", emoji: "📜", archivo: "plataforma_historia.html",  cuatri: 0, sinEntrenador: true },
    { k: "fisio2",    nombre: "Fisiología II",       emoji: "🫁", archivo: "plataforma_fisio2.html",        cuatri: 2 },
    { k: "histoesp2", nombre: "Histología Esp. II",  emoji: "🧫", archivo: "plataforma_histoesp2.html",     cuatri: 2 },
  ];
  // Las mismas fechas por defecto que plan_examen.js (las buenas llegan de examenes/<uid>)
  var FECHAS = { medint: "2027-01-15", genetica: "2027-01-20", fisio1: "2027-01-25", anat3: "2027-01-29",
                 histoesp2: "2027-02-01", fisio2: "2027-02-02", histo21: "2027-02-04" };
  var PARCIALES = { anat3: { 1: "2026-11-27", 2: "2027-01-29" }, medint: { 1: "2027-01-15", 2: null } };

  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function hoyDias() { return Math.floor(Date.now() / DIA); }
  function hoy0() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
  function diasHasta(iso) { return iso ? Math.round((new Date(iso + "T00:00:00") - hoy0()) / DIA) : null; }
  function isoDia(d) { var x = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return x.toISOString().slice(0, 10); }
  var MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  function fmt(iso) { var d = new Date(iso + "T00:00:00"); return d.getDate() + " " + MESES[d.getMonth()]; }
  function extra(prog, nombre) {
    var x = prog && prog._extras && prog._extras[nombre.replace(/\./g, "%2E")];
    if (!x || x.v == null) return null;
    try { return JSON.parse(x.v); } catch (e) { return null; }
  }
  function ultimo(obj) { var ks = Object.keys(obj || {}).sort(); return ks.length ? obj[ks[ks.length - 1]] : null; }

  // ------------------------------------------------------------ cálculo
  // Lo que se sabe de una asignatura: avance, repasos vencidos, examen, plan y sala
  function estado(a, prog, examenes, indices) {
    var clave = a.k + "_study_v1", e = (prog && prog[clave]) || {}, qs = e.qs || {}, hoy = hoyDias();
    var vencidas = 0, vistas = 0, bien = 0, intentos = 0;
    Object.keys(qs).forEach(function (id) {
      var q = qs[id]; if (!q) return;
      vistas++;
      if (typeof q.du === "number" && q.du <= hoy) vencidas++;
      (q.h || []).forEach(function (h) { intentos++; if (h[1]) bien++; });
    });
    // Actividad de los últimos días (daily: {AAAA-MM-DD: {n, ok}})
    var daily = e.daily || {}, semana = 0, ult = null;
    for (var i = 0; i < 7; i++) { var dd = daily[isoDia(new Date(Date.now() - i * DIA))]; if (dd) semana += dd.n || 0; }
    Object.keys(daily).forEach(function (f) { if (daily[f] && daily[f].n && (!ult || f > ult)) ult = f; });
    // Examen: la convocatoria elegida o la fecha por defecto; el parcial si es lo próximo
    var ex = (examenes || {})[clave] || {}, fecha = ex.convocatoria === "no" ? null : ex.convocatoria === "junio" ? (ex.junio || null) : (ex.fecha || FECHAS[a.k] || null);
    var plan = extra(prog, clave + "_plan") || {}, parc = null;
    var fp = function (n) { return (plan.fParc || {})[n] || (PARCIALES[a.k] || {})[n] || null; };
    if (PARCIALES[a.k] && plan.objetivo !== "final") {
      var d1 = diasHasta(fp(1));
      if (d1 != null && d1 >= 0 && plan.objetivo !== "p2") parc = { n: 1, fecha: fp(1) };
      else if (fp(2) && diasHasta(fp(2)) >= 0) parc = { n: 2, fecha: fp(2) };
    }
    var meta = parc ? { txt: parc.n + ".º parcial", fecha: parc.fecha } : fecha ? { txt: ex.convocatoria === "junio" ? "examen (junio)" : "examen", fecha: fecha } : null;
    if (meta) meta.dias = diasHasta(meta.fecha);
    // Preparación: la última foto del plan de examen y la de hace 7 días
    var fotos = plan.diario || {}, dias = Object.keys(fotos).sort(), foto = dias.length ? fotos[dias[dias.length - 1]] : null, hace7 = null;
    var lim = isoDia(new Date(Date.now() - 7 * DIA));
    dias.forEach(function (d) { if (d <= lim) hace7 = fotos[d]; });
    // Confusiones de la IA sin resolver (las de los últimos 30 días; las resueltas a mano llevan res)
    // (igual que estadoConfusion de plan_examen.js: resuelta si desde entonces acertó 2 de sus preguntas sin fallar ninguna)
    var confus = (plan.confus || []).filter(function (c) {
      if (c.res || Date.now() - c.t > 30 * DIA) return false;
      var ok = 0, mal = 0, desde = c.t / 1000;
      (c.ids || []).forEach(function (id) { ((qs[id] || {}).h || []).forEach(function (x) { if (x[0] > desde) { if (x[1] === 1 && x[3] !== 3) ok++; else mal++; } }); });
      return mal > 0 || ok < 2;
    });
    // Sala de estudio
    var sala = null;
    if (a.sala) {
      var est = (extra(prog, clave + "_estudio") || {}).t || {}, ind = (indices[a.k] || {}).temas || [];
      var leidos = 0, aMedias = null, toca = [], cambiadas = [];
      ind.forEach(function (t) {
        var s = est[t.tema];
        if (!s) return;
        // Lección cambiada desde la última vez que se abrió (igual que cambiada() de estudio.js)
        var vis = s.vis || Math.max(s.ini || 0, s.fin || 0);
        if (vis && t.mod && t.mod > vis) cambiadas.push(t);
        if (s.fin) {
          leidos++;
          var b = s.bat, p = b && b.n ? b.bien / b.n : 0;
          var intervalo = !b || !b.hechas ? 2 : p >= 0.8 && b.hechas >= b.n * 0.8 ? 20 : p >= 0.7 ? 12 : p >= 0.5 ? 6 : p >= 0.3 ? 3 : 2;
          var ultT = Math.max(s.fin, (b && b.ultima) || 0), hace = Math.floor((Date.now() - ultT) / DIA);
          if (hace >= intervalo) toca.push({ t: t, hace: hace, sinBat: !(b && b.hechas) });
        } else if (s.paso && !aMedias) aMedias = t;
      });
      var siguiente = ind.filter(function (t) { return !(est[t.tema] && est[t.tema].fin); })[0] || null;
      sala = { total: ind.length, leidos: leidos, aMedias: aMedias, siguiente: siguiente, toca: toca.sort(function (x, y) { return (y.t.peso || 0) - (x.t.peso || 0) || y.hace - x.hace; }), cambiadas: cambiadas };
    }
    return { a: a, vencidas: vencidas, vistas: vistas, acierto: intentos ? Math.round(bien * 100 / intentos) : null, semana: semana, ultima: ult,
             meta: meta, foto: foto, hace7: hace7, confus: confus, sala: sala, conv: ex.convocatoria || "enero", ex: ex };
  }

  // Lo que conviene hacer hoy, de más a menos urgente, con su enlace
  function tareas(estados) {
    var l = [];
    estados.forEach(function (s) {
      if (s.a.cuatri === 2) return;     // las del 2.º cuatrimestre, más adelante
      var urg = s.meta && s.meta.dias != null && s.meta.dias >= 0 ? Math.max(0.6, 3 - s.meta.dias / 30) : 0.8;   // cuanto más cerca el examen, más pesa
      var A = s.a, url = A.archivo;
      if (s.confus.length) {
        var c = s.confus[s.confus.length - 1];
        l.push({ p: 9 * urg, ico: "🧩", s: s, txt: (s.confus.length === 1 ? "Una confusión pendiente" : s.confus.length + " confusiones pendientes") + ": «" + c.idea + "»",
                 url: url + (c.sala ? "#estudio=" + c.sala.n + "." + c.sala.i : "#estudio"), boton: c.sala ? "Repasar el apartado" : "Abrir la sala" });
      }
      if (s.vencidas) l.push(A.sinEntrenador ? { p: Math.min(10, 3 + s.vencidas / 15) * urg, ico: "🔁", s: s, txt: s.vencidas + " preguntas con el repaso vencido", url: url, boton: "Repasar" } : { p: Math.min(10, 3 + s.vencidas / 15) * urg, ico: "🔁", s: s, txt: s.vencidas + " preguntas con el repaso vencido", url: url + "#entrenador", boton: "Entrenador" });
      if (s.sala) {
        s.sala.toca.slice(0, 2).forEach(function (x) {
          l.push({ p: (x.sinBat ? 7 : 5 + (x.t.peso || 0)) * urg, ico: "📖", s: s, txt: (x.sinBat ? "Falta la batería de " : "Toca repasar ") + (x.t.etiqueta || "Tema " + x.t.tema) + " · " + x.t.titulo + (x.sinBat ? "" : " (hace " + x.hace + " días)"),
                   url: url + (x.sinBat ? "#estudio=" + x.t.tema : "#repaso=" + x.t.tema), boton: x.sinBat ? "Hacer la batería" : "Repaso del tema" });
        });
        var cb = s.sala.cambiadas;
        if (cb.length) l.push({ p: 6.5 * urg, ico: "🆕", s: s, txt: (cb.length === 1 ? "Ha cambiado " + (cb[0].etiqueta || "el Tema " + cb[0].tema) + " · " + cb[0].titulo : cb.length + " lecciones han cambiado desde que las abriste: " + cb.map(function (t) { return t.corta || "T" + t.tema; }).join(", ")),
                                url: url + "#estudio=" + cb[0].tema, boton: "Ver qué cambió" });
        var sig = s.sala.aMedias || s.sala.siguiente;
        if (sig) l.push({ p: (s.sala.aMedias ? 6 : 4) * urg, ico: "▶️", s: s, txt: (s.sala.aMedias ? "Sigue con " : "Siguiente tema: ") + (sig.etiqueta || "Tema " + sig.tema) + " · " + sig.titulo + " (" + (sig.minutos || "?") + " min)",
                         url: url + "#estudio=" + sig.tema, boton: s.sala.aMedias ? "Seguir" : "Estudiar" });
      }
      if (s.meta && s.meta.dias != null && s.meta.dias >= 0 && s.meta.dias <= 21 && s.foto && s.foto.ex < s.foto.exN)
        l.push({ p: 8 * urg, ico: "📝", s: s, txt: "Preguntas de examen dominadas: " + s.foto.ex + " de " + s.foto.exN + " — quedan " + s.meta.dias + " días para el " + s.meta.txt, url: url + "#entrenador", boton: "A por ellas" });
    });
    return l.sort(function (x, y) { return y.p - x.p; });
  }

  // ------------------------------------------------------------ pintado
  function tarjeta(s) {
    var A = s.a, m = s.meta, f = s.foto, sala = s.sala;
    var cerca = m && m.dias != null && m.dias >= 0 && m.dias <= 30;
    var h = '<div class="as-card' + (A.cuatri === 2 ? " luego" : "") + '">';
    h += '<a class="as-top" href="' + esc(A.archivo) + '"><span class="as-emoji">' + A.emoji + '</span><span class="as-nom">' + esc(A.nombre) + "</span>" +
      (m && m.dias != null ? '<span class="as-dias' + (cerca ? " cerca" : "") + (m.dias < 0 ? " pasado" : "") + '">' + (m.dias < 0 ? "pasado" : m.dias === 0 ? "¡hoy!" : m.dias + " d") + "</span>" : s.conv === "no" ? '<span class="as-dias pasado">no me presento</span>' : "") + "</a>";
    if (m) h += '<div class="as-meta">' + esc(m.txt) + " · " + fmt(m.fecha) + "</div>";
    if (A.cuatri === 2) return h + '<div class="as-meta">2.º cuatrimestre: más adelante.</div></div>';
    if (f) {
      var tend = s.hace7 ? Math.round((f.p - s.hace7.p) * 10) / 10 : null;
      h += '<div class="as-prep"><div class="as-barra"><i style="width:' + Math.min(100, f.p) + '%"></i></div><span><b>' + Math.round(f.p) + " %</b> preparado" +
        (tend ? ' <em class="' + (tend > 0 ? "sube" : "baja") + '">' + (tend > 0 ? "▲ " : "▼ ") + Math.abs(tend) + " en 7 días</em>" : "") + "</span></div>";
      if (f.exN) h += '<div class="as-dato">📝 De examen dominadas: <b>' + f.ex + "/" + f.exN + "</b></div>";
    } else h += '<div class="as-dato sub">Abre la plataforma para calcular tu preparación.</div>';
    if (sala && sala.total) h += '<div class="as-dato">📖 Sala: <b>' + sala.leidos + "/" + sala.total + "</b> temas estudiados" + (sala.toca.length ? " · " + sala.toca.length + " por repasar" : "") + (sala.cambiadas.length ? " · 🆕 " + sala.cambiadas.length + (sala.cambiadas.length === 1 ? " cambiada" : " cambiadas") : "") + "</div>";
    h += '<div class="as-dato">' + (s.vencidas ? "🔁 <b>" + s.vencidas + "</b> repasos vencidos · " : "") + (s.semana ? s.semana + " preguntas esta semana" : s.ultima ? "Última vez: " + fmt(s.ultima) : "Sin empezar") + (s.acierto != null ? " · " + s.acierto + " % aciertos" : "") + "</div>";
    if (s.confus.length) h += '<div class="as-dato">🧩 ' + s.confus.length + (s.confus.length === 1 ? " confusión pendiente" : " confusiones pendientes") + "</div>";
    h += '<div class="as-btns"><a href="' + esc(A.archivo) + '">Abrir</a>' + (A.sala ? '<a href="' + esc(A.archivo) + '#estudio">📖 Sala</a>' : "") + (A.sinEntrenador ? "" : '<a href="' + esc(A.archivo) + '#entrenador">🧠 Entrenador</a>') + "</div>";
    return h + "</div>";
  }

  window.construirPortada = function (prog, examenes, indices) {
    var estados = ASIGNATURAS.map(function (a) { return estado(a, prog || {}, examenes || {}, indices || {}); });
    var h = "";
    // Próximos exámenes, el más cercano primero
    var prox = estados.filter(function (s) { return s.meta && s.meta.dias != null && s.meta.dias >= 0; }).sort(function (x, y) { return x.meta.dias - y.meta.dias; });
    if (prox.length) {
      h += '<section class="bloque"><h2>Próximos exámenes</h2><div class="examenes">' + prox.map(function (s, i) {
        return '<a class="exam' + (i === 0 ? " primero" : "") + (s.meta.dias <= 30 ? " cerca" : "") + '" href="' + esc(s.a.archivo) + '"><b>' + s.meta.dias + "</b><span>" + (s.meta.dias === 1 ? "día" : "días") + "</span><em>" + s.a.emoji + " " + esc(s.a.nombre) + "<br>" + esc(s.meta.txt) + " · " + fmt(s.meta.fecha) + "</em></a>";
      }).join("") + "</div></section>";
    }
    // Hoy
    var t = tareas(estados), totalVenc = estados.reduce(function (n, s) { return n + (s.a.cuatri === 2 ? 0 : s.vencidas); }, 0);
    h += '<section class="bloque"><h2>Hoy</h2>';
    if (!t.length) h += '<p class="sub">Nada pendiente: ni repasos vencidos ni temas por repasar. Buen momento para avanzar temario.</p>';
    else {
      h += '<ol class="hoy">' + t.slice(0, 6).map(function (x, i) {
        return '<li' + (i === 0 ? ' class="primera"' : "") + '><span class="ico">' + x.ico + '</span><div><span class="asig">' + x.s.a.emoji + " " + esc(x.s.a.nombre) + "</span>" + esc(x.txt) + '</div><a class="ir" href="' + esc(x.url) + '">' + esc(x.boton) + " →</a></li>";
      }).join("") + "</ol>";
      if (t.length > 6) h += '<details class="mas"><summary>' + (t.length - 6) + " cosas más</summary><ol class=\"hoy\">" + t.slice(6).map(function (x) {
        return '<li><span class="ico">' + x.ico + '</span><div><span class="asig">' + x.s.a.emoji + " " + esc(x.s.a.nombre) + "</span>" + esc(x.txt) + '</div><a class="ir" href="' + esc(x.url) + '">' + esc(x.boton) + " →</a></li>";
      }).join("") + "</ol></details>";
    }
    var sem = estados.reduce(function (n, s) { return n + s.semana; }, 0);
    h += '<div class="resumen"><span><b>' + totalVenc + "</b> repasos vencidos</span><span><b>" + sem + "</b> preguntas en 7 días</span><span><b>" + racha(prog) + "</b> días seguidos</span></div>";
    h += "</section>";
    // Asignaturas
    h += '<section class="bloque"><h2>Segundo</h2><div class="asignaturas">' + estados.filter(function (s) { return s.a.cuatri !== 2; }).map(tarjeta).join("") + "</div>" +
      '<div class="asignaturas luego">' + estados.filter(function (s) { return s.a.cuatri === 2; }).map(tarjeta).join("") + "</div></section>";
    return h;
  };

  // Días seguidos con alguna pregunta en cualquier asignatura (el hueco de hoy aún no la rompe)
  function racha(prog) {
    var diarios = ASIGNATURAS.map(function (a) { return ((prog || {})[a.k + "_study_v1"] || {}).daily || {}; }), n = 0;
    for (var i = 0; i < 400; i++) {
      var f = isoDia(new Date(Date.now() - i * DIA));
      if (diarios.some(function (d) { return d[f] && d[f].n; })) n++; else if (i > 0) break;
    }
    return n;
  }

  // Convocatoria de cada asignatura (lo guarda index.html en examenes/<uid>)
  window.construirConvocatorias = function (examenes) {
    return ASIGNATURAS.map(function (a) {
      var clave = a.k + "_study_v1", ex = (examenes || {})[clave] || {}, el = ex.convocatoria || "enero";
      return '<div class="conv-fila"><span>' + a.emoji + " " + esc(a.nombre) + "</span><span>" + [["enero", ex.fecha || FECHAS[a.k]], ["junio", ex.junio], ["no", null]].map(function (o) {
        return '<button class="' + (el === o[0] ? "on" : "") + '" data-conv="' + clave + '" data-v="' + o[0] + '">' + (o[0] === "no" ? "no me presento" : o[0] + (o[1] ? " · " + fmt(o[1]) : "")) + "</button>";
      }).join("") + "</span></div>";
    }).join("");
  };

  window.PORTADA_ASIGNATURAS = ASIGNATURAS;
})();
