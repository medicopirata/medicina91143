/* Catálogo de plataformas de la bitácora de estudio.
 *
 * Para añadir o mover una asignatura basta con editar esta lista: el HTML se
 * genera a partir de ella. Antes las tarjetas estaban escritas a mano en
 * index.html y había que tocar el maquetado para cualquier cambio.
 *
 * Una asignatura sin "archivo" sale como pendiente: se ve en su sitio, pero
 * no enlaza a ninguna parte todavía.
 */
(function () {

  var CATALOGO = [
    {
      curso: "Primero",
      color: "curso1",
      bloques: [
        {
          titulo: "1er Cuatrimestre",
          asignaturas: [
            { nombre: "Índice del cuatrimestre", emoji: "📚",
              archivo: "index primero primer cuatrimestre.html",
              nota: "Anatomía I, Biología, Física y demás recursos" },
          ]
        },
        {
          titulo: "2º Cuatrimestre",
          asignaturas: [
            { nombre: "Anatomía Humana II",      emoji: "🦴", archivo: "plataforma_anatomia2.html",     n: 3635 },
            { nombre: "Anatomía Humana II · II", emoji: "🦴", archivo: "plataforma_anatomia2.1.html",   n: 2220 },
            { nombre: "Bioquímica Médica",       emoji: "🧪", archivo: "plataforma_bioquimica.html",    n: 4981 },
            { nombre: "Bioquímica Médica · II",  emoji: "🧪", archivo: "plataforma_bioquimica.1.html",  n: 1593 },
            { nombre: "Fisiología Humana",       emoji: "🫀", archivo: "plataforma_fisio.html",         n: 3838 },
            { nombre: "Fisiología Humana · II",  emoji: "🫀", archivo: "plataforma_fisio.1.html",       n: 1390 },
            { nombre: "Histología y Embriología",      emoji: "🔬", archivo: "plataforma_histoemb.html",   n: 1337 },
            { nombre: "Histología y Embriología · II", emoji: "🔬", archivo: "plataforma_histoemb.1.html", n: 872 },
            { nombre: "Fichas para rellenar", emoji: "🖼️", archivo: "indice rellenar.html",
              nota: "21 láminas de Anatomía II y Embriología, 612 huecos" },
          ]
        },
      ]
    },
    {
      curso: "Segundo",
      color: "curso2",
      actual: true,
      bloques: [
        {
          titulo: "1er Cuatrimestre",
          asignaturas: [
            { nombre: "Histología Especial I", emoji: "🔬", archivo: "plataforma_histologia2.1.html", n: 3494 },
            { nombre: "Fisiología Humana I",   emoji: "🫀", archivo: "plataforma_fisio1.html",        n: 994  },
            { nombre: "Anatomía 3",            emoji: "🧠", archivo: "plataforma_anatomia3.html",     n: 1798 },
            { nombre: "Anatomía 3 · Rellenar", emoji: "🖼️", archivo: "rellenar_anatomia3.html",
              nota: "Las imágenes de los apuntes, con los nombres tapados" },
            { nombre: "Diagnóstico por Imagen", emoji: "🩻" },
          ]
        },
        {
          titulo: "Anuales",
          asignaturas: [
            { nombre: "Medicina Interna (IMI)", emoji: "🩺", archivo: "plataforma_medint.html",   n: 6742 },
            { nombre: "Genética Médica",        emoji: "🧬", archivo: "plataforma_genetica.html", n: 793  },
            { nombre: "Fundamentos de Cirugía", emoji: "🔪" },
          ]
        },
        {
          titulo: "2º Cuatrimestre",
          asignaturas: [
            { nombre: "Fisiología Humana II",   emoji: "🫁", archivo: "plataforma_fisio2.html",    n: 906  },
            { nombre: "Histología Especial II", emoji: "🧫", archivo: "plataforma_histoesp2.html", n: 1968 },
          ]
        },
      ]
    },
  ];

  function esc(t){
    return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function tarjeta(a, color){
    var pendiente = !a.archivo;
    var pie = pendiente ? "Sin plataforma aún"
            : (a.n ? a.n.toLocaleString("es-ES") + " preguntas" : "Abrir");
    return '<a class="cat-card' + (pendiente ? ' pendiente' : '') + '"'
      + (pendiente ? '' : ' href="' + esc(a.archivo) + '"')
      + ' style="--c: var(--' + color + '-color)">'
      + '<span class="cat-emoji">' + a.emoji + '</span>'
      + '<span class="cat-nom">' + esc(a.nombre) + '</span>'
      + '<span class="cat-pie">' + esc(a.nota || pie) + '</span>'
      + '</a>';
  }

  window.construirCatalogo = function () {
    return CATALOGO.map(function (c) {
      var html = '<div class="course-section">'
        + '<div class="course-title" style="color: var(--' + c.color + '-color);'
        + ' border-left: 6px solid var(--' + c.color + '-color);">' + esc(c.curso)
        + (c.actual ? ' <em class="cat-actual">en curso</em>' : '') + '</div>';
      c.bloques.forEach(function (b) {
        html += '<div class="cat-bloque"><h4>' + esc(b.titulo) + '</h4><div class="cat-grid">'
             + b.asignaturas.map(function (a) { return tarjeta(a, c.color); }).join("")
             + '</div></div>';
      });
      return html + '</div>';
    }).join("");
  };

  window.CATALOGO_ESTUDIO = CATALOGO;
})();
