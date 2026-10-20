import type { ReactNode } from 'react'
import { useSync } from '../hooks/useSync'
import { SyncContext } from './syncContext'

/** Se monta solo con la sesión iniciada y la app desbloqueada. */
export function SyncProvider({ children }: { children: ReactNode }) {
  const sync = useSync()
  return <SyncContext.Provider value={sync}>{children}</SyncContext.Provider>
}
