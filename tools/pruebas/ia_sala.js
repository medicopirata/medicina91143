// Prueba del puente entre el entrenador con IA y la sala de estudio, sin navegador ni API:
//   NODE_PATH=~/auditoria_medint/higiene/node_modules node tools/pruebas/ia_sala.js [plataforma.html]
// Hace la batería de un tema fallándolo todo, simula el análisis de la IA y comprueba que
// cada confusión queda ubicada en un apartado de la sala, que el informe lleva el botón
// «📖 Repásalo en la sala» y que ese botón abre el tema en ese apartado. También que el
// origen «🔴 El profesor dijo que cae» pesa en el plan.
const fs = require("fs"), path = require("path");
const { JSDOM } = require("jsdom");
const raiz = path.join(__dirname, "..", "..");
const pag = process.argv[2] || "plataforma_medint.html";
let html = fs.readFileSync(path.join(raiz, pag), "utf8");
html = html.replace(/<script[^>]*src="(acceso|sync)\.js[^"]*"[^>]*><\/script>/g, "")
           .replace(/<script[^>]*src="https:[^"]*"[^>]*><\/script>/g, "")
           .replace(/<script src="(entrenador|entrenador_ia|plan_examen|estudio)\.js[^"]*"><\/script>/g,
                    (m, n) => "<script>" + fs.readFileSync(path.join(raiz, n + ".js"), "utf8").replace(/<\/script>/g, "<\\/script>") + "</script>");
const errores = [];
const dom = new JSDOM(html, { runScripts: "dangerously", url: "https://medicopirata.github.io/medicina91143/" + pag, pretendToBeVisual: true,
  beforeParse(w) { w.MPSync = { usar() {} }; w.alert = (m) => errores.push("alert: " + m); w.confirm = () => true; w.scrollTo = () => {}; w.Element.prototype.scrollIntoView = () => {};
    w.localStorage.setItem("mp_ia_clave", "prueba");
    w.fetch = (url) => {
      // La API de Anthropic, simulada: devuelve lo que la prueba deje en w.__respuestaIA
      if (/api\.anthropic\.com/.test(String(url))) return Promise.resolve({ ok: true, json: () => Promise.resolve({ content: [{ type: "text", text: w.__respuestaIA || "{}" }], usage: {} }) });
      const f = path.join(raiz, String(url).split("?")[0]);
      return Promise.resolve(fs.existsSync(f) ? { ok: true, json: () => Promise.resolve(JSON.parse(fs.readFileSync(f, "utf8"))) } : { ok: false, status: 404 }); };
    w.console.warn = (...a) => errores.push(a.join(" ")); w.console.error = (...a) => errores.push(a.join(" ")); } });
const w = dom.window, d = w.document;
function ok(c, m) { if (!c) { console.error("✗ " + m); process.exitCode = 1; } else console.log("✓ " + m); }
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  await espera(400);
  const E = w.Estudio, P = w.PlanExamen, IA = w.EntrenadorIA;
  const temas = E.indice().temas, te = temas[Math.min(3, temas.length - 1)];
  E.bateria(te.tema, false); await espera(60);
  const S = w.eval("State"), sess = S.session;
  ok(sess && sess.questions.length, "batería de " + (E.indice().temas.find(x => x.tema === te.tema).etiqueta || "Tema " + te.tema) + ": " + sess.questions.length + " preguntas");
  const n = Math.min(4, sess.questions.length);
  for (let i = 0; i < n; i++) {
    const q = sess.questions[sess.currentIdx], dc = w.eval("dispCorrect")(q);
    w.eval("App").setConf(1);
    w.eval("App").answer((dc + 1) % q.displayOptions.length);
    if (i < n - 1) w.eval("App").nextQ();
  }
  const fallada = sess.questions[0];
  w.__respuestaIA = JSON.stringify({
    diagnostico: [{ idea: "Confunde lo que pregunta esto: " + fallada.q.slice(0, 160), prioridad: "alta", motivo_prioridad: "cayó en examen",
      por_que: "eligió otra opción", apuntes: fallada.options[fallada.correct], regla: "Regla de prueba", esquema: { columnas: [], filas: [] } }],
    preguntas: [], consejo: "Relee el apartado." });
  w.eval("App").finishQuiz(); await espera(20);
  const btn = d.querySelector("#ia-res button");
  ok(btn, "botón «Analizar esta sesión con IA» al acabar");
  btn.click(); await espera(400);
  const res = d.getElementById("ia-res");
  ok(/Lo que ha visto la IA/.test(res.textContent), "informe de la IA pintado");
  const ir = res.querySelector(".ia-sala");
  ok(ir, "el informe lleva «📖 Repásalo en la sala»: " + (ir ? ir.textContent : "—"));
  const c = P.confusiones().slice(-1)[0];
  // Vale el tema de la batería o cualquier otro cuya batería tenga también la pregunta fallada
  const temaSala = c && c.sala ? E.indice().temas.find(x => x.tema === c.sala.n) : null;
  const batSala = temaSala ? JSON.parse(fs.readFileSync(path.join(raiz, "estudio", w.eval("STORAGE_KEY").replace(/_study_v\d+$/, ""), temaSala.archivo), "utf8")).bateria : [];
  ok(c && c.sala && (c.sala.n === te.tema || batSala.includes(fallada.id)), "la confusión queda en un tema cuya batería tiene la pregunta fallada (" + (c && c.sala ? c.sala.tit : "sin apartado") + ")");
  ok(c && c.e !== "resuelta", "  y sigue pendiente (" + (c ? c.txt : "") + ")");
  if (ir) {
    ir.click(); await espera(80);
    const scr = d.getElementById("estudio-screen");
    ok(scr && !scr.classList.contains("hidden") && /Apartado/.test(scr.querySelector(".est-donde").textContent), "el botón abre la sala en el apartado: " + (scr ? scr.querySelector(".est-donde").textContent : ""));
    ok(scr.querySelector(".est-caja.confus"), "  y allí sale la confusión pendiente");
  }
  // «🔴 El profesor dijo que cae» pesa como una de examen en el plan
  const q0 = w.eval("ALL_QUESTIONS").find(q => (P.tipo(q) === "entreno" || P.tipo(q) === "clase") && P.factor(q) > 0);  // del parcial que se prepara
  if (q0) {
    const antes = P.factor(q0);
    q0.cae = { p: "Prueba", c: "esto cae", r: "", f: 2 };
    P._datos().pesos.cae += 0.0001; // invalida la caché de pesos
    ok(P.tipo(q0) === "cae" && P.factor(q0) > antes, "una pregunta marcada «cae» pasa de " + antes.toFixed(2) + " a " + P.factor(q0).toFixed(2));
    ok(/El profesor dijo que cae/.test(w.Entrenador.origen(q0).txt), "  y el origen lo dice: " + w.Entrenador.origen(q0).txt);
    delete q0.cae;
  }
  ok(!errores.length, "sin avisos" + (errores.length ? ": " + errores.slice(0, 5).join(" | ") : ""));
})();
