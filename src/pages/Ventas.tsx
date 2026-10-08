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
import { todayISO } from '../utils/ids'

const PAYMENTS = [
  { id: 'efectivo', label: 'Efectivo' },
  { id: 'yape', label: 'Yape' },
  { id: 'plin', label: 'Plin' },
  { id: 'tarjeta', label: 'Tarjeta' },
  { id: 'otro', label: 'Otro' },
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
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<{ variantId: string; name: string; price: number; quantity: number } | null>(null)
  const [qty, setQty] = useState('1')
  const [method, setMethod] = useState<(typeof PAYMENTS)[number]['id']>('efectivo')

  const products = useLiveQuery(async () => {
    const all = await db.products.filter((p) => p.active).toArray()
    const variants = await db.productVariants.toArray()
    return all.flatMap((p) =>
      variants.filter((v) => v.productId === p.id).map((v) => ({ product: p, variant: v })),
    )
  }, [])

  const filtered = (products ?? []).filter(({ product }) =>
    product.name.toLowerCase().includes(search.toLowerCase()),
  )

  const total = selected ? selected.price * (Number(qty) || 0) : 0

  async function confirm() {
    if (!selected) return
    const n = Number(qty)
    if (!n || n <= 0) return show('Cantidad inválida', 'error')
    try {
      await registerSale({ variantId: selected.variantId, quantity: n, paymentMethod: method })
      show('Venta registrada')
      setSelected(null)
      setQty('1')
      setSearch('')
      onClose()
    } catch (e) {
      show(e instanceof Error ? e.message : 'No se pudo registrar', 'error')
    }
  }

  return (
    <Modal open={open} title="Nueva venta" onClose={onClose}>
      {!selected ? (
        <div className="flex flex-col gap-3">
          <Input label="Buscar producto" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ej: polo negro" />
          <div className="flex max-h-64 flex-col gap-2 overflow-auto">
            {filtered.length === 0 && <p className="text-sm text-gray-500">Sin resultados.</p>}
            {filtered.map(({ product, variant }) => (
              <button
                key={variant.id}
                className="flex items-center justify-between rounded-xl border border-gold/20 bg-night p-3 text-left"
                onClick={() => setSelected({ variantId: variant.id, name: product.name, price: product.price, quantity: variant.quantity })}
              >
                <span>
                  <span className="block font-bold">{product.name}</span>
                  <span className="text-sm text-gray-500">{[variant.size, variant.color].filter(Boolean).join(' · ')} · {variant.quantity} disponibles</span>
                </span>
                <span className="font-bold text-gold">S/ {product.price.toFixed(2)}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <Card>
            <p className="text-lg font-bold">{selected.name}</p>
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
          <p className="text-center text-2xl font-bold text-gold">Total: S/ {total.toFixed(2)}</p>
          <Button size="lg" onClick={confirm}>Confirmar venta</Button>
          <Button variant="ghost" onClick={() => setSelected(null)}>Elegir otro producto</Button>
        </div>
      )}
    </Modal>
  )
}
