import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { FilterChips } from '../components/ui/FilterChips'
import { Input } from '../components/ui/Input'
import { LoadingState } from '../components/ui/LoadingState'
import { Modal } from '../components/ui/Modal'
import { Paginator } from '../components/ui/Paginator'
import { SearchBox } from '../components/ui/SearchBox'
import { StepperInput } from '../components/ui/StepperInput'
import { useToast } from '../components/ui/ToastContext'
import { useQueryState } from '../hooks/useQueryState'
import { db } from '../lib/db'
import { todayISO } from '../utils/ids'
import { parseAmount } from '../utils/money'
import { calcularPaginas, paginar } from '../utils/paginacion'
import { rankMatches } from '../utils/search'
import { calcularCompra, formatearFechaCorta, type CalculoCompra } from '../utils/compra'
import { confirmarCompra, guardarCalculo, listarProveedores, type CompraInput } from '../services/purchases'
import type { Compra, CompraPago, Product, ProductVariant } from '../types/models'

type Tab = 'calcular' | 'compras'
type Orden = 'recientes' | 'antiguos'

const PAGOS: { id: CompraPago; etiqueta: string; ayuda: string }[] = [
  { id: 'gaveta', etiqueta: 'De la gaveta', ayuda: 'Salió de la plata de la tienda' },
  { id: 'aparte', etiqueta: 'Plata aparte', ayuda: 'Otra plata, no la de la tienda' },
  { id: 'no-pagada', etiqueta: 'Todavía no pago', ayuda: 'La pagarás después' },
]

function pagoTexto(pago: CompraPago): string {
  return PAGOS.find((p) => p.id === pago)?.etiqueta ?? pago
}

function describir(v: ProductVariant): string {
  return [v.size && `Talla ${v.size}`, v.color].filter(Boolean).join(' · ') || 'Única'
}

export default function Compras() {
  const [tab, setTab] = useState<Tab>('calcular')

  return (
    <AppLayout title="Compras al por mayor">
      <div className="mb-4 flex gap-2">
        {(['calcular', 'compras'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-xl border px-3 py-2 text-sm font-bold ${
              tab === t
                ? 'border-line-active bg-selected text-label-active'
                : 'border-line bg-surface text-fg-mute hover:bg-hover hover:border-line-active hover:text-fg'
            }`}
          >
            {t === 'calcular' ? 'Calcular' : 'Mis compras'}
          </button>
        ))}
      </div>

      {tab === 'calcular' ? <CalculadoraLibre /> : <MisCompras />}
    </AppLayout>
  )
}

/** Tarjeta con los 4 números, en palabras simples y sin porcentajes. */
function ResultadoCard({ calc, precioVenta }: { calc: CalculoCompra; precioVenta: number | null }) {
  const completo = calc.gananciaUnitaria !== null && calc.gananciaTotal !== null && precioVenta !== null
  return (
    <div className="rounded-xl border border-line bg-inset p-3">
      <div className="flex justify-between text-sm">
        <span className="text-fg-soft">Te cuesta cada unidad</span>
        <span className="font-bold text-fg">S/ {calc.costoUnitario.toFixed(2)}</span>
      </div>
      {completo && precioVenta !== null && calc.gananciaUnitaria !== null && calc.gananciaTotal !== null ? (
        <>
          <div className="mt-1 flex justify-between text-sm">
            <span className="text-fg-soft">La venderás a</span>
            <span className="font-bold text-fg">S/ {precioVenta.toFixed(2)}</span>
          </div>
          <div className="mt-1 flex justify-between text-sm">
            <span className="text-fg-soft">Ganarás por cada unidad</span>
            <span className={`font-bold ${calc.gananciaUnitaria > 0 ? 'text-success' : 'text-danger'}`}>
              S/ {calc.gananciaUnitaria.toFixed(2)}
            </span>
          </div>
          <div className="mt-1 flex justify-between text-sm">
            <span className="text-fg-soft">Ganancia si vendes todo</span>
            <span className={`font-bold ${calc.gananciaTotal > 0 ? 'text-success' : 'text-danger'}`}>
              S/ {calc.gananciaTotal.toFixed(2)}
            </span>
          </div>
          {calc.veredicto === 'conviene' ? (
            <div className="mt-2 rounded-xl border border-success/40 bg-success/10 p-3 text-center">
              <p className="font-bold text-success">Conviene</p>
              <p className="mt-0.5 text-xs text-fg-soft">
                Ganarás S/ {calc.gananciaUnitaria.toFixed(2)} por cada una
              </p>
            </div>
          ) : (
            <div className="mt-2 rounded-xl border border-danger/40 bg-danger/10 p-3 text-center">
              <p className="font-bold text-danger">No hay ganancia</p>
              <p className="mt-0.5 text-xs text-fg-soft">
                El precio de venta no supera lo que te cuesta
              </p>
            </div>
          )}
        </>
      ) : (
        <p className="mt-2 text-xs text-fg-mute">
          Escribe tu precio de venta para ver si conviene.
        </p>
      )}
      <p className="mt-2 text-xs text-fg-mute">
        Cálculo con estos precios, sin otros gastos (pasajes, envolturas) ni lo que no se venda.
      </p>
    </div>
  )
}

/** Calculadora suelta: prueba números sin guardar nada. */
function CalculadoraLibre() {
  const [mayorista, setMayorista] = useState('')
  const [precio, setPrecio] = useState('')
  const [unidades, setUnidades] = useState('')
  const [venta, setVenta] = useState('')
  const [fijado, setFijado] = useState<{
    mayorista: string
    calc: CalculoCompra
    venta: number | null
  } | null>(null)

  const precioN = parseAmount(precio)
  const unidadesN = Number(unidades)
  const ventaN = venta.trim() === '' ? null : parseAmount(venta)
  const precioValido = Number.isFinite(precioN) && precioN > 0
  const unidadesValidas = Number.isInteger(unidadesN) && unidadesN >= 1
  const ventaValida = ventaN === null || (Number.isFinite(ventaN) && ventaN > 0)

  const calc: CalculoCompra | null =
    precioValido && unidadesValidas
      ? calcularCompra({
          precioPaquete: precioN,
          unidadesPorPaquete: unidadesN,
          paquetes: 1,
          precioVenta: ventaValida ? ventaN : null,
        })
      : null
  const completo = calc !== null && calc.gananciaUnitaria !== null

  function borrar() {
    setMayorista('')
    setPrecio('')
    setUnidades('')
    setVenta('')
  }

  return (
    <div className="flex flex-col gap-3">
      {fijado && (
        <div className="rounded-2xl border border-line-active bg-selected p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-fg">{fijado.mayorista || 'Resultado fijado'}</p>
            <button onClick={() => setFijado(null)} className="text-xs font-bold text-danger">
              Quitar
            </button>
          </div>
          <div className="mt-1 flex justify-between text-sm">
            <span className="text-fg-soft">Le cuesta cada una</span>
            <span className="font-bold text-fg">S/ {fijado.calc.costoUnitario.toFixed(2)}</span>
          </div>
          {fijado.calc.gananciaUnitaria !== null && (
            <div className="mt-1 flex justify-between text-sm">
              <span className="text-fg-soft">Gana por cada una</span>
              <span className={`font-bold ${fijado.calc.gananciaUnitaria > 0 ? 'text-success' : 'text-danger'}`}>
                S/ {fijado.calc.gananciaUnitaria.toFixed(2)}
              </span>
            </div>
          )}
        </div>
      )}

      <Input
        label="Mayorista (opcional)"
        value={mayorista}
        onChange={(e) => setMayorista(e.target.value)}
        placeholder="Ej: Mayorista Central"
        maxLength={60}
      />
      <Input
        label="Precio del paquete (S/)"
        type="text"
        inputMode="decimal"
        enterKeyHint="done"
        value={precio}
        onChange={(e) => setPrecio(e.target.value)}
        placeholder="Ej: 60"
      />
      <StepperInput
        label="Unidades en el paquete"
        value={unidades}
        onChange={setUnidades}
        step={1}
        min={1}
        allowEmpty
        placeholder="Ej: 12"
      />
      <Input
        label="Tu precio de venta por unidad (S/)"
        type="text"
        inputMode="decimal"
        enterKeyHint="done"
        value={venta}
        onChange={(e) => setVenta(e.target.value)}
        placeholder="Ej: 8"
      />

      {calc ? (
        <ResultadoCard calc={calc} precioVenta={ventaValida ? ventaN : null} />
      ) : (
        <p className="text-sm text-fg-mute">
          Escribe el precio del paquete y cuántas unidades trae para ver el cálculo.
        </p>
      )}

      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="md"
          className="flex-1"
          disabled={!completo || calc === null}
          onClick={() => {
            if (!calc) return
            setFijado({ mayorista: mayorista.trim(), calc, venta: ventaValida ? ventaN : null })
          }}
        >
          Fijar para comparar
        </Button>
        <Button variant="ghost" size="md" onClick={borrar}>
          Borrar
        </Button>
      </div>
    </div>
  )
}

function MisCompras() {
  const [search, setSearch] = useState('')
  const [orden, setOrden] = useState<Orden>('recientes')
  const [pagina, setPagina] = useState(1)
  const [openNew, setOpenNew] = useState(false)
  const [detalle, setDetalle] = useState<Compra | null>(null)

  const [comprasState, retryCompras] = useQueryState(() => db.compras.reverse().sortBy('createdAt'), [])

  if (comprasState.status === 'loading' && comprasState.data === null) {
    return <LoadingState rows={4} label="Cargando compras..." />
  }

  if (comprasState.status === 'error') {
    return (
      <ErrorState
        title="No pudimos cargar las compras"
        description="Las compras guardadas no están disponibles ahora mismo."
        onRetry={retryCompras}
      />
    )
  }

  const compras = comprasState.data ?? []
  if (compras.length === 0) {
    return (
      <EmptyState
        icon="🛍️"
        title="Sin compras todavía"
        description="Calcula si te conviene y registra tus compras al por mayor."
        action={
          <Button size="md" onClick={() => setOpenNew(true)}>
            + Nueva compra
          </Button>
        }
      />
    )
  }

  const filtradas = rankMatches(compras, search, (c) => [c.nombre, c.mayorista])
  if (orden === 'antiguos') filtradas.reverse()

  const totalPaginas = calcularPaginas(filtradas.length)
  const paginaActual = Math.min(pagina, totalPaginas)
  const paginaItems = paginar(filtradas, paginaActual)

  return (
    <>
      <Button size="lg" className="mb-4" onClick={() => setOpenNew(true)}>
        + Nueva compra
      </Button>

      <SearchBox
        value={search}
        onChange={(v) => {
          setSearch(v)
          setPagina(1)
        }}
        results={filtradas.length}
        total={compras.length}
        placeholder="Ej: medias, Mayorista Central"
      />

      <div className="mt-3">
        <FilterChips<Orden>
          titulo="Ordenar"
          valor={orden}
          onChange={(v) => {
            setOrden(v)
            setPagina(1)
          }}
          opciones={[
            { valor: 'recientes', etiqueta: 'Más recientes' },
            { valor: 'antiguos', etiqueta: 'Más antiguas' },
          ]}
        />
      </div>

      {filtradas.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon="🔍"
            title={`No encontramos "${search.trim()}"`}
            description="Revisa la ortografía o intenta con otra palabra."
            action={
              <Button
                variant="secondary"
                size="md"
                onClick={() => {
                  setSearch('')
                  setPagina(1)
                }}
              >
                Borrar búsqueda
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {paginaItems.map((c) => (
            <button key={c.id} type="button" onClick={() => setDetalle(c)} className="text-left">
              <Card>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-bold">
                      {c.nombre}
                      <span className="font-semibold text-fg-mute"> · {c.detalleVariante}</span>
                    </p>
                    <p className="text-sm text-fg-mute">
                      {c.mayorista} · {formatearFechaCorta(c.fecha)}
                    </p>
                    <p className="mt-1 text-sm text-fg-soft">
                      {c.paquetes} {c.paquetes === 1 ? 'paquete' : 'paquetes'} · S/{' '}
                      {c.costoUnitario.toFixed(2)} c/u
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-bold ${
                      c.estado === 'registrada'
                        ? 'border-success/50 text-success'
                        : 'border-line-strong text-fg-mute'
                    }`}
                  >
                    {c.estado === 'registrada' ? 'Comprada' : 'Solo cálculo'}
                  </span>
                </div>
              </Card>
            </button>
          ))}
          <Paginator pagina={paginaActual} totalPaginas={totalPaginas} onChange={setPagina} />
        </div>
      )}

      <NuevaCompraModal open={openNew} onClose={() => setOpenNew(false)} />
      <DetalleCompraModal compra={detalle} onClose={() => setDetalle(null)} />
    </>
  )
}

function NuevaCompraModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { show } = useToast()
  const navigate = useNavigate()
  const [paso, setPaso] = useState<'datos' | 'pago'>('datos')

  const [busqueda, setBusqueda] = useState('')
  const [producto, setProducto] = useState<Product | null>(null)
  const [varianteId, setVarianteId] = useState<string | null>(null)
  const [mayorista, setMayorista] = useState('')
  const [fecha, setFecha] = useState(todayISO())
  const [paquetes, setPaquetes] = useState('1')
  const [precio, setPrecio] = useState('')
  const [unidades, setUnidades] = useState('')
  const [venta, setVenta] = useState('')
  const [pago, setPago] = useState<CompraPago>('no-pagada')
  const [busy, setBusy] = useState(false)

  const [productosState] = useQueryState(
    () => db.products.filter((p) => p.active && !p.deleted).toArray(),
    [],
  )
  const [variantesState] = useQueryState(
    () =>
      producto
        ? db.productVariants.where('productId').equals(producto.id).toArray()
        : Promise.resolve([] as ProductVariant[]),
    [producto?.id],
  )
  const [proveedoresState] = useQueryState(listarProveedores, [])

  const productos = productosState.data ?? []
  const variantes = variantesState.data ?? []
  const proveedores = (proveedoresState.data ?? []).slice(0, 6)

  const coincidencias = busqueda.trim() === '' ? [] : rankMatches(productos, busqueda, (p) => [p.name, p.category ?? '']).slice(0, 6)

  const precioN = parseAmount(precio)
  const paquetesN = Number(paquetes)
  const unidadesN = Number(unidades)
  const ventaN = venta.trim() === '' ? null : parseAmount(venta)
  const numerosValidos =
    Number.isFinite(precioN) &&
    precioN > 0 &&
    Number.isInteger(paquetesN) &&
    paquetesN >= 1 &&
    Number.isInteger(unidadesN) &&
    unidadesN >= 1
  const ventaValida = ventaN === null || (Number.isFinite(ventaN) && ventaN > 0)
  const calc: CalculoCompra | null =
    numerosValidos
      ? calcularCompra({
          precioPaquete: precioN,
          unidadesPorPaquete: unidadesN,
          paquetes: paquetesN,
          precioVenta: ventaValida ? ventaN : null,
        })
      : null

  function elegirProducto(p: Product) {
    setProducto(p)
    setVarianteId(null)
    setBusqueda('')
    if (venta.trim() === '') setVenta(p.price.toFixed(2))
  }

  function cerrar() {
    setPaso('datos')
    setBusqueda('')
    setProducto(null)
    setVarianteId(null)
    setMayorista('')
    setFecha(todayISO())
    setPaquetes('1')
    setPrecio('')
    setUnidades('')
    setVenta('')
    setPago('no-pagada')
    setBusy(false)
    onClose()
  }

  function armar(): CompraInput | null {
    if (!producto) {
      show('Elige el producto primero', 'error')
      return null
    }
    if (variantes.length === 0) {
      show('Espera un momento e inténtalo de nuevo', 'error')
      return null
    }
    // Con una sola talla o color no se pregunta: se usa directo.
    const vid = variantes.length === 1 && variantes[0] ? variantes[0].id : varianteId
    const variante = variantes.find((v) => v.id === vid) ?? null
    if (!variante) {
      show('Elige la talla o el color', 'error')
      return null
    }
    if (!numerosValidos) {
      show('Revisa los paquetes, el precio y las unidades', 'error')
      return null
    }
    if (!ventaValida) {
      show('Escribe un precio de venta válido', 'error')
      return null
    }
    if (mayorista.trim() === '') {
      show('Escribe el nombre del mayorista', 'error')
      return null
    }
    if (fecha.trim() === '') {
      show('Elige la fecha de la compra', 'error')
      return null
    }
    return {
      productoId: producto.id,
      varianteId: variante.id,
      nombre: producto.name,
      detalleVariante: describir(variante),
      mayorista: mayorista.trim(),
      fecha: fecha.trim(),
      paquetes: paquetesN,
      precioPaquete: precioN,
      unidadesPorPaquete: unidadesN,
      precioVenta: ventaValida ? ventaN : null,
    }
  }

  async function guardar() {
    if (busy) return
    const input = armar()
    if (!input) return
    setBusy(true)
    try {
      await guardarCalculo(input)
      show('Cálculo guardado')
      cerrar()
    } catch (e) {
      show(e instanceof Error ? e.message : 'No se pudo guardar', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function comprar() {
    if (busy) return
    const input = armar()
    if (!input) return
    setBusy(true)
    try {
      await confirmarCompra(input, pago)
      show('Compra guardada y unidades sumadas')
      cerrar()
    } catch (e) {
      show(e instanceof Error ? e.message : 'No se pudo registrar', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} title="Nueva compra" onClose={cerrar}>
      {paso === 'datos' ? (
        <div className="flex flex-col gap-3">
          {!producto ? (
            <>
              <SearchBox
                value={busqueda}
                onChange={setBusqueda}
                placeholder="Ej: medias"
                label="Busca el producto"
              />
              {busqueda.trim() !== '' && (
                coincidencias.length === 0 ? (
                  <div className="rounded-xl border border-line bg-inset p-3 text-center">
                    <p className="text-sm font-bold text-fg">No encontramos ese producto</p>
                    <p className="mt-1 text-xs text-fg-mute">
                      Primero agrégalo en Inventario y vuelve aquí.
                    </p>
                    <Button
                      variant="secondary"
                      size="md"
                      className="mt-2"
                      onClick={() => {
                        cerrar()
                        navigate('/inventario')
                      }}
                    >
                      Ir a Inventario
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {coincidencias.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => elegirProducto(p)}
                        className="rounded-xl border border-line bg-inset p-3 text-left transition-colors duration-150 hover:border-line-active"
                      >
                        <p className="truncate font-bold text-fg">{p.name}</p>
                        {p.category && <p className="text-xs text-fg-mute">{p.category}</p>}
                      </button>
                    ))}
                  </div>
                )
              )}
            </>
          ) : (
            <div className="rounded-xl border border-line-active bg-selected p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-bold text-fg">{producto.name}</p>
                  <p className="text-xs text-fg-mute">S/ {producto.price.toFixed(2)} por unidad</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setProducto(null)
                    setVarianteId(null)
                  }}
                  className="shrink-0 text-xs font-bold text-cta-text"
                >
                  Cambiar
                </button>
              </div>
              {variantes.length > 1 && (
                <div className="mt-2 flex flex-col gap-2">
                  <p className="text-xs font-bold text-fg-soft">¿Cuál talla o color compraste?</p>
                  {variantes.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVarianteId(v.id)}
                      className={`rounded-xl border px-3 py-2 text-left text-sm font-semibold transition-colors duration-150 ${
                        varianteId === v.id
                          ? 'border-line-active bg-selected text-fg'
                          : 'border-line bg-inset text-fg-soft'
                      }`}
                    >
                      {describir(v)} · {v.quantity} ahora
                    </button>
                  ))}
                </div>
              )}
              {variantes.length === 1 && varianteId === null && (
                <p className="mt-2 text-xs text-fg-mute">Se sumará a: {describir(variantes[0])}</p>
              )}
            </div>
          )}

          <Input
            label="Mayorista"
            value={mayorista}
            onChange={(e) => setMayorista(e.target.value)}
            placeholder="Ej: Mayorista Central"
            maxLength={60}
          />
          {proveedores.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {proveedores.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMayorista(m)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors duration-150 ${
                    mayorista.trim().toLowerCase() === m.toLowerCase()
                      ? 'border-line-active bg-selected text-fg'
                      : 'border-line bg-inset text-fg-soft'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          )}

          <Input
            label="Fecha de la compra"
            type="date"
            value={fecha}
            max={todayISO()}
            onChange={(e) => setFecha(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <StepperInput
              label="Paquetes"
              value={paquetes}
              onChange={setPaquetes}
              step={1}
              min={1}
            />
            <StepperInput
              label="Unidades por paquete"
              value={unidades}
              onChange={setUnidades}
              step={1}
              min={1}
              allowEmpty
              placeholder="Ej: 12"
            />
          </div>
          <Input
            label="Precio por paquete (S/)"
            type="text"
            inputMode="decimal"
            enterKeyHint="done"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
            placeholder="Ej: 60"
          />
          <Input
            label="Tu precio de venta por unidad (S/)"
            type="text"
            inputMode="decimal"
            enterKeyHint="done"
            value={venta}
            onChange={(e) => setVenta(e.target.value)}
            placeholder="Ej: 8"
          />

          {calc ? (
            <ResultadoCard calc={calc} precioVenta={ventaValida ? ventaN : null} />
          ) : (
            <p className="text-sm text-fg-mute">
              Completa paquetes, precio y unidades para ver el cálculo.
            </p>
          )}

          <Button variant="secondary" size="lg" onClick={guardar} disabled={busy}>
            Guardar solo el cálculo
          </Button>
          <Button size="lg" onClick={() => (armar() ? setPaso('pago') : undefined)} disabled={busy}>
            Compré este paquete
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-center text-sm font-bold text-fg">¿De dónde salió la plata?</p>
          <div className="flex flex-col gap-2">
            {PAGOS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPago(p.id)}
                className={`rounded-xl border px-4 py-3 text-left transition-colors duration-150 ${
                  pago === p.id
                    ? 'border-line-active bg-selected'
                    : 'border-line bg-inset'
                }`}
              >
                <p className="font-bold text-fg">{p.etiqueta}</p>
                <p className="text-xs text-fg-mute">{p.ayuda}</p>
              </button>
            ))}
          </div>
          <p className="text-xs text-fg-mute">
            Esto queda anotado en la compra para que tu caja cuadre.
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="md" className="flex-1" onClick={() => setPaso('datos')}>
              Atrás
            </Button>
            <Button size="md" className="flex-1" onClick={comprar} disabled={busy}>
              {busy ? 'Guardando...' : 'Confirmar compra'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

function DetalleCompraModal({ compra, onClose }: { compra: Compra | null; onClose: () => void }) {
  const navigate = useNavigate()
  if (!compra) return null

  return (
    <Modal open title={`Compra: ${compra.nombre}`} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full border px-2 py-0.5 text-xs font-bold ${
              compra.estado === 'registrada'
                ? 'border-success/50 text-success'
                : 'border-line-strong text-fg-mute'
            }`}
          >
            {compra.estado === 'registrada' ? 'Comprada' : 'Solo cálculo'}
          </span>
          {compra.estado === 'registrada' && (
            <span className="rounded-full border border-line-strong px-2 py-0.5 text-xs font-bold text-fg-soft">
              {pagoTexto(compra.pago)}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1 rounded-xl border border-line bg-inset p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-fg-soft">Producto</span>
            <span className="font-bold text-fg">
              {compra.nombre} · {compra.detalleVariante}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-fg-soft">Mayorista</span>
            <span className="font-bold text-fg">{compra.mayorista}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-fg-soft">Fecha</span>
            <span className="font-bold text-fg">{formatearFechaCorta(compra.fecha)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-fg-soft">Paquetes</span>
            <span className="font-bold text-fg">
              {compra.paquetes} × S/ {compra.precioPaquete.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-fg-soft">Pagaste en total</span>
            <span className="font-bold text-fg">S/ {compra.costoTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-fg-soft">Unidades en total</span>
            <span className="font-bold text-fg">{compra.unidadesTotal}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-fg-soft">Te cuesta cada unidad</span>
            <span className="font-bold text-fg">S/ {compra.costoUnitario.toFixed(2)}</span>
          </div>
          {compra.precioVenta !== null && (
            <div className="flex justify-between">
              <span className="text-fg-soft">La vendes a</span>
              <span className="font-bold text-fg">S/ {compra.precioVenta.toFixed(2)}</span>
            </div>
          )}
          {compra.gananciaUnitaria !== null && compra.gananciaTotal !== null && (
            <>
              <div className="flex justify-between">
                <span className="text-fg-soft">Ganas por cada unidad</span>
                <span className={`font-bold ${compra.gananciaUnitaria > 0 ? 'text-success' : 'text-danger'}`}>
                  S/ {compra.gananciaUnitaria.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-fg-soft">Ganancia si vendes todo</span>
                <span className={`font-bold ${compra.gananciaTotal > 0 ? 'text-success' : 'text-danger'}`}>
                  S/ {compra.gananciaTotal.toFixed(2)}
                </span>
              </div>
            </>
          )}
        </div>

        <Button
          variant="secondary"
          size="lg"
          onClick={() => {
            onClose()
            navigate('/inventario')
          }}
        >
          Ver producto en Inventario
        </Button>
      </div>
    </Modal>
  )
}
