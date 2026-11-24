// Dos dispositivos con sync.js contra una nube falsa: fichas de rellenar (max),
// sesión a medias (reciente) y avance de una plataforma de primero (qs).
const fs = require('fs'), assert = require('assert'), vm = require('vm'), path = require('path');
const codigo = fs.readFileSync(path.join(__dirname, '..', '..', 'sync.js'), 'utf8');

function nubeFalsa() {
  const datos = {}, oy = [];
  const get = p => p.split('/').reduce((o, k) => (o == null ? undefined : o[k]), datos);
  const set = (p, v) => { const ks = p.split('/'); let o = datos; ks.slice(0, -1).forEach(k => o = (o[k] = o[k] || {})); o[ks[ks.length - 1]] = JSON.parse(JSON.stringify(v)); };
  const copia = v => v === undefined ? null : JSON.parse(JSON.stringify(v));
  const avisar = p => oy.slice().forEach(o => { if (p.startsWith(o.p) || o.p.startsWith(p)) o.fn({ val: () => copia(get(o.p)) }); });
  return { datos, escrituras: 0, ref(p) { const n = this; return {
    on(ev, fn) { oy.push({ p, fn }); fn({ val: () => copia(get(p)) }); return fn; }, off() {},
    set(v) { n.escrituras++; set(p, v); avisar(p); } }; } };
}
function dispositivo(nube, inicial) {
  const almacen = Object.assign({}, inicial);
  class Storage { getItem(k) { return k in almacen ? almacen[k] : null; } setItem(k, v) { almacen[k] = String(v); } removeItem(k) { delete almacen[k]; } }
  const ls = new Storage();
  let ahora = 1790000000000;
  const caja = { Storage, console, JSON, Object, Math, Array, String, encodeURIComponent, setTimeout: (f) => { caja._pend = f; return 1; }, clearTimeout() { caja._pend = null; },
    Date: Object.assign(function () {}, { now: () => ahora }), performance: { now: () => 99999 }, sessionStorage: new Storage(),
    document: { readyState: 'complete', addEventListener() {}, visibilityState: 'visible' }, MPSYNC_SIN_ARRANQUE: true };
  caja.window = caja; caja.localStorage = ls; caja.addEventListener = () => {};
  vm.createContext(caja); vm.runInContext(codigo, caja);
  return { ls, almacen, MPSync: caja.MPSync, reloj: t => { ahora = t; }, conectar: () => caja.MPSync._prueba.conectar(nube, 'u1'),
           soltar: () => { const f = caja._pend; caja._pend = null; if (f) f(); } };
}
const T = 1790000000000;

// --- fichas de rellenar: cada dispositivo tiene notas distintas -------------
{ const nube = nubeFalsa();
  const pc = dispositivo(nube, { mp_rellenar_a3: '{"0":100,"1":50}' }), tb = dispositivo(nube, { mp_rellenar_a3: '{"1":80,"2":60}' });
  let pinta = 0;
  pc.MPSync.usar({ clave: 'mp_rellenar_a3', modo: 'max', alCambiar: () => pinta++ }); tb.MPSync.usar({ clave: 'mp_rellenar_a3', modo: 'max' });
  pc.conectar(); tb.conectar();
  const esperado = { 0: 100, 1: 80, 2: 60 };
  assert.deepStrictEqual(JSON.parse(pc.almacen.mp_rellenar_a3), esperado); assert.deepStrictEqual(JSON.parse(tb.almacen.mp_rellenar_a3), esperado);
  assert(pinta >= 1, 'no repinta la portada');
  const antes = nube.escrituras;
  tb.ls.setItem('mp_rellenar_a3', '{"0":100,"1":80,"2":60,"3":40}'); tb.soltar();
  assert.strictEqual(JSON.parse(pc.almacen.mp_rellenar_a3)[3], 40, 'la ficha nueva no llega al ordenador');
  assert(nube.escrituras - antes <= 2, 'se reenvían sin parar: ' + (nube.escrituras - antes)); }

// --- sesión a medias: gana la última, y terminarla la quita en el otro ------
{ const nube = nubeFalsa(), K = 'fisio1_study_v1_session';
  const pc = dispositivo(nube, {}), tb = dispositivo(nube, {});
  pc.MPSync.usar({ clave: K, modo: 'reciente' }); tb.MPSync.usar({ clave: K, modo: 'reciente' }); pc.conectar(); tb.conectar();
  pc.reloj(T + 10); pc.ls.setItem(K, JSON.stringify({ ids: [1, 2, 3], answers: { 1: 1 }, t: T + 10 })); pc.soltar();
  assert(tb.almacen[K] && JSON.parse(tb.almacen[K]).ids.length === 3, 'la sesión a medias no llega a la tablet');
  tb.reloj(T + 50); tb.ls.setItem(K, JSON.stringify({ ids: [1, 2, 3], answers: { 1: 1, 2: 0 }, t: T + 50 })); tb.soltar();
  assert.strictEqual(Object.keys(JSON.parse(pc.almacen[K]).answers).length, 2);
  tb.reloj(T + 90); tb.ls.removeItem(K); tb.soltar();
  assert(!(K in pc.almacen), 'terminar la sesión en la tablet no la quita del ordenador');
  // un dispositivo que se conecta más tarde con una sesión vieja no la resucita
  const viejo = dispositivo(nube, { [K]: JSON.stringify({ ids: [9], answers: {}, t: T + 20 }) });
  viejo.MPSync.usar({ clave: K, modo: 'reciente' }); viejo.conectar();
  assert(!(K in viejo.almacen) && !(K in pc.almacen), 'una sesión vieja resucita'); }

// --- plataforma de primero: estado entero, sin marcas de tiempo -------------
{ const nube = nubeFalsa(), K = 'fisio_study_v1';
  nube.datos.users = { u1: { [K]: { qs: { 5: { a: 2, c: 2, d: 0, m: 0, t: T, h: [[T, 1]] } }, daily: { '2026-10-01': { n: 2, ok: 2 } } } } };
  const pc = dispositivo(nube, { [K]: '{"qs":{"1":{"a":1,"c":1,"d":0,"m":0}}}' }), tb = dispositivo(nube, { [K]: '{"qs":{"2":{"a":3,"c":1,"d":0,"m":0}}}' });
  pc.MPSync.usar({ clave: K, modo: 'qs' }); tb.MPSync.usar({ clave: K, modo: 'qs' }); pc.conectar(); tb.conectar();
  for (const d of [pc, tb]) assert.deepStrictEqual(Object.keys(JSON.parse(d.almacen[K]).qs).sort(), ['1', '2', '5']);
  assert(nube.datos.users.u1[K].daily, 'se pierde el diario de estudio de la nube');
  assert.deepStrictEqual(nube.datos.users.u1[K].qs[5].h, [[T, 1]], 'se pierde el historial');
  // la página del ordenador (que no sabe nada de la 2 ni de la 5) responde la 1 otra vez y guarda su estado entero
  pc.reloj(T + 500); pc.ls.setItem(K, '{"qs":{"1":{"a":2,"c":2,"d":0,"m":0},"7":{"a":0,"c":0,"d":0,"m":0}}}'); pc.soltar();
  const fin = JSON.parse(tb.almacen[K]).qs;
  assert.strictEqual(fin[1].a, 2, 'la respuesta nueva no llega'); assert.strictEqual(fin[1].t, T + 500);
  assert(fin[2] && fin[5], 'guardar desde una página con el estado viejo borra lo del otro dispositivo');
  // a la vez, la tablet responde la 2: no debe pisar la 1 del ordenador
  tb.reloj(T + 900); tb.ls.setItem(K, '{"qs":{"2":{"a":4,"c":2,"d":0,"m":0}}}'); tb.soltar();
  const n = nube.datos.users.u1[K].qs;
  assert.strictEqual(n[1].a, 2); assert.strictEqual(n[2].a, 4); assert.strictEqual(JSON.parse(pc.almacen[K]).qs[2].a, 4);
  const antes = nube.escrituras; pc.soltar(); tb.soltar(); assert.strictEqual(nube.escrituras, antes, 'escrituras de más'); }

// --- sin sesión iniciada: todo sigue en local y sube al entrar --------------
{ const nube = nubeFalsa(); const tb = dispositivo(nube, {});
  tb.MPSync.usar({ clave: 'mp_rellenar_a3', modo: 'max' });
  tb.ls.setItem('mp_rellenar_a3', '{"4":90}'); tb.soltar();
  assert.strictEqual(nube.escrituras, 0); assert.strictEqual(tb.almacen.mp_rellenar_a3, '{"4":90}');
  tb.conectar();
  assert.strictEqual(JSON.parse(nube.datos.users.u1._extras.mp_rellenar_a3.v)[4], 90, 'lo hecho sin sesión no sube al entrar'); }
// --- plan de examen (reciente, objeto): la página escribe su diario antes de recibir la nube ---
// La estrategia de la IA que hay en la nube no debe perderse por una escritura local hecha sin
// haber visto aún lo que había; los campos se funden uno a uno y solo chocan los que cambian ambos.
{ const nube = nubeFalsa(), K = 'anat3_study_v1_plan';
  const nubeV = { pesos: { examen: 4, clase: 1 }, diario: { '2026-11-22': { p: 40 } }, estrategia: { t: T, resumen: 'Repasa médula', hoy: 'tálamo' }, objetivo: 'p1', confus: [{ t: 1, idea: 'a' }] };
  nube.datos.users = { u1: { _extras: { [K]: { v: JSON.stringify(nubeV), t: T } } } };
  const tb = dispositivo(nube, {});
  let avisos = 0;
  tb.MPSync.usar({ clave: K, modo: 'reciente', alCambiar: () => avisos++ });
  tb.reloj(T + 100);
  tb.ls.setItem(K, JSON.stringify({ pesos: { examen: 4, clase: 1 }, diario: { '2026-11-24': { p: 42 } }, objetivo: 'p1', confus: [] }));   // sin sesión aún: no sube
  tb.conectar();
  const local = JSON.parse(tb.almacen[K]), enNube = JSON.parse(nube.datos.users.u1._extras[K].v);
  for (const d of [local, enNube]) {
    assert(d.estrategia && d.estrategia.resumen === 'Repasa médula', 'la estrategia de la nube se pierde al abrir en otro dispositivo');
    assert(d.diario['2026-11-22'] && d.diario['2026-11-24'], 'el diario no junta los días de los dos dispositivos');
    assert.strictEqual(d.confus.length, 1, 'un dispositivo que nunca vio la nube pisa con sus valores por defecto');
  }
  assert(avisos >= 1, 'la página no se entera de que ha llegado la estrategia');
  // el ordenador, que tenía la nube tal cual, recibe lo fundido y no vuelve a escribir
  const pc = dispositivo(nube, { [K]: JSON.stringify(nubeV), mp_sync_t: JSON.stringify({ [K]: T }) });
  pc.MPSync.usar({ clave: K, modo: 'reciente' }); pc.conectar();
  assert(JSON.parse(pc.almacen[K]).diario['2026-11-24'], 'el día nuevo no llega al ordenador');
  const antes = nube.escrituras; pc.soltar(); tb.soltar(); assert.strictEqual(nube.escrituras, antes, 'escrituras de más');
  // la página revisa la estrategia en la tablet: llega al ordenador y no borra el resto
  tb.reloj(T + 500); const d2 = JSON.parse(tb.almacen[K]); d2.estrategia = { t: T + 500, resumen: 'Nueva', hoy: 'bulbo' }; tb.ls.setItem(K, JSON.stringify(d2)); tb.soltar();
  const fin = JSON.parse(pc.almacen[K]);
  assert.strictEqual(fin.estrategia.resumen, 'Nueva'); assert(fin.diario['2026-11-22'] && fin.diario['2026-11-24']);
  // la tablet cambia el objetivo otro día sin conexión (sesión nueva de la página) y el ordenador, mientras,
  // añade un día al diario: al conectarse se quedan los dos cambios, porque la tablet recuerda qué vio en la nube
  pc.reloj(T + 1000); const d3 = JSON.parse(pc.almacen[K]); d3.diario['2026-11-25'] = { p: 50 }; pc.ls.setItem(K, JSON.stringify(d3)); pc.soltar();
  const tb2 = dispositivo(nube, tb.almacen);
  tb2.MPSync.usar({ clave: K, modo: 'reciente' });
  tb2.reloj(T + 1200); const d4 = JSON.parse(tb2.almacen[K]); d4.objetivo = 'final'; tb2.ls.setItem(K, JSON.stringify(d4));
  tb2.conectar();
  for (const d of [JSON.parse(tb2.almacen[K]), JSON.parse(pc.almacen[K]), JSON.parse(nube.datos.users.u1._extras[K].v)]) {
    assert.strictEqual(d.objetivo, 'final', 'el cambio hecho sin conexión se pierde');
    assert(d.diario['2026-11-25'] && d.diario['2026-11-22'], 'la tablet pisa el diario del ordenador');
    assert.strictEqual(d.estrategia.resumen, 'Nueva');
  }
  // borrar la clave entera sigue contando como lo último
  tb2.reloj(T + 1900); tb2.ls.removeItem(K); tb2.soltar();
  assert(!(K in pc.almacen), 'borrar el plan en la tablet no lo quita del ordenador'); }
console.log('OK sync_extras');
