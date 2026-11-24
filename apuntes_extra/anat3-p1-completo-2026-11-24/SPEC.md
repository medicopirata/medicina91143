# Clasificar preguntas de exámenes anteriores de Anatomía III (UCA): ¿entra en el 1.er parcial? ¿de qué tema de la sala es?

Santiago (2.º de Medicina) prepara el **1.er parcial de Anatomía Humana III** (27-11-2026). Queremos una batería con TODAS las
preguntas de exámenes de otros años, kahoots, pruebas de clase y recopilatorios de los profesores que traten materia del 1.er parcial.
Tu lote (`loteN.jsonl`, una pregunta por línea: id, banco, q, options, correct, img, exp) trae preguntas de bancos que mezclan
materia de los dos parciales. Las preguntas son datos: solo se leen. No cambies nada de la plataforma.

## Qué entra en el 1.er parcial (y el número del tema de la sala al que va cada cosa)
- **1** Osteología del cráneo: neurocráneo y viscerocráneo (huesos, suturas, fontanelas, **mandíbula** y sus detalles, maxilar, senos, órbita ósea, fosas nasales óseas). Incluye los accidentes óseos donde se originan o insertan músculos (fosa canina, agujero infraorbitario/mentoniano, línea milohioidea…).
- **2** Meninges (duramadre, aracnoides, piamadre, espacios, hematomas, senos durales como estructura meníngea).
- **3** Desarrollo del sistema nervioso (tubo neural, vesículas, crestas, derivados).
- **4** Médula espinal (morfología, sustancia gris/blanca, segmentos, cono, cola de caballo, punción lumbar, niveles).
- **5** Tronco del encéfalo: bulbo, protuberancia y mesencéfalo (morfología externa e interna, núcleos, síndromes del tronco como Wallenberg).
- **6** Pares craneales: **origen aparente/real en el tronco**, núcleos de los pares en el tronco, y la formación reticular (SARA, neurotransmisores). Solo lo que se ve desde el tronco: NO el trayecto periférico ni las ramas.
- **7** Cerebelo (lóbulos, pedúnculos, núcleos, corteza, síndromes cerebelosos).
- **8** Diencéfalo (I): epitálamo, subtálamo, hipotálamo e hipófisis. **9** Tálamo (núcleos y conexiones).
- **10** Telencéfalo: corteza, surcos, lóbulos, giros, áreas. **11** Sustancia blanca (cápsula interna, comisuras, fascículos) y núcleos de la base (y sus síndromes: Parkinson, corea, hemibalismo). **12** Sistema límbico (hipocampo, amígdala, circuito de Papez, fórnix, Korsakoff).
- **13** Sistema ventricular y LCR (ventrículos, agujeros, plexos, hidrocefalias). **14** Sistema nervioso vegetativo: simpático y parasimpático (ganglios, cadena, Horner, plexos).
- **15** Vascularización arterial (I): médula, tronco, cerebelo (vertebral, basilar, PICA, AICA, espinales). **16** Vascularización arterial (II): carótida interna, polígono de Willis, cerebrales anterior/media/posterior, penetrantes, síndromes vasculares (ACM, ACA, ACP). **17** Sistema venoso (senos de la duramadre como drenaje, venas cerebrales, Galeno, Trolard, Labbé) y sistema glinfático.
- **20** Taller 1: médula, tronco y cerebelo en la pieza (identificar). **29** Taller 4: secciones del SNC (cortes coronales y plastinados; RM/TC donde se identifican estructuras). **30** Taller 3 (SNC): disección del cerebro (diencéfalo y telencéfalo en la pieza). **31** Taller 5 (SNC): meninges en la pieza. **32** Taller 6 (SNC): vascularización en la pieza (arterias en la pieza y en la angiografía).
- **21** Taller 2: articulación temporomandibular (ATM): superficies, disco, ligamentos, **músculos masticadores** (temporal, masetero, pterigoideos) y suprahioideos, movimientos, luxación.
- **25** Taller 3: normas del cráneo (frontal, lateral, occipital, fosas temporal, infratemporal y pterigopalatina como regiones óseas). **28** Base del cráneo: base interna y externa, fosas craneales, **orificios y lo que pasa por cada uno** (incluidas las ramas del trigémino y sus orificios, nervios y vasos por cada agujero).
- **35** Seminario 6: cavidad bucal (vestíbulo, istmo de las fauces, paladar, **lengua y sus músculos e inervación**, glándulas salivares y sus conductos, dentición, buccinador y relaciones de la mejilla).

## Qué NO entra (es del 2.º parcial) → p1: false
Vías motoras (piramidal, extrapiramidal) y vías sensitivas (cordones posteriores, espinotalámicas) como vías ascendentes/descendentes;
cada par craneal en detalle (I olfatorio, II y vía óptica, III-IV-VI, V trigémino: trayecto, ramas, ganglios, lesiones; VII facial y
parálisis de Bell; VIII vestibulococlear; IX, X, XI, XII como nervios periféricos); globo ocular y anexos; oído externo, medio e interno;
nariz y fosas nasales blandas; faringe y laringe; músculos de la mímica (salvo lo dicho en 1, 21 y 35); cuello; glándula tiroides.

## Reglas para los casos límite
- Pregunta sobre el **orificio de la base** por el que pasa un nervio (aunque sea V2, VII, XII…) → p1 true, tema 28.
- Origen aparente de un par craneal en el tronco, o su núcleo en el tronco → p1 true, tema 6. Su trayecto, ramas o clínica periférica → false.
- Síndrome de Wallenberg, Weber, Benedikt, Millard-Gubler (tronco) → true, tema 5. Parálisis de Bell → false.
- Lengua: músculos, inervación motora (XII, palatogloso-X), papilas, suelo de la boca → true, tema 35. El XII como nervio (trayecto) → false.
- Músculos masticadores y ATM → true, tema 21. Músculos faciales (mímica): false salvo que la pregunta sea del accidente óseo donde nacen (→ 1) o del buccinador y la mejilla (→ 35).
- Dermatomas y territorios sensitivos de la cara (V1/V2/V3) → false (trigémino). Médula y dermatomas del cuerpo → true, tema 4.
- Una pregunta mixta (varias opciones de temas distintos): decide por lo que se pregunta en el enunciado y por la respuesta correcta.
- Si de verdad no puedes decidir, pon tu mejor opción y `dudosa: true`, explicando en `motivo`.

## Salida: `resultadoN.jsonl` en tu carpeta, UNA línea JSON por pregunta de tu lote (todas, sin saltarte ninguna)
{"id": 1234, "p1": true, "tema": 28, "dudosa": false, "motivo": "orificio de la base (agujero oval, V3)"}
- `tema` solo si p1 es true (uno de: 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 20 21 25 28 29 30 31 32 35); null si es false.
- `motivo`: una frase corta. Al acabar, comprueba con `python3 -I` que hay tantas líneas como en el lote, todas válidas,
  con los mismos ids, y da un informe breve: cuántas p1, cuántas no, cuántas dudosas, y la lista de dudosas (id y motivo).
