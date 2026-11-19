# Informe · PDF «1º Parcial 2021» (clave `par2021`)

## Identificación
- **Examen:** 1.er parcial de IMI, curso 2020-21, cuestionario Moodle del campus (capturas de pantalla de un intento de alumno). Modelo único. El PDF tiene 13 páginas sin texto extraíble; se han extraído las **60 capturas** incrustadas a resolución nativa (`work/par2021_img/pNN_kk.png`) y, cuando el texto era pequeño, recortes a 250 dpi (`work/par2021_rec*.png`).
- El documento **no numera las preguntas**: `n` = orden de la captura dentro del PDF (1-60).
- **Clave:** no hay ninguna indicación de corrección (ni ticks, ni «Correcto/Incorrecto», ni resaltados verdes/rojos; los radios marcados son grises). Por tanto toda clave del documento es `fuente_clave: "alumno"`. En 12 preguntas tipo test el alumno no marcó nada (`"ninguna"`).
- Banco destino: «📝 2021 · 1er parcial (Moodle)» (cambiado a petición del coordinador). El banco «📝 2021 · Junio (Moodle)» (79 preguntas) **no es este examen**: solo 1 de las 36 preguntas test del PDF está en él (id 4830). La mayoría ya estaban en «📝 2020 · Examen Patología» (16), «📝 2020 · 1er parcial Junio» (7), «💻 Tests online · 1er parcial (Moodle)» (3), Megabatería (5), Recursos de compañeros (3) y Daypo (1).

## Recuento (60 capturas)
| Tipo | Nº | Capturas |
|---|---|---|
| Test transcritas (`work/par2021_todas.json`) | **36** | 1,3,4,5,6,7,8,11,12,14,16,18,20,24,26,28,29,30,32,35,37,39,40,41,43,46,48,49,52,53,54,55,56,57,59,60 |
| · ya estaban en la plataforma | 35 | |
| · **nuevas cargadas** (`out/par2021.json`, banco «📝 2021 · 1er parcial (Moodle)») | **1** | 37 (exudado inflamatorio) |
| · descartadas | 0 | |
| Respuesta corta / desarrollo (no se transcriben) | 8 | 2 (hematocrito en hipotermia), 9 (semiología auscultatoria del derrame pleural), 10 (síncope cardiaco), 15 (diagnóstico nosológico), 23 (derrame por descenso de presión intrapleural), 36 (hipoxia histotóxica), 42 (egofonía), 58 (tapones de Dietrich) |
| Emparejamientos (convertidos a test; ver sección siguiente) | 15 | 13 (lesiones de piel), 17 (moco), 19 (teoría de la constitución), 21 (EPOC/asma), 22 (pericardio), 25 (aceleración), 27 (HTA), 31 (compensación de la hipoxia), 33 (auscultación pulmonar), 34 (patología miocárdica), 44 (evasión del hospedador), 45 (insuficiencia cardíaca), 47 (agentes químicos), 50 (anamnesis), 51 (disnea) |
| Test con imagen no reproducible | 1 | 38: caso «Buenaventura», ECG a valorar (alumno marcó «bloqueo AV de primer grado»). El ECG está en `work/par2021_cap38_ecg.png` por si se quiere cargar con imagen |
| **Total** | **60** | ✓ coincide con las capturas del PDF |

Observaciones de transcripción: la pregunta 20 (terminación de la enfermedad) tiene **6 opciones** y las 39 (facies) y 54 (dolor crónico) tienen **4**; las tres ya estaban en la plataforma, así que no afecta a la carga. Erratas corregidas: «lo bronquios»→«los bronquios», «nunca de ausculta»→«nunca se ausculta», «Todas so ciertas»→«Todas son ciertas», «Paur Bert»→«Paul Bert», «neoplaia»→«neoplasia», «intoxcación», «apergaminaadas», «gastronecmio», «aseveracioines», «prsente», «le nivel», «en al sala», «quimioterpápico».

## Discrepancias de clave (ESTÁ con `clave_igual: false`)
| id | Banco plataforma | Clave del documento (alumno) | Clave de la plataforma | Veredicto |
|---|---|---|---|---|
| 4679 | 2020 · Examen Patología | «Nada, porque sobre el hueso nunca se ausculta» | «Un soplo traqueal, que es fisiológico» | **plataforma**: sobre manubrio/tráquea se oye el soplo laringotraqueal fisiológico |
| 98492 | Recursos de compañeros · Patología general | «Son ciertas a y c» (muerte y crisis) | «Todas son ciertas» | **plataforma**: la enfermedad termina por crisis, por lisis o con la muerte |
| 4670 | 2020 · Examen Patología | «Anormalidades vasculares (aterosclerosis) que impide el suministro…» | «Anormalidades vasculares (aterosclerosis) que impiden el suministro…» | **no es discrepancia real**: misma opción, falla el cotejo literal por «impide/impiden» |
| 2902 | Tests online · 1er parcial (Moodle) | «Sí, todas son ciertas, pero habría que incluir el teratoma» | «Todas las posibilidades son ciertas, pero los linfomas no se ubican en este lugar» | **dudosa**: la plataforma sigue la diapositiva del Tema 17 (linfomas = mediastino medio) y ya avisa con ⚠️; la opción del teratoma es defendible por la misma diapositiva y por las «4 T». Se mantiene la plataforma |
| 4619 | 2020 · 1er parcial Junio | «Una irritabilidad miocárdica» | «Una disminución del mecanismo de despolarización» | **plataforma**: por debajo de 32 °C el frío deprime la despolarización (bradicardia, PR/QRS/QT largos, onda J); la irritabilidad/FV es consecuencia posterior |
| 2525 | Megabatería IMI | «Aquél que dura meses» | «Todas son ciertas» | **plataforma**: dura meses, pierde función biológica y fluctúa; las tres son ciertas |
| 2934 | Tests online · 1er parcial (Moodle) | «3» | «1,5» | **plataforma**: para operar se baja el INR por debajo de 1,5; 2-3 es el rango terapéutico |

En las 6 discrepancias reales el alumno se equivocó; ninguna obliga a tocar la plataforma. Las 12 preguntas sin marca (`clave_igual: null`) ya existen con clave en la plataforma.

## Dudas
- Pregunta nueva (cap. 37): la opción «Glucosa más baja en el suero» está mal redactada en el original (se entiende «glucosa del líquido más baja que en el suero»); se ha dejado literal. La clave del alumno (leucocitos < 1000/mm3 = dato de trasudado) es correcta.
- Si se quisiera cargar el caso con ECG (cap. 38) habría que incorporar la imagen; el trazado muestra ritmo sinusal con PR largo, compatible con lo que marcó el alumno, pero no se ha verificado al no cargarse.

## Emparejamientos convertidos a test (segunda pasada)
Regla del SPEC (paso 1): una pregunta por par, respuesta = la del documento (selección del alumno, `fuente_clave: "alumno"`, verificada), distractores de las otras respuestas del bloque, `nota: "convertida de un emparejamiento del examen"`. Candidatas en `work/par2021_emparej.json` (61), cotejo en `work/par2021_emparej_cotejo.json`, y comprobación por grep en la plataforma (`work/par2021_grep.py`).

| Bloque (captura) | Pares | Convertidos | Ya estaban | No convertidos y por qué |
|---|---|---|---|---|
| 13 Semiología de la piel | 10 | 9 | 9 (ids 3627/4797, 4651, 4649, 4750, 4653, 4650, 4652, 5404, 4647) | «Palidez facial → cara pálida» (tautológico) |
| 17 Moco bronquial | 6 | 6 | 6 (2914, 2916/4689, 4688, 2918, 2915, 98376) | — |
| 19 Teoría de la constitución | 6 | 0 | — | Sin responder y sin ver las opciones del desplegable: no se puede convertir sin inventar |
| 21 Patología obstructiva | 4 | 3 | 3 (4791, 4715, 4716) | «Bronquitis crónica → limitación al flujo aéreo»: la 4.ª opción del desplegable no se ve y la elección del alumno es dudosa (la limitación al flujo define la EPOC/obstrucción, no la bronquitis crónica) |
| 22 Pericardio | 5 | 5 | 5 (2979, 2976, 4116, 4112, 4113) | — |
| 25 Aceleración | 8 | 7 | 7 (4683, 3473, 3478, 5444, 3475, 3472/4813, 3477/4815) | «Se modifica la dirección con velocidad constante → bien tolerada»: el alumno se equivocó (es la aceleración radial, opción que no aparece visible) |
| 27 Presión arterial | 5 | 3 | 3 (5487/2973, 4775, 4778) | Dos ítems con etiqueta duplicada/confusa («HTA sistólica → esencial o secundaria»; «hipotensión, criterio etiológico → es una hipotensión ortostática») |
| 31 Compensación de la hipoxia | 9 | 5 | 5 (4780, 4782, 4779, 4785, 4784) | 4 sin responder (opciones no visibles). «Descenso del pH → aumento del 2,3-DPG» (alumno) es incorrecto: la acidosis reduce la afinidad de la Hb (efecto Bohr) e inhibe la síntesis de 2,3-DPG; la plataforma ya lo tiene bien (4785) |
| 33 Auscultación pulmonar | 7 | 6 | 6 (4769, 98343, 98340, 4768, 98337, 4770) | Ítem Cierto/Falso (transmisión de frecuencias) no convertible a 5 opciones |
| 34 Patología miocárdica | 3 | 1 | 1 (5485/4123) | Dos ítems Cierto/Falso |
| 44 Evasión del hospedador | 5 | 4 | 4 (4697, 4695/3555, 4808/2857, 4804/6590) | «Sistemas de defensa se ponen en contacto con el agente → tácticas de evitación»: enunciado contradictorio (la evitación es justo evitar ese contacto) |
| 45 Insuficiencia cardíaca | 6 | 3 | 3 (2848/4700, 4701, 2850/4809) | «Cardiomegalia → ICI», «Latido de la punta → ICI», «ICI → oliguria»: ya recogidos en 2850/4809/4810 y de respuesta no única por separado |
| 47 Agentes químicos | 7 | 0 | — | Sin responder y sin ver las opciones |
| 50 Anamnesis | 7 | 5 | 5 (3496, 98351, 4709, 3495/2881, 98354) | «Somatización → expresión facial» (alumno) es error, la correcta ya está (98351). «No es una exageración decir…» y «la actitud…» con emparejamiento ambiguo en la captura |
| 51 Disnea | 6 | 4 | 4 (4704/4827, 4706, 3881/4705/4828, 3884/4707) | Dos ítems SI/NO |
| **Total** | **94** | **61** | **61** | **33** |

Resultado: **las 61 preguntas convertidas ya existen en la plataforma** (30 detectadas por `cotejar.py` con sim ≥ 0,6 y 31 con sim 0,35-0,59 comprobadas una a una con `--ver`/grep: misma pregunta y misma clave, solo cambia la redacción). Muchas de ellas están precisamente en «📝 2021 · Junio (Moodle)» (4769-4830), «📝 2021 · Enero» (4683-4717) y «💻 Tests online · 1er parcial (Moodle)», es decir, estos mismos emparejamientos ya se habían convertido antes. **No se añade ninguna conversión a `out/par2021.json`**, que queda con 1 pregunta.

Claves del alumno en los emparejamientos que la plataforma contradice (y la plataforma tiene razón): descenso del pH → 2,3-DPG (bloque 31); somatización → expresión facial (bloque 50); dirección variable con velocidad constante → bien tolerada (bloque 25). Los `clave_igual: false` del cotejo de las conversiones (ids 4650, 4683, 3473, 4778, 4780, 4697, 2850) son cruces entre preguntas distintas del mismo bloque o diferencias de redacción («en la mujer» / «de la mujer»), no discrepancias reales.
