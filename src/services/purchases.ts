import { db } from '../lib/db'
import { newId, nowISO } from '../utils/ids'
import { round2 } from '../utils/money'
import { calcularCompra } from '../utils/compra'
import type { Compra, CompraPago } from '../types/models'

export interface CompraInput {
  productoId: string
  varianteId: string
  nombre: string
  detalleVariante: string
  mayorista: string
  fecha: string
  paquetes: number
  precioPaquete: number
  unidadesPorPaquete: number
  /** Precio de venta por unidad; null si todavía no se decide. */
  precioVenta: number | null
}

function validar(input: CompraInput): void {
  if (!input.productoId || !input.varianteId) throw new Error('Elige el producto primero')
  if (!input.nombre.trim()) throw new Error('Elige el producto primero')
  if (!input.mayorista.trim()) throw new Error('Escribe el nombre del mayorista')
  if (!input.fecha.trim()) throw new Error('Elige la fecha de la compra')
  if (!Number.isInteger(input.paquetes) || input.paquetes < 1) {
    throw new Error('Los paquetes deben ser 1 o más')
  }
  if (!Number.isFinite(input.precioPaquete) || input.precioPaquete <= 0) {
    throw new Error('Escribe cuánto cuesta el paquete')
  }
  if (!Number.isInteger(input.unidadesPorPaquete) || input.unidadesPorPaquete < 1) {
    throw new Error('Las unidades por paquete deben ser 1 o más')
  }
  if (input.precioVenta !== null && (!Number.isFinite(input.precioVenta) || input.precioVenta <= 0)) {
    throw new Error('Escribe un precio de venta válido')
  }
}

function armarCompra(input: CompraInput, estado: Compra['estado'], pago: CompraPago, now: string): Compra {
  const calc = calcularCompra({
    precioPaquete: input.precioPaquete,
    unidadesPorPaquete: input.unidadesPorPaquete,
    paquetes: input.paquetes,
    precioVenta: input.precioVenta,
  })
  return {
    id: newId(),
    productoId: input.productoId,
    varianteId: input.varianteId,
    nombre: input.nombre.trim(),
    detalleVariante: input.detalleVariante,
    mayorista: input.mayorista.trim(),
    fecha: input.fecha.trim(),
    paquetes: input.paquetes,
    precioPaquete: round2(input.precioPaquete),
    unidadesPorPaquete: input.unidadesPorPaquete,
    costoTotal: calc.costoTotal,
    unidadesTotal: calc.unidadesTotal,
    costoUnitario: calc.costoUnitario,
    precioVenta: input.precioVenta === null ? null : round2(input.precioVenta),
    gananciaUnitaria: calc.gananciaUnitaria,
    gananciaTotal: calc.gananciaTotal,
    estado,
    pago,
    sumadoAlInventario: estado === 'registrada',
    createdAt: now,
    updatedAt: now,
    syncStatus: 'pending',
  }
}

/**
 * Guarda solo el cálculo: no toca el inventario ni la caja.
 * Para cuando solo quiere probar números sin comprar nada.
 */
export async function guardarCalculo(input: CompraInput): Promise<Compra> {
  validar(input)
  const now = nowISO()
  const compra = armarCompra(input, 'calculada', 'no-pagada', now)
  await db.compras.add(compra)
  return compra
}

/**
 * Registra la compra ya hecha: guarda la compra Y suma las unidades al
 * inventario en la misma transacción, con el movimiento "Compra al por mayor".
 * La plata (gaveta o aparte) queda anotada en la compra; la Caja la leerá.
 */
export async function confirmarCompra(input: CompraInput, pago: CompraPago): Promise<Compra> {
  validar(input)
  const now = nowISO()
  const compra = armarCompra(input, 'registrada', pago, now)

  await db.transaction(
    'rw',
    db.compras,
    db.productVariants,
    db.products,
    db.inventoryMovements,
    async () => {
      const variant = await db.productVariants.get(input.varianteId)
      if (!variant) throw new Error('El producto ya no está en el inventario')
      const product = await db.products.get(variant.productId)
      if (!product || !product.active || product.deleted) {
        throw new Error('El producto ya no está en el inventario')
      }

      await db.compras.add(compra)
      await db.productVariants.update(input.varianteId, {
        quantity: variant.quantity + compra.unidadesTotal,
        updatedAt: now,
        syncStatus: 'pending',
      })
      await db.inventoryMovements.add({
        id: newId(),
        variantId: input.varianteId,
        productName: compra.nombre,
        reason: 'entrada',
        quantity: compra.unidadesTotal,
        note: `Compra al por mayor — ${compra.mayorista}`,
        createdAt: now,
        updatedAt: now,
        syncStatus: 'pending',
      })
    },
  )

  return compra
}

/**
 * Mayoristas que ya usó, del más reciente al más viejo: así la próxima vez
 * solo elige de la lista en vez de escribirlo de nuevo.
 */
export async function listarProveedores(): Promise<string[]> {
  const compras = await db.compras.orderBy('createdAt').reverse().toArray()
  const vistos = new Set<string>()
  const lista: string[] = []
  for (const c of compras) {
    const clave = c.mayorista.trim().toLowerCase()
    if (clave && !vistos.has(clave)) {
      vistos.add(clave)
      lista.push(c.mayorista.trim())
    }
  }
  return lista
}
