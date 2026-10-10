import { round2 } from './money'

/**
 * Reglas del carrito como funciones puras e inmutables.
 *
 * Ninguna función modifica el array que recibe: siempre devuelve una copia con
 * los cambios aplicados. Así se eliminan los bugs "fantasma" donde una sección
 * de la pantalla cambia datos que otra estaba mostrando.
 *
 * Idempotencia: repetir la misma operación sobre el resultado deja el carrito
 * igual (no sigue sumando ni duplicando), salvo `addItem`, que sí suma a propósito.
 */

export interface CartItem {
  variantId: string
  name: string
  price: number
  size?: string
  color?: string
  quantity: number
  /** Stock real disponible en ese momento. Límite duro del carrito. */
  available: number
}

export type CartItemInput = Omit<CartItem, 'quantity'> & { quantity?: number }

/** `cart` sin cambios + `error` opcional: React puede ignorar el re-render. */
export interface CartResult {
  cart: CartItem[]
  error?: string
}

const unchanged = (cart: CartItem[]): CartResult => ({ cart })

/** Agrega una unidad. No deja pasar más unidades de las que hay en stock. */
export function addItem(cart: CartItem[], input: CartItemInput): CartResult {
  const available = Math.max(0, Math.floor(input.available ?? 0))
  if (available === 0) return { ...unchanged(cart), error: `No queda stock de ${input.name}` }

  const current = cart.find((item) => item.variantId === input.variantId)
  if (!current) {
    const item: CartItem = { ...input, available, quantity: Math.min(input.quantity ?? 1, available) }
    return { cart: [...cart, item] }
  }
  if (current.quantity >= available) {
    return {
      ...unchanged(cart),
      error: `Solo quedan ${available} ${available === 1 ? 'unidad' : 'unidades'} de ${current.name}. Agrega más en Inventario.`,
    }
  }
  return {
    cart: cart.map((item) =>
      item.variantId === input.variantId ? { ...item, quantity: item.quantity + 1, available } : item,
    ),
  }
}

/**
 * Fija la cantidad de un producto. Absoluto, no un delta: es idempotente.
 * Cero o menos quita el producto del carrito.
 */
export function setQuantity(cart: CartItem[], variantId: string, quantity: number): CartResult {
  const current = cart.find((item) => item.variantId === variantId)
  if (!current) return unchanged(cart)
  if (quantity <= 0) return removeItem(cart, variantId)
  if (quantity > current.available) {
    return {
      ...unchanged(cart),
      error: `Ya no hay más disponibles. Solo quedan ${current.available}. Agrega más en Inventario.`,
    }
  }
  if (quantity === current.quantity) return unchanged(cart)
  return {
    cart: cart.map((item) => (item.variantId === variantId ? { ...item, quantity } : item)),
  }
}

/** Quita un producto. Aplicarlo dos veces deja el mismo carrito. */
export function removeItem(cart: CartItem[], variantId: string): CartResult {
  const next = cart.filter((item) => item.variantId !== variantId)
  if (next.length === cart.length) return unchanged(cart)
  return { cart: next }
}

export function clearCart(): CartItem[] {
  return []
}

export function cartTotal(cart: readonly CartItem[]): number {
  return round2(cart.reduce((sum, item) => sum + item.price * item.quantity, 0))
}

export function cartCount(cart: readonly CartItem[]): number {
  return cart.reduce((sum, item) => sum + item.quantity, 0)
}

/**
 * Reconcilia el carrito con el stock real (degradación gradual).
 * Si mientras se llenaba el carrito otra venta se llevó unidades, en vez de
 * fallar al confirmar se ajusta lo que se pueda y se explica qué cambió.
 */
export function syncStock(cart: CartItem[], stock: ReadonlyMap<string, number>): CartResult {
  let error: string | undefined
  const next: CartItem[] = []

  for (const item of cart) {
    const real = stock.get(item.variantId)
    if (real === undefined) {
      error = `${item.name} ya no está disponible`
      continue
    }
    if (real >= item.quantity) {
      next.push(real === item.available ? item : { ...item, available: real })
      continue
    }
    if (real <= 0) {
      error = `${item.name} ya no tiene unidades`
      continue
    }
    next.push({ ...item, quantity: real, available: real })
    error = `Quedaban menos unidades de ${item.name}: ahora son ${real}`
  }

  const cambio = next.length !== cart.length || next.some((item, i) => item !== cart[i])
  return error === undefined && !cambio ? unchanged(cart) : { cart: next, error }
}
