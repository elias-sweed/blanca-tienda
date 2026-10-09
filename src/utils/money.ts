// Redondea a 2 decimales evitando errores de coma flotante (ej. 0.1 + 0.2 = 0.30000000000000004).
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

export function money(n: number): string {
  return `S/ ${n.toFixed(2)}`
}
