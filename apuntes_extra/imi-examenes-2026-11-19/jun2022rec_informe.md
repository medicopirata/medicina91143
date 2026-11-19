# Informe · `jun2022rec` — «Global junio 2022» (Wuolah: *Patologia-Anual-Junio-2022.pdf*)

## Identificación
- **Examen de Recuperación de toda la asignatura · Modelo 1**, IMI (UCA), jueves 23 de junio de 2022.
- Escaneo CamScanner subido a Wuolah; 9 páginas del PDF: p01 portada Wuolah, p02–p06 y p08–p09 = páginas 1–7 del examen, **p07 es un anuncio** (sin contenido).
- **60 preguntas** tipo test de 5 opciones (numeración 1–60 continua, página 7 termina en la 60; no hay más páginas).
- **No hay marcas de respuesta** de ningún tipo (ni círculos, ni plantilla, ni corrección) → `fuente_clave: "ninguna"` en todas; la clave la he resuelto yo y la guardo en el campo `resuelta` de `work/jun2022rec_todas.json` (`correct` queda a `null` como pide el SPEC).
- No hay preguntas de desarrollo, ni de emparejamiento, ni dependientes de imagen.

## Recuento
| | n |
|---|---|
| Transcritas (`work/jun2022rec_todas.json`) | 60 / 60 |
| Ya estaban en la plataforma (`ESTÁ`) | **60** |
| Nuevas cargadas (`out/jun2022rec.json`) | **0** (lista vacía) |
| Descartadas | 0 |

Todas las coincidencias tienen sim ≥ 0,85; las diferencias de texto son erratas del original (*Dreseler/Dressler, Dietrich/Dittrich, Sheeham/Sheehan, hipertotasemia/hiperpotasemia, IARCC/IARC, «Todas son cierta»…*) o cambios de orden de opciones. No hubo ninguna `NUEVA` con sim entre 0,4 y 0,6.

### Dónde está cada pregunta
- **Q1–2, 4, 6–15, 17–19, 21–26, 28–31** (26) → banco `📝 2022 · Global Junio (recuperación)` (ids 4920–4945; el banco tiene 26, no 24). Q11 y Q19 están en ese banco (4928, 4935) aunque el cotejo las emparejó con sus gemelas de la Megabatería (6330, 6280) por tener redacción más parecida.
- **Q32, 34–37, 39–41, 43–47, 49, 51–52, 54–55, 57–60** (22) → banco `📝 2022 · Anual Junio` (ids 4898–4919).
  ⚠️ **Hallazgo:** el banco «2022 · Anual Junio» es la **segunda mitad (Q32–60) de este mismo examen de recuperación**; «Global Junio (recuperación)» es la primera mitad (Q1–31). Son el mismo examen partido en dos bancos con numeración `n` continua. Podría unificarse el nombre (p. ej. renombrar las 22 de «Anual Junio» al banco de recuperación), pero no he tocado la plataforma.
- **Q3** → 5019 (2023 · Global Septiembre, mismas opciones). **Q5** → 4959 (2023 · Global Junio). **Q16** → 4991 (2023 · Global Septiembre). **Q20** → 4984 (2023 · Global Septiembre). **Q27** → 4993 (2023 · Global Septiembre). **Q33** → 4530 (2018 · Global Febrero). **Q38** → 4843 (2022 · 1er parcial Junio, plantilla oficial). **Q42** → 4996 (2023 · Global Septiembre). **Q48** → 4866 (2022 · 1er parcial Junio, plantilla oficial). **Q50** → 5034 (2023 · Global Septiembre). **Q53** → 5037 (2023 · Global Septiembre). **Q56** → 4505 (2018 · Global Febrero).
  Estas 12 (3, 5, 16, 20, 27, 33, 38, 42, 48, 50, 53, 56) ya existen con las mismas cinco opciones en otros bancos; no se duplican. Si se quiere que aparezcan en el modo «examen 2022 recuperación», bastaría añadir `"2022 · Global Junio (recuperación)"` a su campo `caida`.

## Discrepancias de clave
El documento no trae clave (`clave_igual: null` en todo el cotejo), así que la tabla oficial del SPEC queda vacía. He comparado en su lugar **mi clave resuelta** con la de la plataforma para las 60: **coinciden las 60** (comparación por texto de la opción, independiente del orden). No hay nada que corregir.

Claves resueltas que merecen comentario (todas coinciden con la plataforma):
| n | id | clave | comentario |
|---|---|---|---|
| 2 | 4921 | Todas son ciertas | ⚠️ la opción c («Sólo son ciertas…») es contradictoria con «todas»; es el patrón habitual del profesor y la plataforma ya lo tiene así. |
| 10 | 4927 | Poliglobulia | enunciado confuso («más lento, pero útil a corto plazo»); la poliglobulia es el mecanismo lento de la hipoxemia crónica. |
| 15 | 4932 | Mesocardio / hiperextensión del tórax | ⚠️ el roce también persiste en apnea (opción d defendible); clave de la plataforma mantenida. |
| 33 | 4530 | Ninguna es cierta | plantilla oficial de 2018 con las mismas 5 opciones; el mecanismo real es la caída de la presión diastólica (↓ perfusión coronaria), que no figura. |
| 39 | 4903 | Se desvía hacia abajo y afuera | «potente y sostenido» (e) también es cierto; la plataforma ya la tiene con a. |
| 48 | 4866 | Todas son ciertas | plantilla oficial del 1er parcial 2022. |
| 50 | 5034 | Todas son ciertas | coincide con Bloque Renal (1462/6693) y Global sept. 2023. |

## Casos clínicos con nombre
- **Q8 Agapito Sánchez**: el caso no aparece en el PDF; la pregunta es autocontenida (café → HTA) y ya está en la plataforma (4925) sin resumen de caso.
- **Q14 Pedro Salvador** y **Q26 Agustín (caso Buenaventura)**: el caso no aparece en el PDF; he antepuesto el resumen `📋 Caso…` que ya usa la plataforma (4931, 4941), tomado de los exámenes donde sí se describe el caso.
- **Q46 y Q55 Pedro Santos**: el enunciado ya incluye los datos del caso.
- **Q24 Arturo, Q47 Candela, Q18 Adelaida, Q58 Alberto Garzonita, Q4 Lauren Punchdemon, Q6 Ambrosio**: autocontenidas.

## Dudas
- Ninguna pregunta falta: 60 numeradas, 60 transcritas.
- El PDF de Wuolah se llama «Patologia-Anual-Junio-2022» pero el encabezado del examen es «Examen de recuperación de toda la asignatura»; de ahí que en su día se cargara en dos bancos con nombres distintos.
