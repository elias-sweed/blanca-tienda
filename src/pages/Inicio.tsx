import { useLiveQuery } from 'dexie-react-hooks'
import { AppLayout } from '../components/layout/AppLayout'
import { Card } from '../components/ui/Card'
import { db } from '../lib/db'
import { todayISO } from '../utils/ids'

export default function Inicio() {
  const stats = useLiveQuery(async () => {
    const sales = await db.sales.where('date').equals(todayISO()).toArray()
    const items = await db.saleItems.toArray()
    const todaySaleIds = new Set(sales.map((s) => s.id))
    const soldToday = items.filter((i) => todaySaleIds.has(i.saleId)).reduce((s, i) => s + i.quantity, 0)
    const products = await db.products.filter((p) => p.active).toArray()
    const variants = await db.productVariants.toArray()
    let low = 0
    for (const p of products) {
      const qty = variants.filter((v) => v.productId === p.id).reduce((s, v) => s + v.quantity, 0)
      if (qty <= p.stockMin) low++
    }
    return {
      total: sales.reduce((s, x) => s + x.total, 0),
      count: sales.length,
      sold: soldToday,
      low,
    }
  }, [])

  return (
    <AppLayout title="Inicio">
      <h2 className="mb-3 text-lg font-semibold text-gold">Resumen de hoy</h2>
      <div className="flex flex-col gap-3">
        <Card>
          <p className="text-sm text-gray-500">Ventas</p>
          <p className="text-2xl font-bold text-gold">S/ {(stats?.total ?? 0).toFixed(2)}</p>
          <p className="text-sm text-gray-500">{stats?.count ?? 0} ventas registradas</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Productos vendidos</p>
          <p className="text-2xl font-bold text-gold">{stats?.sold ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Productos con poco stock</p>
          <p className="text-2xl font-bold text-gold">{stats?.low ?? 0}</p>
        </Card>
      </div>
    </AppLayout>
  )
}
