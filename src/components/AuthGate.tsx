import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { PantallaMarca } from './PantallaMarca'
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
      <PantallaMarca
        titulo="La app no está lista"
        subtitulo="Pide ayuda para terminar de preparar la app. Mientras tanto, no se puede mostrar la tienda."
      />
    )
  }

  if (estadoSesion === 'cargando') {
    return <PantallaMarca titulo="Bienvenido" />
  }

  if (estadoSesion === 'sin-sesion') {
    return <Navigate to="/login" replace state={{ desde: location.pathname }} />
  }

  return <>{children}</>
}
