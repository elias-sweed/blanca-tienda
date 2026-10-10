import { useState } from 'react'
import { AppLayout } from '../components/layout/AppLayout'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { Input } from '../components/ui/Input'
import { LoadingState } from '../components/ui/LoadingState'
import { Modal } from '../components/ui/Modal'
import { useToast } from '../components/ui/ToastContext'
import { useQueryState } from '../hooks/useQueryState'
import { db } from '../lib/db'
import { voidSale } from '../services/sales'
import { round2 } from '../utils/money'
import type { MovementReason, Sale, SaleItem } from '../types/models'

type Tab = 'ventas' | 'movimientos' | 'cierres'

const MOTIVOS_MOVIMIENTO: Record<MovementReason, string> = {
  entrada: 'Entrada de mercadería',
  venta: 'Venta',
  ajuste: 'Ajuste manual',
  devolucion: 'Devolución',
  anulacion: 'Anulación de venta',
  salida: 'Salida',
}

const METODOS: Record<Sale['paymentMethod'], string> = {
  efectivo: 'Efectivo',
  yape: 'Yape',
  plin: 'Plin',
  tarjeta: 'Tarjeta',
  otro: 'Otro',
}

export default function Historial() {
  const [tab, setTab] = useState<Tab>('ventas')

  return (
    <AppLayout title="Historial">
      <div className="mb-4 flex gap-2">
        {(['ventas', 'movimientos', 'cierres'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-xl border px-3 py-2 text-sm font-bold capitalize ${
              tab === t
                ? 'border-line-active bg-selected text-label-active'
                : 'border-line bg-surface text-fg-mute hover:bg-hover hover:border-line-active hover:text-fg'
            }`}
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
  const { show } = useToast()
  const [anular, setAnular] = useState<Sale | null>(null)
  const [motivo, setMotivo] = useState('')
  const [busy, setBusy] = useState(false)

  // Cada pestaña declara sus estados: cargando (esqueleto), error (con
  // reintento) y vacío. Nunca se muestra "Sin ventas" mientras carga.
  const [salesState, retrySales] = useQueryState(() => db.sales.reverse().sortBy('createdAt'), [])
  const [itemsState] = useQueryState(() => db.saleItems.toArray(), [])

  const sales = salesState.data ?? []
  const items = itemsState.data ?? []

  if (salesState.status === 'loading' && salesState.data === null) {
    return <LoadingState rows={4} label="Cargando ventas..." />
  }

  if (salesState.status === 'error') {
    return (
      <ErrorState
        title="No pudimos cargar el historial"
        description="Las ventas no están disponibles ahora mismo. Reintenta en unos segundos."
        onRetry={retrySales}
      />
    )
  }

  if (sales.length === 0) {
    return <EmptyState icon="🧾" title="Sin ventas" description="Las ventas registradas aparecerán aquí." />
  }

  const itemsBySale = new Map<string, SaleItem[]>()
  for (const item of items ?? []) {
    const list = itemsBySale.get(item.saleId)
    if (list) list.push(item)
    else itemsBySale.set(item.saleId, [item])
  }

  async function confirmarAnulacion() {
    if (!anular) return
    setBusy(true)
    try {
      await voidSale(anular.id, motivo)
      show('Venta anulada y stock devuelto')
      setAnular(null)
      setMotivo('')
    } catch (e) {
      show(e instanceof Error ? e.message : 'No se pudo anular la venta', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {sales.map((s) => {
        const lines = itemsBySale.get(s.id) ?? []
        const unidades = lines.reduce((n, l) => n + l.quantity, 0)
        return (
          <Card key={s.id} className={s.anulada ? 'opacity-60' : ''}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`font-bold ${s.anulada ? 'text-fg-mute line-through' : 'text-ruby-text'}`}>
                    S/ {s.total.toFixed(2)}
                  </p>
                  {s.anulada && (
                    <span className="rounded-full bg-danger/20 px-2 py-0.5 text-xs font-bold text-danger">
                      Anulada
                    </span>
                  )}
                </div>
                <p className="text-sm text-fg-mute">{METODOS[s.paymentMethod] ?? s.paymentMethod}</p>
                <p className="text-xs text-fg-mute">
                  {unidades} {unidades === 1 ? 'unidad' : 'unidades'} · {lines.length}{' '}
                  {lines.length === 1 ? 'producto' : 'productos'}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm text-fg-soft">{s.date}</p>
                <p className="text-xs text-fg-mute">
                  {new Date(s.createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>

            {lines.length > 0 && (
              <div className="mt-3 flex flex-col gap-1 border-t border-line pt-3">
                {lines.map((l) => (
                  <div key={l.id} className="flex items-center justify-between text-sm">
                    <span className="truncate text-fg-soft">
                      {l.productName} × {l.quantity}
                    </span>
                    <span className="shrink-0 font-bold text-fg-mute">S/ {l.subtotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}

            {s.change !== undefined && s.change > 0 && !s.anulada && (
              <p className="mt-2 text-xs text-cta-text">Vuelto: S/ {s.change.toFixed(2)}</p>
            )}

            {s.anulada && s.anuladaMotivo && (
              <p className="mt-2 text-xs text-fg-mute">Motivo: {s.anuladaMotivo}</p>
            )}

            {!s.anulada && (
              <Button variant="secondary" size="md" className="mt-3 w-full" onClick={() => setAnular(s)}>
                Anular venta
              </Button>
            )}
          </Card>
        )
      })}

      <Modal open={!!anular} title="Anular venta" onClose={() => setAnular(null)}>
        <div className="flex flex-col gap-3">
          <div className="rounded-xl border border-line bg-inset p-3">
            <div className="flex justify-between text-sm">
              <span className="text-fg-soft">Venta</span>
              <span className="font-bold text-ruby-text">S/ {anular?.total.toFixed(2)}</span>
            </div>
            <div className="mt-1 flex justify-between text-sm">
              <span className="text-fg-soft">Fecha</span>
              <span className="text-fg-mute">{anular?.date}</span>
            </div>
          </div>

          <p className="text-sm text-fg-mute">
            Se devolverá al inventario el stock de todos los productos de esta venta y quedará registrada como anulada.
          </p>

          <Input
            label="Motivo (opcional)"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ej: Producto devuelto por el cliente"
          />

          <Button variant="danger" size="lg" onClick={confirmarAnulacion} disabled={busy}>
            Confirmar anulación
          </Button>
        </div>
      </Modal>
    </div>
  )
}

function MovementsHistory() {
  const [state, retry] = useQueryState(() => db.inventoryMovements.reverse().sortBy('createdAt'), [])

  if (state.status === 'loading' && state.data === null) {
    return <LoadingState rows={4} label="Cargando movimientos..." />
  }

  if (state.status === 'error') {
    return (
      <ErrorState
        title="No pudimos cargar los movimientos"
        description="El historial de inventario no está disponible ahora mismo."
        onRetry={retry}
      />
    )
  }

  const movements = state.data ?? []
  if (movements.length === 0) {
    return <EmptyState icon="📦" title="Sin movimientos" description="Los movimientos de inventario aparecerán aquí." />
  }

  return (
    <div className="flex flex-col gap-3">
      {movements.map((m) => (
        <Card key={m.id}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-bold">{m.productName || 'Producto'}</p>
              <p className="text-sm text-fg-mute">{MOTIVOS_MOVIMIENTO[m.reason] ?? m.reason}</p>
              {m.note && <p className="text-xs text-fg-mute">{m.note}</p>}
            </div>
            <div className="shrink-0 text-right">
              <p className={`font-bold ${m.quantity > 0 ? 'text-cta-text' : 'text-danger'}`}>
                {m.quantity > 0 ? '+' : ''}{m.quantity}
              </p>
              <p className="text-xs text-fg-mute">{new Date(m.createdAt).toLocaleString('es-PE')}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

function ClosuresHistory() {
  const [state, retry] = useQueryState(() => db.cashClosures.reverse().sortBy('createdAt'), [])

  if (state.status === 'loading' && state.data === null) {
    return <LoadingState rows={4} label="Cargando cierres..." />
  }

  if (state.status === 'error') {
    return (
      <ErrorState
        title="No pudimos cargar los cierres"
        description="El historial de caja no está disponible ahora mismo."
        onRetry={retry}
      />
    )
  }

  const closures = state.data ?? []
  if (closures.length === 0) {
    return <EmptyState icon="🗓️" title="Sin cierres" description="Los cierres de caja aparecerán aquí." />
  }

  return (
    <div className="flex flex-col gap-3">
      {closures.map((c) => {
        const totales: { id: Sale['paymentMethod']; valor: number }[] = [
          { id: 'efectivo', valor: c.totalCash },
          { id: 'yape', valor: c.totalYape },
          { id: 'plin', valor: c.totalPlin },
          { id: 'tarjeta', valor: c.totalTarjeta },
          { id: 'otro', valor: c.totalOtro },
        ]
        return (
          <Card key={c.id}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold">{c.date}</p>
                <p className="text-sm text-fg-mute">
                  {new Date(c.createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div className="text-right">
                <p
                  className={`font-bold ${
                    c.difference === 0 ? 'text-success' : c.difference > 0 ? 'text-info' : 'text-danger'
                  }`}
                >
                  {c.difference === 0
                    ? 'Exacto'
                    : c.difference > 0
                      ? `+S/ ${c.difference.toFixed(2)}`
                      : `-S/ ${Math.abs(c.difference).toFixed(2)}`}
                </p>
                <p className="text-xs text-fg-mute">
                  {c.difference === 0 ? 'Sin diferencia' : c.difference > 0 ? 'Sobró' : 'Faltó'}
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-1 border-t border-line pt-3 text-sm">
              {totales
                .filter((t) => t.valor > 0)
                .map((t) => (
                  <div key={t.id} className="flex items-center justify-between">
                    <span className="text-fg-soft">{METODOS[t.id]}</span>
                    <span className="font-bold text-fg-mute">S/ {t.valor.toFixed(2)}</span>
                  </div>
                ))}
              <div className="flex items-center justify-between border-t border-line pt-1">
                <span className="text-fg-soft">Esperado en gaveta</span>
                <span className="font-bold text-cta-text">S/ {c.expectedCash.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-fg-soft">Contado</span>
                <span className="font-bold text-fg">S/ {c.countedCash.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-fg-soft">Diferencia</span>
                <span
                  className={`font-bold ${
                    c.difference === 0 ? 'text-success' : c.difference > 0 ? 'text-info' : 'text-danger'
                  }`}
                >
                  {c.difference > 0 ? '+' : ''}S/ {round2(c.difference).toFixed(2)}
                </span>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
