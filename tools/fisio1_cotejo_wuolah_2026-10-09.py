#!/usr/bin/env python3
"""Fisio I: resultado del cotejo con los exámenes de Wuolah (09-10-2026).
- `also`: opciones que el examen original (respuesta múltiple) también daba por buenas.
- claves corregidas, explicaciones rehechas, una errata y tres preguntas que faltaban."""
import json,re,collections,unicodedata,sys
H='plataforma_fisio1.html'
s=open(H,encoding='utf-8').read()
m=re.search(r"const ALL_QUESTIONS = (\[.*?\]);\n",s,re.S)
qs=json.loads(m.group(1)); Q={q['id']:q for q in qs}
E=json.load(open('apuntes_extra/fisio1-cotejo-wuolah-2026-10-09.json'))['E']
def nz(t):
    t=unicodedata.normalize('NFKD',t.lower()); return re.sub(r'[^a-z0-9]','',''.join(c for c in t if not unicodedata.combining(c)))

ALSO={28:[2],235:[2],238:[3],239:[3],241:[4],242:[0],244:[0],245:[3],247:[3],248:[2],260:[0],262:[2],264:[2],266:[4],268:[0],269:[2],271:[2],276:[4],
288:[4],291:[4],293:[1],294:[0],299:[2],304:[1],309:[3],315:[1],317:[2],318:[3],319:[4],320:[4],321:[3],322:[1],323:[2],324:[1],325:[2],326:[0],328:[3],
331:[4],332:[0,2],333:[0,1,2],336:[0],337:[0],339:[0],345:[4],347:[0],349:[1],356:[0],360:[1],364:[1],371:[0],372:[4],375:[2],376:[0],377:[0],378:[3],
381:[3],384:[2],387:[3],388:[2],389:[2],390:[2],391:[0],392:[1],395:[1],397:[4],399:[1],400:[0],403:[3],404:[1],408:[2],409:[3],410:[1],411:[0],413:[0],
416:[1],422:[3],427:[2],429:[1],430:[4],433:[3],434:[0],435:[1],436:[0],440:[1],441:[4],444:[2],445:[1],447:[4],449:[2],450:[3],451:[4],454:[3],456:[1],
277:[3],287:[0],308:[3],457:[4],461:[4],464:[4],469:[4],471:[0],475:[0],476:[0,2],482:[4],483:[4]}
CORRECT={329:2,405:4}

# 1) claves
for i,c in CORRECT.items(): Q[i]['correct']=c
# 2) also, propagado a las copias de la misma pregunta en otros bancos
grupos=collections.defaultdict(list)
for q in qs: grupos[nz(q['q'])[:70]].append(q)
prop=[]
for i,al in ALSO.items():
    q=Q[i]; assert all(a<len(q['options']) and a!=q['correct'] for a in al),i
    V={nz(q['options'][j]) for j in al+[q['correct']]}
    for d in grupos[nz(q['q'])[:70]]:
        if nz(d['options'][d['correct']]) not in V: continue
        ad=[j for j,o in enumerate(d['options']) if nz(o) in V and j!=d['correct']]
        if ad:
            old=d.get('also',[]); d['also']=sorted(set(old)|set(ad))
            if d['id']!=i: prop.append((i,d['id'],ad))
otros=collections.defaultdict(set)
for e in E:
    if e.get('estado')=='esta' and e.get('id') in ALSO:
        for o in e.get('otros_ids') or []:
            if isinstance(o,int) and o in Q and o!=e['id']: otros[e['id']].add(o)
for i,os_ in otros.items():
    q=Q[i]; V={nz(q['options'][j]) for j in ALSO[i]+[q['correct']]}
    for o in os_:
        d=Q[o]
        if nz(d['options'][d['correct']]) not in V: print('  copia con otra clave:',i,'->',o,d['options'][d['correct']][:50]); continue
        ad=[j for j,t in enumerate(d['options']) if nz(t) in V and j!=d['correct']]
        if ad and sorted(set(d.get('also',[]))|set(ad))!=d.get('also'):
            d['also']=sorted(set(d.get('also',[]))|set(ad)); prop.append((i,o,ad))
for i,c in CORRECT.items():
    q=Q[i]
    for d in grupos[nz(q['q'])[:70]]:
        if d['id']!=i: print('  ojo: copia de',i,'->',d['id'],'clave',d['correct'],d['options'][d['correct']][:60])
print('also en',sum(1 for q in qs if q.get('also')),'preguntas; propagadas:',prop)
# 3) errata
assert 'dos niveles de ADH' in Q[454]['options'][1]; Q[454]['options'][1]=Q[454]['options'][1].replace('dos niveles','los niveles')
# 4) explicaciones
cand=collections.defaultdict(list)
for e in E:
    if e.get('estado')=='esta' and e.get('id') in Q and e.get('exp') in('mal','pobre') and e.get('exp_nueva'):
        if e['id'] in CORRECT and e.get('correcta_idx_plataforma')!=CORRECT[e['id']]: continue
        cand[e['id']].append(e['exp_nueva'].strip())
nexp=0
for i,l in cand.items():
    Q[i]['exp']=max(l,key=len); nexp+=1
for q in qs:
    if q.get('also'):
        extra=' · '.join('«%s»'%q['options'][j].rstrip('.') for j in q['also'])
        nota=' ▸ Respuesta múltiple en el examen original: la plataforma acepta también '+extra+'.'
        q['exp']=re.sub(r' ▸ Respuesta múltiple en el examen original:.*$','',q.get('exp','')).strip()+nota
print('explicaciones rehechas',nexp)
# 5) preguntas que faltaban
NUEVAS=[
 ("📝 Examen Junio 2016","En relación al aclaramiento renal de una sustancia es incorrecto afirmar que:",
  ["Es el volumen de plasma que queda completamente desprovisto de la sustancia por unidad de tiempo.","Es dependiente de la función glomerular y de la función tubular.","Permite estimar la función renal y la efectividad de los riñones para excretar diferentes sustancias.","Su cálculo es independiente de la concentración de la sustancia valorada en plasma.","Si una sustancia es completamente aclarada del plasma es porque la velocidad de aclaramiento renal es igual al flujo plasmático renal total."],3,None,
  "El aclaramiento se calcula como C = (U × V) / P: concentración urinaria por flujo de orina, dividido por la concentración plasmática; su cálculo no es independiente de la concentración en plasma, y esa es la afirmación incorrecta. Las demás son ciertas: es un volumen de plasma depurado por unidad de tiempo, resulta de la filtración, la reabsorción y la secreción (función glomerular y tubular), sirve para valorar la función renal y, si la sustancia se elimina por completo en un solo paso (PAH), equivale al flujo plasmático renal."),
 ("📝 Examen Febrero 2021","En cuanto a la micción, en condiciones fisiológicas es correcto afirmar:",
  ["Los nervios hipogástricos ejercen el control final sobre la micción.","El llenado de la vejiga activa un reflejo a través de los hipogástricos para inhibir el esfínter externo.","Los nervios pudendos controlan el esfínter interno.","Corteza y protuberancia inhiben el reflejo de micción."],3,None,
  "El reflejo de la micción es medular (sacro, por los nervios pélvicos parasimpáticos), pero la protuberancia y la corteza cerebral lo mantienen inhibido la mayor parte del tiempo y lo liberan cuando se decide orinar: ellas tienen el control final. Los hipogástricos son simpáticos y favorecen el llenado (relajan el detrusor y contraen el esfínter interno); el esfínter externo es músculo estriado y lo llevan los pudendos, que no controlan el interno. En el examen la opción de los pudendos venía repetida; aquí figura una sola vez."),
 ("📝 Examen Febrero 2021","En cuanto a la regulación renal del equilibrio ácido-básico y electrolítico, en condiciones fisiológicas, es INCORRECTO afirmar que:",
  ["En acidosis aguda disminuye la excreción de potasio.","Las células intercaladas de tipo A secretan protones y reabsorben HCO3- en acidosis.","El sistema amortiguador HCO3- a nivel renal implica la ganancia neta de un HCO3- a sangre.","En el túbulo proximal se produce la mayoría de la secreción de HCO3- y reabsorción de H+.","Un aumento de la ingesta de sodio no afecta a la excreción de potasio."],3,[2],
  "En el túbulo proximal ocurre la mayor parte (80-90 %) de la secreción de H+ y de la reabsorción de HCO3-; la frase lo dice al revés. La corrección oficial daba también por incorrecta la del tampón bicarbonato: cuando el H+ secretado se une al HCO3- filtrado solo se recupera ese bicarbonato, sin ganancia neta; el bicarbonato nuevo se gana cuando el H+ se tampona con fosfato o amonio. Las otras son ciertas: la acidosis aguda frena la secreción de K+, las intercaladas A secretan H+ y reabsorben HCO3-, y al tomar más sodio la caída de la aldosterona se compensa con el mayor flujo distal."),
]
nid=max(q['id'] for q in qs if q['id']<90000)+1
for banco,qq,ops,c,al,exp in NUEVAS:
    if any(q['topic']==banco and nz(q['q'])==nz(qq) and nz(q['options'][0])==nz(ops[0]) for q in qs): continue
    idx=[k for k,q in enumerate(qs) if q['topic']==banco]; n=max(qs[k].get('n',0) for k in idx)+1
    base=qs[idx[-1]]
    nq={"id":nid,"topic":banco,"topicBase":base['topicBase'],"fileId":nid,"origQ":n,"q":qq,"options":ops,"correct":c,"exp":exp,"n":n}
    if al: nq['also']=al; nq['exp']+=' ▸ Respuesta múltiple en el examen original: la plataforma acepta también «%s».'%ops[al[0]].rstrip('.')
    qs.insert(idx[-1]+1,nq); nid+=1; print('  +',banco,nq['id'])
assert len({q['id'] for q in qs})==len(qs)
for q in qs: assert q['correct'] not in q.get('also',[]) and all(a<len(q['options']) for a in q.get('also',[]))
s=s[:m.start(1)]+json.dumps(qs,ensure_ascii=False,separators=(',',':'))+s[m.end(1):]
m2=re.search(r'^const TOPIC_COUNTS = (.*?);$',s,re.M)
tc=json.loads(m2.group(1)); cnt=collections.Counter(q['topicBase'] for q in qs)
for k in tc: tc[k]=cnt.get(k,tc[k])
s=s[:m2.start(1)]+json.dumps(tc,ensure_ascii=False,separators=(',',':'))+s[m2.end(1):]
if '--escribir' in sys.argv: open(H,'w',encoding='utf-8').write(s); print('escrito',len(qs))

