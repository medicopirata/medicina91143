#!/usr/bin/env python3
"""Anatomía 3: resultado del cotejo con los exámenes y baterías descargados (oct-2026)."""
import json,re,collections,unicodedata,sys,os,shutil
from PIL import Image
H='/tmp/med91/plataforma_anatomia3.html'; AN='/tmp/apuntes/an'
s=open(H,encoding='utf-8').read()
m=re.search(r"const ALL_QUESTIONS = (\[.*?\]);\n",s,re.S); qs=json.loads(m.group(1)); Q={q['id']:q for q in qs}
T=json.load(open(AN+'/todo.json')); P=T['P']; I=T['I']
def nz(t):
    t=unicodedata.normalize('NFKD',(t or '').lower()); return re.sub(r'[^a-z0-9]','',''.join(c for c in t if not unicodedata.combining(c)))
CORRECT={52:2,108:3,425:1,452:0,472:3,474:2,481:2,484:2,491:0,517:1,575:3,595:0,897:0,981:2,1018:1,1057:2,1064:0,1075:3,1077:0,1086:3,1169:3,
         1090:4,1363:1,1095:4,1189:3,1198:4,1237:3,1216:1,1268:4,1507:3,1508:3,1509:3}
ALSO={29:[2],35:[0],52:[0],264:[3],296:[2],297:[0],467:[1],472:[0],474:[0],578:[3],595:[1],673:[0],718:[0],742:[0],981:[1],1075:[4],1359:[2],1077:[3],
      1082:[4],1156:[4],1090:[3],1363:[3],1099:[2,4],1130:[0],1145:[4],1215:[1],1216:[2]}
# opciones que faltaban y eran la clave
assert len(Q[1041]['options'])==3; Q[1041]['options'].append('Todas son ciertas'); CORRECT[1041]=3
assert len(Q[1074]['options'])==4; Q[1074]['options'].append('Todas las afirmaciones son ciertas'); CORRECT[1074]=4
for i,c in CORRECT.items(): assert 0<=c<len(Q[i]['options']),i; Q[i]['correct']=c
for i,a in ALSO.items():
    assert all(x<len(Q[i]['options']) and x!=Q[i]['correct'] for x in a),(i,a); Q[i]['also']=a
# explicaciones
cand=collections.defaultdict(list)
for e in P:
    if e.get('estado')=='esta' and e.get('id') in Q and e.get('exp_nueva'):
        cand[e['id']].append((e.get('correcta_idx_plataforma'),e['exp_nueva'].strip()))
sinexp=[];nexp=0
for i,l in cand.items():
    if i in CORRECT:
        ok=[x for c,x in l if c==CORRECT[i]]
        if not ok: sinexp.append(i); continue
        Q[i]['exp']=max(ok,key=len)
    else: Q[i]['exp']=max((x for _,x in l),key=len)
    nexp+=1
sinexp+= [i for i in CORRECT if i not in cand]
print('explicaciones rehechas',nexp,'| clave cambiada sin explicación acorde:',sorted(set(sinexp)))
MAN={ # explicaciones para claves cambiadas sin texto acorde de los revisores
}
for i,t in json.load(open(AN+'/exp_manual.json')).items() if os.path.exists(AN+'/exp_manual.json') else []: Q[int(i)]['exp']=t
for q in qs:
    if q.get('also'):
        q['exp']=re.sub(r' ▸ También se da por buena:.*$','',q.get('exp','')).strip()+' ▸ También se da por buena: '+' · '.join('«%s»'%q['options'][j].rstrip('.') for j in q['also'])+'.'
# figuras
def fig(nombre):
    d=f'/tmp/med91/anat3_img/{nombre}.jpg'
    if not os.path.exists(d):
        im=Image.open(f'{AN}/c/{nombre}.jpg').convert('RGB'); im.thumbnail((1100,1100)); im.save(d,quality=82)
    return f'anat3_img/{nombre}.jpg'
de=lambda i: Q[i]['img']
Q[1002]['img']=fig('1parcial-neuro-p11-1'); Q[1042]['img']=fig('1parcial-neuro-p19-1')
Q[1068]['img']=de(1129); Q[1318]['img']=de(1129)
Q[1507]['img']=fig('junio2018-trujillo-p02-1-tc'); Q[1508]['img']=de(1163); Q[1509]['img']=de(1163)
if '(posición I4, D5)' not in Q[1068]['q']: Q[1068]['q']=Q[1068]['q'].rstrip(':').rstrip()+' (posición I4, D5):'
if '(posición I4, D5)' not in Q[1318]['q']: Q[1318]['q']=Q[1318]['q'].rstrip(':').rstrip()+' (posición I4, D5):'
# preguntas que faltaban
IMG_F={'1':fig('junio2018-trujillo-p02-1-tc'),'26':de(1166),'36':de(1101),'41':de(1159),'44':de(1112),'46':de(1166),'53':de(1163),'54':de(1109),
       '55':de(1115),'58':fig('junio2018-trujillo-p21-1-coronal'),'62':de(1159),'65':fig('junio2018-trujillo-p26-1-tronco'),'71':fig('junio2018-trujillo-p26-1-tronco')}
EXTRA={'54':'1','65':'21'}
qs=[q for q in qs if not q.get('w')]
nid=max(q['id'] for q in qs if q['id']<90000)+1; add=[]
def nuevo(banco,q,ops,c,exp,img=None,also=None):
    global nid
    idx=[k for k,x in enumerate(qs+add) if x['topicBase']==banco]; n=max([(qs+add)[k].get('n',0) for k in idx] or [0])+1
    d={"id":nid,"topic":banco,"topicBase":banco,"fileId":nid,"origQ":n,"q":q,"options":ops,"correct":c,"exp":exp,"n":n,"w":1}
    if img: d['img']=img
    add.append(d); nid+=1
for e in P:
    if e.get('estado')!='falta': continue
    ops=[o.strip() for o in e['options']]; c=e.get('correct'); exp=e.get('exp','').strip(); n=str(e.get('n'))
    if e['_f'].startswith('junio'):
        if c is None:
            ops.append(EXTRA[n]); c=len(ops)-1
            exp+=f' En el examen original el número correcto ({EXTRA[n]}) no figuraba entre las opciones y la pregunta se anuló; aquí se ha añadido.'
        nuevo('📝 Examen Junio 2018 · Trujillo (neuro)',e['q'].rstrip(':').strip()+':',ops,c,exp,IMG_F[n])
    else:
        nuevo('📝 Recopilatorio Rosety · Noelia',e['q'].strip(),ops,c,exp)
B='🖼️ Figuras de examen · preguntas nuevas'
for e in I:
    for p in e.get('preguntas') or []:
        if p.get('seguridad')=='baja' or len(p['options'])!=4: continue
        nuevo(B,p['q'],p['options'],p['correct'],'🤖 Pregunta de Claude sobre esta figura. '+p['exp'],fig(e['imagen_final']))
print('nuevas',len(add),collections.Counter(q['topic'] for q in add))
# insertar cada una al final de su banco
for d in add:
    idx=[k for k,x in enumerate(qs) if x['topicBase']==d['topicBase']]
    qs.insert(idx[-1]+1 if idx else len(qs),d)
assert len({q['id'] for q in qs})==len(qs)
for q in qs: assert 0<=q['correct']<len(q['options']) and q['correct'] not in q.get('also',[])
json.dump([q for q in qs if q['id'] in CORRECT or q.get('also')],open(AN+'/cambiadas.json','w'),ensure_ascii=False,indent=1)
if '--escribir' in sys.argv:
    s=s[:m.start(1)]+json.dumps(qs,ensure_ascii=False,separators=(',',':'))+s[m.end(1):]
    m2=re.search(r'^const TOPIC_COUNTS = (.*?);$',s,re.M); cnt=collections.OrderedDict()
    for q in qs: cnt[q['topicBase']]=cnt.get(q['topicBase'],0)+1
    s=s[:m2.start(1)]+json.dumps(cnt,ensure_ascii=False,separators=(',',':'))+s[m2.end(1):]
    open(H,'w',encoding='utf-8').write(s); print('escrito',len(qs))
