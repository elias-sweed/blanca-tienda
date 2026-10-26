import type { ReactNode } from 'react'
import { useAuth } from '../context/authContext'
import { LockScreen } from './LockScreen'
import { PantallaMarca } from './PantallaMarca'

/**
 * Si hay huella, la pide. Si no, avisa que falta configurar.
 * Sin huella no se muestra la tienda.
 */
export function LockGate({ children }: { children: ReactNode }) {
  const { estadoBloqueo, ajustes } = useAuth()

  if (estadoBloqueo === 'cargando') {
    return <PantallaMarca titulo="Bienvenido" />
  }

  const tieneHuella = Boolean(ajustes?.biometriaId)
  if (!tieneHuella || estadoBloqueo === 'bloqueado') return <LockScreen />

  return <>{children}</>
}
