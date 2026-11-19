# Informe · clave `empareja` — conversión a test de los emparejamientos de tres exámenes

Fuentes: `txt/1º parcial sept 2020.txt` (+ `png_full/1º parcial sept 2020/p01-p03.png`), `txt/Enero 2021.txt` (+ `png_full/Enero 2021/p05.png`) y `txt/2020.txt` (+ `png_full/2020/p03-p09.png` y recortes a 300 dpi en `work/2020_q*.png`, porque en ese PDF los emparejamientos son capturas de pantalla de Moodle con la selección del alumno, no texto).
Trabajo: `work/gen_empareja.py` → `work/empareja_todas.json` (191 candidatas, una por par convertible) y `work/empareja_triviales.json` (50 pares no convertibles) → `work/empareja_cotejo.json`.

## Identificación
| Documento | Examen | Bloques de emparejamiento | Pares | Fuente de la clave |
|---|---|---|---|---|
| PREGUNTAS 1º PARCIAL SEPTIEMBRE 2020 (7 págs.; 13 bloques sin numerar + 27 test) | 1.er parcial, septiembre 2020 | 13 | 82 | oficial (respuesta en rojo; recopilación corregida) |
| EXAMEN PATOLOGÍA ENERO 2021 (12 págs., 60 preguntas) | Enero 2021 | 13 (n.º 2, 3, 7, 13, 15, 20, 25, 26, 27, 28, 35, 42, 54) | 81 | alumno (respuesta tras el guion, sin marca); n.º 25 y 27 sin respuestas |
| EXAMEN PATOLOGÍA CURSO 2020 (10 págs., 60 preguntas) | Curso 2020 (modelo Moodle) | 13 (n.º 9, 15, 18, 19, 21, 24, 25, 31, 39, 43, 44, 52, 58) | 78 | alumno (desplegables de Moodle en captura; varios «Elegir…» en blanco) |

## Recuento
| | Sept 2020 | Enero 2021 | 2020 | Total |
|---|---|---|---|---|
| Pares en el documento | 82 | 81 | 78 | 241 |
| Pares no convertibles (sí/no, rotos o sin respuesta) | 22 | 16 | 12 | 50 |
| Candidatas convertidas y cotejadas | 60 | 65 | 66 | 191 |
| `ESTÁ` según `cotejar.py` | 10 | 32 | 24 | 66 |
| `NUEVA` según `cotejar.py` | 50 | 33 | 42 | 125 |
| Ya estaban en la plataforma tras revisión manual (misma pregunta, misma clave, otra redacción) | 57 | 65 | 66 | 188 |
| **Nuevas cargadas en `out/empareja.json`** | **3** | **0** | **0** | **3** |

Como avisaba el encargo, el Jaccard da `NUEVA` a casi todo porque las conversiones existentes reformulan el par; revisé bloque a bloque con `work/buscar.py` (búsqueda por término en enunciado+opciones) y `cotejar.py --ver`. Resultado: la plataforma ya tiene convertidos TODOS los bloques de los tres exámenes, en varios sitios a la vez:
- `💻 Tests online · 1er parcial (Moodle)` (ids 2844-2850, 2856-2857, 2868-2884, 2914-2918, 2970-2980, 2989-2992) y `💻 Tests online · Patología (respuesta corta)` (3472-3478, 3494-3496, 3526-3531, 3555-3557, 4112-4116, 4123-4132, 4155-4158).
- `📝 2021 · Enero` (4687-4744: moco, miocardio, evasión, IC, disnea, anamnesis, EPOC, aceleración, pericardio, constitución, auscultación, presión arterial) y `📝 2021 · Junio (Moodle)` (4768-4776, 4795-4802, 4809-4819).
- `📝 2020 · Examen Patología` (4647-4653 piel, 4682-4684 aceleración).
- `💻 Cuestionario Moodle · …` (5400-5410, 5435-5448, 5480-5490), `📚 Megabatería · preguntas 531-699` (5955-5996, con los bloques enteros como una sola pregunta de opción compuesta) y `💻 Evaluación continua · Propedéutica clínica (3 nov)` (98304-98355, 98372-98376).

### Lo único nuevo: orden de sensibilidad tisular a las radiaciones (Sept 2020, bloque sin numerar, págs. 2-3)
Pares: ovario–quinto, linfático–primero, médula ósea–segundo, intestino–cuarto, testículos–tercero. «Linfático primero» ya está (3530, 5447, 5955, 5048) y «médula ósea segundo» también (3531); se cargan **testículos → tercero, intestino → cuarto y ovario → quinto** (opciones: los cinco ordinales). ⚠️ El ovario en quinto lugar choca con los tratados generales, que agrupan las gónadas entre lo más radiosensible; se respeta la clave del examen y se avisa en la `exp`.

## Pares no convertidos (50) — motivo
- **Sept 2020**: bloque «tórax normal» (9 pares SÍ/NO, triviales; además «la población general tiene una ausencia de abombamiento – NO» no tiene sentido); «En la IM el VD eyecta sangre hacia AD – no» (sí/no; ya está como V/F en 2991 y 4129); «palidez facial – palidez facial» (tautológico; ya está en 98334); bloque «disnea»: «significa “respiración difícil” – SI» y «síntoma de observación frecuente – SI» (triviales; 4707); «cierto/falso» de la transmisión de frecuencias (trivial; 4735, 98338); bloque «vibraciones vocales»: tres pares SÍ/NO (3780, 5435); «HTA sistólica – esencial o secundaria» (el bloque trae dos veces «HTA sistólica» con respuestas distintas: par roto); bloque **«fisiopatología de la hipotermia» (4 pares sin respuesta en el documento**: frío seco, agua helada, vía simpática, viento helado; la plataforma ya los tiene en 3526-3529, 5969, 6139-6140, 6582).
- **Enero 2021**: n.º 3 dos pares «– Cierto» (triviales; 4691-4692); n.º 15 dos «– SÍ»; n.º 35 «cierto/falso»; n.º 42 «HTA sistólica – es por una miocardiopatía dilatada» (respuesta del alumno sin sentido; par roto); n.º 54 «palidez facial – cara pálida»; **n.º 27 «mecanismos compensadores de la hipoxia» (9 ítems sin columna de respuestas: irrecuperable)**; n.º 25 no traía respuestas en el texto (`fuente_clave: ninguna`) pero se resolvió con la captura del 2020 n.º 25 (asma–broncoespasmo, vías bajas–limitación al flujo, enfisema–destrucción del parénquima, bronquitis crónica–inflamación de la mucosa) y todo está ya en 4715-4716, 4789-4792.
- **2020**: n.º 9 «palidez facial – cara pálida»; n.º 15 «Atlético – Elegir…» (en blanco); n.º 18 segundo «HTA sistólica – ≥135» (duplicado/erróneo); n.º 43 dos «– Cierto»; n.º 44 dos «– SÍ»; n.º 39 «cierto/falso»; **n.º 52 cuatro pares «Elegir…» sin contestar**.

## Discrepancias de clave (documento vs plataforma)
Las `ESTÁ` con `clave_igual:false` del cotejo automático son en su mayoría artefactos (la candidata casa con otra pregunta del mismo bloque, p. ej. todas las de evasión con 3555); abajo solo las diferencias reales de contenido.

| id plataforma | Par del documento (clave del documento) | Clave de la plataforma | Fuente doc. | Veredicto |
|---|---|---|---|---|
| 2990, 4131 | Sept 2020: «La IM impone al VI una sobrecarga de» → **presión y volumen** | Solo volumen | oficial | **plataforma**: la regurgitación hacia una AI de baja presión impone sobrecarga de volumen y de hecho reduce la poscarga; «presión y volumen» no es defendible. |
| 2844, 2976, 4114, 4726, 4819 | Sept 2020 y Enero 2021: «En el taponamiento cardíaco aparecen manifestaciones clínicas de» → **ICI** | Insuficiencia cardíaca derecha | oficial (Sept 2020) / alumno (Enero 2021); el alumno del 2020 marcó ICD | **plataforma**: ingurgitación yugular, hepatomegalia y pulso paradójico son congestión venosa sistémica (ICD) por fallo de llenado; se avisa de que la «clave oficial» de la recopilación dice ICI. |
| 2970, 4776, 4741 (pero 4158 y 5988 dicen «ortostática») | Sept 2020: «Atendiendo a un criterio etiológico, la hipotensión arterial puede ser» → **ortostática** | Esencial o secundaria (en 2970); Ortostática (en 4158) | oficial; los alumnos de 2020 y Enero 2021 pusieron «esencial o secundaria» | **dudosa**: la clasificación etiológica clásica es esencial/secundaria y «ortostática» es un mecanismo; la plataforma tiene las dos claves (2970 vs 4158) y convendría unificarlas. |
| 5480 | Sept 2020 y Enero 2021: «Evitar respuestas eficaces» → **mecanismos de diversión** | Tácticas de evitación | oficial / alumno | **documento**: 4694, 6590 y el texto de Sisinio coinciden con el documento; 5480 parece mal clavada (confunde con «evitar el contacto», que es tácticas de evitación). |
| 98351, 98352 | Enero 2021 n.º 20 y 2020 n.º 24: «Somatización» → **expresión facial**; «No es una exageración decir…» → **síntomas físicos como expresión de malestar emocional** | Al revés (somatización → síntomas físicos; «no es una exageración» → expresión facial) | alumno (los dos exámenes coinciden; la plataforma 2878/2883/4712 también sigue al documento) | **documento** (dudosa en el fondo: semánticamente «somatización = síntomas físicos» sería lo lógico, pero tres fuentes y las propias 2878/2883 mantienen el orden del documento; 98351/98352 parecen intercambiadas). |
| 5448 | Sept 2020: linfático → **primero**, médula ósea → **segundo** | «Segundo lugar tras la médula ósea: tejido linfático» | oficial | **documento**: 3530, 3531, 5447, 5955 y 5048 coinciden con el documento; 5448 invierte el orden. |
| 4727 | 2020 n.º 15: «Pícnico» → **Viscoso** | Ciclotímico | alumno | **plataforma** (Kretschmer: pícnico-ciclotímico, leptosómico-esquizotímico, atlético-viscoso); error del alumno. |
| 2971, 4742, 5489 | 2020 n.º 18: «La PA sistólica depende» → **un aumento de la elasticidad arterial** | Del volumen/latido de la sístole ventricular | alumno | **plataforma**; error del alumno (Sept 2020 oficial y Enero 2021 dicen vol/latido). |
| 98342, 4734, 4768 | 2020 n.º 39: «moco, pus, sangre, edema en las vías respiratorias provoca» → **bronquitis crónica** | Estertores | alumno | **plataforma**; error del alumno (Sept 2020 oficial: estertores). |
| 3476 vs 4684/5442 | Enero 2021 n.º 26: «Se modifica la dirección con velocidad constante» → **bien tolerada**; 2020 n.º 58 → **aceleración radial** | Ambas claves existen (3476 «bien tolerada»; 4684 y 5442 «aceleración radial») | alumno | **dudosa**: el par original de Moodle admite las dos según la columna de opciones que tocara; ambas son ciertas. |
| 2845 | Sept 2020: «Aumento de la permeabilidad vascular» → **vascular** (clave rota en el documento) | Exudado | oficial (rota) | **plataforma**; Enero 2021 y 2020 confirman «exudado». |
| 2848, 349 | Sept 2020: «Insuficiencia cardíaca derecha» → **hepatomegalia**; Enero 2021/2020 → hepatalgia | Hepatalgia (2848) / Hepatomegalia (349) | oficial / alumno | equivalentes; sin cambio. |

## Dudas y notas
- Ninguna pregunta tipo test ni de desarrollo de estos tres documentos se ha transcrito (encargo de otro ayudante).
- El documento «1º parcial sept 2020» es una recopilación corregida en rojo: se ha tratado como `oficial` según el encargo, pero al menos dos claves (sobrecarga «presión y volumen», taponamiento «ICI») no son defendibles y la tercera (hipotensión «ortostática») es discutible; no se han cargado.
- Los bancos `📝 2021 · Enero` y `📝 2020 · Examen Patología` ya existen en la plataforma (70 y 44 preguntas) e incluyen la mayor parte de estos emparejamientos convertidos; no se añade nada a ellos.
- Comprobación de completitud: 82 + 81 + 78 = 241 pares leídos; 191 convertidos a candidata y cotejados, 50 justificados arriba; no falta ninguno.
