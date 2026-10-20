import type { BaseEntity } from '../types/models'

export type RegistroLocal = BaseEntity & Record<string, unknown>
export type FilaRemota = Record<string, unknown>

export interface DefinicionTabla {
  /** Nombre de la tabla en IndexedDB (camelCase). */
  local: string
  /** Nombre de la tabla en Supabase (snake_case). */
  remota: string
  aRemoto: (registro: RegistroLocal, userId: string) => FilaRemota
  aLocal: (fila: FilaRemota) => RegistroLocal
}

function iso(valor: unknown): string {
  const fecha =
    typeof valor === 'string' || typeof valor === 'number' ? new Date(valor) : new Date()
  return Number.isNaN(fecha.getTime()) ? new Date().toISOString() : fecha.toISOString()
}

function fechaOpcional(valor: unknown): string | undefined {
  if (typeof valor !== 'string' || !valor) return undefined
  const fecha = new Date(valor)
  return Number.isNaN(fecha.getTime()) ? undefined : fecha.toISOString()
}

function textoOpcional(valor: unknown): string | undefined {
  if (typeof valor !== 'string') return undefined
  const limpio = valor.trim()
  return limpio ? valor : undefined
}

function numero(valor: unknown): number {
  if (typeof valor === 'number' && Number.isFinite(valor)) return valor
  const n = Number(valor)
  return Number.isFinite(n) ? n : 0
}

function numeroOpcional(valor: unknown): number | undefined {
  if (valor === null || valor === undefined || valor === '') return undefined
  const n = Number(valor)
  return Number.isFinite(n) ? n : undefined
}

function numeroONulo(valor: unknown): number | null {
  const n = numeroOpcional(valor)
  return n === undefined ? null : n
}

function baseRemota(registro: RegistroLocal, userId: string): FilaRemota {
  return {
    id: registro.id,
    user_id: userId,
    created_at: registro.createdAt,
    updated_at: registro.updatedAt,
    deleted: Boolean(registro.deleted),
  }
}

function baseLocal(fila: FilaRemota): RegistroLocal {
  return {
    id: typeof fila.id === 'string' ? fila.id : '',
    createdAt: iso(fila.created_at),
    updatedAt: iso(fila.updated_at),
    deleted: fila.deleted === true ? true : undefined,
    syncStatus: 'synced',
  }
}

export const TABLAS: DefinicionTabla[] = [
  {
    local: 'products',
    remota: 'products',
    aRemoto: (r, userId) => ({
      ...baseRemota(r, userId),
      name: r.name ?? '',
      code: textoOpcional(r.code) ?? null,
      category: textoOpcional(r.category) ?? null,
      price: numero(r.price),
      cost: numeroONulo(r.cost),
      stock_min: numero(r.stockMin),
      active: r.active !== false,
    }),
    aLocal: (fila) => ({
      ...baseLocal(fila),
      name: typeof fila.name === 'string' ? fila.name : '',
      code: textoOpcional(fila.code),
      category: textoOpcional(fila.category),
      price: numero(fila.price),
      cost: numeroOpcional(fila.cost),
      stockMin: numero(fila.stock_min),
      active: fila.active !== false,
    }),
  },
  {
    local: 'productVariants',
    remota: 'product_variants',
    aRemoto: (r, userId) => ({
      ...baseRemota(r, userId),
      product_id: r.productId ?? '',
      size: textoOpcional(r.size) ?? null,
      color: textoOpcional(r.color) ?? null,
      quantity: numero(r.quantity),
      code: textoOpcional(r.code) ?? null,
    }),
    aLocal: (fila) => ({
      ...baseLocal(fila),
      productId: typeof fila.product_id === 'string' ? fila.product_id : '',
      size: textoOpcional(fila.size),
      color: textoOpcional(fila.color),
      quantity: numero(fila.quantity),
      code: textoOpcional(fila.code),
    }),
  },
  {
    local: 'inventoryMovements',
    remota: 'inventory_movements',
    aRemoto: (r, userId) => ({
      ...baseRemota(r, userId),
      variant_id: r.variantId ?? '',
      product_name: r.productName ?? '',
      reason: r.reason ?? 'ajuste',
      quantity: numero(r.quantity),
      note: textoOpcional(r.note) ?? null,
    }),
    aLocal: (fila) => ({
      ...baseLocal(fila),
      variantId: typeof fila.variant_id === 'string' ? fila.variant_id : '',
      productName: typeof fila.product_name === 'string' ? fila.product_name : '',
      reason: typeof fila.reason === 'string' ? fila.reason : 'ajuste',
      quantity: numero(fila.quantity),
      note: textoOpcional(fila.note),
    }),
  },
  {
    local: 'cashRegisters',
    remota: 'cash_registers',
    aRemoto: (r, userId) => ({
      ...baseRemota(r, userId),
      date: r.date,
      opening_amount: numero(r.openingAmount),
      opened_at: r.openedAt ?? r.createdAt,
      closed_at: r.closedAt ?? null,
      status: r.status ?? 'abierta',
    }),
    aLocal: (fila) => ({
      ...baseLocal(fila),
      date: typeof fila.date === 'string' ? fila.date : '',
      openingAmount: numero(fila.opening_amount),
      openedAt: iso(fila.opened_at ?? fila.created_at),
      closedAt: fechaOpcional(fila.closed_at),
      status: fila.status === 'cerrada' ? 'cerrada' : 'abierta',
    }),
  },
  {
    local: 'sales',
    remota: 'sales',
    aRemoto: (r, userId) => ({
      ...baseRemota(r, userId),
      total: numero(r.total),
      payment_method: r.paymentMethod ?? 'efectivo',
      date: r.date,
      note: textoOpcional(r.note) ?? null,
      register_id: r.registerId ?? null,
      amount_paid: numeroONulo(r.amountPaid),
      change_amount: numeroONulo(r.change),
      anulada: Boolean(r.anulada),
      anulada_at: r.anuladaAt ?? null,
      anulada_motivo: textoOpcional(r.anuladaMotivo) ?? null,
      client_request_id: r.clientRequestId ?? null,
    }),
    aLocal: (fila) => ({
      ...baseLocal(fila),
      total: numero(fila.total),
      paymentMethod: typeof fila.payment_method === 'string' ? fila.payment_method : 'efectivo',
      date: typeof fila.date === 'string' ? fila.date : '',
      note: textoOpcional(fila.note),
      registerId: textoOpcional(fila.register_id),
      amountPaid: numeroOpcional(fila.amount_paid),
      change: numeroOpcional(fila.change_amount),
      anulada: fila.anulada === true ? true : undefined,
      anuladaAt: fechaOpcional(fila.anulada_at),
      anuladaMotivo: textoOpcional(fila.anulada_motivo),
      clientRequestId: textoOpcional(fila.client_request_id),
    }),
  },
  {
    local: 'saleItems',
    remota: 'sale_items',
    aRemoto: (r, userId) => ({
      ...baseRemota(r, userId),
      sale_id: r.saleId ?? '',
      variant_id: r.variantId ?? '',
      product_name: r.productName ?? '',
      quantity: numero(r.quantity),
      unit_price: numero(r.unitPrice),
      subtotal: numero(r.subtotal),
    }),
    aLocal: (fila) => ({
      ...baseLocal(fila),
      saleId: typeof fila.sale_id === 'string' ? fila.sale_id : '',
      variantId: typeof fila.variant_id === 'string' ? fila.variant_id : '',
      productName: typeof fila.product_name === 'string' ? fila.product_name : '',
      quantity: numero(fila.quantity),
      unitPrice: numero(fila.unit_price),
      subtotal: numero(fila.subtotal),
    }),
  },
  {
    local: 'cashClosures',
    remota: 'cash_closures',
    aRemoto: (r, userId) => ({
      ...baseRemota(r, userId),
      register_id: r.registerId ?? '',
      date: r.date,
      total_cash: numero(r.totalCash),
      total_yape: numero(r.totalYape),
      total_plin: numero(r.totalPlin),
      total_tarjeta: numero(r.totalTarjeta),
      total_otro: numero(r.totalOtro),
      expected_cash: numero(r.expectedCash),
      counted_cash: numero(r.countedCash),
      difference: numero(r.difference),
    }),
    aLocal: (fila) => ({
      ...baseLocal(fila),
      registerId: typeof fila.register_id === 'string' ? fila.register_id : '',
      date: typeof fila.date === 'string' ? fila.date : '',
      totalCash: numero(fila.total_cash),
      totalYape: numero(fila.total_yape),
      totalPlin: numero(fila.total_plin),
      totalTarjeta: numero(fila.total_tarjeta),
      totalOtro: numero(fila.total_otro),
      expectedCash: numero(fila.expected_cash),
      countedCash: numero(fila.counted_cash),
      difference: numero(fila.difference),
    }),
  },
  {
    local: 'compras',
    remota: 'compras',
    aRemoto: (r, userId) => ({
      ...baseRemota(r, userId),
      producto_id: r.productoId ?? '',
      variante_id: r.varianteId ?? '',
      nombre: r.nombre ?? '',
      detalle_variante: r.detalleVariante ?? '',
      mayorista: r.mayorista ?? '',
      fecha: r.fecha,
      paquetes: numero(r.paquetes),
      precio_paquete: numero(r.precioPaquete),
      unidades_por_paquete: numero(r.unidadesPorPaquete),
      costo_total: numero(r.costoTotal),
      unidades_total: numero(r.unidadesTotal),
      costo_unitario: numero(r.costoUnitario),
      precio_venta: numeroONulo(r.precioVenta),
      ganancia_unitaria: numeroONulo(r.gananciaUnitaria),
      ganancia_total: numeroONulo(r.gananciaTotal),
      estado: r.estado ?? 'calculada',
      pago: r.pago ?? 'no-pagada',
      sumado_al_inventario: Boolean(r.sumadoAlInventario),
    }),
    aLocal: (fila) => ({
      ...baseLocal(fila),
      productoId: typeof fila.producto_id === 'string' ? fila.producto_id : '',
      varianteId: typeof fila.variante_id === 'string' ? fila.variante_id : '',
      nombre: typeof fila.nombre === 'string' ? fila.nombre : '',
      detalleVariante: typeof fila.detalle_variante === 'string' ? fila.detalle_variante : '',
      mayorista: typeof fila.mayorista === 'string' ? fila.mayorista : '',
      fecha: typeof fila.fecha === 'string' ? fila.fecha : '',
      paquetes: numero(fila.paquetes),
      precioPaquete: numero(fila.precio_paquete),
      unidadesPorPaquete: numero(fila.unidades_por_paquete),
      costoTotal: numero(fila.costo_total),
      unidadesTotal: numero(fila.unidades_total),
      costoUnitario: numero(fila.costo_unitario),
      precioVenta: numeroONulo(fila.precio_venta),
      gananciaUnitaria: numeroONulo(fila.ganancia_unitaria),
      gananciaTotal: numeroONulo(fila.ganancia_total),
      estado: fila.estado === 'registrada' ? 'registrada' : 'calculada',
      pago:
        fila.pago === 'gaveta' || fila.pago === 'aparte' || fila.pago === 'no-pagada'
          ? fila.pago
          : 'no-pagada',
      sumadoAlInventario: fila.sumado_al_inventario === true,
    }),
  },
]
