/* Escritorio de estudio.
 *
 * Reúne en una sola pantalla lo que antes había que ir a buscar plataforma
 * por plataforma: qué toca repasar hoy, cuánto se lleva hecho y qué
 * asignatura va quedándose atrás.
 *
 * Aquí solo hay cálculo y pintado. Los datos los pasa index.html, que es
 * quien habla con Firebase.
 *
 * Solo mira las asignaturas de segundo: las de primero están aprobadas y
 * meterlas aquí sería ruido.
 */
(function () {

  var ASIGNATURAS = [
    { clave: "fisio1_study_v1",    nombre: "Fisiología I",       archivo: "plataforma_fisio1.html",        emoji: "🫀", total: 1152  },
    { clave: "histo21_study_v1",   nombre: "Histología Esp. I",  archivo: "plataforma_histologia2.1.html", emoji: "🔬", total: 3787 },
    { clave: "anat3_study_v1",     nombre: "Anatomía 3",         archivo: "plataforma_anatomia3.html",     emoji: "🧠", total: 1932 },
    { clave: "medint_study_v1",    nombre: "Medicina Interna",   archivo: "plataforma_medint.html",        emoji: "🩺", total: 6842 },
    { clave: "genetica_study_v1",  nombre: "Genética",           archivo: "plataforma_genetica.html",      emoji: "🧬", total: 793  },
    { clave: "fisio2_study_v1",    nombre: "Fisiología II",      archivo: "plataforma_fisio2.html",        emoji: "🫁", total: 906  },
    { clave: "histoesp2_study_v1", nombre: "Histología Esp. II", archivo: "plataforma_histoesp2.html",     emoji: "🧫", total: 1958 },
  ];

  var DIA = 86400000;

  function hoyEnDias(){ return Math.floor(Date.now() / DIA); }

  function fechaISO(d){
    return new Date(d).toISOString().slice(0, 10);
  }

  /* Repasos que ya han vencido: el campo du es el día (desde 1970) en que
     toca volver a ver la pregunta. */
  function vencidas(estado){
    var qs = (estado && estado.qs) || {}, hoy = hoyEnDias(), n = 0;
    for (var k in qs) {
      var q = qs[k];
      if (q && typeof q.du === "number" && q.du <= hoy) n++;
    }
    return n;
  }

  function vistas(estado){
    var qs = (estado && estado.qs) || {};
    return Object.keys(qs).length;
  }

  /* Aciertos sobre el total de intentos registrados en el historial. */
  function acierto(estado){
    var qs = (estado && estado.qs) || {}, bien = 0, total = 0;
    for (var k in qs) {
      var h = qs[k] && qs[k].h;
      if (!h || !h.length) continue;
      for (var i = 0; i < h.length; i++) { total++; if (h[i][1]) bien++; }
    }
    return total ? Math.round(bien * 100 / total) : null;
  }

  /* Días seguidos con al menos una pregunta, contando hacia atrás desde hoy.
     Si hoy aún no se ha estudiado, la racha de ayer sigue viva. */
  function racha(diarios){
    var hoy = new Date(), dias = 0;
    for (var i = 0; i < 400; i++) {
      var f = fechaISO(hoy.getTime() - i * DIA);
      var hubo = diarios.some(function (d) { return d[f] && d[f].n; });
      if (hubo) dias++;
      else if (i > 0) break;      // el hueco de hoy todavía no rompe la racha
    }
    return dias;
  }

  function desdeUltima(diarios){
    var ultima = null;
    diarios.forEach(function (d) {
      for (var f in d) { if (d[f] && d[f].n && (!ultima || f > ultima)) ultima = f; }
    });
    if (!ultima) return null;
    return Math.floor((Date.now() - new Date(ultima + "T00:00:00").getTime()) / DIA);
  }

  function semana(diarios){
    var n = 0, ok = 0, hoy = Date.now();
    for (var i = 0; i < 7; i++) {
      var f = fechaISO(hoy - i * DIA);
      diarios.forEach(function (d) {
        if (d[f]) { n += d[f].n || 0; ok += d[f].ok || 0; }
      });
    }
    return { n: n, ok: ok, pct: n ? Math.round(ok * 100 / n) : null };
  }

  function diasHasta(iso){
    if (!iso) return null;
    return Math.ceil((new Date(iso + "T00:00:00").getTime() - Date.now()) / DIA);
  }

  /* De las dos convocatorias, la que toque. Si no se ha elegido, la de
     enero, que es la ordinaria. */
  function fechaExamen(ex){
    if (!ex) return null;
    if (ex.convocatoria === "no") return null;
    if (ex.convocatoria === "junio") return ex.junio || null;
    return ex.fecha || null;
  }

  function esc(t){
    return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* progreso: { clave: estado }   examenes: { clave: "AAAA-MM-DD" } */
  window.construirEscritorio = function (progreso, examenes) {
    progreso = progreso || {};
    examenes = examenes || {};

    var filas = ASIGNATURAS.map(function (a) {
      var e = progreso[a.clave] || {};
      return {
        def: a,
        vence: vencidas(e),
        vistas: vistas(e),
        acierto: acierto(e),
        ex: examenes[a.clave] || null,
        dias: diasHasta(fechaExamen(examenes[a.clave])),
      };
    });

    var diarios = ASIGNATURAS.map(function (a) {
      return (progreso[a.clave] || {}).daily || {};
    });

    var totalVence = filas.reduce(function (s, f) { return s + f.vence; }, 0);
    var conAcierto = filas.filter(function (f) { return f.acierto != null; });
    var aciertoGlobal = conAcierto.length
      ? Math.round(conAcierto.reduce(function (s, f) { return s + f.acierto; }, 0) / conAcierto.length)
      : null;
    var sinEstudiar = desdeUltima(diarios);
    var s = semana(diarios);
    var r = racha(diarios);

    // Lo que toca hoy, primero lo que más urge
    var pendientes = filas.filter(function (f) { return f.vence > 0; })
                          .sort(function (a, b) { return b.vence - a.vence; });

    var html = '<div class="esc-wrap">';

    html += '<div class="esc-hoy">'
      + '<div class="esc-hoy-num">' + totalVence + '</div>'
      + '<div class="esc-hoy-txt">' + (totalVence
          ? 'preguntas te tocan hoy'
          : 'nada vencido: vas al día') + '</div>'
      + (pendientes.length
          ? '<a class="esc-btn" href="' + esc(pendientes[0].def.archivo) + '">Empezar por '
            + esc(pendientes[0].def.nombre) + ' →</a>'
          : '')
      + '</div>';

    var tiraRacha = r > 0
      ? '<span class="esc-t-num">' + r + '</span><span class="esc-t-lbl">'
        + (r === 1 ? 'día seguido' : 'días seguidos') + '</span>'
      : (sinEstudiar == null
          ? '<span class="esc-t-num">—</span><span class="esc-t-lbl">aún sin empezar</span>'
          : '<span class="esc-t-num">' + sinEstudiar + '</span><span class="esc-t-lbl">'
            + (sinEstudiar === 1 ? 'día sin estudiar' : 'días sin estudiar') + '</span>');

    html += '<div class="esc-tiras">'
      + '<div class="esc-tira' + (r === 0 && sinEstudiar > 2 ? ' aviso' : '') + '">' + tiraRacha + '</div>'
      + '<div class="esc-tira"><span class="esc-t-num">' + s.n + '</span>'
        + '<span class="esc-t-lbl">esta semana</span></div>'
      + '<div class="esc-tira"><span class="esc-t-num">'
        + (aciertoGlobal == null ? '—' : aciertoGlobal + '%') + '</span>'
        + '<span class="esc-t-lbl">aciertos</span></div>'
      + '</div>';

    html += '<div class="esc-lista">';
    filas.forEach(function (f) {
      var pct = f.def.total ? Math.round(f.vistas * 100 / f.def.total) : 0;
      html += '<a class="esc-fila" href="' + esc(f.def.archivo) + '">'
        + '<span class="esc-emoji">' + f.def.emoji + '</span>'
        + '<span class="esc-nom">' + esc(f.def.nombre)
          + (f.ex && f.ex.convocatoria === "no"
              ? '<em class="esc-examen">no te presentas</em>'
              : f.dias != null
                ? '<em class="esc-examen' + (f.dias <= 30 ? ' cerca' : '') + '">'
                  + (f.dias < 0 ? 'examen pasado' : f.dias + ' días')
                  + ' · ' + (f.ex && f.ex.convocatoria === "junio" ? 'junio' : 'enero') + '</em>'
                : '')
          + '</span>'
        + '<span class="esc-barra"><i style="width:' + pct + '%"></i></span>'
        + '<span class="esc-cifras">' + f.vistas + '/' + f.def.total
          + (f.acierto != null ? ' · ' + f.acierto + '%' : '') + '</span>'
        + '<span class="esc-vence' + (f.vence ? ' hay' : '') + '">'
          + (f.vence ? f.vence : '·') + '</span>'
        + '</a>';
    });
    html += '</div>';

    // ---- Convocatorias ---------------------------------------------------
    html += '<details class="esc-conv"><summary>🗓️ A qué convocatoria me presento</summary>'
         + '<div class="esc-conv-lista">';
    filas.forEach(function (f) {
      var ex = f.ex || {};
      var elegida = ex.convocatoria || "enero";
      html += '<div class="esc-conv-fila">'
        + '<span>' + f.def.emoji + ' ' + esc(f.def.nombre)
        + (ex.sigla ? ' <em class="esc-sigla">' + esc(ex.sigla) + '</em>' : '') + '</span>'
        + '<span class="esc-conv-btns">'
        + [["enero", ex.fecha], ["junio", ex.junio], ["no", null]].map(function (o) {
            var val = o[0], fch = o[1];
            var etq = val === "no" ? "No me presento"
                    : (val === "enero" ? "Enero" : "Junio") + (fch ? ' · ' + fch.slice(8) + '/' + fch.slice(5,7) : '');
            return '<button class="esc-conv-btn' + (elegida === val ? ' on' : '') + '"'
                 + ' onclick="guardarConvocatoria(\'' + f.def.clave + '\',\'' + val + '\')">'
                 + esc(etq) + '</button>';
          }).join("")
        + '</span></div>';
    });
    html += '</div></details>';

    html += '</div>';

    return html;
  };


  /* ---- Temas flojos ----------------------------------------------------
     El progreso solo guarda el id de la pregunta. indice_temas.json dice, en
     rangos, a qué tema pertenece cada id; con eso se agrupan los aciertos por
     tema sin tener que cargar las plataformas enteras. */

  function temaDe(indice, id){
    var r = indice.r, ini = 0, fin = r.length - 1;
    while (ini <= fin) {                       // los rangos vienen ordenados
      var m = (ini + fin) >> 1;
      if (id < r[m][0]) fin = m - 1;
      else if (id > r[m][1]) ini = m + 1;
      else return indice.t[r[m][2]];
    }
    return null;
  }

  var MIN_INTENTOS = 4;   // por debajo, el porcentaje no dice nada

  function temasFlojos(progreso, indices, cuantos){
    var acc = {};
    ASIGNATURAS.forEach(function (a) {
      var idx = indices[a.clave];
      var qs = (progreso[a.clave] || {}).qs || {};
      if (!idx) return;
      for (var id in qs) {
        var h = qs[id] && qs[id].h;
        if (!h || !h.length) continue;
        var tema = temaDe(idx, parseInt(id, 10));
        if (!tema) continue;
        var k = a.clave + "||" + tema;
        if (!acc[k]) acc[k] = { asig: a, tema: tema, bien: 0, total: 0 };
        for (var i = 0; i < h.length; i++) { acc[k].total++; if (h[i][1]) acc[k].bien++; }
      }
    });

    return Object.keys(acc).map(function (k) { return acc[k]; })
      .filter(function (t) { return t.total >= MIN_INTENTOS; })
      .map(function (t) { t.pct = Math.round(t.bien * 100 / t.total); return t; })
      .sort(function (a, b) { return a.pct - b.pct || b.total - a.total; })
      .slice(0, cuantos || 8);
  }

  window.construirFlojos = function (progreso, indices) {
    var flojos = temasFlojos(progreso || {}, indices || {}, 8);
    if (!flojos.length) {
      return '<div class="esc-flojos"><h4>Tus puntos flacos</h4>'
        + '<p class="muted">Aún no hay suficientes respuestas para saberlo. '
        + 'Con unas cuantas sesiones aparecerán aquí los temas que peor llevas.</p></div>';
    }
    var html = '<div class="esc-flojos"><h4>Tus puntos flacos</h4>'
             + '<p class="muted">Los temas con menos aciertos. Toca uno y entras directo.</p>'
             + '<div class="esc-flojos-lista">';
    flojos.forEach(function (t) {
      html += '<a class="esc-flojo" href="' + esc(t.asig.archivo)
        + '#tema=' + encodeURIComponent(t.tema) + '">'
        + '<span class="esc-flojo-pct' + (t.pct < 50 ? ' mal' : '') + '">' + t.pct + '%</span>'
        + '<span class="esc-flojo-txt"><strong>' + esc(t.tema) + '</strong>'
        + '<em>' + t.asig.emoji + ' ' + esc(t.asig.nombre) + ' · ' + t.total + ' respuestas</em></span>'
        + '</a>';
    });
    return html + '</div></div>';
  };


  /* ---- Resumen personal ------------------------------------------------
     Sustituye al sistema de rangos. En vez de un cargo inventado, dos cosas
     que sí dicen algo cuando estudias solo: cuánto llevas dominado de
     verdad y a qué ritmo tienes que ir para llegar al próximo examen. */

  /* Una pregunta cuenta como dominada cuando el intervalo de repaso llega a
     tres semanas: es el corte que usa Anki para dar una tarjeta por madura,
     y evita contar como sabido lo que acabas de acertar una vez. */
  var DIAS_DOMINADA = 21;

  function dominadas(estado){
    var qs = (estado && estado.qs) || {}, n = 0;
    for (var k in qs) { if (qs[k] && qs[k].iv >= DIAS_DOMINADA) n++; }
    return n;
  }

  window.resumenPersonal = function (progreso, examenes) {
    progreso = progreso || {};
    examenes = examenes || {};

    var dom = 0, vistasTot = 0, totalTot = 0, proximo = null;

    ASIGNATURAS.forEach(function (a) {
      var e = progreso[a.clave] || {};
      dom += dominadas(e);
      vistasTot += vistas(e);
      totalTot += a.total;

      var ex = examenes[a.clave];
      var f = fechaExamen(ex);
      if (!f) return;
      var d = diasHasta(f);
      if (d == null || d < 0) return;
      if (!proximo || d < proximo.dias) {
        proximo = {
          asig: a, dias: d,
          sinVer: Math.max(0, a.total - vistas(e)),
          convocatoria: (ex && ex.convocatoria === "junio") ? "junio" : "enero",
        };
      }
    });

    if (proximo) {
      // Ritmo para llegar habiendo visto todo, sin contar el día del examen.
      proximo.ritmo = proximo.dias > 0
        ? Math.ceil(proximo.sinVer / proximo.dias)
        : proximo.sinVer;
    }

    return {
      dominadas: dom,
      vistas: vistasTot,
      total: totalTot,
      proximo: proximo,
    };
  };

  window.ESCRITORIO_ASIGNATURAS = ASIGNATURAS;
})();
