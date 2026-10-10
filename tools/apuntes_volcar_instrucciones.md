# Volcar los apuntes para el entrenador con IA

El entrenador con IA (`entrenador_ia.js`) lee los apuntes de clase de
`apuntes_txt/<clave>.json`. Ese archivo se genera a partir de los documentos de
Claude donde viven los apuntes; la plataforma no puede leerlos directamente, así
que hay que volcarlos cada vez que cambian.

## Cuándo

- Siempre que se toque un documento de apuntes o se carguen apuntes nuevos en
  una plataforma: el volcado va en el mismo commit que las preguntas.
- Además, una rutina periódica lo repasa por si el documento se ha editado a mano.

## Documentos

| Clave | Plataforma | Documento (id) | Qué exportar |
| --- | --- | --- | --- |
| `anat3` | plataforma_anatomia3.html | c0fe7be5-ed8a-43f6-b5d8-0b580a9a3a98 | la pestaña única |
| `histo21` | plataforma_histologia2.1.html | 68865663-9398-45b9-a1d2-96004cfb4eda | la pestaña de apuntes |
| `fisio1` | plataforma_fisio1.html | 7ba262e3-f1d0-4644-b13e-84d13bdff728 | las pestañas «Tema N · Apuntes» y «Pistas de examen» (no las «Preguntas») |
| `genetica` | plataforma_genetica.html | 1mD1RqkYYhdtwHtrr8T7ey | la pestaña única |

`fisio2`, `histoesp2` y `medint` no tienen todavía documento apuntado aquí:
cuando lo tengan, se añade la fila y se vuelcan igual.

## Cómo

1. Leer el documento con las herramientas de Claude Docs (`read` del doc para
   ver sus pestañas) y exportar cada pestaña en **markdown** (`export`). La
   exportación llega en base64: decodificarla a un `.md` temporal. Si la
   herramienta la devuelve en línea, mejor hacerlo desde un subagente para no
   llenar el contexto.
2. `python3 tools/apuntes_volcar.py <clave> <archivo.md> [más.md…]`
   (los archivos, en el orden de los temas).
3. Si `git diff --stat apuntes_txt/` no muestra cambios de contenido (solo la
   fecha `v`), deshacer con `git checkout apuntes_txt/<clave>.json`: no hay nada
   que publicar.
4. Commit solo de `apuntes_txt/*.json` (nunca `git add -A`) y push a `main`.

El script deja fuera las preguntas, el solucionario y los índices, y no vuelca
imágenes. No hay que tocar nada más: la plataforma pide el archivo sin caché
cada vez que analiza una sesión.
