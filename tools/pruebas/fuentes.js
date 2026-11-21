// Prueba de las casillas del Guyton (teoría / casos clínicos) en Fisiología I, sin navegador:
//   NODE_PATH=~/auditoria_medint/higiene/node_modules node tools/pruebas/fuentes.js [plataforma_fisio1.html]
// Carga la página con las dos casillas marcadas, con solo los casos fuera y con las dos fuera, y
// comprueba que lo quitado desaparece de ALL_QUESTIONS, de la rejilla de temas, del plan y de las
// baterías de la sala, y que las casillas están en la portada, en el entrenador y en la sala.
const fs = require("fs"), path = require("path");
const { JSDOM } = require("jsdom");
const raiz = path.join(__dirname, "..", "..");
const pag = process.argv[2] || "plataforma_fisio1.html";
let html = fs.readFileSync(path.join(raiz, pag), "utf8");
html = html.replace(/<script[^>]*src="(acceso|sync)\.js[^"]*"[^>]*><\/script>/g, "")
           .replace(/<script[^>]*src="https:[^"]*"[^>]*><\/script>/g, "")
           .replace(/<script src="(entrenador|entrenador_ia|plan_examen|estudio)\.js[^"]*"><\/script>/g,
                    (m, n) => "<script>" + fs.readFileSync(path.join(raiz, n + ".js"), "utf8").replace(/<\/script>/g, "<\\/script>") + "</script>");
const clave = (html.match(/const STORAGE_KEY = '([^']+)'/) || [])[1], asig = clave.replace(/_study_v\d+$/, "");
const todas = JSON.parse(html.match(/const ALL_QUESTIONS = (\[.*?\]);\n/s)[1]), porId = new Map(todas.map(q => [q.id, q]));
const esGuyton = (t) => /^📕 Guyton/.test(t), caso = (q) => esGuyton(q.topicBase) && q.cc === 1, teoria = (q) => esGuyton(q.topicBase) && !q.cc;
const nCasos = todas.filter(caso).length, nTeoria = todas.filter(teoria).length, total = todas.length;
function ok(c, m) { if (!c) { console.error("✗ " + m); process.exitCode = 1; } else console.log("✓ " + m); }
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
function cargar(fuentes) {
  const errores = [];
  const dom = new JSDOM(html, { runScripts: "dangerously", url: "https://medicopirata.github.io/medicina91143/" + pag, pretendToBeVisual: true,
    beforeParse(w) { w.MPSync = { usar() {} }; w.alert = (m) => errores.push("alert: " + m); w.confirm = () => true; w.scrollTo = () => {}; w.Element.prototype.scrollIntoView = () => {};
      if (fuentes) w.localStorage.setItem(clave + "_fuentes", JSON.stringify(fuentes));
      w.fetch = (url) => { const f = path.join(raiz, String(url).split("?")[0]);
        return Promise.resolve(fs.existsSync(f) ? { ok: true, json: () => Promise.resolve(JSON.parse(fs.readFileSync(f, "utf8"))) } : { ok: false, status: 404 }); };
      w.console.warn = (...a) => errores.push(a.join(" ")); w.console.error = (...a) => errores.push(a.join(" ")); } });
  return { w: dom.window, d: dom.window.document, errores };
}
(async () => {
  ok(nCasos > 100 && nTeoria > 100, "el archivo marca " + nCasos + " casos clínicos y " + nTeoria + " de teoría en el Guyton (" + total + " preguntas en total)");

  // --- las dos casillas marcadas (por defecto)
  let { w, d, errores } = cargar(null);
  await espera(400);
  let Q = w.eval("ALL_QUESTIONS");
  ok(Q.length === total, "por defecto están todas: " + Q.length);
  let c1 = d.querySelector('#fuentes-portada input[data-fuente="guyton-teoria"]'), c2 = d.querySelector('#fuentes-portada input[data-fuente="guyton-casos"]');
  ok(c1 && c1.checked && c2 && c2.checked, "la portada lleva las casillas «Teoría» y «Casos clínicos», marcadas");
  ok(/Preguntas del Guyton/.test(d.getElementById("fuentes-portada").textContent), "con el rótulo «📕 Preguntas del Guyton»");
  w.Entrenador.abrir(); await espera(50);
  ok(d.querySelectorAll('#coach-ambito input[data-fuente]').length === 2, "el cuadro del entrenador lleva las dos casillas");
  ok(d.querySelectorAll('#estudio-home input[data-fuente]').length === 2, "la sala de estudio lleva las dos casillas");
  const f = w.Entrenador.fuentes();
  ok(f.length === 2 && f[0].n === nTeoria && f[1].n === nCasos && f.every(x => x.activa), "Entrenador.fuentes() las describe: " + JSON.stringify(f));
  ok(!errores.length, "sin errores en consola" + (errores.length ? ": " + errores.join(" | ") : ""));
  w.close();

  // --- solo los casos clínicos fuera
  ({ w, d, errores } = cargar({ "guyton-casos": 0 }));
  await espera(400);
  Q = w.eval("ALL_QUESTIONS");
  ok(Q.length === total - nCasos && !Q.some(caso) && Q.filter(teoria).length === nTeoria, "sin casos clínicos quedan " + Q.length + " preguntas y toda la teoría del Guyton sigue");
  c2 = d.querySelector('#fuentes-portada input[data-fuente="guyton-casos"]');
  ok(c2 && !c2.checked && /fuera/.test(c2.parentNode.textContent), "la casilla «Casos clínicos» está desmarcada y dice «fuera»");
  const TN = w.eval("TOPIC_NAMES");
  ok(TN.some(esGuyton), "los bancos del Guyton con teoría siguen en la rejilla");
  w.close();

  // --- las dos fuera
  ({ w, d, errores } = cargar({ "guyton-teoria": 0, "guyton-casos": 0 }));
  await espera(400);
  Q = w.eval("ALL_QUESTIONS");
  ok(Q.length === total - nCasos - nTeoria && !Q.some(q => esGuyton(q.topicBase)), "sin Guyton quedan " + Q.length + " preguntas, ninguna 📕");
  ok(!w.eval("TOPIC_NAMES").some(esGuyton) && ![...w.eval("BY_TOPIC").keys()].some(esGuyton) && !Object.keys(w.eval("TOPIC_COUNTS")).some(esGuyton), "ningún banco 📕 en TOPIC_NAMES, BY_TOPIC ni TOPIC_COUNTS");
  ok(![...d.querySelectorAll("#topics-grid .topic-card")].some(c => esGuyton(c.dataset.topic)), "la rejilla de temas no muestra bancos del Guyton");
  ok(d.getElementById("total-q-count").textContent.replace(/\D/g, "") === String(Q.length), "la portada cuenta " + Q.length + " preguntas");
  ok(/no entra ninguna pregunta del Guyton/.test(d.getElementById("fuentes-portada").textContent), "y avisa de que no entra ninguna del Guyton");
  const temas = w.Estudio.indice().temas, te = temas.find(t => t.tema === 4) || temas[3];
  w.Estudio.bateria(te.tema, false); await espera(80);
  const sess = w.eval("State").session;
  const bat = JSON.parse(fs.readFileSync(path.join(raiz, "estudio", asig, "tema-" + String(te.tema).padStart(2, "0") + ".json"), "utf8")).bateria;
  const esperadas = bat.filter(id => porId.has(id) && !esGuyton(porId.get(id).topicBase)).length;
  ok(sess && sess.questions.length === esperadas && !sess.questions.some(q => esGuyton(q.topicBase)), "la batería del tema " + te.tema + " trae " + (sess && sess.questions.length) + " preguntas, ninguna del Guyton (la lista tiene " + bat.length + ")");
  const med = w.PlanExamen.plan().med;
  ok(med && med.tot.n <= Q.length && ![...med.temas.keys()].some(esGuyton), "el plan de examen no pesa ningún banco 📕 (" + med.tot.n + " preguntas)");
  ok(!errores.length, "sin errores en consola" + (errores.length ? ": " + errores.join(" | ") : ""));
  w.close();
})();
