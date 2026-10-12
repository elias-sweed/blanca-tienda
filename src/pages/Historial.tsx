import { useState } from 'react'
import { AppLayout } from '../components/layout/AppLayout'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { FilterChips } from '../components/ui/FilterChips'
import { HelpTooltip } from '../components/ui/HelpTooltip'
import { Input } from '../components/ui/Input'
import { LoadingState } from '../components/ui/LoadingState'
import { Modal } from '../components/ui/Modal'
import { Paginator } from '../components/ui/Paginator'
import { SearchBox } from '../components/ui/SearchBox'
import { useToast } from '../components/ui/ToastContext'
import { useQueryState } from '../hooks/useQueryState'
import { db } from '../lib/db'
import { voidSale } from '../services/sales'
import { calcularPaginas, paginar } from '../utils/paginacion'
import { rankMatches } from '../utils/search'
import { round2 } from '../utils/money'
import type { MovementReason, Sale, SaleItem } from '../types/models'

type Tab = 'ventas' | 'movimientos' | 'cierres'
type OrdenHistorial = 'recientes' | 'antiguos'

/** Estado del filtro compartido por las 3 pestañas. */
interface FiltroHistorialProps {
  busqueda: string
  onBusqueda: (v: string) => void
  orden: OrdenHistorial
  onOrden: (v: OrdenHistorial) => void
  pagina: number
  onPagina: (p: number) => void
}

/** Orden cronológico simple: recién pasó o lo más viejo primero. */
function porFecha<T extends { createdAt: string }>(a: T, b: T, orden: OrdenHistorial): number {
  return orden === 'recientes'
    ? b.createdAt.localeCompare(a.createdAt)
    : a.createdAt.localeCompare(b.createdAt)
}

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
  // El filtro vive arriba para que no se pierda al cambiar de pestaña.
  // Cada cambio (búsqueda, orden o pestaña) vuelve siempre a la página 1.
  const [busqueda, setBusqueda] = useState('')
  const [orden, setOrden] = useState<OrdenHistorial>('recientes')
  const [pagina, setPagina] = useState(1)

  const filtro: FiltroHistorialProps = {
    busqueda,
    orden,
    pagina,
    onBusqueda: (v) => {
      setBusqueda(v)
      setPagina(1)
    },
    onOrden: (v) => {
      setOrden(v)
      setPagina(1)
    },
    onPagina: setPagina,
  }

  return (
    <AppLayout title="Historial">
      <div className="mb-4 flex gap-2">
        {(['ventas', 'movimientos', 'cierres'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t)
              setPagina(1)
            }}
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

      {tab === 'ventas' && <SalesHistory filtro={filtro} />}
      {tab === 'movimientos' && <MovementsHistory filtro={filtro} />}
      {tab === 'cierres' && <ClosuresHistory filtro={filtro} />}
    </AppLayout>
  )
}

/** Buscador + chips "recientes / antiguos", idénticos en las 3 pestañas. */
function FiltroHistorial({
  filtro,
  resultados,
  total,
  placeholder,
}: {
  filtro: FiltroHistorialProps
  resultados: number
  total: number
  placeholder: string
}) {
  return (
    <div className="mb-4 flex flex-col gap-3">
      <SearchBox
        value={filtro.busqueda}
        onChange={filtro.onBusqueda}
        results={resultados}
        total={total}
        placeholder={placeholder}
      />
      <FilterChips<OrdenHistorial>
        titulo="Ordenar"
        valor={filtro.orden}
        onChange={filtro.onOrden}
        opciones={[
          { valor: 'recientes', etiqueta: 'Más recientes' },
          { valor: 'antiguos', etiqueta: 'Más antiguos' },
        ]}
      />
    </div>
  )
}

/** Aviso cuando la búsqueda no trajo nada, con botón para borrarla. */
function SinResultados({ busqueda, onBorrar }: { busqueda: string; onBorrar: () => void }) {
  return (
    <EmptyState
      icon="🔍"
      title={`No encontramos "${busqueda.trim()}"`}
      description="Revisa la ortografía o intenta con otra palabra."
      action={
        <Button variant="secondary" size="md" onClick={onBorrar}>
          Borrar búsqueda
        </Button>
      }
    />
  )
}

function SalesHistory({ filtro }: { filtro: FiltroHistorialProps }) {
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

  // Búsqueda por nombre de producto, método de pago, fecha o monto; después
  // manda el orden elegido (recién pasó o lo más viejo primero).
  const filtradas = rankMatches(sales, filtro.busqueda, (s) => {
    const lineas = itemsBySale.get(s.id) ?? []
    return [
      ...lineas.map((l) => l.productName),
      METODOS[s.paymentMethod] ?? s.paymentMethod,
      s.date,
      s.total.toFixed(2),
      s.anuladaMotivo ?? '',
    ]
  })
  filtradas.sort((a, b) => porFecha(a, b, filtro.orden))

  const totalPaginas = calcularPaginas(filtradas.length)
  const paginaActual = Math.min(filtro.pagina, totalPaginas)
  const paginaItems = paginar(filtradas, paginaActual)

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
    <>
      <FiltroHistorial
        filtro={filtro}
        resultados={filtradas.length}
        total={sales.length}
        placeholder="Ej: polo, efectivo, S/ 45"
      />
      {filtradas.length === 0 && (
        <SinResultados busqueda={filtro.busqueda} onBorrar={() => filtro.onBusqueda('')} />
      )}
      <div className="flex flex-col gap-3">
      {paginaItems.map((s) => {
        const lines = itemsBySale.get(s.id) ?? []
        const unidades = lines.reduce((n, l) => n + l.quantity, 0)
        return (
          <Card key={s.id} className={s.anulada ? 'opacity-60' : ''}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`font-bold ${s.anulada ? 'text-fg-mute line-through' : 'text-fg'}`}>
                    S/ {s.total.toFixed(2)}
                  </p>
                  {s.anulada && (
                    <span className="rounded-full border border-danger/50 px-2 py-0.5 text-xs font-bold text-danger">
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
              <div className="mt-3 flex items-center gap-2">
                <Button variant="secondary" size="md" className="flex-1" onClick={() => setAnular(s)}>
                  Anular venta
                </Button>
                <HelpTooltip text="Si te equivocaste, puedes anular la venta y las unidades vuelven al inventario." />
              </div>
            )}
          </Card>
        )
      })}
      <Paginator pagina={paginaActual} totalPaginas={totalPaginas} onChange={filtro.onPagina} />
      </div>

      <Modal open={!!anular} title="Anular venta" onClose={() => setAnular(null)}>
        <div className="flex flex-col gap-3">
          <div className="rounded-xl border border-line bg-inset p-3">
            <div className="flex justify-between text-sm">
              <span className="text-fg-soft">Venta</span>
              <span className="font-bold text-fg">S/ {anular?.total.toFixed(2)}</span>
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
    </>
  )
}

function MovementsHistory({ filtro }: { filtro: FiltroHistorialProps }) {
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

  // Búsqueda por producto, motivo o nota, y luego el orden elegido.
  const filtrados = rankMatches(movements, filtro.busqueda, (m) => [
    m.productName,
    MOTIVOS_MOVIMIENTO[m.reason] ?? m.reason,
    m.note ?? '',
  ])
  filtrados.sort((a, b) => porFecha(a, b, filtro.orden))

  const totalPaginas = calcularPaginas(filtrados.length)
  const paginaActual = Math.min(filtro.pagina, totalPaginas)
  const paginaItems = paginar(filtrados, paginaActual)

  return (
    <>
      <FiltroHistorial
        filtro={filtro}
        resultados={filtrados.length}
        total={movements.length}
        placeholder="Ej: polo, ajuste"
      />
      {filtrados.length === 0 && (
        <SinResultados busqueda={filtro.busqueda} onBorrar={() => filtro.onBusqueda('')} />
      )}
      <div className="flex flex-col gap-3">
      {paginaItems.map((m) => (
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
      <Paginator pagina={paginaActual} totalPaginas={totalPaginas} onChange={filtro.onPagina} />
      </div>
    </>
  )
}

function ClosuresHistory({ filtro }: { filtro: FiltroHistorialProps }) {
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

  // Búsqueda por fecha, y luego el orden elegido.
  const filtrados = rankMatches(closures, filtro.busqueda, (c) => [c.date])
  filtrados.sort((a, b) => porFecha(a, b, filtro.orden))

  const totalPaginas = calcularPaginas(filtrados.length)
  const paginaActual = Math.min(filtro.pagina, totalPaginas)
  const paginaItems = paginar(filtrados, paginaActual)

  return (
    <>
      <FiltroHistorial
        filtro={filtro}
        resultados={filtrados.length}
        total={closures.length}
        placeholder="Ej: 2026-10-01"
      />
      {filtrados.length === 0 && (
        <SinResultados busqueda={filtro.busqueda} onBorrar={() => filtro.onBusqueda('')} />
      )}
      <div className="flex flex-col gap-3">
      {paginaItems.map((c) => {
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
                <span className="font-bold text-fg">S/ {c.expectedCash.toFixed(2)}</span>
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
      <Paginator pagina={paginaActual} totalPaginas={totalPaginas} onChange={filtro.onPagina} />
      </div>
    </>
  )
}
