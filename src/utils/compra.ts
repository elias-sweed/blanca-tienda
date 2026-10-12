import { round2 } from './money'

/**
 * Cálculos puros de una compra al por mayor (sin base de datos ni pantalla).
 *
 * Todo en soles, con palabras simples:
 * - costoUnitario: lo que te cuesta cada unidad (precio del paquete ÷ unidades).
 * - gananciaUnitaria: lo que ganas por cada unidad (venta − costo).
 * - gananciaTotal: lo que ganas si vendes todo (ganancia × unidades).
 *
 * Sin porcentajes ni palabras técnicas: el veredicto solo mira la plata.
 */

export type VeredictoCompra = 'conviene' | 'sin-ganancia' | 'incompleto'

export interface CalculoCompra {
  costoTotal: number
  unidadesTotal: number
  costoUnitario: number
  gananciaUnitaria: number | null
  gananciaTotal: number | null
  veredicto: VeredictoCompra
}

export function calcularCompra(datos: {
  precioPaquete: number
  unidadesPorPaquete: number
  paquetes: number
  /** Precio de venta por unidad; null si todavía no se decide. */
  precioVenta: number | null
}): CalculoCompra {
  const costoTotal = round2(datos.precioPaquete * datos.paquetes)
  const unidadesTotal = datos.unidadesPorPaquete * datos.paquetes
  const costoUnitario = round2(datos.precioPaquete / datos.unidadesPorPaquete)

  if (datos.precioVenta === null) {
    return { costoTotal, unidadesTotal, costoUnitario, gananciaUnitaria: null, gananciaTotal: null, veredicto: 'incompleto' }
  }

  const gananciaUnitaria = round2(datos.precioVenta - costoUnitario)
  const gananciaTotal = round2(gananciaUnitaria * unidadesTotal)
  return {
    costoTotal,
    unidadesTotal,
    costoUnitario,
    gananciaUnitaria,
    gananciaTotal,
    veredicto: gananciaUnitaria > 0 ? 'conviene' : 'sin-ganancia',
  }
}

/** "2026-10-12" → "12/10/2026": fecha corta para leer de un vistazo. */
export function formatearFechaCorta(fecha: string): string {
  const partes = fecha.split('-')
  if (partes.length !== 3) return fecha
  return `${partes[2]}/${partes[1]}/${partes[0]}`
}
