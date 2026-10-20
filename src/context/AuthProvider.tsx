import { useCallback, useEffect, type ReactNode } from 'react'
import { useToast } from '../components/ui/ToastContext'
import { AuthContext, type AuthApi } from './authContext'
import { useAppLock } from '../hooks/useAppLock'
import { useSupabaseAuth } from '../hooks/useSupabaseAuth'
import {
  hayRecuperacionPendiente,
  limpiarRecuperacion,
  volverAOfrecerBloqueo,
} from '../utils/recuperacion'

/**
 * Junta la sesión de Supabase con el bloqueo local del teléfono.
 *
 * Al iniciar sesión se marca la app como desbloqueada (la persona acaba de
 * escribir su contraseña). Al abrir la app con un método ya configurado,
 * el bloqueo arranca cerrado.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useSupabaseAuth()
  const lock = useAppLock()
  const { show } = useToast()

  const { iniciarSesion: iniciarSupabase, recuperacion, limpiarRecuperacion: limpiarEvento } = auth
  const { marcarDesbloqueado, quitarPatron, quitarBiometria } = lock

  /**
   * Quien demostró ser el dueño (contraseña o enlace del correo) puede
   * restablecer el bloqueo local. Se borran huella y patrón y se pide crear
   * uno nuevo; los datos de la tienda no se tocan.
   */
  const restablecerBloqueo = useCallback(async () => {
    await quitarPatron()
    await quitarBiometria()
    volverAOfrecerBloqueo()
    limpiarRecuperacion()
    await marcarDesbloqueado()
  }, [quitarPatron, quitarBiometria, marcarDesbloqueado])

  const iniciarSesion = useCallback<AuthApi['iniciarSesion']>(
    async (correo, contrasena) => {
      const res = await iniciarSupabase(correo, contrasena)
      if (res.ok) {
        if (hayRecuperacionPendiente()) {
          await restablecerBloqueo()
          show('Acceso recuperado. Configura de nuevo tu desbloqueo.', 'info')
        } else {
          await marcarDesbloqueado()
        }
      }
      return res
    },
    [iniciarSupabase, marcarDesbloqueado, restablecerBloqueo, show],
  )

  // Enlace del correo de recuperación: Supabase avisa con este evento.
  useEffect(() => {
    if (!recuperacion) return
    let activo = true
    restablecerBloqueo().then(() => {
      if (!activo) return
      limpiarEvento()
      show('Acceso recuperado. Configura de nuevo tu desbloqueo.', 'info')
    })
    return () => {
      activo = false
    }
  }, [recuperacion, restablecerBloqueo, limpiarEvento, show])

  const value: AuthApi = {
    sesion: auth.sesion,
    usuario: auth.usuario,
    cargando: auth.cargando,
    estadoSesion: auth.estado,
    configurado: auth.configurado,
    iniciarSesion,
    cerrarSesion: auth.cerrarSesion,
    recuperarContrasena: auth.recuperarContrasena,
    verificarContrasena: auth.verificarContrasena,

    ajustes: lock.ajustes,
    estadoBloqueo: lock.estadoBloqueo,
    bloqueoConfigurado: lock.bloqueoConfigurado,
    bloquear: lock.bloquear,
    desbloquear: marcarDesbloqueado,
    recargarAjustes: lock.recargarAjustes,
    activarPatron: lock.activarPatron,
    quitarPatron: lock.quitarPatron,
    activarBiometria: lock.activarBiometria,
    quitarBiometria: lock.quitarBiometria,
    anotarFallo: lock.anotarFallo,
    setInactividad: lock.setInactividad,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
