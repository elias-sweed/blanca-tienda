import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/authContext'
import { verificarPatron } from '../utils/crypto'
import { pedirRecuperacion } from '../utils/recuperacion'
import { verificarBiometria } from '../utils/webauthn'
import { FondoNeon } from './cyber/FondoNeon'
import { PatronLock } from './PatronLock'
import { Button } from './ui/Button'
import { Input } from './ui/Input'

function formatearEspera(segundos: number): string {
  if (segundos >= 60) {
    const minutos = Math.ceil(segundos / 60)
    return `${minutos} minuto${minutos === 1 ? '' : 's'}`
  }
  return `${segundos} segundo${segundos === 1 ? '' : 's'}`
}

/**
 * Pantalla de bloqueo. No se muestra ningún dato de la tienda hasta que la
 * persona se verifique con huella, patrón o la contraseña de Supabase.
 */
export function LockScreen() {
  const {
    ajustes,
    anotarFallo,
    desbloquear,
    verificarContrasena,
    cerrarSesion,
  } = useAuth()
  const navigate = useNavigate()

  const [modo, setModo] = useState<'patron' | 'contrasena'>('patron')
  const [contrasena, setContrasena] = useState('')
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [ahora, setAhora] = useState(() => Date.now())

  // Reloj para mostrar la espera: el cambio de estado ocurre en el intervalo,
  // no durante el cuerpo del efecto.
  useEffect(() => {
    const t = window.setInterval(() => setAhora(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [])

  const hasta = ajustes?.bloqueadoHasta ?? 0
  const espera = hasta > ahora ? Math.ceil((hasta - ahora) / 1000) : 0
  const enEspera = espera > 0
  const intentos = ajustes?.intentosFallidos ?? 0
  const tienePatron = Boolean(ajustes?.patronHash && ajustes?.patronSal)

  const biometriaId = ajustes?.biometriaId ?? null

  async function probarPatron(patron: number[]) {
    if (!ajustes?.patronHash || !ajustes.patronSal || ocupado || enEspera) return
    setOcupado(true)
    setError('')
    try {
      const correcto = await verificarPatron(
        patron.join('-'),
        ajustes.patronHash,
        ajustes.patronSal,
      )
      if (correcto) {
        await desbloquear()
        return
      }
      const nuevos = await anotarFallo()
      setError(
        nuevos.bloqueadoHasta > Date.now()
          ? 'Hubo varios intentos. Espera un momento o usa tu contraseña.'
          : 'Ese patrón no es. Inténtalo otra vez.',
      )
    } finally {
      setOcupado(false)
    }
  }

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
      setError('No se pudo usar la huella. Puedes probar con tu patrón o contraseña.')
    } finally {
      setOcupado(false)
    }
  }

  async function usarContrasena(e: FormEvent) {
    e.preventDefault()
    if (!contrasena || ocupado) return
    setOcupado(true)
    setError('')
    const res = await verificarContrasena(contrasena)
    setOcupado(false)
    if (res.ok) {
      setContrasena('')
      await desbloquear()
      return
    }
    setError(res.mensaje ?? 'No pudimos comprobar tu contraseña.')
  }

  async function salir() {
    await cerrarSesion()
    navigate('/login', { replace: true })
  }

  /** Recuperación: exige volver a entrar con la cuenta de Supabase. */
  async function recuperarAcceso() {
    pedirRecuperacion()
    await cerrarSesion()
    navigate('/login', { replace: true })
  }

  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto bg-bg">
      <FondoNeon />
      <div className="relative z-10 mx-auto flex min-h-full max-w-md flex-col justify-center gap-5 px-6 py-10">
        <div className="flex flex-col items-center gap-2 text-center">
          <img src="/pwa-192.png" alt="" className="h-16 w-16 rounded-full" />
          <h1 className="text-2xl font-bold text-title">Blanca Tienda</h1>
          <p className="text-sm text-fg-mute">La app está bloqueada. Desbloquea para ver tu tienda.</p>
        </div>

        {modo === 'patron' ? (
          <>
            {biometriaId && (
              <Button size="lg" onClick={usarHuella} disabled={ocupado}>
                {ocupado ? 'Comprobando...' : 'Usar huella'}
              </Button>
            )}

            {tienePatron && (
              <>
                <p className="text-center text-sm font-semibold text-fg-soft">Dibuja tu patrón</p>
                <PatronLock onComplete={probarPatron} deshabilitado={ocupado || enEspera} />
              </>
            )}

            {enEspera && (
              <p className="text-center text-sm font-bold text-warning">
                Espera {formatearEspera(espera)} antes de intentar de nuevo.
              </p>
            )}

            {intentos > 0 && !enEspera && (
              <p className="text-center text-xs text-fg-mute">
                Intentos fallidos: {intentos}
              </p>
            )}

            {!tienePatron && !biometriaId && (
              <p className="text-center text-sm text-fg-mute">
                No hay un método configurado. Usa tu contraseña.
              </p>
            )}

            <Button variant="secondary" size="lg" onClick={() => setModo('contrasena')}>
              Usar contraseña
            </Button>
            <Button variant="ghost" size="lg" onClick={recuperarAcceso}>
              ¿Olvidaste tu patrón o huella?
            </Button>
            <p className="text-center text-xs text-fg-mute">
              Para recuperar el acceso se te pedirá entrar otra vez con tu cuenta de Supabase.
            </p>
          </>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={usarContrasena}>
            <p className="text-center text-sm text-fg-soft">
              Escribe la contraseña de tu cuenta para desbloquear.
            </p>
            <Input
              label="Contraseña"
              name="contrasena-desbloqueo"
              type="password"
              autoComplete="current-password"
              placeholder="Tu contraseña"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              disabled={ocupado}
            />
            <Button size="lg" type="submit" disabled={ocupado || !contrasena}>
              {ocupado ? 'Comprobando...' : 'Desbloquear'}
            </Button>
            <Button
              variant="ghost"
              size="lg"
              onClick={() => {
                setModo('patron')
                setError('')
              }}
            >
              Volver
            </Button>
          </form>
        )}

        {error && (
          <p role="alert" className="text-center text-sm font-semibold text-danger">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={salir}
          className="mx-auto mt-2 rounded-xl px-4 py-3 text-sm font-bold text-fg-mute transition-colors duration-150 hover:bg-hover"
        >
          Cerrar sesión en este teléfono
        </button>

        <p className="text-center text-[11px] leading-snug text-fg-mute">
          Este bloqueo evita miradas casuales. No cifra la información guardada en el teléfono.
        </p>
      </div>
    </div>
  )
}
