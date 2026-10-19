import { useCallback, useEffect, useRef, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'

/**
 * Ciclo de vida de la PWA: service worker, aviso de actualización e
 * instalación. El service worker solo guarda archivos propios de la app
 * (HTML, CSS, JS e imágenes); las respuestas de Supabase nunca se guardan.
 */

interface EventoInstalacion extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type AplicarActualizacion = (recargar?: boolean) => Promise<void>

export function usePWA() {
  const [actualizacionDisponible, setActualizacionDisponible] = useState(false)
  const [listoOffline, setListoOffline] = useState(false)
  const [instalable, setInstalable] = useState(false)
  const promptRef = useRef<EventoInstalacion | null>(null)
  const aplicarRef = useRef<AplicarActualizacion | null>(null)

  useEffect(() => {
    aplicarRef.current = registerSW({
      immediate: true,
      onNeedRefresh() {
        setActualizacionDisponible(true)
      },
      onOfflineReady() {
        setListoOffline(true)
      },
    })
  }, [])

  useEffect(() => {
    function alPoderInstalar(e: Event) {
      e.preventDefault()
      promptRef.current = e as EventoInstalacion
      setInstalable(true)
    }

    function alInstalar() {
      promptRef.current = null
      setInstalable(false)
    }

    window.addEventListener('beforeinstallprompt', alPoderInstalar)
    window.addEventListener('appinstalled', alInstalar)
    return () => {
      window.removeEventListener('beforeinstallprompt', alPoderInstalar)
      window.removeEventListener('appinstalled', alInstalar)
    }
  }, [])

  const instalar = useCallback(async (): Promise<boolean> => {
    const evento = promptRef.current
    if (!evento) return false
    await evento.prompt()
    const eleccion = await evento.userChoice
    if (eleccion.outcome === 'accepted') {
      promptRef.current = null
      setInstalable(false)
      return true
    }
    return false
  }, [])

  const aplicarActualizacion = useCallback(async () => {
    await aplicarRef.current?.()
    setActualizacionDisponible(false)
  }, [])

  return {
    actualizacionDisponible,
    listoOffline,
    instalable,
    instalar,
    aplicarActualizacion,
  }
}
