import { useCallback, useEffect, useRef, useState } from 'react'
import {
  borrarBiometria,
  borrarPatron,
  guardarBiometria,
  guardarInactividad,
  guardarPatron,
  hayBloqueo,
  leerAjustes,
  limpiarIntentos,
  registrarFallo,
  type AjustesBloqueo,
} from '../lib/dbBloqueo'
import { bytesABase64, bytesAleatorios, hashearPatron } from '../utils/crypto'
import { crearCredencialBiometrica } from '../utils/webauthn'

/**
 * Bloqueo local de la app (patrón o huella).
 *
 * Es una barrera para que quien tome el teléfono no vea ventas, caja ni
 * inventario. No sustituye a la autorización del servidor: mientras la app
 * está bloqueada tampoco se sincroniza nada.
 */

export type EstadoBloqueo = 'cargando' | 'sin-bloqueo' | 'bloqueado' | 'desbloqueado'

/** Cuánto puede quedar la app en segundo plano antes de bloquearse. */
const GRACIA_OCULTO_MS = 3_000

export function useAppLock() {
  const [ajustes, setAjustes] = useState<AjustesBloqueo | null>(null)
  const [estado, setEstado] = useState<EstadoBloqueo>('cargando')
  const ajustesRef = useRef<AjustesBloqueo | null>(null)

  useEffect(() => {
    ajustesRef.current = ajustes
  }, [ajustes])

  // Al abrir la app: si ya hay un método configurado, arranca bloqueada.
  useEffect(() => {
    let activo = true
    leerAjustes()
      .then((a) => {
        if (!activo) return
        setAjustes(a)
        setEstado(hayBloqueo(a) ? 'bloqueado' : 'sin-bloqueo')
      })
      .catch(() => {
        if (activo) setEstado('sin-bloqueo')
      })
    return () => {
      activo = false
    }
  }, [])

  const bloquear = useCallback(() => {
    const actuales = ajustesRef.current
    if (actuales && hayBloqueo(actuales)) setEstado('bloqueado')
  }, [])

  const marcarDesbloqueado = useCallback(async () => {
    const a = await limpiarIntentos()
    setAjustes(a)
    setEstado(hayBloqueo(a) ? 'desbloqueado' : 'sin-bloqueo')
  }, [])

  const recargarAjustes = useCallback(async () => {
    const a = await leerAjustes()
    setAjustes(a)
    return a
  }, [])

  const activarPatron = useCallback(async (patron: string) => {
    const sal = bytesAleatorios(16)
    const hash = await hashearPatron(patron, sal)
    const a = await guardarPatron(hash, bytesABase64(sal))
    setAjustes(a)
    setEstado('desbloqueado')
  }, [])

  const quitarPatron = useCallback(async () => {
    const a = await borrarPatron()
    setAjustes(a)
    setEstado(hayBloqueo(a) ? 'desbloqueado' : 'sin-bloqueo')
  }, [])

  const activarBiometria = useCallback(async () => {
    const id = await crearCredencialBiometrica()
    const a = await guardarBiometria(id)
    setAjustes(a)
    setEstado('desbloqueado')
  }, [])

  const quitarBiometria = useCallback(async () => {
    const a = await borrarBiometria()
    setAjustes(a)
    setEstado(hayBloqueo(a) ? 'desbloqueado' : 'sin-bloqueo')
  }, [])

  const anotarFallo = useCallback(async () => {
    const a = await registrarFallo()
    setAjustes(a)
    return a
  }, [])

  const setInactividad = useCallback(async (minutos: number) => {
    const a = await guardarInactividad(minutos)
    setAjustes(a)
  }, [])

  // Bloqueo por inactividad: cualquier toque o tecla reinicia la cuenta.
  useEffect(() => {
    if (estado !== 'desbloqueado' || !ajustes) return
    const ms = Math.max(1, ajustes.inactividadMinutos) * 60_000
    let timer = window.setTimeout(bloquear, ms)
    const reiniciar = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(bloquear, ms)
    }
    const eventos: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'wheel']
    eventos.forEach((e) => window.addEventListener(e, reiniciar, { passive: true }))
    return () => {
      window.clearTimeout(timer)
      eventos.forEach((e) => window.removeEventListener(e, reiniciar))
    }
  }, [estado, ajustes, bloquear])

  // Bloqueo al salir de la app / cambiar de pestaña, con 3 s de gracia para
  // no bloquear por un aviso momentáneo del navegador.
  //
  // Se guarda también la hora en que se ocultó: si el navegador congela los
  // temporizadores en segundo plano, al volver se compara el tiempo real y se
  // bloquea igual antes de enseñar nada.
  useEffect(() => {
    if (!ajustes || !hayBloqueo(ajustes)) return
    let espera = 0
    let ocultoDesde = 0
    const alCambiar = () => {
      window.clearTimeout(espera)
      if (document.hidden) {
        ocultoDesde = Date.now()
        espera = window.setTimeout(bloquear, GRACIA_OCULTO_MS)
        return
      }
      if (ocultoDesde && Date.now() - ocultoDesde >= GRACIA_OCULTO_MS) bloquear()
      ocultoDesde = 0
    }
    document.addEventListener('visibilitychange', alCambiar)
    return () => {
      window.clearTimeout(espera)
      document.removeEventListener('visibilitychange', alCambiar)
    }
  }, [ajustes, bloquear])

  return {
    ajustes,
    estadoBloqueo: estado,
    bloqueoConfigurado: ajustes ? hayBloqueo(ajustes) : false,
    bloquear,
    marcarDesbloqueado,
    recargarAjustes,
    activarPatron,
    quitarPatron,
    activarBiometria,
    quitarBiometria,
    anotarFallo,
    setInactividad,
  }
}
