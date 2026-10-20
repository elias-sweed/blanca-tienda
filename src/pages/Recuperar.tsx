import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FondoNeon } from '../components/cyber/FondoNeon'
import { Button } from '../components/ui/Button'
import { LoadingState } from '../components/ui/LoadingState'
import { useAuth } from '../context/authContext'

/**
 * Llegada desde el enlace del correo de recuperación.
 *
 * Supabase ya validó el enlace y dejó la sesión lista. La app restablece el
 * bloqueo local (lo hace AuthProvider) y entra a la tienda.
 */
export default function Recuperar() {
  const { estadoSesion } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (estadoSesion !== 'con-sesion') return
    const t = window.setTimeout(() => navigate('/', { replace: true }), 1200)
    return () => window.clearTimeout(t)
  }, [estadoSesion, navigate])

  return (
    <div className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6 text-center">
      <FondoNeon />
      <div className="relative z-10 flex flex-col gap-4">
        {estadoSesion === 'cargando' && <LoadingState rows={2} label="Revisando el enlace..." />}

        {estadoSesion === 'sin-sesion' && (
          <>
            <h1 className="text-xl font-bold text-title">El enlace no es válido</h1>
            <p className="text-sm text-fg-mute">
              Puede haber vencido o ya haberse usado. Vuelve a pedir el correo desde el acceso.
            </p>
            <Button size="lg" onClick={() => navigate('/login', { replace: true })}>
              Ir al acceso
            </Button>
          </>
        )}

        {estadoSesion === 'con-sesion' && (
          <>
            <h1 className="text-xl font-bold text-title">Acceso verificado</h1>
            <p className="text-sm text-fg-mute">
              Entrando a tu tienda. Te pediremos crear de nuevo tu desbloqueo.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
