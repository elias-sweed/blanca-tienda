import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { AppLayout } from '../components/layout/AppLayout'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { useToast } from '../components/ui/Toast'
import { db } from '../lib/db'
import { registerSale } from '../services/sales'
import { createProduct } from '../services/inventory'
import { todayISO } from '../utils/ids'

const PAYMENTS = [
  { id: 'efectivo', label: 'Efectivo' },
  { id: 'yape', label: 'Yape' },
  { id: 'plin', label: 'Plin' },
] as const

export default function Ventas() {
  const [openNew, setOpenNew] = useState(false)

  const salesToday = useLiveQuery(
    () => db.sales.where('date').equals(todayISO()).reverse().toArray(),
    [],
  )

  return (
    <AppLayout title="Ventas">
      <Button size="lg" className="mb-4" onClick={() => setOpenNew(true)}>
        + Nueva venta
      </Button>

      <h2 className="mb-2 text-lg font-bold text-gold">Ventas de hoy</h2>
      <div className="flex flex-col gap-3">
        {(salesToday ?? []).length === 0 && (
          <EmptyState title="Aún no hay ventas hoy" description="Registra la primera venta del día." />
        )}
        {(salesToday ?? []).map((s) => (
          <Card key={s.id}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold">S/ {s.total.toFixed(2)}</p>
                <p className="text-sm text-gray-500">{s.paymentMethod}</p>
              </div>
              <p className="text-sm text-gray-500">{new Date(s.createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </Card>
        ))}
      </div>

      <NewSaleModal open={openNew} onClose={() => setOpenNew(false)} />
    </AppLayout>
  )
}

function NewSaleModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { show } = useToast()
  const [selected, setSelected] = useState<{ variantId: string; name: string; price: number; size?: string; color?: string; quantity: number } | null>(null)
  const [qty, setQty] = useState('1')
  const [method, setMethod] = useState<(typeof PAYMENTS)[number]['id']>('efectivo')
  const [amountPaid, setAmountPaid] = useState('')

  const [showNewForm, setShowNewForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [newSize, setNewSize] = useState('')
  const [newColor, setNewColor] = useState('')
  const [newQty, setNewQty] = useState('1')

  const products = useLiveQuery(async () => {
    const all = await db.products.filter((p) => p.active).toArray()
    const variants = await db.productVariants.toArray()
    return all.flatMap((p) =>
      variants.filter((v) => v.productId === p.id).map((v) => ({ product: p, variant: v })),
    )
  }, [])

  const total = showNewForm
    ? (Number(newPrice) || 0) * (Number(newQty) || 0)
    : selected
      ? selected.price * (Number(qty) || 0)
      : 0
  const paid = Number(amountPaid) || 0
  const change = paid > 0 ? paid - total : null

  async function confirmExisting() {
    if (!selected) return
    const n = Number(qty)
    if (!n || n <= 0) return show('Cantidad inválida', 'error')
    try {
      await registerSale({ variantId: selected.variantId, quantity: n, paymentMethod: method, amountPaid: paid || undefined })
      show('Venta registrada')
      resetForm()
      onClose()
    } catch (e) {
      show(e instanceof Error ? e.message : 'No se pudo registrar', 'error')
    }
  }

  async function confirmNew() {
    if (!newName.trim()) return show('Escribe el nombre del producto', 'error')
    const p = Number(newPrice)
    if (!p || p <= 0) return show('Escribe un precio válido', 'error')
    const n = Number(newQty)
    if (!n || n <= 0) return show('Cantidad inválida', 'error')
    try {
      const { variant } = await createProduct({
        name: newName,
        price: p,
        size: newSize,
        color: newColor,
        quantity: n,
      })
      const newPaid = Number(amountPaid) || 0
      await registerSale({ variantId: variant.id, quantity: n, paymentMethod: method, amountPaid: newPaid || undefined })
      show('Venta registrada')
      resetForm()
      onClose()
    } catch (e) {
      show(e instanceof Error ? e.message : 'No se pudo registrar', 'error')
    }
  }

  function resetForm() {
    setSelected(null)
    setQty('1')
    setMethod('efectivo')
    setAmountPaid('')
    setShowNewForm(false)
    setNewName('')
    setNewPrice('')
    setNewSize('')
    setNewColor('')
    setNewQty('1')
  }

  return (
    <Modal open={open} title="Nueva venta" onClose={onClose}>
      {showNewForm ? (
        <div className="flex flex-col gap-3">
          <Input label="Nombre del producto" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ej: Polo básico" />
          <Input label="Precio (S/)" type="number" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Talla" value={newSize} onChange={(e) => setNewSize(e.target.value)} placeholder="M" />
            <Input label="Color" value={newColor} onChange={(e) => setNewColor(e.target.value)} placeholder="Negro" />
          </div>
          <Input label="Cantidad" type="number" value={newQty} onChange={(e) => setNewQty(e.target.value)} />
          <div>
            <p className="mb-1 text-sm font-semibold text-gold">Método de pago</p>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENTS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setMethod(p.id)}
                  className={`rounded-xl border px-2 py-3 text-sm font-bold ${method === p.id ? 'border-gold bg-gold text-black' : 'border-gold/30 bg-night text-gray-300'}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <Input label="Con cuánto paga (S/)" type="number" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} placeholder="Ej: 50.00" />
          <div className="rounded-xl border border-gold/20 bg-night p-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Total</span>
              <span className="font-bold text-gold">S/ {total.toFixed(2)}</span>
            </div>
            {change !== null && change >= 0 && (
              <div className="mt-1 flex justify-between text-sm">
                <span className="text-gray-400">Vuelto</span>
                <span className="font-bold text-green-400">S/ {change.toFixed(2)}</span>
              </div>
            )}
            {change !== null && change < 0 && (
              <div className="mt-1 flex justify-between text-sm">
                <span className="text-gray-400">Falta</span>
                <span className="font-bold text-red-400">S/ {Math.abs(change).toFixed(2)}</span>
              </div>
            )}
          </div>
          <Button size="lg" onClick={confirmNew}>Confirmar venta</Button>
          <Button variant="ghost" onClick={() => setShowNewForm(false)}>Volver</Button>
        </div>
      ) : selected ? (
        <div className="flex flex-col gap-3">
          <Card>
            <p className="text-lg font-bold">{selected.name}</p>
            <p className="text-sm text-gray-500">
              {[selected.size && `Talla: ${selected.size}`, selected.color && `Color: ${selected.color}`].filter(Boolean).join(' · ') || 'Sin talla/color'}
            </p>
            <p className="text-sm text-gray-500">{selected.quantity} disponibles · S/ {selected.price.toFixed(2)} c/u</p>
          </Card>
          <Input label="Cantidad" type="number" value={qty} onChange={(e) => setQty(e.target.value)} />
          <div>
            <p className="mb-1 text-sm font-semibold text-gold">Método de pago</p>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENTS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setMethod(p.id)}
                  className={`rounded-xl border px-2 py-3 text-sm font-bold ${method === p.id ? 'border-gold bg-gold text-black' : 'border-gold/30 bg-night text-gray-300'}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <Input label="Con cuánto paga (S/)" type="number" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} placeholder="Ej: 50.00" />
          <div className="rounded-xl border border-gold/20 bg-night p-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Total</span>
              <span className="font-bold text-gold">S/ {total.toFixed(2)}</span>
            </div>
            {change !== null && change >= 0 && (
              <div className="mt-1 flex justify-between text-sm">
                <span className="text-gray-400">Vuelto</span>
                <span className="font-bold text-green-400">S/ {change.toFixed(2)}</span>
              </div>
            )}
            {change !== null && change < 0 && (
              <div className="mt-1 flex justify-between text-sm">
                <span className="text-gray-400">Falta</span>
                <span className="font-bold text-red-400">S/ {Math.abs(change).toFixed(2)}</span>
              </div>
            )}
          </div>
          <Button size="lg" onClick={confirmExisting}>Confirmar venta</Button>
          <Button variant="ghost" onClick={() => setSelected(null)}>Elegir otro producto</Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex max-h-64 flex-col gap-2 overflow-auto">
            {(products ?? []).map(({ product, variant }) => (
              <button
                key={variant.id}
                className="flex items-center justify-between rounded-xl border border-gold/20 bg-night p-3 text-left"
                onClick={() => setSelected({ variantId: variant.id, name: product.name, price: product.price, size: variant.size, color: variant.color, quantity: variant.quantity })}
              >
                <span>
                  <span className="block font-bold">{product.name}</span>
                  <span className="text-sm text-gray-500">
                    {[variant.size && `Talla: ${variant.size}`, variant.color && `Color: ${variant.color}`].filter(Boolean).join(' · ') || 'Sin talla/color'}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block font-bold text-gold">S/ {product.price.toFixed(2)}</span>
                  <span className="text-xs text-gray-500">{variant.quantity} disp.</span>
                </span>
              </button>
            ))}
          </div>
          <Button variant="secondary" onClick={() => setShowNewForm(true)}>
            + Producto nuevo
          </Button>
        </div>
      )}
    </Modal>
  )
}
