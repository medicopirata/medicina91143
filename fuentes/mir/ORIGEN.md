# Repositorio de preguntas MIR

Banco de preguntas oficiales del examen MIR (Medicina) del Ministerio de Sanidad, extraídas de los
cuadernos de examen en PDF y cruzadas con las plantillas definitivas de respuestas. Es la base para
una futura plataforma de estudio: preguntas por tema, simulacros y exámenes por año.

## Estado actual

2.790 preguntas de 13 exámenes (enero 2014 a enero 2026).

| Examen | Convoc. | Versión | Texto | Preguntas | Clave | Anuladas (oficiales) |
|---|---|---|---|---|---|---|
| 2014 | PS 2013 | 0 | HEAD-QA | 227 | HEAD-QA, sin cotejar* | 92, 121, 129, 153, 182, 183, 230, 232 |
| 2015 | PS 2014 | 0 | HEAD-QA | 228 | HEAD-QA, sin cotejar* | 123, 128, 138, 200, 207, 212, 233 |
| 2016 | PS 2015 | 0 | HEAD-QA | 231 | HEAD-QA, sin cotejar* | 36, 61, 189, 205 |
| 2017 | PS 2016 | 0 | HEAD-QA | 232 | HEAD-QA, sin cotejar* | 95, 206, 220 |
| 2018 | PS 2017 | 0 | HEAD-QA | 231 | **SIN CLAVE** | 108, 178, 191, 231 |
| 2019 | PS 2018 | 0 | HEAD-QA | 230 | oficial verificada | 23, 33, 139, 187, 229 |
| 2020 | PS 2019 | 0 | HEAD-QA | 181 | oficial verificada | 10, 33, 55, 174 |
| 2021 | PS 2020 | 4 | HEAD-QA | 183 | oficial verificada | 149, 176 |
| 2022 | PS 2021 | 4 | HEAD-QA | 207 | oficial verificada | 120, 128, 189 |
| 2023 | PS 2022 | 0 | PDF oficial | 210 | oficial definitiva | 15, 40, 128, 138 |
| 2024 | PS 2023 | 0 | PDF oficial | 210 | oficial | 64, 68, 113, 180, 206 |
| 2025 | PS 2024 | 1 | PDF oficial | 210 | oficial | 15, 26, 29, 50, 163, 186 |
| 2026 | PS 2025 | 0 | PDF oficial | 210 | oficial definitiva | 13, 50, 64, 139, 142, 161, 208 |

\* Las anuladas oficiales coinciden exactamente con las que faltan en HEAD-QA y los cambios de
respuesta conocidos cuadran, pero no se ha cotejado la plantilla completa (`clave_verificada: false`).

Huecos y pendientes:
- Faltan los exámenes de 2008 a 2013 (convocatorias PS 2007 a PS 2012).
- 2018: la clave de HEAD-QA no corresponde a la versión 0 del cuaderno → `correcta: null` en todas.
  Además HEAD-QA quitó preguntas válidas (109, 192, 195) y dejó las anuladas 108, 178 y 191.
  Solución: plantilla definitiva v0 + cuaderno PDF oficial.
- 2021 (falta la 147) y 2022 (falta la 126): HEAD-QA eliminó una pregunta válida en lugar de la anulada.
- En los años HEAD-QA hay pequeñas erratas del texto original del dataset; el PDF oficial las resolvería.
- Cuadernillos de imágenes: no incluidos. `imagen` = nº de imagen en el cuadernillo.
- Si se añade el PDF oficial de un año HEAD-QA, `build.py` le da prioridad automáticamente.

**Número de preguntas por época:** 2014–2019: 225 + 10 reserva, 5 opciones hasta 2015 y 4 desde 2016;
2020–2021: 175 + 10; desde 2022: 200 + 10. `reserva: true` marca las de reserva.

## Estructura

```
data/
  preguntas.jsonl        todas las preguntas, una por línea (fuente principal)
  preguntas.csv          lo mismo en CSV (una columna por opción)
  examenes/mir_AAAA.json un archivo por examen, en orden
  resumen.json           recuento por examen, anuladas y fuente de las claves
fuentes/
  pdf/PS<conv>_MIR<año>_v<versión>.pdf   cuadernos originales (tienen prioridad)
  headqa/PS<conv>.json   texto de HEAD-QA v2 (alesi12/head_qa_v2 en Hugging Face)
  headqa/claves_oficiales_PS<conv>.json  cotejo con plantillas oficiales y anuladas
  claves.json            plantillas de respuestas por convocatoria, con fuentes y discrepancias
scripts/
  parse_pdf.py           extrae preguntas del PDF (maqueta a dos columnas)
  build.py               regenera todo data/ a partir de fuentes/
```

## Esquema de cada pregunta

```json
{
  "id": "MIR2024-032",            // MIR<año examen>-<nº de 3 cifras>, único
  "anio_examen": 2024,
  "convocatoria": "2023/24",
  "version_cuaderno": 0,          // la numeración cambia entre versiones; las claves son de esta
  "num": 32,                      // nº en el cuaderno (201-210 = reserva)
  "reserva": false,
  "enunciado": "...",             // texto literal, sin el prefijo "Pregunta asociada a la imagen N."
  "opciones": ["...", "...", "...", "..."],   // en orden; opción 1 = índice 0
  "correcta": 1,                  // 1-5; null si anulada o sin clave
  "anulada": false,
  "imagen": null,                 // nº de imagen del cuadernillo, o null
  "clave_verificada": true,       // false = clave sin cotejar con la plantilla oficial completa
  "pagina_pdf": 8,                // null en años HEAD-QA
  "fuente_texto": "PDF oficial",  // o "HEAD-QA v2"
  "tema": null,                   // pendiente de clasificar
  "subtema": null,
  "notas": null                   // dudas de clave u otras incidencias
}
```

## Cómo añadir un año

1. Copiar el cuaderno a `fuentes/pdf/` con el nombre `PS<convocatoria>_MIR<año examen>_v<versión>.pdf`
   (la versión figura en el pie o cabecera de las páginas interiores: "MEDICINA-0" o "Ver.: 1").
2. Añadir en `fuentes/claves.json` la entrada de esa convocatoria: `version`, `fuente`, `claves`
   (210 enteros; índice 0 = pregunta 1; 0 = anulada). Usar la plantilla **definitiva** de **esa versión**.
3. `pip install pymupdf` y `python3 scripts/build.py`. El script avisa si no salen 210 preguntas o si
   la versión del PDF no coincide con la de las claves.
4. Revisar a mano unas cuantas preguntas al azar contra el PDF, sobre todo si la maqueta es antigua
   (antes de 2015 había 5 opciones y otro formato; puede requerir ajustar `parse_pdf.py`).

## Calidad y dudas conocidas

- Años PDF: texto extraído del cuaderno oficial; se unen las palabras partidas por guion.
- Años HEAD-QA: texto copiado del dataset por bloques con control de fidelidad (sin resúmenes,
  traducciones ni omisiones detectadas); se normalizan espacios múltiples.
- Dudas de clave marcadas en `notas`: MIR2025-208, MIR2026-061, MIR2024-143, MIR2023-108.
- Para la plataforma: filtrar `correcta != null` al puntuar; usar `clave_verificada` si se quiere
  practicar solo con claves cotejadas.

## Próximos pasos previstos

1. Completar 2008-2013, la clave de 2018, los PDF oficiales de 2014-2022 y los cuadernillos de imágenes.
2. Clasificar cada pregunta en `tema`/`subtema` (asignatura y bloque), p. ej. Cardiología > Valvulopatías,
   Fisiología > Renal. Guardar la clasificación en un archivo aparte o en estos campos y documentar la taxonomía.
3. Construir la plataforma: práctica por tema, simulacros cronometrados (200 preguntas, 4 opciones,
   penalización -1/3 por error) y exámenes completos por año.

Idioma de trabajo: español.
