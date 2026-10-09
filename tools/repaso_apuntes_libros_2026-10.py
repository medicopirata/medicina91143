#!/usr/bin/env python3
"""Fisio I e Histología Esp. I: repaso con apuntes de clase primero y libros de referencia después (oct-2026)."""
import json,re,sys,collections
F=json.load(open('/tmp/apuntes/rep/hallazgos2.json'))
SALTAR={('F',398),('F',432),('H',266)}                 # segundas de seguridad baja: solo explicación
HTML={'F':'/tmp/med91/plataforma_fisio1.html','H':'/tmp/med91/plataforma_histologia2.1.html'}
NOTA={'F':' ▸ Respuesta múltiple en el examen original: la plataforma acepta también ','H':' ▸ También se da por buena: '}
for a,H in HTML.items():
    s=open(H,encoding='utf-8').read(); m=re.search(r"const ALL_QUESTIONS = (\[.*?\]);\n",s,re.S); qs=json.loads(m.group(1)); Q={q['id']:q for q in qs}
    n=collections.Counter(); tocadas=set()
    for e in F:
        if e['_a']!=a: continue
        q=Q[e['id']]; k=(a,e['id'])
        if e['tipo']=='clave':
            al=(set(q.get('also',[]))|set(e.get('tambien_idx') or [])); q['correct']=e['correcta_idx']; al.discard(q['correct']); q['also']=sorted(al); n['clave']+=1; tocadas.add(e['id'])
        elif e['tipo']=='segunda' and k not in SALTAR:
            al=set(q.get('also',[]))|set(e.get('tambien_idx') or []); al.discard(q['correct']); q['also']=sorted(al); n['segunda']+=1; tocadas.add(e['id'])
        if e.get('exp_nueva'): q['exp']=e['exp_nueva'].strip(); n['exp']+=1; tocadas.add(e['id'])
        elif e.get('cita') or e.get('motivo'):
            nota=' 📓 '+(('En clase: '+e['cita'].replace('**','').strip()) if e.get('cita') else e['motivo'].strip())
            q['exp']=re.sub(r' ▸ (Respuesta múltiple en el examen original|También se da por buena).*$','',q.get('exp','')).strip()+nota; n['nota']+=1; tocadas.add(e['id'])
    if a=='F':
        q=Q[767]; q['q']='Si el QRS es positivo en DI y negativo en aVF, el eje eléctrico ventricular se desvía a la'; n['reformulada']+=1
    else:
        q=Q[205]; q['q']='Señale la afirmación correcta:'; q['exp']='Las tres cifras son correctas: las válvulas conniventes (pliegues circulares) multiplican la superficie por 2-3, las vellosidades por 10 y las microvellosidades por 20; por eso la respuesta es «Todas las afirmaciones son ciertas». El enunciado original pedía la incorrecta, pero no había ninguna; se ha corregido.'
        q=Q[315]; q['options'][0]='Impide que los antígenos de la sangre lleguen a los timocitos en maduración'
        q['exp']='La barrera hematotímica es una barrera física de la corteza (capilares continuos con membrana basal y pericitos, macrófagos perivasculares y células epiteliorreticulares tipo I con uniones ocluyentes) que impide que los antígenos de la sangre entren en el timo, para que la maduración sea correcta. No elimina clones autorreactivos: eso es la selección negativa, en la médula (la opción original lo decía así y se ha corregido). Los antígenos no salen a los espacios extravasculares, la barrera está en la corteza y sus capilares sí tienen membrana basal.'
        n['reformulada']+=2
    for q in qs:
        if q['id'] in tocadas or q.get('also'):
            base=re.sub(r' ▸ (Respuesta múltiple en el examen original: la plataforma acepta también|También se da por buena:).*$','',q.get('exp','')).strip()
            if q.get('also'): q['exp']=base+NOTA[a]+' · '.join('«%s»'%q['options'][j].rstrip('.') for j in q['also'])+'.'
            else: q['exp']=base; q.pop('also',None)
        assert 0<=q['correct']<len(q['options']) and q['correct'] not in q.get('also',[]) and all(j<len(q['options']) for j in q.get('also',[])),q['id']
    print(a,dict(n),'| con also:',sum(1 for q in qs if q.get('also')))
    if '--escribir' in sys.argv:
        s=s[:m.start(1)]+json.dumps(qs,ensure_ascii=False,separators=(',',':'))+s[m.end(1):]
        if a=='H' and 'function dispAlso' not in s:
            def rep(x,y):
                global s
                assert s.count(x)==1,(x,s.count(x)); s=s.replace(x,y)
            rep("// ¿La clave que se está usando es la predefinida y no una marcada por el usuario?","// Preguntas con más de una respuesta válida: otras opciones (sobre lo que se muestra) que también\n// se dan por buenas. Solo cuentan con la clave predefinida, no con una marcada por el usuario.\nfunction dispAlso(q) {\n  if (!Array.isArray(q.also) || !keyIsPredefined(q)) return [];\n  return q.also.map(o => q.perm ? q.perm.indexOf(o) : o).filter(i => i >= 0);\n}\n// ¿La clave que se está usando es la predefinida y no una marcada por el usuario?")
            rep("    const wasCorrect = chosenIdx === dc;\n","    const also = dispAlso(q);\n    const wasCorrect = chosenIdx === dc || also.includes(chosenIdx);\n")
            rep("    if (!wasCorrect && btns[dc]) btns[dc].classList.add('correct');\n","    if (!wasCorrect && btns[dc]) btns[dc].classList.add('correct');\n    also.forEach(i => { if (btns[i]) btns[i].classList.add('correct'); });\n")
            rep("      if (!prevAnswer.wasCorrect && btns[dcPrev]) btns[dcPrev].classList.add('correct');\n","      if (!prevAnswer.wasCorrect && btns[dcPrev]) btns[dcPrev].classList.add('correct');\n      dispAlso(q).forEach(i => { if (btns[i]) btns[i].classList.add('correct'); });\n")
            rep("      btns.forEach((b, i) => { b.disabled = true; if (i === dc) b.classList.add('correct'); });","      const alsoC = dispAlso(q);\n      btns.forEach((b, i) => { b.disabled = true; if (i === dc || alsoC.includes(i)) b.classList.add('correct'); });")
        open(H,'w',encoding='utf-8').write(s); print('  escrito')
