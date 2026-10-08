const fs=require('fs'), assert=require('assert');
const html=fs.readFileSync(process.argv[2],'utf8');
const coger=(ini,fin)=>{const a=html.indexOf(ini), b=html.indexOf(fin,a); if(a<0||b<0) throw new Error('no encuentro '+ini); return html.slice(a,b);};
// 1) la plataforma comparte sesión con el inicio
assert(!/initializeApp\(FB_CONFIG, STORAGE_KEY\)/.test(html), 'la plataforma sigue usando una app de Firebase con nombre propio');
// 2) simulación de dos dispositivos contra una nube falsa
const src=(html.includes('function pruneData(d)')?coger('function pruneData(d)','function saveData()'):'')+coger('function fbSanitize','function fbSave()')+coger('function fbMerge','function fbLoad()')+coger('function fbLoad()','function setFbStatus');
function dispositivo(nube, datosLocales){
  const State={data:datosLocales}; let pendiente=false;
  const ref={ on:(ev,cb)=>{ ref.cb=cb; nube.oyentes.push(cb); cb({val:()=>nube.v}); return cb; }, off(){}, };
  const env={State, App:{updateHomeStats(){},renderTopicsGrid(){}}, localStorage:{setItem(){}}, setFbStatus(){}, console,
    fbRef:()=>ref, fbSave(){ pendiente=true; }, STORAGE_KEY:'x'};
  const f=new Function(...Object.keys(env), '_fbListener', src+'; return {fbLoad, fbSanitize};');
  const api=f(...Object.values(env), null);
  return { State, cargar:()=>api.fbLoad(), empujar(){ if(!pendiente) return false; pendiente=false; nube.v=api.fbSanitize(State.data); nube.oyentes.forEach(cb=>cb({val:()=>nube.v})); return true; } };
}
const nube={v:null, oyentes:[]};
const T=1790000000000;
// Ordenador: ya sincronizado, 2 preguntas
nube.v={qs:{1:{a:1,c:1,t:T},2:{a:2,c:1,t:T+1}}, daily:{'2026-10-08':{n:3,ok:2}}};
const pc=dispositivo(nube, JSON.parse(JSON.stringify(nube.v))); pc.cargar();
// Tablet: estudió sin sesión (solo local) las preguntas 3 y 4, y una versión más nueva de la 2
const tablet=dispositivo(nube,{qs:{2:{a:3,c:2,t:T+50},3:{a:1,c:0,t:T+60},4:{a:1,c:1,t:T+70}},topicFlags:{},daily:{'2026-10-08':{n:5,ok:3}}});
tablet.cargar();           // al entrar con sesión, lo suyo debe subir a la nube
let rondas=0; while((tablet.empujar()|pc.empujar()) && ++rondas<20);
assert(rondas<20,'los dos dispositivos se reenvían datos sin parar');
for(const id of [1,2,3,4]) assert(nube.v.qs[id],'falta en la nube la pregunta '+id);
assert.strictEqual(nube.v.qs[2].a,3);
assert.deepStrictEqual(Object.keys(pc.State.data.qs).sort(),['1','2','3','4'],'el ordenador no ve lo hecho en la tablet');
// el motor antiguo de primero no guarda marcas de tiempo: allí se comparan los contadores
if(html.includes('function pruneData(d)')) assert.deepStrictEqual(pc.State.data.qs, tablet.State.data.qs);
else for(const id of [1,2,3,4]) assert.deepStrictEqual([pc.State.data.qs[id].a,pc.State.data.qs[id].c],[tablet.State.data.qs[id].a,tablet.State.data.qs[id].c]);
if(html.includes('merged.daily')) assert.strictEqual(pc.State.data.daily['2026-10-08'].n,5);
// registros antiguos sin marca de tiempo
{const n3={v:{qs:{7:{a:1,c:1}}},oyentes:[]}; const a=dispositivo(n3,{qs:{7:{a:4,c:2}},topicFlags:{}}); a.cargar(); let k=0; while(a.empujar() && ++k<20); assert(k<20,'bucle'); assert.strictEqual(n3.v.qs[7].a,4,'no sube el registro antiguo');}
// nube vacía y datos solo locales
const nube2={v:null,oyentes:[]}; const solo=dispositivo(nube2,{qs:{9:{a:1,c:1,t:T}},topicFlags:{}}); solo.cargar(); solo.empujar();
assert(nube2.v && nube2.v.qs[9],'con la nube vacía no sube lo local');
console.log('OK', process.argv[2], '· rondas', rondas);
