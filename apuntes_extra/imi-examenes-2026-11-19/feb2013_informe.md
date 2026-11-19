# Informe · clave `feb2013` — «Introducción a la Medicina Interna y Propedéutica Clínica · Primer parcial: 18 de febrero de 2013 · Curso 2012/2013»

## Identificación
- **Examen:** 1.er parcial de IMI, 18-02-2013 (Prof. J. Bosco López, según la hoja de corrección). **90 preguntas tipo test** de 5 opciones (varios casos clínicos intercalados: pescador de 48 años, familia del Sr. Norbert, Ataulfo, el caso sueco, varón de 52 años con disnea nocturna, Carmen Bizet) + 5 preguntas cortas (patocronia, signo de McBurney, claudicación intermitente, soplo de Austin-Flint, clasificación de los estertores). Modelo único: «Prueba N.º 302151347».
- **Fuentes:** `png_full/2013/p02-p10` (impresión limpia; p01 portada, p07 publicidad, p10 preguntas cortas, p11 vacía) y `png_full/Enero 2013 con plantilla/p01-p08` (el mismo escaneo, con los mismos cortes) + **p09 = hoja de CORRECCIÓN oficial** (plantilla con X). Los finales de línea cortados por el escaneo (p. 13 opción a, p. 44 opciones a-b, p. 79 opción a, texto de la cuestión de Ataulfo) se han completado con las versiones ya existentes en la plataforma (son literalmente las mismas preguntas).
- **Clave:** leída de la plantilla oficial recortada a 200-220 dpi (`work/f13_pl*.png`, `work/f13_plm*.png`); cada pregunta lleva la X duplicada en dos filas, lo que facilita la lectura. **88 claves `oficial`**; las preguntas **46 y 50 llevan un guion sin ninguna X → anuladas** (`fuente_clave: "ninguna"`). Se comprobó la coherencia de las 88 letras con el texto (p. ej. 6, 7, 16, 39, 43, 48 = «Todas son ciertas»; 8 y 80 = «Todas, excepto a»; 20, 26, 36, 41, 45, 52, 72, 74 = «son ciertas x e y»).

## Recuento
| | Nº | Preguntas |
|---|---|---|
| Transcritas (`work/feb2013_todas.json`) | **90** | 1-90 (coincide con el documento) |
| Ya estaban en la plataforma | **85** | ver nota de cotejo |
| **Nuevas cargadas** (`out/feb2013.json`) | **1** | 57 (Antonio Rodríguez «el flaco»: variante de la pregunta de Antonio Plutón con distintas opciones y distinta correcta) |
| Descartadas | **4** | 46 y 50 (anuladas en la corrección oficial; además están rotas: la 46 describe el patrón obstructivo pero dice «restrictivo» y la 50 tiene dos opciones falsas; las versiones corregidas ya están, ids 2671 y 614); 21 y 22 (ya están, pero se anotan: la 21 tiene en el impreso **seis opciones con dos «d»** y la 22 depende de una **imagen** — ambas están ya en la plataforma con la misma clave, ids 2663 con «Áreas de Brodmann» y 5 opciones, y 4288 con su imagen) |
| Respuesta corta (no se transcriben) | 5 | las de la p. 10 |

**Nota de cotejo.** `cotejar.py` da `NUEVA sim=0` a 23 preguntas de caso clínico (12-18, 57-58, 67, 69, 71-81) porque su índice de firmas no las encuentra; se cotejaron a mano con un Jaccard propio sobre opciones + enunciado (`work/feb2013_cotejo_sinprefijo.json` y salida en pantalla) y **todas menos la 57 están ya** (pescador: 2499-2505 y 3277; Norbert: 98497/2675; Ataulfo: 97007-97010, 98612-98613, 2683-2684; caso sueco: 97013-97014; golpe de calor: 3315; varón de 52 años: 4286 (con el ECG), 97018-97020, 2448). Preguntas con imagen: la 22 (facies) y la 77 (ECG) ya están en el banco de imágenes (4288 y 4286) con las figuras. Repetida dentro del examen: la 54 es literalmente la 49. Variantes menores que se consideran «ya están» (misma correcta, un distractor distinto): 40 (id 2416), 42 (id 4246: los distractores del examen son taquiarritmia, bloqueos de rama y Mobitz I; la plataforma tiene BAV 3.º, bloqueo sinoauricular y extrasístoles), 49/54 (id 2190: «no siendo necesario en la difusión» vs «en la perfusión», misma opción falsa), 76 (id 3315). Si se quisiera la versión literal de 2013 de la 42, está en `work/feb2013_todas.json`.

## Tabla de discrepancias de clave (ESTÁ con `clave_igual: false`)
Clave del documento = **plantilla oficial** en todos los casos.

| id (banco) | n doc | clave documento (oficial 2013) | clave plataforma | veredicto |
|---|---|---|---|---|
| 73 (Bloque 1) | 9 | a) Porque la contracción muscular es una respuesta a la disminución de la temperatura y ello implica consumo de energía | d) Son ciertas a y c | **documento**: es la clave oficial del profesor; la plataforma ya avisa (⚠️) de que la pregunta admite discusión. |
| 2501 (Megabatería; igual en 2443) | 14 | d) Pulso femoral | a) Pulso radial | **documento**: clave oficial; la alternancia de amplitud se aprecia mejor en una arteria grande (femoral) o con el esfigmomanómetro, y Harrison admite «radial o femoral». |
| 2665 (Megabatería) | 28 | d) Alteración de la coagulación por el daño hepático que se presenta en esta valvulopatía | c) Rotura de las conexiones entre el sistema pulmonar y el bronquial | **plataforma**: la hemoptisis de la estenosis mitral es por rotura de las anastomosis venosas broncopulmonares; la propia plataforma indica que otras plantillas del profesor dan c. La X de 2013 en d parece un error de plantilla. |
| 4594 (📝 2020 · 1er parcial Junio) | 37 | c) Del funcionamiento de las colaterales | d) Todas son ciertas | **documento**: clave oficial, y clínicamente el cuadro depende sobre todo del nivel de la oclusión y de la circulación colateral, no del tipo ni del origen del émbolo. |
| 4521 (📝 2018 · Global Febrero) | 44 | e) Otro proceso sindrómico asociado es la bronquitis crónica | a) El flujo sanguíneo pulmonar aumenta siempre que lo hace el gasto cardíaco… | **dudosa**: la misma pregunta se ha corregido de forma distinta en 2013 (oficial) y en 2018; la exp de la plataforma ya recoge ambas versiones. |
| 2672 (Megabatería) | 48 | e) Todas son ciertas | b) Su patogenia es por trastorno en la ventilación-perfusión | **dudosa**: la clave oficial de 2013 es «todas»; por libro (Sisinio/Harrison) la platipnea no es típica del trastorno obstructivo ni coincide «siempre» con hipoxemia, que es lo que razona la plataforma. |
| 2687 (Megabatería) | 85 | d) Edemas en miembros inferiores | d) Tos (en su orden) | **dudosa**: clave oficial = edemas; por fisiopatología (cor pulmonale del síndrome de hipoventilación-obesidad) los edemas son habituales y la tos no, que es lo que defiende la plataforma. |
| 97008 (📝 Marzo 2010; igual en 2428) | 69 | e) Valvulopatía, probablemente por una estenosis aórtica | a) Debido a HVI pura | **documento**: clave oficial; el «pura» de la opción a la excluye (la HVI es secundaria a la estenosis aórtica). Conviene cambiar la 97008 y la 2428. |
| 97014 (📝 Marzo 2010; igual en 80 y 2441) | 75 | b) Deshidratación y pérdida de electrólitos | c) Pérdida de electrólitos | **dudosa**: clave oficial = b; Sisinio atribuye los calambres por calor a la pérdida de sodio (c). |
| 97024 (📝 Marzo 2010) | 88 | d) All questions are correct | e) Only correct a and c (clave de alumno) | **documento**: la clave de la plataforma era de un alumno; la oficial da por cierta también la cardiomegalia moderada. Conviene cambiarla. |
| 97025 (📝 Marzo 2010) | 89 | b) Mitral valve stenosis | d) Calcific aortic stenosis (corregida al revisar) | **plataforma**: el caso (Robbins) es una estenosis aórtica calcificada (anciana, síncopes, VI prominente con las demás cavidades normales, colesterol normal); la X oficial en b coincide con lo que marcó el alumno de 2010, pero no encaja con el cuadro. |

Las demás 74 coincidencias tienen la misma clave (incluidas 97007, 97009, 97010, 97013, 97016-97023 del banco de Marzo 2010 y la 2 → id 1).

## Dudas y observaciones
- **Pregunta 21:** en el impreso hay 6 opciones (a, b, c, «d. Áreas de Broca en el lóbulo occipital», «d. Todas son ciertas», «e. Todas son ciertas, excepto c»); la plantilla marca D. Se ha interpretado como «Todas son ciertas» (coincide con la versión de la plataforma, id 2663, con «Brodmann»). No se carga.
- **Pregunta 32:** solo 4 opciones en el impreso (la plantilla marca C = asma y enfisema); ya está (id 6000).
- **Pregunta 77:** depende del ECG «ver foto al final» (V1-V2, V4-V5); ya está con la imagen (id 4286). Pregunta 78: opciones etiquetadas a, b, c, c, e (errata), sin consecuencia.
- **Erratas corregidas al transcribir:** «Whezees» → «Wheezes», «wtha» → «what», «Pulsus paradoxus» (sic en inglés), «Graham-Steel» se deja como en el original, «Gallivardin» (sic, por Gallavardin) se deja.
- Ficheros de trabajo: `work/feb2013_todas.json`, `work/feb2013_cotejo.json`, `work/feb2013_cotejo_sinprefijo.json`, `work/feb2013_build.py`, recortes `work/f13_*.png`. Aviso: al principio guardé la plantilla como `work/pl_full.png` y lo sobrescribí si ya existía de otro encargo (ahora está como `work/f13_pl_full.png`).
