import { useEffect, useState } from 'react'
import { useAuth } from '../context/authContext'
import { biometriaDisponible } from '../utils/webauthn'
import { Button } from './ui/Button'
import { FilterChips } from './ui/FilterChips'
import { Modal } from './ui/Modal'
import { PatronLock } from './PatronLock'
import { useToast } from './ui/ToastContext'

const INACTIVIDAD = [
  { valor: '1', etiqueta: '1 min' },
  { valor: '5', etiqueta: '5 min' },
  { valor: '15', etiqueta: '15 min' },
  { valor: '30', etiqueta: '30 min' },
] as const

interface Props {
  open: boolean
  onClose: () => void
}

/**
 * Ajustes de bloqueo: patrón, huella/rostro y tiempo de inactividad.
 *
 * El patrón se guarda como hash con sal, nunca en claro. La huella la
 * verifica el teléfono: aquí solo se guarda el id de la credencial.
 */
export function SeguridadBloqueo({ open, onClose }: Props) {
  const {
    ajustes,
    bloqueoConfigurado,
    activarPatron,
    quitarPatron,
    activarBiometria,
    quitarBiometria,
    setInactividad,
    bloquear,
  } = useAuth()
  const { show } = useToast()

  const [vista, setVista] = useState<'inicio' | 'patron'>('inicio')
  const [paso, setPaso] = useState<'dibujar' | 'repetir'>('dibujar')
  const [primerPatron, setPrimerPatron] = useState<number[] | null>(null)
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [huellaDisponible, setHuellaDisponible] = useState<boolean | null>(null)

  useEffect(() => {
    if (!open) return
    let activo = true
    biometriaDisponible().then((disponible) => {
      if (activo) setHuellaDisponible(disponible)
    })
    return () => {
      activo = false
    }
  }, [open])

  const tienePatron = Boolean(ajustes?.patronHash && ajustes?.patronSal)
  const tieneHuella = Boolean(ajustes?.biometriaId)
  const inactividad = String(ajustes?.inactividadMinutos ?? 5)

  function reiniciarPatron() {
    setVista('inicio')
    setPaso('dibujar')
    setPrimerPatron(null)
    setError('')
  }

  async function completarPatron(patron: number[]) {
    if (ocupado) return
    if (paso === 'dibujar') {
      setPrimerPatron(patron)
      setPaso('repetir')
      setError('')
      return
    }
    if (!primerPatron || patron.join('-') !== primerPatron.join('-')) {
      setPrimerPatron(null)
      setPaso('dibujar')
      setError('Los patrones no coinciden. Empieza de nuevo.')
      return
    }
    setOcupado(true)
    try {
      await activarPatron(primerPatron.join('-'))
      show('Patrón guardado')
      reiniciarPatron()
    } catch {
      setError('No se pudo guardar el patrón. Inténtalo otra vez.')
    } finally {
      setOcupado(false)
    }
  }

  async function activarHuella() {
    setOcupado(true)
    setError('')
    try {
      await activarBiometria()
      show('Huella o rostro activado')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo activar la huella.')
    } finally {
      setOcupado(false)
    }
  }

  async function quitarHuella() {
    await quitarBiometria()
    show('Huella o rostro desactivado')
  }

  async function quitarPatronActual() {
    await quitarPatron()
    show('Patrón quitado')
  }

  async function cambiarInactividad(valor: string) {
    await setInactividad(Number(valor))
  }

  function cerrar() {
    reiniciarPatron()
    onClose()
  }

  return (
    <Modal
      open={open}
      title={vista === 'patron' ? (paso === 'dibujar' ? 'Crea tu patrón' : 'Repite tu patrón') : 'Seguridad y bloqueo'}
      onClose={cerrar}
    >
      {vista === 'patron' ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-fg-soft">
            {paso === 'dibujar'
              ? 'Une al menos 4 puntos con el dedo.'
              : 'Dibuja otra vez el mismo patrón para confirmarlo.'}
          </p>
          <PatronLock key={paso} onComplete={completarPatron} deshabilitado={ocupado} />
          {error && (
            <p role="alert" className="text-center text-sm font-semibold text-danger">
              {error}
            </p>
          )}
          <Button variant="ghost" size="lg" onClick={reiniciarPatron}>
            Cancelar
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-fg-mute">Patrón</h3>
            <p className="text-sm text-fg-soft">
              {tienePatron ? 'Tienes un patrón activo.' : 'Todavía no tienes un patrón.'}
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setVista('patron')
                  setPaso('dibujar')
                  setPrimerPatron(null)
                  setError('')
                }}
              >
                {tienePatron ? 'Cambiar patrón' : 'Crear patrón'}
              </Button>
              {tienePatron && (
                <Button variant="ghost" onClick={quitarPatronActual}>
                  Quitar patrón
                </Button>
              )}
            </div>
          </section>

          <section className="flex flex-col gap-2 border-t border-line pt-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-fg-mute">Huella o rostro</h3>
            {huellaDisponible === null ? (
              <p className="text-sm text-fg-mute">Revisando el teléfono...</p>
            ) : huellaDisponible ? (
              <>
                <p className="text-sm text-fg-soft">
                  {tieneHuella
                    ? 'Puedes desbloquear con la huella o el rostro de este teléfono.'
                    : 'Actívalo para desbloquear sin dibujar el patrón.'}
                </p>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={activarHuella} disabled={ocupado}>
                    {tieneHuella ? 'Volver a configurar' : 'Activar huella'}
                  </Button>
                  {tieneHuella && (
                    <Button variant="ghost" onClick={quitarHuella}>
                      Quitar huella
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-fg-mute">
                Este teléfono o navegador no ofrece huella. Puedes usar el patrón.
              </p>
            )}
          </section>

          <section className="flex flex-col gap-2 border-t border-line pt-4">
            <FilterChips
              titulo="Bloquear por inactividad"
              opciones={INACTIVIDAD}
              valor={inactividad}
              onChange={cambiarInactividad}
            />
            <p className="text-xs text-fg-mute">
              También se bloquea al salir de la app, cambiar de pestaña o recargar.
            </p>
          </section>

          <p className="rounded-xl border border-line bg-inset px-3 py-2 text-xs text-fg-mute">
            El patrón es una barrera para el uso diario. No protege si alguien tiene acceso técnico
            al teléfono. Tus datos siguen protegidos por tu cuenta de Supabase.
          </p>

          {error && (
            <p role="alert" className="text-sm font-semibold text-danger">
              {error}
            </p>
          )}

          {bloqueoConfigurado && (
            <Button
              size="lg"
              variant="secondary"
              onClick={() => {
                bloquear()
                cerrar()
              }}
            >
              Bloquear aplicación
            </Button>
          )}
        </div>
      )}
    </Modal>
  )
}
