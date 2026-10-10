import { round2 } from './money'

/**
 * Validaciones puras con cláusulas de guarda.
 *
 * Cada función recibe el valor crudo del formulario y devuelve un resultado
 * tipado: `ok(value)` cuando pasa o `invalid(error)` con un mensaje en español
 * listo para mostrar. Nunca lanzan excepciones ni escriben en el estado: quien
 * llama decide qué hacer.
 *
 * De este modo la regla de negocio vive en un solo sitio y las pantallas solo
 * interpretan el resultado (código autodocumentado).
 */
export type Validation<T> = { ok: true; value: T } | { ok: false; error: string }

export function ok<T>(value: T): Validation<T> {
  return { ok: true, value }
}

export function invalid<T>(error: string): Validation<T> {
  return { ok: false, error }
}

export function isValid<T>(result: Validation<T>): result is { ok: true; value: T } {
  return result.ok
}

/** Primer error encontrado, o `null` si todo pasó. Útil para resumir un formulario. */
export function firstError(...results: Validation<unknown>[]): string | null {
  for (const result of results) {
    if (!result.ok) return result.error
  }
  return null
}

/** Mayúscula inicial sin romper si el texto viene vacío. */
function capitalizar(texto: string): string {
  if (texto === '') return texto
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

/** Nombre obligatorio. Devuelve el texto ya recortado. */
export function validateName(
  raw: string | undefined,
  etiqueta = 'el nombre',
): Validation<string> {
  const value = (raw ?? '').trim()
  if (value === '') return invalid(`Escribe ${etiqueta}`)
  if (value.length > 120) return invalid(`${capitalizar(etiqueta)} es demasiado largo`)
  return ok(value)
}

/** Precio o monto en soles. Acepta texto con "S/" y separadores. */
export function validateAmount(
  raw: string | number | undefined,
  etiqueta = 'el precio',
): Validation<number> {
  let value: number

  if (typeof raw === 'number') {
    value = raw
  } else {
    const text = String(raw ?? '').trim()
    if (text === '') return invalid(`Escribe ${etiqueta} válido`)
    value = Number(text.replace(/[^0-9.]/g, ''))
  }

  if (!Number.isFinite(value)) return invalid(`Escribe ${etiqueta} válido`)
  if (value <= 0) return invalid(`${capitalizar(etiqueta)} debe ser mayor a cero`)
  if (value > 999999) return invalid('Escribe un monto más pequeño')
  return ok(round2(value))
}

/** Cantidad entera (stock, unidades). */
export function validateQuantity(
  raw: string | number | undefined,
  opciones: { etiqueta?: string; min?: number } = {},
): Validation<number> {
  const { etiqueta = 'la cantidad', min = 0 } = opciones
  let value: number

  if (typeof raw === 'number') {
    value = raw
  } else {
    const text = String(raw ?? '').trim()
    // Campo vacío: no es "0", es que falta escribir. Se avisa en lugar de
    // asumir un valor, para no guardar datos inventados.
    if (text === '') return invalid(`Escribe ${etiqueta}`)
    value = Number(text.replace(/[^0-9.-]/g, ''))
  }

  if (!Number.isFinite(value)) return invalid(`Escribe ${etiqueta} válida`)
  if (value < min) return invalid(`${capitalizar(etiqueta)} no puede ser menor que ${min}`)
  if (!Number.isInteger(value)) return invalid(`${capitalizar(etiqueta)} debe ser un número entero`)
  return ok(value)
}

/**
 * Monto pagado contra el total. Campo vacío = no se informó el pago
 * (la caja no depende de este dato), por eso devuelve `undefined` y no error.
 */
export function validatePayment(total: number, rawPaid: string | undefined): Validation<number | undefined> {
  const text = (rawPaid ?? '').trim()
  if (text === '') return ok(undefined)

  const paid = Number(text.replace(/[^0-9.]/g, ''))
  if (!Number.isFinite(paid) || paid < 0) return invalid('Escribe un monto válido')

  const faltan = round2(round2(total) - paid)
  if (faltan > 0) return invalid(`El monto es menor al total. Faltan S/ ${faltan.toFixed(2)}`)
  return ok(round2(paid))
}
