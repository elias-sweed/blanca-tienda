import Dexie, { type EntityTable } from 'dexie'
import type {
  Product,
  ProductVariant,
  Sale,
  SaleItem,
  InventoryMovement,
  CashRegister,
  CashClosure,
  SyncQueueItem,
} from '../types/models'

const db = new Dexie('tienda-blanca') as Dexie & {
  products: EntityTable<Product, 'id'>
  productVariants: EntityTable<ProductVariant, 'id'>
  sales: EntityTable<Sale, 'id'>
  saleItems: EntityTable<SaleItem, 'id'>
  inventoryMovements: EntityTable<InventoryMovement, 'id'>
  cashRegisters: EntityTable<CashRegister, 'id'>
  cashClosures: EntityTable<CashClosure, 'id'>
  syncQueue: EntityTable<SyncQueueItem, 'id'>
}

db.version(1).stores({
  products: 'id, name, category, active, syncStatus',
  productVariants: 'id, productId, syncStatus',
  sales: 'id, date, paymentMethod, syncStatus',
  saleItems: 'id, saleId, variantId',
  inventoryMovements: 'id, variantId, reason, createdAt',
  cashRegisters: 'id, date, status',
  cashClosures: 'id, registerId, date',
  syncQueue: '++id, table, recordId, createdAt',
})

// v2: índice en sales.registerId. Sin él, `where('registerId')` lanza
// SchemaError y el módulo Caja no puede leer las ventas de la caja abierta.
// Migración aditiva: solo crea el índice, no modifica ni borra datos.
db.version(2).stores({
  sales: 'id, date, paymentMethod, syncStatus, registerId',
})

// v3: campo `anulada` en sales, usado por Historial para anular una venta.
// Los índices no cambian; Dexie solo actualiza el esquema interno.
db.version(3).stores({
  sales: 'id, date, paymentMethod, syncStatus, registerId, anulada',
})

export { db }
