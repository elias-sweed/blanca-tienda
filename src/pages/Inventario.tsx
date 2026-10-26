import { useMemo, useState, type ReactNode } from 'react'
import { AppLayout } from '../components/layout/AppLayout'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { FilterChips } from '../components/ui/FilterChips'
import { Input } from '../components/ui/Input'
import { LoadingState } from '../components/ui/LoadingState'
import { Modal } from '../components/ui/Modal'
import { Paginator } from '../components/ui/Paginator'
import { QuickPicks } from '../components/ui/QuickPicks'
import { SearchBox } from '../components/ui/SearchBox'
import { StepperInput } from '../components/ui/StepperInput'
import { useToast } from '../components/ui/ToastContext'
import { useQueryState } from '../hooks/useQueryState'
import { db } from '../lib/db'
import {
  addVariant,
  adjustStock,
  createProduct,
  setProductActive,
  updateProduct,
  updateVariant,
  type ProductVariantInput,
} from '../services/inventory'
import type { InventoryMovement, Product, ProductVariant } from '../types/models'
import { calcularPaginas, paginar } from '../utils/paginacion'
import { formatearFechaCorta } from '../utils/compra'
import { rankMatches } from '../utils/search'
import { CATEGORIAS_SUGERIDAS, COLORES_SUGERIDOS } from '../utils/sugerencias'
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

function resumenVariantes(variants: ProductVariant[]): string {
  if (variants.length === 0) return 'Sin talla ni color'
  if (variants.length === 1) return describeVariant(variants[0])
  return variants.map(describeVariant).join(' · ')
}

function IconoLapiz() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
      <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m13.5 6.5 3 3" strokeLinecap="round" />
    </svg>
  )
}

function IconoBasura() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
      <path d="M5 7h14" strokeLinecap="round" />
      <path d="M10 7V5h4v2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 7v12a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconoAjustar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
      <path d="M4 8h16M4 16h16" strokeLinecap="round" />
      <circle cx="8" cy="8" r="2.2" />
      <circle cx="16" cy="16" r="2.2" />
    </svg>
  )
}

function BotonIcono({
  label,
  onClick,
  peligro = false,
  children,
}: {
  label: string
  onClick: () => void
  peligro?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors ${
        peligro
          ? 'border-danger/30 text-danger hover:bg-danger/10 active:bg-danger/20'
          : 'border-line text-fg-soft hover:border-fg-mute hover:bg-inset hover:text-fg'
      }`}
    >
      {children}
    </button>
  )
}

export default function Inventario() {
  const { show } = useToast()
  const [search, setSearch] = useState('')
  const [categoria, setCategoria] = useState<string>('todas')
  const [orden, setOrden] = useState<OrdenInventario>('az')
  const [pagina, setPagina] = useState(1)
  const [openNew, setOpenNew] = useState(false)
  const [adjustFor, setAdjustFor] = useState<ProductVariant | null>(null)
  const [elegirAjuste, setElegirAjuste] = useState<ProductVariant[] | null>(null)
  const [editFor, setEditFor] = useState<{ product: Product; variants: ProductVariant[] } | null>(null)
  const [borrarFor, setBorrarFor] = useState<Product | null>(null)
  const [showInactive, setShowInactive] = useState(false)
  const [openMovimientos, setOpenMovimientos] = useState(false)
  const [borrando, setBorrando] = useState(false)

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

  // Se conservan los últimos datos aunque falle o esté recargando
  const products = useMemo(() => productsState.data ?? [], [productsState.data])
  const loading = productsState.status === 'loading' && productsState.data === null

  // Categorías únicas disponibles para el filtro
  const categoriasDisponibles = useMemo(() => {
    const set = new Set<string>()
    for (const p of products) {
      if (p.product.category?.trim()) {
        set.add(p.product.category.trim())
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [products])

  // Búsqueda difusa + filtro de categoría + ordenación
  const filtered = useMemo(() => {
    let base = rankMatches(products, search, ({ product, variants }) => [
      product.name,
      product.category ?? '',
      ...variants.map((v) => `${v.size ?? ''} ${v.color ?? ''}`),
    ])

    if (categoria !== 'todas') {
      base = base.filter((p) => (p.product.category?.trim() ?? '').toLowerCase() === categoria.toLowerCase())
    }

    const ordenado = [...base]
    if (orden === 'nuevos') {
      ordenado.sort((a, b) => b.product.createdAt.localeCompare(a.product.createdAt))
    } else if (orden === 'modificados') {
      ordenado.sort((a, b) => b.product.updatedAt.localeCompare(a.product.updatedAt))
    } else {
      ordenado.sort((a, b) => a.product.name.localeCompare(b.product.name))
    }
    return ordenado
  }, [products, search, categoria, orden])

  // Paginación de 10 en 10
  const totalPaginas = calcularPaginas(filtered.length)
  const paginaActual = Math.min(pagina, totalPaginas)
  const paginaItems = useMemo(() => paginar(filtered, paginaActual), [filtered, paginaActual])

  const inactiveCount = products.filter((p) => !p.product.active || p.product.deleted).length

  function pedirAjuste(variants: ProductVariant[]) {
    if (variants.length === 0) {
      show('Este producto no tiene una talla para ajustar', 'error')
      return
    }
    if (variants.length === 1) {
      setAdjustFor(variants[0])
      return
    }
    setElegirAjuste(variants)
  }

  async function confirmarBorrado() {
    if (!borrarFor || borrando) return
    setBorrando(true)
    try {
      await setProductActive(borrarFor.id, false)
      show('Producto eliminado')
      setBorrarFor(null)
    } catch (e) {
      show(e instanceof Error ? e.message : 'No se pudo eliminar', 'error')
    } finally {
      setBorrando(false)
    }
  }

  return (
    <AppLayout title="Inventario">
      {/* 1. PARTE DE ARRIBA: Buscar + Filtros */}
      <div className="flex flex-col gap-2.5">
        <SearchBox
          value={search}
          onChange={(v) => {
            setSearch(v)
            setPagina(1)
          }}
          placeholder="Buscar por nombre, categoría, talla o color..."
          results={filtered.length}
          total={products.length}
        />

        {/* Filtro por categorías si existen */}
        {categoriasDisponibles.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="shrink-0 font-medium text-fg-mute">Categoría:</span>
            <button
              type="button"
              onClick={() => {
                setCategoria('todas')
                setPagina(1)
              }}
              className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                categoria === 'todas'
                  ? 'bg-fg text-surface'
                  : 'border border-line bg-inset text-fg-soft hover:text-fg'
              }`}
            >
              Todas
            </button>
            {categoriasDisponibles.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setCategoria(cat)
                  setPagina(1)
                }}
                className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                  categoria.toLowerCase() === cat.toLowerCase()
                    ? 'bg-fg text-surface'
                    : 'border border-line bg-inset text-fg-soft hover:text-fg'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Filtros de orden y enlaces secundarios */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <FilterChips<OrdenInventario>
            titulo="Ordenar"
            valor={orden}
            onChange={(v) => {
              setOrden(v)
              setPagina(1)
            }}
            opciones={OPCIONES_ORDEN}
          />

          <div className="flex items-center gap-3 text-xs">
            {inactiveCount > 0 && (
              <button
                type="button"
                onClick={() => setShowInactive(!showInactive)}
                className="font-semibold text-fg-mute hover:text-fg transition-colors"
              >
                {showInactive ? 'Ocultar' : 'Mostrar'} bajas ({inactiveCount})
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpenMovimientos(true)}
              className="font-bold text-cta-text hover:underline"
            >
              Historial
            </button>
          </div>
        </div>
      </div>

      {/* 2. ABAJO AL LADO DERECHO: Botón de Agregar producto */}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs font-semibold text-fg-mute">
          {filtered.length} {filtered.length === 1 ? 'producto' : 'productos'}
        </span>
        <Button size="md" onClick={() => setOpenNew(true)}>
          + Agregar producto
        </Button>
      </div>

      {/* 3. ABAJO: PRODUCTOS EN FILAS */}
      <div className="mt-3 flex flex-col gap-2">
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
            title={`No encontramos "${search.trim() || categoria}"`}
            description="Revisa la ortografía o intenta con otra palabra o filtro."
            action={
              <Button
                variant="secondary"
                size="md"
                onClick={() => {
                  setSearch('')
                  setCategoria('todas')
                }}
              >
                Borrar filtros
              </Button>
            }
          />
        )}

        {paginaItems.map(({ product, variants, quantity }) => {
          const inactivo = !product.active || product.deleted
          const sinStock = quantity <= 0
          const bajoStock = !sinStock && quantity <= product.stockMin

          return (
            <div
              key={product.id}
              className={`flex items-center justify-between gap-3 rounded-xl border border-line bg-surface p-3.5 transition-all shadow-xs ${
                inactivo ? 'opacity-55 bg-surface/50' : ''
              }`}
            >
              {/* Información importante a la izquierda */}
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="truncate text-base font-bold text-title">{product.name}</span>
                  {product.category && (
                    <span className="rounded-md border border-line bg-inset px-1.5 py-0.5 text-[11px] font-medium text-fg-mute">
                      {product.category}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap text-sm">
                  <span className="font-bold text-fg">S/ {product.price.toFixed(2)}</span>
                  <span className="text-fg-mute">·</span>
                  {inactivo ? (
                    <span className="rounded-md bg-danger/10 px-1.5 py-0.5 text-xs font-semibold text-danger">
                      Dado de baja
                    </span>
                  ) : sinStock ? (
                    <span className="rounded-md bg-danger/10 px-1.5 py-0.5 text-xs font-semibold text-danger">
                      Sin stock (0 uds)
                    </span>
                  ) : bajoStock ? (
                    <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-xs font-semibold text-amber-600">
                      Poco stock ({quantity} {quantity === 1 ? 'ud' : 'uds'})
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-fg-soft">
                      {quantity} {quantity === 1 ? 'ud' : 'uds'}
                    </span>
                  )}
                </div>

                {variants.length > 0 && (
                  <p className="truncate text-xs text-fg-mute">
                    {resumenVariantes(variants)}
                  </p>
                )}
              </div>

              {/* Iconos de acciones a la derecha: Editar, Borrar, Ajustar */}
              {!inactivo && (
                <div className="flex shrink-0 items-center gap-1.5">
                  <BotonIcono label="Editar producto" onClick={() => setEditFor({ product, variants })}>
                    <IconoLapiz />
                  </BotonIcono>
                  <BotonIcono label="Eliminar producto" peligro onClick={() => setBorrarFor(product)}>
                    <IconoBasura />
                  </BotonIcono>
                  <BotonIcono label="Ajustar stock" onClick={() => pedirAjuste(variants)}>
                    <IconoAjustar />
                  </BotonIcono>
                </div>
              )}
            </div>
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

      <Modal
        open={!!elegirAjuste}
        title="¿Cuál quieres ajustar?"
        onClose={() => setElegirAjuste(null)}
      >
        <div className="flex flex-col gap-2">
          {(elegirAjuste ?? []).map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => {
                setElegirAjuste(null)
                setAdjustFor(v)
              }}
              className="flex items-center justify-between rounded-xl border border-line bg-inset px-3 py-3 text-left"
            >
              <span className="font-semibold text-fg">{describeVariant(v)}</span>
              <span className="text-sm text-fg-mute">
                {v.quantity} {v.quantity === 1 ? 'ud' : 'uds'}
              </span>
            </button>
          ))}
        </div>
      </Modal>

      <EditProductModal
        key={editFor?.product.id ?? 'sin-producto'}
        product={editFor?.product ?? null}
        variants={editFor?.variants ?? []}
        onClose={() => setEditFor(null)}
        onDone={() => {
          show('Producto actualizado')
          setEditFor(null)
        }}
      />

      {/* Modal de confirmación al eliminar */}
      <Modal open={!!borrarFor} title="Eliminar producto" onClose={() => setBorrarFor(null)}>
        <div className="flex flex-col gap-3">
          <p className="text-sm text-fg">
            ¿Estás seguro de que deseas eliminar <strong className="font-bold text-title">{borrarFor?.name}</strong>?
          </p>
          <p className="text-xs text-fg-mute">
            Este producto dejará de aparecer en la sección de ventas. Podrás ver los dados de baja activando la opción correspondiente.
          </p>
          <div className="mt-2 flex flex-col gap-2">
            <Button variant="danger" size="lg" onClick={() => void confirmarBorrado()} disabled={borrando}>
              {borrando ? 'Eliminando...' : 'Sí, eliminar'}
            </Button>
            <Button variant="ghost" size="lg" onClick={() => setBorrarFor(null)}>
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>

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
        <QuickPicks
          etiqueta="Categorías frecuentes"
          opciones={CATEGORIAS_SUGERIDAS}
          valor={category}
          onElegir={setCategory}
        />

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
                  {drafts.length > 1 ? `${drafts.length} opciones` : 'opcional'}
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
              <span className="text-sm font-semibold text-fg-soft">Cada talla o color</span>
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
                <QuickPicks
                  etiqueta="Colores frecuentes"
                  opciones={COLORES_SUGERIDOS}
                  valor={d.color}
                  onElegir={(valor) => updateDraft(d.key, { color: valor })}
                />
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

function EditProductModal({ product, variants, onClose, onDone }: {
  product: Product | null
  variants: ProductVariant[]
  onClose: () => void
  onDone: () => void
}) {
  const { show } = useToast()
  // El componente se remonta con `key` (id del producto) al abrirse, así que
  // el estado arranca con los datos reales sin necesidad de un efecto.
  const [name, setName] = useState(product?.name ?? '')
  const [price, setPrice] = useState(product ? product.price.toFixed(2) : '')
  const [category, setCategory] = useState(product?.category ?? '')
  const [drafts, setDrafts] = useState<VariantDraft[]>(() =>
    variants.length > 0
      ? variants.map((v) => ({
          key: v.id,
          size: v.size ?? '',
          color: v.color ?? '',
          quantity: String(v.quantity),
        }))
      : [newDraft()],
  )
  const [busy, setBusy] = useState(false)

  const nameCheck = validateName(name, 'el nombre')
  const priceCheck = validateAmount(price, 'el precio')
  const nameError = name !== '' && !nameCheck.ok ? nameCheck.error : null
  const priceError = price !== '' && !priceCheck.ok ? priceCheck.error : null

  function updateDraft(key: string, patch: Partial<VariantDraft>) {
    setDrafts((ds) => ds.map((d) => (d.key === key ? { ...d, ...patch } : d)))
  }

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

      const idsActuales = new Set(variants.map((v) => v.id))
      for (const d of drafts) {
        if (idsActuales.has(d.key)) {
          await updateVariant(d.key, { size: d.size, color: d.color })
        } else if (d.size.trim() || d.color.trim()) {
          await addVariant(product.id, { size: d.size, color: d.color, quantity: 0 })
        }
      }
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
        <QuickPicks
          etiqueta="Categorías frecuentes"
          opciones={CATEGORIAS_SUGERIDAS}
          valor={category}
          onElegir={setCategory}
        />

        <div className="flex flex-col gap-2 rounded-xl border border-line bg-inset p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-fg-soft">Talla y color</span>
            <button
              type="button"
              onClick={() => setDrafts((ds) => [...ds, newDraft()])}
              className="text-sm font-bold text-accent-text"
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
              <QuickPicks
                etiqueta="Colores frecuentes"
                opciones={COLORES_SUGERIDOS}
                valor={d.color}
                onElegir={(valor) => updateDraft(d.key, { color: valor })}
              />
              {drafts.length > 1 && !variants.some((v) => v.id === d.key) && (
                <button
                  type="button"
                  onClick={() => setDrafts((ds) => ds.filter((x) => x.key !== d.key))}
                  className="self-start text-xs font-bold text-danger"
                >
                  Quitar esta talla
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 pt-1">
          <Button size="lg" onClick={save} disabled={busy}>
            {busy ? 'Guardando...' : 'Guardar cambios'}
          </Button>
          <Button variant="ghost" size="lg" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
        </div>
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
