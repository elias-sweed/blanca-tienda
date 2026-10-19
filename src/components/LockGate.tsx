import type { ReactNode } from 'react'
import { useAuth } from '../context/authContext'
import { FondoNeon } from './cyber/FondoNeon'
import { LockScreen } from './LockScreen'
import { LoadingState } from './ui/LoadingState'

/**
 * Muestra la pantalla de bloqueo en lugar de la app. Al bloquear, las
 * pantallas privadas se desmontan: no quedan datos visibles detrás.
 */
export function LockGate({ children }: { children: ReactNode }) {
  const { estadoBloqueo } = useAuth()

  if (estadoBloqueo === 'cargando') {
    return (
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
        <FondoNeon />
        <div className="relative z-10">
          <LoadingState rows={2} label="Revisando el bloqueo..." />
        </div>
      </div>
    )
  }

  if (estadoBloqueo === 'bloqueado') return <LockScreen />

  return <>{children}</>
}
