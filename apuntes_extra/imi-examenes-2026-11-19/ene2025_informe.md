# Informe · examen IMI enero 2025 (clave `ene2025`)

## Identificación
- PDF «examen IMI enero 2025»: primer parcial de IMI, convocatoria de enero de 2025, 40 preguntas de 5 opciones, un solo modelo (6 páginas).
- **Sin clave**: el documento no trae plantilla ni marcas de alumno (`fuente_clave: "ninguna"` en las 40). Todas las claves de este informe y de `out/ene2025.json` son resoluciones propias (terminan con «🔎 Clave resuelta…»).
- Transcripción: revisada a partir de `cand/examen IMI enero 2025.json` cotejada con `txt/` y las páginas PNG; se arreglaron ligaduras «ﬁ/ﬂ» y la n.º 28 (opciones rotas por el «A.» de «A. Sideroblástica»). Erratas del original se dejan tal cual (p. ej. «Seña la respuesta», «El VI no tiene de adaptarse», «diatésis», «cúal»).
- Banco de carga: `📝 2025 · Enero 1er parcial`.

## Recuento
| | n.º |
|---|---|
| Preguntas del documento | 40 |
| Transcritas en `work/ene2025_todas.json` | 40 (ninguna falta) |
| Ya estaban en la plataforma (`ESTÁ`) | 21 |
| Nuevas cargadas en `out/ene2025.json` | 19 (17 de texto + 2 con figura: n.º 16 y 18) |
| Descartadas | 0 |

Nuevas cargadas: 2, 5, 9, 11, 14, 15, 16 (con figura), 17, 18 (con figura), 19, 21, 22, 24, 26, 27, 31, 34, 35, 37.

### Preguntas con figura (cargadas a petición del coordinador)
- **n.º 16** (Carles PG, 57 años, depresión del reflejo tusígeno, expectoración pútrida + Rx de tórax): figura recortada de la página 3 a 200 dpi, comprobada a ojo (solo la radiografía: cavidad con nivel hidroaéreo en el campo superior derecho), guardada como `/Users/santi/trabajo-claude/med91/medint_img/exa2025-16.jpg` (798×553, JPEG q80) y referenciada con `"img": "medint_img/exa2025-16.jpg"`. Clave resuelta: b) absceso pulmonar; coincide con la versión sin imagen que ya existía (id 3145, Tests online Moodle). Se carga como variante con figura y con la opción «infección pulmonar complicada» distinta.
- **n.º 18** (Alfredo, 50 años, dolor precordial intolerable de 1 h en reposo + ECG): figura recortada y comprobada (solo las dos tiras del ECG, con la marca de agua «My EKG» que ya traía el original), guardada como `/Users/santi/trabajo-claude/med91/medint_img/exa2025-18.jpg` (671×381, JPEG q80; el original no llega a 900 px). Clave resuelta: d) IAM con elevación de ST (elevación convexa del ST que engloba la T, con imagen especular). Sin equivalente en la plataforma (parecida más cercana 97073, sim 0,17).

### NUEVAS con sim 0,4-0,6 revisadas a ojo
- n.º 9 (piel de naranja) vs 97238: misma pregunta pero la de la plataforma tiene 4 opciones distintas (retracción del pezón, hoyuelo, Paget); el examen trae 5 (hoyuelos, piel apergaminada, eritema mamario, acantosis nigricans) → variante, **cargada**.
- n.º 16 vs 3145: misma pregunta sin imagen; se carga igualmente con la figura (ver arriba), opciones no idénticas.
- n.º 17 vs 6058: pregunta distinta (factor de riesgo «no modificable» vs «cuál no es factor de riesgo») → **cargada**.

## Tabla de discrepancias de clave (ESTÁ con `clave_igual: false`)
El documento no trae clave, así que `clave_igual` es `null` en las 21. En su lugar, comparación de **mi resolución** con la clave de la plataforma:

| n.º | id plataforma | banco | mi resolución | clave plataforma | ¿coincide? |
|---|---|---|---|---|---|
| 1 | 4951 | 2023 Global Junio | a) citocinas proinflamatorias por el SMF | misma | sí |
| 3 | 4933 | 2022 Global Junio (rec.) | Todas son ciertas | misma | sí |
| 4 | 4904 | 2022 Anual Junio | Recurrente | misma | sí |
| 6 | 4543 | 2018 Septiembre | campana para graves (estenosis mitral) | misma | sí |
| 7 | 97244 | Preparación IMI Junio 2026 | Desdoblamiento paradójico | misma | sí |
| 8 | 4877 | 2022 1er parcial (oficial) | Una condensación pulmonar | misma | sí |
| 10 | 4996 | 2023 Global Septiembre | Neumotórax | misma | sí |
| 12 | 4875 | 2022 1er parcial (oficial) | Aparición brusca de dolor pleurítico | misma | sí |
| 13 | 3967 | Tests online | Todas son ciertas (hipoventilación → hipercapnia → acidosis resp.) | misma | sí (⚠️ estrictamente el término es «hipoventilación», pero el profesor da por buena «todas») |
| 20 | 4906 | 2022 Anual Junio | Cor pulmonale agudo / embolismo pulmonar | misma | sí |
| 23 | 2584 | Megabatería | Piel amarilla pálida y orina normal | misma | sí |
| 25 | 4584 | 2018 Septiembre | Tratamiento con cisplatino | misma | sí |
| 28 | 2452 | Megabatería | A. Sideroblástica | misma | sí |
| 29 | 4984 | 2023 Global Septiembre | plaquetas bajas + tiempo de hemorragia alargado | misma | sí |
| 30 | 4912 | 2022 Anual Junio | ↑ hematocrito por ↓ volumen plasmático | misma | sí |
| 32 | 5142 | Examen final Patología | desde ausencia de P hasta cambios de repolarización | misma | sí |
| 33 | 4905 | 2022 Anual Junio | Todas son ciertas | misma | sí |
| 36 | 4542 | 2018 Global Febrero | Hipertensión arterial (no interviene) | misma | sí |
| 38 | 97091 | Examen final 4-7-2018 | Todas son ciertas | misma | sí |
| 39 | 3414 | Daypo 2021-22 | lesión vascular del núcleo subtalámico de Luys | misma | sí |
| 40 | 4346 | Recopilatorio 2º parcial | Síndrome de Eaton-Lambert | misma | sí |

Las 21 coinciden; no hay discrepancias que corregir en la plataforma.

## Claves resueltas de las nuevas (y dudas)
| n.º | clave | nota |
|---|---|---|
| 2 | b) Todas son ciertas | pródromos: triviales, preceden a infecciones, inadvertidos para enfermo y médico |
| 5 | e) falsa: continua ≠ oscilaciones > 1 °C | |
| 9 | d) Piel de naranja | |
| 11 | e) Expectoración | |
| 14 | c) patrón periódico crescendo-decrescendo con apnea | |
| 16 | b) Un absceso pulmonar | con figura; igual que 3145 |
| 15 | d) Todas son ciertas | ⚠️ dudosa: hipocapnia → ↓ Ca iónico y efecto Bohr son todas ciertas; si el profesor quería un único «dato clave» sería b) hipocapnia |
| 17 | d) Hipercalcemia | |
| 18 | d) IAM con elevación de ST | con figura |
| 19 | d) el VI no se adapta y ↑ presión telediastólica | |
| 21 | a) Todas son ciertas | coherente con 4413 y 97040 de la plataforma |
| 22 | d) La pirosis | ⚠️ leve: «es/son» + «Todas» podría ser la intención del profesor, pero tos y broncoespasmo son manifestaciones extraesofágicas, no «la principal» |
| 24 | e) falsa: «únicamente» fallo hepático agudo | |
| 26 | c) retrodifusión del filtrado por el epitelio lesionado | |
| 27 | a) ↓ reabsorción tubular de agua como mecanismo común | |
| 31 | b) Todas son ciertas | talasemia minor, plomo (intoxicación), sideroblásticas |
| 34 | e) aromatización en tejido adiposo | coherente con 5351 |
| 35 | c) Estados de hipercorticalismo | ⚠️ la más dudosa: pregunta de lista sin clave; hipersudoración y oclusión intestinal son causas clásicas de hipocloremia (depleción salina, cf. id 78), pero si el profesor las listaba como pérdidas de agua con hemoconcentración la clave sería «Todas son ciertas» |
| 37 | c) desplazamiento caudal por el agujero occipital | |

## Otras observaciones
- Las figuras de 16 y 18 se han escrito en `medint_img/` (fuera de `$W`) por indicación expresa del coordinador; los recortes PNG originales siguen en `work/ene2025_q16_rx.png` y `work/ene2025_q18_ecg.png`.
- Ninguna pregunta de desarrollo ni de emparejamiento en este examen.
