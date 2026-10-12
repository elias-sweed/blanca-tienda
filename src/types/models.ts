export type SyncStatus = 'synced' | 'pending' | 'error'

export interface BaseEntity {
  id: string
  createdAt: string
  updatedAt: string
  syncStatus: SyncStatus
  deleted?: boolean
}

export interface Product extends BaseEntity {
  name: string
  code?: string
  category?: string
  price: number
  cost?: number
  stockMin: number
  active: boolean
}

export interface ProductVariant extends BaseEntity {
  productId: string
  size?: string
  color?: string
  quantity: number
  code?: string
}

export interface Sale extends BaseEntity {
  total: number
  paymentMethod: 'efectivo' | 'yape' | 'plin' | 'tarjeta' | 'otro'
  date: string // YYYY-MM-DD
  note?: string
  registerId?: string
  amountPaid?: number
  change?: number
  /** Venta anulada: se conserva para el histórico pero no cuenta en caja. */
  anulada?: boolean
  anuladaAt?: string
  anuladaMotivo?: string
  /**
   * Identificador generado en la interfaz antes de enviar. Si la persona toca
   * "Confirmar" dos veces o la conexión reintenta, se detecta la repetición y
   * no se cobra ni se descuenta stock dos veces.
   */
  clientRequestId?: string
}

export interface SaleItem extends BaseEntity {
  saleId: string
  variantId: string
  productName: string
  quantity: number
  unitPrice: number
  subtotal: number
}

export type MovementReason = 'entrada' | 'venta' | 'ajuste' | 'devolucion' | 'anulacion' | 'salida'

export interface InventoryMovement extends BaseEntity {
  variantId: string
  productName: string
  reason: MovementReason
  quantity: number // positivo entrada, negativo salida
  note?: string
}

export interface CashRegister extends BaseEntity {
  date: string
  openingAmount: number
  openedAt: string
  closedAt?: string
  status: 'abierta' | 'cerrada'
}

export interface CashClosure extends BaseEntity {
  registerId: string
  date: string
  totalCash: number
  totalYape: number
  totalPlin: number
  totalTarjeta: number
  totalOtro: number
  expectedCash: number
  countedCash: number
  difference: number
}

export type SyncOperation = 'insert' | 'update' | 'delete'

export interface SyncQueueItem {
  id?: number
  table: string
  recordId: string
  operation: SyncOperation
  payload: unknown
  attempts: number
  lastError?: string
  createdAt: string
}

/** Compra al por mayor: solo números ('calculada') o ya comprada ('registrada'). */
export type CompraEstado = 'calculada' | 'registrada'

/** De dónde salió la plata: de la gaveta, de otra plata, o todavía no se paga. */
export type CompraPago = 'gaveta' | 'aparte' | 'no-pagada'

export interface Compra extends BaseEntity {
  productoId: string
  varianteId: string
  /** Copia del nombre al momento de la compra, para que el historial no cambie. */
  nombre: string
  /** Copia de la talla/color, ej. "Talla M · Negro" o "Única". */
  detalleVariante: string
  mayorista: string
  /** Fecha de compra en AAAA-MM-DD. */
  fecha: string
  paquetes: number
  precioPaquete: number
  unidadesPorPaquete: number
  costoTotal: number
  unidadesTotal: number
  costoUnitario: number
  /** Precio de venta por unidad; null si todavía no se decide. */
  precioVenta: number | null
  gananciaUnitaria: number | null
  gananciaTotal: number | null
  estado: CompraEstado
  pago: CompraPago
  /** Si las unidades ya subieron al inventario (solo en 'registrada'). */
  sumadoAlInventario: boolean
}
