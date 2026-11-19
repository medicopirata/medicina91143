# Informe · clave `img2014` — «Enero 2014» = RECOPILACIÓN DE IMI. PREGUNTAS DE EXÁMENES CON IMÁGENES

**Identificación.** No es un examen de una convocatoria: es una recopilación corregida (respuesta resaltada en amarillo/cian) de 10 preguntas tipo test con figura (ECG, Rx, fotos clínicas) procedentes de varios exámenes de IMI. 4 páginas, sin modelo. Solo la última pregunta trae número en el documento (53); las demás se han numerado 1-9 por orden de aparición.

**Recuento.** Transcritas 10/10 (`work/img2014_todas.json`) · ya estaban 10 · nuevas cargadas 0 · descartadas 0. `out/img2014.json` queda vacío (`[]`).

**Cotejo contra el banco `🖼️ Preguntas de examen con imagen` (9 preguntas, ids 4281-4289).** Las 9 proceden de este mismo documento, en el mismo orden, y las 9 tienen ya `img` (ficheros `medint_img/emb-*.jpg`, todos presentes en disco):

| n doc | pregunta | id plataforma | img en plataforma | observación |
|---|---|---|---|---|
| 1 | ECG, señale la incorrecta (WPW) | 4281 (y duplicada en 3189, Moodle) | emb-c395acb90e6351ef.jpg | clave igual (c) |
| 2 | Caso Buenaventura, ECG → WPW | 4282 | emb-7ad0240419fc5243.jpg | `cotejar.py` la da NUEVA (sim 0) porque el enunciado de la plataforma lleva el caso completo añadido; mismas 5 opciones y misma clave (e) → YA ESTÁ |
| 3 | Rx manos → tumores pardos | 4283 | emb-54ba6d2a0b69694b.jpg | clave igual (d) |
| 4 | lengua escrotal | 4284 | emb-3efa9665aa5fb3c6.jpg | clave igual (b) |
| 5 | Caso varón 81 a., hiperpotasemia | 4285 | emb-f890c385932695fe.jpg | clave igual (e) |
| 6 | Caso varón 52 a., ACxFA | 4286 | emb-d8a75e35674e58ff.jpg | `cotejar.py` la da NUEVA (sim 0, el índice de firmas no la encuentra), pero es literalmente la misma pregunta: mismas 6 opciones y misma clave (a) → YA ESTÁ |
| 7 | pupilas → anisocoria | 4287 | emb-8b9c93d43d60bb1f.jpg | clave igual (a) |
| 8 | facies parkinsoniana | 4288 | emb-f3674da9ef42cc56.jpg | clave igual (a) |
| 9 | Rx tórax (foto de examen) | 4289 | emb-dadb02fa3a861dde.jpg | **clave distinta**, ver tabla |
| 53 | ECG pericarditis aguda | **4516** (banco `📝 2018 · Global Febrero`) | **sin `img`** | ver abajo |

**Pregunta 53 — ya está pero sin imagen.** Es la id **4516** (`📝 2018 · Global Febrero`, n 33), mismas opciones (en otro orden) y misma clave («Elevación del ST con concavidad hacia arriba, en V5 y V6, sobre todo»). No está en el banco de imágenes. La figura (Figura 29-2 del Sisinio, «ECG en la pericarditis aguda») se ha extraído y guardado igualmente en `/Users/santi/trabajo-claude/med91/medint_img/exa2014-10.jpg` (432×187 px, JPEG q80, recorte de solo el trazado, sin enunciado ni opciones; comprobado a ojo). Si se quiere, basta añadir a la 4516 `"img": "medint_img/exa2014-10.jpg"` (o clonarla al banco de imágenes). Nota: la imagen embebida en el PDF es una captura que incluye el enunciado y las opciones con la clave resaltada, por eso se recortó solo el trazado.

**Tabla de discrepancias de clave**

| id | clave documento | clave plataforma | fuente doc | veredicto |
|---|---|---|---|---|
| 4289 | b) Datos de pericarditis constrictiva (círculo a mano sobre la b en la foto del examen) | c) Datos de EPOC: tipo enfisema | alumno (círculo; esta pregunta es la única sin resaltado de corrección) | **plataforma**: la Rx muestra campos hiperclaros e hiperinsuflados con diafragmas aplanados y corazón estrecho, imagen de enfisema; la pericarditis constrictiva daría calcificación pericárdica/silueta pequeña con congestión, no hiperinsuflación. El círculo es una marca de alumno, no corrección. |

**Dudas.**
- Pregunta 1 (id 4281): la plataforma ya advierte (⚠️ en `exp`) de que las opciones no describen bien el trazado; la clave del documento (c) coincide.
- Pregunta 9 (id 4289): en el PDF la pregunta es una fotografía de otro examen en la que el enunciado está cortado; el de la plataforma está reconstruido («Observe la siguiente radiografía de tórax e indique qué datos muestra»). No se ha tocado.
- No se ha añadido ninguna imagen nueva para las ids 4281-4289 porque todas tienen ya la suya (son las mismas figuras del PDF, extraídas en octubre como `emb-*`).
