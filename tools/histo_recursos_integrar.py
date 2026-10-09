#!/usr/bin/env python3
"""Histología Esp. I: integra en la plataforma lo sacado de los recursos descargados (oct-2026).
- preguntas de cuestionarios/exámenes que faltaban  -> «🔬 Cuestionarios de prácticas · más preguntas · <aparato>»
- preguntas nuevas sobre cada micrografía           -> «🖼️ Atlas · <aparato> · <órganos>»
- portada ordenada por aparatos (los «Apuntes:» no se tocan)
Uso: python3 integrar.py [--escribir]"""
import json,glob,os,re,sys,collections,unicodedata
from PIL import Image
RAIZ='/tmp/med91'; H=RAIZ+'/plataforma_histologia2.1.html'; HW='/tmp/apuntes/hw'
ESC='--escribir' in sys.argv
def nz(t):
    t=unicodedata.normalize('NFKD',(t or '').lower()); return re.sub(r'[^a-z0-9]','',''.join(c for c in t if not unicodedata.combining(c)))
s=open(H,encoding='utf-8').read()
m=re.search(r"const ALL_QUESTIONS = (\[.*?\]);\n",s,re.S); qs=json.loads(m.group(1))

AP=[('sangre','Tejido sanguíneo y hematopoyesis','🩸'),('circulatorio','Aparato circulatorio','🫀'),('linfoide','Órganos linfoides','🛡️'),
    ('respiratorio','Aparato respiratorio','🫁'),('digestivo','Tubo digestivo','🍽️'),('glandulas_anejas','Glándulas anejas del digestivo','🧪'),
    ('urinario','Aparato urinario','💧'),('masculino','Reproductor masculino','♂️'),('femenino','Reproductor femenino','♀️'),('tegumentario','Sistema tegumentario','🖐️')]
NOM={a:n for a,n,_ in AP}
GRUPOS={ # aparato -> [(nombre del sub-banco, palabras clave del órgano)], el último recoge el resto
 'sangre':[('Médula ósea y hematopoyesis',['medula','hemato','megacar','eritro','granulop','mielo','blast','precursor','trombop']),('Sangre periférica',[])],
 'circulatorio':[('Corazón',['corazon','cardi','valvula','purkinje','miocard','auricul','ventricul']),('Arterias, venas y capilares',[])],
 'linfoide':[('Ganglio linfático',['ganglio']),('Bazo',['bazo']),('Timo',['timo']),('Amígdalas y MALT',[])],
 'respiratorio':[('Fosas nasales, laringe y tráquea',['nasal','fosa','olfat','laringe','epiglot','traquea','cuerda','cornete','nasofaring']),('Bronquios, pulmón y pleura',[])],
 'digestivo':[('Cavidad oral, lengua, diente y faringe',['lengua','papila','diente','dent','labio','oral','paladar','faringe','mejilla','boca','encia','amigdala']),('Esófago y estómago',['esofag','estomag','cardias','pilor','gastr','fundus','antro']),('Intestino delgado y grueso',[])],
 'glandulas_anejas':[('Glándulas salivales',['parotid','subling','submand','submax','saliva']),('Hígado, vesícula biliar y páncreas',[])],
 'urinario':[('Vías urinarias',['ureter','vejiga','uretra','pelvis','caliz']),('Riñón',[])],
 'masculino':[('Testículo y vías espermáticas',['testic','epididim','eferente','deferente','rete','seminifer','cordon']),('Próstata, vesículas seminales y pene',[])],
 'femenino':[('Ovario y trompa uterina',['ovario','folicul','luteo','albicans','trompa','oviduct']),('Útero, vagina, vulva y mama',[])],
 'tegumentario':[('Piel y anejos',[])],
}
def grupo(ap,org):
    o=nz(org)
    for nombre,claves in GRUPOS[ap]:
        if not claves or any(k in o for k in claves): return nombre
ADIV=[('glandulas_anejas',['higado','pancreas','salival','parotida','vesiculabiliar']),('femenino',['ovario','utero','mama','vagina','placenta','trompa']),('masculino',['testic','prostata','pene','epididimo']),('respiratorio',['pulmon','traquea','bronqui','laringe']),('sangre',['sangre','medula','frotis']),('linfoide',['ganglio','bazo','timo','amigdala','linf']),('tegumentario',['piel','pelo','epiderm']),('digestivo',['estomag','intestin','esofag','lengua','diente','dent','oral','colon']),('urinario',['rinon','vejiga','ureter']),('circulatorio',['arteria','vena','corazon','vaso'])]

E=[]
for f in sorted(glob.glob(HW+'/out/*.json')):
    if f.endswith('TEXTO.json'): continue
    for e in json.load(open(f)):
        e['_f']=os.path.basename(f)[:-5]; E.append(e)
# --- preguntas de la plataforma, para no repetir
plat=collections.defaultdict(list)
for q in qs: plat[(nz(q['q']),tuple(sorted(nz(o) for o in q['options'])))].append(q)
fuente=[];nuevas=[];stats=collections.Counter();sinap=[]
for e in E:
    ap=e.get('aparato')
    if ap not in NOM:
        o=nz((e.get('organo') or '')+(e.get('descripcion') or ''))
        ap=next((a for a,ks in ADIV if any(k in o for k in ks)),None)
    for q in e.get('preguntas') or []:
        ops=q.get('options') or []
        if len(ops)<2 or not isinstance(q.get('correct'),int) or not 0<=q['correct']<len(ops) or len(set(map(nz,ops)))<len(ops): stats['mal formada']+=1; continue
        if q.get('seguridad')=='baja': stats['seguridad baja (fuera)']+=1; continue
        if q.get('origen')=='fuente' and q.get('en_plataforma'): stats['fuente: ya estaba (revisor)']+=1; continue
        if ap is None: stats['sin aparato']+=1; sinap.append((e['_f'],e['id'],e.get('organo'),q['q'][:50])); continue
        img=e.get('imagen_final')
        if img and not os.path.exists(f'{HW}/c/{img}.jpg'): stats['sin archivo de imagen']+=1; continue
        r=dict(ap=ap,org=(e.get('organo') or '').strip(),eid=e['id'],lote=e['_f'],img=img,q=q['q'].strip(),options=[o.strip() for o in ops],correct=q['correct'],exp=(q.get('exp') or '').strip(),seg=q.get('seguridad'))
        if q.get('origen')=='fuente':
            if q.get('en_plataforma'): stats['fuente: ya estaba (revisor)']+=1; continue
            cands=plat.get((nz(r['q']),tuple(sorted(nz(o) for o in r['options']))),[])
            if any(nz(c['options'][c['correct']])==nz(r['options'][r['correct']]) for c in cands): stats['fuente: ya estaba (texto y clave iguales)']+=1; continue
            if cands: stats['fuente: mismo texto, otra clave → otra foto']+=1
            fuente.append(r)
        else:
            if not img: stats['nueva sin imagen (fuera)']+=1; continue
            if len(ops)!=4: stats['nueva sin 4 opciones']+=1; continue
            nuevas.append(r)
def dedup(l,conimg):
    v=set();o=[]
    for r in l:
        k=(nz(r['q']),tuple(sorted(map(nz,r['options']))),nz(r['options'][r['correct']]),r['img'] if conimg else None)
        if k in v: stats['duplicada entre lotes']+=1; continue
        v.add(k); o.append(r)
    return o
fuente=dedup(fuente,False); nuevas=dedup(nuevas,True)
# --- test de teoría que faltaban
txt=[t for t in json.load(open(HW+'/out/TEXTO.json')) if t.get('estado')=='falta']
# --- montar bancos
orden_ap=[a for a,_,_ in AP]
bancos=collections.OrderedDict()
for ap in orden_ap:
    for nombre,_ in GRUPOS[ap]: bancos[f'🖼️ Atlas · {NOM[ap]} · {nombre}']=[]
    bancos[f'🔬 Cuestionarios de prácticas · más preguntas · {NOM[ap]}']=[]
for r in nuevas: bancos[f"🖼️ Atlas · {NOM[r['ap']]} · {grupo(r['ap'],r['org'])}"].append(r)
for r in fuente: bancos[f"🔬 Cuestionarios de prácticas · más preguntas · {NOM[r['ap']]}"].append(r)
for b,l in bancos.items():
    if b.startswith('🖼️'): l.sort(key=lambda r:(nz(r['org']),r['lote'],r['eid']))
bancos=collections.OrderedDict((b,l) for b,l in bancos.items() if l)
# --- imágenes
usadas=sorted({r['img'] for l in bancos.values() for r in l if r['img']})
def destino(i): return 'histo21_img/w-'+i+'.jpg'
if ESC:
    tot=0
    for i in usadas:
        d=f'{RAIZ}/{destino(i)}'
        if not os.path.exists(d):
            im=Image.open(f'{HW}/c/{i}.jpg').convert('RGB'); im.thumbnail((960,960))
            if max(im.size)<360: im=im.resize((im.width*2,im.height*2),Image.LANCZOS)
            im.save(d,quality=78,optimize=True)
        tot+=os.path.getsize(d)
    print('imágenes copiadas:',len(usadas),round(tot/1e6,1),'MB')
# --- preguntas nuevas (idempotente: fuera los bancos que este script crea)
PREF=('🖼️ Atlas · ','🔬 Cuestionarios de prácticas · más preguntas · ')
qs=[q for q in qs if not q['topicBase'].startswith(PREF) and not q.get('w')]
nid=max(q['id'] for q in qs if q['id']<90000)+1
assert nid>3375
add=[]
for b,l in bancos.items():
    for n,r in enumerate(l,1):
        q={"id":nid,"topic":b,"topicBase":b,"fileId":nid,"origQ":n,"q":r['q'],"options":r['options'],"correct":r['correct'],
           "exp":('🤖 Pregunta de Claude sobre esta imagen. ' if b.startswith('🖼️') else '')+r['exp'],"n":n,"w":1}
        if r['img']: q['img']=destino(r['img'])
        add.append(q); nid+=1
EX='📝 Examen 2020'
for t in txt:
    if any(nz(q['q'])==nz(t['q']) and nz(q['options'][0])==nz(t['options'][0]) for q in qs): continue
    n=max(q.get('n',0) for q in qs if q['topicBase']==EX)+1 if any(q['topicBase']==EX for q in qs) else 1
    add.append({"id":nid,"topic":EX,"topicBase":EX,"fileId":nid,"origQ":n,"q":t['q'],"options":t['options'],"correct":t['correct'],"exp":t['exp'],"n":n,"w":1}); nid+=1
qs=qs+add
assert len({q['id'] for q in qs})==len(qs)
print('\n'.join(f'{len(l):5}  {b}' for b,l in bancos.items()))
print('sin aparato:',sinap[:12])
print('TOTAL nuevas',len(add),'· plataforma',len(qs),'· imágenes',len(usadas)); print(dict(stats))
con=collections.Counter(q['img'] for q in add if q.get('img')); print('preguntas por imagen:',collections.Counter(con.values()))
json.dump({'bancos':list(bancos)},open(HW+'/bancos.json','w'),ensure_ascii=False)
if ESC:
    s=s[:m.start(1)]+json.dumps(qs,ensure_ascii=False,separators=(',',':'))+s[m.end(1):]
    m2=re.search(r'^const TOPIC_COUNTS = (.*?);$',s,re.M); cnt=collections.OrderedDict()
    for q in qs: cnt[q['topicBase']]=cnt.get(q['topicBase'],0)+1
    s=s[:m2.start(1)]+json.dumps(cnt,ensure_ascii=False,separators=(',',':'))+s[m2.end(1):]
    open(H,'w',encoding='utf-8').write(s); print('escrito')
