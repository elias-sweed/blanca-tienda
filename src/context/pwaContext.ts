import { createContext, useContext } from 'react'
import type { usePWA } from '../hooks/usePWA'

/**
 * El service worker se registra una sola vez (en PWAProvider) y el resto de
 * la app consulta aquí si hay una versión nueva o si se puede instalar.
 */
export type PwaApi = ReturnType<typeof usePWA>

export const PwaContext = createContext<PwaApi | null>(null)

export function usePwaApp(): PwaApi {
  const valor = useContext(PwaContext)
  if (!valor) throw new Error('usePwaApp debe usarse dentro de PWAProvider')
  return valor
}
