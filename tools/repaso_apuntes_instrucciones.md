# Repaso de la plataforma de Anatomía 3 contra los apuntes de clase del estudiante

Santiago (2º Medicina, UCA) estudia Anatomía Humana III (cabeza y SNC) con una plataforma de test. Sus APUNTES DE CLASE (hechos a partir de las clases y diapositivas de este curso) son la referencia de lo que su profesorado va a dar por bueno en el examen. Las preguntas de la plataforma vienen de baterías y exámenes de otros años y a veces dicen otra cosa.

Tu trabajo: leer los apuntes que se te indican y revisar, UNA POR UNA, las preguntas de tu archivo. Hay que encontrar y corregir todo lo que choque con los apuntes:
1. **Clave**: la opción marcada (✓) contradice lo dicho en clase, y otra opción es la que encaja con los apuntes.
2. **Segunda respuesta**: según los apuntes hay otra opción igual de cierta que la marcada (las que ya llevan ≈ ya se aceptan).
3. **Explicación**: la explicación (EXP) dice algo que contradice los apuntes (un dato, una cifra, un nombre, una lateralidad), o ignora un matiz que en clase se recalcó y que es justo lo que se pregunta (mira sobre todo «Lo esencial», «🎯 Pistas de examen», «Fe de erratas» y «Las trampas que más se repiten»).
4. **Nomenclatura**: la pregunta o la explicación usan un término que en clase se dijo de otra forma y puede confundir (anótalo solo si importa para contestar).

Reglas:
- Solo cuenta lo que los apuntes digan de verdad. Cita SIEMPRE la frase literal de los apuntes en `cita` (cópiala tal cual; si no puedes citarla, no hay hallazgo). No corrijas con tu criterio lo que los apuntes no tratan.
- Si los apuntes y la bibliografía discrepan, gana el apunte, pero dilo en `motivo`.
- Si la pregunta trata algo que los apuntes no cubren, no la anotes.
- No anotes las que están bien. No propongas cambios de estilo.
- Los apuntes traen a veces una «Fe de erratas» que corrige lo que se dijo en clase o en la transcripción: tenla en cuenta (lo corregido es lo válido).
- No modifiques nada fuera de /tmp/apuntes/rep/out/.

Salida: JSON (lista) en la ruta indicada, una entrada por pregunta con hallazgo:
```
{"id": 425, "tipo": "clave" | "segunda" | "explicacion" | "nomenclatura",
 "correcta_idx": 1,            // solo tipo clave: índice de la opción que debe quedar como correcta
 "tambien_idx": [0],           // opciones que además deben aceptarse (tipo segunda, o la antigua correcta en tipo clave si sigue siendo defendible)
 "cita": "frase literal de los apuntes", "tema_apuntes": "Tema 7 (II), §9",
 "motivo": "qué choca y por qué, en una o dos frases",
 "exp_nueva": "explicación completa y corregida (2-4 frases, en español) coherente con los apuntes y con la clave final; dila siempre que cambie la clave o que la explicación actual esté mal",
 "seguridad": "alta|media|baja"}
```
Mensaje final: solo la ruta del JSON, nº de preguntas revisadas y nº de hallazgos por tipo.
