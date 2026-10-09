import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { AppLayout } from '../components/layout/AppLayout'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { Spinner } from '../components/ui/Spinner'
import { useToast } from '../components/ui/Toast'
import { db } from '../lib/db'
import { closeCashRegister, openCashRegister } from '../services/cash'
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
  const [openModal, setOpenModal] = useState(false)
  const [closeModal, setCloseModal] = useState(false)
  const [opening, setOpening] = useState('')
  const [counted, setCounted] = useState('')
  const [busy, setBusy] = useState(false)

  // El resultado se envuelve en un objeto: `useLiveQuery` devuelve `undefined`
  // tanto mientras carga como cuando la consulta resuelve `undefined`, y sin
  // este envoltorio la página no puede diferenciar "cargando" de "no hay caja".
  const openRegister = useLiveQuery(async () => {
    const regs = await db.cashRegisters.where('status').equals('abierta').toArray()
    return { register: regs.sort((a, b) => a.openedAt.localeCompare(b.openedAt))[0] ?? null }
  }, [])

  const register = openRegister?.register

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
  const expectedCash = round2((register?.openingAmount ?? 0) + porMetodo.efectivo)
  const countedNum = Number(counted)
  const difference = Number.isFinite(countedNum) && counted !== '' ? round2(countedNum - expectedCash) : null

  async function handleOpen() {
    const amount = Number(opening)
    if (opening === '' || !Number.isFinite(amount) || amount < 0) {
      return show('Escribe un monto inicial válido', 'error')
    }
    setBusy(true)
    try {
      await openCashRegister(amount)
      show(`Caja abierta con S/ ${amount.toFixed(2)}`)
      setOpenModal(false)
      setOpening('')
    } catch (e) {
      show(e instanceof Error ? e.message : 'No se pudo abrir la caja', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function handleClose() {
    if (counted === '' || !Number.isFinite(countedNum) || countedNum < 0) {
      return show('Escribe el monto contado', 'error')
    }
    setBusy(true)
    try {
      const closure = await closeCashRegister(countedNum)
      const msg = closure.difference === 0
        ? 'Caja cerrada. El efectivo cuadró exacto.'
        : closure.difference > 0
          ? `Caja cerrada. Sobraron S/ ${closure.difference.toFixed(2)}`
          : `Caja cerrada. Faltaron S/ ${Math.abs(closure.difference).toFixed(2)}`
      show(msg, closure.difference === 0 ? 'success' : 'error')
      setCloseModal(false)
      setCounted('')
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
          <Button size="lg" className="mb-4" onClick={() => setOpenModal(true)}>
            Abrir caja
          </Button>
          <EmptyState title="Caja cerrada" description="Abre la caja para empezar a registrar el día." />

          {closures && closures.length > 0 && (
            <div className="mt-6">
              <h2 className="mb-2 text-lg font-bold text-fg">Cierres anteriores</h2>
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
          <div className="mb-4 rounded-2xl border border-cta-text/40 bg-cta/15 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-cta-text">Caja abierta</p>
            <p className="mt-1 text-sm text-fg-mute">
              Desde {new Date(register.openedAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
            </p>
            <div className="mt-3 flex justify-between text-lg font-bold">
              <span className="text-fg-soft">Efectivo esperado</span>
              <span className="text-cta-text">S/ {expectedCash.toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Card>
              <p className="text-sm text-fg-mute">Vendido hoy</p>
              <p className="text-2xl font-bold text-ruby-text">S/ {totalVendido.toFixed(2)}</p>
              <p className="text-xs text-fg-mute">{ordered.length} ventas</p>
            </Card>
            <Card>
              <p className="text-sm text-fg-mute">Monto inicial</p>
              <p className="text-2xl font-bold text-accent-text">S/ {register.openingAmount.toFixed(2)}</p>
            </Card>
          </div>

          <div className="mt-4">
            <h2 className="mb-2 text-lg font-bold text-fg">Por método de pago</h2>
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
            <h2 className="mb-2 text-lg font-bold text-fg">Ventas de esta caja</h2>
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

      <Modal open={openModal} title="Abrir caja" onClose={() => setOpenModal(false)}>
        <div className="flex flex-col gap-3">
          <Input
            label="Monto inicial (S/)"
            type="number"
            value={opening}
            onChange={(e) => setOpening(e.target.value)}
            placeholder="Ej: 50.00"
          />
          <Button size="lg" onClick={handleOpen} disabled={busy}>
            Abrir caja
          </Button>
        </div>
      </Modal>

      <Modal open={closeModal} title="Cerrar caja" onClose={() => setCloseModal(false)}>
        <div className="flex flex-col gap-3">
          <div className="rounded-xl border border-line bg-inset p-3">
            <div className="flex justify-between text-sm">
              <span className="text-fg-soft">Efectivo esperado</span>
              <span className="font-bold text-cta-text">S/ {expectedCash.toFixed(2)}</span>
            </div>
            <div className="mt-1 flex justify-between text-sm">
              <span className="text-fg-soft">Ventas en la caja</span>
              <span className="font-bold text-ruby-text">S/ {totalVendido.toFixed(2)}</span>
            </div>
          </div>

          <Input
            label="Efectivo contado (S/)"
            type="number"
            value={counted}
            onChange={(e) => setCounted(e.target.value)}
            placeholder="Ej: 50.00"
          />

          {difference !== null && (
            <div
              className={`rounded-xl border p-3 ${
                difference === 0
                  ? 'border-cta-text/40 bg-cta/15'
                  : difference > 0
                    ? 'border-info/40 bg-info/10'
                    : 'border-danger/40 bg-danger/10'
              }`}
            >
              <div className="flex justify-between text-sm">
                <span className="text-fg-soft">Diferencia</span>
                <span className={`font-bold ${difference === 0 ? 'text-cta-text' : difference > 0 ? 'text-info' : 'text-danger'}`}>
                  {difference > 0 ? '+' : ''}S/ {difference.toFixed(2)}
                </span>
              </div>
              {difference !== 0 && (
                <p className="mt-1 text-center text-xs text-fg-mute">
                  {difference > 0 ? 'Sobró efectivo en gaveta' : 'Faltó efectivo en gaveta'}
                </p>
              )}
            </div>
          )}

          <Button size="lg" onClick={handleClose} disabled={busy}>
            Confirmar cierre
          </Button>
        </div>
      </Modal>
    </AppLayout>
  )
}

function ClosureRow({ closure }: { closure: CashClosure }) {
  const estado =
    closure.difference === 0
      ? { texto: 'Exacto', clase: 'text-cta-text' }
      : closure.difference > 0
        ? { texto: `+S/ ${closure.difference.toFixed(2)}`, clase: 'text-info' }
        : { texto: `-S/ ${Math.abs(closure.difference).toFixed(2)}`, clase: 'text-danger' }

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-bold">{closure.date}</p>
        <p className="text-sm text-fg-mute">
          Esperado S/ {closure.expectedCash.toFixed(2)} · Contado S/ {closure.countedCash.toFixed(2)}
        </p>
      </div>
      <div className="text-right">
        <p className={`font-bold ${estado.clase}`}>{estado.texto}</p>
        <p className="text-xs text-fg-mute">Ventas S/ {closure.totalCash.toFixed(2)}</p>
      </div>
    </div>
  )
}
