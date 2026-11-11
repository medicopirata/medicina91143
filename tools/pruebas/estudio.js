// Prueba del modo estudio sin navegador: node tools/pruebas/estudio.js [plataforma.html]
// (necesita jsdom: NODE_PATH=~/auditoria_medint/higiene/node_modules)
// Abre cada tema de estudio/<clave>/, recorre todos sus pasos respondiendo y
// comprueba que se pinta sin errores y que la batería arranca una sesión.
const fs = require("fs"), path = require("path");
const { JSDOM } = require("jsdom");
const raiz = path.join(__dirname, "..", "..");
const pag = process.argv[2] || "plataforma_fisio1.html";
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
  await espera(400);
  const E = w.Estudio;
  ok(E && E.indice(), "Estudio cargado con índice");
  const home = d.getElementById("estudio-home");
  ok(home && home.querySelectorAll(".est-fila:not(.prog)").length === E.indice().temas.length, "cuadro en la portada con " + E.indice().temas.length + " temas");
  for (const e of E.indice().temas) {
    E.abrir(e.tema);
    await espera(60);
    const scr = d.getElementById("estudio-screen");
    let pasos = 0, guard = 0, huecosMal = 0;
    while (guard++ < 40) {
      scr.querySelectorAll(".est-velo button").forEach((b) => b.click());
      // responder todas las preguntas pendientes con la primera opción
      for (let k = 0; k < 6; k++) { const op = scr.querySelector(".est-q:not(.hecha) .est-op"); if (!op) break; op.click(); }
      scr.querySelectorAll(".est-hueco").forEach((i) => (i.value = i.getAttribute("data-h")));
      const corr = scr.querySelector('[data-acc="corregir"]'); if (corr) { corr.click(); huecosMal += scr.querySelectorAll(".est-hueco.mal").length; }
      scr.querySelectorAll('[data-acc="expl"][data-v="2"]').forEach((b) => b.click());
      pasos++;
      const sig = scr.querySelector(".est-sigue[data-acc='ir']");
      if (!sig) break;
      sig.click();
    }
    ok(scr.textContent.includes("Tema leído"), "Tema " + e.tema + ": " + pasos + " pasos recorridos hasta la batería");
    const s = E._datos().t[e.tema];
    ok(s.fin, "  marcado como estudiado");
    ok(huecosMal === 0, "  huecos con su propia solución dan bien");
    const bat = scr.querySelector('[data-acc="bat"]');
    bat.click();
    await espera(30);
    ok(w.eval("State.session") && w.eval("State.session").mode === "estudio" && w.eval("State.session").questions.length > 0, "  batería: sesión de " + (w.eval("State.session") ? w.eval("State.session").questions.length : 0) + " preguntas");
    w.eval("App.goHome()");
  }
  w.eval("App.goHome()");
  const h2 = d.getElementById("estudio-home"), n = E.indice().temas.length;
  ok(h2.querySelector(".est-prog") && h2.querySelector("summary").textContent.includes(n + "/" + n + " estudiados"), "progreso en la portada: " + h2.querySelector("summary").textContent.replace(/\s+/g, " ").trim());
  ok(h2.querySelectorAll(".est-mini").length === n, "  barra de avance en cada tema");
  E.abrir(E.indice().temas[0].tema); await espera(60);
  ok(d.querySelector("#estudio-screen .est-donde") && d.querySelectorAll("#estudio-screen .miga.bien, #estudio-screen .miga.floja").length > 0, "  dentro del tema: dónde vas y apartados hechos marcados");
  // Repaso inteligente, «¿qué repaso?» y tutor (con la IA simulada)
  w.eval("App.goHome()");
  ok(d.querySelector("#estudio-home .est-hoy"), "cuadro «Hoy te conviene repasar» en la portada");
  const t0 = E.indice().temas[0].tema;
  E.repaso(t0); await espera(40);
  ok(w.eval("State.session") && w.eval("State.session").questions.length > 0, "repaso inteligente: sesión de " + (w.eval("State.session") ? w.eval("State.session").questions.length : 0) + " preguntas");
  w.eval("App.goHome()");
  E.tutor.abrir(t0); await espera(40);
  const tu = d.getElementById("est-tutor");
  ok(tu && !tu.classList.contains("hidden") && tu.querySelectorAll(".tu-chips button").length >= 5, "tutor abierto con sus atajos");
  tu.querySelector('[data-tu="que"]').click(); await espera(10);
  ok(/Próximo repaso|Lo más urgente|próximo repaso/i.test(tu.textContent), "«¿Qué repaso y cuándo?» responde sin IA");
  if (w.EntrenadorIA) {
    const idBat = w.eval("BY_ID").keys().next().value;
    w.EntrenadorIA.conectada = () => true;
    w.EntrenadorIA.llamar = () => Promise.resolve({ txt: JSON.stringify({ md: "**Clave**: esto se distingue así.", tablas: [{ titulo: "Comparación", columnas: ["", "A", "B"], filas: [["x", "1", "2"]] }], ids: [idBat], nuevas: [{ q: "¿Pregunta nueva?", opciones: ["a", "b", "c", "d"], correcta: 1, explicacion: "Porque b." }] }) });
    E.tutor.abrir(t0); await espera(20);
    const inp = d.getElementById("est-tutor-in"); inp.value = "Hazme una tabla";
    d.querySelector('#est-tutor [data-tu="enviar"]').click(); await espera(120);
    ok(/Comparación/.test(tu.innerHTML) && tu.querySelector('[data-tu="hacer"]'), "tutor con IA: tabla y botón para hacer las preguntas");
    tu.querySelector('[data-tu="nota"]').click(); await espera(10);
    ok((E._datos().t[t0].notas || []).length === 1, "  la respuesta se guarda como nota del tema");
    tu.querySelector('[data-tu="hacer"]').click(); await espera(30);
    ok(w.eval("State.session") && w.eval("State.session").questions.length === 2, "  y lanza la sesión con la de la batería y la nueva");
    w.eval("App.goHome()");

    // «Explícalo» corregido por la IA: guarda lo escrito, pone la nota y apunta la confusión en su apartado
    const te = E.indice().temas.find((e) => true);
    E.abrir(te.tema); await espera(40);
    const pasosT = E._datos().t[te.tema];
    const tT = await new Promise((r) => { E.abrir(te.tema); setTimeout(() => r(w.eval("1")), 30); });
    const scr = d.getElementById("estudio-screen");
    // ir al paso «explícalo»
    const miga = Array.from(scr.querySelectorAll(".miga")).find((b) => b.textContent.includes("🗣"));
    if (miga) {
      miga.click(); await espera(20);
      const ta = scr.querySelector(".est-expl textarea");
      ta.value = "Mi explicación de prueba"; ta.dispatchEvent(new w.Event("input", { bubbles: true }));
      ok(E._datos().t[te.tema].explTxt && E._datos().t[te.tema].explTxt[0] === "Mi explicación de prueba", "explícalo: lo escrito se guarda");
      const sec0 = (await new Promise((r) => r(null)));
      w.EntrenadorIA.llamar = () => Promise.resolve({ txt: JSON.stringify({ nivel: 1, nota: 6, bien: ["Idea A"], falta: ["Idea B, que el profesor dijo que cae"], errores: ["X → Y"],
        confusion: { idea: scr.querySelector(".est-expl .est-q-txt").textContent.slice(0, 80), regla: "Regla corta" }, consejo: "Relee el apartado 1." }) });
      w.EntrenadorIA.trozos = () => Promise.resolve([]);
      scr.querySelector('[data-acc="corrige"]').click(); await espera(60);
      ok(/6\/10/.test(scr.textContent) && /Lo que te falta/.test(scr.textContent) && scr.querySelector(".est-expl textarea").value === "Mi explicación de prueba", "  la IA corrige: nota, lo que falta, y el texto sigue ahí");
      ok(E._datos().t[te.tema].expl[0] === 1, "  la nota de la IA queda como autoevaluación (a medias)");
      const cf = w.PlanExamen.confusiones().slice(-1)[0];
      ok(cf && cf.de === "explícalo" && cf.sala && cf.sala.n === te.tema, "  la confusión queda apuntada con su apartado (" + (cf && cf.sala ? cf.sala.tit : "sin apartado") + ")");
      scr.querySelector('.miga[data-i="0"]').click(); await espera(20);
      ok(scr.querySelector(".est-caja.confus") && scr.querySelector('.est-caja.confus [data-acc="conf-ir"]'), "  en el inicio del tema sale la confusión con un botón a su apartado");
      scr.querySelector('.est-caja.confus [data-acc="conf-ir"]').click(); await espera(20);
      ok(scr.querySelector(".est-caja.confus") && /Apartado/.test(scr.querySelector(".est-donde").textContent), "  y en el apartado también");
      w.eval("App.goHome()");
      ok(/confusión pendiente/.test(d.getElementById("estudio-home").textContent), "  y en «Hoy te conviene repasar»");
      E.abrir(te.tema, 0); await espera(20);
      scr.querySelector('.est-caja.confus [data-acc="conf-ok"]').click(); await espera(20);
      ok(!scr.querySelector(".est-caja.confus") && w.PlanExamen.confusiones().slice(-1)[0].e === "resuelta", "  «Ya lo tengo claro» la da por resuelta");
      w.eval("App.goHome()");
    }
    // Las que más caen van primero en la batería
    const t1 = E.indice().temas[0].tema;
    E.bateria(t1, false); await espera(40);
    const qsB = w.eval("State.session").questions, val = (q) => w.PlanExamen.factor(q);
    let orden = true; for (let k = 1; k < qsB.length; k++) if (Math.round(val(qsB[k]) * 4) > Math.round(val(qsB[k - 1]) * 4)) orden = false;
    ok(orden, "batería ordenada por lo que más cae (" + qsB.filter((q) => val(q) > 1.5).length + " de " + qsB.length + " primero)");
    w.eval("App.goHome()");
    // El informe de la IA tras una sesión lleva a la sala
    const ub = await E.ubicar([{ idea: (w.eval("BY_ID").get(E._datos && qsB[0].id) || qsB[0]).q }], [qsB[0].id]);
    ok(ub[0] && typeof ub[0].n === "number", "ubicar: la confusión de una pregunta de la batería cae en " + (ub[0] ? ub[0].tit : "ningún apartado"));
  }
  // Tutor durante la batería: botón flotante en la pantalla de preguntas
  {
    const t0 = E.indice().temas[0].tema;
    E.abrir(t0, 0); await espera(60);
    E.bateria(t0); await espera(60);
    const bq = d.getElementById("est-tutor-quiz");
    ok(bq && !bq.classList.contains("hidden") && !d.getElementById("quiz-screen").classList.contains("hidden"), "tutor en la batería: botón visible en la pantalla de preguntas");
    bq.click(); await espera(30);
    const tp = d.getElementById("est-tutor");
    ok(tp && !tp.classList.contains("hidden") && tp.textContent.includes(E.indice().temas[0].titulo), "  abre el tutor del tema");
    tp.querySelector('[data-tu="cerrar"]').click();
    w.eval("App.goHome()"); await espera(30);
    ok(bq.classList.contains("hidden"), "  fuera de la batería no sale");
  }
  // Hacer el tema otra vez desde cero: se borran sus respuestas, pero sigue contando como estudiado
  {
    const t0 = E.indice().temas[0].tema, s0 = E._datos().t[t0];
    const antes = Object.keys(s0.resp).length, nEst = d.querySelector("#estudio-home summary").textContent.match(/(\d+)\/(\d+) estudiados/)[0];
    E.abrir(t0, 0); await espera(60);
    const scr = d.getElementById("estudio-screen");
    let bt = scr.querySelector('[data-acc="reini"]');
    ok(bt && antes > 0, "reiniciar: botón en el inicio del tema (" + antes + " respuestas guardadas)");
    bt.click();
    ok(Object.keys(E._datos().t[t0].resp).length === antes && bt.classList.contains("seguro"), "  el primer toque solo pregunta");
    bt.click(); await espera(20);
    const s1 = E._datos().t[t0];
    ok(!Object.keys(s1.resp).length && !Object.keys(s1.huecos).length && s1.paso === 0 && s1.fin && s1.vueltas.length === 1, "  el segundo borra las respuestas y deja el tema como estudiado");
    ok(/Vuelta 2/.test(scr.textContent) && !scr.querySelector('[data-acc="reini"]'), "  el inicio dice que es la vuelta 2");
    scr.querySelector(".est-sigue[data-acc='ir']").click(); await espera(20);
    ok(scr.querySelector(".est-q:not(.hecha)"), "  las preguntas salen otra vez sin responder");
    w.eval("App.goHome()"); await espera(30);
    ok(d.querySelector("#estudio-home summary").textContent.includes(nEst), "  la portada sigue contando lo estudiado (" + nEst + ")");
  }
  // Lección cambiada desde la última visita: marca en la portada, caja en el inicio y apartados señalados
  {
    const ec = E.indice().temas.filter((e) => e.mod && (e.nov || []).some((c) => c.s.length && e.sh.some((x) => c.s.includes(x)))).slice(-1)[0];
    if (ec) {
      const c = ec.nov.filter((c) => c.s.length && ec.sh.some((x) => c.s.includes(x))).slice(-1)[0];
      E._datos().t[ec.tema].vis = c.t - 1000;
      w.eval("App.goHome()"); await espera(30);
      const fila = [...d.querySelectorAll("#estudio-home .est-tema")].find((b) => +b.getAttribute("data-n") === ec.tema);
      ok(fila && /Cambiada el/.test(fila.textContent) && /cambiada/.test(d.querySelector("#estudio-home summary").textContent), "cambiada: " + (ec.etiqueta || "Tema " + ec.tema) + " sale marcada en la portada");
      E.abrir(ec.tema, 0); await espera(60);
      const scr = d.getElementById("estudio-screen"), caja = scr.querySelector(".est-nuevo-caja");
      const nSec = ec.sh.filter((x) => ec.nov.some((k) => k.t > c.t - 1000 && k.s.includes(x))).length;
      ok(caja && caja.querySelectorAll('[data-acc="ir"]').length === nSec && scr.querySelectorAll(".miga.nueva").length === nSec, "  al abrirla, el inicio dice qué " + nSec + " apartados cambiaron y las migas los señalan");
      caja.querySelector('[data-acc="ir"]').click(); await espera(20);
      ok(/cambiado desde tu última visita/.test(scr.querySelector("h2").textContent), "  y el apartado lleva su marca");
      w.eval("App.goHome()"); await espera(30);
      const fila2 = [...d.querySelectorAll("#estudio-home .est-tema")].find((b) => +b.getAttribute("data-n") === ec.tema);
      ok(!/Cambiada el/.test(fila2.textContent), "  abierta ya no sale como cambiada en la portada");
    } else console.log("· sin temas con cambios en el historial: no pruebo la marca de cambiada");
  }
  // Programa de repaso: apartado de solo preguntas, en exámenes fijos, detrás de su tema
  for (const g of E.indice().programas || []) {
    w.eval("App.goHome()"); await espera(30);
    const fila = d.querySelector('#estudio-home [data-est="prog"][data-a="' + g.archivo + '"]');
    const filas = [...d.querySelectorAll("#estudio-home .est-fila")], tras = filas[filas.indexOf(fila && fila.parentNode) - 1];
    ok(fila && tras && +tras.querySelector(".est-tema").getAttribute("data-n") === g.despues, "programa: «" + g.titulo + "» sale detrás del tema " + g.despues);
    fila.click(); await espera(60);
    const scr = d.getElementById("estudio-screen");
    ok(!scr.classList.contains("hidden") && scr.querySelectorAll(".est-pex").length === g.examenes.length, "  abre su pantalla con " + g.examenes.length + " exámenes (" + g.examenes.join("/") + ")");
    ok(scr.querySelector('[data-acc="pmodo"][data-v="cada"].act'), "  por defecto corrige cada pregunta");
    scr.querySelector('[data-acc="pex"][data-i="1"]').click(); await espera(40);
    const qmal = w.eval("State.session.questions[State.session.currentIdx].id"), dc = w.eval("dispCorrect(State.session.questions[State.session.currentIdx])");
    d.querySelectorAll("#q-options .opt-btn")[dc === 0 ? 1 : 0].click(); await espera(20);
    ok(!d.getElementById("q-explanation").classList.contains("hidden") && d.querySelectorAll("#q-options .correct").length > 0, "  al responder corrige y enseña la explicación");
    ok(E._datos().pf[g.archivo].includes(qmal), "  el fallo queda apuntado en el programa");
    w.eval("App.goHome()"); await espera(30);
    d.querySelector('#estudio-home [data-est="prog"][data-a="' + g.archivo + '"]').click(); await espera(60);
    const nf = E._datos().pf[g.archivo].length;
    ok(scr.querySelector('[data-acc="pex"][data-i="fall"]') && scr.querySelector('[data-acc="pex"][data-i="fall"]').textContent.includes("(" + nf), "  «Repasar todas las que he fallado» cuenta " + nf);
    scr.querySelector('[data-acc="pex"][data-i="fall"]').click(); await espera(40);
    const ses0 = w.eval("State.session");
    ok(ses0 && ses0.questions.some(q => q.id === qmal), "  y la fallada entra en ese repaso");
    const i0 = ses0.questions.findIndex(q => q.id === qmal);
    w.eval("State.session.currentIdx = " + i0 + "; App.renderQuizQuestion()"); await espera(10);
    w.eval("App.answer(dispCorrect(State.session.questions[" + i0 + "]))"); await espera(10);
    ok(E._datos().pf[g.archivo].includes(qmal), "  acertarla después no la quita de las falladas");
    w.eval("App.goHome()"); await espera(30);
    d.querySelector('#estudio-home [data-est="prog"][data-a="' + g.archivo + '"]').click(); await espera(60);
    scr.querySelector('[data-acc="pmodo"][data-v="examen"]').click(); await espera(10);
    scr.querySelector('[data-acc="pex"][data-i="0"]').click(); await espera(40);
    let ses = w.eval("State.session");
    ok(ses && ses.exam && ses.questions.length >= g.examenes[0] * 0.8, "  el examen 1 empieza como simulacro con " + (ses && ses.questions.length) + " preguntas");
    w.eval("App.finishQuiz()"); await espera(30);
    const reg = E._datos().p[g.archivo];
    ok(reg && reg[0] && reg[0].length === 1 && d.getElementById("est-prog-volver"), "  al acabar se apunta la nota y sale «Volver al programa»");
    d.getElementById("est-prog-volver").click(); await espera(60);
    ok(/Último/.test(scr.querySelector(".est-pex").textContent) && scr.querySelector(".est-pex.sig") === scr.querySelectorAll(".est-pex")[1], "  el examen 1 enseña su nota y el 2 queda como el siguiente");
    scr.querySelector('[data-acc="pmodo"][data-v="cada"]').click(); await espera(10);
    scr.querySelector('[data-acc="pex"][data-i="azar"]').click(); await espera(40);
    ses = w.eval("State.session");
    const bq = d.getElementById("est-tutor-quiz");
    ok(ses && !ses.exam && ses.mode === "estudio" && bq && !bq.classList.contains("hidden"), "  corrigiendo cada pregunta: modo estudio y botón del tutor");
    bq.click(); await espera(30);
    const tp = d.getElementById("est-tutor");
    ok(tp && !tp.classList.contains("hidden"), "  el tutor se abre con el tema de la pregunta en curso");
    tp.querySelector('[data-tu="cerrar"]').click();
    w.eval("App.goHome()"); await espera(30);
    ok(/1\/\d+ hechos/.test(d.querySelector('#estudio-home [data-est="prog"]').textContent), "  la portada cuenta los exámenes hechos");
  }
  // La sala llega a «Qué hacer hoy», al plan de la portada y a la IA del entrenador
  w.eval("App.goHome()"); await espera(60);
  const filasSala = E.filas();
  ok(filasSala.length && /temas estudiados/.test(filasSala[0]), "la sala se resume para «qué hacer hoy»: " + filasSala[0].replace(/<[^>]+>/g, "").slice(0, 90));
  w.eval("App.showStats()"); await espera(20);
  ok(/Sala de estudio/.test(d.getElementById("stats-todo").textContent), "  sale en «🎯 Qué hacer hoy» de las estadísticas");
  const bs = d.querySelector('#stats-todo [data-sala]');
  if (bs) { bs.click(); await espera(60); const fue = bs.getAttribute("data-sala");
    ok(d.getElementById("stats-panel").classList.contains("hidden") && !d.getElementById(fue === "rep" ? "quiz-screen" : "estudio-screen").classList.contains("hidden"), "  y su botón (" + fue + ") cierra las estadísticas y lo abre"); w.eval("App.goHome()"); await espera(30); }
  // Un día solo leyendo en la sala cuenta como día de estudio (racha, ritmo del plan y la IA)
  const hoyK = (() => { const t = new Date(); return new Date(t.getTime() - t.getTimezoneOffset() * 60000).toISOString().slice(0, 10); })();
  ok(E.diaSala(hoyK), "la sala apunta hoy como día de estudio");
  w.eval("State.data.daily = {}");
  ok(w.eval("streakDays()") >= 1, "  la racha cuenta los días de sala sin preguntas");
  if (w.PlanExamen) {
    w.PlanExamen.plan && w.eval("PlanExamen.pintar()");
    if (w.PlanExamen.plan().fase) ok(/en la sala de estudio/.test(w.PlanExamen.contexto()), "  y el ritmo que recibe la IA también");
    const np = w.PlanExamen.objetivo();
    if (np !== "final") {
      const r = E.resumen(), fuera = E.indice().temas.filter(e => !E.entraTema(e));
      ok(r.parcial && r.total + r.fuera === E.indice().temas.length, "  prepara el " + np + ": la sala cuenta " + r.total + " temas y deja fuera " + r.fuera + " (" + fuera.map(e => e.etiqueta).join(", ") + ")");
      ok(/Preparas el/.test(d.getElementById("stats-todo").textContent), "  «Qué hacer hoy» dice qué parcial se prepara");
    }
  }
  if (w.PlanExamen) {
    ok(d.getElementById("plan-sala") && /temas estudiados/.test(d.getElementById("plan-sala").textContent), "  sale en el plan de examen, bajo «Hacer lo de hoy»");
    ok(/SALA DE ESTUDIO/.test(w.PlanExamen.contexto()), "  la IA del entrenador y del plan la recibe");
    ok(!w.PlanExamen.brief() || /Sala:/.test(w.PlanExamen.brief()), "  y el resumen del entrenador la nombra");
  }
  ok(!errores.length, "sin avisos" + (errores.length ? ": " + errores.slice(0, 5).join(" | ") : ""));
})();
