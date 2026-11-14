# Estrategia de entrenamiento del tutor (estado a 14-11-2026)

Plataformas de estudio tipo test para un estudiante de 2.º de Medicina (UCA). Todo corre en el navegador
(JavaScript, sin servidor). El avance se guarda por pregunta en `State.data.qs[id]` y se sincroniza.
Hay tres capas: **el entrenador** (elige pregunta a pregunta, código determinista: `entrenador.js`),
**el plan de examen** (estrategia hasta el examen: `plan_examen.js`) y **la IA** (Claude por API, solo
para analizar, explicar, escribir preguntas y revisar la estrategia: `entrenador_ia.js`). La IA NO elige
qué pregunta sale: eso es el algoritmo de abajo.

## 1. Qué se mide de cada pregunta

Cada respuesta guarda: acierto/fallo, seguridad declarada (1 seguro, 2 con dudas, 3 adivinando),
segundos y motivo del fallo. Con eso, «cuánto la sabe» k ∈ [0,1] (null = no vista):

- fallada la última vez → 0
- acertada: seguro 1 · sin indicar 0,8 · con dudas 0,6 · adivinando 0,3
- −0,1 si tardó más del doble de su mediana · −0,15 si la ha fallado más veces de las que la acertó
- ×0,75 si ya le tocaba repaso · mínimo 0,05

Estado de un tema (banco): **sabido** si ha visto ≥ min(n, máx(8, 50 %)), dominio medio ≥ 0,85 y fallos ≤ 5 %;
**flojo** si ha visto ≥ 4 y dominio < 0,55; si no, **en marcha**; sin ver, **nuevo**.

## 2. Calendario de repasos

SM-2 del motor (intervalo y factor de facilidad por pregunta) con correcciones por seguridad:
acierto adivinando → vuelve mañana · acierto con dudas → 2 → 3 → 5 días como mucho (antes volvía a 1 o 3 días
siempre y las dudas se acumulaban) · segura a la primera → 3 días (y rápida, 4) · fallo yendo seguro → factor de
facilidad −0,15 (error de concepto) · fallo → vuelve hoy.
**Aparcadas:** una vencida de poco peso (< 1,5) que lleva más de 7 días vencida y no está fallada se aparca
hasta después del examen: no cuenta como pendiente y solo sale si no hay otra cosa.

## 3. Cuánto vale cada pregunta (origen)

Se deduce del nombre del banco y de marcas en la explicación. Peso por origen (el usuario lo cambia):

| Origen | Por defecto | Anatomía 3 |
|---|---|---|
| 📝 Examen de otros años (+0,75 por cada convocatoria más en que se repite, tope +3) | 3 | 4 |
| 🔴 El profesor dijo que cae | 3 | 3,5 |
| 📌 Sacadas de sus pistas | 2 | 3 |
| 🧩 Tareas y guiones de los talleres | 2 | 3 |
| 🎯 Las da el profesor (clase, Kahoot, campus, ⭐ imágenes de sus presentaciones) | 2,5 | 2,5 |
| 📚 Recopilaciones sin convocatoria | 1,8 | 1,8 |
| 📓 Resto de apuntes de clase | 1,3 | 1 |
| 🏋️ Bancos de entrenamiento | 1 | 0,7 |
| 🤖 Escritas por Claude (refuerzo) | 0,6 | 0,4 |
| 🧠 A su medida (IA) | 1,2 | 1,2 |

Lo que no entra en lo que se prepara (p. ej. el otro parcial) pesa 0 y no sale. En el entrenador el
peso se convierte en factor = 0,55 + 0,45·peso.

## 4. El plan hasta el examen

- **Fases por días que quedan:** >21 cobertura · 8–21 consolidación · ≤7 repaso final.
  Reparto de cada sesión (nuevas / repaso / fallos): cobertura 50/32/18 · consolidación 22/46/32 ·
  final 8/50/42 · si aún falta ver lo importante pasada la cobertura, 40/36/24.
- **Nuevas al día:** en cobertura, mín(todas las sin ver ÷ días de cobertura, máx(importantes sin ver ÷
  días de cobertura, 60)). Pasada la cobertura, importantes sin ver ÷ (días − 2), con tope 80. Los dos
  últimos días, 0. («Importante» = peso ≥ 2.)
- **Reparto por semanas:** los temas con preguntas sin ver, ordenados: primero lo dado en clase, luego el
  resto, al final los bancos que mezclan temas; dentro, por lo que queda por ganar
  (peso − peso·k, ×1,5 si dado en clase, ×0,4 si mezcla); dentro de lo dado, van primero los bancos del tema
  que la sala de estudio tiene como siguiente o a medias (plan y sala dicen lo mismo). Se llenan las semanas
  con la capacidad diaria.
  Los bancos de imágenes de un tema cuentan con su tema. En consolidación, foco en los 5 temas flojos.
- **Memoria:** una foto diaria (preparación ponderada, cobertura, preguntas de examen dominadas) y las
  confusiones que diagnosticó la IA, con si desde entonces las acierta o las vuelve a fallar.

## 5. El entrenador: cómo elige la siguiente pregunta

Puntúa todas las preguntas candidatas y saca la de más puntos (con ±15 % de azar):

- **Nueva:** tema flojo 1,8 · en marcha 2,2 · sabido 0,3 · sin empezar 1,2; +1 si el tema lo ha trabajado
  en los últimos 7 días; +0,8 apuntes de clase, +0,6 ⭐ imágenes; ×0,15 si el tema ya se cerró hoy;
  +2 si la escribió la IA para una confusión suya; +1,2 si es tema de la semana del plan.
- **Fallada:** 3 (3,6 si la falló yendo seguro).
- **Vencida:** 3 + mín(1,5; 0,2 × días de atraso) + (1 − k).
- **Acertada adivinando sin vencer:** 1,2 · **mantenimiento:** 0,05.
- Todo × factor de origen.
- **Tras un fallo:** dejando una por medio, otra de la batería sobre la misma idea (+4 + 5·parecido
  léxico con la fallada).
- **Segundo fallo en un tema con ≥50 % de fallos:** el tema «no se controla» → 3 preguntas de su batería
  espaciadas (+5 + 4·parecido), la IA hace un esquema de la confusión, y no se insiste más hoy;
  al final propone un específico.
- **4 aciertos seguros seguidos en un tema:** se cierra por hoy.
- **Variedad:** ×0,3 si el tema salió en las dos anteriores · ×0,2 si el tema ya lleva el 20 % de la
  sesión · si una clase (nueva/repaso/fallo) va 8 puntos por encima de su cuota ×0,35, 12 por debajo ×1,7.
- La misma pregunta (mismo enunciado y respuesta en otro banco) no sale dos veces en una sesión.
- Como mucho la mitad de la sesión con imagen (a partir de la 5.ª, las de imagen ×0,3 si ya son más de la mitad).
- Tras cada respuesta se vuelve a decidir todo lo que queda por delante.

## 6. Sesión completa de hoy (botón 🏁)

No tiene largo fijo: sigue mientras queden las nuevas que pide el plan hoy, los repasos vencidos
(tope diario máx(60, 2 × nuevas que pide el plan), descontando los repasos ya hechos hoy; los más atrasados y
que más pesan primero) y lo que haya por consolidar
(tras un fallo, otra de la idea hasta acertarla sin adivinar; en un tema flojo, de su batería hasta
2 aciertos seguidos, máx. 8). Siempre 8 preparadas por delante. Al acabar: rondas con las falladas de
la sesión hasta acertarlas todas; después, opción «➕ un poco más» (15 nuevas). «⏪ Hoy + lo atrasado»
añade las nuevas que el plan pidió en los 7 días anteriores y no se hicieron (tope 3 días de cupo) y
todos los repasos vencidos.

## 7. La IA (Claude por API, modelo elegible; por defecto claude-opus-5-5)

- **Al acabar cada sesión:** recibe lo fallado, adivinado o dudado (opción elegida, seguridad, tiempo,
  motivo, origen), los apartados de sus apuntes más cercanos, otras preguntas del tema, 5 preguntas reales
  de examen como estilo y la memoria (plan, pesos, confusiones previas). Devuelve diagnóstico agrupado por
  confusión y priorizado (examen > lo que el profesor dijo que cae > resto), con cita de los apuntes,
  regla para memorizar y esquema; hasta 12 preguntas nuevas que atacan la confusión desde otro ángulo; y
  un consejo. Las preguntas solo se guardan si tienen 4 opciones, explicación ≥ 60 caracteres y no
  repiten otra existente.
- **Estrategia semanal:** con el plan, la foto diaria y las confusiones, propone semanas, prioridades,
  alertas y qué hacer hoy; se revisa sola una vez por semana o al cambiar de fase.
- **«✍️ O plantea otra cosa»:** el estudiante pide una sesión en lenguaje natural; la IA reúne bancos y
  preguntas existentes y escribe las que falten.
- **Reglas:** solo hechos de los apuntes (mandan sobre cualquier otra fuente); nada que necesite ver una
  imagen; cada pregunta se entiende sola («📋 Caso: …» si necesita datos); solo materia de lo que se
  prepara. En Anatomía 3, nada de lo marcado 🤖 / «Nota de Claude»: solo lo que dijo el profesor.
- **Sala de estudio:** lectura guiada por temas; lo que lee y comprueba allí cuenta como día de estudio y
  la IA lo sabe (temas estudiados, a medias, por repasar).

## 8. Contadores (qué cuenta cada número)

- **Arriba de la pregunta, «n / total»:** en la sesión completa, el total del día (nuevas + repasos con tope +
  lo que haya por consolidar); nunca baja, solo sube si hay fallos que consolidar. La barra lateral solo
  enseña las preparadas (8 por delante), no el total.
- **«Sesión del día» y «Repaso vencido» (portada del motor):** si se prepara un parcial, vencidas y nuevas
  solo de él, con las del resto aparte.
- **Botón «Entrenador», plan («Hoy: …») y «🏁 Sesión completa»:** la misma cifra de repasos pendientes (lo que
  el plan pesa > 0, sin aparcadas); la completa aplica el tope diario y dice cuántos quedan para «⏪».
- **«Nuevas hoy: hechas / pide el plan»:** las nuevas de hoy, con la media de 14 días al lado.

## 9. Puntos débiles conocidos

1. Los repasos vencidos pueden seguir creciendo si no se hace la sesión completa a diario (los adivinados
   vuelven a 1 día; las dudas, a 2-5; lo de poco peso se aparca a los 7 días).
2. Los pesos de Anatomía están escalonados a mano (4 / 3,5 / 3 / 2,5…), sin medir con datos reales qué
   reparto da más nota.
3. Los números (puntos, cuotas, umbrales) están puestos a mano, no calibrados con datos reales.
4. El tema de una pregunta de un banco mezclado y el parcial al que pertenece se deducen por vocabulario
   y por reglas de nombres de banco: pueden equivocarse.
5. No hay modelo de olvido propio más allá de SM-2, ni se usa la curva real de aciertos del estudiante
   para decidir intervalos.
