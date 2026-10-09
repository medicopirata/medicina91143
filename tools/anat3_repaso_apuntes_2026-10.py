#!/usr/bin/env python3
"""Anatomía 3: repaso de la plataforma contra los apuntes de clase (rev 82, oct-2026)."""
import json,re,sys,collections
H='/tmp/med91/plataforma_anatomia3.html'
s=open(H,encoding='utf-8').read()
m=re.search(r"const ALL_QUESTIONS = (\[.*?\]);\n",s,re.S); qs=json.loads(m.group(1)); Q={q['id']:q for q in qs}
F=json.load(open('/tmp/apuntes/rep/hallazgos.json'))
SALTAR_SEGUNDA={409}          # aceptar 3 de 4 la dejaría trivial: solo se avisa en la explicación
n=collections.Counter()
for e in F:
    q=Q[e['id']]
    if e['id']==260: continue
    if e['tipo']=='clave':
        vieja=q['correct']; q['correct']=e['correcta_idx']; al=set(q.get('also',[]))|set(e.get('tambien_idx') or [])
        al.discard(q['correct']); q['also']=sorted(al); n['clave']+=1
    elif e['tipo']=='segunda' and e['id'] not in SALTAR_SEGUNDA:
        al=set(q.get('also',[]))|set(e.get('tambien_idx') or []); al.discard(q['correct']); q['also']=sorted(al); n['segunda']+=1
    if e.get('exp_nueva'): q['exp']=e['exp_nueva'].strip(); n['exp']+=1
    else:
        nota=' 📓 En clase: '+e['cita'].replace('**','').strip()
        if nota not in q.get('exp',''): q['exp']=re.sub(r' ▸ También se da por buena:.*$','',q.get('exp','')).strip()+nota; n['nota']+=1
# 260: ninguna opción era válida según lo dicho en clase
q=Q[260]
q['options']=['En el extremo del receso central (fastigio)','En el extremo de los recesos laterales','En la línea media del techo, más caudal que el receso central','En el acueducto mesencefálico']
q['correct']=2; q.pop('also',None)
q['exp']='En clase se insistió en la trampa: los agujeros de Luschka están en el extremo de los recesos laterales, pero el de Magendie NO está en el extremo del receso central (fastigio): ahí no hay orificio, está directamente el cerebelo. Magendie es más caudal, en la línea media de la parte inferior del techo del IV ventrículo, y comunica con la cisterna magna. La pregunta original daba «receso posterior» y «receso central» como opciones distintas, cuando son el mismo; se ha reformulado según los apuntes.'
for q in qs:
    q['exp']=re.sub(r' ▸ También se da por buena:.*$','',q.get('exp','')).strip()
    if q.get('also'): q['exp']+=' ▸ También se da por buena: '+' · '.join('«%s»'%q['options'][j].rstrip('.') for j in q['also'])+'.'
    elif 'also' in q: del q['also']
    assert 0<=q['correct']<len(q['options']) and q['correct'] not in q.get('also',[])
print(dict(n))
if '--escribir' in sys.argv:
    open(H,'w',encoding='utf-8').write(s[:m.start(1)]+json.dumps(qs,ensure_ascii=False,separators=(',',':'))+s[m.end(1):]); print('escrito')
for i in (35,297,360,1212,546): print('\n',i,Q[i]['correct'],Q[i].get('also'),'|',Q[i]['exp'][:330])
