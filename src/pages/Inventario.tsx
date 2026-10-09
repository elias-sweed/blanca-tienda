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
import { addStock, createProduct } from '../services/inventory'

export default function Inventario() {
  const { show } = useToast()
  const [search, setSearch] = useState('')
  const [openNew, setOpenNew] = useState(false)
  const [entryFor, setEntryFor] = useState<{ variantId: string; name: string } | null>(null)

  const products = useLiveQuery(async () => {
    const all = await db.products.filter((p) => p.active).toArray()
    const variants = await db.productVariants.toArray()
    return all.map((p) => {
      const vs = variants.filter((v) => v.productId === p.id)
      return { product: p, variants: vs, quantity: vs.reduce((s, v) => s + v.quantity, 0) }
    })
  }, [])

  const filtered = (products ?? []).filter((p) =>
    p.product.name.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <AppLayout title="Inventario">
      <Button size="lg" className="mb-4" onClick={() => setOpenNew(true)}>
        + Agregar producto
      </Button>

      <Input label="Buscar producto" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ej: polo negro" />

      <div className="mt-4 flex flex-col gap-3">
        {filtered.length === 0 && (
          <EmptyState title="No hay productos" description="Agrega tu primer producto para empezar." />
        )}
        {filtered.map(({ product, variants, quantity }) => (
          <Card key={product.id}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold">{product.name}</p>
                <p className="text-sm text-muted/80">
                  {variants.map((v) => [v.size && `Talla: ${v.size}`, v.color && `Color: ${v.color}`].filter(Boolean).join(' · ')).join(', ') || 'Sin talla/color'}
                </p>
              </div>
              <div className="text-right">
                <p className={`text-2xl font-bold ${quantity <= product.stockMin ? 'text-red-400' : 'text-gold'}`}>{quantity}</p>
                <p className="text-xs text-muted/80">disponibles</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-sm text-muted">
              <span>Precio: S/ {product.price.toFixed(2)}</span>
              {quantity <= product.stockMin && <span className="text-red-400">Poco stock</span>}
            </div>
            {variants[0] && (
              <Button
                variant="secondary"
                className="mt-3 w-full"
                onClick={() => setEntryFor({ variantId: variants[0].id, name: product.name })}
              >
                + Agregar stock
              </Button>
            )}
          </Card>
        ))}
      </div>

      <NewProductModal open={openNew} onClose={() => setOpenNew(false)} onCreated={() => show('Producto agregado')} />
      <EntryModal
        target={entryFor}
        onClose={() => setEntryFor(null)}
        onDone={() => {
          show('Stock agregado')
          setEntryFor(null)
        }}
      />
    </AppLayout>
  )
}

function NewProductModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const { show } = useToast()
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [size, setSize] = useState('')
  const [color, setColor] = useState('')
  const [quantity, setQuantity] = useState('0')
  const [stockMin, setStockMin] = useState('0')

  async function save() {
    if (!name.trim()) return show('Escribe el nombre', 'error')
    const p = Number(price)
    if (!p || p <= 0) return show('Escribe un precio válido', 'error')
    try {
      await createProduct({ name, price: p, size, color, quantity: Number(quantity) || 0, stockMin: Number(stockMin) || 0 })
      onCreated()
      onClose()
      setName(''); setPrice(''); setSize(''); setColor(''); setQuantity('0'); setStockMin('0')
    } catch {
      show('No se pudo guardar', 'error')
    }
  }

  return (
    <Modal open={open} title="Agregar producto" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <Input label="Nombre del producto" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Polo básico" />
        <Input label="Precio de venta (S/)" type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Talla" value={size} onChange={(e) => setSize(e.target.value)} placeholder="M" />
          <Input label="Color" value={color} onChange={(e) => setColor(e.target.value)} placeholder="Negro" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Cantidad inicial" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          <Input label="Stock mínimo" type="number" value={stockMin} onChange={(e) => setStockMin(e.target.value)} />
        </div>
        <Button size="lg" onClick={save}>Guardar</Button>
      </div>
    </Modal>
  )
}

function EntryModal({ target, onClose, onDone }: { target: { variantId: string; name: string } | null; onClose: () => void; onDone: () => void }) {
  const { show } = useToast()
  const [qty, setQty] = useState('1')

  async function save() {
    const n = Number(qty)
    if (!n || n <= 0) return show('Cantidad inválida', 'error')
    try {
      if (target) await addStock(target.variantId, n)
      onDone()
      setQty('1')
    } catch {
      show('No se pudo registrar', 'error')
    }
  }

  return (
    <Modal open={!!target} title={`Agregar stock: ${target?.name ?? ''}`} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <Input label="Cantidad que ingresa" type="number" value={qty} onChange={(e) => setQty(e.target.value)} />
        <Button size="lg" onClick={save}>Agregar stock</Button>
      </div>
    </Modal>
  )
}
