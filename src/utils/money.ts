// Redondea a 2 decimales evitando errores de coma flotante (ej. 0.1 + 0.2 = 0.30000000000000004).
export function round2(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.round((n + Number.EPSILON) * 100) / 100
}

export function money(n: number): string {
  return `S/ ${round2(n).toFixed(2)}`
}

/**
 * Convierte lo que el usuario escribió en un número.
 * Acepta "S/ 12,50", "12.50" o 12.5. Devuelve `NaN` si no hay número usable:
 * quien llama decide si eso es un error (cláusula de guarda).
 */
export function parseAmount(raw: string | number | undefined | null): number {
  if (typeof raw === 'number') return Number.isFinite(raw) ? round2(raw) : NaN
  const text = String(raw ?? '').replace(/[^0-9.]/g, '')
  if (text === '') return NaN
  const value = Number(text)
  return Number.isFinite(value) ? round2(value) : NaN
}

/** Suma segura de montos: los valores no numéricos se ignoran, no rompen. */
export function sumMoney(values: readonly number[]): number {
  return round2(values.reduce((sum, value) => (Number.isFinite(value) ? sum + value : sum), 0))
}
