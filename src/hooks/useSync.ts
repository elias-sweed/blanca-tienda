import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/authContext'
import { supabase } from '../lib/supabase'
import { sincronizar } from '../services/sync'
import { useOnlineStatus } from './useOnlineStatus'

export type EstadoSync = 'inactivo' | 'sincronizando' | 'al-dia' | 'error' | 'sin-conexion'

const INTERVALO_MS = 60_000

/**
 * Sube y baja los datos cuando hay sesión, la app está desbloqueada y hay
 * internet. Nunca corre con la pantalla de bloqueo puesta.
 */
export function useSync() {
  const { sesion, estadoSesion, estadoBloqueo } = useAuth()
  const online = useOnlineStatus()
  const [estado, setEstado] = useState<EstadoSync>('inactivo')
  const [ultimoError, setUltimoError] = useState('')
  const [ultimaVez, setUltimaVez] = useState<number | null>(null)
  const enCurso = useRef(false)

  const ejecutar = useCallback(async () => {
    const userId = sesion?.user.id
    if (!supabase || !userId || estadoSesion !== 'con-sesion' || estadoBloqueo !== 'desbloqueado') {
      return
    }
    if (!online) {
      setEstado('sin-conexion')
      return
    }
    // Con la app en segundo plano no se gasta datos: se sincroniza al volver.
    if (document.hidden) return
    if (enCurso.current) return

    enCurso.current = true
    setEstado('sincronizando')
    setUltimoError('')

    try {
      await sincronizar(userId)
      setEstado('al-dia')
      setUltimaVez(Date.now())
    } catch (error) {
      setEstado('error')
      setUltimoError(
        error instanceof Error ? error.message : 'No se pudo guardar en la nube.',
      )
    } finally {
      enCurso.current = false
    }
  }, [sesion, estadoSesion, estadoBloqueo, online])

  useEffect(() => {
    if (estadoSesion !== 'con-sesion' || estadoBloqueo !== 'desbloqueado') return

    const inicial = window.setTimeout(() => void ejecutar(), 400)
    const intervalo = window.setInterval(() => void ejecutar(), INTERVALO_MS)
    const alVolver = () => {
      if (!document.hidden) void ejecutar()
    }

    window.addEventListener('online', alVolver)
    document.addEventListener('visibilitychange', alVolver)

    return () => {
      window.clearTimeout(inicial)
      window.clearInterval(intervalo)
      window.removeEventListener('online', alVolver)
      document.removeEventListener('visibilitychange', alVolver)
    }
  }, [ejecutar, estadoSesion, estadoBloqueo])

  return {
    estado,
    ultimoError,
    ultimaVez,
    sincronizarAhora: ejecutar,
  }
}
