# Modo estudio: cómo se escribe un tema

El modo estudio (`estudio.js`) es una «sala de estudio» dentro de cada plataforma:
el tema se lee por apartados cortos, sabiendo qué cae y cómo lo preguntan, con
cuadros y esquemas, y se termina con la batería de preguntas del tema. Lo de
siempre (bancos, entrenador, plan de examen) sigue igual: es la «sala de examen».

Cada tema es un archivo `estudio/<clave>/tema-NN.json` (NN con dos cifras) y la
lista de temas está en `estudio/<clave>/indice.json`. La plataforma los pide al
abrir el modo estudio; no hay que tocar el HTML para añadir o cambiar un tema.

## Material

`python3 tools/estudio_material.py <clave> <N> salida.md` junta los apuntes del
tema, las pistas que lo nombran, las preguntas de sus bancos y las candidatas de
exámenes/bloques/seminarios parecidas por vocabulario (hay que confirmarlas).
La fuente de verdad son los apuntes (lo dicho en clase y las diapositivas). Si
algo del Guyton contradice los apuntes, manda lo de clase.

## Principios (por qué es así)

- **Nada de leer de corrido.** Cada apartado obliga a producir algo: una
  pregunta antes de leer (aunque falles, retienes mejor la respuesta), una
  comprobación al acabar, un cuadro para rellenar y un «explícalo sin mirar»
  al final del tema.
- **Lo que cae, primero y marcado.** Cada apartado lleva su peso de examen
  (🔥 0–3) con el porqué concreto (en qué examen cayó, si lo dijo el profesor,
  si está en las pistas). Los apartados se ordenan como en los apuntes, pero
  el peso decide cuánto espacio y cuántos recuadros se lleva cada uno.
- **Cómo lo preguntan.** En los conceptos que caen, un recuadro «🎯 Así lo
  preguntan» con el formato real (pide la INCORRECTA, caso con datos, confunde
  X con Y…) sacado de las preguntas reales, y «⚠️ Trampa» con el error típico.
- **Texto + esquema.** Cada idea difícil tiene un cuadro comparativo o un
  esquema (flujo de causa-efecto, bucle de regulación). Mejor un esquema bueno
  que tres párrafos.
- **Corto.** 4–7 apartados por tema; cada uno se lee en 3–6 minutos. Frases
  cortas, una idea por párrafo. No se copian los apuntes: se reescriben para
  entender, con el porqué de las cosas.
- **Fiel.** Ningún dato que no esté en los apuntes o en las preguntas reales.
  Cifras y nombres, los de clase.

## Formato de `tema-NN.json`

```json
{
  "tema": 7,
  "titulo": "Circulación sistémica y presión arterial",
  "bloque": "Cardiovascular",
  "minutos": 45,
  "intro": "Por qué importa este tema y qué te vas a llevar (2–3 frases).",
  "peso": 3,
  "pesoPorQue": "Resumen del peso del tema en examen (cuántas reales, qué apartados caen más).",
  "secciones": [
    {
      "id": "s1",
      "titulo": "La PAM: la presión motriz",
      "peso": 3,
      "pesoPorQue": "Cayó en Feb 2020 y Sep 2020; Kahoot T7 n.º 4; pista ★★ «la fórmula de la PAM».",
      "previa": [241],
      "bloques": [
        {"tipo": "texto", "md": "Párrafo en **markdown** sencillo."},
        {"tipo": "clave", "md": "La idea que hay que llevarse, en una o dos frases."},
        {"tipo": "cuadro", "titulo": "Arterias frente a venas", "cab": ["", "Arterias", "Venas"],
         "filas": [["Pared", "gruesa, elástica", "fina"], ["Función", "reservorio de presión", "reservorio de volumen"]]},
        {"tipo": "flujo", "titulo": "Reflejo barorreceptor ante una subida de PA",
         "pasos": ["↑ PA", "↑ disparo de barorreceptores (seno carotídeo, cayado)", "NTS (bulbo)", "↑ vago · ↓ simpático", "↓ FC, ↓ contractilidad, vasodilatación", "↓ PA"]},
        {"tipo": "bucle", "titulo": "Regulación a largo plazo",
         "estimulo": "↑ PA", "sensor": "riñón", "centro": "—", "efector": "diuresis y natriuresis por presión",
         "respuesta": "↓ volemia → ↓ PA", "signo": "negativa"},
        {"tipo": "formula", "expr": "PAM ≈ PD + (PS − PD)/3", "md": "Porque el corazón pasa más tiempo en diástole."},
        {"tipo": "porque", "pregunta": "¿Por qué la PAM no es la media de PS y PD?", "respuesta": "Porque…"},
        {"tipo": "asi", "md": "Lo piden con números: «PS 120, PD 90: ¿PAM?» y ponen 105 como trampa."},
        {"tipo": "trampa", "md": "Confundir presión de pulso (PS − PD) con PAM."},
        {"tipo": "parejas", "titulo": "Cada vaso con su papel", "pares": [["Arteriolas", "resistencia (los «tornillos»)"], ["Venas", "reservorio de volumen"]]},
        {"tipo": "cifras", "titulo": "Números que preguntan", "items": [["93 mmHg", "PAM normal"], ["< 60 mmHg", "PAM: riesgo de hipoperfusión"]]},
        {"tipo": "flujo", "titulo": "Barorreflejo", "pasos": ["Cambio de PA"], "ramas": [{"titulo": "Si sube", "pasos": ["↑ disparo", "↑ vago", "↓ PA"]}, {"titulo": "Si baja", "pasos": ["↓ disparo", "↑ simpático", "↑ PA"]}]}
      ],
      "comprueba": [3, {"q": "Pregunta propia si no hay real que sirva", "options": ["…", "…", "…", "…"], "correct": 1, "exp": "Por qué."}]
    }
  ],
  "rellenar": {
    "titulo": "Los tres plazos de la regulación de la PA",
    "cab": ["Plazo", "Mecanismo", "Sensor", "Efecto"],
    "filas": [["Corto (segundos)", {"h": "Reflejo barorreceptor"}, {"h": "Seno carotídeo y cayado aórtico"}, "FC, contractilidad, tono vascular"]]
  },
  "explicalo": [
    {"pide": "Explica sin mirar qué pasa en el reflejo barorreceptor al levantarte de golpe.",
     "modelo": "La respuesta modelo, breve, con los pasos clave."}
  ],
  "bateria": [241, 3, 36, 97120]
}
```

### Campos

- `previa`: 1–2 ids de preguntas REALES de la plataforma (mejor de examen,
  Kahoot o dicha en clase) sobre lo que viene en el apartado. Se hacen antes de
  leer y no cuentan.
- `bloques`: en el orden en que se leen. Tipos: `texto`, `clave`, `cuadro`,
  `flujo`, `bucle`, `formula`, `porque`, `asi`, `trampa`, y `img`
  (`{"tipo":"img","src":"ruta ya existente en el repo","pie":"…"}`). En `md`
  vale `**negrita**`, `*cursiva*`, listas con `- `, saltos de línea y
  sub/superíndices Unicode (Na⁺, O₂). Sin HTML.
- `parejas`: asociaciones (estructura → propiedad); la columna derecha sale
  tapada y se destapa al tocarla. Úsalas para el formato de examen «¿qué
  asociación es correcta?».
- `cifras`: los números que hay que saber, cada uno con lo que significa.
- `flujo`: `pasos` en cadena y, si se bifurca, `ramas` (cada una con
  `titulo` y `pasos`); `pasos` antes de las ramas es opcional.
- `bucle`: `centro`, `sensor` y `efector` son opcionales.
- `formula.expr`: texto plano con Unicode (½, ⅓, ², ₀, ×, ÷, →, ≈); sin LaTeX.
- `comprueba`: 1–3 preguntas tras leer. Ids reales de la plataforma o, si no
  hay ninguna que sirva, preguntas propias `{q, options, correct, exp}` (4
  opciones, `correct` desde 0, explicación desde los apuntes).
- `rellenar`: un cuadro (o una lista de cuadros, si el tema tiene dos ejes) de recuperación activa con lo esencial del tema. Las
  celdas `{"h": "respuesta"}` son huecos que el alumno escribe; las demás son
  pistas. 5–12 huecos. Respuestas cortas (1–5 palabras).
- `explicalo`: 2–4 preguntas abiertas para responder de memoria, con respuesta
  modelo breve.
- `bateria`: TODOS los ids de preguntas de la plataforma que son de este tema:
  las de sus bancos (Apuntes, Guyton, Kahoot del tema) y las de exámenes,
  bloques, seminarios y prácticas que traten de este tema (confirmadas a mano
  entre las candidatas). Las de examen primero. Ninguna inventada.
- `peso` (0–3): 3 = cae en casi todos los exámenes o el profesor insistió; 2 =
  ha caído o está en las pistas; 1 = de apoyo; 0 = no cae.

## Índice `estudio/<clave>/indice.json`

```json
{"asignatura": "Fisiología I", "temas": [
  {"tema": 7, "titulo": "…", "bloque": "Cardiovascular", "archivo": "tema-07.json", "peso": 3, "minutos": 45, "secciones": 6}
]}
```

`python3 tools/estudio_validar.py <clave>` comprueba los archivos (ids que
existen, huecos, campos, rangos) y rehace el índice. «aviso» no bloquea; «✗» sí.

**Modelo de referencia:** `estudio/fisio1/tema-07.json` (el piloto). Mira su nivel de detalle, cómo justifica los pesos y cómo escribe los «Así lo preguntan».
