# Vueltas a lo que cae · Fisiología I (2.º de Medicina, UCA)

Santiago prepara el examen de Fisiología I. Tiene en su plataforma las preguntas que han caído
en exámenes de otros años y las que los profesores han puesto como tareas en clase (Kahoot,
cuestionarios en papel, seminarios, prácticas, lección Moodle). La idea: **sabemos lo que van a
preguntar; vamos a darle vueltas y preguntarlo de formas distintas.** Para cada pregunta base
hay que escribir **4 preguntas nuevas** tipo test (4 opciones, una correcta) que examinen la
misma idea desde ángulos distintos.

## Qué recibes
- Tu lote: `apuntes_extra/fisio1-vueltas/base/lote-NN.json` → `{bloque, apuntes, preguntas:[…]}`.
  Cada pregunta base trae `id`, `topic` (banco de origen), `q`, `options`, `correct` (índice 0-3),
  `exp` (explicación ya revisada: fíate de ella, incluidas sus notas sobre discrepancias con la
  clase), `grupo` (examen | tarea), y a veces `cae` (cita del profesor) o `caida` (exámenes en
  que se repitió).
- Los apuntes de clase del bloque: `apuntes_extra/fisio1-vueltas/apuntes-<bloque>.md`
  (volcado de las diapositivas y lo dicho en clase). Es LA fuente de verdad: lo que dijo el
  profesor manda sobre el Guyton o sobre lo que tú sepas. `apuntes-general.md` tiene además la
  sección «Pistas de examen» con cómo preguntan en cada tema: léela por encima.
  Busca en ellos con grep (el archivo es grande; no hace falta leerlo entero).

## Los 4 ángulos (uno de cada por pregunta base)
1. **inversa** — misma idea, giro lógico: si la base pide la correcta, pide la FALSA (o al revés);
   o convierte un distractor de la base en el enunciado («¿Cuál de estas afirmaciones sobre X es
   cierta?») de modo que la respuesta sea la razón por la que ese distractor era falso.
2. **distractor** — la respuesta correcta es ahora uno de los OTROS conceptos de la base: pregunta
   por un distractor de la pregunta original en su contexto verdadero (si la base preguntaba
   «qué hormona hace X» con opciones A-D, pregunta ahora qué hace la hormona B).
3. **aplicada** — un caso breve (paciente, experimento, cifra, gráfica descrita en texto, situación
   fisiológica: ejercicio, altitud, hemorragia, ayuno…) cuya resolución exige la misma idea. Con
   números cuando la base los tenga (usa los valores de clase).
4. **mecanismo** — el porqué o la consecuencia: «¿qué ocurre si…?», «¿cuál es el mecanismo de…?»,
   «¿qué pasa aguas abajo…?», comparación entre dos conceptos que se confunden, o la cifra/dato
   concreto que la base da por sabido.

## Reglas
- Todo lo que afirmes (en la correcta, en los distractores y en la explicación) tiene que ser
  verdad según los apuntes de clase o la explicación de la pregunta base. Cuando la base anote
  que la clase dice algo distinto del libro, usa lo de clase. No inventes cifras: si no está en
  los apuntes ni en la base, no la uses.
- Cada pregunta: enunciado claro, 4 opciones de longitud parecida, UNA correcta sin discusión,
  distractores plausibles (errores típicos, no absurdos). Nada de «todas las anteriores»,
  «ninguna», «a y b son ciertas». Si el enunciado pide la FALSA/INCORRECTA, escríbelo en
  mayúsculas.
- No repitas la pregunta base ni la copies con sinónimos; las 4 vueltas tienen que diferir
  entre sí (no dos enunciados que pregunten lo mismo).
- `exp` (≥ 100 caracteres): por qué es correcta y por qué están mal los distractores que más
  engañan, citando el tema («Tema 22, diapositiva de filtración…» o «dicho en clase»). Termina
  con `▸ Vuelta a la pregunta de <topic de la base> («primeras ~8 palabras del enunciado base…»)`.
- Español correcto, con tildes, unidades y símbolos bien (mmHg, mEq/l, ml/min, PO₂, Na⁺, ↑/↓).
- Si una pregunta base es defectuosa (ambigua, clave discutible), haz igualmente las 4 vueltas
  sobre la idea que la clase defiende y dilo en la explicación.

## Lo que entregas
`apuntes_extra/fisio1-vueltas/vueltas-NN.json` (NN = número de tu lote):
```json
{"lote": 7, "preguntas": [
  {"de": 1234, "angulo": "inversa", "q": "…", "options": ["…","…","…","…"], "correct": 2, "exp": "…"},
  …
]}
```
`de` = id de la pregunta base; `correct` = índice 0-3 de la opción correcta. 4 entradas por
pregunta base, en el orden del lote. Escribe el archivo por partes si es largo (el Write
sobrescribe: acumula en una variable mental y escribe el JSON completo al final, o escribe
trozos en archivos `vueltas-NN.parte1.json`… y júntalos al final en `vueltas-NN.json`).

Al terminar ejecuta `python3 tools/fisio1_vueltas_validar.py NN` y corrige lo que señale hasta
que diga «0 errores». Responde solo con un resumen de 3 líneas: cuántas preguntas, qué dudas
de contenido encontraste (si alguna) y el resultado del validador.

---

# Pasada 2 · longitudes (22-11-2026)

En las vueltas ya escritas, la opción correcta es la más larga en el 76 % de las preguntas:
eso delata la respuesta. Hay que igualar longitudes **sin cambiar el contenido**.

- Trabaja sobre `apuntes_extra/fisio1-vueltas/vueltas-NN.json` en el sitio (haz copia de
  seguridad antes en tu subcarpeta del scratchpad). NO toques `q`, `de`, `angulo` ni
  `correct`; cambia solo el texto de las `options` (y `exp` únicamente si citaba literalmente
  una opción que has reescrito).
- Para cada pregunta que señale `python3 tools/fisio1_vueltas_longitudes.py NN`: acorta la
  correcta (quita la coletilla explicativa, deja el dato) y/o alarga los distractores con un
  matiz FALSO pero plausible del mismo estilo («…, por eso ↑ la FG» en un distractor que ya
  era falso). Las cuatro opciones deben quedar parejas en longitud y en forma (si la
  correcta lleva paréntesis o coletilla, que los lleven las demás; si no, ninguna).
- Alarga o acorta también en preguntas que no estén señaladas si hace falta para que en el
  lote la correcta sea la más larga en el 15-35 % de las preguntas y la más corta en el
  15-35 %. Ojo: si la correcta NUNCA es la más larga, la opción más larga delata que es
  falsa; el objetivo es que la longitud no diga nada (≈ 1 de cada 4 veces la más larga,
  ≈ 1 de cada 4 la más corta), no acortar todas las correctas.
- Nunca hagas verdadero un distractor ni falsa la correcta. Nada de «todas las anteriores».
- Al acabar: `python3 tools/fisio1_vueltas_longitudes.py NN` → «OK», y
  `python3 tools/fisio1_vueltas_validar.py NN` → «0 errores». Responde en 2 líneas:
  preguntas retocadas y resultado de los dos comprobadores.
