import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { AppLayout } from '../components/layout/AppLayout'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { StepperInput } from '../components/ui/StepperInput'
import { useToast } from '../components/ui/Toast'
import { db } from '../lib/db'
import { addStock, addVariant, adjustStock, createProduct, type ProductVariantInput } from '../services/inventory'
import type { Product, ProductVariant } from '../types/models'

interface VariantDraft {
  key: string
  size: string
  color: string
  quantity: string
}

function newDraft(): VariantDraft {
  return { key: crypto.randomUUID(), size: '', color: '', quantity: '0' }
}

function describeVariant(v: ProductVariant): string {
  return [v.size && `Talla ${v.size}`, v.color].filter(Boolean).join(' · ') || 'Única'
}

export default function Inventario() {
  const { show } = useToast()
  const [search, setSearch] = useState('')
  const [openNew, setOpenNew] = useState(false)
  const [entryFor, setEntryFor] = useState<ProductVariant | null>(null)
  const [adjustFor, setAdjustFor] = useState<ProductVariant | null>(null)
  const [variantFor, setVariantFor] = useState<Product | null>(null)
  const [showInactive, setShowInactive] = useState(false)

  const products = useLiveQuery(async () => {
    const all = await db.products.toArray()
    const variants = await db.productVariants.toArray()
    return all
      .filter((p) => (showInactive ? true : p.active && !p.deleted))
      .map((p) => {
        const vs = variants.filter((v) => v.productId === p.id)
        return { product: p, variants: vs, quantity: vs.reduce((s, v) => s + v.quantity, 0) }
      })
      .sort((a, b) => a.product.name.localeCompare(b.product.name))
  }, [showInactive])

  const term = search.trim().toLowerCase()
  const filtered = (products ?? []).filter(({ product, variants }) =>
    !term ||
    product.name.toLowerCase().includes(term) ||
    variants.some((v) => (v.color ?? '').toLowerCase().includes(term)),
  )

  const inactiveCount = (products ?? []).filter((p) => !p.product.active || p.product.deleted).length

  return (
    <AppLayout title="Inventario">
      <Button size="lg" className="mb-4" onClick={() => setOpenNew(true)}>
        + Agregar producto
      </Button>

      <Input label="Buscar producto" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ej: polo negro" />

      {inactiveCount > 0 && (
        <button
          onClick={() => setShowInactive(!showInactive)}
          className="mt-3 text-xs font-semibold text-fg-mute transition-colors duration-150 hover:text-fg-soft"
        >
          {showInactive ? 'Ocultar' : 'Mostrar'} productos dados de baja ({inactiveCount})
        </button>
      )}

      <div className="mt-4 flex flex-col gap-3">
        {filtered.length === 0 && (
          <EmptyState title="No hay productos" description="Agrega tu primer producto para empezar." />
        )}
        {filtered.map(({ product, variants, quantity }) => {
          const inactivo = !product.active || product.deleted
          const bajo = quantity <= product.stockMin
          return (
            <Card key={product.id} className={inactivo ? 'opacity-60' : ''}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-lg font-bold">{product.name}</p>
                  <p className="text-sm text-fg-mute">
                    {variants.length > 0 ? `${variants.length} ${variants.length === 1 ? 'variante' : 'variantes'}` : 'Sin variantes'}
                    {product.category ? ` · ${product.category}` : ''}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={`text-2xl font-bold ${bajo ? 'text-danger' : 'text-ruby-text'}`}>{quantity}</p>
                  <p className="text-xs text-fg-mute">disponibles</p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-sm text-fg-soft">
                <span>Precio: S/ {product.price.toFixed(2)}</span>
                {inactivo ? (
                  <span className="text-fg-mute">Dado de baja</span>
                ) : bajo ? (
                  <span className="text-danger">Poco stock</span>
                ) : (
                  <span className="text-fg-mute">Mín. {product.stockMin}</span>
                )}
              </div>

              {variants.length > 0 && (
                <div className="mt-3 flex flex-col gap-2 border-t border-line pt-3">
                  {variants.map((v) => (
                    <div key={v.id} className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-fg-soft">{describeVariant(v)}</p>
                        <p className={`text-xs ${v.quantity <= 0 ? 'text-danger' : 'text-fg-mute'}`}>
                          {v.quantity} {v.quantity === 1 ? 'unidad' : 'unidades'}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button variant="secondary" size="md" onClick={() => setEntryFor(v)}>
                          + Stock
                        </Button>
                        <Button variant="ghost" size="md" onClick={() => setAdjustFor(v)}>
                          Ajustar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!inactivo && (
                <Button variant="ghost" size="md" className="mt-3 w-full" onClick={() => setVariantFor(product)}>
                  + Agregar talla / color
                </Button>
              )}
            </Card>
          )
        })}
      </div>

      <NewProductModal open={openNew} onClose={() => setOpenNew(false)} onCreated={() => show('Producto agregado')} />

      <EntryModal
        variant={entryFor}
        onClose={() => setEntryFor(null)}
        onDone={(n) => {
          show(`Se agregaron ${n} ${n === 1 ? 'unidad' : 'unidades'}`)
          setEntryFor(null)
        }}
      />

      <AdjustModal
        variant={adjustFor}
        onClose={() => setAdjustFor(null)}
        onDone={(diff) => {
          show(diff > 0 ? `Stock ajustado +${diff}` : `Stock ajustado ${diff}`)
          setAdjustFor(null)
        }}
      />

      <NewVariantModal
        product={variantFor}
        onClose={() => setVariantFor(null)}
        onDone={() => {
          show('Variante agregada')
          setVariantFor(null)
        }}
      />
    </AppLayout>
  )
}

function NewProductModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const { show } = useToast()
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState('')
  const [drafts, setDrafts] = useState<VariantDraft[]>([newDraft()])
  const [busy, setBusy] = useState(false)

  function reset() {
    setName(''); setPrice(''); setCategory(''); setDrafts([newDraft()])
  }

  function updateDraft(key: string, patch: Partial<VariantDraft>) {
    setDrafts((ds) => ds.map((d) => (d.key === key ? { ...d, ...patch } : d)))
  }

  async function save() {
    if (!name.trim()) return show('Escribe el nombre', 'error')
    const p = Number(price)
    if (!p || p <= 0) return show('Escribe un precio válido', 'error')

    const variants: ProductVariantInput[] = drafts
      .filter((d) => d.size.trim() || d.color.trim() || Number(d.quantity) > 0)
      .map((d) => ({ size: d.size, color: d.color, quantity: Number(d.quantity) || 0 }))

    if (variants.length === 0) variants.push({ quantity: 0 })

    setBusy(true)
    try {
      await createProduct({ name, price: p, category, variants })
      onCreated()
      onClose()
      reset()
    } catch (e) {
      show(e instanceof Error ? e.message : 'No se pudo guardar', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} title="Agregar producto" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <Input label="Nombre del producto" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Polo básico" />

        <StepperInput
          label="Precio de Venta"
          value={price}
          onChange={setPrice}
          onInvalid={() => show('Aquí solo van números, no se aceptan letras', 'error')}
          prefix="S/"
          step={1}
          decimal
          placeholder="0.00"
        />

        <Input label="Categoría (opcional)" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Polos" />

        <div className="flex flex-col rounded-xl border border-line bg-inset">
          <div className="flex items-center justify-between border-b border-line p-3">
            <span className="font-bold text-fg">Tallas y colores</span>
            <button
              onClick={() => setDrafts((ds) => [...ds, newDraft()])}
              className="text-sm font-bold text-accent-text transition-colors duration-150 hover:text-accent"
            >
              + Agregar
            </button>
          </div>

          <div className="flex flex-col gap-2 p-3">
            {drafts.map((d, i) => (
              <div key={d.key} className="flex flex-col gap-2">
                {i > 0 && <div className="border-t border-line pt-2" />}
                <div className="grid grid-cols-2 gap-2">
                  <Input label="Talla" value={d.size} onChange={(e) => updateDraft(d.key, { size: e.target.value })} placeholder="M" />
                  <Input label="Color" value={d.color} onChange={(e) => updateDraft(d.key, { color: e.target.value })} placeholder="Negro" />
                </div>
                <StepperInput
                  label="Cantidad inicial"
                  value={d.quantity}
                  onChange={(v) => updateDraft(d.key, { quantity: v })}
                  onInvalid={() => show('Aquí solo van números, no se aceptan letras', 'error')}
                  step={1}
                  min={0}
                  allowEmpty
                  placeholder="Ej: 5"
                />
                {drafts.length > 1 && (
                  <button
                    onClick={() => setDrafts((ds) => ds.filter((x) => x.key !== d.key))}
                    className="self-start text-xs font-bold text-danger"
                  >
                    Quitar esta talla
                  </button>
                )}
              </div>
            ))}
            <p className="text-xs text-fg-mute">Deja la talla y el color vacíos si el producto no los usa.</p>
          </div>
        </div>

        <Button size="lg" onClick={save} disabled={busy}>Guardar</Button>
      </div>
    </Modal>
  )
}

function EntryModal({ variant, onClose, onDone }: {
  variant: ProductVariant | null
  onClose: () => void
  onDone: (n: number) => void
}) {
  const { show } = useToast()
  const [qty, setQty] = useState('1')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  async function save() {
    const n = Number(qty)
    if (!Number.isFinite(n) || n <= 0) return show('Cantidad inválida', 'error')
    setBusy(true)
    try {
      if (variant) await addStock(variant.id, n, note.trim() || undefined)
      onDone(n)
      setQty('1')
      setNote('')
    } catch (e) {
      show(e instanceof Error ? e.message : 'No se pudo registrar', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={!!variant} title={`Agregar stock: ${variant ? describeVariant(variant) : ''}`} onClose={onClose}>
      <div className="flex flex-col gap-3">
        {variant && (
          <div className="rounded-xl border border-line bg-inset p-3">
            <div className="flex justify-between text-sm">
              <span className="text-fg-soft">Stock actual</span>
              <span className="font-bold text-ruby-text">{variant.quantity}</span>
            </div>
          </div>
        )}
        <Input label="Cantidad que ingresa" type="number" value={qty} onChange={(e) => setQty(e.target.value)} />
        <Input label="Nota (opcional)" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej: Recepción del proveedor" />
        <Button size="lg" onClick={save} disabled={busy}>Agregar stock</Button>
      </div>
    </Modal>
  )
}

function AdjustModal({ variant, onClose, onDone }: {
  variant: ProductVariant | null
  onClose: () => void
  onDone: (diff: number) => void
}) {
  const { show } = useToast()
  const [qty, setQty] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const n = Number(qty)
  const diff = variant && Number.isFinite(n) && qty !== '' ? n - variant.quantity : null

  async function save() {
    if (qty === '' || !Number.isFinite(n) || n < 0) return show('Escribe la cantidad real contada', 'error')
    if (!note.trim()) return show('Escribe el motivo del ajuste', 'error')
    setBusy(true)
    try {
      const result = variant ? await adjustStock(variant.id, n, note) : 0
      onDone(result)
      setQty('')
      setNote('')
    } catch (e) {
      show(e instanceof Error ? e.message : 'No se pudo ajustar', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={!!variant} title={`Ajustar stock: ${variant ? describeVariant(variant) : ''}`} onClose={onClose}>
      <div className="flex flex-col gap-3">
        {variant && (
          <div className="rounded-xl border border-line bg-inset p-3">
            <div className="flex justify-between text-sm">
              <span className="text-fg-soft">Stock registrado</span>
              <span className="font-bold text-ruby-text">{variant.quantity}</span>
            </div>
          </div>
        )}

        <Input
          label="Cantidad real contada"
          type="number"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          placeholder="Ej: 4"
        />

        {diff !== null && diff !== 0 && (
          <div
            className={`rounded-xl border p-3 ${
              diff > 0 ? 'border-cta-text/40 bg-cta/15' : 'border-danger/40 bg-danger/10'
            }`}
          >
            <div className="flex justify-between text-sm">
              <span className="text-fg-soft">Diferencia</span>
              <span className={`font-bold ${diff > 0 ? 'text-cta-text' : 'text-danger'}`}>
                {diff > 0 ? '+' : ''}{diff}
              </span>
            </div>
            <p className="mt-1 text-center text-xs text-fg-mute">
              {diff > 0 ? 'Había menos de lo registrado' : 'Había más de lo registrado'}
            </p>
          </div>
        )}

        <Input
          label="Motivo (obligatorio)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ej: Conteggio físico, mercadería dañada"
        />

        <Button variant="secondary" size="lg" onClick={save} disabled={busy}>Guardar ajuste</Button>
      </div>
    </Modal>
  )
}

function NewVariantModal({ product, onClose, onDone }: {
  product: Product | null
  onClose: () => void
  onDone: () => void
}) {
  const { show } = useToast()
  const [size, setSize] = useState('')
  const [color, setColor] = useState('')
  const [qty, setQty] = useState('0')
  const [busy, setBusy] = useState(false)

  async function save() {
    if (!size.trim() && !color.trim()) return show('Escribe al menos la talla o el color', 'error')
    const n = Number(qty)
    if (!Number.isFinite(n) || n < 0) return show('Cantidad inválida', 'error')
    setBusy(true)
    try {
      if (product) await addVariant(product.id, { size, color, quantity: n })
      onDone()
      setSize(''); setColor(''); setQty('0')
    } catch (e) {
      show(e instanceof Error ? e.message : 'No se pudo agregar la variante', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={!!product} title={`Agregar talla a: ${product?.name ?? ''}`} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Talla" value={size} onChange={(e) => setSize(e.target.value)} placeholder="L" />
          <Input label="Color" value={color} onChange={(e) => setColor(e.target.value)} placeholder="Azul" />
        </div>
        <Input label="Cantidad inicial" type="number" value={qty} onChange={(e) => setQty(e.target.value)} />
        <Button size="lg" onClick={save} disabled={busy}>Agregar variante</Button>
      </div>
    </Modal>
  )
}
