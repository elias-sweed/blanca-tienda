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
}

export interface SaleItem extends BaseEntity {
  saleId: string
  variantId: string
  productName: string
  quantity: number
  unitPrice: number
  subtotal: number
}

export type MovementReason = 'entrada' | 'venta' | 'ajuste' | 'devolucion' | 'salida'

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
