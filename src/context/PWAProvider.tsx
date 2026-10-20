import type { ReactNode } from 'react'
import { usePWA } from '../hooks/usePWA'
import { PwaContext } from './pwaContext'

/** Registra el service worker una sola vez para toda la app. */
export function PWAProvider({ children }: { children: ReactNode }) {
  const pwa = usePWA()
  return <PwaContext.Provider value={pwa}>{children}</PwaContext.Provider>
}
