import { useEffect, useState } from 'react'

/**
 * Tema de la interfaz: claro, oscuro o el del sistema. Se guarda en el
 * navegador (misma técnica que el tutorial y el perfil) y se aplica con
 * `data-tema` en `<html>`, que redefine los tokens CSS sin tocar componentes.
 */

export type Tema = 'claro' | 'oscuro' | 'sistema'

const CLAVE = 'tema'

export function leerTema(): Tema {
  try {
    const v = localStorage.getItem(CLAVE)
    return v === 'claro' || v === 'oscuro' || v === 'sistema' ? v : 'sistema'
  } catch {
    return 'sistema'
  }
}

function resuelto(t: Tema): 'claro' | 'oscuro' {
  if (t !== 'sistema') return t
  try {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'claro' : 'oscuro'
  } catch {
    return 'oscuro'
  }
}

export function aplicarTema(t: Tema): void {
  const r = resuelto(t)
  try {
    document.documentElement.dataset.tema = r
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', r === 'claro' ? '#F4F5F7' : '#101216')
    localStorage.setItem(CLAVE, t)
  } catch {
    // Sin DOM o sin almacenamiento: la app sigue con el tema por defecto.
  }
}

export function useTema(): { tema: Tema; setTema: (t: Tema) => void } {
  const [tema, setTema] = useState<Tema>(() => leerTema())

  useEffect(() => {
    aplicarTema(tema)
    if (tema !== 'sistema') return
    // Con "sistema", si el teléfono cambia de tema con la app abierta,
    // la interfaz lo sigue sin recargar.
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const seguir = () => aplicarTema('sistema')
    mq.addEventListener('change', seguir)
    return () => mq.removeEventListener('change', seguir)
  }, [tema])

  return { tema, setTema }
}
