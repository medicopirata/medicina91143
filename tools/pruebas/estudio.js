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
  ok(home && home.querySelectorAll(".est-fila").length === E.indice().temas.length, "cuadro en la portada con " + E.indice().temas.length + " temas");
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
  ok(!errores.length, "sin avisos" + (errores.length ? ": " + errores.slice(0, 5).join(" | ") : ""));
})();
