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

export { db }
