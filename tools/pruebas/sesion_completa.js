// Prueba de la «🏁 Sesión completa de hoy» sin navegador: node tools/pruebas/sesion_completa.js [plataforma.html]
// (necesita jsdom: NODE_PATH=~/auditoria_medint/higiene/node_modules)
// Arranca la sesión completa, falla a propósito unas cuantas y comprueba que la cola sigue
// hasta cumplir lo de hoy y consolidar los fallos, y que la ronda final repite las falladas.
const fs = require("fs"), path = require("path");
const { JSDOM } = require("jsdom");
const raiz = path.join(__dirname, "..", "..");
const pag = process.argv[2] || "plataforma_anatomia3.html";
let html = fs.readFileSync(path.join(raiz, pag), "utf8");
html = html.replace(/<script[^>]*src="(acceso|sync)\.js[^"]*"[^>]*><\/script>/g, "")
           .replace(/<script[^>]*src="https:[^"]*"[^>]*><\/script>/g, "")
           .replace(/<script src="(entrenador|entrenador_ia|plan_examen|estudio)\.js[^"]*"><\/script>/g,
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
  await espera(600);
  const P = w.PlanExamen, En = w.Entrenador;
  w.eval("App.goHome()"); await espera(30);
  const bot = d.getElementById("plan-completa");
  if (!bot && !(P && P.plan().fase)) { ok(true, "sin fecha de examen no hay plan ni sesión completa"); process.exit(); }
  ok(bot, "el plan enseña «🏁 Sesión completa de hoy»: " + (bot && bot.nextElementSibling ? bot.nextElementSibling.textContent.slice(0, 80) : ""));
  const pide = En.nuevasHoy().quedan;
  bot.click(); await espera(30);
  let ses = w.eval("State.session");
  ok(ses && ses.mode === "coach" && ses.completa && ses.completa.nuevas === pide, "  arranca una sesión del entrenador que pide " + pide + " nuevas");
  ok(/Sesión completa de hoy/.test(d.getElementById("q-coach").textContent), "  la primera pregunta dice lo que falta");
  const cont = d.getElementById("q-progress").textContent, venc0 = ses.completa.pend.venc;
  ok(cont === "1 / " + (pide + venc0), "  el contador enseña el total del día (" + pide + " nuevas + " + venc0 + " repasos): «" + cont + "»");
  ok(/vas por la 1/.test(d.getElementById("q-coach").textContent) && new RegExp(String(pide + venc0) + " preguntas").test(d.getElementById("q-coach").textContent), "  y el aviso también");
  // Responder: falla unas cuantas al principio (alguna seguida del mismo tema) y luego acierta
  let n = 0, fallos = 0, maxCola = 0, guard = 0, consolida = false;
  while (guard++ < 1500) {
    ses = w.eval("State.session");
    const q = ses.questions[ses.currentIdx], dc = w.eval("dispCorrect(State.session.questions[State.session.currentIdx])");
    const mal = n < 24 && n % 3 !== 2;
    w.eval("App.answer(" + (mal ? (dc === 0 ? 1 : 0) : dc) + ")"); if (mal) fallos++;
    n++;
    if (/hasta que aciertes dos seguidas/.test((ses.coachDec || {})[q.id] || "")) consolida = true;
    maxCola = Math.max(maxCola, ses.questions.length - ses.currentIdx - 1);
    if (ses.currentIdx >= ses.questions.length - 1) break;
    w.eval("App.nextQ()"); await espera(0);
  }
  ses = w.eval("State.session");
  ok(n >= pide && n < pide + 80 && maxCola >= 5, "  la cola se alarga sola: " + n + " preguntas (" + fallos + " falladas a propósito), siempre con " + maxCola + " por delante");
  ok(consolida, "  en un tema que no controla sigue hasta acertar dos seguidas");
  ok(ses.completa.pend && ses.completa.pend.fin, "  se acaba cuando no queda nada de lo de hoy: " + JSON.stringify(ses.completa.pend));
  w.eval("App.nextQ()"); await espera(30);
  let res = d.getElementById("coach-res");
  ok(res && res.querySelector("[data-ronda]"), "  al acabar propone la ronda final con las falladas: " + (res ? res.querySelector(".plan-brief").textContent.slice(0, 90) : ""));
  // Ronda 1: falla una; ronda 2: todo bien → concluida
  res.querySelector("[data-ronda]").click(); await espera(30);
  ses = w.eval("State.session");
  ok(ses.completa.ronda === 1 && ses.questions.length === fallos, "  la ronda 1 trae las " + ses.questions.length + " falladas");
  for (let i = 0; i < ses.questions.length; i++) {
    const q = w.eval("State.session").questions[i], dc = w.eval("dispCorrect(State.session.questions[State.session.currentIdx])");
    w.eval("App.answer(" + (i === 0 ? (dc === 0 ? 1 : 0) : dc) + ")");
    if (i < ses.questions.length - 1) w.eval("App.nextQ()");
  }
  ok(w.eval("State.session").questions.length === fallos, "  la ronda no se replanifica");
  w.eval("App.nextQ()"); await espera(30);
  res = d.getElementById("coach-res");
  ok(res && /Ronda 1 hecha/.test(res.textContent) && res.querySelector('[data-ronda="2"]'), "  sigue fallando 1: otra ronda");
  res.querySelector("[data-ronda]").click(); await espera(30);
  ses = w.eval("State.session");
  ok(ses.questions.length === 1, "  la ronda 2 trae solo la que seguía fallada");
  w.eval("App.answer(dispCorrect(State.session.questions[0]))"); w.eval("App.nextQ()"); await espera(30);
  res = d.getElementById("coach-res");
  ok(res && /Sesión de hoy concluida/.test(res.textContent), "  acertadas todas: «✅ Sesión de hoy concluida»");
  ok(res.querySelector("[data-mas]"), "  y ofrece «➕ Un poco más»");
  res.querySelector("[data-mas]").click(); await espera(30);
  ses = w.eval("State.session");
  ok(ses.completa && ses.completa.modo === "extra" && ses.completa.nuevas === 15 && /Un poco más/.test(d.getElementById("q-coach").textContent), "  «un poco más» arranca otra sesión completa de 15 nuevas");
  // Lo atrasado al principio
  w.eval("App.goHome()"); await espera(30);
  const at = En.atraso(), batr = d.getElementById("plan-atrasado");
  ok(!at.n || batr, "  si hay atraso (" + at.n + " nuevas en " + at.dias + " días), el plan ofrece «⏪ Hoy + lo atrasado»");
  if (batr) { const hoyN = En.nuevasHoy().quedan; batr.click(); await espera(30); ses = w.eval("State.session"); ok(ses.completa.modo === "atrasado" && ses.completa.nuevas === hoyN + at.n, "  y suma lo atrasado a lo de hoy (" + ses.completa.nuevas + " nuevas)"); }
  // Parar a medias deja seguir
  w.eval("App.goHome()"); await espera(30);
  d.getElementById("plan-completa").click(); await espera(30);
  w.eval("App.answer(0)"); w.eval("App.finishQuiz()"); await espera(30);
  res = d.getElementById("coach-res");
  ok(res && (/Has parado/.test(res.textContent) || /concluida|hecho/.test(res.textContent)), "  si se para antes, ofrece seguir: " + (res ? res.querySelector(".plan-brief").textContent.slice(0, 80) : ""));
  ok(!errores.length, "sin avisos" + (errores.length ? ": " + errores.slice(0, 5).join(" | ") : ""));
  process.exit();
})();
