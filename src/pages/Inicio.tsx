import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { Card } from '../components/ui/Card'
import { db } from '../lib/db'
import { round2 } from '../utils/money'
import { todayISO } from '../utils/ids'

export default function Inicio() {
  // Igual que en Caja: se envuelve en un objeto para distinguir "cargando" de "no hay caja".
  const openRegister = useLiveQuery(async () => {
    const regs = await db.cashRegisters.where('status').equals('abierta').toArray()
    return { register: regs.sort((a, b) => a.openedAt.localeCompare(b.openedAt))[0] ?? null }
  }, [])

  const register = openRegister?.register

  const cash = useLiveQuery(async () => {
    if (!register) return undefined
    const sales = (await db.sales.where('registerId').equals(register.id).toArray()).filter((s) => !s.anulada)
    const efectivo = round2(sales.filter((s) => s.paymentMethod === 'efectivo').reduce((sum, s) => sum + s.total, 0))
    return { sales: sales.length, efectivo, expected: round2(register.openingAmount + efectivo) }
  }, [register?.id])

  const stats = useLiveQuery(async () => {
    const sales = (await db.sales.where('date').equals(todayISO()).toArray()).filter((s) => !s.anulada)
    const items = await db.saleItems.toArray()
    const todaySaleIds = new Set(sales.map((s) => s.id))
    const soldToday = items.filter((i) => todaySaleIds.has(i.saleId)).reduce((s, i) => s + i.quantity, 0)
    const products = await db.products.filter((p) => p.active && !p.deleted).toArray()
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
      <Link to="/caja" className="mb-4 block">
        <div
          className={`rounded-2xl border p-4 ${
            register
              ? 'border-cta-text/40 bg-cta/15'
              : 'border-danger/40 bg-danger/10'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className={`text-xs font-bold uppercase tracking-wider ${register ? 'text-cta-text' : 'text-danger'}`}>
              {register ? 'Caja abierta' : 'Caja cerrada'}
            </p>
            <span className="text-xs text-fg-mute">Ver caja →</span>
          </div>
          {register ? (
            <>
              <p className="mt-1 text-2xl font-bold text-fg">S/ {(cash?.expected ?? 0).toFixed(2)}</p>
              <p className="text-sm text-fg-mute">
                Efectivo esperado · {cash?.sales ?? 0} {cash?.sales === 1 ? 'venta' : 'ventas'}
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm text-fg-soft">Abre la caja para poder registrar ventas</p>
          )}
        </div>
      </Link>

      <h2 className="mb-3 text-lg font-semibold text-fg">Resumen de hoy</h2>
      <div className="flex flex-col gap-3">
        <Card>
          <p className="text-sm text-fg-mute">Ventas</p>
          <p className="text-2xl font-bold text-ruby-text">S/ {(stats?.total ?? 0).toFixed(2)}</p>
          <p className="text-sm text-fg-mute">{stats?.count ?? 0} ventas registradas</p>
        </Card>
        <Card>
          <p className="text-sm text-fg-mute">Productos vendidos</p>
          <p className="text-2xl font-bold text-accent-text">{stats?.sold ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-fg-mute">Productos con poco stock</p>
          <p className={`text-2xl font-bold ${(stats?.low ?? 0) > 0 ? 'text-danger' : 'text-cta-text'}`}>
            {stats?.low ?? 0}
          </p>
        </Card>
      </div>
    </AppLayout>
  )
}
