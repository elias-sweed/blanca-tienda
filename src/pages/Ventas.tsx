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
  const [cart, setCart] = useState<CartItem[]>([])
  const [openCart, setOpenCart] = useState(false)
  const [openNew, setOpenNew] = useState(false)

  const products = useLiveQuery(async () => {
    const all = await db.products.filter((p) => p.active).toArray()
    const variants = await db.productVariants.toArray()
    return all.flatMap((p) =>
      variants.filter((v) => v.productId === p.id).map((v) => ({ product: p, variant: v })),
    )
  }, [])

  const outOfStock = (products ?? []).filter(({ variant }) => variant.quantity <= 0)
  const inStock = (products ?? []).filter(({ variant }) => variant.quantity > 0)

  const categories = inStock.reduce<{ category: string; items: typeof inStock }>((acc, item) => {
    const cat = item.product.category || 'Sin categoría'
    const existing = acc.find((a) => a.category === cat)
    if (existing) existing.items.push(item)
    else acc.push({ category: cat, items: [item] })
    return acc
  }, [])

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  function addToCart(item: (typeof products)[number]) {
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
      <div className="mb-4">
        <Button size="lg" className="w-full" onClick={() => setOpenNew(true)}>
          + Nuevo producto
        </Button>
      </div>

      {categories.length === 0 && outOfStock.length === 0 && (
        <EmptyState title="No hay productos" description="Agrega un producto para empezar a vender." />
      )}

      {categories.map(({ category, items }) => (
        <div key={category} className="mb-6">
          <h2 className="mb-2 text-lg font-bold text-gold">{category}</h2>
          <div className="grid grid-cols-2 gap-3">
            {items.map(({ product, variant }) => (
              <Card key={variant.id} className="flex flex-col">
                <p className="font-bold">{product.name}</p>
                <p className="text-sm text-gray-500">
                  {[variant.size && `Talla: ${variant.size}`, variant.color && `Color: ${variant.color}`].filter(Boolean).join(' · ') || 'Sin talla/color'}
                </p>
                <p className="mt-1 text-lg font-bold text-gold">S/ {product.price.toFixed(2)}</p>
                <p className="text-xs text-gray-500">{variant.quantity} disponibles</p>
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
          <h2 className="mb-2 flex items-center gap-2 text-lg font-bold text-red-400">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-sm">!</span>
            Agotado
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {outOfStock.map(({ product, variant }) => (
              <Card key={variant.id} className="flex flex-col opacity-60">
                <p className="font-bold">{product.name}</p>
                <p className="text-sm text-gray-500">
                  {[variant.size && `Talla: ${variant.size}`, variant.color && `Color: ${variant.color}`].filter(Boolean).join(' · ') || 'Sin talla/color'}
                </p>
                <p className="mt-1 text-lg font-bold text-gray-500">S/ {product.price.toFixed(2)}</p>
                <p className="text-xs text-red-400">No disponible</p>
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
        className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gold text-2xl shadow-lg shadow-black/40 transition active:scale-95"
      >
        🛒
        {cartCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
            {cartCount}
          </span>
        )}
      </button>

      <NewProductModal open={openNew} onClose={() => setOpenNew(false)} />
      <CartModal
        open={openCart}
        onClose={() => setOpenCart(false)}
        cart={cart}
        total={cartTotal}
        onUpdateQty={updateCartQty}
        onRemove={removeFromCart}
        onClear={() => setCart([])}
      />
    </AppLayout>
  )
}

function NewProductModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { show } = useToast()
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [size, setSize] = useState('')
  const [color, setColor] = useState('')
  const [category, setCategory] = useState('')
  const [quantity, setQuantity] = useState('1')

  async function save() {
    if (!name.trim()) return show('Escribe el nombre del producto', 'error')
    const p = Number(price)
    if (!p || p <= 0) return show('Escribe un precio válido', 'error')
    const n = Number(quantity)
    if (!n || n <= 0) return show('Cantidad inválida', 'error')
    try {
      await createProduct({ name, price: p, size, color, category, quantity: n })
      show('Producto agregado')
      setName(''); setPrice(''); setSize(''); setColor(''); setCategory(''); setQuantity('1')
      onClose()
    } catch {
      show('No se pudo guardar', 'error')
    }
  }

  return (
    <Modal open={open} title="Nuevo producto" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <Input label="Nombre del producto" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Polo básico" />
        <Input label="Precio (S/)" type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Talla" value={size} onChange={(e) => setSize(e.target.value)} placeholder="M" />
          <Input label="Color" value={color} onChange={(e) => setColor(e.target.value)} placeholder="Negro" />
        </div>
        <Input label="Categoría" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ej: Polos, Pantalones" />
        <Input label="Cantidad" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        <Button size="lg" onClick={save}>Guardar</Button>
      </div>
    </Modal>
  )
}

function CartModal({ open, onClose, cart, total, onUpdateQty, onRemove, onClear }: {
  open: boolean
  onClose: () => void
  cart: CartItem[]
  total: number
  onUpdateQty: (variantId: string, qty: number) => void
  onRemove: (variantId: string) => void
  onClear: () => void
}) {
  const { show } = useToast()
  const [method, setMethod] = useState<(typeof PAYMENTS)[number]['id']>('efectivo')
  const [amountPaid, setAmountPaid] = useState('')

  const paid = Number(amountPaid) || 0
  const change = paid > 0 ? paid - total : null
  const insufficientPayment = paid > 0 && paid < total

  async function confirmSale() {
    if (cart.length === 0) return
    if (paid < total) return show('El monto pagado es menor al total', 'error')
    try {
      for (const item of cart) {
        await registerSale({ variantId: item.variantId, quantity: item.quantity, paymentMethod: method, amountPaid: paid || undefined })
      }
      show('Venta registrada')
      onClear()
      setAmountPaid('')
      setMethod('efectivo')
      onClose()
    } catch (e) {
      show(e instanceof Error ? e.message : 'No se pudo registrar', 'error')
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
                <p className="text-sm text-gray-500">
                  {[item.size && `Talla: ${item.size}`, item.color && `Color: ${item.color}`].filter(Boolean).join(' · ') || 'Sin talla/color'}
                </p>
                <p className="text-sm text-gray-500">S/ {item.price.toFixed(2)} c/u</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => onUpdateQty(item.variantId, item.quantity - 1)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface text-gold border border-gold/30 font-bold">-</button>
                <span className="w-8 text-center font-bold">{item.quantity}</span>
                <button onClick={() => onUpdateQty(item.variantId, item.quantity + 1)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface text-gold border border-gold/30 font-bold">+</button>
                <button onClick={() => onRemove(item.variantId)} className="ml-2 text-red-400 text-sm">Eliminar</button>
              </div>
            </div>
          </Card>
        ))}

        {cart.length > 0 && (
          <>
            <div className="rounded-xl border border-gold/20 bg-night p-3">
              <div className="flex justify-between text-lg font-bold">
                <span className="text-gold">Total</span>
                <span className="text-gold">S/ {total.toFixed(2)}</span>
              </div>
            </div>

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

            {insufficientPayment && (
              <div className="rounded-xl border border-red-500/30 bg-red-950/30 p-3">
                <p className="text-center text-sm font-bold text-red-400">
                  El monto es menor al total. Faltan S/ {(total - paid).toFixed(2)}
                </p>
              </div>
            )}

            {change !== null && change >= 0 && !insufficientPayment && (
              <div className="rounded-xl border border-green-500/30 bg-green-950/30 p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Vuelto</span>
                  <span className="font-bold text-green-400">S/ {change.toFixed(2)}</span>
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
