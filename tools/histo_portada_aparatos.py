#!/usr/bin/env python3
"""Histología Esp. I: ordena la portada por aparatos (secciones) sin tocar los «Apuntes:»."""
import json,re,sys,collections
H='/tmp/med91/plataforma_histologia2.1.html'
s=open(H,encoding='utf-8').read()
qs=json.loads(re.search(r"const ALL_QUESTIONS = (\[.*?\]);\n",s,re.S).group(1))
temas=list(collections.OrderedDict((q['topicBase'],1) for q in qs))
SEC=[('sangre','🩸 1 · Tejido sanguíneo y hematopoyesis','#f87171',['Tejido sanguíneo','Tejido Sanguíneo']),
 ('circ','🫀 2 · Aparato circulatorio','#fb7185',['Circulatorio','circulatorio','Histología 2']),
 ('linf','🛡️ 3 · Órganos linfoides','#a78bfa',['Linfático','linfoides','Linfoides']),
 ('resp','🫁 4 · Aparato respiratorio','#60a5fa',['Respiratorio','respiratorio']),
 ('dig','🍽️ 5 · Tubo digestivo','#fbbf24',['Digestivo','Aparato digestivo','Tubo digestivo']),
 ('gla','🧪 6 · Glándulas anejas del digestivo','#f59e0b',['Glándulas anejas']),
 ('uri','💧 7 · Aparato urinario','#38bdf8',['Urinario','urinario','Riñón']),
 ('masc','♂️ 8 · Reproductor masculino','#4ade80',['Masculino','masculino']),
 ('fem','♀️ 9 · Reproductor femenino','#f472b6',['Femenino','femenino']),
 ('teg','🖐️ 10 · Sistema tegumentario','#d6a77a',['Tegumentario','tegumentario','Piel']),
 ('gen','📚 Bancos generales y exámenes','#94a3b8',[])]
def seccion(t):
    if t.startswith('Apuntes:'): return None
    if t.startswith('📝') and 'Riñón' not in t: return 'gen'
    if t in('Banco General','Banco Parcial 2','🔬 Recopilación Prácticos'): return 'gen'
    for sid,_,_,ks in SEC[:-1]:
        # «Glándulas anejas» antes que «digestivo»
        pass
    if 'Glándulas anejas' in t or 'Glándulas Anejas' in t: return 'gla'
    for sid,_,_,ks in SEC[:-1]:
        if any(k in t for k in ks): return sid
    return 'gen'
def rango(t):
    if t.startswith('🔬 Cuestionario Práctica'): return 1
    if t.startswith('🔬 Cuestionarios de prácticas · más'): return 2
    if t.startswith('🔬'): return 3
    if t.startswith('🖼️'): return 4
    if t.startswith('📷'): return 5
    if t.startswith('📝'): return 6
    return 0
mapa={};orden={}
por=collections.defaultdict(list)
for t in temas:
    sid=seccion(t)
    if sid: por[sid].append(t)
for sid,l in por.items():
    pos={t:i for i,t in enumerate(l)}
    l.sort(key=lambda t:(rango(t),pos[t]))
    for i,t in enumerate(l): mapa[t]=sid; orden[t]=i
for sid,tit,_,_ in SEC: print(tit,'\n   '+'\n   '.join(por[sid]))
if '--escribir' not in sys.argv: sys.exit()
bloque=("\n// Portada por aparatos (oct-2026): cada banco va a la sección de su aparato, en este orden.\n"
 "const SEC_MAPA = "+json.dumps(mapa,ensure_ascii=False,separators=(',',':'))+";\n"
 "const SEC_ORDEN = "+json.dumps(orden,ensure_ascii=False,separators=(',',':'))+";\n"
 +"".join("SECTIONS.push({id:%s, title:%s, color:%s, orden:true, match: t => SEC_MAPA[t] === %s});\n"%(json.dumps(i),json.dumps(t,ensure_ascii=False),json.dumps(c),json.dumps(i)) for i,t,c,_ in SEC))
s=re.sub(r"\n// Portada por aparatos \(oct-2026\).*?(?=\nconst FEATURES)","",s,flags=re.S)
a="SECTIONS.unshift({id:'apuntes'"
k=s.index(a); fin=s.index('\n',k)
s=s[:fin+1]+bloque.lstrip('\n')+s[fin+1:] if False else s[:fin]+bloque.rstrip('\n')+s[fin:]
v="      const names = sortTopicNames(TOPIC_NAMES.filter(t => sectionOf(t) === s));"
n="      const names = s.orden ? TOPIC_NAMES.filter(t => sectionOf(t) === s).sort((a, b) => (SEC_ORDEN[a] ?? 999) - (SEC_ORDEN[b] ?? 999)) : sortTopicNames(TOPIC_NAMES.filter(t => sectionOf(t) === s));"
if n not in s: assert s.count(v)==1; s=s.replace(v,n)
v2="    document.getElementById('topics-grid').innerHTML = mainTopics.map(buildCard).join('');"
n2=v2+"\n    document.getElementById('topics-grid').parentElement.style.display = mainTopics.length ? '' : 'none';"
if n2 not in s: assert s.count(v2)==1; s=s.replace(v2,n2)
open(H,'w',encoding='utf-8').write(s); print('portada escrita')
