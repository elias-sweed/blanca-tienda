import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { Input } from '../components/ui/Input'
import { LoadingState } from '../components/ui/LoadingState'
import { LowStockAlert } from '../components/ui/LowStockAlert'
import { Modal, Z_OVERLAY } from '../components/ui/Modal'
import { Portal } from '../components/ui/Portal'
import { SearchBox } from '../components/ui/SearchBox'
import { SuccessState } from '../components/ui/SuccessState'
import { useToast } from '../components/ui/ToastContext'
import { useLowStock } from '../hooks/useLowStock'
import { useQueryState } from '../hooks/useQueryState'
import { db } from '../lib/db'
import { registerSale } from '../services/sales'
import type { Product, ProductVariant } from '../types/models'
import {
  addItem,
  cartCount,
  cartTotal,
  clearCart,
  removeItem,
  setQuantity,
  syncStock,
  type CartItem,
} from '../utils/cart'
import { newId } from '../utils/ids'
import { round2 } from '../utils/money'
import {
  IDLE_PAYMENT,
  canSubmit,
  computeChange,
  paymentReducer,
  submitLabel,
} from '../utils/payment'
import { rankMatches } from '../utils/search'
import { firstError, validateAmount, validateName, validateQuantity, validatePayment } from '../utils/validation'
import beepSound from '../assets/Sounds/Warning/Beep.mp3'

const PAYMENTS = [
  { id: 'efectivo', label: 'Efectivo' },
  { id: 'yape', label: 'Yape' },
  { id: 'plin', label: 'Plin' },
] as const

/** Producto + variante tal como se lista en la pantalla de ventas. */
interface Item {
  product: Product
  variant: ProductVariant
}

export default function Ventas() {
  const { show } = useToast()
  const navigate = useNavigate()
  const [cart, setCart] = useState<CartItem[]>([])
  const [openCart, setOpenCart] = useState(false)
  const [openNew, setOpenNew] = useState(false)
  // Solo se enciende (y se apaga) con acciones de la persona: cerrar el aviso
  // o pedirlo de nuevo desde un modal. La visibilidad real se deriva abajo.
  const [dismissed, setDismissed] = useState(false)
  const [search, setSearch] = useState('')
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Caja abierta. `useQueryState` distingue "cargando" de "falló", así que si
  // la lectura falla no se lanza la alarma de caja cerrada por error.
  const [cashState, cashRetry] = useQueryState(async () => {
    const regs = await db.cashRegisters.where('status').equals('abierta').toArray()
    return regs.sort((a, b) => a.openedAt.localeCompare(b.openedAt))[0] ?? null
  }, [])

  const cashResolved = cashState.status !== 'loading'
  const cashOpen = cashState.status === 'ready' && cashState.data !== null
  const cashFailed = cashState.status === 'error'

  // El aviso se DERIVA de la caja en vez de escribirse desde un efecto: mientras
  // la lectura carga no se avisa, si la base falla tampoco, y en cuanto se sabe
  // que la caja está cerrada aparece solo. Si se abrió, desaparece solo.
  const showOpenCashReminder = cashResolved && !cashFailed && !cashOpen && !dismissed

  // El sonido es lo único externo del aviso: va en el efecto, y solo una vez
  // por visita para no repetir la alarma en cada re-render.
  const beepHechoRef = useRef(false)
  useEffect(() => {
    if (!showOpenCashReminder) {
      beepHechoRef.current = false
      return
    }
    if (beepHechoRef.current) return
    beepHechoRef.current = true

    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(beepSound)
      }
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(() => {
        // Sin audio disponible (permisos o dispositivo sin volumen): el aviso
        // visual sigue funcionando, así que no hace falta frenar nada aquí.
      })
    } catch {
      // Mismo caso: si el navegador bloquea el sonido, la app continúa igual.
    }
  }, [showOpenCashReminder])

  const [productsState, productsRetry] = useQueryState<Item[]>(async () => {
    const all = await db.products.filter((p) => p.active && !p.deleted).toArray()
    const variants = await db.productVariants.toArray()
    return all.flatMap((p) =>
      variants.filter((v) => v.productId === p.id).map((v) => ({ product: p, variant: v })),
    )
  }, [])

  const lowStock = useLowStock()

  // Búsqueda difusa: tolera acentos, mayúsculas y letras fuera de orden.
  const coincidencias = useMemo(
    () =>
      rankMatches(productsState.data ?? [], search, ({ product, variant }) => [
        product.name,
        product.category ?? '',
        variant.size ?? '',
        variant.color ?? '',
      ]),
    [productsState.data, search],
  )

  const hayProductos = (productsState.data ?? []).length > 0

  const outOfStock: Item[] = coincidencias.filter(({ variant }) => variant.quantity <= 0)
  const inStock: Item[] = coincidencias.filter(({ variant }) => variant.quantity > 0)

  const categories = inStock.reduce<{ category: string; items: Item[] }[]>((acc, item) => {
    const cat = item.product.category || 'Sin categoría'
    const existing = acc.find((a) => a.category === cat)
    if (existing) existing.items.push(item)
    else acc.push({ category: cat, items: [item] })
    return acc
  }, [])

  // Últimos productos válidos (se conservan aunque la consulta re-intente).
  const productsData = productsState.data

  /**
   * Carrito ajustado al stock real. Si mientras se armaba otra venta se
   * llevaron unidades (o el producto se dio de baja), se recorta aquí y se
   * avisa con el número verdadero, en lugar de fallar al cobrar.
   */
  function conStockReal(actual: CartItem[]): CartItem[] {
    if (!productsData) return actual
    const stock = new Map(productsData.map(({ variant }) => [variant.id, variant.quantity]))
    const sincronizado = syncStock(actual, stock)
    if (sincronizado.error) show(sincronizado.error, 'warning')
    return sincronizado.cart
  }

  function handleAdd(item: Item) {
    const result = addItem(conStockReal(cart), {
      variantId: item.variant.id,
      name: item.product.name,
      price: item.product.price,
      size: item.variant.size,
      color: item.variant.color,
      available: item.variant.quantity,
    })
    if (result.error) show(result.error, 'warning')
    setCart(result.cart)
  }

  function handleRemove(variantId: string) {
    setCart(removeItem(cart, variantId).cart)
  }

  function handleQty(variantId: string, qty: number) {
    const result = setQuantity(conStockReal(cart), variantId, qty)
    if (result.error) show(result.error, 'warning')
    setCart(result.cart)
  }

  const total = cartTotal(cart)
  const unidades = cartCount(cart)

  return (
    <AppLayout title="Ventas">
      {/* Modal de aviso de caja cerrada al entrar a Ventas */}
      {showOpenCashReminder && (
        <Portal>
          <div
            className="fixed inset-0 flex items-center justify-center bg-black/80"
            style={{ zIndex: Z_OVERLAY }}
          >
          <div className="mx-4 w-full max-w-sm rounded-3xl border border-line-strong bg-raised p-6 shadow-2xl shadow-black/80">
            <div className="flex flex-col items-center gap-4 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/25 text-3xl">🔒</span>
              <div>
                <p className="text-xl font-bold text-title">Antes de vender, abre la caja</p>
                <p className="mt-2 text-sm text-fg-mute">
                  La caja guarda las ventas del día. Ábrela para empezar a vender. Tus ventas se anotan solas, no tienes que escribir nada.
                </p>
              </div>
              <Button
                size="lg"
                className="w-full"
                onClick={() => {
                  setDismissed(true)
                  navigate('/caja')
                }}
              >
                Abrir caja
              </Button>
              <p className="text-xs text-fg-mute">
                Primero abre la caja. Después recién puedes vender.
              </p>
            </div>
          </div>
          </div>
        </Portal>
      )}

      <div className="mb-4">
        <Button size="lg" className="w-full" onClick={() => setOpenNew(true)}>
          + Producto nuevo
        </Button>
      </div>

      <LowStockAlert items={lowStock.data ?? []} />

      <SearchBox
        value={search}
        onChange={setSearch}
        placeholder="Ej: polo negro"
        results={coincidencias.length}
        total={(productsState.data ?? []).length}
      />

      {productsState.status === 'loading' && productsState.data === null && (
        <div className="mt-4">
          <LoadingState rows={3} label="Cargando productos..." />
        </div>
      )}

      {productsState.status === 'error' && (
        <div className="mt-4">
          <ErrorState
            title="No pudimos cargar los productos"
            description="Revisa el celular e intenta de nuevo. Tus ventas no se perdieron."
            onRetry={productsRetry}
          />
        </div>
      )}

      {cashFailed && (
        <div className="mt-4">
          <ErrorState
            title="No pudimos revisar la caja"
            description="No sabemos si hay caja abierta, así que no dejamos vender por ahora."
            onRetry={cashRetry}
          />
        </div>
      )}

      {productsState.status === 'ready' && (
        <>
          {!hayProductos && (
            <div className="mt-4">
              <EmptyState
                icon="🛍️"
                title="No hay productos"
                description="Agrega tu primer producto para empezar a vender."
                action={
                  <Button size="md" onClick={() => setOpenNew(true)}>
                    + Producto nuevo
                  </Button>
                }
              />
            </div>
          )}

          {hayProductos && coincidencias.length === 0 && (
            <div className="mt-4">
              <EmptyState
                icon="🔍"
                title={`No encontramos "${search.trim()}"`}
                description="Intenta buscando con otra palabra, o revisa si el producto sigue activo en Inventario."
                action={
                  <Button variant="secondary" size="md" onClick={() => setSearch('')}>
                    Borrar búsqueda
                  </Button>
                }
              />
            </div>
          )}

          {categories.map(({ category, items }) => (
            <div key={category} className="mb-6 mt-4">
              <h2 className="mb-2 text-lg font-bold text-title">{category}</h2>
              <div className="grid grid-cols-2 gap-3">
                {items.map(({ product, variant }) => (
                  <Card key={variant.id} className="flex flex-col">
                    <p className="font-bold">{product.name}</p>
                    <p className="text-sm text-fg-mute">
                      {[variant.size && `Talla: ${variant.size}`, variant.color && `Color: ${variant.color}`].filter(Boolean).join(' · ') || 'Sin talla/color'}
                    </p>
                    <p className="mt-1 text-lg font-bold text-ruby-text">S/ {product.price.toFixed(2)}</p>
                    <p className={`text-xs ${variant.quantity <= 5 ? 'font-bold text-warning' : 'text-fg-mute'}`}>
                      {variant.quantity} disponibles
                    </p>
                    <Button
                      size="md"
                      className="mt-2 w-full"
                      onClick={() => handleAdd({ product, variant })}
                    >
                      Agregar
                    </Button>
                  </Card>
                ))}
              </div>
            </div>
          ))}

          {outOfStock.length > 0 && (
            <div className="mb-6 mt-4">
              <h2 className="mb-2 flex items-center gap-2 text-lg font-bold text-danger">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-danger text-sm font-bold text-fg">!</span>
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
                    <Button size="md" className="mt-2 w-full" disabled>
                      Agregar
                    </Button>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Floating Cart Button */}
      <button
        onClick={() => setOpenCart(true)}
        className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-b from-cta-hover to-cta text-2xl shadow-[0_0_24px_rgba(0,245,255,0.55)] shadow-lg shadow-black/70 ring-1 ring-cta/40 transition-transform duration-150 ease-out will-change-transform active:scale-95"
        aria-label={`Abrir carrito, ${unidades} ${unidades === 1 ? 'producto' : 'productos'}`}
      >
        🛒
        {unidades > 0 && (
          <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-label-active text-xs font-bold text-white shadow-[0_0_10px_rgba(255,0,229,0.8)]">
            {unidades}
          </span>
        )}
      </button>

      <NewProductModal open={openNew} onClose={() => setOpenNew(false)} onNeedCash={() => setDismissed(false)} />
      <CartModal
        open={openCart}
        onClose={() => setOpenCart(false)}
        cart={cart}
        total={total}
        onUpdateQty={handleQty}
        onRemove={handleRemove}
        onClear={() => setCart(clearCart())}
        onNeedCash={() => setDismissed(false)}
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
  // Máquina de estados del pago: evita el doble toque y muestra el botón en
  // cada fase (Guardando / Listo / Intentar de nuevo).
  const [payment, dispatch] = useReducer(paymentReducer, IDLE_PAYMENT)
  const inFlightRef = useRef(false)
  const requestIdRef = useRef<string | null>(null)

  const total = round2(drafts.reduce((sum, d) => sum + (Number(d.price) || 0) * (Number(d.quantity) || 0), 0))
  const pago = validatePayment(total, amountPaid)
  const paid = pago.ok ? pago.value : undefined
  const change = computeChange(total, paid)

  // Validación en tiempo real: el aviso aparece mientras se escribe, sin
  // esperar a pulsar el botón. Campo vacío = todavía no se toca.
  const nameCheck = validateName(name, 'el nombre del producto')
  const priceCheck = validateAmount(price, 'el precio')
  const quantityCheck = validateQuantity(quantity, { etiqueta: 'la cantidad', min: 1 })
  const nameError = name !== '' && !nameCheck.ok ? nameCheck.error : null
  const priceError = price !== '' && !priceCheck.ok ? priceCheck.error : null
  const quantityError = quantity !== '' && !quantityCheck.ok ? quantityCheck.error : null

  function clearForm() {
    setName(''); setPrice(''); setSize(''); setColor(''); setCategory(''); setQuantity('1')
    setEditingKey(null)
  }

  function validateForm() {
    const error = firstError(nameCheck, priceCheck, quantityCheck)
    if (error) {
      show(error, 'error')
      return false
    }
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
    // Cláusulas de guarda: nada se envía si ya hay un envío en curso, si no hay
    // líneas o si el formulario tiene errores. `inFlightRef` es síncrono, así
    // que dos toques en el mismo instante no arrancan dos ventas.
    if (inFlightRef.current || !canSubmit(payment)) return
    if (drafts.length === 0) {
      show('Agrega al menos un producto', 'error')
      return
    }
    if (!validateForm()) return
    if (!pago.ok) {
      show(pago.error, 'error')
      return
    }

    // La clave se genera una sola vez por intento: si se reintenta, se reutiliza.
    requestIdRef.current ??= newId()
    const clientRequestId = requestIdRef.current
    const aviso = `${drafts.length} ${drafts.length === 1 ? 'producto agregado' : 'productos agregados'} y vendido(s)`

    dispatch({ type: 'SUBMIT' })
    inFlightRef.current = true
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
        amountPaid: paid,
        clientRequestId,
      })
      requestIdRef.current = null
      setDrafts([])
      clearForm()
      setMethod('efectivo')
      setAmountPaid('')
      dispatch({ type: 'DONE', message: aviso })
    } catch (e) {
      const message = e instanceof Error ? e.message : 'No se pudo guardar'
      if (message.includes('caja')) {
        requestIdRef.current = null
        dispatch({ type: 'RESET' })
        onNeedCash()
        onClose()
        return
      }
      dispatch({ type: 'FAIL', message })
      show(message, 'error')
    } finally {
      inFlightRef.current = false
    }
  }

  function cerrar() {
    dispatch({ type: 'RESET' })
    requestIdRef.current = null
    onClose()
  }

  const guardando = payment.status === 'processing'

  return (
    <>
      <Modal open={open} title="Agregar productos y vender" onClose={cerrar}>
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
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-line-strong text-accent-text transition-colors duration-150 hover:bg-accent/20"
                    aria-label="Editar producto"
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => removeDraft(d.key)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-danger/40 text-danger transition-colors duration-150 hover:bg-danger/15"
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
              <Input
                label="Nombre del producto"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Polo básico"
                error={nameError ?? undefined}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="Precio (S/)"
                  type="text"
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  error={priceError ?? undefined}
                />
                <Input
                  label="Cantidad"
                  type="text"
                  inputMode="numeric"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  error={quantityError ?? undefined}
                />
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
                  className={`rounded-xl border px-2 py-3 text-sm font-bold transition-colors duration-150 ${
                    method === p.id
                      ? 'border-line-active bg-selected text-label-active'
                      : 'border-line bg-inset text-fg-mute hover:bg-hover hover:border-line-active hover:text-fg'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Con cuánto paga (S/)"
            type="text"
            inputMode="decimal"
            value={amountPaid}
            onChange={(e) => setAmountPaid(e.target.value)}
            placeholder="Ej: 50.00"
            error={!pago.ok ? pago.error : undefined}
          />

          {change !== null && (
            <div className="rounded-xl border border-success/40 bg-success/10 p-3">
              <div className="flex justify-between text-sm">
                <span className="text-fg-soft">Vuelto</span>
                <span className="font-bold text-success">S/ {change.toFixed(2)}</span>
              </div>
            </div>
          )}

          <Button
            size="lg"
            onClick={save}
            disabled={guardando || drafts.length === 0 || !pago.ok}
          >
            {submitLabel(payment, 'Confirmar venta')}
          </Button>
        </div>
      </div>
      </Modal>

      {payment.status === 'success' && (
        <SuccessState message={payment.message ?? 'Listo'} onDone={cerrar} />
      )}
    </>
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
  // Máquina de estados del pago: bloquea el doble toque y da feedback inmediato.
  const [payment, dispatch] = useReducer(paymentReducer, IDLE_PAYMENT)
  const inFlightRef = useRef(false)
  const requestIdRef = useRef<string | null>(null)

  const pago = validatePayment(total, amountPaid)
  const paid = pago.ok ? pago.value : undefined
  const change = computeChange(total, paid)

  // Cierra y limpia el intento. Al cerrar sin éxito se descarta la clave para
  // que un carrito nuevo no reutilice la identidad de una venta anterior.
  function cerrar() {
    dispatch({ type: 'RESET' })
    requestIdRef.current = null
    onClose()
  }

  async function confirmSale() {
    // Guard clauses: sin carrito, con el pago mal o con una venta en vuelo, no
    // se envía nada. El ref es síncrono, así que dos toques seguidos no duplican.
    if (inFlightRef.current || !canSubmit(payment) || cart.length === 0 || !pago.ok) return

    requestIdRef.current ??= newId()
    const clientRequestId = requestIdRef.current

    dispatch({ type: 'SUBMIT' })
    inFlightRef.current = true
    try {
      await registerSale({
        lines: cart.map((item) => ({ variantId: item.variantId, quantity: item.quantity })),
        paymentMethod: method,
        amountPaid: paid,
        clientRequestId,
      })
      requestIdRef.current = null
      onClear()
      setAmountPaid('')
      setMethod('efectivo')
      dispatch({ type: 'DONE', message: 'Venta registrada' })
    } catch (e) {
      const message = e instanceof Error ? e.message : 'No se pudo registrar'
      if (message.includes('caja')) {
        requestIdRef.current = null
        dispatch({ type: 'RESET' })
        onNeedCash()
        cerrar()
        return
      }
      dispatch({ type: 'FAIL', message })
      show(message, 'error')
    } finally {
      inFlightRef.current = false
    }
  }

  const guardando = payment.status === 'processing'

  return (
    <>
    <Modal open={open} title="Carrito" onClose={cerrar}>
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
                <button onClick={() => onUpdateQty(item.variantId, item.quantity - 1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-line-strong bg-raised font-bold text-accent-text transition-colors duration-150 hover:bg-accent/20">-</button>
                <span className="w-8 text-center font-bold">{item.quantity}</span>
                <button onClick={() => onUpdateQty(item.variantId, item.quantity + 1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-line-strong bg-raised font-bold text-accent-text transition-colors duration-150 hover:bg-accent/20">+</button>
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
                    className={`rounded-xl border px-2 py-3 text-sm font-bold transition-colors duration-150 ${
                      method === p.id
                        ? 'border-line-active bg-selected text-label-active'
                        : 'border-line bg-inset text-fg-mute hover:bg-hover hover:border-line-active hover:text-fg'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <Input
              label="Con cuánto paga (S/)"
              type="text"
              inputMode="decimal"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              placeholder="Ej: 50.00"
              error={!pago.ok ? pago.error : undefined}
            />

            {change !== null && (
              <div className="rounded-xl border border-success/40 bg-success/10 p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-fg-soft">Vuelto</span>
                  <span className="font-bold text-success">S/ {change.toFixed(2)}</span>
                </div>
              </div>
            )}

            <Button
              size="lg"
              onClick={confirmSale}
              disabled={guardando || cart.length === 0 || !pago.ok}
            >
              {submitLabel(payment, 'Confirmar venta')}
            </Button>
          </>
        )}
      </div>
      </Modal>

      {payment.status === 'success' && (
        <SuccessState message={payment.message ?? 'Venta registrada'} onDone={cerrar} />
      )}
    </>
  )
}
