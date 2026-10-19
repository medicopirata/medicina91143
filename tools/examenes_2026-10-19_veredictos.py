import json,re,sys
R='/Users/santi/trabajo-claude/med91/'
F={'imi':'plataforma_medint.html','anat':'plataforma_anatomia3.html','fisio1':'plataforma_fisio1.html'}
V={}
for l in open(R+'apuntes_extra/examenes-2026-10-19/veredictos-claves.jsonl'):
    v=json.loads(l); V[(v['plat'],v['id'])]=v
for k,f in F.items():
    s=open(R+f,encoding='utf-8').read(); m=re.search(r"const ALL_QUESTIONS = (\[.*?\]);\n",s,re.S); qs=json.loads(m.group(1))
    Q={q['id']:q for q in qs}; n=0
    for (pl,i),v in V.items():
        if pl!=k or v['veredicto']=='mantener': continue
        q=Q[i]
        if k=='imi' and i==2207:
            assert 'vasoconstricción cutánea' in q['options'][2]
            q['options'][2]='Poniendo en marcha una vasodilatación cutánea.'; q['correct']=3; q.pop('also',None)
            q['exp']=('Frente al calor el organismo aumenta las pérdidas térmicas (vasodilatación cutánea, sudoración, polipnea) y reduce la termogénesis; '
                      'para llevar sangre a la piel desvía flujo desde el territorio esplácnico, que se vasocontrae. Por eso «aumentar la vascularización esplácnica» es lo que NO ocurre.'
                      '\n\n⚠️ La opción c decía por error «vasoconstricción cutánea»; corregida a «vasodilatación», como en el examen original.')
            n+=1; continue
        q['correct']=v['correct']
        also=[a for a in v.get('also') or [] if a!=v['correct']]
        exp=v['exp'].strip()
        if also and k=='imi':   # el motor de IMI no acepta segunda respuesta: se avisa en la explicación
            exp+='\n\n▸ También defendible: '+' / '.join('«%s»'%q['options'][a] for a in also)+' (otras versiones del examen la dan como clave).'
            q.pop('also',None)
        elif also: q['also']=also
        else: q.pop('also',None)
        q['exp']=exp; n+=1
    s=s[:m.start()]+"const ALL_QUESTIONS = %s;\n"%json.dumps(qs,ensure_ascii=False)+s[m.end():]
    open(R+f,'w',encoding='utf-8').write(s); print(f,'tocadas',n)
