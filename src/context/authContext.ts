import { createContext, useContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import type { AjustesBloqueo } from '../lib/dbBloqueo'
import type { EstadoBloqueo } from '../hooks/useAppLock'
import type { EstadoSesion, ResultadoAuth } from '../hooks/useSupabaseAuth'

/**
 * Estado compartido de acceso y bloqueo. Vive en un archivo sin componentes
 * para no romper la recarga en caliente durante el desarrollo.
 */
export interface AuthApi {
  // Sesión de Supabase (la nube)
  sesion: Session | null
  usuario: User | null
  cargando: boolean
  estadoSesion: EstadoSesion
  configurado: boolean
  iniciarSesion: (correo: string, contrasena: string) => Promise<ResultadoAuth>
  cerrarSesion: () => Promise<ResultadoAuth>
  recuperarContrasena: (correo: string) => Promise<ResultadoAuth>
  verificarContrasena: (contrasena: string) => Promise<ResultadoAuth>

  // Bloqueo local del teléfono
  ajustes: AjustesBloqueo | null
  estadoBloqueo: EstadoBloqueo
  bloqueoConfigurado: boolean
  bloquear: () => void
  desbloquear: () => Promise<void>
  recargarAjustes: () => Promise<AjustesBloqueo>
  activarPatron: (patron: string) => Promise<void>
  quitarPatron: () => Promise<void>
  activarBiometria: () => Promise<void>
  quitarBiometria: () => Promise<void>
  anotarFallo: () => Promise<AjustesBloqueo>
  setInactividad: (minutos: number) => Promise<void>
}

export const AuthContext = createContext<AuthApi | null>(null)

export function useAuth(): AuthApi {
  const valor = useContext(AuthContext)
  if (!valor) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return valor
}
