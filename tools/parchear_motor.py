#!/usr/bin/env python3
"""Aplica parches al motor de todas las plataformas a la vez.

El motor es el mismo archivo repetido en cada plataforma, así que cualquier
arreglo hay que llevarlo a las 17. Cada parche se define con un ancla literal
y su sustituto, y se comprueba antes de escribir: si el ancla no aparece, ese
archivo se deja intacto y se avisa; si el sustituto ya está, se salta. Así
volver a ejecutarlo no hace nada.

Parche «repetidas» (15-10-2026)
-------------------------------
La misma pregunta vive a propósito en varios bancos: en su banco temático, en
el banco general y en el del examen de donde salió. Para estudiar por bancos
eso es correcto, pero los modos que juntan toda la plataforma —todas,
vencidas, falladas, marcadas, difíciles, simulacro, tarjetas, sesión del día—
la sacaban dos y tres veces, y la repetición espaciada programaba cada copia
por separado, de modo que el mismo contenido volvía una y otra vez y el
porcentaje de aciertos salía diluido.

Ahora se agrupan por contenido (enunciado, opciones, clave e imagen) y en esos
modos se deja una sola copia de cada grupo: la que ya tenga progreso guardado,
para no perder el historial. Los bancos no se tocan. Y la ⭐ que el motor ya
tenía prevista se enciende, de modo que al estudiar se ve cuándo una pregunta
está repetida en otro cuestionario.

Uso:  python3 tools/parchear_motor.py            # todas
      python3 tools/parchear_motor.py --listar    # solo dice quién necesita qué
      python3 tools/parchear_motor.py plataforma_mir.html [...]
"""
import glob, re, sys

# --- 1. Agrupar repetidas, justo después de construir BY_TOPIC ---------------
ANCLA_INDICE = "function sectionOf(topic) {"
BLOQUE_INDICE = """// ----- Preguntas repetidas en varios bancos -----
// La misma pregunta puede estar en su banco temático, en el banco general y en
// el del examen de donde salió. Se agrupan por contenido para poder dejar una
// sola en los modos que juntan toda la plataforma. La firma se calcula sobre
// ALL_QUESTIONS (las opciones originales) y se consulta por id, porque al
// estudiar las opciones pueden ir mezcladas y entonces no cuadraría.
// Sin tildes y sin puntuación, y las opciones ORDENADAS: la misma pregunta
// aparece a veces con las opciones en otro orden, y entonces hay que
// reconocerla igual. Por eso la clave lleva el TEXTO de la respuesta correcta
// y no su índice, que con las opciones ordenadas no significaría nada.
const _dupNorm = t => (t || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
                               .toLowerCase().replace(/[^0-9a-z]+/g, '');
const _dupFirma = q => [_dupNorm(q.q),
                        (q.options || []).map(_dupNorm).sort().join('|'),
                        _dupNorm((q.options || [])[q.correct]),
                        q.img || ''].join('~');
const DUP_FIRMA = new Map();   // id -> firma
const DUP_GRUPOS = new Map();  // firma -> [ids]
for (const q of ALL_QUESTIONS) {
  const f = _dupFirma(q);
  DUP_FIRMA.set(q.id, f);
  if (!DUP_GRUPOS.has(f)) DUP_GRUPOS.set(f, []);
  DUP_GRUPOS.get(f).push(q.id);
}
for (const [f, ids] of DUP_GRUPOS) if (ids.length < 2) DUP_GRUPOS.delete(f);
const DUP_IDS = new Set();
for (const ids of DUP_GRUPOS.values()) for (const id of ids) DUP_IDS.add(id);

function esRepetida(q) { return DUP_IDS.has(q.id); }

// Deja una copia por grupo: la que tenga más intentos guardados, y si ninguno
// tiene progreso, la primera que aparezca.
function sinRepetidas(qs) {
  if (!DUP_GRUPOS.size) return qs;
  const intentos = id => { const s = State.data.qs[id]; return s && s.a ? s.a : 0; };
  const elegida = new Map();
  for (const q of qs) {
    if (!DUP_IDS.has(q.id)) continue;
    const f = DUP_FIRMA.get(q.id);
    const actual = elegida.get(f);
    if (actual === undefined || intentos(q.id) > intentos(actual)) elegida.set(f, q.id);
  }
  return qs.filter(q => !DUP_IDS.has(q.id) || elegida.get(DUP_FIRMA.get(q.id)) === q.id);
}

function sectionOf(topic) {"""

# --- 2. Aplicarlo en el embudo de todas las sesiones -------------------------
ANCLA_SESION = """  beginSession(questions, mode, opts) {
    if (questions.length === 0) { alert('No hay preguntas disponibles.'); return; }"""
BLOQUE_SESION = """  beginSession(questions, mode, opts) {
    // Al estudiar un banco concreto se respeta lo que tiene; en cualquier modo
    // que junte varios bancos se quita la repetición (ver sinRepetidas).
    if (mode !== 'topic') questions = sinRepetidas(questions);
    if (questions.length === 0) { alert('No hay preguntas disponibles.'); return; }"""

# --- 3. Encender la ⭐ que el motor ya tenía prevista ------------------------
PARCHES_SUELTOS = [
    ("const hasDup = FEATURES.dupStar && topicQs.some(q => q.dup);",
     "const hasDup = FEATURES.dupStar && topicQs.some(q => q.dup || esRepetida(q));"),
    ("document.getElementById('q-dup-star').classList.toggle('hidden', !(FEATURES.dupStar && q.dup));",
     "document.getElementById('q-dup-star').classList.toggle('hidden', "
     "!(FEATURES.dupStar && (q.dup || esRepetida(q))));"),
    ("  dupStar: false,          // ⭐ en las preguntas/bancos marcados con dup",
     "  dupStar: true,           // ⭐ en las preguntas repetidas en otro banco"),
]

PARCHES = [("indice de repetidas", ANCLA_INDICE, BLOQUE_INDICE),
           ("sesiones sin repetir", ANCLA_SESION, BLOQUE_SESION)] + \
          [("⭐ de repetida %d" % i, a, b) for i, (a, b) in enumerate(PARCHES_SUELTOS, 1)]


def main(argv):
    listar = "--listar" in argv
    rutas = [a for a in argv if not a.startswith("--")] or sorted(glob.glob("plataforma_*.html"))
    for ruta in rutas:
        s = open(ruta, encoding="utf-8").read()
        hechos, faltan, ya = [], [], []
        for nombre, ancla, nuevo in PARCHES:
            if nuevo in s:
                ya.append(nombre)
            elif ancla in s:
                if s.count(ancla) != 1:
                    faltan.append("%s (el ancla sale %d veces)" % (nombre, s.count(ancla)))
                    continue
                s = s.replace(ancla, nuevo, 1)
                hechos.append(nombre)
            else:
                faltan.append("%s (sin ancla)" % nombre)
        estado = []
        if hechos:
            estado.append("aplicados %d" % len(hechos))
        if ya:
            estado.append("ya estaban %d" % len(ya))
        if faltan:
            estado.append("NO: " + "; ".join(faltan))
        print("%-30s %s" % (ruta, " · ".join(estado) or "nada que hacer"))
        if hechos and not listar:
            open(ruta, "w", encoding="utf-8").write(s)


if __name__ == "__main__":
    main(sys.argv[1:])
