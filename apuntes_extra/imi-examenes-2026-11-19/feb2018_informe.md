# Informe · PDF «Ni idea el año pero tiene plantilla» (clave `feb2018`)

## Identificación
- **Examen:** PRIMER EXAMEN PARCIAL · CURSO 2017-18 (IMI, bloque respiratorio/propedéutica). El pie de página de las hojas del alumno dice literalmente «PRIMER PARCIAL CURSO 2017-18 - Modelo 2».
- **Nº de preguntas:** el examen tiene **60 preguntas** (p02-p08 llegan hasta la 60), no 37. La plantilla oficial fotografiada (p01) solo tiene **37 filas** (Pregunta 1-37 × Modelo 1-6): o es la primera hoja de una plantilla de dos páginas o falta la segunda foto. Por tanto solo hay clave oficial para las preguntas 1-37.
- **Modelo del alumno: 2.** Dos pruebas independientes: (1) el pie de página «Modelo 2»; (2) comparando las 22 marcas inequívocas del alumno (guión/círculo sobre una sola opción) con las 6 columnas: M1 27 %, **M2 68 % (15/22)**, M3 32 %, M4 23 %, M5 18 %, M6 36 %. Las marcas del alumno son heterogéneas (guiones, aspas, ticks, círculos en el número) y en 15 preguntas marca varias opciones, por eso el 68 % y no más; el resto de columnas queda muy por debajo. Clave cargada para 1-37 = columna 2 de la plantilla (`fuente_clave: "oficial"`). Plantilla transcrita en `work/feb2018_plantilla.json` (6 columnas × 37).
- Para 38-60 no hay plantilla: `fuente_clave` = "alumno" (marca única clara) o "ninguna".

## Recuento
- **Transcritas:** 53 (`work/feb2018_todas.json`).
- **No transcritas (7):**
  - 16 (Carles, radiografía de tórax con absceso) y 22 (foto de lengua escrotal/«rajada»): dependen de imagen. Nota: la 16 ya está en texto en la plataforma (ids 3145, 6295, 3939) y la 22 no se puede reproducir.
  - 27: la foto de p05 empieza en las opciones (hipoxia histotóxica / cianosis / hipoxia hipercápnica / hipoxia hipoxémica / ninguna); el enunciado quedó fuera de la foto. Clave oficial M2 = d (hipoxia hipoxémica).
  - 32 y 33: columna central de p05 fotografiada en escorzo extremo, ilegible. Por las palabras sueltas, la 32 es «¿Cómo exploraría el undécimo par craneal?» (ya está: ids 3193, 4665; M2 = b «Pidiendo al enfermo que encoja los hombros», coincide con la plataforma) y la 33 es «La forma de detectar una correcta hidratación…» (ya está: id 3153; M2 = d «Realizaría el signo del pliegue esternal», coincide con 3153).
  - 48 y 54: cortadas por el borde superior de p07; solo se ven opciones sueltas (48: «trastorno obstructivo y restrictivo / efecto espacio muerto / ninguna» → probablemente la de la condensación pulmonar, ids 4892 y 5028; 54: «Refuerzo del 2º tono / Desdoblamiento fisiológico» → no identificable).
- **Ya estaban:** 48 según `cotejar.py` + 2 que trato como ya existentes a ojo: la 3 (Alberto, Kussmaul: id 6001 con las mismas 5 opciones y misma clave; `cotejar` dio sim 0 por el caso clínico largo) y la 46 (cianuro → hipoxia histotóxica: id 3162, mismas opciones con redacción más corta y misma clave). Total **50**.
- **Nuevas cargadas: 3** (`out/feb2018.json`, banco `📝 2018 · Febrero 1er parcial (plantilla oficial)`): nº 4 (definición de disnea, opciones distintas de las ya existentes 3920/3137), nº 10 (vibraciones vocales en la condensación; la parecida 3929 tiene las mismas respuesta pero distractores distintos → variante) y nº 26 (cociente LDH pleural/suero > 0,6; no existía como pregunta directa). Las tres con clave oficial.
- **Descartadas por clave indefendible:** 0.

## Discrepancias de clave (ESTÁ con `clave_igual: false`)
| nº | id plataforma | clave documento | clave plataforma | fuente doc. | veredicto |
|---|---|---|---|---|---|
| 8 | 2546 | «Por una vasodilatación de los vasos encefálicos» | «Por una vasodilatación de los vasos» | oficial | **igual** (solo cambia el texto de la opción; misma clave) |
| 17 | 3146 | «En la auscultación se puede encontrar roncus y sibilancias inspiratorias» | «En la auscultación se pueden encontrar roncus y sibilancias inspiratorias» | oficial | **igual** (misma clave, «puede/pueden») |
| 20 | 4554 (2018 · Septiembre) | «Siempre estarán abolidas» | «Ninguna es cierta» | oficial | **documento**: la plantilla oficial de este examen da c; la clave de 4554 se dedujo de los apuntes (su `exp` argumenta que «siempre» es falso), no era oficial. Conviene cambiar 4554 a «Siempre estarán abolidas» o al menos anotar en su `exp` que la plantilla oficial del 1er parcial 2017-18 la da por correcta. |
| 28 | 3150 | «El aumento de la presión hidrostática en los capilares pleurales, se asocia a congestión pulmonar» | «…, que se asocia a congestión pulmonar» | oficial | **igual** (misma clave, texto casi idéntico) |
| 43 | 4921 (2022 · Global Junio) | «Sólo son ciertas, la que afecta a los casos de consolidación…» | «Todas son ciertas» | alumno | **plataforma**: las VV informan de la densidad, se exploran con borde cubital/palma/fonendo y aumentan en la consolidación; la opción del alumno se contradice con las demás |
| 49 | 5157 (Examen final Patología, plantilla) | «Neumotórax» | «Hemotórax» | alumno | **plataforma**: la matidez es líquido o condensación; el neumotórax da timpanismo |
| 59 | 4874 (2022 · 1er parcial, plantilla oficial) | «Si se trata de sangre digestiva, esta suele ser oscura» | «Todas son correctas» | alumno | **plataforma**: las tres afirmaciones son ciertas (hematemesis oscura, hemoptisis roja clara, la sangre aspirada produce atelectasias) |

Resumen: de las 7 discrepancias, 3 son falsos positivos (misma clave, otra redacción), 3 son errores del alumno (sin plantilla) y **solo la nº 20 es una discrepancia real entre la plantilla oficial y la plataforma** (id 4554).

## Dudas y observaciones
- La plantilla de p01 está fotografiada en perspectiva (filas inclinadas); la transcribí columna a columna contando 37 letras por columna y las 6 columnas dan exactamente 37, y las 32 preguntas legibles de 1-37 cuadran clínicamente con la columna 2 (p. ej. 3→Kussmaul, 5→Turner, 8→vasodilatación, 21→simpático cervical, 25→neumotórax, 26→>0,6), lo que confirma la lectura.
- nº 34, 35 y 55: enunciados con el final de línea cortado por la foto; los reconstruí con las palabras legibles (coinciden con la redacción habitual que ya tiene la plataforma, ids 2550, 2551, 4927). Están marcadas con `nota` en `work/feb2018_todas.json`; las tres ya estaban.
- nº 39 (gasometría): la imagen es solo una punción arterial; la transcribí describiéndola en el enunciado. Ya estaba (id 3159).
- nº 36: la plantilla oficial da «Todas son ciertas» (la obstrucción bronquial también atenúa las VV); coincide con la plataforma (3156).
- nº 1: plantilla oficial «Una gingivitis» (foco séptico orofaríngeo aspirado); coincide con 3135.
- El banco «📝 Examen Febrero 2018 · modelo 1» que ya existe en la plataforma es **otro examen** (global de febrero 2018: cardio, digestivo, endocrino…); ninguna de sus preguntas coincide con este primer parcial de respiratorio, así que no había solapamiento por ese lado; el solapamiento real viene de «Tests online · 1er parcial (Moodle)» (≈20 preguntas) y de los exámenes 2022-2023.
