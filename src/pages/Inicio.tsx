import { Link } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { Card } from '../components/ui/Card'
import { ErrorState } from '../components/ui/ErrorState'
import { LoadingState } from '../components/ui/LoadingState'
import { LowStockAlert } from '../components/ui/LowStockAlert'
import { useLowStock } from '../hooks/useLowStock'
import { useQueryState } from '../hooks/useQueryState'
import { db } from '../lib/db'
import { todayISO } from '../utils/ids'
import { round2 } from '../utils/money'

export default function Inicio() {
  // Cada consulta declara sus 3 estados (cargando / listo / error). Así la
  // pantalla nunca se queda en blanco ni parece congelada si algo falla.
  const [cashState, cashRetry] = useQueryState(async () => {
    const regs = await db.cashRegisters.where('status').equals('abierta').toArray()
    return regs.sort((a, b) => a.openedAt.localeCompare(b.openedAt))[0] ?? null
  }, [])

  const register = cashState.status === 'ready' ? cashState.data : null

  const [cashDetail] = useQueryState(async () => {
    if (!register) return null
    const sales = (await db.sales.where('registerId').equals(register.id).toArray()).filter(
      (s) => !s.anulada,
    )
    const efectivo = round2(
      sales.filter((s) => s.paymentMethod === 'efectivo').reduce((sum, s) => sum + s.total, 0),
    )
    return { sales: sales.length, efectivo, esperado: efectivo }
  }, [register?.id])
  const cash = cashDetail.status === 'ready' ? cashDetail.data : null

  const [statsState, statsRetry] = useQueryState(async () => {
    const sales = (await db.sales.where('date').equals(todayISO()).toArray()).filter((s) => !s.anulada)
    const items = await db.saleItems.toArray()
    const todaySaleIds = new Set(sales.map((s) => s.id))
    const soldToday = items.filter((i) => todaySaleIds.has(i.saleId)).reduce((s, i) => s + i.quantity, 0)
    return {
      total: round2(sales.reduce((s, x) => s + x.total, 0)),
      count: sales.length,
      sold: soldToday,
    }
  }, [])
  const stats = statsState.status === 'ready' ? statsState.data : null

  const lowStock = useLowStock()

  if (cashState.status === 'error') {
    return (
      <AppLayout title="Inicio">
        <ErrorState
          title="No pudimos revisar la caja"
          description="No pudimos leer la información del día. Reintenta en unos segundos."
          onRetry={cashRetry}
        />
      </AppLayout>
    )
  }

  return (
    <AppLayout title="Inicio">
      {cashState.status === 'loading' && register === null ? (
        <div className="mb-4">
          <LoadingState rows={1} label="Revisando la caja..." />
        </div>
      ) : (
        <Link to="/caja" className="mb-4 block">
          <div
            className={`rounded-2xl border p-4 transition-transform duration-150 ease-out will-change-transform active:scale-[0.99] ${
              register
                ? 'border-line-active/60 bg-selected shadow-[0_0_24px_rgba(0,245,255,0.2)]'
                : 'border-accent/50 bg-accent-soft/50'
            }`}
          >
            {register ? (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-title-accent">Caja abierta</p>
                  <span className="text-xs text-fg-mute">Ver caja →</span>
                </div>
                <p className="mt-1 text-2xl font-bold text-fg">S/ {(cash?.esperado ?? 0).toFixed(2)}</p>
                <p className="text-sm text-fg-mute">
                  Efectivo del día · {cash?.sales ?? 0} {cash?.sales === 1 ? 'venta' : 'ventas'}
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent/25 text-2xl">🔒</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wider text-title-accent">Aún no abriste la caja</p>
                    <p className="text-sm text-fg-soft">Para comenzar a vender tienes que abrir caja</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between rounded-xl bg-cta px-4 py-3 shadow-[0_0_20px_rgba(0,245,255,0.45)]">
                  <span className="font-bold text-white">Toca aquí para abrir caja</span>
                  <span className="text-lg text-white">→</span>
                </div>
              </>
            )}
          </div>
        </Link>
      )}

      {/* Notificación contextual: solo aparece si hay algo que reponer. */}
      <LowStockAlert items={lowStock.data ?? []} />

      <h2 className="mb-3 text-lg font-semibold text-title">Resumen de hoy</h2>

      {statsState.status === 'error' ? (
        <ErrorState
          title="No pudimos cargar el resumen"
          description="Los totales del día no están disponibles ahora mismo."
          onRetry={statsRetry}
        />
      ) : statsState.status === 'loading' && stats === null ? (
        <LoadingState rows={3} label="Cargando el resumen..." />
      ) : (
        <div className="flex flex-col gap-3">
          <Card>
            <p className="text-sm text-fg-mute">Ventas</p>
            <p className="mt-1 text-2xl font-bold text-fg">S/ {(stats?.total ?? 0).toFixed(2)}</p>
            <p className="text-sm text-fg-mute">
              {stats?.count ?? 0} {stats?.count === 1 ? 'venta registrada' : 'ventas registradas'}
            </p>
          </Card>
          <Card>
            <p className="text-sm text-fg-mute">Productos vendidos</p>
            <p className="text-2xl font-bold text-accent-text">{stats?.sold ?? 0}</p>
          </Card>
          <Card>
            <p className="text-sm text-fg-mute">Productos con poco stock</p>
            <p
              className={`text-2xl font-bold ${
                (lowStock.data ?? []).length > 0 ? 'text-danger' : 'text-cta-text'
              }`}
            >
              {(lowStock.data ?? []).length}
            </p>
            {(lowStock.data ?? []).length > 0 && (
              <p className="text-xs font-semibold text-danger">Toca "Reponer en Inventario" arriba</p>
            )}
          </Card>
        </div>
      )}
    </AppLayout>
  )
}
