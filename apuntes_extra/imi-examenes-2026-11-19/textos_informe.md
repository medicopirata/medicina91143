# Informe `textos` — seis exámenes con texto extraíble

Transcripción completa en `work/textos_todas.json` (303 preguntas test, campo `doc` para distinguir el examen); cotejos por examen en `work/textos/cotejo_<nombre>.json`. Los parseos previos de `cand/` perdían preguntas y arrastraban texto ajeno: los casos clínicos sueltos se pegaban a la última opción de la pregunta anterior (2010: 11, 37, 51), las líneas de publicidad de Wuolah («1 descarga sin publicidad = 1 coin», «Elimina la publicidad…», los hashes `a64b0469…`) se colaban en opciones (2023, junio 2020) y las opciones «a./b.» de 2020 y Enero 2021 se confundían con la numeración. Se reparseó todo con `work/textos/parse2.py` + `build.py` y se revisó contra el texto y las páginas renderizadas (2010 p. 4-5, 2023 p. 10, 2022 p. 2).

**Resultado global: 303 transcritas · 301 ya estaban · 2 nuevas (ambas de 2010) · 0 descartadas por clave indefendible.** Las «nuevas» que daba el cotejo previo eran en casi todos los casos la misma pregunta que ya está en la plataforma: `cotejar.py` las marcaba NUEVA porque `tiene_opcion` exige los mismos números/negaciones en el enunciado (los casos clínicos de la plataforma llevan otros números en el resumen: «6.º espacio», «185/120», etc.) o porque la opción correcta difería en una errata («50mmHg»/«50 mmHg», «5ºEEII»/«5º EII»). Se comprobaron todas a ojo con `--ver` (ids en cada sección).

---

## 1. `1º Parcial 2010` — PRIMER PARCIAL, 25 de marzo de 2010 (curso 2009/2010) · banco `📝 1er Parcial · Marzo 2010`

- Documento de alumnos con la clave anotada en rojo + negrita (`fuente_clave: "alumno"`). 64 ítems numerados: el 21 es solo el texto del caso de Ataúlfo (sin opciones) y el 16 está **ANULADA** (sin clave) → 62 preguntas test transcritas. La 20 (clase funcional NYHA) no lleva marca de clave en el documento (comprobado en la página renderizada) → `fuente_clave: "ninguna"`; ya está en la plataforma. La 52 pide «estudiar el ECG (ver foto)» que no se reproduce, pero la respuesta (ACxFA) se deduce de la descripción del pulso («FC 130, totalmente irregular en ritmo y en volumen»); ya está en la plataforma (3409, 4286). Casos clínicos (familia del sr. Pepe: 12-19 y 31; Ataúlfo: 22-27; caso sueco: 38-39; varón de 52 años: 52-56) resumidos delante del enunciado.
- Recuento: 62 transcritas · **60 ya estaban** (51 por el cotejo + 9 verificadas a ojo: 12→97002, 13→2421/6605, 14→2422, 24→97009, 52→3409/4286, 53→97018/2446, 54→97019, 55→97020/2447, 56→2448/3316) · **2 nuevas cargadas** (35 y 37) · 1 no transcrita (16, anulada).
- Nuevas:
  - **35** «tacto rectal, utilidad para todos EXCEPTO» — variante de la 2438 (Megabatería, 4 opciones, clave «pancreatitis»); aquí hay 5 opciones y el alumno marca «Todas son ciertas», coherente con la misma lista en 2020 (4643) y 2021 (4740). Cargada con ⚠️ por la redacción contradictoria.
  - **37** indios kuna — variante sin la opción del p53 (128, 5006); el alumno marcaba «Son ciertas solo a y b»; **clave corregida a «Todas son ciertas»** (las tres afirmaciones son ciertas; el Global 2023 da «Todas»).
- Nota sobre la 24: la plataforma (97009, 2429) ha cambiado la opción a) a «…roce pleural, **solo en la espiración**» para que sea falsa; en el documento la opción es «aparece un sonido denominado roce pleural» y es la marcada como «no cierta», lo cual es médicamente indefendible (el roce pleural es el signo de la pleuritis seca). Es la misma pregunta: no se duplica.

### Discrepancias de clave (2010)

| n | id plataforma | Clave del documento (alumno) | Clave de la plataforma | Veredicto |
|---|---|---|---|---|
| 23 | 97008 | e) Valvulopatía, posiblemente una estenosis aórtica | a) Debido a HVI pura | **plataforma** (dudosa): el latido «ligeramente desplazado y mantenido» traduce HVI concéntrica; la EAo es la causa, no lo que expresa el latido. La plataforma ya corrigió la E a sabiendas. |
| 27 | 97012 | d) Son ciertas a y b | e) Todas son ciertas | **dudosa**: el R4 es contracción auricular potente (a) contra un ventrículo rígido (c) con PTD elevada (b); «todas» es más completa, pero dos fuentes de alumnos marcan «a y b». |
| 39 | 97014 | b) Deshidratación y pérdida de electrólitos | c) Pérdida de electrólitos | **plataforma**: Sisinio (cap. 3) atribuye los calambres por calor a la pérdida de sodio con reposición solo de agua. |
| 40 | 2442 | e) Todas son ciertas | a) Hipovolemia | **dudosa**: Sisinio define el agotamiento por calor por depleción de líquidos/hipovolemia (afectación del SNC = golpe de calor), pero varias recopilaciones de alumnos dan «todas». |
| 42 | 3263 | a) Respiración de Kussmaul | c) Respiración de Cheyne-Stokes | **plataforma**: respiración creciente hasta un acmé y caída brusca = Cheyne-Stokes; el alumno se equivoca. |
| 46 | 2443 | d) Pulso femoral | a) Pulso radial | **dudosa**: el pulso alternante se detecta con el esfigmomanómetro y en arterias periféricas; Bates/Argente admiten radial o femoral. |
| 49 | 4594 | c) Del funcionamiento de las colaterales | d) Todas son ciertas | **documento (probable)**: el alumno de 2010 y el del examen Patología 2020 (n.º 50, misma pregunta) marcan los dos «colaterales»; el profesor parece dar ese factor como el determinante del cuadro clínico. Vale la pena revisar 4594. |
| 51 | 6475 | c) En el abdomen… peristaltismo | c) (mismo texto con «e indica») | misma clave (falso positivo por redacción). |
| 63 | 97024 | d) All questions are correct | e) Only correct a and c | **dudosa (lean documento)**: las tres frases (líneas B de Kerley, corazón moderadamente agrandado, salida de líquido cuando la presión capilar supera los 25 mmHg) proceden del mismo párrafo de Harrison sobre el edema intersticial cardiogénico. |
| 64 | 97025 | b) Mitral valve stenosis | d) Calcific aortic stenosis | **plataforma**: síncopes + VI prominente aislado en una mujer de 72 años = estenosis aórtica calcificada. |

---

## 2. `Global 2023` — EXAMEN IMI SEPTIEMBRE 2023 · banco `📝 2023 · Global Septiembre`

- Documento de Wuolah con clave en negrita (`fuente_clave: "alumno"`). 70 preguntas, todas transcritas sin la basura de los anuncios. La 49 (alcalosis respiratoria) no lleva negrita → `fuente_clave: "ninguna"`; ya está en la plataforma.
- Recuento: 70 transcritas · **70 ya estaban** (69 por cotejo + la 44 «Zaraelustra» = 5018/5045, verificada a ojo) · **0 nuevas**. Las «11 nuevas» del cotejo previo eran texto de publicidad pegado a las opciones.

### Discrepancias de clave (2023)

| n | id | Clave del documento (alumno) | Clave de la plataforma | Veredicto |
|---|---|---|---|---|
| 1 | 4982 | a) La primera consecuencia es la vasoconstricción cutánea | «Son ciertas A y C» (la plataforma tiene otra lista: su e) es «A y C», aquí es «Todas son ciertas») | **dudosa / distinta lista de opciones**: con las opciones del documento (vasoconstricción y escalofrío ciertas, sin opción «a y b»), la a) es defendible como «primera consecuencia». No se ha duplicado porque el cotejo la da por existente. |
| 5 | 4986 | d) Hay aumento del volumen sistólico (como incorrecta) | c) Asciende la PAD como compensación | **plataforma**: en la IAo el volumen sistólico total aumenta y la PAD desciende. |
| 14 | 4509 | c) Grey-Turner + Cullen | mismo texto | misma clave (falso positivo). |
| 15 | 4995 | c) Todas son ciertas | a) Contracción auricular potente contra ventrículo rígido | **plataforma**: la d) («cuando no hay FA no puede producirse») es falsa, luego no pueden ser todas. |
| 17 | 4997 | c) Fracción de la dosis inicial disponible para la absorción | a) Ninguna es cierta | **plataforma (dudosa)**: la c) define la biodisponibilidad; la dosis efectiva es la que alcanza el órgano diana. |
| 22 | 5002 | e) Una disminución de insulina | b) ↑ contrarreguladoras + ↓ insulina | **plataforma**: la cetoacidosis exige las dos cosas; la e) es incompleta. |
| 31 | 4849 | b) neumocito tipo II «en el alveolo» | «neumocito tipo II que está elevado» | misma clave (variante de redacción). |
| 60 | 5034 | b) Hay un componente ferropénico | a) Todas son ciertas | **plataforma (dudosa)**: pérdida urinaria de transferrina y EPO + componente hipoplásico («hipotásico» es errata). |
| 64 | 5038 | b) Remodelado → HVI concéntrica | mismo texto | misma clave. |
| 67 | 5040 | d) Temblor postural | c) Todas son ciertas | **plataforma (dudosa)**: inversión del sueño, agitación, desorientación y flapping forman parte del cuadro. |
| 69 | 5042 | d) …«siempre secundario a alteración de la perfusión» | b) deterioro glomerular y tubular sin enfermedad glomerular/intersticial/vascular/obstructiva | **plataforma**: la NTA también es nefrotóxica; el «siempre» la hace falsa. |

---

## 3. `Primer parcial junio 2022` — EXAMEN PRIMER PARCIAL JUNIO 2022 · banco `📝 2022 · 1er parcial Junio (plantilla oficial)`

- Clave en negrita (`fuente_clave: "alumno"`). 60 preguntas transcritas. La **11** tiene en negrita d) y e) (comprobado en la página): se toma d) (neumocito tipo II, la incorrecta) y se anota. La **53** (WPW) solo tiene 4 opciones en el documento.
- Recuento: 60 transcritas · **60 ya estaban** (57 por cotejo + 3 verificadas a ojo: 2 Parménides = 4840, 50 hipotensión = 4886, 57 latido de punta = 4893; mismas opciones y misma clave, solo erratas) · **0 nuevas**.

### Discrepancias de clave (2022)

| n | id | Clave del documento (alumno) | Clave de la plataforma | Veredicto |
|---|---|---|---|---|
| 3 | 4841 | e) Todas son ciertas | a) La hepatomegalia congestiva | **plataforma**: ni la congestión pulmonar ni la disnea producen dolor epigástrico. |
| 7 | 4845 | d) trombos auriculares + FA | mismo texto | misma clave. |
| 13 | 4851 | e) La reentrada funcional carece de límites anatómicos (como incorrecta) | b) «…estas fibras pueden excitarse antes de que se extinga el impulso» | **plataforma (dudosa)**: la plataforma lo resolvió con los apuntes y coincide con los globales de 2023 y 2025; la e) es cierta (la reentrada funcional no tiene sustrato anatómico fijo). |
| 20 | 4858 | b) IL-8 quimiotáctica (como incorrecta) | e) «Una proteasa como la alfa-1-antitripsina…» | **plataforma**: la A1AT es una antiproteasa; la IL-8 sí es quimiotáctica de neutrófilos. |
| 35 | 4530 | d) Sobrecarga de volumen del VI | e) Ninguna es cierta | **dudosa**: el mecanismo principal es la caída de la presión diastólica aórtica (perfusión coronaria), que no figura entre las opciones; la sobrecarga de volumen (↑ consumo de O2) es contribuyente y es la única opción con base fisiopatológica. |
| 39 | 4876 | b) patrón que termina en ICI (como excepción) | mismo texto | misma clave. |
| 49 | 4885 | e) Todas son ciertas | d) Son ciertas b y c | **plataforma**: el vestibular es el receptor; el efector es el sistema vegetativo. |

---

## 4. `1º Parcial junio 2020` · banco `📝 2020 · 1er parcial Junio`

- Wuolah, sin clave (`fuente_clave: "ninguna"`). 47 ítems: los 43-47 no son preguntas test (son respuestas sueltas anotadas por el alumno: «signo de Musset: oscilación de la cabeza», «ritmo sinusal 0,12-0,20 VERDADERO», acantosis nigricans, haz de Kent, tapones de Dietrich) → no se transcriben. La 34 tiene 4 opciones.
- Recuento: 42 transcritas · **42 ya estaban** (todas con sim ≥ 0,8) · **0 nuevas**. Las 4 «nuevas» con sim ≈ 0,5 del cotejo previo se debían a que el parser pegaba el hash de Wuolah y «Elimina la publicidad…» a la última opción de las preguntas 7, 13, 19, 26, 32 y 38; limpias, todas coinciden con preguntas existentes (bancos 📝 2020 · 1er parcial Junio, Daypo, Moodle y Megabatería).
- Sin claves que cotejar → sin tabla de discrepancias.

---

## 5a. `2020` — EXAMEN PATOLOGÍA CURSO 2020 (solo tipo test) · banco `📝 2020 · Examen Patología`

- Clave en negrita (`fuente_clave: "alumno"`). 60 ítems: 34 test transcritos (incluidas las de 2-3 opciones: 1 «temperatura de hipotensión», 2 Verdadero/Falso; y la 13 y la 54 con 6 y 4 opciones). No transcritos (26): desarrollo/respuesta corta 6, 7, 17, 42, 46, 47, 53, 56, 59, 60; emparejamientos 9, 18, 19, 21, 24, 25, 31, 39, 43, 44, 52, 58 (los lleva otro ayudante); sin enunciado 3, 15, 51; con foto que no existe 14. Sin clave en el documento (`"ninguna"`): 20, 32, 49.
- Recuento: 34 transcritas · **34 ya estaban** · **0 nuevas**.

### Discrepancias de clave (2020)

| n | id | Clave del documento (alumno) | Clave de la plataforma | Veredicto |
|---|---|---|---|---|
| 2 | 4642 | b) Falso | a) Verdadero | **plataforma (dudosa)**: Sisinio y la diapositiva de EPOC citan factores endógenos (α1-AT, polimorfismos TNF-α); para la bronquitis crónica «pura» el profesor pudo decir que no. |
| 10 | 3298 | b) TEP: alta incidencia, grave, alto coste | mismo texto | misma clave. |
| 28 | 4664 | a) La endocarditis es rara en la EM pura (como falsa) | c) Intervalo libre ≈ 40 años | **plataforma**: el intervalo libre es de 15-20 años; la endocarditis sí es rara en la EM pura. |
| 33 | 4619 | d) Irritabilidad miocárdica | a) Disminución del mecanismo de despolarización | **dudosa**: por debajo de 32 °C hay depresión (bradicardia, onda J) y también irritabilidad con riesgo de FV por debajo de 28-30 °C; dos exámenes de alumnos (2020, junio 2020 sin clave) la preguntan igual. |
| 36 | 4670 | e) Aterosclerosis que impide el suministro de O2 | mismo texto | misma clave. |
| 37 | 5962 | a) Pérdida de tejido muscular y elástico | d) Todas son ciertas | **plataforma (dudosa)**: dilatación irreversible + inflamación persistente + destrucción muscular/elástica; las tres son ciertas. |
| 50 | 4594 | e) Del funcionamiento de las colaterales | d) Todas son ciertas | **documento (probable)**: coincide con la clave del alumno de 2010 (n.º 49). Ver tabla de 2010. |
| 55 | 4679 | e) No tiene ninguna finalidad | b) Un soplo traqueal, que es fisiológico | **plataforma**: sobre el manubrio se oye la respiración traqueal fisiológica. |

## 5b. `Enero 2021` — EXAMEN PATOLOGÍA ENERO 2021 (solo tipo test) · banco `📝 2021 · Enero`

- Sin clave (`fuente_clave: "ninguna"`). 60 ítems: 36 test; se excluye la **29** (Buenaventura: exige valorar un ECG que no viene) → 35 transcritas. No transcritos (24): emparejamientos 2, 3, 7, 13, 15, 20, 25, 26, 27, 28, 32, 35, 42, 54; desarrollo 9, 10, 14, 16, 22, 33, 55, 59; fotos inexistentes 23, 38. La 47 tiene 6 opciones.
- Recuento: 35 transcritas · **35 ya estaban** (bancos 📝 2021 · Enero, 📝 2020 · Examen Patología, Daypo y Megabatería; sim ≥ 0,8) · **0 nuevas**. Sin claves → sin discrepancias.

---

## Dudas y avisos

- La plataforma ya contenía estos seis exámenes casi íntegros (bancos 📝 con `n` del documento); el trabajo útil es la tabla de discrepancias. Las que recomiendo revisar en la plataforma: **4594** (isquemia aguda de extremidades: dos alumnos independientes marcan «colaterales»), **97024** (edema intersticial), 2443 (pulso alternante) y 4982 (frío: la lista de opciones del documento es distinta).
- `out/textos.json` contiene solo 2 preguntas (2010 n.º 35 y 37), ambas variantes reales (opciones distintas) de preguntas existentes.
- Cotejo: `cotejar.py` infravalora preguntas de caso clínico (los números del resumen del caso entran en `tiene_opcion`), por lo que conviene mirar a ojo las NUEVA con `parecida` aunque la sim sea baja.
