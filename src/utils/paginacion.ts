/** Cuántos elementos se muestran por página en Inventario e Historial. */
export const POR_PAGINA = 10

/** Recorta la lista a la página pedida (sin mutar la original). */
export function paginar<T>(lista: readonly T[], pagina: number): T[] {
  const inicio = (Math.max(1, pagina) - 1) * POR_PAGINA
  return lista.slice(inicio, inicio + POR_PAGINA)
}

/** Cuántas páginas hacen falta para `total` elementos (mínimo 1). */
export function calcularPaginas(total: number): number {
  return Math.max(1, Math.ceil(total / POR_PAGINA))
}
