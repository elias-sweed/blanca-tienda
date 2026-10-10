import { memo, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * Escala una capa fuera de su contexto de apilamiento original.
 *
 * Sin esto, un modal renderizado dentro de `<main className="relative z-10">`
 * queda encerrado en ese contexto: su `z-50` solo compite contra hermanos
 * internos y el `<main>` entero se pinta como `z-10`, por debajo de la barra de
 * navegación (`z-40`). El portal lo monta en `document.body`, donde el z-index
 * es global y el overlay queda por encima de absolutely.
 *
 * Monta en un solo render (sin estado ni efectos): en una SPA de Vite
 * `document` siempre existe, y `createPortal` es idempotente bajo StrictMode.
 */
export const Portal = memo(function Portal({ children }: { children: ReactNode }) {
  if (typeof document === 'undefined') return null
  return createPortal(children, document.body)
})