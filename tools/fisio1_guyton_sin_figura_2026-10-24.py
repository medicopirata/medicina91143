#!/usr/bin/env python3
"""Fisio I · preguntas del Repaso del Guyton que citaban una figura del libro
que no tenemos («(figura del libro: …)»). Se reescriben con los datos de la
figura dentro del enunciado (sacados de la propia explicación) y, cuando las
opciones eran solo letras de curvas o puntos que no se ven, las opciones pasan
a describir lo que hay en cada una. La clave (`correct`) no cambia.

El enunciado de antes se guarda en `qLibro` (no se pierde nada). Idempotente:
se puede pasar las veces que haga falta.

Uso:  python3 tools/fisio1_guyton_sin_figura_2026-10-24.py [plataforma_fisio1.html]
"""
import json, os, re, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

BUCLE = ("En el bucle presión-volumen del ventrículo izquierdo, A–B es el llenado ventricular, "
         "B el inicio de la contracción isovolumétrica, B–C la contracción isovolumétrica, "
         "C la apertura de la válvula aórtica, C–D la eyección y D–A la relajación isovolumétrica. ")
NEFRONA = ("Puntos de la nefrona: A = túbulo proximal; B = rama descendente del asa; C = rama ascendente "
           "gruesa del asa de Henle; D = porción inicial del túbulo distal; E = porción final del túbulo "
           "distal y túbulo colector. ")
DARROW = "Diagramas de Darrow-Yannet (anchura = volumen, altura = osmolaridad): "

# id -> {"q": enunciado nuevo, "options": opciones nuevas (opcional)}
CAMBIOS = {
    # Tema 2 · bucle presión-volumen
    95004: {"q": "En la paciente del caso, la frecuencia cardíaca es de 70 latidos/min y en su bucle presión-volumen el volumen ventricular pasa de 250 ml en el punto C (apertura aórtica) a 150 ml en el punto D (cierre aórtico). ¿Cuál es su gasto cardíaco en ml/min?"},
    95005: {"q": BUCLE + "¿Cuándo aparece el primer tono cardíaco?"},
    95006: {"q": BUCLE + "¿Cuándo se produce el cuarto tono cardíaco?"},
    95007: {"q": "En la paciente del caso, el volumen sistólico es de 100 ml y el volumen telesistólico (punto D del bucle presión-volumen) es de 150 ml. ¿Cuál es su fracción de eyección ventricular?"},
    # Tema 4 · ECG
    95035: {"q": "En el registro de la derivación II de la mujer del caso, el intervalo RR es de 0,86 s. ¿Cuál es su frecuencia cardíaca en latidos por minuto?"},
    95036: {"q": "En el ECG de la mujer del caso, el voltaje del QRS es de 0,9 mV en la derivación II y de 0,4 mV en la derivación III. De acuerdo con la ley de Einthoven, ¿cuál es el voltaje del QRS en la derivación I?"},
    95042: {"q": "En el ECG de la mujer del caso, el voltaje neto del QRS es de +0,64 mV en la derivación I, −0,34 mV en la II y −0,98 mV en la III. ¿Cuál es el eje eléctrico medio?"},
    95043: {"q": "En la derivación I del ECG de la mujer del caso, el intervalo RR es de 0,68 s. ¿Cuál es su frecuencia cardíaca?"},
    95044: {"q": "El ECG de la mujer del caso muestra complejos QRS de más de 0,12 s de duración. ¿Cuál es el diagnóstico probable?"},
    95047: {"q": "En la derivación I del ECG de la mujer del caso, el QRS tiene una gran deflexión negativa (y es positivo en la III) y el intervalo RR es de 0,58 s. ¿Cuál es su frecuencia cardíaca?"},
    95048: {"q": "El ECG de la mujer del caso muestra un QRS muy negativo en la derivación I y positivo en la III (desviación del eje a la derecha), con una duración del QRS menor de 0,12 s. ¿Qué tipo de soplo está presente en esta paciente?"},
    95050: {"q": "Una mujer de 70 años acudió al servicio de urgencias de un hospital porque sufría dolor torácico. En su ECG, la corriente de lesión (punto J menos segmento TP) es negativa en la derivación I y positiva en la III, y en V2 el electrodo registra un potencial de lesión muy negativo. ¿Cuál es el diagnóstico probable?"},
    95053: {"q": "Un hombre de 50 años acaba de ser contratado en ABC Software. En el ECG de su exploración física rutinaria, el QRS es positivo en la derivación I y negativo en la III. ¿Cuál es su diagnóstico probable?"},
    95057: {"q": "Una mujer de 60 años acudió al servicio de urgencias de un hospital y se quejaba de dolor torácico. En su ECG, las corrientes de lesión son negativas en las derivaciones II y III (vector resultante casi vertical) y el segmento TP está elevado respecto al punto J. ¿Cuál es el diagnóstico más probable?"},
    95062: {"q": "El siguiente electrocardiograma se obtuvo para un hombre de 60 años que pesa 99,8 kg. En la derivación II estándar, cada onda P va seguida de su QRS, sin ningún QRS fallido, y el intervalo PR mide unos 0,3 s. ¿Cuál es su diagnóstico?"},
    95063: {"q": "Una mujer de 35 años tenía sensaciones no habituales en el tórax después de fumarse un cigarrillo. Su ECG muestra latidos prematuros con QRS anchos y mucho más altos de lo normal; el eje eléctrico medio de esos QRS, calculado en las derivaciones de las extremidades, se dirige desde la base hacia la punta del ventrículo. ¿Cuál es el diagnóstico probable?"},
    95064: {"q": "El ECG del hombre del caso muestra una frecuencia cardíaca rápida con dos ondas P por cada complejo QRS. ¿Cuál es su diagnóstico?"},
    95065: {"q": "En el ECG del hombre del caso (dos ondas P por cada QRS), el intervalo RR medio es de 0,4 s. ¿Cuál es su frecuencia cardíaca ventricular en latidos por minuto?"},
    95068: {"q": "Una mujer de 65 años que sufrió un infarto de miocardio hace 10 días acudió a consulta de su médico de familia y le indicó que sentía una frecuencia de pulso rápida. Su ECG muestra una racha de latidos rápidos, de comienzo brusco, con complejos QRS anchos, de alto voltaje y muy distintos de los QRS normales que los preceden. ¿Cuál es el diagnóstico probable?"},
    95069: {"q": "Un hombre de 65 años tenía este ECG en su exploración física anual: cada uno de los cuatro primeros QRS va precedido de su onda P, y después aparece una onda P que no va seguida de QRS. ¿Cuál es el diagnóstico probable?"},
    95073: {"q": "En la derivación I del ECG del hombre del caso, el intervalo RR es de 0,4 s. ¿Cuál es su frecuencia cardíaca?"},
    95074: {"q": "En la derivación I del ECG del hombre del caso, a 150 latidos/min, las ondas P, los QRS y las ondas T son normales, cada onda P va seguida de su QRS, no falta ningún latido y el segmento ST no está deprimido. ¿Cuál es su diagnóstico actual?"},
    95077: {"q": "Un hombre de 45 años se sometió a una exploración física rutinaria anual. Su ECG muestra una taquicardia con complejos QRS de forma y tamaño normales y una sola onda P por cada QRS. ¿Cuál es el diagnóstico probable?"},
    95078: {"q": "Una mujer de 60 años acude al médico para su revisión anual. En el ECG no hay ondas P evidentes y el ritmo ventricular es irregular. ¿Cuál es el diagnóstico probable?"},
    95079: {"q": "En el ECG del hombre del caso, el intervalo RR es de unos 1,6 s. ¿Cuál es su frecuencia cardíaca?"},
    95080: {"q": "En el ECG del hombre del caso (frecuencia de 37 latidos/min), las ondas P no guardan ninguna relación con los QRS: entre dos complejos caben unas veces dos ondas P y otras tres. ¿Cuál es el diagnóstico probable?"},
    # Tema 9
    95164: {"q": "En las curvas de gasto cardíaco y retorno venoso de una persona normal, el punto de equilibrio está en una presión de llenado sistémica media de 7 mmHg, una presión auricular derecha de 0 mmHg y un gasto cardíaco de 5 l/min. ¿Cuál de las siguientes opciones es la verdadera?"},
    # Tema 10
    95190: {"q": "¿Qué ocurre en la vasculatura pulmonar cuando el gasto cardíaco aumenta hasta su valor máximo?",
            "options": ["Se abren vasos que estaban cerrados (reclutamiento) y los abiertos se dilatan (distensión)",
                        "Se cierran parte de los vasos para mantener la presión",
                        "Los mismos vasos de reposo se contraen (vasoconstricción)",
                        "Los vasos no cambian y sube mucho la presión arterial pulmonar",
                        "Solo se dilatan los vasos que ya estaban abiertos, sin abrirse ninguno nuevo"]},
    # Tema 11
    95194: {"q": "Se obtienen tres curvas volumen-presión transpulmonar (S, T y U) en pulmones aislados: S es la de mayor pendiente, T la intermedia y U la de menor pendiente. ¿Cuál de las siguientes características describe mejor las distensibilidades relativas para las tres curvas?"},
    95199: {"q": "Se obtienen las curvas volumen-presión de un sujeto normal y de un paciente con una enfermedad pulmonar; la curva del paciente tiene mayor pendiente (mayor distensibilidad) que la normal. ¿Qué anomalía estará presente más probablemente en el paciente?"},
    # Tema 12
    95204: {"q": "En un espirograma, el volumen corriente es de 500 ml. Suponiendo una frecuencia respiratoria de 12 respiraciones/min, calcule la ventilación por minuto."},
    95205: {"q": "Una mujer de 22 años inhala todo el aire posible y exhala todo el aire que puede; en su espirograma, el volumen de reserva espiratoria es de 2 l. Utilizando la técnica de dilución de helio, se determinó un volumen residual de 1 l. ¿Cuál es su CRF (en litros)?"},
    95218: {"q": "En el diagrama O2-CO2, la línea de cocientes de ventilación-perfusión (V/Q) del pulmón normal une la sangre venosa mixta (V/Q = 0) con el aire inspirado (V/Q = ∞). ¿Cuál de las siguientes características describe mejor el efecto de reducir el cociente V/Q en los valores de Po2 y Pco2 alveolares? (Tensión de CO2 · Tensión de O2)"},
    95220: {"q": "En la línea V/Q del diagrama O2-CO2, los puntos A–E van, por orden, desde V/Q = 0 (A: gas igual a la sangre venosa mixta, Po2 40 y Pco2 45 mmHg) hasta V/Q = ∞ (E: gas igual al aire inspirado); C es el cociente normal. Un hombre de 67 años tiene un tumor sólido que presiona contra una vía aérea y obstruye parcialmente el flujo de aire en los alvéolos distales. ¿Qué punto corresponde al gas alveolar de estos alvéolos distales?"},
    95221: {"q": "En la línea V/Q del diagrama O2-CO2, los puntos A–E van, por orden, desde V/Q = 0 (A: gas igual a la sangre venosa mixta) hasta V/Q = ∞ (E: gas igual al aire inspirado); C es el cociente normal. Un hombre de 55 años presenta una embolia pulmonar que bloquea completamente el flujo sanguíneo en su pulmón derecho. ¿Qué punto corresponde al gas alveolar de su pulmón derecho?"},
    95222: {"q": "Un pulmón tiene una gran derivación: parte de la sangre venosa mixta (Po2 de 40 mmHg) sortea las zonas de intercambio de O2. ¿Cuál es la tensión de O2 de la sangre arterial (en mmHg) cuando la persona respira O2 al 100% y la tensión de O2 inspirada es mayor que 600 mmHg?"},
    95223: {"q": "Dos unidades pulmonares, S y T, reciben su aporte de sangre: la unidad S tiene una relación ideal entre flujo sanguíneo y ventilación y la unidad T tiene un flujo sanguíneo comprometido. ¿Cuál es la relación entre el espacio muerto alveolar (DALV), el espacio muerto fisiológico (DFIS) y el espacio muerto anatómico (DANAT) para estas unidades pulmonares? (Unidad pulmonar S · Unidad pulmonar T)"},
    95224: {"q": "Durante un ejercicio intenso, el gasto cardíaco de un estudiante de Medicina de 32 años se cuadruplica. ¿Cómo cambia la tensión de O2 a medida que la sangre circula desde el extremo arterial al extremo venoso de sus capilares pulmonares?",
            "options": ["Parte de 40 mmHg y se queda muy por debajo de 104 mmHg en el extremo venoso",
                        "Parte de 40 mmHg y alcanza 104 mmHg en el primer tercio del capilar",
                        "Parte de 25 mmHg y alcanza 104 mmHg en el primer tercio del capilar",
                        "Parte de 40 mmHg y alcanza 104 mmHg cerca del extremo venoso",
                        "Parte de 25 mmHg y alcanza 104 mmHg cerca del extremo venoso"]},
    95225: {"q": "A lo largo del capilar pulmonar, desde el extremo arterial al venoso, la Po2 sube de 40 a 104 mmHg y la Pco2 baja de 45 a 40 mmHg. ¿Cómo es la relación normal entre ambas en reposo?",
            "options": ["Las dos alcanzan los valores alveolares en el primer tercio del capilar",
                        "La Po2 se equilibra en el primer tercio y la Pco2 no lo hace hasta el extremo venoso",
                        "La Pco2 se equilibra en el primer tercio y la Po2 no lo hace hasta el extremo venoso",
                        "Ninguna de las dos se equilibra hasta el extremo venoso",
                        "Ninguna de las dos llega a equilibrarse con el aire alveolar"]},
    95226: {"q": "Un hombre de 45 años inhaló la máxima cantidad de aire y después espiró con un esfuerzo máximo hasta que no podía exhalar más aire. Su curva de flujo-volumen espiratorio máximo (FVEM) corta el eje de volumen en 5,5 l (CPT) y en 1 l (VR). ¿Cuál es la capacidad vital forzada (CVF) de este hombre (en litros)?"},
    95227: {"q": "La curva de flujo-volumen espiratorio máximo (FVEM) se utiliza como herramienta de diagnóstico para identificar enfermedades pulmonares obstructivas y restrictivas. La curva empieza en la CPT, sube rápidamente hasta un pico de flujo y desciende hasta el VR. ¿En qué parte de la curva el colapso de las vías aéreas limita el flujo de aire espiratorio máximo?",
            "options": ["En la CPT, al comienzo de la espiración",
                        "En la subida inicial del flujo",
                        "En el pico de flujo",
                        "En la porción descendente de la curva",
                        "En el VR, al final de la espiración"]},
    95228: {"q": "Se obtienen las curvas de flujo-volumen espiratorio máximo (FVEM) de una persona sana y de un hombre de 57 años con disnea. La curva del paciente empieza y termina en volúmenes pulmonares anormalmente elevados y con flujos menores para cada volumen. ¿Qué trastorno tiene, probablemente, este hombre?"},
    95229: {"q": "Un hombre de 62 años refiere dificultad para respirar. Comparada con la de una persona sana típica, su curva de flujo-volumen espiratorio máximo (FVEM) empieza y termina en volúmenes pulmonares anormalmente bajos, con flujos mayores de lo normal para cada volumen. ¿Cuál de los siguientes problemas explica mejor la curva de este paciente?"},
    95230: {"q": "Un hombre de 75 años ha fumado 40 cigarrillos al día durante 60 años. Su curva de flujo-volumen en reposo alcanza ya la curva de flujo espiratorio máximo (FVEM), y su capacidad vital es de unos 3,4 l. ¿Qué conjunto de cambios se observará con mayor probabilidad? (Tolerancia al ejercicio · Capacidad pulmonar total · Volumen residual)"},
    95231: {"q": "En una espiración forzada, una persona sana (X) exhala 4 l en el primer segundo y 5 l en total; una persona con una enfermedad pulmonar (Z) exhala 2 l en el primer segundo y 4 l en total. ¿Cuál es el cociente volumen espiratorio máximo en el primer segundo (VEMS1)/capacidad vital forzada (en porcentaje) en estas personas? (Persona X · Persona Z)"},
    95232: {"q": "En una espiración forzada, una persona con pulmones sanos (X) tiene un VEMS1 de 4 l y una CVF de 5 l; un paciente (Z) tiene un VEMS1 de 3 l y una CVF de 3,5 l. ¿Qué trastorno tiene, probablemente, el paciente?"},
    95235: {"q": "Un estudiante de Medicina de 34 años genera varias curvas de flujo-volumen. W es su curva normal de flujo-volumen espiratorio máximo, obtenida cuando estaba sano. La curva X tiene un volumen corriente de unos 3 l y alcanza el flujo espiratorio máximo (4,5 l/s) de la curva W. ¿Cuál de los siguientes trastornos explica mejor la curva X?"},
    # Tema 13
    95244: {"q": "Según la curva de disociación normal de O2-Hb, ¿cuáles son los valores aproximados de saturación de Hb (% Hb-O2), Po2 y contenido de O2 para la sangre oxigenada que sale de los pulmones y la sangre reducida que regresa a los pulmones desde los tejidos? (Sangre oxigenada: % Hb-O2 · Po2 · Contenido de O2 — Sangre reducida: % Hb-O2 · Po2 · Contenido de O2)"},
    95246: {"q": "En una persona aquejada de anemia grave, ¿cómo están la saturación de la Hb y el contenido de O2 de la sangre arterial? (Saturación de Hb · Contenido de O2)",
            "options": ["Baja · Bajo", "Normal · Normal", "Baja · Normal", "Normal · Bajo"]},
    95247: {"q": "Comparada con la curva de disociación O2-Hb de la sangre normal, ¿cómo es la curva de la sangre que contiene CO?",
            "options": ["Igual saturación máxima y desplazada a la derecha",
                        "Igual saturación máxima y desplazada a la izquierda",
                        "Menor saturación máxima y desplazada a la derecha",
                        "Mayor saturación máxima y desplazada a la izquierda",
                        "Menor saturación máxima y desplazada a la izquierda",
                        "Menor saturación máxima y sin desplazamiento"]},
    95248: {"q": "Comparada con la curva de disociación O2-Hb de la sangre en reposo, ¿cómo es la curva de la sangre durante el ejercicio?",
            "options": ["Desplazada a la izquierda",
                        "Desplazada a la derecha",
                        "Sin cambios",
                        "Menor saturación máxima y sin desplazamiento",
                        "Menor saturación máxima y desplazada a la izquierda",
                        "Mayor saturación máxima y desplazada a la derecha"]},
    95249: {"q": "Comparada con la curva de disociación O2-Hb de la sangre de un adulto, ¿cómo es la curva de la sangre de un feto?",
            "options": ["Desplazada a la derecha",
                        "Menor saturación máxima y desplazada a la izquierda",
                        "Desplazada a la izquierda",
                        "Sin cambios",
                        "Menor saturación máxima y sin desplazamiento",
                        "Menor saturación máxima y desplazada a la derecha"]},
    # Tema 14
    95259: {"q": "¿Cómo cambia la ventilación alveolar (Va) cuando la tensión de CO2 arterial (Pco2) sube en el intervalo de 35 a 75 mmHg?",
            "options": ["Casi no cambia",
                        "Disminuye",
                        "Aumenta menos del doble",
                        "Se duplica",
                        "Se triplica",
                        "Aumenta más de ocho veces"]},
    95260: {"q": "¿Cómo cambia la ventilación alveolar (Va) cuando la tensión de O2 arterial (Po2) varía en un intervalo de 0 a 160 mmHg, si la Pco2 arterial y la concentración de H+ se mantienen normales?",
            "options": ["Aumenta de forma lineal al bajar la Po2 en todo el intervalo",
                        "No cambia en todo el intervalo",
                        "Disminuye al bajar la Po2",
                        "Casi no cambia por encima de 100 mmHg, se duplica a 60 mmHg y puede quintuplicarse con Po2 muy bajas",
                        "Se multiplica por ocho al bajar la Po2 de 100 a 60 mmHg",
                        "Aumenta al subir la Po2 por encima de 100 mmHg"]},
    95264: {"q": "La respiración de Cheyne-Stokes es un patrón respiratorio anómalo caracterizado por un aumento gradual en la profundidad de la respiración, seguido por una disminución progresiva que se produce aproximadamente cada minuto. En un ciclo, los puntos temporales V, W, X, Y y Z van por este orden: V es justo antes de que empiece a aumentar la profundidad, W el momento de máxima profundidad, X la fase en que decrece, Y el de mínima profundidad y Z la fase en que vuelve a crecer. ¿Qué puntos se asocian con el máximo valor de Pco2 de la sangre pulmonar y con la mayor Pco2 de las neuronas del centro respiratorio? (Sangre pulmonar · Centro respiratorio)"},
    # Tema 15
    95273: {"q": "Una mujer de 48 años consume una comida sana. ¿En qué lugar del tubo digestivo tendrán más probablemente las contracciones del músculo liso la máxima frecuencia?",
            "options": ["Duodeno", "Estómago", "Yeyuno", "Íleon", "Colon"]},
    # Tema 16
    95284: {"q": "Un hombre de 33 años acude a consulta médica porque le duele el pecho al comer, especialmente si come carne. Además, eructa en exceso y tiene acidez gástrica. Su esposa dice que le huele mal el aliento. Una radiografía muestra un esófago dilatado. ¿Qué registro de presión se obtendría con más probabilidad en el esfínter esofágico inferior de este paciente antes y después de la deglución?",
            "options": ["Presión basal positiva que cae tras la deglución",
                        "Presión basal subatmosférica con una onda positiva al pasar el bolo",
                        "Presión basal positiva alta que no disminuye tras la deglución",
                        "Presión basal de 0 mmHg que no cambia con la deglución",
                        "Presión basal subatmosférica que no cambia con la deglución"]},
    95286: {"q": "¿Qué registro manométrico corresponde a la función normal del esófago en el nivel torácico medio antes y después de la deglución?",
            "options": ["Presión basal subatmosférica que no cambia con la deglución",
                        "Presión basal positiva alta que no disminuye tras la deglución",
                        "Presión basal subatmosférica con una onda de presión positiva al pasar el bolo",
                        "Presión basal positiva que cae tras la deglución",
                        "Presión basal positiva con una onda positiva al pasar el bolo"]},
    95291: {"q": "En una manometría anorrectal, el registro X muestra reducciones repetidas de la presión cada vez que se infla un balón en el recto. ¿Qué estructura describe mejor el origen del registro X?"},
    95292: {"q": "Un paciente recibió entrenamiento del suelo pélvico. Antes del entrenamiento, la presión del esfínter anal externo no cambiaba al inflar un balón en el recto; después del entrenamiento, el esfínter externo se contrae al inflar el balón. ¿Cuál de las siguientes características describe mejor la dolencia para la cual el paciente recibió el entrenamiento?"},
    # Tema 18
    95316: {"q": "Una mujer de 21 años acude a consulta médica aquejada de náuseas, diarrea, mareo y flatulencia. Después de ayunar durante toda la noche, el médico le administra 50 g de lactosa oral en el instante cero. Si tiene deficiencia de lactasa, ¿qué combinación será la más probable durante las 3 h siguientes? (Glucemia · H2 en el aire espirado)",
            "options": ["Sube · No cambia", "No sube · Aumenta mucho", "Sube · Aumenta mucho", "No sube · No cambia"]},
    # Tema 19
    95317: {"q": "Un hombre de 23 años consume una comida que contiene un 30% de proteínas, un 15% de grasas y un 55% de hidratos de carbono. ¿En qué lugar del tubo digestivo serán absorbidas más probablemente las sales biliares por un proceso de transporte activo?",
            "options": ["Estómago", "Duodeno", "Yeyuno", "Íleon distal", "Colon"]},
}

# Las que ya llevan los datos en el enunciado: solo se quita «(figura del libro: …)»
# y las frases que remiten a la figura.
SOLO_NOTA = {97163, 97164, 97165, 97180, 97181, 97195, 97221, 97230, 97231, 97236, 97247, 97264, 97265}
NOTA = re.compile(r"\s*\(figura del libro[^()]*(?:\([^()]*\)[^()]*)*\)?\s*$")


def limpiar(q):
    t = NOTA.sub("", q)
    t = t.replace("Esquema de nefrona del libro con puntos A–E: ", "Puntos de la nefrona: ")
    t = t.replace(" (300 mg/min, según la figura)", " (300 mg/min)")
    t = t.replace("La figura muestra la concentración", "Se mide la concentración")
    t = t.replace("Las líneas A, B y C de la figura muestran", "Las líneas A, B y C de una gráfica muestran")
    t = t.replace("¿Qué líneas del gráfico", "¿Qué líneas")
    return t


def main(ruta):
    s = open(ruta, encoding="utf-8").read()
    m = re.search(r"const ALL_QUESTIONS = (\[.*?\]);\n", s, re.S)
    qs = json.loads(m.group(1))
    por_id = {q["id"]: q for q in qs}
    hechas = 0
    for i in list(CAMBIOS) + sorted(SOLO_NOTA):
        q = por_id[i]
        q.setdefault("qLibro", q["q"])
        if i in CAMBIOS:
            c = CAMBIOS[i]
            nuevo, ops = c["q"], c.get("options", q["options"])
            if "optionsLibro" not in q and "options" in c: q["optionsLibro"] = q["options"]
            assert len(ops) == len(q.get("optionsLibro", q["options"])), i
        else:
            nuevo, ops = limpiar(q["qLibro"]), q["options"]
        assert "figura" not in nuevo, (i, nuevo)
        if q["q"] != nuevo or q["options"] != ops: hechas += 1
        q["q"], q["options"] = nuevo, ops
    s = s[:m.start()] + "const ALL_QUESTIONS = %s;\n" % json.dumps(qs, ensure_ascii=False) + s[m.end():]
    open(ruta, "w", encoding="utf-8").write(s)
    print("preguntas reescritas: %d (de %d)" % (hechas, len(CAMBIOS) + len(SOLO_NOTA)))


main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(RAIZ, "plataforma_fisio1.html"))
