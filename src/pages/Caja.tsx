import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useLocation } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { AbrirCajaGuia } from '../components/layout/AbrirCajaGuia'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { Spinner } from '../components/ui/Spinner'
import { useToast } from '../components/ui/Toast'
import { db } from '../lib/db'
import { closeCashRegister, openCashRegister, type CierreResultado } from '../services/cash'
import { round2 } from '../utils/money'
import type { CashClosure, Sale } from '../types/models'

const METODOS: { id: Sale['paymentMethod']; label: string }[] = [
  { id: 'efectivo', label: 'Efectivo' },
  { id: 'yape', label: 'Yape' },
  { id: 'plin', label: 'Plin' },
  { id: 'tarjeta', label: 'Tarjeta' },
  { id: 'otro', label: 'Otro' },
]

export default function Caja() {
  const { show } = useToast()
  const location = useLocation()
  const fromVentas = (location.state as { fromVentas?: boolean } | null)?.fromVentas ?? false
  const [showArrow, setShowArrow] = useState(false)
  const [closeModal, setCloseModal] = useState(false)
  const [resultado, setResultado] = useState<CierreResultado | null>(null)
  const [monto, setMonto] = useState('')
  const [busy, setBusy] = useState(false)

  // El resultado se envuelve en un objeto: `useLiveQuery` devuelve `undefined`
  // tanto mientras carga como cuando la consulta resuelve `undefined`, y sin
  // este envoltorio la página no puede diferenciar "cargando" de "no hay caja".
  const openRegister = useLiveQuery(async () => {
    const regs = await db.cashRegisters.where('status').equals('abierta').toArray()
    return { register: regs.sort((a, b) => a.openedAt.localeCompare(b.openedAt))[0] ?? null }
  }, [])

  const register = openRegister?.register

  // Si venimos de Ventas, mantener el botón resaltado permanentemente
  useEffect(() => {
    if (fromVentas && !register) {
      setShowArrow(true)
    }
  }, [fromVentas, register])

  // Aviso + sonido cuando se toca fuera del modal

  const sales = useLiveQuery(
    async () => (register ? db.sales.where('registerId').equals(register.id).toArray() : []),
    [register?.id],
  )

  const closures = useLiveQuery(() => db.cashClosures.reverse().sortBy('createdAt'), [])

  const allSales = [...(sales ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  // Las ventas anuladas se muestran tachadas pero no suman al efectivo esperado.
  const ordered = allSales.filter((s) => !s.anulada)
  const porMetodo = METODOS.reduce<Record<string, number>>((acc, m) => {
    acc[m.id] = round2(ordered.filter((s) => s.paymentMethod === m.id).reduce((sum, s) => sum + s.total, 0))
    return acc
  }, {})
  const totalVendido = round2(ordered.reduce((sum, s) => sum + s.total, 0))
  // La caja abre en 0: lo esperado es solo el efectivo vendido hoy.
  const esperadoEnGaveta = porMetodo.efectivo

  async function handleOpen() {
    setBusy(true)
    try {
      await openCashRegister()
      show('Caja abierta. Ya puedes vender.')
    } catch (e) {
      show(e instanceof Error ? e.message : 'No se pudo abrir la caja', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function handleClose() {
    if (!resultado) return show('Elige cómo te fue con la caja', 'error')
    setBusy(true)
    try {
      const closure = await closeCashRegister({ resultado, monto: Number(monto) || undefined })
      const msg = closure.difference === 0
        ? 'Caja cerrada. Todo cuadró.'
        : closure.difference > 0
          ? `Caja cerrada. Sobraron S/ ${closure.difference.toFixed(2)}`
          : `Caja cerrada. Faltaron S/ ${Math.abs(closure.difference).toFixed(2)}`
      show(msg, closure.difference === 0 ? 'success' : 'info')
      setCloseModal(false)
      setResultado(null)
      setMonto('')
    } catch (e) {
      show(e instanceof Error ? e.message : 'No se pudo cerrar la caja', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AppLayout title="Caja">
      {openRegister === undefined ? (
        <Spinner label="Cargando caja..." />
      ) : !register ? (
        <>
          <div className="mb-4">
            <Button size="lg" className="w-full" onClick={handleOpen} disabled={busy}>
              Abrir caja
            </Button>
          </div>
          <EmptyState title="Caja cerrada" description="Abre la caja para empezar a vender. Las ventas se anotan solas." />

          {closures && closures.length > 0 && (
            <div className="mt-6">
              <h2 className="mb-2 text-lg font-bold text-gold">Cierres anteriores</h2>
              <div className="flex flex-col gap-3">
                {closures.map((c) => (
                  <Card key={c.id}>
                    <ClosureRow closure={c} />
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="mb-4 rounded-2xl border border-success/40 bg-success/10 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-success">Caja abierta</p>
            <p className="mt-1 text-sm text-fg-mute">
              Desde {new Date(register.openedAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
            </p>
            <div className="mb-3 flex justify-between text-lg font-bold">
              <span className="text-fg-soft">Ganado hoy</span>
              <span className="text-ruby-text">S/ {totalVendido.toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Card>
              <p className="text-sm text-fg-mute">Ganado hoy</p>
              <p className="text-2xl font-bold text-ruby-text">S/ {totalVendido.toFixed(2)}</p>
              <p className="text-xs text-fg-mute">{ordered.length} ventas</p>
            </Card>
            <Card>
              <p className="text-sm text-fg-mute">Efectivo del día</p>
              <p className="text-2xl font-bold text-accent-text">S/ {esperadoEnGaveta.toFixed(2)}</p>
              <p className="text-xs text-fg-mute">Solo efectivo</p>
            </Card>
          </div>

          <div className="mt-4">
            <h2 className="mb-2 text-lg font-bold text-gold">Por método de pago</h2>
            <div className="flex flex-col gap-2">
              {METODOS.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-xl border border-line bg-inset px-4 py-3">
                  <span className="text-sm font-semibold text-fg-soft">{m.label}</span>
                  <span className="font-bold text-ruby-text">S/ {(porMetodo[m.id] ?? 0).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <h2 className="mb-2 text-lg font-bold text-gold">Ventas de esta caja</h2>
            {ordered.length === 0 ? (
              <EmptyState title="Sin ventas" description="Las ventas de esta caja aparecerán aquí." />
            ) : (
              <div className="flex flex-col gap-3">
                {allSales.map((s) => (
                  <Card key={s.id} className={s.anulada ? 'opacity-60' : ''}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`font-bold ${s.anulada ? 'text-fg-mute line-through' : 'text-ruby-text'}`}>
                          S/ {s.total.toFixed(2)}
                        </p>
                        <p className="text-sm text-fg-mute">
                          {METODOS.find((m) => m.id === s.paymentMethod)?.label ?? s.paymentMethod}
                          {s.anulada ? ' · Anulada' : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-fg-soft">{s.date}</p>
                        <p className="text-xs text-fg-mute">
                          {new Date(s.createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <Button variant="danger" size="lg" className="mt-6" onClick={() => setCloseModal(true)}>
            Cerrar caja
          </Button>
        </>
      )}

      <Modal open={closeModal} title="Cerrar caja" onClose={() => setCloseModal(false)}>
        <div className="flex flex-col gap-3">
          <p className="text-center text-sm text-fg-mute">
            No necesitas contar nada. Solo dime cómo te fue con la gaveta.
          </p>

          <div className="flex flex-col gap-2">
            {([
              { id: 'exacto', label: 'Quadró exacto', emoji: '✅' },
              { id: 'sobro', label: 'Sobró dinero', emoji: '💰' },
              { id: 'falto', label: 'Faltó dinero', emoji: '❌' },
            ] as const).map((op) => (
              <button
                key={op.id}
                onClick={() => {
                  setResultado(op.id)
                  if (op.id === 'exacto') setMonto('')
                }}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition active:scale-[0.98] ${
                  resultado === op.id
                    ? 'border-accent-text bg-accent text-fg'
                    : 'border-line bg-inset text-fg-soft'
                }`}
              >
                <span className="text-xl">{op.emoji}</span>
                <span className="font-bold">{op.label}</span>
              </button>
            ))}
          </div>

          {resultado !== null && resultado !== 'exacto' && (
            <div className="flex flex-col gap-1">
              <Input
                label={resultado === 'sobro' ? '¿Cuánto sobró? (S/)' : '¿Cuánto faltó? (S/)'}
                type="number"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="Ej: 10.00"
              />
              <p className="text-xs text-fg-mute">Solo si quieres anotarlo. No es obligatorio.</p>
            </div>
          )}

          {resultado !== null && resultado !== 'exacto' && monto !== '' && (
            <div className="rounded-xl border border-line bg-inset p-3">
              <div className="flex justify-between text-sm">
                <span className="text-fg-soft">Ganado hoy</span>
                <span className="font-bold text-ruby-text">S/ {totalVendido.toFixed(2)}</span>
              </div>
              <div className="mt-1 flex justify-between text-sm">
                <span className="text-fg-soft">Efectivo del día</span>
                <span className="font-bold text-accent-text">S/ {esperadoEnGaveta.toFixed(2)}</span>
              </div>
              {Number(monto) > 0 && (
                <div className="mt-1 flex justify-between text-sm">
                  <span className="text-fg-soft">{resultado === 'sobro' ? 'Sobró' : 'Faltó'}</span>
                  <span className={`font-bold ${resultado === 'sobro' ? 'text-info' : 'text-danger'}`}>
                    S/ {Number(monto).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )}

          <Button size="lg" onClick={handleClose} disabled={busy || resultado === null}>
            Cerrar caja
          </Button>
        </div>
      </Modal>

      {/* Al venir desde Ventas, un modal guía al centro: solo responde "Abrir caja" */}
      {showArrow && !register && (
        <AbrirCajaGuia onAbrir={handleOpen} />
      )}
    </AppLayout>
  )
}

function ClosureRow({ closure }: { closure: CashClosure }) {
  const estado =
    closure.difference === 0
      ? { texto: 'Exacto', clase: 'text-success' }
      : closure.difference > 0
        ? { texto: `+S/ ${closure.difference.toFixed(2)}`, clase: 'text-info' }
        : { texto: `-S/ ${Math.abs(closure.difference).toFixed(2)}`, clase: 'text-danger' }

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-bold">{closure.date}</p>
        <p className="text-sm text-fg-mute">
          Ganado S/ {closure.totalCash.toFixed(2)}
        </p>
      </div>
      <div className="text-right">
        <p className={`font-bold ${estado.clase}`}>{estado.texto}</p>
        <p className="text-xs text-fg-mute">
          Efectivo S/ {(closure.totalCash + closure.totalYape + closure.totalPlin + closure.totalTarjeta + closure.totalOtro).toFixed(2)}
        </p>
      </div>
    </div>
  )
}
