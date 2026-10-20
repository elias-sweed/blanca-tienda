import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { FondoNeon } from './cyber/FondoNeon'
import { LoadingState } from './ui/LoadingState'
import { useAuth } from '../context/authContext'

/**
 * Puerta de acceso a las pantallas privadas.
 *
 * Mientras Supabase revisa la sesión, no se muestra ningún dato de la tienda.
 * Sin sesión se va a la pantalla de acceso. Con sesión, se muestra la app.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { estadoSesion, configurado } = useAuth()
  const location = useLocation()

  if (!configurado) {
    return (
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6 text-center">
        <FondoNeon />
        <div className="relative z-10 flex flex-col gap-2">
          <h1 className="text-xl font-bold text-title">La app no está lista</h1>
          <p className="text-sm text-fg-mute">
            Pide ayuda para terminar de preparar la app. Mientras tanto, no se puede mostrar la
            tienda.
          </p>
        </div>
      </div>
    )
  }

  if (estadoSesion === 'cargando') {
    return (
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
        <FondoNeon />
        <div className="relative z-10">
          <LoadingState rows={2} label="Revisando tu cuenta..." />
        </div>
      </div>
    )
  }

  if (estadoSesion === 'sin-sesion') {
    return <Navigate to="/login" replace state={{ desde: location.pathname }} />
  }

  return <>{children}</>
}
