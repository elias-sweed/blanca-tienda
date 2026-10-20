import { createContext, useContext } from 'react'
import type { useSync } from '../hooks/useSync'

/** Estado de la copia en la nube, compartido por el menú y las pantallas. */
export type SyncApi = ReturnType<typeof useSync>

export const SyncContext = createContext<SyncApi | null>(null)

export function useSyncApp(): SyncApi {
  const valor = useContext(SyncContext)
  if (!valor) throw new Error('useSyncApp debe usarse dentro de SyncProvider')
  return valor
}
