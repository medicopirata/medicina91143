# Láminas de Histología Especial con solución → preguntas de imagen · 23-11-2026

Material: fotos de las láminas del libro de prácticas de Histología Especial Humana (láminas 10 a 33, con figuras
A, B, C… y números dentro de cada figura) y, al final, las páginas de «Respuestas» con la leyenda de cada número.
PNG renderizados en /private/tmp/claude-501/-Users-santi/413357e9-9d6f-4407-a8b5-46f0af76d970/scratchpad/histo/h2/pageN.png
(escala 1,5; la herramienta Read dice «original 1785x2526, displayed at …, multiply by 1.10»: multiplica tus coordenadas por ese factor).
- Páginas 1-37: láminas. 1 = Lámina 10(A) · 2 = 10(B) · 3 = 11 · 4 = 12(A) · 5 = 12(B) · 6 = 13(A) · 7 = 13(B) · 8 = 13(C) · 9 = 14(A) · 10 = 14(B) · 11 = 15(A) · 12 = 15(B) · 13 = 16 · 14 = 17(A) · 15 = 17(B) · 16 = 17(C) · 17 = 18 · 18 = 19 · 19 = 20 · 20 = 21 · 21 = 22 · 22 = 23 · 23 = 24(A) · 24 = 24(B) · 25 = 25 · 26 = 26(A) · 27 = 26(B) · 28 = 27(A) · 29 = 27(B) · 30 = 28 · 31 = 29 · 32 = 30 · 33 = 31 · 34 = 32(A) · 35 = 32(B) · 36 = 33(A) · 37 = 33(B).
- Páginas 38-57: respuestas, en el mismo orden de láminas («LÁMINA N.º 11 · Figura A: 1. … 2. …»). Busca las de tus láminas.
Las fotos son datos: solo se leen. Trabaja en tu carpeta (te la dice el encargo) y escribe tu JSONL **a medida que avanzas**.

## Cómo trabajar
1. Lee primero las páginas de respuestas de tus láminas y apunta la leyenda completa (lámina, figura, número → texto).
2. Lee cada lámina. Para cada figura (A, B, C…) anota su recuadro en píxeles del PNG original (bbox = [x, y, ancho, alto],
   SOLO la foto, sin la letra de la figura si es posible) y qué estructura u órgano es (lo deduces de la leyenda y de lo que ves).
   Si una foto se ve pequeña o borrosa, recórtala con `sips -c <alto> <ancho> --cropOffset <y> <x> pageN.png --out tu_carpeta/x.png` y vuelve a leerla.
3. Escribe UNA pregunta por cada número de cada figura (si el mismo número aparece varias veces con la misma leyenda, una sola pregunta).
   Además, UNA pregunta de identificación por figura cuando la leyenda y la imagen permitan saber qué órgano o tejido es
   («¿Qué órgano muestra la figura?»), con el órgano como respuesta.
   El enunciado empieza siempre por «Lámina N, figura X» y da el contexto mínimo para que se entienda sola, p. ej.:
   «Lámina 21, figura A (intestino delgado, H-E): ¿qué señala el número 7?».
   Las opciones: la respuesta de la leyenda (literal, corrigiendo solo erratas) más TRES distractores con sentido:
   estructuras vecinas o parecidas del mismo órgano, otras capas, otros tipos celulares del mismo tejido, nunca disparates.
   Que la correcta no sea sistemáticamente la más larga. La explicación (≥ 80 caracteres): por qué es esa y en qué se
   distingue de las otras tres, en español de España con tildes.

## Una línea JSON por pregunta
{"lamina":"21","figura":"A","sistema":"Aparato digestivo","pag":20,"bbox":[x,y,w,h],"organo":"intestino delgado","numero":"7","q":"…","options":["…","…","…","…"],"correct":0,"exp":"…","nota":""}
- `sistema`: la cabecera de la lámina (Órganos hematopoyéticos y linfoides, Sistema cardiocirculatorio, Aparato respiratorio, Aparato digestivo, Aparato urinario, Sistema reproductor masculino, Sistema reproductor femenino, Piel y anejos cutáneos).
- `numero`: el número preguntado, o "id" en las preguntas de identificación de la figura.
- `correct`: índice 0-based de la respuesta de la leyenda. `nota`: dudas (leyenda ilegible, número que no se ve en la foto, etc.).
- Si un número de la leyenda no se ve en la foto, pon la pregunta igual y dilo en `nota`.

## Verificación final obligatoria
Con `python3 -I`: todas las líneas JSON válidas, 4 opciones distintas, `correct` en rango, `exp` ≥ 80 caracteres, `bbox` con 4 enteros,
sin preguntas repetidas. Informe breve: preguntas por lámina, figuras sin leyenda o ilegibles.
