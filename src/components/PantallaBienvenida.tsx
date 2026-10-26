import { useEffect, useState, type ReactNode } from 'react'
import { PantallaMarca } from './PantallaMarca'

/** Una sola vez por carga de la app: StrictMode no debe duplicar el aviso. */
let yaMostrada = false

/** La huella espera a que se quite "Bienvenido" para no abrir el diálogo debajo. */
export function bienvenidaSigueVisible() {
  return !yaMostrada
}

/**
 * Tras el logo nativo de la PWA, muestra "Bienvenido" estático y cede el paso.
 * No hay fundidos ni movimientos: solo se quita de golpe.
 */
export function PantallaBienvenida({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(() => !yaMostrada)

  useEffect(() => {
    if (!visible) return
    const t = window.setTimeout(() => {
      yaMostrada = true
      setVisible(false)
    }, 900)
    return () => window.clearTimeout(t)
  }, [visible])

  return (
    <>
      {children}
      {visible ? (
        <div className="fixed inset-0 z-[400]">
          <PantallaMarca titulo="Bienvenido" />
        </div>
      ) : null}
    </>
  )
}
