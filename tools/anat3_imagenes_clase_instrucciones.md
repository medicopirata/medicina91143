# Anatomía 3 (cabeza y SNC, 2º Medicina, UCA): preguntas tipo test sobre las imágenes de clase

Santiago estudia con una plataforma de test. Sus apuntes de clase llevan las diapositivas que usaron los profesores. Hay que convertir esas imágenes en preguntas tipo test «de examen», poniendo el mayor esfuerzo en las que los profesores marcaron como importantes. El examen de esta asignatura pregunta mucho sobre imagen: «¿qué estructura señala el número 3?», «la flecha señala:», «¿cuál de estas es el tálamo?».

## Material de tu lote
- Lote (JSON): lista de imágenes con `id`, `archivo` (míralo SIEMPRE con Read), `alt` (pie), `tema`, `seccion`, `antes`/`despues` (texto de los apuntes que rodea a la imagen), `pregunta_doc` (true = es una de las «preguntas con imagen» que el propio documento plantea: suelen llevar los rótulos tapados con números y su respuesta está en el «Solucionario» del tema) y `marca` (true = cerca hay una marca de importancia).
- Apuntes del tema: el .md que se te indica. Léelo entero antes de empezar: ahí están las «🎯 Pistas de examen», lo que el profesor recalcó, la «Fe de erratas» y el «Solucionario» con lo que señala cada número de las preguntas con imagen. Todo lo que afirmes debe coincidir con estos apuntes (si apuntes y libros discrepan, gana el apunte).
- Recortador: `python3 /tmp/apuntes/ai/sub.py` (lee su cabecera con `head -10 /tmp/apuntes/ai/sub.py`; trabaja sobre /tmp/apuntes/ai/c/<id>.jpg): recorta, y con `--tapar x0,y0,x1,y1,N` pone un parche gris numerado sobre un rótulo. Úsalo cuando un rótulo visible delate la respuesta y quieras preguntar la identificación («El nº 2 señala:»). Mira el resultado para comprobarlo.
- No escribas fuera de /tmp/apuntes/ai/out/ y /tmp/apuntes/ai/c/. Usa nombres propios para scripts temporales.

## Cuántas preguntas por imagen
- `pregunta_doc: true` (las que el profesor/documento ya pregunta sobre imagen): **2-4 preguntas**, una por estructura numerada relevante («El número 4 corresponde a:»), con la clave del Solucionario. Son las más valiosas.
- Imagen de una diapositiva que los apuntes señalan como de examen o que ilustra algo recalcado (⭐, 🔴, 🟠, «entra seguro», «hay que sabérselo», «lo preguntó», Kahoot): **2-3 preguntas**. Marca `importante: true` y copia en `por_que` la frase literal de los apuntes que lo dice.
- Resto de imágenes útiles: **1 pregunta** (2 si es rica).
- Descarta (campo `descartada`) portadas, fotos de personas, anécdotas, texto puro o imágenes ilegibles. Si dos imágenes del lote son casi iguales, pregunta cosas distintas en cada una.

## Cómo escribir las preguntas
- Cuatro opciones, una sola correcta, distractores del mismo nivel (estructuras vecinas o que se confunden de verdad). Varía la posición de la correcta.
- Deben contestarse MIRANDO la imagen publicada más lo que sabe el alumno. No dependas de texto que quede fuera de la imagen. No preguntes lo que un rótulo visible ya dice: o tapas el rótulo con parche numerado y preguntas la identificación, o usas el rótulo como dato y preguntas un paso más (función, relación, lesión, qué pasa por ahí, lo que el profesor recalcó de esa estructura).
- Usa la nomenclatura de los apuntes.
- `exp`: 2-3 frases: por qué es la correcta, con el dato de clase, y cómo no confundirla con el distractor más tentador.

## Salida
JSON (lista) en la ruta indicada; una entrada por imagen:
```
{"id": "<id del lote>", "importante": true|false, "por_que": "frase literal de los apuntes (solo si importante)",
 "descripcion": "qué muestra", "descartada": "motivo (solo si no se pregunta)",
 "imagen_final": "<id>" o "<id>-<sufijo>" si has recortado/tapado,
 "preguntas": [{"q": "...", "options": ["","","",""], "correct": 0, "exp": "...", "seguridad": "alta|media|baja",
                "imagen_final": "opcional: si esta pregunta usa otro recorte distinto del de la entrada"}]}
```
Mensaje final: solo la ruta, nº de imágenes tratadas, descartadas, importantes y nº total de preguntas.
