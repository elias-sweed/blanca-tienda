import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { useToast } from '../components/ui/Toast'
import { db } from '../lib/db'
import { registerSale } from '../services/sales'
import { newId } from '../utils/ids'
import beepSound from '../assets/Sounds/Warning/Beep.mp3'

const PAYMENTS = [
  { id: 'efectivo', label: 'Efectivo' },
  { id: 'yape', label: 'Yape' },
  { id: 'plin', label: 'Plin' },
] as const

interface CartItem {
  variantId: string
  name: string
  price: number
  size?: string
  color?: string
  quantity: number
  available: number
}

export default function Ventas() {
  const { show } = useToast()
  const navigate = useNavigate()
  const [cart, setCart] = useState<CartItem[]>([])
  const [openCart, setOpenCart] = useState(false)
  const [openNew, setOpenNew] = useState(false)
  const [showOpenCashReminder, setShowOpenCashReminder] = useState(false)
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Consulta si hay una caja abierta
  const openRegister = useLiveQuery(async () => {
    const regs = await db.cashRegisters.where('status').equals('abierta').toArray()
    return { register: regs.sort((a, b) => a.openedAt.localeCompare(b.openedAt))[0] ?? null }
  }, [])

  const cashOpen = openRegister?.register != null

  // Al entrar a Ventas: si no hay caja abierta, mostrar el modal de aviso con sonido
  useEffect(() => {
    if (cashOpen) {
      setShowOpenCashReminder(false)
      return
    }
    const skip = localStorage.getItem('ventas-saltar-aviso-caja')
    if (skip === '1') return
    setShowOpenCashReminder(true)
    // Reproducir sonido de advertencia
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(beepSound)
      }
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(() => {})
    } catch {}
  }, [cashOpen])

  const products = useLiveQuery(async () => {
    const all = await db.products.filter((p) => p.active && !p.deleted).toArray()
    const variants = await db.productVariants.toArray()
    return all.flatMap((p) =>
      variants.filter((v) => v.productId === p.id).map((v) => ({ product: p, variant: v })),
    )
  }, [])

  type Item = NonNullable<typeof products>[number]

  const outOfStock: Item[] = (products ?? []).filter(({ variant }) => variant.quantity <= 0)
  const inStock: Item[] = (products ?? []).filter(({ variant }) => variant.quantity > 0)

  const categories = inStock.reduce<{ category: string; items: Item[] }[]>((acc, item) => {
    const cat = item.product.category || 'Sin categoría'
    const existing = acc.find((a) => a.category === cat)
    if (existing) existing.items.push(item)
    else acc.push({ category: cat, items: [item] })
    return acc
  }, [])

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  function addToCart(item: Item) {
    const existing = cart.find((c) => c.variantId === item.variant.id)
    if (existing) {
      if (existing.quantity >= item.variant.quantity) return
      setCart(cart.map((c) => c.variantId === item.variant.id ? { ...c, quantity: c.quantity + 1 } : c))
    } else {
      if (item.variant.quantity <= 0) return
      setCart([...cart, {
        variantId: item.variant.id,
        name: item.product.name,
        price: item.product.price,
        size: item.variant.size,
        color: item.variant.color,
        quantity: 1,
        available: item.variant.quantity,
      }])
    }
  }

  function removeFromCart(variantId: string) {
    setCart(cart.filter((c) => c.variantId !== variantId))
  }

  function updateCartQty(variantId: string, qty: number) {
    if (qty <= 0) {
      removeFromCart(variantId)
      return
    }
    const item = cart.find((c) => c.variantId === variantId)
    if (!item) return
    if (qty > item.available) {
      show(`Ya no hay más disponibles. Solo quedan ${item.available}. Agrega más en Inventario.`, 'error')
      return
    }
    setCart(cart.map((c) => c.variantId === variantId ? { ...c, quantity: qty } : c))
  }

  return (
    <AppLayout title="Ventas">
      {/* Modal de aviso de caja cerrada al entrar a Ventas */}
      {showOpenCashReminder && !cashOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-3xl border border-line-strong bg-raised p-6 shadow-2xl shadow-black/80">
            <div className="flex flex-col items-center gap-4 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-danger/15 text-3xl">💰</span>
              <div>
                <p className="text-xl font-bold text-fg">Antes de vender, abre la caja</p>
                <p className="mt-2 text-sm text-fg-mute">
                  La caja guarda las ventas del día. Ábrela para empezar a vender. Tus ventas se anotan solas, no tienes que escribir nada.
                </p>
              </div>
              <Button
                size="lg"
                className="w-full"
                onClick={() => {
                  if (dontShowAgain) {
                    localStorage.setItem('ventas-saltar-aviso-caja', '1')
                  }
                  setShowOpenCashReminder(false)
                  navigate('/caja', { state: { fromVentas: true } })
                }}
              >
                Abrir caja
              </Button>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-fg-mute">
                <input
                  type="checkbox"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="h-4 w-4 accent-ruby"
                />
                No mostrar de nuevo
              </label>
            </div>
          </div>
        </div>
      )}

      <div className="mb-4">
        <Button size="lg" className="w-full" onClick={() => setOpenNew(true)}>
          + Producto nuevo
        </Button>
      </div>

      {categories.length === 0 && outOfStock.length === 0 && (
        <EmptyState title="No hay productos" description="Agrega un producto para empezar a vender." />
      )}

      {categories.map(({ category, items }) => (
        <div key={category} className="mb-6">
          <h2 className="mb-2 text-lg font-bold text-fg">{category}</h2>
          <div className="grid grid-cols-2 gap-3">
            {items.map(({ product, variant }) => (
              <Card key={variant.id} className="flex flex-col">
                <p className="font-bold">{product.name}</p>
                <p className="text-sm text-fg-mute">
                  {[variant.size && `Talla: ${variant.size}`, variant.color && `Color: ${variant.color}`].filter(Boolean).join(' · ') || 'Sin talla/color'}
                </p>
                <p className="mt-1 text-lg font-bold text-ruby-text">S/ {product.price.toFixed(2)}</p>
                <p className="text-xs text-fg-mute">{variant.quantity} disponibles</p>
                <Button
                  size="md"
                  className="mt-2 w-full"
                  onClick={() => addToCart({ product, variant })}
                >
                  Agregar
                </Button>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {outOfStock.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-2 flex items-center gap-2 text-lg font-bold text-danger">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-danger text-sm font-bold text-bg">!</span>
            Agotado
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {outOfStock.map(({ product, variant }) => (
              <Card key={variant.id} className="flex flex-col opacity-60">
                <p className="font-bold">{product.name}</p>
                <p className="text-sm text-fg-mute">
                  {[variant.size && `Talla: ${variant.size}`, variant.color && `Color: ${variant.color}`].filter(Boolean).join(' · ') || 'Sin talla/color'}
                </p>
                <p className="mt-1 text-lg font-bold text-fg-mute">S/ {product.price.toFixed(2)}</p>
                <p className="text-xs text-danger">No disponible</p>
                <Button
                  size="md"
                  className="mt-2 w-full"
                  disabled
                >
                  Agregar
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Floating Cart Button */}
      <button
        onClick={() => setOpenCart(true)}
        className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-2xl shadow-lg shadow-black/70 ring-1 ring-accent-text/50 transition active:scale-95"
        aria-label="Abrir carrito"
      >
        🛒
        {cartCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-danger text-xs font-bold text-bg">
            {cartCount}
          </span>
        )}
      </button>

      <NewProductModal open={openNew} onClose={() => setOpenNew(false)} onNeedCash={() => setShowOpenCashReminder(true)} />
      <CartModal
        open={openCart}
        onClose={() => setOpenCart(false)}
        cart={cart}
        total={cartTotal}
        onUpdateQty={updateCartQty}
        onRemove={removeFromCart}
        onClear={() => setCart([])}
        onNeedCash={() => setShowOpenCashReminder(true)}
      />


    </AppLayout>
  )
}

interface DraftProduct {
  key: string
  name: string
  price: string
  size: string
  color: string
  category: string
  quantity: string
}

function NewProductModal({ open, onClose, onNeedCash }: { open: boolean; onClose: () => void; onNeedCash: () => void }) {
  const { show } = useToast()
  const [drafts, setDrafts] = useState<DraftProduct[]>([])
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [size, setSize] = useState('')
  const [color, setColor] = useState('')
  const [category, setCategory] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [method, setMethod] = useState<(typeof PAYMENTS)[number]['id']>('efectivo')
  const [amountPaid, setAmountPaid] = useState('')

  const total = drafts.reduce((sum, d) => sum + (Number(d.price) || 0) * (Number(d.quantity) || 0), 0)
  const paid = Number(amountPaid) || 0
  const change = paid > 0 ? paid - total : null
  const insufficientPayment = paid > 0 && paid < total

  function clearForm() {
    setName(''); setPrice(''); setSize(''); setColor(''); setCategory(''); setQuantity('1')
    setEditingKey(null)
  }

  function validateForm() {
    if (!name.trim()) return show('Escribe el nombre del producto', 'error')
    const p = Number(price)
    if (!p || p <= 0) return show('Escribe un precio válido', 'error')
    const n = Number(quantity)
    if (!n || n <= 0) return show('Cantidad inválida', 'error')
    return true
  }

  function addDraft() {
    if (!validateForm()) return
    setDrafts([...drafts, { key: newId(), name: name.trim(), price, size, color, category, quantity }])
    clearForm()
  }

  function copyLastDraft() {
    const last = drafts[drafts.length - 1]
    if (!last) return
    setEditingKey(null)
    setFormOpen(true)
    setName(last.name); setPrice(last.price); setSize(last.size)
    setCategory(last.category); setQuantity(last.quantity)
    setColor('')
  }

  function startEdit(d: DraftProduct) {
    setEditingKey(d.key)
    setFormOpen(true)
    setName(d.name); setPrice(d.price); setSize(d.size)
    setColor(d.color); setCategory(d.category); setQuantity(d.quantity)
  }

  function updateDraft() {
    if (!editingKey) return
    if (!validateForm()) return
    setDrafts(drafts.map((d) => d.key === editingKey ? { ...d, name: name.trim(), price, size, color, category, quantity } : d))
    clearForm()
  }

  function removeDraft(key: string) {
    setDrafts(drafts.filter((d) => d.key !== key))
    if (editingKey === key) clearForm()
  }

  async function save() {
    if (drafts.length === 0) return show('Agrega al menos un producto', 'error')
    try {
      await registerSale({
        lines: drafts.map((d) => ({
          newProduct: {
            name: d.name,
            price: Number(d.price),
            size: d.size,
            color: d.color,
            category: d.category,
          },
          quantity: Number(d.quantity) || 0,
        })),
        paymentMethod: method,
        amountPaid: paid || undefined,
      })
      show(`${drafts.length} producto(s) agregado(s) y vendido(s)`)
      setDrafts([])
      clearForm()
      setMethod('efectivo'); setAmountPaid('')
      onClose()
    } catch (e) {
      if (e instanceof Error && e.message.includes('caja')) {
        onNeedCash()
      } else {
        show(e instanceof Error ? e.message : 'No se pudo guardar', 'error')
      }
    }
  }

  return (
    <Modal open={open} title="Agregar productos y vender" onClose={onClose}>
      <div className="flex max-h-[75vh] flex-col gap-3 overflow-y-auto">
        {drafts.length > 0 && (
          <div className="flex flex-col gap-2">
            {drafts.map((d) => (
              <div
                key={d.key}
                className={`flex items-center justify-between gap-2 rounded-xl border p-2.5 ${
                  editingKey === d.key ? 'border-ruby-text bg-ruby/20' : 'border-line bg-inset'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{d.name}</p>
                  <p className="truncate text-xs text-fg-mute">
                    S/ {Number(d.price).toFixed(2)} × {d.quantity}
                    {[d.size && ` · Talla ${d.size}`, d.color && ` · ${d.color}`].filter(Boolean).join('')}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <span className="mr-1 whitespace-nowrap text-sm font-bold text-ruby-text">
                    S/ {((Number(d.price) || 0) * (Number(d.quantity) || 0)).toFixed(2)}
                  </span>
                  <button
                    onClick={() => startEdit(d)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-line-strong text-accent-text transition hover:bg-accent/20 active:scale-95"
                    aria-label="Editar producto"
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => removeDraft(d.key)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-danger/40 text-danger transition hover:bg-danger/15 active:scale-95"
                    aria-label="Eliminar producto"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {drafts.length > 0 && (
          <Button variant="secondary" size="md" onClick={copyLastDraft}>
            Copiar datos del último producto
          </Button>
        )}

        <div className="flex flex-col rounded-xl border border-line bg-inset">
          <button
            onClick={() => setFormOpen(!formOpen)}
            className="flex items-center justify-between p-3 text-left"
          >
            <span className="font-bold text-fg">
              {editingKey ? 'Editar producto' : '+ Producto nuevo'}
            </span>
            <span className="text-lg leading-none text-accent-text">{formOpen ? '▾' : '▸'}</span>
          </button>

          {formOpen && (
            <div className="flex flex-col gap-2 p-3 pt-0">
              <Input label="Nombre del producto" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Polo básico" />
              <div className="grid grid-cols-2 gap-2">
                <Input label="Precio (S/)" type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
                <Input label="Cantidad" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input label="Talla" value={size} onChange={(e) => setSize(e.target.value)} placeholder="M" />
                <Input label="Color (opcional)" value={color} onChange={(e) => setColor(e.target.value)} placeholder="Negro" />
              </div>
              <Input label="Categoría (opcional)" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ej: Polos" />
              <div className="flex gap-2">
                <Button variant="secondary" size="md" className="flex-1" onClick={editingKey ? updateDraft : addDraft}>
                  {editingKey ? 'Guardar cambios' : '+ Agregar producto'}
                </Button>
                {editingKey && (
                  <Button variant="ghost" size="md" onClick={clearForm}>Cancelar</Button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-line pt-3">
          <div className="rounded-xl border border-line bg-inset p-3">
            <div className="flex justify-between text-lg font-bold">
              <span className="text-fg-soft">Total</span>
              <span className="text-ruby-text">S/ {total.toFixed(2)}</span>
            </div>
          </div>

          <div>
            <p className="mb-1 text-sm font-semibold text-fg-soft">Método de pago</p>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENTS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setMethod(p.id)}
                  className={`rounded-xl border px-2 py-3 text-sm font-bold transition ${
                    method === p.id
                      ? 'border-accent-text bg-accent text-fg'
                      : 'border-line bg-inset text-fg-mute hover:border-line-strong hover:text-fg-soft'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <Input label="Con cuánto paga (S/)" type="number" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} placeholder="Ej: 50.00" />

          {insufficientPayment && (
            <div className="rounded-xl border border-danger/40 bg-danger/10 p-3">
              <p className="text-center text-sm font-bold text-danger">
                El monto es menor al total. Faltan S/ {(total - paid).toFixed(2)}
              </p>
            </div>
          )}

          {change !== null && change >= 0 && !insufficientPayment && (
            <div className="rounded-xl border border-cta-text/40 bg-cta/15 p-3">
              <div className="flex justify-between text-sm">
                <span className="text-fg-soft">Vuelto</span>
                <span className="font-bold text-cta-text">S/ {change.toFixed(2)}</span>
              </div>
            </div>
          )}

          <Button size="lg" onClick={save} disabled={drafts.length === 0 || insufficientPayment}>
            Confirmar venta
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function CartModal({ open, onClose, cart, total, onUpdateQty, onRemove, onClear, onNeedCash }: {
  open: boolean
  onClose: () => void
  cart: CartItem[]
  total: number
  onUpdateQty: (variantId: string, qty: number) => void
  onRemove: (variantId: string) => void
  onClear: () => void
  onNeedCash: () => void
}) {
  const { show } = useToast()
  const [method, setMethod] = useState<(typeof PAYMENTS)[number]['id']>('efectivo')
  const [amountPaid, setAmountPaid] = useState('')

  const paid = Number(amountPaid) || 0
  const change = paid > 0 ? paid - total : null
  const insufficientPayment = paid > 0 && paid < total

  async function confirmSale() {
    if (cart.length === 0) return
    try {
      await registerSale({
        lines: cart.map((item) => ({ variantId: item.variantId, quantity: item.quantity })),
        paymentMethod: method,
        amountPaid: paid || undefined,
      })
      show('Venta registrada')
      onClear()
      setAmountPaid('')
      setMethod('efectivo')
      onClose()
    } catch (e) {
      if (e instanceof Error && e.message.includes('caja')) {
        onNeedCash()
      } else {
        show(e instanceof Error ? e.message : 'No se pudo registrar', 'error')
      }
    }
  }

  return (
    <Modal open={open} title="Carrito" onClose={onClose}>
      <div className="flex flex-col gap-3">
        {cart.length === 0 && <EmptyState title="Carrito vacío" description="Agrega productos al carrito." />}
        {cart.map((item) => (
          <Card key={item.variantId}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold">{item.name}</p>
                <p className="text-sm text-fg-mute">
                  {[item.size && `Talla: ${item.size}`, item.color && `Color: ${item.color}`].filter(Boolean).join(' · ') || 'Sin talla/color'}
                </p>
                <p className="text-sm text-fg-mute">S/ {item.price.toFixed(2)} c/u</p>
                <p className="mt-1 inline-block rounded-full bg-accent/20 px-2 py-0.5 text-xs font-bold text-accent-text">
                  {item.available} unidades
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => onUpdateQty(item.variantId, item.quantity - 1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-line-strong bg-raised font-bold text-accent-text transition hover:bg-accent/20">-</button>
                <span className="w-8 text-center font-bold">{item.quantity}</span>
                <button onClick={() => onUpdateQty(item.variantId, item.quantity + 1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-line-strong bg-raised font-bold text-accent-text transition hover:bg-accent/20">+</button>
                <button onClick={() => onRemove(item.variantId)} className="ml-2 text-sm text-danger hover:underline">Eliminar</button>
              </div>
            </div>
          </Card>
        ))}

        {cart.length > 0 && (
          <>
            <div className="rounded-xl border border-line bg-inset p-3">
              <div className="flex justify-between text-lg font-bold">
                <span className="text-fg-soft">Total</span>
                <span className="text-ruby-text">S/ {total.toFixed(2)}</span>
              </div>
            </div>

            <div>
              <p className="mb-1 text-sm font-semibold text-fg-soft">Método de pago</p>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENTS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setMethod(p.id)}
                    className={`rounded-xl border px-2 py-3 text-sm font-bold transition ${
                      method === p.id
                        ? 'border-accent-text bg-accent text-fg'
                        : 'border-line bg-inset text-fg-mute hover:border-line-strong hover:text-fg-soft'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <Input label="Con cuánto paga (S/)" type="number" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} placeholder="Ej: 50.00" />

            {insufficientPayment && (
              <div className="rounded-xl border border-danger/40 bg-danger/10 p-3">
                <p className="text-center text-sm font-bold text-danger">
                  El monto es menor al total. Faltan S/ {(total - paid).toFixed(2)}
                </p>
              </div>
            )}

            {change !== null && change >= 0 && !insufficientPayment && (
              <div className="rounded-xl border border-cta-text/40 bg-cta/15 p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-fg-soft">Vuelto</span>
                  <span className="font-bold text-cta-text">S/ {change.toFixed(2)}</span>
                </div>
              </div>
            )}

            <Button size="lg" onClick={confirmSale} disabled={insufficientPayment}>
              Confirmar venta
            </Button>
          </>
        )}
      </div>
    </Modal>
  )
}
