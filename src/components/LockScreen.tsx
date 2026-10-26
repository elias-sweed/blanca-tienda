import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/authContext'
import { verificarBiometria } from '../utils/webauthn'
import { bienvenidaSigueVisible } from './PantallaBienvenida'
import { PantallaMarca } from './PantallaMarca'
import { Button } from './ui/Button'

/**
 * Desbloqueo con huella. Si aún no está configurada, solo se avisa.
 * No pide correo ni contraseña: esa cuenta ya está en el teléfono.
 */
export function LockScreen() {
  const { ajustes, desbloquear, cerrarSesion, activarBiometria } = useAuth()
  const navigate = useNavigate()

  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const pedidoHuella = useRef(false)

  const biometriaId = ajustes?.biometriaId ?? null

  async function usarHuella() {
    if (!biometriaId || ocupado) return
    setOcupado(true)
    setError('')
    try {
      if (await verificarBiometria(biometriaId)) {
        await desbloquear()
        return
      }
      setError('No se pudo comprobar tu huella. Inténtalo otra vez.')
    } catch {
      setError('No se pudo usar la huella. Inténtalo otra vez.')
    } finally {
      setOcupado(false)
    }
  }

  useEffect(() => {
    if (!biometriaId) return
    const espera = bienvenidaSigueVisible() ? 1000 : 0
    const t = window.setTimeout(() => {
      if (pedidoHuella.current) return
      pedidoHuella.current = true
      void usarHuella()
    }, espera)
    return () => window.clearTimeout(t)
    // Solo se dispara una vez al abrir esta pantalla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [biometriaId])

  async function configurarHuella() {
    setOcupado(true)
    setError('')
    try {
      await activarBiometria()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo configurar la huella.')
    } finally {
      setOcupado(false)
    }
  }

  async function salir() {
    await cerrarSesion()
    navigate('/login', { replace: true })
  }

  if (!biometriaId) {
    return (
      <div className="fixed inset-0 z-[200] overflow-y-auto bg-bg">
        <PantallaMarca titulo="Falta configurar">
          <p className="text-center text-sm text-fg-mute">
            Configura tu huella para entrar a la tienda.
          </p>
          {error && (
            <p role="alert" className="text-center text-sm font-semibold text-danger">
              {error}
            </p>
          )}
          <Button size="lg" onClick={() => void configurarHuella()} disabled={ocupado}>
            {ocupado ? 'Esperando tu huella...' : 'Configurar huella'}
          </Button>
          <button
            type="button"
            onClick={() => void salir()}
            className="mx-auto rounded-xl px-4 py-3 text-sm font-bold text-fg-mute"
          >
            Salir de mi cuenta en este teléfono
          </button>
        </PantallaMarca>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto bg-bg">
      <PantallaMarca titulo="Blanca Tienda" subtitulo="Usa tu huella para entrar.">
        {error && (
          <p role="alert" className="text-center text-sm font-semibold text-danger">
            {error}
          </p>
        )}
        <Button size="lg" onClick={() => void usarHuella()} disabled={ocupado}>
          {ocupado ? 'Comprobando...' : 'Usar huella'}
        </Button>
        <button
          type="button"
          onClick={() => void salir()}
          className="mx-auto rounded-xl px-4 py-3 text-sm font-bold text-fg-mute"
        >
          Salir de mi cuenta en este teléfono
        </button>
      </PantallaMarca>
    </div>
  )
}
