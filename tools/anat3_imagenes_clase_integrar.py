#!/usr/bin/env python3
"""Anatomía 3: preguntas tipo test sobre las imágenes de clase (diapositivas de los apuntes), oct-2026.
Dos bancos por tema: «⭐ Imágenes clave» (las que el profesor marcó o el documento ya pregunta) y «🖼️ Más imágenes»."""
import json,glob,os,re,sys,collections
from PIL import Image
H='/tmp/med91/plataforma_anatomia3.html'; AI='/tmp/apuntes/ai'
s=open(H,encoding='utf-8').read(); m=re.search(r"const ALL_QUESTIONS = (\[.*?\]);\n",s,re.S); qs=json.loads(m.group(1)); Q={q['id']:q for q in qs}
I={it['blob'].split('/')[1]:it for it in json.load(open(AI+'/imagenes.json'))}
CORTO=collections.OrderedDict([('Tema 1. Meninges','Tema 1 — Meninges'),('Osteología','Osteología del cráneo'),('Tema 3.','Tema 3 — Médula espinal'),('Tema 4. Tronco','Tema 4 — Tronco del encéfalo'),
 ('Tema 4 (II)','Tema 4 (II) — Pares craneales y formación reticular'),('Tema 5.','Tema 5 — Cerebelo'),('Tema 6. Dienc','Tema 6 — Diencéfalo (epitálamo, subtálamo, hipotálamo e hipófisis)'),
 ('Tema 6 (II)','Tema 6 (II) — Diencéfalo: el tálamo'),('Tema 7 (I).','Tema 7 (I) — Corteza, surcos, lóbulos y giros'),('Tema 7 (II).','Tema 7 (II) — Sustancia blanca y núcleos de la base'),
 ('Tema 7 (III)','Tema 7 (III) — Sistema límbico'),('Tema 8.','Tema 8 — Sistema ventricular y LCR')])
def corto(t): return next(v for k,v in CORTO.items() if t.startswith(k))
orden_img={k:i for i,k in enumerate(I)}
E=[]
for f in sorted(glob.glob(AI+'/out/*.json')):
    for e in json.load(open(f)): e['_f']=os.path.basename(f)[:-5]; E.append(e)
st=collections.Counter(); bancos=collections.defaultdict(list); usadas=set()
for e in sorted(E,key=lambda e:orden_img.get(e['id'],9999)):
    it=I.get(e['id'])
    if not it: st['id desconocido']+=1; continue
    if e.get('descartada') and not e.get('preguntas'): st['imagen descartada']+=1; continue
    clave=bool(e.get('importante')) or it['pregunta_doc'] or 'Pregunta' in it['alt']
    tema=corto(it['tema']); b=('⭐ Imágenes clave · ' if clave else '🖼️ Más imágenes · ')+tema
    for p in e.get('preguntas') or []:
        ops=[str(o).strip() for o in p.get('options') or []]; img=p.get('imagen_final') or e.get('imagen_final') or e['id']
        if len(ops)!=4 or len(set(ops))<4 or not isinstance(p.get('correct'),int) or not 0<=p['correct']<4: st['mal formada']+=1; continue
        if p.get('seguridad')=='baja': st['seguridad baja (fuera)']+=1; continue
        if not os.path.exists(f'{AI}/c/{img}.jpg'): st['sin archivo']+=1; continue
        pref='⭐ Imagen que en clase se marcó como importante. ' if clave else ''
        if e.get('por_que') and clave: pref='⭐ En clase: «'+re.sub(r'\*\*','',e['por_que']).strip().rstrip('.')[:220]+'». '
        bancos[b].append(dict(q=p['q'].strip(),options=ops,correct=p['correct'],exp=pref+'🤖 '+p['exp'].strip(),img=img)); usadas.add(img)
    st['imagen con preguntas']+=1
# orden de bancos: por tema, clave antes que el resto
orden=[]
for t in CORTO.values():
    for pre in('⭐ Imágenes clave · ','🖼️ Más imágenes · '):
        if bancos.get(pre+t): orden.append(pre+t)
for b in orden: print(f'{len(bancos[b]):4}  {b}')
print(dict(st),'| imágenes usadas',len(usadas),'| preguntas',sum(len(bancos[b]) for b in orden))
if '--escribir' not in sys.argv: sys.exit()
os.makedirs('/tmp/med91/anat3_img',exist_ok=True); tot=0
def pub(img):
    global tot
    d=f'/tmp/med91/anat3_img/c-{img}.jpg'
    if not os.path.exists(d):
        im=Image.open(f'{AI}/c/{img}.jpg').convert('RGB'); im.thumbnail((1100,1100)); im.save(d,quality=80,optimize=True)
    return f'anat3_img/c-{img}.jpg'
qs=[q for q in qs if q.get('w')!=2]
nid=max(q['id'] for q in qs if q['id']<90000)+1; add=[]
for b in orden:
    for n,r in enumerate(bancos[b],1):
        add.append({"id":nid,"topic":b,"topicBase":b,"fileId":nid,"origQ":n,"q":r['q'],"options":r['options'],"correct":r['correct'],"exp":r['exp'],"n":n,"img":pub(r['img']),"w":2}); nid+=1
# la pregunta de apuntes que remitía a una figura sin llevarla
Q[90222]['img']=pub('3ff9fe18-7cae'); assert Q[90222]['options'][Q[90222]['correct']].strip('.')=='10'
qs=add+qs if False else qs+add
assert len({q['id'] for q in qs})==len(qs)
s=s[:m.start(1)]+json.dumps(qs,ensure_ascii=False,separators=(',',':'))+s[m.end(1):]
m2=re.search(r'^const TOPIC_COUNTS = (.*?);$',s,re.M); cnt=collections.OrderedDict()
for q in qs: cnt[q['topicBase']]=cnt.get(q['topicBase'],0)+1
s=s[:m2.start(1)]+json.dumps(cnt,ensure_ascii=False,separators=(',',':'))+s[m2.end(1):]
# sección propia, justo debajo de los apuntes
s=re.sub(r"\nSECTIONS\.push\(\{id:'imgclase'.*?\n","\n",s)
a="SECTIONS.unshift({id:'apuntes'"; k=s.index(a); fin=s.index('\n',k)
ORD=json.dumps({b:i for i,b in enumerate(orden)},ensure_ascii=False,separators=(',',':'))
s=s[:fin+1]+"SECTIONS.push({id:'imgclase', title:'🖼️ Imágenes de clase · tipo test', color:'#fbbf24', first:true, ord:"+ORD+", match: t => t.startsWith('⭐ Imágenes clave · ') || t.startsWith('🖼️ Más imágenes · ')});\n"+s[fin+1:]
v="      const names = sortTopicNames(TOPIC_NAMES.filter(t => sectionOf(t) === s));"
n_="      const names = s.ord ? TOPIC_NAMES.filter(t => sectionOf(t) === s).sort((a, b) => (s.ord[a] ?? 999) - (s.ord[b] ?? 999)) : sortTopicNames(TOPIC_NAMES.filter(t => sectionOf(t) === s));"
if n_ not in s: assert s.count(v)==1; s=s.replace(v,n_)
open(H,'w',encoding='utf-8').write(s); print('escrito',len(qs),'nuevas',len(add))
