/* Sincronización entre dispositivos de lo que las páginas guardan en localStorage.
 *
 * Las plataformas de segundo ya suben su avance (users/<uid>/<clave>). Esto
 * cubre lo demás: las fichas de rellenar, la sesión de preguntas a medias y
 * las dos plataformas de primero que no hablaban con la nube.
 *
 * Una página declara qué claves quiere sincronizar y cómo se fusionan:
 *
 *   MPSync.usar({ clave: "mp_rellenar_a3", modo: "max", alCambiar: pintar });
 *
 *   max       objeto de números (o un número): se queda el mayor de cada uno
 *   reciente  gana lo último que se escribió, en el dispositivo que sea;
 *             borrar la clave también cuenta
 *   qs        avance de una plataforma, con la misma fusión que usan ellas
 *
 * La sesión es la de index.html: si no se ha entrado allí, no se sube nada y
 * todo sigue funcionando en local.
 */
(function () {
  "use strict";

  var FB_CONFIG = {
    apiKey: "AIzaSyAKughV5w2XAKRm3rWuUmhVldwU2bjj0zY",
    authDomain: "portal-estudio-medicina.firebaseapp.com",
    databaseURL: "https://portal-estudio-medicina-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "portal-estudio-medicina",
    storageBucket: "portal-estudio-medicina.firebasestorage.app",
    messagingSenderId: "536326985694",
    appId: "1:536326985694:web:ee2428d39421653be26f4f"
  };
  var SDK = "https://www.gstatic.com/firebasejs/10.7.1/firebase-";
  var MARCAS = "mp_sync_t";

  var reglas = [], db = null, uid = null, extras = null, nubeQs = {}, oyentes = [];
  var vistaPagina = {};      // lo último que la página leyó o escribió, por clave (modo qs)
  var aplicando = false, tocado = false, cola = {}, temporizador = null;
  var ponOrig = Storage.prototype.setItem, quitaOrig = Storage.prototype.removeItem;

  function pruneData(d) {
    const qs = d.qs || {};
    for (const id of Object.keys(qs)) {
      const s = qs[id];
      if (!s || (!s.a && !s.c && !s.d && !s.m && !s.note && !s.t && !s.h && !Number.isInteger(s.ck))) delete qs[id];
    }
    return d;
  }

  // Fusión local/nube: prevalece el registro con marca de tiempo `t` más reciente (last-write-wins).
  // Registros antiguos sin `t` se fusionan como antes (máximos / OR). `resetAt` descarta todo lo anterior a un reinicio.
  function fbMerge(local, remote) {
    local = local || {}; remote = remote || {};
    var resetAt = Math.max(local.resetAt || 0, remote.resetAt || 0);
    var merged = { qs: {}, topicFlags: {} };
    if (resetAt) merged.resetAt = resetAt;
    var allIds = new Set(Object.keys(local.qs || {}).concat(Object.keys(remote.qs || {})));
    allIds.forEach(function(id) {
      var l = (local.qs || {})[id];
      var r = (remote.qs || {})[id];
      if (l && (l.t || 0) < resetAt) l = null;
      if (r && (r.t || 0) < resetAt) r = null;
      var mq;
      if (!l && !r) return;
      else if (!l) mq = r;
      else if (!r) mq = l;
      else if (l.t || r.t) mq = ((l.t || 0) >= (r.t || 0)) ? l : r;
      else {
        // Se parte de todos los campos (ck, l, iv, ef, du…) para no perder ninguno,
        // y sobre ellos se aplican los máximos de los contadores.
        mq = Object.assign({}, l, r);
        mq.a = Math.max(l.a||0, r.a||0);
        mq.c = Math.max(l.c||0, r.c||0);
        mq.d = r.d||l.d||0;
        mq.m = r.m||l.m||0;
        var n = r.note || l.note; if (n) mq.note = n; else delete mq.note;
      }
      // El historial de intentos se une siempre, gane quien gane por marca de tiempo
      if (l && r) {
        mq = Object.assign({}, mq);
        var hs = (Array.isArray(l.h) ? l.h : []).concat(Array.isArray(r.h) ? r.h : []);
        if (hs.length) {
          hs.sort(function(a, b) { return a[0] - b[0]; });
          var vistoTs = {}, uniq = [];
          for (var i = 0; i < hs.length; i++) { if (vistoTs[hs[i][0]]) continue; vistoTs[hs[i][0]] = 1; uniq.push(hs[i]); }
          mq.h = uniq.slice(-20);
        }
        if (mq.p1 === undefined) {
          var p1 = (l.p1 !== undefined) ? l.p1 : r.p1;
          if (p1 !== undefined) mq.p1 = p1;
        }
      }
      merged.qs[id] = mq;
    });
    var lf = local.topicFlags || {}, rf = remote.topicFlags || {};
    var allTopics = new Set(Object.keys(lf).concat(Object.keys(rf)));
    allTopics.forEach(function(t) {
      var l = lf[t], r = rf[t];
      if (l && (l.t || 0) < resetAt) l = null;
      if (r && (r.t || 0) < resetAt) r = null;
      var f;
      if (!l && !r) return;
      else if (!l) f = r;
      else if (!r) f = l;
      else if (l.t || r.t) f = ((l.t || 0) >= (r.t || 0)) ? l : r;
      else f = { e: l.e || r.e || 0, i: l.i || r.i || 0, r: l.r || r.r || 0 };
      if (f.e || f.i || f.r || f.t) merged.topicFlags[t] = f;
    });
    // Diario de estudio: se queda el mayor recuento de cada día
    var ld = local.daily || {}, rd = remote.daily || {};
    var days = new Set(Object.keys(ld).concat(Object.keys(rd)));
    if (days.size) {
      merged.daily = {};
      days.forEach(function(k) {
        var a = ld[k] || { n: 0, ok: 0 }, b = rd[k] || { n: 0, ok: 0 };
        merged.daily[k] = { n: Math.max(a.n || 0, b.n || 0), ok: Math.max(a.ok || 0, b.ok || 0) };
      });
    }
    // Simulacros: unión por marca de tiempo
    var sims = (local.sims || []).concat(remote.sims || []);
    if (sims.length) {
      var vistos = {};
      merged.sims = sims.filter(function(s) { if (!s || vistos[s.t]) return false; vistos[s.t] = 1; return true; })
                        .sort(function(a, b) { return a.t - b.t; }).slice(-50);
    }
    return pruneData(merged);
  }

  // ¿Tiene este dispositivo algo que la nube no? (estudiado sin sesión o sin conexión).
  // Comparación estricta, para que dos dispositivos abiertos a la vez no se reenvíen
  // lo mismo sin fin.
  function fbLocalAporta(local, remote) {
    local = local || {}; remote = remote || {};
    var resetAt = Math.max(local.resetAt || 0, remote.resetAt || 0);
    if ((local.resetAt || 0) > (remote.resetAt || 0)) return true;
    var lq = local.qs || {}, rq = remote.qs || {};
    for (var id in lq) {
      var l = lq[id], r = rq[id];
      if (!l || (l.t || 0) < resetAt) continue;
      if (!l.a && !l.c && !l.d && !l.m && !l.note && !l.t && !l.h && !Number.isInteger(l.ck)) continue;
      if (!r || (l.t || 0) > (r.t || 0)) return true;
      // Registros antiguos sin marca de tiempo: se fusionan por máximos
      if (!l.t && !r.t && ((l.a || 0) > (r.a || 0) || (l.c || 0) > (r.c || 0) || (l.m && !r.m) || (l.d && !r.d) || (l.note && !r.note))) return true;
    }
    var lf = local.topicFlags || {}, rf = remote.topicFlags || {};
    for (var k in lf) {
      var a = lf[k], b = rf[k];
      if (!a || (a.t || 0) < resetAt || !(a.e || a.i || a.r || a.t)) continue;
      if (!b || (a.t || 0) > (b.t || 0)) return true;
    }
    var ld = local.daily || {}, rd = remote.daily || {};
    for (var dia in ld) {
      var x = ld[dia] || {}, y = rd[dia] || {};
      if ((x.n || 0) > (y.n || 0) || (x.ok || 0) > (y.ok || 0)) return true;
    }
    var enNube = {};
    (remote.sims || []).forEach(function(s) { if (s) enNube[s.t] = 1; });
    return (local.sims || []).some(function(s) { return s && !enNube[s.t]; });
  }

  /* ---------------------------------------------------------------- útiles */
  function reglaDe(k) { for (var i = 0; i < reglas.length; i++) if (reglas[i].clave === k) return reglas[i]; return null; }
  function leer(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function analizar(t) { if (t === null || t === undefined) return null; try { return JSON.parse(t); } catch (e) { return null; } }
  function canon(v) {
    return JSON.stringify(v, function (k, x) {
      if (x && typeof x === "object" && !Array.isArray(x)) {
        var o = {}; Object.keys(x).sort().forEach(function (c) { o[c] = x[c]; }); return o;
      }
      return x;
    });
  }
  function limpio(v) { return JSON.parse(JSON.stringify(v, function (k, x) { return (typeof x === "number" && !isFinite(x)) ? 0 : x; })); }
  // Firebase no admite . $ # [ ] / en los nombres
  function nombre(k) { return encodeURIComponent(k).replace(/\./g, "%2E"); }
  function marcas() { return analizar(leer(MARCAS)) || {}; }
  function marcar(k, t) { var m = marcas(); m[k] = t; try { ponOrig.call(localStorage, MARCAS, JSON.stringify(m)); } catch (e) {} }
  function escribir(k, texto) {
    aplicando = true;
    try { if (texto === null) quitaOrig.call(localStorage, k); else ponOrig.call(localStorage, k, texto); }
    catch (e) {}
    aplicando = false;
  }
  function sinT(r) { if (!r) return ""; var c = Object.assign({}, r); delete c.t; return canon(c); }
  function vacio(r) { return !r || (!r.a && !r.c && !r.d && !r.m && !r.note && !r.h); }

  function fusionMax(a, b) {
    if (a === null || a === undefined) return b;
    if (b === null || b === undefined) return a;
    if (typeof a === "number" || typeof b === "number") return Math.max(+a || 0, +b || 0);
    var o = {};
    Object.keys(a).concat(Object.keys(b)).forEach(function (c) {
      o[c] = (c in a && c in b) ? Math.max(+a[c] || 0, +b[c] || 0) : (c in a ? a[c] : b[c]);
    });
    return o;
  }

  /* ------------------------------------------- lo que la página escribe */
  // La página guarda su estado entero. Solo lo que ella ha cambiado desde la
  // última vez lleva marca de tiempo nueva; el resto se queda como esté
  // guardado, que puede ser más reciente si ha llegado del otro dispositivo.
  function sellar(k, texto) {
    var nuevo = analizar(texto);
    if (!nuevo || typeof nuevo !== "object") return texto;
    var antes = (vistaPagina[k] && vistaPagina[k].qs) || {};
    var guardado = analizar(leer(k)) || {};
    var gq = guardado.qs || {}, nq = nuevo.qs || {}, ahora = Date.now(), salida = {};
    Object.keys(gq).forEach(function (id) { salida[id] = gq[id]; });
    Object.keys(nq).forEach(function (id) {
      var r = nq[id];
      if (sinT(r) !== sinT(antes[id])) { if (!vacio(r)) { r = Object.assign({}, r); r.t = ahora; } salida[id] = r; }
      else if (!(id in gq)) salida[id] = r;
    });
    vistaPagina[k] = analizar(texto);
    var todo = Object.assign({}, guardado, nuevo); todo.qs = salida;
    return JSON.stringify(todo);
  }

  Storage.prototype.setItem = function (k, v) {
    if (aplicando || this !== window.localStorage) return ponOrig.call(this, k, v);
    var r = reglaDe(k);
    if (!r) return ponOrig.call(this, k, v);
    if (r.modo === "qs") v = sellar(k, String(v));
    ponOrig.call(this, k, v);
    marcar(k, Date.now());
    programar(k);
  };
  Storage.prototype.removeItem = function (k) {
    quitaOrig.call(this, k);
    if (aplicando || this !== window.localStorage) return;
    var r = reglaDe(k);
    if (r && r.modo === "reciente") { marcar(k, Date.now()); programar(k); }
  };

  /* --------------------------------------------------------- subir y bajar */
  function programar(k) {
    cola[k] = 1;
    if (!uid) return;
    clearTimeout(temporizador);
    temporizador = setTimeout(vaciar, 1200);
  }
  function vaciar() {
    clearTimeout(temporizador); temporizador = null;
    if (!uid) return;
    var ks = Object.keys(cola); cola = {};
    ks.forEach(function (k) { var r = reglaDe(k); if (r) conciliar(r, true); });
  }

  function tLocal(k) {
    var m = marcas()[k]; if (m) return m;
    var v = analizar(leer(k));
    return (v && typeof v.t === "number") ? v.t : 0;
  }

  function avisar(r) {
    if (typeof r.alCambiar === "function") { try { r.alCambiar(); } catch (e) { console.warn("MPSync:", e); } }
    // Una página que solo lee su estado al arrancar se recarga, si acaba de
    // abrirse y aún no se ha tocado, para enseñar lo que ha llegado.
    if (r.recargar && !tocado && performance.now() < 12000) {
      try {
        var u = +sessionStorage.getItem("mp_sync_recarga") || 0;
        if (Date.now() - u > 60000) { sessionStorage.setItem("mp_sync_recarga", String(Date.now())); location.reload(); }
      } catch (e) {}
    }
  }

  // Deja local y nube iguales para una clave. `forzar`: la página acaba de escribir.
  function conciliar(r, forzar) {
    if (!db || !uid) return;
    var k = r.clave;
    if (r.modo === "qs") {
      if (!(k in nubeQs)) return;                       // aún no se sabe qué hay en la nube
      var local = analizar(leer(k)) || { qs: {} }, nube = nubeQs[k] || {};
      var sube = fbLocalAporta(local, nube);
      var junto = fbMerge(local, nube);
      Object.keys(local).forEach(function (c) { if (!(c in junto)) junto[c] = local[c]; });
      Object.keys(nube).forEach(function (c) { if (!(c in junto)) junto[c] = nube[c]; });
      if (canon(junto) !== canon(local)) { escribir(k, JSON.stringify(junto)); if (!forzar) avisar(r); }
      if (sube) { nubeQs[k] = junto; db.ref("users/" + uid + "/" + k).set(limpio(junto)); }
      return;
    }
    if (extras === null) return;
    var texto = leer(k), rem = extras[nombre(k)], ref = db.ref("users/" + uid + "/_extras/" + nombre(k));
    var sub = function (v, t) { extras[nombre(k)] = { v: v, t: t }; ref.set({ v: v, t: t }); };
    if (r.modo === "max") {
      var a = analizar(texto), b = rem ? analizar(rem.v) : null, m = fusionMax(a, b);
      if (m === null || m === undefined) return;
      var cm = canon(m);
      if (cm !== canon(a)) { escribir(k, JSON.stringify(m)); avisar(r); }
      if (!rem || cm !== canon(b)) sub(JSON.stringify(m), Date.now());
      return;
    }
    // reciente
    var tl = tLocal(k);
    if (!rem) { if (texto !== null) sub(texto, tl || Date.now()); else if (tl) sub(null, tl); return; }
    var rv = (rem.v === undefined) ? null : rem.v;
    if ((rem.t || 0) > tl) {
      if (rv !== texto) { escribir(k, rv); marcar(k, rem.t); avisar(r); } else marcar(k, rem.t);
    } else if (tl > (rem.t || 0) && rv !== texto) sub(texto, tl);
  }

  function escuchar() {
    oyentes.forEach(function (o) { try { o.ref.off("value", o.fn); } catch (e) {} });
    oyentes = []; extras = null; nubeQs = {};
    if (!db || !uid) return;
    var ref = db.ref("users/" + uid + "/_extras");
    var fn = ref.on("value", function (s) {
      extras = s.val() || {};
      reglas.forEach(function (r) { if (r.modo !== "qs") conciliar(r); });
    }, function (e) { console.warn("MPSync:", e.code || e.message); });
    oyentes.push({ ref: ref, fn: fn });
    reglas.forEach(escucharQs);
  }
  function escucharQs(r) {
    if (r.modo !== "qs" || !db || !uid || r._oye === uid) return;
    r._oye = uid;
    var ref = db.ref("users/" + uid + "/" + r.clave);
    var fn = ref.on("value", function (s) { nubeQs[r.clave] = s.val() || {}; conciliar(r); },
      function (e) { console.warn("MPSync:", e.code || e.message); });
    oyentes.push({ ref: ref, fn: fn });
  }

  /* --------------------------------------------------------------- arranque */
  function cargar(src, luego) {
    var s = document.createElement("script"); s.src = src; s.onload = luego;
    s.onerror = function () { console.warn("MPSync: sin conexión con la nube"); };
    document.head.appendChild(s);
  }
  function conSDK(luego) {
    var f = window.firebase;
    if (f && f.auth && f.database) return luego();
    cargar(SDK + "app-compat.js", function () {
      cargar(SDK + "auth-compat.js", function () { cargar(SDK + "database-compat.js", luego); });
    });
  }
  function iniciar() {
    conSDK(function () {
      try {
        var app = firebase.apps.length ? firebase.app() : firebase.initializeApp(FB_CONFIG);
        db = firebase.database(app);
        firebase.auth(app).onAuthStateChanged(function (u) {
          uid = u ? u.uid : null;
          reglas.forEach(function (r) { r._oye = null; });
          escuchar();
        });
      } catch (e) { console.warn("MPSync:", e); }
    });
  }

  ["pointerdown", "keydown"].forEach(function (ev) {
    window.addEventListener(ev, function () { tocado = true; }, { capture: true, passive: true });
  });
  window.addEventListener("pagehide", function () { if (temporizador) vaciar(); });
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden" && temporizador) vaciar(); });

  window.MPSync = {
    usar: function (r) {
      if (!r || !r.clave || reglaDe(r.clave)) return;
      reglas.push(r);
      if (r.modo === "qs") vistaPagina[r.clave] = analizar(leer(r.clave));
      if (uid) { if (r.modo === "qs") escucharQs(r); else conciliar(r); }
    },
    _prueba: { fusionMax: fusionMax, sellar: sellar, conciliar: conciliar, canon: canon,
               conectar: function (d, u) { db = d; uid = u; escuchar(); } }
  };

  if (!window.MPSYNC_SIN_ARRANQUE) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
    else iniciar();
  }
})();
