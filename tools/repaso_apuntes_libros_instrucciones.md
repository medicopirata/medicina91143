# Repaso de una plataforma de test: primero los apuntes de clase, después los libros de referencia

Santiago (2º Medicina, UCA) estudia con una plataforma de test. Las preguntas vienen de baterías, exámenes de otros años y cuestionarios. Hay que revisar, UNA POR UNA, las preguntas de tu archivo y corregir lo que esté mal, con este orden de autoridad:

1. **Apuntes de clase** (si se te da un archivo de apuntes): son lo que su profesorado dará por bueno en el examen. Si una pregunta o su explicación chocan con ellos, gana el apunte. Mira sobre todo las «Pistas de examen», lo que se recalcó y las «Fe de erratas».
2. **Libros de referencia**, cuando los apuntes no tratan lo que se pregunta (o no tienes apuntes): tu conocimiento experto según los textos habituales (Fisiología: Guyton, Berne y Levy, Silverthorn, Boron; Histología: Ross, Junqueira, Geneser, Kierszenbaum, Gartner).

Cada pregunta trae: opciones (✓ = la que la plataforma da por correcta; ≈ = otra que ya se acepta) y EXP (la explicación que ve el estudiante). `[con imagen]` = lleva una foto que tú no ves: en esas no juzgues la identificación de lo fotografiado; revisa solo lo que el texto permite (datos de la explicación, coherencia entre clave y explicación).

## Qué anotar (solo preguntas con algo que corregir)
- `clave`: la opción marcada es errónea y otra es la correcta.
- `segunda`: hay otra opción igual de cierta que la marcada (y no lleva ya ≈).
- `explicacion`: la explicación contiene un error de hecho, contradice la clave, contradice los apuntes, o calla un matiz que en clase se recalcó y es justo lo preguntado.
- `nomenclatura`: término distinto del usado en clase que puede confundir al contestar.
- `sin_respuesta`: ninguna opción es correcta o la pregunta está tan mal planteada que hay que reformularla (propón el arreglo en `motivo`).

## Reglas
- `base: "apuntes"`: exige `cita` con la frase LITERAL de los apuntes (cópiala tal cual; sin cita no hay hallazgo de apuntes).
- `base: "libro"`: solo errores claros y comprobables, no matices ni preferencias; indica la `referencia` (libro y, si lo sabes, capítulo o concepto). Si es discutible entre textos, no cambies la clave: como mucho `segunda`.
- Si apuntes y libros discrepan, gana el apunte: cambia la clave al apunte y deja la respuesta de libro en `tambien_idx`.
- No anotes las que están bien. No propongas cambios de estilo. No toques nada fuera de /tmp/apuntes/rep/out2/.

## Salida
JSON (lista) en la ruta indicada, una entrada por pregunta con hallazgo:
```
{"id": 425, "tipo": "clave|segunda|explicacion|nomenclatura|sin_respuesta", "base": "apuntes|libro",
 "correcta_idx": 1,          // solo tipo clave
 "tambien_idx": [0],         // opciones que además deben aceptarse
 "cita": "frase literal de los apuntes",        // obligatorio si base = apuntes
 "referencia": "Guyton, cap. 26: …",            // obligatorio si base = libro
 "motivo": "qué está mal y por qué, en una o dos frases",
 "exp_nueva": "explicación completa y corregida (2-4 frases, en español), coherente con la clave final; obligatoria salvo en nomenclatura",
 "seguridad": "alta|media|baja"}
```
Mensaje final: solo la ruta del JSON, nº de preguntas revisadas y nº de hallazgos por tipo y por base.
