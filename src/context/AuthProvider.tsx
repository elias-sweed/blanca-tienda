import { useCallback, type ReactNode } from 'react'
import { AuthContext, type AuthApi } from './authContext'
import { useAppLock } from '../hooks/useAppLock'
import { useSupabaseAuth } from '../hooks/useSupabaseAuth'

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

  const { iniciarSesion: iniciarSupabase } = auth
  const { marcarDesbloqueado } = lock

  const iniciarSesion = useCallback<AuthApi['iniciarSesion']>(
    async (correo, contrasena) => {
      const res = await iniciarSupabase(correo, contrasena)
      if (res.ok) await marcarDesbloqueado()
      return res
    },
    [iniciarSupabase, marcarDesbloqueado],
  )

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
