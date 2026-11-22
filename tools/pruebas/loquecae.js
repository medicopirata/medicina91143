// Prueba del apartado «Lo que va a preguntar» (loquecae.js), sin navegador:
//   NODE_PATH=~/auditoria_medint/higiene/node_modules node tools/pruebas/loquecae.js [plataforma_fisio1.html]
const fs = require("fs"), path = require("path");
const { JSDOM } = require("jsdom");
const raiz = path.join(__dirname, "..", "..");
const pag = process.argv[2] || "plataforma_fisio1.html";
let html = fs.readFileSync(path.join(raiz, pag), "utf8");
html = html.replace(/<script[^>]*src="(acceso|sync)\.js[^"]*"[^>]*><\/script>/g, "")
           .replace(/<script[^>]*src="https:[^"]*"[^>]*><\/script>/g, "")
           .replace(/<script src="(entrenador|entrenador_ia|plan_examen|estudio|loquecae)\.js[^"]*"><\/script>/g,
                    (m, n) => "<script>" + fs.readFileSync(path.join(raiz, n + ".js"), "utf8").replace(/<\/script>/g, "<\\/script>") + "</script>");
const errores = [];
const dom = new JSDOM(html, { runScripts: "dangerously", url: "https://medicopirata.github.io/medicina91143/" + pag, pretendToBeVisual: true,
  beforeParse(w) { w.MPSync = { usar() {} }; w.alert = (m) => errores.push("alert: " + m); w.confirm = () => true; w.scrollTo = () => {}; w.Element.prototype.scrollIntoView = () => {};
    w.fetch = (url) => { const f = path.join(raiz, String(url).split("?")[0]);
      return Promise.resolve(fs.existsSync(f) ? { ok: true, json: () => Promise.resolve(JSON.parse(fs.readFileSync(f, "utf8"))) } : { ok: false, status: 404 }); };
    w.console.warn = (...a) => errores.push(a.join(" ")); w.console.error = (...a) => errores.push(a.join(" ")); } });
const w = dom.window, d = w.document;
function ok(c, m) { if (!c) { console.error("✗ " + m); process.exitCode = 1; } else console.log("✓ " + m); }
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  await espera(400);
  const L = w.LoQueCae, Q = w.eval("ALL_QUESTIONS"), App = w.eval("App"), State = w.eval("State");
  ok(L, "loquecae.js se ha cargado");
  const c = L.conjunto();
  ok(c.lista.length > 1000, "el conjunto reúne " + c.lista.length + " preguntas: " + JSON.stringify(c.cuenta));
  ok(c.lista.every(x => !/^📕/.test(x.q.topicBase)), "ninguna del Guyton");
  ok(c.lista.filter(x => x.g === "examen").every(x => w.PlanExamen.tipo(x.q) === "examen"), "las de «examen» son las que el plan considera de examen");
  ok(c.lista.filter(x => x.g === "tarea").every(x => /^(🎯|💻|🧪|🔬)|^Apuntes: (Cuestionario|Test de clase|Examen real)|^📝 Cuestionarios/.test(x.q.topicBase)), "las de «tarea» vienen de Kahoot, cuestionarios, seminarios, prácticas o campus");
  const vueltas = c.lista.filter(x => x.g === "vuelta");
  ok(vueltas.every(x => x.q.de && w.eval("BY_ID").get(x.q.de)), "cada vuelta (" + vueltas.length + ") apunta a una pregunta base que existe");
  const bl = L.bloques();
  ok(bl.length === Math.max(1, Math.round(c.lista.length / 100)) && bl.every(b => b.length >= 50 && b.length <= 110), bl.length + " bloques de ~100 (" + bl[0].length + "…" + bl[bl.length - 1].length + ")");
  const ids = new Set(bl.flat().map(q => q.id));
  ok(ids.size === c.lista.length, "los bloques reparten todo el conjunto sin repetir");
  const grupos = new Set(bl[0].map(q => L.grupo(q)));
  ok(grupos.size >= 3, "el bloque 1 va mezclado: " + [...grupos].join(", "));
  const otra = (() => { L.bloques._x = 1; return L.bloques()[2].map(q => q.id).join(","); })();
  ok(otra === bl[2].map(q => q.id).join(","), "el reparto es el mismo al recalcularlo");
  // portada y panel
  const btn = d.getElementById("btn-cae");
  ok(btn && /preguntas que sabemos que caen/.test(d.getElementById("cae-desc").textContent), "la portada tiene la tarjeta «Lo que va a preguntar»: " + d.getElementById("cae-desc").textContent);
  btn.click(); await espera(30);
  const panel = d.getElementById("cae-panel");
  ok(panel.open && panel.querySelectorAll(".cae-bloque").length === bl.length, "al pulsarla se abre el panel con los " + bl.length + " bloques");
  ok(panel.querySelector('[data-cae="falladas"]') && panel.querySelector('[data-cae="nuevas"]'), "con los botones de falladas y de sin ver");
  // abrir el bloque 1 y fallar 3 preguntas
  panel.querySelector('.cae-bloque[data-k="0"]').click(); await espera(60);
  let sess = State.session;
  // el motor quita las repetidas entre bancos al juntar varios, así que puede traer alguna menos
  ok(sess && sess.mode === "loquecae" && sess.questions.length >= bl[0].length * 0.9 && sess.questions.length <= bl[0].length, "el bloque 1 abre una sesión con sus " + (sess && sess.questions.length) + " preguntas (" + bl[0].length + " menos las repetidas en otro banco)");
  for (let i = 0; i < 3; i++) { const q = sess.questions[sess.currentIdx], dc = w.eval("dispCorrect")(q); App.setConf(1); App.answer((dc + 1) % q.displayOptions.length); await espera(10); App.nextQ(); await espera(10); }
  App.finishQuiz(); await espera(30); App.showScreen("home"); App.updateHomeStats(); await espera(30);
  const f = L.falladas();
  ok(f.length >= 3, "tras fallar 3, el apartado cuenta " + f.length + " falladas");
  ok(/3 ✗/.test(panel.querySelector('.cae-bloque[data-k="0"]').textContent), "y el bloque 1 lo muestra: " + panel.querySelector('.cae-bloque[data-k="0"] .m').textContent);
  panel.querySelector('[data-cae="falladas"]').click(); await espera(60);
  sess = State.session;
  ok(sess && sess.questions.length >= f.length - 2 && sess.questions.length <= f.length, "«Falladas de este apartado» abre una sesión con esas " + (sess && sess.questions.length));
  App.finishQuiz(); await espera(30); App.showScreen("home"); App.updateHomeStats(); await espera(20);
  // saltar las que ya tengo bien
  const q0 = bl[1][0]; State.data.qs[q0.id] = { a: 1, c: 1, l: 1, h: [[Date.now() / 1000, 1, 0, 1, 3]] };
  panel.querySelector('.cae-bloque[data-k="1"]').click(); await espera(60);
  const sinRep = w.eval("sinRepetidas")(bl[1]).length;
  ok(State.session.questions.length === sinRep - 1, "con «saltar las que ya tengo bien» el bloque 2 abre " + State.session.questions.length + " de " + bl[1].length + " (" + sinRep + " sin repetidas, menos la que ya está bien)");
  ok(!errores.length, "sin errores en consola" + (errores.length ? ": " + errores.slice(0, 3).join(" | ") : ""));
  w.close();
})();
