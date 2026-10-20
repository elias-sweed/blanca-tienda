import { useCallback, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, supabaseConfigurado } from '../lib/supabase'

/**
 * Sesión de Supabase Auth (una sola cuenta maestra).
 *
 * `sesion` es la fuente de verdad de si hay acceso al servidor. No se usa
 * ningún booleano guardado a mano: Supabase entrega el token y lo renueva.
 * Esto es distinto del bloqueo local de la app, que se añadirá encima.
 */

export type EstadoSesion = 'cargando' | 'sin-sesion' | 'con-sesion'

export interface ResultadoAuth {
  ok: boolean
  mensaje?: string
}

function mensajeDeError(mensaje: string): string {
  const m = mensaje.toLowerCase()
  if (m.includes('invalid login credentials')) return 'Correo o contraseña incorrectos.'
  if (m.includes('email not confirmed')) {
    return 'Falta confirmar el correo. Revisa tu bandeja de entrada.'
  }
  if (m.includes('too many requests') || m.includes('rate limit')) {
    return 'Demasiados intentos. Espera un momento y vuelve a probar.'
  }
  if (m.includes('network') || m.includes('fetch')) {
    return 'No hay conexión. Revisa tu internet e intenta de nuevo.'
  }
  return 'No pudimos completar la operación. Intenta de nuevo.'
}

export function useSupabaseAuth() {
  const [sesion, setSesion] = useState<Session | null>(null)
  const [cargando, setCargando] = useState(supabaseConfigurado)
  // Se activa cuando la persona vuelve desde el enlace del correo de
  // recuperación. Sirve para restablecer también el bloqueo local.
  const [recuperacion, setRecuperacion] = useState(false)

  useEffect(() => {
    if (!supabase) return

    let activo = true

    supabase.auth.getSession().then(({ data, error }) => {
      if (!activo) return
      if (error) {
        console.error('No se pudo leer la sesión:', error.message)
      }
      setSesion(data.session ?? null)
      setCargando(false)
    })

    const { data } = supabase.auth.onAuthStateChange((evento, nuevaSesion) => {
      if (!activo) return
      if (evento === 'PASSWORD_RECOVERY') setRecuperacion(true)
      setSesion(nuevaSesion)
      setCargando(false)
    })

    return () => {
      activo = false
      data.subscription.unsubscribe()
    }
  }, [])

  const iniciarSesion = useCallback(
    async (correo: string, contrasena: string): Promise<ResultadoAuth> => {
      if (!supabase) {
        return { ok: false, mensaje: 'Supabase no está configurado.' }
      }
      const { error } = await supabase.auth.signInWithPassword({
        email: correo.trim(),
        password: contrasena,
      })
      if (error) return { ok: false, mensaje: mensajeDeError(error.message) }
      return { ok: true }
    },
    [],
  )

  const cerrarSesion = useCallback(async (): Promise<ResultadoAuth> => {
    if (!supabase) return { ok: true }
    const { error } = await supabase.auth.signOut()
    if (!error) return { ok: true }

    // Sin internet, Supabase no puede revocar el token en el servidor.
    // Se borra la sesión local igual para no dejar la app abierta.
    await supabase.auth.signOut({ scope: 'local' })
    return {
      ok: true,
      mensaje: 'Se cerró la sesión en este teléfono. Se cerrará del todo al volver la conexión.',
    }
  }, [])

  /**
   * Comprueba la contraseña de la cuenta maestra sin registrarla en ningún
   * sitio. Se usa como recuperación del bloqueo local: si el patrón se olvida,
   * solo entra quien conoce la contraseña de Supabase.
   */
  const verificarContrasena = useCallback(async (contrasena: string): Promise<ResultadoAuth> => {
    if (!supabase) return { ok: false, mensaje: 'Supabase no está configurado.' }
    // Se lee la sesión local (sin pedir la contraseña guardada, que no existe).
    const { data } = await supabase.auth.getSession()
    const correo = data.session?.user.email
    if (!correo) {
      return {
        ok: false,
        mensaje: 'Tu sesión venció. Cierra sesión en este teléfono y vuelve a entrar.',
      }
    }
    const { error } = await supabase.auth.signInWithPassword({ email: correo, password: contrasena })
    if (error) return { ok: false, mensaje: mensajeDeError(error.message) }
    return { ok: true }
  }, [])

  const limpiarRecuperacion = useCallback(() => setRecuperacion(false), [])

  const recuperarContrasena = useCallback(async (correo: string): Promise<ResultadoAuth> => {
    if (!supabase) {
      return { ok: false, mensaje: 'Supabase no está configurado.' }
    }
    const { error } = await supabase.auth.resetPasswordForEmail(correo.trim(), {
      redirectTo: `${window.location.origin}/recuperar`,
    })
    if (error) return { ok: false, mensaje: mensajeDeError(error.message) }
    return { ok: true }
  }, [])

  const estado: EstadoSesion = cargando
    ? 'cargando'
    : sesion
      ? 'con-sesion'
      : 'sin-sesion'

  return {
    sesion,
    usuario: sesion?.user ?? null,
    cargando,
    estado,
    configurado: supabaseConfigurado,
    iniciarSesion,
    cerrarSesion,
    recuperarContrasena,
    verificarContrasena,
    recuperacion,
    limpiarRecuperacion,
  }
}

export type UsuarioAuth = User
