# Histología Especial Humana I (2º Medicina, UCA): de los recursos descargados a preguntas con imagen

Un estudiante tiene una plataforma de test y ha descargado decenas de PDF de la asignatura (capturas de los cuestionarios de Moodle de las prácticas, atlas de micrografías rotuladas, recopilatorios de exámenes prácticos, fichas). Hay que convertir CADA imagen útil en preguntas tipo test «como las pone la profesora», y no perder ninguna pregunta que venga en los PDF. Tú te encargas de un lote de imágenes.

## Material de tu lote
- Manifiesto: el JSON que se te indica. Por cada página: `texto` (texto extraído de la página: pies de foto, rótulos, enunciados), `contexto` (JPG pequeño de la página entera, con cada imagen recuadrada en rojo y numerada) e `imagenes`. Cada imagen con `id` es TUYA y tiene su recorte en `archivo` (míralo con Read). Las que llevan `repetida_de` son, en principio, copias de una imagen que ya trata otro lote: no las proceses… SALVO en las capturas de preguntas: si en el `contexto` ves que esa captura repetida es OTRA pregunta (misma foto, distinto enunciado u opciones) que no está entre las tuyas, transcríbela también, como una pregunta más dentro de la entrada de la imagen tuya que comparte foto.
- Mira SIEMPRE el recorte de cada imagen tuya, y el `contexto` de la página cuando el recorte no baste para saber qué es (rótulos escritos fuera de la foto, título de la página, a qué práctica pertenece).
- Buscador de la plataforma (texto): `python3 /tmp/apuntes/hw/buscar.py "enunciado y alguna opción" "otra" ...` devuelve las 3 preguntas más parecidas con su id.
- Recortador: `python3 /tmp/apuntes/hw/sub.py` (lee su cabecera con `head -10 /tmp/apuntes/hw/sub.py`). Sirve para (a) aislar la micrografía dentro de una captura de pregunta, (b) separar un collage en sus fotos, (c) quitar un margen con un rótulo que delata la respuesta, o taparlo. Comprueba el resultado mirándolo.
- Cómo pregunta la profesora: lee `/tmp/apuntes/hw/estilo_ejemplos.txt` (70 preguntas reales suyas sobre imagen; la correcta va en negrita).
- Los recortes de `c/` están reducidos (máx. 1000 px); `ancho`/`alto` del manifiesto son los del original. sub.py trabaja con fracciones, así que da igual.
- No escribas fuera de /tmp/apuntes/hw/out/ y /tmp/apuntes/hw/c/. No toques /tmp/med91.

## Qué hacer con cada imagen tuya
Clasifícala (`tipo`):
- `captura_pregunta`: captura de una pregunta de Moodle o de examen (enunciado + foto + opciones). Transcribe la pregunta literal (enunciado, opciones en su orden, cuál aparece marcada). Recorta SOLO la micrografía (`sub.py <id> auto m` y, si sale mal, a mano), sin enunciado ni opciones. Búscala en la plataforma: si ya está la misma pregunta (mismo enunciado y opciones), pon su id en `en_plataforma`. OJO: en Moodle un mismo enunciado («La imagen corresponde a:») se repite con fotos distintas; si la pregunta de la plataforma con ese texto tiene una respuesta correcta que no encaja con lo que ves en tu foto, es otra foto: `en_plataforma: null`. Si la página dice que el cuestionario está entero bien («100/100», «10/10», «están todas bien»), la respuesta marcada ES la clave oficial: respétala salvo error evidente de lectura. En otro caso decide tú la respuesta correcta con criterio histológico; la marca de la captura es del estudiante y puede estar mal (a veces la página dice «hay 2 mal»).
  Si la captura no trae foto (pregunta solo de texto), `imagen_final` = null y transcribe igual.
- `micrografia`: foto de microscopio (óptico o electrónico), lleve o no rótulos, flechas o números. Escribe 2 preguntas nuevas (1 si la imagen es pobre o casi igual a otra de tu lote; 3 si es muy rica y tiene varias estructuras numeradas).
- `collage`: varias fotos en un mismo recorte. Sepáralas con sub.py y trata cada parte como una imagen (una entrada por parte, con su `imagen_final`).
- `esquema`: dibujo, diagrama, tabla, foto macroscópica o de libro que no es una preparación. No se pregunta: `descartada`.
- `texto`: captura que solo tiene texto o apuntes a mano, publicidad, portada. `descartada` (pero si el texto contiene preguntas tipo test, transcríbelas como `captura_pregunta` sin imagen).

## Cómo escribir las preguntas nuevas
- Estilo de la profesora: enunciados cortos y directos sobre lo que se ve («La imagen corresponde a:», «La flecha señala:», «El número 2 es:», «Identifique el órgano y la tinción:», «Las células señaladas con asterisco son:», «¿Qué tinción es?»), cuatro opciones, una sola correcta, distractores del mismo nivel (órganos o estructuras que de verdad se confunden con la correcta). También le gusta preguntar por la función o un rasgo de lo señalado («Una de sus funciones es», «Se disponen», «La pared de este vaso»).
- La pregunta tiene que poder contestarse MIRANDO la imagen publicada más lo que sabe un alumno. No dependas de un rótulo que queda fuera del recorte, ni preguntes lo que un rótulo visible ya dice. Si la imagen lleva rótulos que delatan la identificación, haz una de estas tres cosas: recorta o tapa el rótulo (sub.py) y pregunta la identificación; o usa el rótulo como dato y pregunta un paso más allá (de qué órgano es, qué tinción, qué función, con qué se distingue); o pregunta por otra estructura visible sin rotular. Si la foto trae flechas, números o asteriscos, úsalos; el pie de foto o el rótulo te dan la respuesta.
- Capturas del microscopio virtual con rótulos amarillos (anotaciones de un estudiante): lo más limpio es `sub.py <id> 0 0 1 1 n --tapar-amarillos todos` (o solo algunos; mira antes `--amarillos`), que sustituye cada rótulo por un parche con su número, y preguntar «El nº 2 señala:» como hace la profesora. Los rótulos de los estudiantes a veces están MAL: compruébalos con lo que se ve antes de darlos por buenos. Notas en texto negro u otros rótulos: `--tapar x0,y0,x1,y1,N`.
- En el enunciado no digas «el rótulo tapado» sin número ni des pistas de posición largas: usa el número del parche, la flecha, el asterisco o el recuadro que haya.
- Las dos preguntas de una imagen deben preguntar cosas distintas (por ejemplo órgano y estructura señalada, o estructura y tinción/función).
- No inventes: si no puedes identificar con seguridad lo que se ve ni con el contexto, pon `seguridad: "baja"` y dilo en `descripcion`. Si la imagen es ilegible o demasiado pequeña, `descartada`.
- `exp`: 2-3 frases en español: qué se ve que lo demuestra y cómo se distingue del distractor más tentador. Sin frases de relleno.
- Varía la posición de la correcta.

## Salida
JSON (lista) en la ruta que se te indica; una entrada por imagen tuya (o por parte de un collage):
```
{"id": "<id del manifiesto>", "tipo": "captura_pregunta|micrografia|collage|esquema|texto",
 "aparato": "sangre|circulatorio|linfoide|respiratorio|digestivo|glandulas_anejas|urinario|masculino|femenino|tegumentario|otro",
 "organo": "p. ej. bazo", "tincion": "H-E, PAS, tricrómico, ME…; '' si no se sabe",
 "descripcion": "una frase: qué se ve y qué rótulos trae",
 "imagen_final": "<id>-<sufijo> si has recortado, <id> si se publica tal cual, null si no lleva imagen",
 "descartada": "motivo, solo si no se pregunta",
 "preguntas": [{"origen": "fuente|nueva", "q": "...", "options": ["...","...","...","..."], "correct": 0,
                "exp": "...", "seguridad": "alta|media|baja",
                "marcada_fuente": 2,        // solo origen fuente: índice marcado en la captura, o null
                "en_plataforma": 1844}]}    // solo origen fuente: id si ya está, o null
```
Las preguntas de `origen: "fuente"` conservan sus opciones tal cual (pueden ser 2 en verdadero/falso, o 5).

## Mensaje final
Solo: ruta del JSON, nº de imágenes tratadas, cuántas descartadas, nº de preguntas de fuente (y cuántas ya estaban en la plataforma) y nº de preguntas nuevas. Nada más.
