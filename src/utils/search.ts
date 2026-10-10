/**
 * Búsqueda difusa (fuzzy search) pura y determinista.
 *
 * Todas las funciones de este módulo son puras: mismas entradas, mismas salidas,
 * sin acceder a la base de datos, al DOM ni al reloj. Eso las hace fáciles de
 * razonar, de probar y de reutilizar en cualquier pantalla.
 *
 * Tolerancia a fallos:
 * - `normalize` es idempotente: aplicarla dos veces da el mismo resultado.
 * - `fuzzyScore` nunca lanza: un texto no string o vacío se descarta sin error.
 */

/** Minúsculas, sin acentos y sin espacios repetidos. Idempotente. */
export function normalize(text: unknown): string {
  if (typeof text !== 'string' || text === '') return ''
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Puntuación de coincidencia entre una consulta y un texto.
 *
 * Devuelve `-1` cuando NO hay coincidencia y un número `>= 0` cuando sí la hay.
 * Cuanto mayor el puntaje, mejor encaja el texto con lo que se buscó.
 *
 * Orden de intentos (de mejor a peor): igualdad exacta, prefijo, subcadena
 * dentro del texto y, por último, subsecuencia difusa ("pnl" encuentra "polo").
 */
export function fuzzyScore(query: unknown, target: unknown): number {
  const q = normalize(query)
  const t = normalize(target)
  if (q === '') return 0
  if (t === '') return -1

  if (t === q) return 1000
  if (t.startsWith(q)) return 800 - Math.min(t.length, 400)
  if (t.includes(q)) return 600 - Math.min(t.length, 400)

  return subsequenceScore(q, t)
}

/**
 * Coincidencia por subsecuencia: la consulta aparece en orden, aunque no seguido.
 * Bonifica letras seguidas y letras que abren una palabra ("pb" → "Polo Básico").
 */
function subsequenceScore(q: string, t: string): number {
  let qi = 0
  let score = 0
  let last = -1

  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] !== q[qi]) continue
    const consecutive = last === ti - 1
    score += consecutive ? 12 : 4
    if (last < 0 || t[last] === ' ') score += 6
    last = ti
    qi++
  }

  if (qi < q.length) return -1
  return Math.max(1, score - (t.length - q.length) * 0.5)
}

/**
 * Filtra y ordena por mejor coincidencia, sin mutar la lista de entrada.
 *
 * @param texts los campos de cada elemento que intervienen en la búsqueda.
 *              Se comparan todos y se conserva el mejor puntaje.
 */
export function rankMatches<T>(
  items: readonly T[],
  query: string,
  texts: (item: T) => readonly string[],
): T[] {
  const term = normalize(query)
  if (term === '') return [...items]

  const scored: { item: T; score: number }[] = []
  for (const item of items) {
    let best = -1
    for (const text of texts(item)) {
      const score = fuzzyScore(term, text)
      if (score > best) best = score
    }
    if (best >= 0) scored.push({ item, score: best })
  }

  scored.sort((a, b) => b.score - a.score)
  return scored.map((entry) => entry.item)
}
