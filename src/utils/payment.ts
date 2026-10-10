import { round2 } from './money'

/**
 * Máquina de estados del pago.
 *
 * Es una función pura: `paymentReducer(estado, evento)` devuelve el siguiente
 * estado sin tocar el anterior ni llamar a nada externo. Mismo estado + mismo
 * evento ⇒ mismo resultado, siempre.
 *
 * Determinismo y doble toque: los eventos que no corresponden al estado actual
 * devuelven el MISMO objeto de entrada (referencia idéntica), así un segundo
 * toque en "Confirmar" mientras ya se está guardando no arranca otra venta.
 */
export type PaymentStatus = 'idle' | 'processing' | 'success' | 'error'

export interface PaymentState {
  status: PaymentStatus
  /** Mensaje legible para la persona que vende. */
  message: string | null
}

export type PaymentEvent =
  | { type: 'SUBMIT' }
  | { type: 'DONE'; message?: string }
  | { type: 'FAIL'; message: string }
  | { type: 'RESET' }

export const IDLE_PAYMENT: PaymentState = Object.freeze({ status: 'idle', message: null })

export function paymentReducer(state: PaymentState, event: PaymentEvent): PaymentState {
  switch (event.type) {
    case 'SUBMIT':
      // Guard clause: si ya hay algo en vuelo, se ignora el nuevo intento.
      if (state.status !== 'idle') return state
      return { status: 'processing', message: null }

    case 'DONE':
      if (state.status !== 'processing') return state
      return { status: 'success', message: event.message ?? 'Listo' }

    case 'FAIL':
      if (state.status !== 'processing') return state
      return { status: 'error', message: event.message }

    case 'RESET':
      if (state.status === 'idle') return state
      return IDLE_PAYMENT

    default:
      return state
  }
}

export function canSubmit(state: PaymentState): boolean {
  return state.status === 'idle'
}

export function isProcessing(state: PaymentState): boolean {
  return state.status === 'processing'
}

/** Texto del botón según el estado: nunca queda congelada la interfaz. */
export function submitLabel(state: PaymentState, idleLabel: string): string {
  switch (state.status) {
    case 'processing':
      return 'Guardando...'
    case 'success':
      return '¡Listo!'
    case 'error':
      return 'Intentar de nuevo'
    default:
      return idleLabel
  }
}

/** Vuelto. `null` cuando no se informó cuánto pagó el cliente. */
export function computeChange(total: number, paid: number | undefined): number | null {
  if (paid === undefined || !Number.isFinite(paid)) return null
  const diff = round2(paid - round2(total))
  return diff >= 0 ? diff : null
}

/** Cuánto falta por pagar. `null` si ya está cubierto o no se informó el pago. */
export function shortfall(total: number, paid: number | undefined): number | null {
  if (paid === undefined || !Number.isFinite(paid)) return null
  const diff = round2(round2(total) - paid)
  return diff > 0 ? diff : null
}
