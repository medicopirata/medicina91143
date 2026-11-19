# Informe · FILTRADO 2018 2 → banco «📝 2018 · Septiembre»

## Identificación
- **Examen**: Introducción a la Medicina Interna y Propedéutica Clínica · Examen de septiembre, toda la asignatura · Lunes 10 de septiembre de 2018 · **Modelo 1** · 60 preguntas de 5 opciones.
- **Material**: fotos de Wuolah («Examen-PATOLOGIA-SEPT-2018.pdf», alumna «lourcruz»). p01 portada; p02 (1-6); p03 y p04 (misma hoja, 7-15); p05 (16-26); p06 (27-41, hoja girada y curvada, con otra hoja encima); p07 publicidad; p08 (37-47); p09 (48-60, girada, con otra hoja encima); p10 **foto de la plantilla oficial «Pregunta / Modelo 1»** con las claves de la 1 a la 37 (el resto no entra en la foto).
- **Fuente de la clave**: 1-37 → `oficial` (plantilla de p10; los círculos del alumno discrepan de ella en 13 preguntas y en todas esas la plantilla es la médicamente correcta, lo que confirma que es la corrección oficial y no la del alumno). 38-59 → `alumno` (círculos) salvo 56 y 58 (`ninguna`: sin marca o marcas contradictorias).

## Recuento
| | n |
|---|---|
| Preguntas del documento | 60 |
| Transcritas (`work/sep2018_todas.json`) | 54 |
| No transcritas | 6: **5** (depende de la foto de las pupilas); **32, 53, 54, 55, 60** (enunciado y/o opciones tapados por otra hoja en las fotos p06/p09; solo se ven fragmentos: 32 «Con respecto al síndrome de … características clínicas… / a) …suboclusivas, b) Todas son ciertas, c) Ninguna cierta, d) Secreción de la mucosa, e) Hiperperistaltismo y dolor intenso»; 53 «La presencia de poros prominentes… edema de la piel… cáncer de mama. ¿Cómo se denomina este hallazgo?» (opciones ocultas); 54 «El signo de … propio de…» (todo oculto); 55 «De las siguientes, … mejor descrito como … a) Pancitopenia y médula…» (oculto); 60 «…una calcificación en la córnea… trastornos de las paratiroides… queratopatía en banda / queratoconjuntivitis calcificante» (oculto)) |
| Ya estaban en la plataforma | **54 de 54** (cotejo Jaccard 0,76-1,0; ninguna en la franja 0,4-0,6) |
| Nuevas cargadas (`out/sep2018.json`) | **0** |
| Descartadas por clave indefendible | 0 |

Las 54 están en «📝 2018 · Septiembre» (ids 4543-4593, con sub-etiquetas de tema en algunas) salvo 3 (id 4665, banco 2020), 7 (4937, 2022 Global Junio), 18 (4880, 2022 1er parcial) y 24 (4945, 2022 Global Junio), que son la misma pregunta repetida en otras convocatorias. El banco no necesita ninguna pregunta más: las que faltan (5, 32, 53, 54, 55, 60) no se pueden transcribir desde este PDF.

## Discrepancias de clave (ESTÁ con `clave_igual: false`)
| nº | id | Clave del documento | Clave de la plataforma | Fuente doc. | Veredicto |
|---|---|---|---|---|---|
| 14 | 4554 | b) Siempre estarán abolidas | c) Ninguna es cierta | oficial (plantilla p10) | **dudosa**: la plantilla oficial da b; la plataforma argumenta (con los apuntes) que en un derrame pequeño solo están disminuidas, por lo que «siempre» es falso. Si se quiere reproducir el examen, la clave del profesor fue b. |
| 23 | 4562 | e) El potasio | d) El sodio | oficial (plantilla p10) | **documento**: la plantilla oficial da potasio (la hiperpotasemia es el dato más característico de la insuficiencia suprarrenal primaria); la plataforma eligió sodio por frecuencia. Conviene cambiar la clave a «El potasio» y adaptar la explicación. |
| 33 | 4570 | a) No hay disfunción de los mecanismos de la membrana canalicular | No hay disfunción de los mecanismos de transporte de la membrana canalicular | oficial | **falso positivo**: misma clave; el texto difiere porque la opción está medio tapada en la foto y la reconstruí con menos palabras. |
| 41 | 4578 | c) La formación de células espumosas… «placas de ateroma» | e) Afectación de la capa íntima arterial… | alumno | **plataforma** (el alumno falló; la definición correcta es la de la íntima). |
| 43 | 4580 | b) No hay evidencia de soplos | e) Soplo anfórico | alumno | **plataforma**. |
| 44 | 4581 | d) F. VII | a) F. IX | alumno | **plataforma** (hemofilia B = factor IX). |
| 46 | 4583 | e) Postural | d) Intencional | alumno | **plataforma**. |
| 47 | 4584 | e) Sepsis | c) Tratamiento con cisplatino | alumno | **plataforma** (cisplatino = IRA parenquimatosa). |
| 48 | 4585 | b) No suele presentarse crisis de angor (solo un «B.» al margen) | d) El síncope cuando aparece es de esfuerzo | alumno (dudosa) | **plataforma**. |
| 57 | 4591 | e) Todas son ciertas | a) La lesión orgánica de la mucosa intestinal | alumno | **plataforma**. |

Sin clave en el documento (no comparables): 56 (4590, sin marca) y 58 (4592, ticks contradictorios del alumno).

## Dudas
- La plantilla de p10 solo cubre 1-37; de 38 en adelante la única clave disponible es la del alumno, que falla mucho (7 discrepancias en 20), así que las claves de la plataforma para 38-59 siguen siendo las de referencia.
- En la 12 el final del enunciado está tapado; la pregunta ya cargada (4552) lleva la misma reconstrucción («NO tiene posibilidad de ser un dolor de origen coronario»), coherente con la clave oficial b.
- Las marcas «1-6» escritas junto a las preguntas 7, 12, 13, 14, 18 y 24 son numeraciones del alumno, no claves.
