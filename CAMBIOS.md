# Cambios realizados en **blanca-tienda**

> Documento de todo lo que se modificó desde **el primer mensaje** hasta hoy.
> Cada sección compara **ANTES → AHORA** con el archivo donde vive el cambio.
>
> **Verificación final:** `tsc` ✔ 0 errores · `eslint` ✔ 0 problemas · `vite build` ✔ compila.

---

## Índice

1. [Resumen en una página](#1-resumen-en-una-página)
2. [Flujo de caja obligatoria](#2-flujo-de-caja-obligatoria)
3. [Encabezado con fecha y hora](#3-encabezado-con-fecha-y-hora)
4. [Rediseño visual «Cyber Neon»](#4-rediseño-visual-cyber-neon)
5. [Rendimiento a 60 FPS en gama baja](#5-rendimiento-a-60-fps-en-gama-baja)
6. [Modales siempre por encima de la barra](#6-modales-siempre-por-encima-de-la-barra)
7. [Ventas: carrito, pago y máquina de estados](#7-ventas-carrito-pago-y-máquina-de-estados)
8. [Inventario: producto nuevo](#8-inventario-producto-nuevo)
9. [Los 5 estados de la interfaz](#9-los-5-estados-de-la-interfaz)
10. [Microinteracciones y feedback inmediato](#10-microinteracciones-y-feedback-inmediato)
11. [Búsqueda difusa con autocompletado](#11-búsqueda-difusa-con-autocompletado)
12. [Avisos de stock crítico](#12-avisos-de-stock-crítico)
13. [Teclado numérico optimizado](#13-teclado-numérico-optimizado)
14. [Código robusto y a prueba de fallos](#14-código-robusto-y-a-prueba-de-fallos)
15. [Base de datos: migración v4](#15-base-de-datos-migración-v4)
16. [Archivos nuevos, modificados y eliminados](#16-archivos-nuevos-modificados-y-eliminados)
17. [Cosas planeadas que todavía NO están](#17-cosas-planeadas-que-todavía-no-están)
18. [Línea de commit](#18-línea-de-commit)

---

## 1. Resumen en una página

| Área | ANTES | AHORA |
|---|---|---|
| **Venta sin caja** | Se podía vender con la caja cerrada | Imposible: modal obligatorio + guía que no se cierra hasta abrir caja |
| **Fecha/hora** | No aparecía en ningún lado | Encabezado de **todas** las páginas, día + fecha + hora |
| **Colores** | Paleta genérica | Paleta **Cyber Neon** con 30+ valores exactos en `@theme` |
| **Filtros visuales** | `backdrop-blur` en header, barra, tarjetas y modales | Ninguno: fondos opacos (la GPU no trabaja de más) |
| **Spinner** | Giro infinito `animate-spin` | Esqueletos estáticos que solo pulsan la opacidad |
| **Modales** | Quedaban **debajo** de la barra de navegación | Montados en un **portal** en `document.body`, z-100 sobre z-40 |
| **Pantallas cargando** | Spinner o nada | Esqueletos con etiqueta |
| **Pantallas sin datos** | Caja vacía en blanco | Emoji + título + **qué hacer ahora** + botón |
| **Pantallas con error** | La app se quedaba **congelada** | Aviso en español + botón *Volver a intentar* |
| **Éxito** | Solo un toast | Palomita grande 1,6 s **+** toast |
| **Doble toque en «Confirmar»** | **Se cobraba y descontaba stock 2 veces** | Bloqueo síncrono + clave idempotente en la base de datos |
| **Búsqueda** | `includes()` sin acentos | Difusa: `pnl` encuentra «polo», ignora acentos y mayúsculas |
| **Validación** | Solo al pulsar «Guardar» | Mientras se escribe, debajo del campo, en rojo |
| **Stock bajo** | Un número suelto en Inventario | Banner amarillo en Inicio **y** Ventas con enlace a reponer |
| **Campos numéricos** | `type="number"` | `inputMode="numeric/decimal"` + `enterKeyHint` |
| **Toast** | `Date.now()` como id, sin tope, sin limpieza | Contador incremental, tope de 3, sin duplicados, temporizadores limpiados |
| **Estado de los datos** | `useLiveQuery` → `undefined` no distinguía *carga* de *fallo* | `useQueryState` → tipo cerrado `loading \| ready \| error` |
| **Carrito** | Se mutaba el array directamente | Funciones **puras e inmutables** en `utils/cart.ts` |
| **Reglas de negocio** | Mezcladas dentro de los componentes | Módulos puros `validation.ts`, `payment.ts`, `search.ts` |
| **Lint** | 4 errores | **0 errores** |

---

## 2. Flujo de caja obligatoria

### ANTES
- Ventas funcionaba sin caja abierta. No había ningún aviso.
- La caja podía aperturarse con un monto inicial (mezclando dinero de días anteriores).
- El cierre era un conteo de dinero sin una pregunta clara.

### AHORA

**a) Modal de Ventas (`src/pages/Ventas.tsx`)**
- Aparece **siempre** que la caja esté cerrada, sin importar cómo se llegue a la pantalla.
- **No se puede cerrar tocando fuera**: solo se cierra al entrar a Caja.
- Al tocar fuera: fondo más oscuro (~1,8 s), beep de `src/assets/Sounds/Warning/Beep.mp3` y toast desde arriba: *«¡Importante! Presiona Abrir Caja»*.
- El botón dice exactamente **«Abrir caja»** (nada más).

**b) Guía de apertura (`src/components/layout/AbrirCajaGuia.tsx`)**
- Se muestra **cada vez** que la caja está cerrada, venga de donde venga (Inicio, Ventas, menú inferior).
- `TrueFocus` enfoca el botón letra por letra.
- Texto del botón: solo **«Abrir caja»**.
- El desenfoque al tocar fuera se resuelve con **opacidad de fondo**, nunca con `backdrop-filter`.
- Temporizador cancelado al desmontar (sin timers huérfanos).

**c) Apertura y cierre (`src/services/cash.ts`)**
- `openingAmount: 0` → la caja **siempre arranca en 0**.
- `openCashRegister()` ya no recibe argumentos.
- El vuelto es solo una calculadora, no modifica la caja.
- El cierre pregunta **«¿Cómo te fue con la caja?»** con tres opciones:
  `exacto` · `sobro` · `falto` → `CierreResultado`.
- Diferencia calculada: `sobro → +monto`, `falto → −monto`, `exacto → 0`.

**d) Bloqueo en Inicio**
- Si la caja está cerrada, Inicio muestra el candado con *«Toca aquí para abrir caja»*.

---

## 3. Encabezado con fecha y hora

**Archivo:** `src/components/layout/AppLayout.tsx`

### ANTES
- Solo el título de la página.

### AHORA
```
Ventas                          (estado de conexión)
lunes 10 de octubre        14:32
```
- `formatDate()` en español: día de la semana + número + mes.
- `formatTime()` con `toLocaleTimeString('es-PE', …)`.
- Se actualiza solo **cada 30 s** (un `setInterval` en vez de un render por segundo).
- Se muestra en **todas** las páginas, porque vive en `AppLayout`.

---

## 4. Rediseño visual «Cyber Neon»

**Archivo:** `src/index.css` (bloque `@theme` de Tailwind v4)

> **Nota:** en Tailwind v4 la configuración es por CSS. **No** se creó un
> `tailwind.config.ts` porque sería código muerto sin `@config`.

### Paleta aplicada (valores exactos)

| Token | Valor | Uso |
|---|---|---|
| `--color-bg` | `#05050A` | Fondo general |
| `--color-chrome` | `#090610` | Header y barra inferior |
| `--color-surface` | `#100D1C` | Superficie |
| `--color-raised` | `#191329` | Elemento elevado |
| `--color-selected` | `#251440` | Selección |
| `--color-title` | `#FFFFFF` | Títulos |
| `--color-fg` | `#F1F0FF` | Texto principal |
| `--color-fg-soft` | `#B7B7CC` | Subtítulos |
| `--color-fg-mute` | `#9292AD` | Texto auxiliar |
| `--color-cta` / `line-active` | `#00F5FF` | Cian: borde, foco, acento de título |
| `--color-cta-surface` | `#00909F` | Superficie del botón primario (letras blancas legibles) |
| `--color-cta-surface-hi/lo` | `#00B4C2` / `#00707D` | Gradiente del botón |
| `--color-accent` | `#8B00FF` | Violeta |
| `--color-accent-text` | `#00D9FF` | Enlaces |
| `--color-label-active` | `#FF00E5` | Etiqueta activa |
| `--color-ruby-text` | `#FF2BD6` | Precios |
| `--color-line` | `#30213F` | Borde |
| `--color-hover` | `#351454` | Hover |
| `--color-success` | `#39FF14` | Éxito |
| `--color-danger` | `#FF1744` | Error |
| `--color-warning` | `#FFFF00` | Alerta |
| `--color-info` | `#2864FF` | Información |

- Letras de botones y títulos: **blancas**.
- `Card` / `Button` / `Spinner` ahora **delegan** en `TarjetaCyber` / `BotonCyber` / `Skeleton` (sin estilos duplicados).

---

## 5. Rendimiento a 60 FPS en gama baja

### Reglas aplicadas en todo el proyecto

| Regla | ANTES | AHORA |
|---|---|---|
| Animar solo `transform` y `opacity` | Se animaban sombras, tamaños y filtros | **Solo** `transform`/`opacity` |
| Nunca animar layout/paint | `top`, `width`, `box-shadow` animados | Eliminados |
| `will-change` en línea en lo que se anima | No estaba | `FondoNeon`, `TrueFocus`, `BotonCyber`, `SuccessState`, `SearchBox`, `StepperInput`, `Inicio` |
| Componentes estáticos en `React.memo` | No había | `FondoNeon`, `TarjetaCyber` |
| `active:` en vez de `:hover` complejo | `hover:` con transformaciones | `active:scale-95` / `active:scale-90` |
| Transiciones ≤ 150 ms | Transiciones libres | `duration-150 ease-out` |
| **Sin** spinners infinitos | `animate-spin` | **Eliminado**: esqueletos de opacidad |
| **Sin** `backdrop-blur` | Header, barra, tarjetas, modales | **Eliminado** en todas partes |
| **Sin** `text-shadow` animado | Presente | Eliminado |

### Archivos de rendimiento nuevos
- `src/components/cyber/FondoNeon.tsx` — orbes animados, orbs centrados con `inset-x-0 mx-auto` para no chocar con la animación de `transform`.
- `src/components/cyber/TarjetaCyber.tsx`
- `src/components/cyber/BotonCyber.tsx` — `will-change` fijo en CSS (declararlo por interacción crea capas y provoca jank).
- `src/components/cyber/Skeleton.tsx` — reemplaza el arco giratorio.

### Extras
- `prefers-reduced-motion` respetado.
- `overscroll-behavior-y: none` (sin rebote al deslizar).
- `AbrirCajaGuia`: `backgroundColor` con `transition` de 150 ms en vez de filtro.

---

## 6. Modales siempre por encima de la barra

**Archivos nuevos:** `src/components/ui/Portal.tsx` · `src/components/ui/Modal.tsx`

### ANTES
Los modales se renderizaban dentro de la página. La barra inferior (`z-40`) y el
header (`z-30`) se comían las capas y **los modales quedaban debajo**.

### AHORA

| Capa | z-index |
|---|---|
| Barra de navegación | `40` |
| Header | `30` |
| **Todos los modales** (`Z_OVERLAY = 100`) | `100` |
| Confirmación de éxito | `110` |
| Toasts | `130` |

- `Portal` usa `createPortal(..., document.body)` → el z-index no se hereda.
- Migrados: `Modal`, `AbrirCajaGuia`, el recordatorio de caja de Ventas.

---

## 7. Ventas: carrito, pago y máquina de estados

### ANTES
- Carrito mutado directamente con `setCart` sobre el mismo array.
- `paid = Number(amountPaid) || 0`, `change = paid > 0 ? paid - total : null`.
- `disabled={insufficientPayment}` sin estado de ocupado → **doble toque = dos ventas**.
- Sin búsqueda de productos.
- Si el stock cambiaba, el carrito guardaba números viejos.

### AHORA

**a) Carrito puro e inmutable — `src/utils/cart.ts`**

| Función | Comportamiento |
|---|---|
| `addItem` | Suma 1; nunca supera el stock; devuelve `{cart, error}` |
| `setQuantity` | Cantidad **absoluta** (idempotente); 0 = quita el producto |
| `removeItem` | Quitar dos veces deja el mismo carrito |
| `clearCart` | Devuelve array nuevo |
| `cartTotal` / `cartCount` | Puros, con `round2` |
| `syncStock` | Reconcilia con el stock real y explica qué cambió |

- Si no hay cambios, se devuelve **la misma referencia** → React no re-renderiza.

**b) Máquina de estados del pago — `src/utils/payment.ts`**

```
idle ──SUBMIT──▶ processing ──DONE──▶ success
                     │
                     └──FAIL──▶ error
```
- `paymentReducer` es **puro**: mismo estado + mismo evento ⇒ mismo resultado.
- Un evento fuera de lugar devuelve **el mismo objeto** (referencia idéntica) → el
  segundo toque no arranca nada nuevo.
- `canSubmit` · `isProcessing` · `submitLabel` · `computeChange` · `shortfall`.

**c) Flujo de confirmación en `CartModal`**
- `inFlightRef` síncrono: bloquea el doble toque **antes** de que React repinte.
- `requestIdRef` genera **una sola clave por intento**; se reutiliza si se reintenta
  y se borra al tener éxito.
- Botón: `Guardando…` → `¡Listo!` / `Intentar de nuevo`.
- Éxito: `SuccessState` (palomita 1,6 s) y **después** se cierra.
- Error de caja: se cierra el modal y se dispara la guía.
- Reconciliación del carrito con el stock real **dentro del manejador de eventos**
  (`conStockReal`) — no en un efecto, así se evitan renders en cascada.

**d) Interfaz**
- `SearchBox` con difusión sobre nombre, categoría, talla y color.
- `LowStockAlert` arriba de la lista.
- Estados: cargando / error / sin productos / sin resultados.

---

## 8. Inventario: producto nuevo

**Archivo:** `src/pages/Inventario.tsx` · **Modal:** `NewProductModal`

### ANTES
- Campo «stock mínimo» en el formulario.
- Precio sin prefijo, teclado normal, sin botones `+`/`−`.
- Validación solo al guardar: `if (!name.trim()) return show(...)`.
- «Tallas y colores» siempre visible (pantalla larga).
- Sin búsqueda real.

### AHORA

**a) `StepperInput` (`src/components/ui/StepperInput.tsx`)**
- **«Precio de Venta»** con `S/` **dentro** del campo.
- Botones `+` / `−` y botón `×` para limpiar.
- Teclado numérico.
- Si se teclea una letra: borra + suena `Error.mp3` + toast *«Aquí solo van números…»*.
- **Sin ceros a la izquierda** (`012 → 12`), conserva decimales (`0.50`).
- **«Cantidad inicial»** con `+` / `−`.

**b) Validación en línea**
```ts
const nameCheck  = validateName(name, 'el nombre')
const priceCheck = validateAmount(price, 'el precio')
const nameError  = name !== '' && !nameCheck.ok ? nameCheck.error : null
```
- El aviso aparece **mientras se escribe**, con borde rojo y `aria-invalid`.
- Al guardar, `firstError(...)` resume todo en un solo toast.

**c) Divulgación progresiva**
- «Tallas y colores» **plegado por defecto**.
- Muestra un resumen: *«opcional»* o *«3 variantes»*.
- Se abre con *«Personalizar ▸»* y se cierra con *«Listo ▾»*.
- El botón `+ Agregar` queda dentro de la sección abierta.

**d) `stock-min` fuera del formulario**
- `Product.stockMin` **sigue existiendo** en el modelo (lo usa el aviso de stock
  crítico) pero **ya no se pide** al crear un producto; `createProduct` lo pone en `0`.

---

## 9. Los 5 estados de la interfaz

### ANTES
- `useLiveQuery` devuelve `undefined` **tanto** mientras carga **como** cuando
  falla → la pantalla no puede diferenciar *«todavía cargo»* de *«se rompió»*.
- Si había error, se quedaba el spinner **para siempre** o una caja en blanco.

### AHORA — `src/hooks/useQueryState.ts`

```ts
type QueryState<T> =
  | { status: 'loading'; data: T | null; error: null }
  | { status: 'ready';   data: T;     error: null }
  | { status: 'error';   data: T | null; error: string }
```
- Usa `liveQuery` de Dexie con `subscribe({ next, error })` → **cero ambigüedad**.
- Al reintentar **conserva los últimos datos válidos** (no se vacía la pantalla).
- `retry()` limpia el error y vuelve a cargar.

### Componentes de estado

| Estado | Componente | Qué ve la persona |
|---|---|---|
| Cargando | `LoadingState` | Esqueletos + *«Cargando productos…»* (`role="status"`) |
| Vacío | `EmptyState` | Emoji + título + descripción + **botón de siguiente paso** |
| Sin resultados | `EmptyState` variante | *«No encontramos "polo negro"»* + *Borrar búsqueda* |
| Error | `ErrorState` | *«Tuvimos un problema»* + *Volver a intentar* (`role="alert"`) |
| Éxito | `SuccessState` | Palomita grande 1,6 s (`role="status"`) |

### Páginas cubiertas
`Inicio` (caja + resumen) · `Ventas` (caja + productos) · `Inventario` (lista) ·
`Historial` (ventas + movimientos + cierres) · `Caja` (caja + ventas + cierres).

---

## 10. Microinteracciones y feedback inmediato

| Elemento | ANTES | AHORA |
|---|---|---|
| Botón de pago | Siempre «Confirmar venta» | `Guardando…` / `¡Listo!` / `Intentar de nuevo` |
| `Input` | Borde normal + texto de error | **Borde rojo** + `aria-invalid` + `aria-describedby` |
| `Toast` id | `Date.now()` (colisiona) | Contador incremental `seqRef` |
| Toasts repetidos | Se apilaban | **Se reemplazan** (idempotente) |
| Cantidad de toasts | Sin límite | **Máximo 3** |
| Temporizadores | Nunca se limpiaban | Se limpian al desmontar |
| Tipos de toast | success / error / info | + **`warning`** (amarillo `#FFFF00` con texto negro) |
| Toasts vs header | Podían taparlo | `top-[4.5rem]` + `z-[130]` |
| Feedback de toque | `hover:` | `active:scale-95` / `90` (funciona en celular) |
| Botones secundarios | — | `disabled` real mientras hay trabajo en curso |

---

## 11. Búsqueda difusa con autocompletado

**Nuevo:** `src/utils/search.ts`

### ANTES
```ts
filtered = products.filter(p => p.name.toLowerCase().includes(term))
```
- Fallaba con acentos («polo» ≠ «poló»).
- No buscaba en talla, color ni categoría.

### AHORA
```ts
rankMatches(productos, texto, item => [
  item.product.name,
  item.product.category ?? '',
  item.variant.size ?? '',
  item.variant.color ?? '',
])
```

- `normalize()` — minúsculas, **sin acentos**, sin espacios repetidos. **Idempotente.**
- `fuzzyScore()` — orden de intentos: igualdad → prefijo → subcadena → **subsecuencia**
  («`pnl`» encuentra «polo»). Bonifica letras seguidas y letras que abren palabra.
- Nunca lanza excepciones: entrada rara ⇒ `-1` (sin coincidencia).
- Devuelve **el mejor puntaje de cada campo** y ordena de mejor a peor.
- **No muta** la lista de entrada.

### Componente nuevo `src/components/ui/SearchBox.tsx`
- `type="search"` + `inputMode="search"` + `enterKeyHint="search"` + `autoCorrect=off`.
- Botón `×` para borrar.
- Contador *«12 de 40»* con `aria-live="polite"`.
- Si no hay resultados: borde rojo + mensaje *«No encontramos nada con …»*.

**Dónde está:** `Ventas` y `Inventario`.

---

## 12. Avisos de stock crítico

**Nuevo:** `src/hooks/useLowStock.ts` + `src/components/ui/LowStockAlert.tsx`

### ANTES
- Solo un número en la tarjeta «Productos con poco stock» de Inicio.

### AHORA
- `useLowStock()` calcula **en un solo sitio** los productos con
  `cantidad <= stockMin`, con detalle (talla/color o categoría).
- `LowStockAlert` muestra en **Inicio y Ventas**:
  - Título: *«3 productos se están acabando»*.
  - Lista (máx. 3) con unidades restantes en rojo.
  - *«y 2 más…»* si excede.
  - Enlace **«Reponer en Inventario →»**.
- **Cláusula de guarda:** sin faltantes **no renderiza nada** (coste cero).
- En Inicio el contador se pone en rojo cuando hay faltantes.

---

## 13. Teclado numérico optimizado

**Archivos:** `Ventas.tsx`, `Inventario.tsx`, `Caja.tsx`, `StepperInput.tsx`, `Input.tsx`

### ANTES
```tsx
<Input label="Cantidad" type="number" value={qty} />
```

### AHORA
```tsx
<Input label="Cantidad" type="text" inputMode="numeric" enterKeyHint="done" … />
<Input label="Precio"   type="text" inputMode="decimal" … />
```
- Abre el teclado **numérico** en celular.
- Sin flechitas de incremento raras del navegador.
- Sin la «e» de notación científica ni signos raros.
- `StepperInput` ya usaba `inputMode="decimal"` y filtra letras en el cambio.

---

## 14. Código robusto y a prueba de fallos

### a) Cláusulas de guarda y retorno temprano
```ts
// ANTES
if (drafts.length === 0) return show('Agrega al menos un producto', 'error')
try { await registerSale(...) } catch (e) { … }

// AHORA
if (inFlightRef.current || !canSubmit(payment) || cart.length === 0 || !pago.ok) return
if (drafts.length === 0) { show('Agrega al menos un producto', 'error'); return }
if (!validateForm()) return
if (!pago.ok) { show(pago.error, 'error'); return }
```
Todo lo demás — `if (!variant) return`, `if (!product) return` — en lugar de
`if (variant) { … }` anidado.

### b) Funciones puras y deterministas

| Archivo | Contenido |
|---|---|
| `src/utils/validation.ts` | `Validation<T>` (`ok`/`invalid`), `firstError`, `validateName`, `validateAmount`, `validateQuantity`, `validatePayment`. **Nunca lanzan.** |
| `src/utils/payment.ts` | `paymentReducer`, `canSubmit`, `submitLabel`, `computeChange`, `shortfall` |
| `src/utils/cart.ts` | Operaciones inmutables + `syncStock` |
| `src/utils/search.ts` | `normalize`, `fuzzyScore`, `rankMatches` |
| `src/utils/money.ts` | `round2`, `money`, `parseAmount`, `sumMoney` (tolerante a `S/`, comas y texto) |

### c) Idempotencia

| Operación | Garantía |
|---|---|
| `normalize()` | Aplicarlo 2 veces = 1 vez |
| `setQuantity()` | Cantidad absoluta, no delta |
| `removeItem()` | Quitar lo mismo 2 veces = igual |
| `syncStock()` | Sin cambios ⇒ devuelve **la misma referencia** |
| `Toast.show()` | Mensaje repetido ⇒ **no se apila**, reinicia su cuenta |
| `paymentReducer` | Evento ilegal ⇒ devuelve **el mismo objeto** |
| `registerSale()` | Misma `clientRequestId` ⇒ devuelve la venta existente |
| `conStockReal()` | Sin diferencias ⇒ no hay re-render |

### d) Tolerancia a fallos y degradación elegante

- `useQueryState` → error visible + reintento **sin perder los datos**.
- Audio bloqueado → `catch {}` con comentario; el aviso visual sigue.
- `ToastProvider` limpia temporizadores al desmontar.
- `AbrirCajaGuia` limpia su temporizador de desenfoque al desmontar.
- `SuccessState` guarda `onDone` en un ref **dentro de un efecto** → el aviso sí
  desaparece aunque el padre se vuelva a renderizar.
- Si el stock cambia bajo el carrito → se recorta y se explica
  (*«Quedaban menos unidades de X: ahora son 4»*) en vez de fallar al cobrar.
- `round2` y `money` devuelven `0` ante entradas no numéricas.

### e) Inmutabilidad
- Ningún `.push()`, `.sort()` ni asignación sobre el estado de React.
- `categories` se construye con `.reduce()` sobre un array nuevo.
- `Historial` hace `[...lista].sort(...)` en vez de ordenar el array original.

### f) Código autodocumentado
- Nombres que explican la intención: `conStockReal`, `cashResolved`, `mostrarGuia`,
  `beepHechoRef`, `inFlightRef`, `requestIdRef`, `firstError`.
- Comentario de **por qué** en cada decisión de rendimiento y seguridad, no solo
  de **qué** hace.

### g) Separación de responsabilidades
- `ToastContext.ts` separado de `Toast.tsx` → la recarga en caliente funciona y
  quien recibe el aviso no carga el componente visual.

---

## 15. Base de datos: migración v4

**Archivo:** `src/lib/db.ts`

```ts
db.version(4).stores({
  sales: 'id, date, paymentMethod, syncStatus, registerId, anulada, clientRequestId',
})
```

- **Migración aditiva:** solo crea el índice, **no toca los datos existentes**.
- Nuevo campo opcional `Sale.clientRequestId` (`src/types/models.ts`).
- Verificación **dentro de la transacción** (`src/services/sales.ts`):
  leer y escribir son atómicos, así que dos toques simultáneos no pueden pasar
  ambos la comprobación.

---

## 16. Archivos nuevos, modificados y eliminados

### Nuevos (18)

| Archivo | Para qué sirve |
|---|---|
| `src/utils/cart.ts` | Carrito puro e inmutable |
| `src/utils/payment.ts` | Máquina de estados del pago |
| `src/utils/search.ts` | Búsqueda difusa |
| `src/utils/validation.ts` | Validaciones puras |
| `src/hooks/useQueryState.ts` | Consulta con estados cargando/ok/error |
| `src/hooks/useLowStock.ts` | Productos bajo el mínimo |
| `src/components/ui/LoadingState.tsx` | Esqueletos de carga |
| `src/components/ui/ErrorState.tsx` | Estado de error + reintento |
| `src/components/ui/SuccessState.tsx` | Palomita de éxito |
| `src/components/ui/SearchBox.tsx` | Búsqueda con borrado y contador |
| `src/components/ui/LowStockAlert.tsx` | Banner de stock crítico |
| `src/components/ui/Portal.tsx` | Portal a `document.body` |
| `src/components/ui/ToastContext.ts` | Contexto + `useToast` |
| `src/components/ui/Modal.tsx` | Modal compartido + `Z_OVERLAY` |
| `src/components/cyber/FondoNeon.tsx` | Fondo animado ligero |
| `src/components/cyber/TarjetaCyber.tsx` | Tarjeta |
| `src/components/cyber/BotonCyber.tsx` | Botón |
| `src/components/cyber/Skeleton.tsx` | Esqueleto (reemplaza el spinner) |

### Modificados (14)
`src/index.css` · `src/lib/db.ts` · `src/types/models.ts` · `src/services/sales.ts` ·
`src/services/cash.ts` · `src/services/inventory.ts` · `src/utils/money.ts` ·
`src/pages/{Ventas,Inventario,Inicio,Caja,Historial}.tsx` ·
`src/components/ui/{Modal,Button,Card,Input,EmptyState,Toast,StepperInput,TrueFocus}.tsx` ·
`src/components/layout/{AppLayout,AbrirCajaGuia,BottomNav}.tsx`

### Eliminados (1)
- **`src/components/ui/Spinner.tsx`** — duplicaba `LoadingState` y ya nadie lo importaba.

---

## 17. Cosas planeadas que todavía NO están

| Fase | Pendiente |
|---|---|
| **2** | Opciones de talla adaptativas según el tipo de prenda |
| **3** | Guardar y recuperar el borrador a mitad del formulario |
| **4** | Botones rápidos opcionales de color y categoría |
| **5** | Limpiar palabras técnicas que quedan en la interfaz |
| — | Quitar `dexie-react-hooks` de `package.json` (ya no se importa; se dejó intacto para no desincronizar el `package-lock.json`) |

---

## 18. Línea de commit

```
refactor(codigo): funciones puras, validacion en linea, estados de carga/error/vacio, busqueda difusa, aviso de stock critico y venta idempotente a prueba de doble toque
```

---

## Verificación final

| Comando | Resultado |
|---|---|
| `tsc -b --force` | ✔ **0 errores** |
| `eslint .` | ✔ **0 problemas** |
| `vite build` | ✔ **70 módulos · 445,31 kB JS (135,17 kB gzip) · 42,28 kB CSS** |

> El proyecto **no tiene git**: todo está sin commitear.
> `npm` no está en el `PATH`; los chequeos se corrieron con
> `C:\Program Files\nodejs\node.exe` invocando `typescript`, `eslint` y `vite`
> directamente desde `node_modules`.
