#!/usr/bin/env python3
"""Preguntas cortas y de desarrollo de los exámenes antiguos de IMI (19-11-2026) a la sala
de estudio: se añaden al apartado «🗣️ Explícalo» (`explicalo`) del tema que las cubre, con
la respuesta modelo escrita desde los apuntes de clase y el Sisinio. Fuentes: Examen
Patología 2020, Enero 2021, 1.er parcial 2021 (Moodle), febrero 2013 (preguntas cortas de la
pág. 10) y septiembre 2018 (recopilación TESTEXAMENES). Idempotente (no repite un `pide`).

Uso: python3 tools/imi_cortas_sala_2026-11-19.py && python3 tools/estudio_validar.py medint
"""
import json, os

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = "📝 Pregunta corta de examen"

ENTRADAS = {
 "03": [
  (f"{P} (2020, enero 2021 y parcial 2021). Describe lo que entendemos por diagnóstico nosológico.",
   "Es el diagnóstico que afirma el nombre de la enfermedad que padece el enfermo (en el caso de clase, «infarto agudo de miocardio»). Se distingue del etiológico o causal (la causa: coronaritis luética), del lesional (el daño en el órgano: inflamación coronaria y necrosis miocárdica), del patogénico (el mecanismo por el que aparecen los síntomas: anoxia, muerte celular, alteración hemodinámica) y del sintomático. Poner nombre a la enfermedad es lo que permite buscar su causa, su pronóstico y su tratamiento."),
  (f"{P} (febrero 2013). Concepto de patocronia.",
   "Patocronia es el estudio de la enfermedad en relación con el tiempo: la parte de la Patología que describe sus fases evolutivas ordenadas. Comienzo o inicio (brusco o gradual, con o sin pródromos, que son las manifestaciones triviales que preceden a las específicas), periodo de estado (la enfermedad con todas sus manifestaciones) y terminación: curación en crisis (brusca) o en lisis (gradual), paso a la cronicidad, secuelas o muerte. Sirve para situar al enfermo en el curso de su enfermedad y para el pronóstico."),
 ],
 "05": [
  (f"{P} (septiembre 2018). ¿Cómo exploraría el undécimo par craneal?",
   "El XI par (espinal o accesorio) inerva el esternocleidomastoideo y el trapecio. Se explora pidiendo al enfermo que encoja los hombros contra la resistencia de las manos del explorador (trapecio) y que gire la cabeza hacia cada lado contra resistencia mientras se palpa el esternocleidomastoideo del lado contrario. Su parálisis da el hombro caído, con dificultad para elevarlo y para girar la cabeza. No se explora con el reflejo nauseoso (IX-X) ni con el Romberg."),
 ],
 "08": [
  (f"{P} (2020, enero 2021 y parcial 2021). Define la egofonía.",
   "Es una alteración de la auscultación de la voz: la voz alta se transmite con un timbre balante o tembloroso, «de cabra» (la «e» suena como «a»). Se oye por encima de un derrame pleural serofibrinoso, en el borde superior del derrame, a la altura del ángulo inferior de la escápula; la diapositiva la considera patognomónica del derrame. No confundir con la broncofonía y la pectoriloquia (voz transmitida con más intensidad o articulada), que son de la condensación."),
  (f"{P} (parcial 2021). Semiología auscultatoria del derrame pleural.",
   "Sobre el derrame, el líquido separa el pulmón de la pared y no transmite: murmullo vesicular abolido y vibraciones vocales abolidas, con matidez a la percusión cuyo límite cambia con la postura. En el borde superior del derrame, donde el pulmón comprimido queda con el bronquio permeable, se oyen un soplo pleurítico (suave, espiratorio) y egofonía. El roce pleural y el dolor del comienzo desaparecen cuando el líquido separa las dos hojas."),
  (f"{P} (febrero 2013). Clasificación de los estertores.",
   "Los estertores son ruidos patológicos que nacen en bronquios o alvéolos y se modifican con la tos y la respiración. Hay dos familias con dos tipos cada una. Secos: sibilancias (tono alto, musical, «pitos», por vibración del aire en bronquios estrechados: asma, EPOC) y roncus (tono bajo, «ronquido», por moco espeso en bronquios grandes y medianos; cambian con la tos). Húmedos: subcrepitantes (burbujas desiguales, finas, medianas o gruesas, por líquido viscoso en bronquios, alvéolos o cavidades; cambian con la tos y la expectoración: bronquitis, bronquiectasias) y crepitantes (finos, iguales entre sí, en salvas al final de la inspiración, por apertura de alvéolos con líquido: neumonía, insuficiencia cardíaca, fibrosis). Aparte quedan el roce pleural (grave, en ambas fases, no cambia con la tos) y el estridor (inspiratorio, de vía aérea alta)."),
  (f"{P} (septiembre 2018). En un neumotórax, ¿qué soplo y qué voz puede encontrar en la auscultación?",
   "El aire a tensión en la cavidad pleural actúa como caja de resonancia: puede auscultarse un soplo anfórico (timbre metálico, «de ánfora») y voz anfórica (reverberación metálica de la voz). Todo ello sobre un hemitórax con murmullo vesicular y vibraciones vocales abolidos y percusión timpánica, que es el signo fundamental del neumotórax."),
 ],
 "09": [
  (f"{P} (septiembre 2018). ¿Qué es el desdoblamiento paradójico del segundo tono y cuándo aparece?",
   "Es el desdoblamiento invertido: el cierre aórtico (A2) se retrasa tanto que ocurre después del pulmonar (P2), de modo que el segundo tono se oye desdoblado en espiración y único en inspiración, al revés que el fisiológico (en inspiración P2 se retrasa y se separa de A2). Aparece cuando se alarga la eyección o la activación del ventrículo izquierdo: bloqueo de rama izquierda, estenosis aórtica grave (el tiempo de eyección se alarga y la válvula aórtica cierra más tarde), marcapasos en ventrículo derecho e insuficiencia ventricular izquierda grave."),
 ],
 "10": [
  (f"{P} (2020). Describe la realización de una palpación en gancho.",
   "Es una técnica de palpación del hígado. El médico se coloca a la derecha del paciente mirando hacia sus pies, apoya las dos manos bajo el reborde costal derecho y engancha los dedos flexionados por debajo del reborde, ejerciendo cierta presión; se pide al enfermo una respiración tranquila y profunda y, en cada inspiración, el borde hepático baja y choca contra los pulpejos. Se empieza en la fosa ilíaca derecha y se asciende en cada espiración. Es la alternativa a la palpación bimanual (la mano izquierda empuja desde la región lumbar). Si hay hepatomegalia se mide en cm bajo el reborde en la línea medioclavicular y se describen borde, consistencia, superficie y dolor."),
  (f"{P} (febrero 2013). Describe la semiotecnia y la semiología del signo de McBurney.",
   "Semiotecnia: con el paciente en decúbito supino, relajado y con las piernas algo flexionadas, se presiona con los dedos en el punto de McBurney, la unión del tercio externo con los dos tercios internos de la línea que va de la espina ilíaca anterosuperior derecha al ombligo. Semiología: el dolor a la presión en ese punto indica inflamación del apéndice (apendicitis aguda). Se completa con el signo de Blumberg (más dolor al soltar bruscamente que al presionar: irritación peritoneal; es un signo, no un punto, y puede ser positivo en cualquier región) y con las maniobras que localizan el origen: Rovsing (dolor en fosa ilíaca derecha al comprimir la izquierda), Meltzer, psoas (apéndice retrocecal) y obturador (apéndice pélvico)."),
 ],
 "12": [
  (f"{P} (2020, enero 2021 y parcial 2021). Describe la patogenia de la hipoxia histotóxica y pon algún ejemplo.",
   "La sangre llega al tejido con oxígeno normal (PaO2 y saturación normales), pero la célula no puede utilizarlo porque está envenenada la cadena respiratoria mitocondrial: no se produce ATP aunque sobre oxígeno, y la sangre venosa sale muy oxigenada. Ejemplos: la intoxicación por cianuro (bloquea la citocromo-oxidasa), otras intoxicaciones y la sepsis. Se diferencia de la hipoxia hipoxémica (falla la oxigenación en el pulmón), de la anémica (falta hemoglobina o está ocupada, como en el CO) y de la circulatoria o de estasis (el flujo no llega: shock, insuficiencia cardíaca, obstrucción arterial)."),
 ],
 "13": [
  (f"{P} (septiembre 2018). Etiología cortical de la tos.",
   "La tos es un reflejo con centro en el bulbo (núcleo del tracto solitario), al que llegan aferencias por el vago y el laríngeo superior desde los receptores de laringe, tráquea y bronquios, y cuyas eferencias van a los músculos espiratorios y a la glotis. Pero también puede iniciarse desde la corteza: es la tos voluntaria y la tos psicógena (nerviosa, «de tic»), que aparece sin lesión de la vía aérea, suele desaparecer durante el sueño y se relaciona con la ansiedad."),
 ],
 "14": [
  (f"{P} (2020, enero 2021 y parcial 2021). Describe los tapones de Dietrich.",
   "Son uno de los componentes que se pueden ver a simple vista en el esputo purulento: pequeñas masas de restos de tejido necrosado, agujas de ácidos grasos y gran número de bacterias, de olor fétido. Se asocian a las supuraciones broncopulmonares (bronquiectasias, absceso de pulmón). El paciente puede contarlo («lo he tocado y tiene como cositas»). Los otros componentes de la diapositiva son las espirales de Curschmann (moldes de moco de los bronquiolos, en el asma) y los cristales de Charcot-Leyden (de eosinófilos, en el asma)."),
 ],
 "15": [
  (f"{P} (2020, enero 2021 y parcial 2021). Describe el mecanismo del derrame pleural por «disminución de la presión intrapleural».",
   "Es el mecanismo del derrame de las atelectasias, sobre todo las obstructivas: al colapsarse el pulmón, la tracción del parénquima sobre la pleura hace más negativa la presión en la cavidad pleural, aumenta el gradiente entre los capilares pleurales y el espacio pleural y el líquido sale de los capilares hacia la cavidad, donde se acumula un trasudado. Es uno de los mecanismos de la diapositiva, junto al aumento de la presión hidrostática (insuficiencia cardíaca), el descenso de la presión oncótica (hipoalbuminemia), el aumento de la permeabilidad (exudados inflamatorios) y la obstrucción linfática."),
 ],
 "17": [
  (f"{P} (enero 2021). ¿Cuántos tipos de enfisema primario existen? Nómbralos y di con qué se asocia cada uno.",
   "Tres, según la parte del lobulillo que se destruye: panlobulillar o panacinar (todo el lobulillo; déficit de α1-antitripsina), centroacinar o centrolobulillar (la zona central del acino; el fumador con bronquitis crónica) y paraseptal (la periferia, junto a los septos y la pleura; bullas pulmonares). El profesor avisó: «cae, cae, cae pregunta»."),
  (f"{P} (septiembre 2018). En la exploración de una condensación pulmonar, ¿qué ocurre con las vibraciones vocales y por qué?",
   "Aumentan: el pulmón sin aire pero con el bronquio permeable transmite mejor las vibraciones de la voz hasta la pared, como un sólido. Es lo que distingue la condensación (matidez, vibraciones aumentadas, soplo tubárico, broncofonía o pectoriloquia, crepitantes) del derrame pleural y de la atelectasia, donde las vibraciones están abolidas porque el líquido o el bronquio obstruido no las dejan llegar."),
 ],
 "19": [
  (f"{P} (febrero 2013). Comenta las causas posibles del soplo de Austin Flint.",
   "Es un retumbo diastólico mitral funcional que se oye en la punta en la insuficiencia aórtica grave, sin que la válvula mitral esté enferma. Se produce porque el chorro de regurgitación aórtica choca contra la valva anterior de la mitral y le impide abrirse del todo, creando una estenosis mitral funcional durante el llenado; también contribuye la subida rápida de la presión diastólica del ventrículo izquierdo, que tiende a cerrar la mitral antes de tiempo. Se distingue del soplo de la estenosis mitral orgánica porque no hay chasquido de apertura ni R1 fuerte y porque disminuye con los vasodilatadores (el de la estenosis mitral aumenta)."),
  (f"{P} (septiembre 2018). ¿Qué complicación es frecuente en la valvulopatía mitral cuando hay fibrilación auricular, y por qué?",
   "Las embolias sistémicas: en la estenosis mitral la aurícula izquierda dilatada y en fibrilación no se contrae, la sangre se estanca y forma trombos (sobre todo en la orejuela) que se desprenden y producen microembolias y embolias en el cerebro, las extremidades o las vísceras. Por eso la fibrilación auricular en la valvulopatía mitral obliga a anticoagular."),
  (f"{P} (septiembre 2018). ¿A qué valvulopatía se asocia el síndrome de Marfan?",
   "A la insuficiencia mitral por prolapso de la válvula mitral (degeneración mixomatosa de las valvas, con clic mesosistólico y soplo telesistólico), que fue la respuesta esperada en el examen de septiembre de 2018. También se asocia a la insuficiencia aórtica por dilatación de la raíz aórtica y del anillo, que además puede disecarse."),
  (f"{P} (septiembre 2018). ¿Cuál es la etiología más frecuente de la pericarditis constrictiva?",
   "En el examen la respuesta esperada fue la pericarditis idiopática (o vírica), hoy la causa más frecuente en nuestro medio, seguida de la pericarditis tras cirugía cardíaca y de la radioterapia; la tuberculosa, clásica, sigue siendo la primera en los países en desarrollo. La constricción es una cicatriz fibrosa, a veces calcificada, que impide el llenado diastólico: ingurgitación yugular que aumenta con la inspiración (signo de Kussmaul), hepatomegalia, ascitis y edemas, y un «knock» pericárdico protodiastólico."),
 ],
 "20": [
  (f"{P} (2020). Comenta el mecanismo de reentrada que explica la etiopatogenia de las arritmias.",
   "La reentrada es un «cortocircuito» por el que un mismo impulso vuelve a excitar una zona de miocardio que ya había despolarizado, de forma repetida e indefinida. Necesita tres condiciones: un circuito con dos vías de conducción (anatómico, como la vía accesoria del WPW, o funcional, como el tejido heterogéneo del infarto), un bloqueo unidireccional en una de ellas, que impide la conducción en un sentido pero no en el otro, y una conducción lo bastante lenta por la otra vía para que el impulso encuentre el tejido ya fuera del periodo refractario (en el relativo sí responde) y pueda reexcitarlo. Explica la mayoría de las taquicardias paroxísticas y la fibrilación ventricular del infarto, que es de lo que muere el infartado de muerte súbita."),
  (f"{P} (septiembre 2018). ¿Qué caracteriza al bloqueo AV de primer grado?",
   "Solo hay un retraso de la conducción auriculoventricular: el intervalo PR es constante y alargado (más de 0,20 s), pero todas las ondas P van seguidas de su QRS, no se pierde ningún latido. Suele ser asintomático y no necesita marcapasos, a diferencia del bloqueo de segundo grado (algunas P no conducen) y del completo (disociación entre P y QRS, con ritmo de escape lento)."),
 ],
 "108": [
  (f"{P} (febrero 2013 y septiembre 2018). Describe la semiología de la claudicación intermitente.",
   "Es dolor muscular (pantorrilla, muslo o glúteo, según el nivel de la obstrucción) que aparece al caminar siempre una distancia parecida, obliga a parar y cede con el reposo en pocos minutos, para reaparecer al reanudar la marcha. Se debe a isquemia arterial crónica, casi siempre por aterosclerosis: el aporte de oxígeno no cubre la demanda del músculo en ejercicio. Se acompaña de pulsos distales disminuidos o ausentes, frialdad, palidez al elevar el miembro y rubor al bajarlo, piel atrófica y sin vello, y en fases avanzadas dolor en reposo y úlceras. La distancia a la que aparece gradúa la enfermedad. Es el síntoma que hay que buscar en la anamnesis del hipertenso con pulsos disminuidos en las piernas."),
 ],
 "119": [
  (f"{P} (septiembre 2018). ¿En qué valvulopatía no hay ortopnea ni disnea de esfuerzo, y por qué?",
   "En la insuficiencia tricúspide (y en general en las valvulopatías derechas): la sobrecarga queda en el lado derecho y la sangre se remansa en las venas sistémicas (ingurgitación yugular con onda v, hepatomegalia pulsátil, ascitis, edemas), sin congestión venosa pulmonar, que es la que produce la disnea de esfuerzo y la ortopnea de las valvulopatías izquierdas. Su soplo es pansistólico en el foco tricúspide y aumenta con la inspiración (signo de Rivero-Carvallo)."),
 ],
 "123": [
  (f"{P} (parcial 2021). Describe el síncope de origen cardíaco.",
   "Es el síncope de mayor mortalidad. Es de forma súbita, con pocos o ningún pródromo (la diapositiva le atribuye palpitaciones o dolor torácico; el síncope arrítmico, síndrome de Adams-Stokes, suele ser sin aviso) y aparece a menudo con el esfuerzo. Mecanismos: obstrucción al flujo de salida del ventrículo izquierdo (estenosis aórtica, miocardiopatía hipertrófica, mixoma auricular), arritmias (bloqueo AV completo, taquicardias rápidas, síndrome de WPW, bradicardias), hipertensión pulmonar, taponamiento cardíaco y cardiopatías congénitas. Obliga a un ECG y a un estudio cardiológico, porque anuncia riesgo de muerte súbita."),
 ],
}


def main():
    total = 0
    for num, lista in ENTRADAS.items():
        ruta = os.path.join(RAIZ, "estudio", "medint", "tema-%s.json" % num)
        t = json.load(open(ruta, encoding="utf-8"))
        ya = {x["pide"] for x in t["explicalo"]}
        for pide, modelo in lista:
            if pide in ya:
                continue
            t["explicalo"].append({"pide": pide, "modelo": modelo})
            total += 1
        json.dump(t, open(ruta, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("añadidas", total, "preguntas cortas en", len(ENTRADAS), "temas")


if __name__ == "__main__":
    main()
