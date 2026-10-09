import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { AppLayout } from '../components/layout/AppLayout'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { db } from '../lib/db'

type Tab = 'ventas' | 'movimientos' | 'cierres'

export default function Historial() {
  const [tab, setTab] = useState<Tab>('ventas')

  return (
    <AppLayout title="Historial">
      <div className="mb-4 flex gap-2">
        {(['ventas', 'movimientos', 'cierres'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-xl px-3 py-2 text-sm font-bold capitalize ${tab === t ? 'bg-gold text-black' : 'bg-surface text-gray-400 border border-gold/20'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'ventas' && <SalesHistory />}
      {tab === 'movimientos' && <MovementsHistory />}
      {tab === 'cierres' && <ClosuresHistory />}
    </AppLayout>
  )
}

function SalesHistory() {
  const sales = useLiveQuery(() => db.sales.reverse().sortBy('createdAt'), [])

  if (!sales || sales.length === 0) {
    return <EmptyState title="Sin ventas" description="Las ventas registradas aparecerán aquí." />
  }

  return (
    <div className="flex flex-col gap-3">
      {sales.map((s) => (
        <Card key={s.id}>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold">S/ {s.total.toFixed(2)}</p>
              <p className="text-sm text-gray-500">{s.paymentMethod}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">{s.date}</p>
              <p className="text-xs text-gray-500">{new Date(s.createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

function MovementsHistory() {
  const movements = useLiveQuery(() => db.inventoryMovements.reverse().sortBy('createdAt'), [])

  if (!movements || movements.length === 0) {
    return <EmptyState title="Sin movimientos" description="Los movimientos de inventario aparecerán aquí." />
  }

  return (
    <div className="flex flex-col gap-3">
      {movements.map((m) => (
        <Card key={m.id}>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold">{m.productName}</p>
              <p className="text-sm text-gray-500">{m.reason}</p>
            </div>
            <div className="text-right">
              <p className={`font-bold ${m.quantity > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {m.quantity > 0 ? '+' : ''}{m.quantity}
              </p>
              <p className="text-xs text-gray-500">{new Date(m.createdAt).toLocaleString('es-PE')}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

function ClosuresHistory() {
  const closures = useLiveQuery(() => db.cashClosures.reverse().sortBy('createdAt'), [])

  if (!closures || closures.length === 0) {
    return <EmptyState title="Sin cierres" description="Los cierres de caja aparecerán aquí." />
  }

  return (
    <div className="flex flex-col gap-3">
      {closures.map((c) => (
        <Card key={c.id}>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold">{c.date}</p>
              <p className="text-sm text-gray-500">Efectivo: S/ {c.totalCash.toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p className={`font-bold ${c.difference === 0 ? 'text-green-400' : c.difference > 0 ? 'text-blue-400' : 'text-red-400'}`}>
                {c.difference === 0 ? 'Exacto' : c.difference > 0 ? `+S/ ${c.difference.toFixed(2)}` : `-S/ ${Math.abs(c.difference).toFixed(2)}`}
              </p>
              <p className="text-xs text-gray-500">Esperado: S/ {c.expectedCash.toFixed(2)}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
