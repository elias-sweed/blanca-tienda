import { useMemo, useState } from 'react'
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
import { StepperInput } from '../components/ui/StepperInput'
import { useToast } from '../components/ui/ToastContext'
import { useQueryState } from '../hooks/useQueryState'
import { db } from '../lib/db'
import { addVariant, adjustStock, createProduct, updateProduct, type ProductVariantInput } from '../services/inventory'
import type { InventoryMovement, Product, ProductVariant } from '../types/models'
import { calcularPaginas, paginar } from '../utils/paginacion'
import { formatearFechaCorta } from '../utils/compra'
import { rankMatches } from '../utils/search'
import { firstError, validateAmount, validateName, validateQuantity } from '../utils/validation'

type OrdenInventario = 'az' | 'nuevos' | 'modificados'

const OPCIONES_ORDEN: { valor: OrdenInventario; etiqueta: string }[] = [
  { valor: 'az', etiqueta: 'A-Z' },
  { valor: 'nuevos', etiqueta: 'Últimos agregados' },
  { valor: 'modificados', etiqueta: 'Últimos modificados' },
]

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
  const [orden, setOrden] = useState<OrdenInventario>('az')
  const [pagina, setPagina] = useState(1)
  const [openNew, setOpenNew] = useState(false)
  const [adjustFor, setAdjustFor] = useState<ProductVariant | null>(null)
  const [variantFor, setVariantFor] = useState<Product | null>(null)
  const [editFor, setEditFor] = useState<Product | null>(null)
  const [showInactive, setShowInactive] = useState(false)
  const [openMovimientos, setOpenMovimientos] = useState(false)

  const [productsState, retryProducts] = useQueryState(async () => {
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

  // Se conservan los últimos datos aunque falle o esté recargando: la pantalla
  // no se vacía y la persona sigue viendo lo último válido que se cargó.
  const products = useMemo(() => productsState.data ?? [], [productsState.data])
  const loading = productsState.status === 'loading' && productsState.data === null

  // Búsqueda difusa: ignora acentos y mayúsculas, y busca también dentro de
  // talla, color y categoría ("negro" encuentra el polo aunque solo esté en la
  // variante). Después manda el chip elegido: A-Z, últimos agregados o
  // últimos modificados.
  const filtered = useMemo(() => {
    const base = rankMatches(products, search, ({ product, variants }) => [
      product.name,
      product.category ?? '',
      ...variants.map((v) => `${v.size ?? ''} ${v.color ?? ''}`),
    ])
    const ordenado = [...base]
    if (orden === 'nuevos') {
      ordenado.sort((a, b) => b.product.createdAt.localeCompare(a.product.createdAt))
    } else if (orden === 'modificados') {
      ordenado.sort((a, b) => b.product.updatedAt.localeCompare(a.product.updatedAt))
    } else {
      ordenado.sort((a, b) => a.product.name.localeCompare(b.product.name))
    }
    return ordenado
  }, [products, search, orden])

  // Paginación de 10 en 10. La página se acota a lo que existe: si la lista
  // achica (por búsqueda o filtro), nunca se queda la pantalla en blanco.
  const totalPaginas = calcularPaginas(filtered.length)
  const paginaActual = Math.min(pagina, totalPaginas)
  const paginaItems = useMemo(() => paginar(filtered, paginaActual), [filtered, paginaActual])

  const inactiveCount = products.filter((p) => !p.product.active || p.product.deleted).length

  return (
    <AppLayout title="Inventario">
      <Button size="lg" className="mb-4" onClick={() => setOpenNew(true)}>
        + Agregar producto
      </Button>

      <SearchBox
        value={search}
        onChange={(v) => {
          setSearch(v)
          setPagina(1)
        }}
        placeholder="Ej: polo negro"
        results={filtered.length}
        total={products.length}
      />

      <div className="mt-3">
        <FilterChips<OrdenInventario>
          titulo="Ordenar"
          valor={orden}
          onChange={(v) => {
            setOrden(v)
            setPagina(1)
          }}
          opciones={OPCIONES_ORDEN}
        />
      </div>

      {inactiveCount > 0 && (
        <button
          onClick={() => setShowInactive(!showInactive)}
          className="mt-3 text-xs font-semibold text-fg-mute transition-colors duration-150 hover:text-fg-soft"
        >
          {showInactive ? 'Ocultar' : 'Mostrar'} productos dados de baja ({inactiveCount})
        </button>
      )}

      <button
        onClick={() => setOpenMovimientos(true)}
        className="mt-3 self-start text-xs font-bold text-cta-text transition-colors duration-150 hover:text-cta-hover"
      >
        Ver mis agregados y compras →
      </button>

      <div className="mt-4 flex flex-col gap-3">
        {/* Los 5 estados de la interfaz: cargando, error, vacío, sin resultados y contenido. */}
        {loading && <LoadingState rows={4} label="Cargando inventario..." />}

        {productsState.status === 'error' && (
          <ErrorState
            title="No pudimos cargar el inventario"
            description="No se pudo leer la lista de productos. Reintenta en unos segundos."
            onRetry={retryProducts}
          />
        )}

        {!loading && productsState.status === 'ready' && products.length === 0 && (
          <EmptyState
            icon="📦"
            title="No hay productos"
            description="Agrega tu primer producto para empezar."
            action={
              <Button size="md" onClick={() => setOpenNew(true)}>
                + Agregar producto
              </Button>
            }
          />
        )}

        {!loading && productsState.status === 'ready' && products.length > 0 && filtered.length === 0 && (
          <EmptyState
            icon="🔍"
            title={`No encontramos "${search.trim()}"`}
            description="Revisa la ortografía o intenta con otra palabra."
            action={
              <Button variant="secondary" size="md" onClick={() => setSearch('')}>
                Borrar búsqueda
              </Button>
            }
          />
        )}
        {paginaItems.map(({ product, variants, quantity }) => {
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
                  <p className={`text-2xl font-bold ${bajo ? 'text-danger' : 'text-fg'}`}>{quantity}</p>
                  <p className="text-xs text-fg-mute">disponibles</p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-sm text-fg-soft">
                <span>Precio: S/ {product.price.toFixed(2)}</span>
                {inactivo ? (
                  <span className="text-fg-mute">Dado de baja</span>
                ) : (
                  <span className="flex items-center gap-0.5">
                    {bajo ? (
                      <span className="text-danger">Quedan pocas</span>
                    ) : (
                      <span className="text-fg-mute">Al menos {product.stockMin}</span>
                    )}
                    <HelpTooltip text="Es la cantidad mínima que quieres tener. Si llegas a quedarte con menos, te avisamos en Inicio y en Ventas." />
                  </span>
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
                      <div className="flex shrink-0 items-center gap-2">
                        <Button variant="secondary" size="md" onClick={() => setAdjustFor(v)}>
                          Ajustar
                        </Button>
                        <HelpTooltip text="Úsalo cuando cuentes y te dé un número distinto al de la app." />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!inactivo && (
                <div className="mt-3 flex gap-2">
                  <Button variant="ghost" size="md" className="flex-1" onClick={() => setEditFor(product)}>
                    Editar
                  </Button>
                  <Button variant="ghost" size="md" className="flex-1" onClick={() => setVariantFor(product)}>
                    + Agregar talla / color
                  </Button>
                </div>
              )}
            </Card>
          )
        })}
      </div>

      <Paginator pagina={paginaActual} totalPaginas={totalPaginas} onChange={setPagina} />

      <NewProductModal open={openNew} onClose={() => setOpenNew(false)} onCreated={() => show('Producto agregado')} />

      <AdjustModal
        variant={adjustFor}
        onClose={() => setAdjustFor(null)}
        onDone={(n) => {
          show(`Ahora hay ${n} ${n === 1 ? 'unidad' : 'unidades'}`)
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

      <EditProductModal
        key={editFor?.id ?? 'sin-producto'}
        product={editFor}
        onClose={() => setEditFor(null)}
        onDone={() => {
          show('Producto actualizado')
          setEditFor(null)
        }}
      />

      <MovimientosModal open={openMovimientos} onClose={() => setOpenMovimientos(false)} />
    </AppLayout>
  )
}

function NewProductModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const { show } = useToast()
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState('')
  const [drafts, setDrafts] = useState<VariantDraft[]>([newDraft()])
  const [variantsOpen, setVariantsOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  // Validación pura, compartida con el resto de la app. Se evalúa en cada
  // render para poder avisar mientras la persona escribe, no solo al guardar.
  const nameCheck = validateName(name, 'el nombre')
  const priceCheck = validateAmount(price, 'el precio')
  const nameError = name !== '' && !nameCheck.ok ? nameCheck.error : null
  const priceError = price !== '' && !priceCheck.ok ? priceCheck.error : null

  function reset() {
    setName(''); setPrice(''); setCategory(''); setDrafts([newDraft()]); setVariantsOpen(false)
  }

  function updateDraft(key: string, patch: Partial<VariantDraft>) {
    // Inmutable: se copia solo la fila tocada, el resto mantiene su referencia.
    setDrafts((ds) => ds.map((d) => (d.key === key ? { ...d, ...patch } : d)))
  }

  async function save() {
    // Cláusulas de guarda: nada se escribe si el formulario está mal o si ya se
    // está guardando (evita el doble toque).
    if (busy) return
    const error = firstError(nameCheck, priceCheck)
    if (error) {
      show(error, 'error')
      return
    }

    const variants: ProductVariantInput[] = drafts
      .filter((d) => d.size.trim() || d.color.trim() || Number(d.quantity) > 0)
      .map((d) => ({ size: d.size, color: d.color, quantity: Number(d.quantity) || 0 }))

    if (variants.length === 0) variants.push({ quantity: 0 })

    setBusy(true)
    try {
      await createProduct({ name, price: priceCheck.ok ? priceCheck.value : 0, category, variants })
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
        <Input
          label="Nombre del producto"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Polo básico"
          error={nameError ?? undefined}
        />

        <div className="flex flex-col gap-1">
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
          {priceError && <p className="text-sm font-semibold text-danger">{priceError}</p>}
        </div>

        <Input label="Categoría (opcional)" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Polos" />

        {/* Divulgación progresiva: lo esencial primero; tallas y colores se
            abren solo cuando hacen falta. */}
        <div className="flex flex-col rounded-xl border border-line bg-inset">
          <button
            type="button"
            onClick={() => setVariantsOpen((current) => !current)}
            aria-expanded={variantsOpen}
            className="flex items-center justify-between border-b border-line p-3 text-left"
          >
            <span className="font-bold text-fg">
              Tallas y colores
              {!variantsOpen && (
                <span className="ml-2 text-xs font-semibold text-fg-mute">
                  {drafts.length > 1 ? `${drafts.length} variantes` : 'opcional'}
                </span>
              )}
            </span>
            <span className="text-sm font-bold text-accent-text">
              {variantsOpen ? 'Listo ▾' : 'Personalizar ▸'}
            </span>
          </button>

          {variantsOpen && (
          <div className="flex flex-col gap-2 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-fg-soft">Filas de talla/color</span>
              <button
                onClick={() => setDrafts((ds) => [...ds, newDraft()])}
                className="text-sm font-bold text-accent-text transition-colors duration-150 hover:text-accent"
              >
                + Agregar
              </button>
            </div>

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
          )}
        </div>

        <Button size="lg" onClick={save} disabled={busy}>
          {busy ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>
    </Modal>
  )
}

function AdjustModal({ variant, onClose, onDone }: {
  variant: ProductVariant | null
  onClose: () => void
  onDone: (cantidad: number) => void
}) {
  const { show } = useToast()
  const [qty, setQty] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const n = Number(qty)
  const diff = variant && Number.isFinite(n) && qty !== '' ? n - variant.quantity : null

  async function save() {
    if (busy || !variant) return
    const check = validateQuantity(qty, { etiqueta: 'cuántas hay ahora', min: 0 })
    if (!check.ok) {
      show(check.error, 'error')
      return
    }
    if (!note.trim()) {
      show('Escribe por qué cambia la cantidad', 'error')
      return
    }
    setBusy(true)
    try {
      await adjustStock(variant.id, check.value, note)
      onDone(check.value)
      setQty('')
      setNote('')
    } catch (e) {
      show(e instanceof Error ? e.message : 'No se pudo guardar', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={!!variant} title={`Ajustar cantidad: ${variant ? describeVariant(variant) : ''}`} onClose={onClose}>
      <div className="flex flex-col gap-3">
        {variant && (
          <div className="rounded-xl border border-line bg-inset p-3">
            <div className="flex justify-between text-sm">
              <span className="text-fg-soft">Lo que dice la app</span>
              <span className="font-bold text-fg">{variant.quantity}</span>
            </div>
          </div>
        )}

        <Input
          label="Cuántas hay ahora"
          type="text"
          inputMode="numeric"
          enterKeyHint="done"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          placeholder="Ej: 4"
        />

        {diff !== null && diff !== 0 && (
          <div
            className={`rounded-xl border p-3 ${
              diff > 0 ? 'border-cta-text/40' : 'border-danger/40'
            }`}
          >
            <div className="flex justify-between text-sm">
              <span className="text-fg-soft">Diferencia</span>
              <span className={`font-bold ${diff > 0 ? 'text-cta-text' : 'text-danger'}`}>
                {diff > 0 ? '+' : ''}{diff}
              </span>
            </div>
            <p className="mt-1 text-center text-xs text-fg-mute">
              {diff > 0 ? 'Contaste más de lo que decía la app' : 'Contaste menos de lo que decía la app'}
            </p>
          </div>
        )}

        <Input
          label="Motivo (obligatorio)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ej: Lo conté otra vez"
        />

        <Button variant="secondary" size="lg" onClick={save} disabled={busy}>Guardar</Button>
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
    if (busy || !product) return
    if (!size.trim() && !color.trim()) {
      show('Escribe al menos la talla o el color', 'error')
      return
    }
    const check = validateQuantity(qty, { etiqueta: 'la cantidad', min: 0 })
    if (!check.ok) {
      show(check.error, 'error')
      return
    }
    setBusy(true)
    try {
      await addVariant(product.id, { size, color, quantity: check.value })
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
        <Input
          label="Cantidad inicial"
          type="text"
          inputMode="numeric"
          enterKeyHint="done"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
        />
        <Button size="lg" onClick={save} disabled={busy}>Agregar variante</Button>
      </div>
    </Modal>
  )
}

function EditProductModal({ product, onClose, onDone }: {
  product: Product | null
  onClose: () => void
  onDone: () => void
}) {
  const { show } = useToast()
  // El componente se remonta con `key` (id del producto) al abrirse, así que
  // el estado arranca con los datos reales sin necesidad de un efecto.
  const [name, setName] = useState(product?.name ?? '')
  const [price, setPrice] = useState(product ? product.price.toFixed(2) : '')
  const [category, setCategory] = useState(product?.category ?? '')
  const [busy, setBusy] = useState(false)

  const nameCheck = validateName(name, 'el nombre')
  const priceCheck = validateAmount(price, 'el precio')
  const nameError = name !== '' && !nameCheck.ok ? nameCheck.error : null
  const priceError = price !== '' && !priceCheck.ok ? priceCheck.error : null

  async function save() {
    if (busy || !product) return
    const error = firstError(nameCheck, priceCheck)
    if (error) {
      show(error, 'error')
      return
    }
    setBusy(true)
    try {
      await updateProduct(product.id, {
        name,
        price: priceCheck.ok ? priceCheck.value : 0,
        category,
      })
      onDone()
    } catch (e) {
      show(e instanceof Error ? e.message : 'No se pudo guardar', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={!!product} title={`Editar: ${product?.name ?? ''}`} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <Input
          label="Nombre del producto"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Polo básico"
          error={nameError ?? undefined}
        />

        <div className="flex flex-col gap-1">
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
          {priceError && <p className="text-sm font-semibold text-danger">{priceError}</p>}
        </div>

        <Input label="Categoría (opcional)" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Polos" />

        <Button size="lg" onClick={save} disabled={busy}>
          {busy ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </div>
    </Modal>
  )
}

type FiltroMovimiento = 'todos' | 'agregados' | 'compras' | 'ajustes'

/** Etiqueta simple y grupo para filtrar cada movimiento. */
function etiquetaMovimiento(m: InventoryMovement): { texto: string; grupo: FiltroMovimiento | 'otros' } {
  if (m.reason === 'ajuste') return { texto: 'Ajuste', grupo: 'ajustes' }
  if (m.reason === 'venta') return { texto: 'Venta', grupo: 'otros' }
  if (m.reason === 'anulacion') return { texto: 'Anulación', grupo: 'otros' }
  if (m.reason === 'entrada') {
    if ((m.note ?? '').startsWith('Compra al por mayor')) {
      return { texto: 'Compra al por mayor', grupo: 'compras' }
    }
    return { texto: 'Agregaste', grupo: 'agregados' }
  }
  return { texto: 'Movimiento', grupo: 'otros' }
}

/** Lo último que entró o cambió en el inventario, con su porqué. */
function MovimientosModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [filtro, setFiltro] = useState<FiltroMovimiento>('todos')
  const [state, retry] = useQueryState(() => db.inventoryMovements.reverse().sortBy('createdAt'), [])

  const movimientos = useMemo(() => (state.data ?? []).slice(0, 30), [state.data])
  const filtrados =
    filtro === 'todos' ? movimientos : movimientos.filter((m) => etiquetaMovimiento(m).grupo === filtro)

  return (
    <Modal open={open} title="Mis agregados y compras" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <FilterChips<FiltroMovimiento>
          titulo="Ver"
          valor={filtro}
          onChange={setFiltro}
          opciones={[
            { valor: 'todos', etiqueta: 'Todo' },
            { valor: 'agregados', etiqueta: 'Agregados' },
            { valor: 'compras', etiqueta: 'Compras' },
            { valor: 'ajustes', etiqueta: 'Ajustes' },
          ]}
        />

        {state.status === 'loading' && state.data === null && (
          <LoadingState rows={3} label="Cargando movimientos..." />
        )}

        {state.status === 'error' && (
          <ErrorState
            title="No pudimos cargar los movimientos"
            description="Inténtalo de nuevo en unos segundos."
            onRetry={retry}
          />
        )}

        {state.status !== 'loading' && state.status !== 'error' && filtrados.length === 0 && (
          <EmptyState
            icon="📦"
            title={movimientos.length === 0 ? 'Sin movimientos todavía' : 'Nada con ese filtro'}
            description={
              movimientos.length === 0
                ? 'Aquí verás lo que agregues, ajustes o compres.'
                : 'Prueba con otro filtro.'
            }
          />
        )}

        {filtrados.map((m) => {
          const etiqueta = etiquetaMovimiento(m)
          return (
            <div key={m.id} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-inset p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-fg">{m.productName || 'Producto'}</p>
                <p className="text-xs text-fg-mute">
                  {etiqueta.texto} · {formatearFechaCorta(m.createdAt.slice(0, 10))}
                </p>
                {m.note && <p className="truncate text-xs text-fg-mute">{m.note}</p>}
              </div>
              <span className={`shrink-0 text-sm font-bold ${m.quantity >= 0 ? 'text-success' : 'text-danger'}`}>
                {m.quantity > 0 ? '+' : ''}{m.quantity}
              </span>
            </div>
          )
        })}
      </div>
    </Modal>
  )
}
