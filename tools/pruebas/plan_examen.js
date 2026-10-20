// Prueba del plan de examen sin navegador: node tools/pruebas/plan_examen.js [plataforma.html]
// (necesita jsdom: NODE_PATH=~/auditoria_medint/higiene/node_modules)
const fs = require("fs"), path = require("path");
const { JSDOM } = require("jsdom");
const raiz = path.join(__dirname, "..", "..");
const pag = process.argv[2] || "plataforma_genetica.html";
let html = fs.readFileSync(path.join(raiz, pag), "utf8");
html = html.replace(/<script[^>]*src="(acceso|sync)\.js"[^>]*><\/script>/g, "")
           .replace(/<script[^>]*src="https:[^"]*"[^>]*><\/script>/g, "")
           .replace(/<script src="(entrenador|entrenador_ia|plan_examen)\.js"><\/script>/g,
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
    ok(p.fase === "cobertura" && p.dias > 30, "fase " + p.fase + ", faltan " + p.dias + " días (" + p.fecha + ")");
    ok(p.semanas.length >= 10, p.semanas.length + " semanas planificadas");
    ok(p.semanas[0].temas.length > 0, "semana 1: " + p.semanas[0].temas.slice(0, 3).map(t => t.tema + " (" + t.n + ")").join("; "));
    ok(w.document.getElementById("plan-ex"), "panel del plan en la portada");
    // Tipos de origen
    const tipos = {};
    w.eval("ALL_QUESTIONS").forEach(q => { const t = P.tipo(q); tipos[t] = (tipos[t] || 0) + 1; });
    console.log("  orígenes:", JSON.stringify(tipos));
    ok(Object.keys(tipos).length >= 3, "varios orígenes distinguidos");
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
    // Estrategia con IA simulada
    const IA = w.EntrenadorIA; let pedido = "";
    IA.conectada = () => true;
    IA.llamar = (sis, usu) => { pedido = usu; return Promise.resolve({ txt: JSON.stringify({ resumen: "Vas empezando.", hoy: "Haz 20 de citogenética.", alertas: ["Ritmo bajo"],
      semanas: [{ desde: "2026-10-19", hasta: "2026-10-25", objetivo: "Citogenética entera", temas: ["Tema 8: Citogenética · anomalías numéricas"], nuevas_dia: 20, repasos_dia: 10 }],
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
