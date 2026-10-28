// Prueba del plan de examen sin navegador: node tools/pruebas/plan_examen.js [plataforma.html]
// (necesita jsdom: NODE_PATH=~/auditoria_medint/higiene/node_modules)
const fs = require("fs"), path = require("path");
const { JSDOM } = require("jsdom");
const raiz = path.join(__dirname, "..", "..");
const pag = process.argv[2] || "plataforma_genetica.html";
let html = fs.readFileSync(path.join(raiz, pag), "utf8");
html = html.replace(/<script[^>]*src="(acceso|sync)\.js[^"]*"[^>]*><\/script>/g, "")
           .replace(/<script[^>]*src="https:[^"]*"[^>]*><\/script>/g, "")
           .replace(/<script src="(entrenador|entrenador_ia|plan_examen)\.js[^"]*"><\/script>/g,
                    (m, n) => "<script>" + fs.readFileSync(path.join(raiz, n + ".js"), "utf8").replace(/<\/script>/g, "<\\/script>") + "</script>");
const errores = [], pendientes = [];
const dom = new JSDOM(html, { runScripts: "dangerously", url: "https://medicopirata.github.io/medicina91143/" + pag, pretendToBeVisual: true,
  beforeParse(w) { w.MPSync = { usar() {} }; w.alert = () => {}; w.confirm = () => true; w.scrollTo = () => {}; w.Element.prototype.scrollIntoView = () => {};
    w.fetch = () => Promise.resolve({ ok: false, json: () => Promise.resolve(null) });
    w.console.warn = (...a) => errores.push(a.join(" ")); w.console.error = (...a) => errores.push(a.join(" ")); } });
const w = dom.window;
function ok(c, m) { if (!c) { console.error("✗ " + m); process.exitCode = 1; } else console.log("✓ " + m); }
setTimeout(() => {
  try {
    const P = w.PlanExamen, E = w.Entrenador;
    ok(P && E, "PlanExamen y Entrenador cargados");
    const p = P.plan();
    ok(p.dias >= 0 && p.fase === (p.dias > 21 ? "cobertura" : p.dias > 7 ? "consolidacion" : "final"), "fase " + p.fase + ", faltan " + p.dias + " días (" + p.fecha + ")");
    ok(p.semanas.length === Math.ceil(p.dias / 7), p.semanas.length + " semanas planificadas");
    ok(p.semanas[0].temas.length > 0, "semana 1: " + p.semanas[0].temas.slice(0, 3).map(t => t.tema + " (" + t.n + ")").join("; "));
    ok(w.document.getElementById("plan-ex"), "panel del plan en la portada");
    // Tipos de origen
    const tipos = {};
    w.eval("ALL_QUESTIONS").forEach(q => { const t = P.tipo(q); tipos[t] = (tipos[t] || 0) + 1; });
    console.log("  orígenes:", JSON.stringify(tipos));
    ok(Object.keys(tipos).length >= 3, "varios orígenes distinguidos");
    // Parciales
    if (P.objetivo() !== "final") {
      const AQ = w.eval("ALL_QUESTIONS"), a = E.ambito();
      const n1 = AQ.filter(q => E.parcialDe(q, a) === 1).length, n2 = AQ.filter(q => E.parcialDe(q, a) === 2).length;
      ok(P.objetivo() === "p1" && /1\.er parcial/.test(P.brief()), "prepara el 1.er parcial (" + n1 + " preguntas; 2.º: " + n2 + "), faltan " + p.dias + " días");
      ok(JSON.stringify(E.ambito().parciales) === "[1]", "el cuadro del entrenador prepara el mismo parcial");
      const fuera = AQ.filter(q => E.parcialDe(q, a) === 2);
      ok(fuera.length && fuera.every(q => P.factor(q) === 0), "lo del 2.º parcial no entra en el plan del 1.º");
      const t2 = new Set(fuera.map(q => E.temaDe(q) || q.topicBase)); console.log("  2.º parcial:", Array.from(t2).slice(0, 12).join(" | "));
      const p1sem = P.plan().semanas.map(s => s.fin).pop();
      ok(p1sem < P.plan().fecha, "las semanas acaban antes del parcial (" + p1sem + ")");
      w.document.querySelector('input[name="plan-obj"][value="p2"]').click();
      w.document.querySelector('input[name="plan-obj"][value="p2"]').dispatchEvent(new w.Event("change"));
      ok(P.objetivo() === "p2" && JSON.stringify(E.ambito().parciales) === "[2]", "cambiar al 2.º parcial desde el panel");
      ok(P.plan().med.tot.n <= n2 + 5, "el plan del 2.º solo mide su materia (" + P.plan().med.tot.n + ")");
      w.document.querySelector('input[name="plan-obj"][value="p1"]').click();
      w.document.querySelector('input[name="plan-obj"][value="p1"]').dispatchEvent(new w.Event("change"));
    }
    // Sesión del entrenador simulada
    E.empezar();
    const S = w.eval("State");
    ok(S.session && S.session.mode === "coach", "sesión del entrenador con " + S.session.questions.length + " preguntas");
    ok(/Plan de examen/.test(w.document.getElementById("q-coach").innerHTML), "el aviso de la 1.ª pregunta trae el plan");
    for (let i = 0; i < 12; i++) {
      const sess = S.session, q = sess.questions[sess.currentIdx];
      w.eval("App").setConf(i % 3 === 0 ? 2 : 1);
      const dc = w.eval("dispCorrect")(q);
      w.eval("App").answer(i % 4 === 0 ? (dc + 1) % q.displayOptions.length : dc);
      if (sess.currentIdx < sess.questions.length - 1) w.eval("App").nextQ();
    }
    if (P.objetivo() === "p1") ok(S.session.questions.every(q => q.ia || E.parcialDe(q, E.ambito()) === 1), "todas las preguntas de la sesión son del 1.er parcial");
    const porPlan = Object.values(S.session.coachPor).filter(x => /Plan de examen/.test(x)).length;
    ok(porPlan > 0, porPlan + " preguntas elegidas por ser del plan de la semana");
    // Peso 0: fuera del entrenador
    const d = P._datos(); d.pesos.refuerzo = 0;
    const qs = w.eval("ALL_QUESTIONS").filter(q => P.tipo(q) === "refuerzo");
    ok(!qs.length || P.factor(qs[0]) === 0, "peso 0 deja fuera las de refuerzo (" + qs.length + ")");
    d.pesos.refuerzo = 0.6;
    // Memoria
    P.recordar([{ idea: "Confunde trisomía 18 con 13", regla: "Edwards = 18", prioridad: "alta" }], [S.session.questions[0].id]);
    const ctx = P.contexto();
    ok(/CONFUSIONES QUE YA DIAGNOSTICASTE/.test(ctx) && /PLAN DE EXAMEN/.test(ctx), "contexto para la IA con plan y memoria");
    const exp = w.EntrenadorIA.expediente(S.session, null);
    ok(!exp || /LO QUE YA SABES DE ÉL/.test(exp.texto), "el expediente de la IA lleva la memoria");
    w.eval("App").finishQuiz();
    ok(w.document.getElementById("plan-cierre"), "cierre de sesión con el plan");
    const f = P.foto();
    ok(typeof f.p === "number", "foto del día: preparación " + f.p + " %");
    // Estrategia con IA simulada (la semana simulada es la de hoy, de lunes a domingo, para que la prueba no caduque)
    function semanaDeHoy() { const d = new Date(), l = new Date(d); l.setDate(d.getDate() - (d.getDay() + 6) % 7); const dm = new Date(l); dm.setDate(l.getDate() + 6);
      const f = (x) => x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0"); return [f(l), f(dm)]; }
    const IA = w.EntrenadorIA; let pedido = "";
    IA.conectada = () => true;
    IA.llamar = (sis, usu) => { pedido = usu; return Promise.resolve({ txt: JSON.stringify({ resumen: "Vas empezando.", hoy: "Haz 20 de citogenética.", alertas: ["Ritmo bajo"],
      semanas: [{ desde: semanaDeHoy()[0], hasta: semanaDeHoy()[1], objetivo: "Citogenética entera", temas: ["Tema 8: Citogenética · anomalías numéricas"], nuevas_dia: 20, repasos_dia: 10 }],
      prioridades: [{ tema: "Tema 8: Citogenética · anomalías numéricas", por_que: "más peso" }] }) }); };
    pendientes.push(P.revisarConIA().then(e => { ok(e.resumen && /TEMAS \(ordenados por peso\)/.test(pedido), "estrategia de la IA guardada (" + pedido.length + " caracteres de contexto)");
      P.pintar(); ok(/Citogenética entera/.test(w.document.getElementById("plan-ex").innerHTML), "la estrategia sale en el panel semana a semana");
      ok(/Haz 20 de citogenética/.test(P.brief()), "y en el aviso de la sesión"); }));
    console.log("\n" + ctx.split("\n").slice(0, 4).join("\n"));
  } catch (e) { console.error("✗ excepción", e.stack); process.exitCode = 1; }
  Promise.all(pendientes).catch(e => { console.error("✗", e); process.exitCode = 1; }).then(() => {
  const malos = errores.filter(e => /plan|entrenador/i.test(e));
  ok(!malos.length, "sin avisos del plan/entrenador" + (malos.length ? ": " + malos.slice(0, 3).join(" | ") : ""));
  process.exit();
  });
}, 1500);
