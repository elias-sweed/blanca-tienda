import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { FondoNeon } from '../components/cyber/FondoNeon'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useToast } from '../components/ui/ToastContext'
import { useSupabaseAuth } from '../hooks/useSupabaseAuth'

interface EstadoNavegacion {
  desde?: string
}

/**
 * Pantalla de acceso con la cuenta maestra de Supabase.
 *
 * No hay registro público: la cuenta se crea una sola vez desde el panel de
 * Supabase. Aquí solo se escribe el correo y la contraseña.
 */
export default function Login() {
  const { iniciarSesion, recuperarContrasena, configurado } = useSupabaseAuth()
  const { show } = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [recuperando, setRecuperando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  async function entrar(e: FormEvent) {
    e.preventDefault()
    if (!correo.trim() || !contrasena) {
      setError('Escribe tu correo y tu contraseña.')
      return
    }
    setError('')
    setOcupado(true)
    const res = await iniciarSesion(correo, contrasena)
    setOcupado(false)
    if (!res.ok) {
      setError(res.mensaje ?? 'No pudimos iniciar sesión.')
      return
    }
    const destino = (location.state as EstadoNavegacion | null)?.desde ?? '/'
    navigate(destino, { replace: true })
  }

  async function enviarEnlace(e: FormEvent) {
    e.preventDefault()
    if (!correo.trim()) {
      setError('Escribe tu correo.')
      return
    }
    setError('')
    setOcupado(true)
    const res = await recuperarContrasena(correo)
    setOcupado(false)
    if (!res.ok) {
      setError(res.mensaje ?? 'No pudimos enviar el correo.')
      return
    }
    setEnviado(true)
    show('Te enviamos un correo para recuperar tu acceso.', 'info')
  }

  if (!configurado) {
    return (
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6 text-center">
        <FondoNeon />
        <div className="relative z-10 flex flex-col gap-2">
          <h1 className="text-xl font-bold text-title">Falta conectar la nube</h1>
          <p className="text-sm text-fg-mute">
            Pide que se revise la configuración del acceso. Mientras tanto, no se puede entrar.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-10">
      <FondoNeon />

      <div className="relative z-10 flex flex-col items-center gap-3 text-center">
        <img
          src="/pwa-192.png"
          alt=""
          className="h-20 w-20 rounded-full border-2 border-line-active/60"
        />
        <h1 className="text-3xl font-bold text-title">Blanca Tienda</h1>
        <p className="text-sm text-fg-mute">
          {recuperando ? 'Escribe tu correo para recuperar tu acceso.' : 'Ingresa para ver tu tienda.'}
        </p>
      </div>

      {recuperando ? (
        <form className="relative z-10 flex flex-col gap-4" onSubmit={enviarEnlace}>
          <Input
            label="Correo"
            name="correo-recuperar"
            type="email"
            inputMode="email"
            autoComplete="username"
            placeholder="tucorreo@ejemplo.com"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            disabled={ocupado || enviado}
          />
          {error && (
            <p role="alert" className="text-sm font-semibold text-danger">
              {error}
            </p>
          )}
          {enviado ? (
            <p className="text-sm font-semibold text-success">
              Revisa tu correo. Abre el enlace desde este mismo teléfono.
            </p>
          ) : (
            <Button size="lg" type="submit" disabled={ocupado}>
              {ocupado ? 'Enviando...' : 'Enviar enlace'}
            </Button>
          )}
          <Button
            variant="ghost"
            size="lg"
            onClick={() => {
              setRecuperando(false)
              setError('')
              setEnviado(false)
            }}
          >
            Volver
          </Button>
        </form>
      ) : (
        <form className="relative z-10 flex flex-col gap-4" onSubmit={entrar}>
          <Input
            label="Correo"
            name="correo"
            type="email"
            inputMode="email"
            autoComplete="username"
            placeholder="tucorreo@ejemplo.com"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            disabled={ocupado}
          />
          <Input
            label="Contraseña"
            name="contrasena"
            type="password"
            autoComplete="current-password"
            placeholder="Tu contraseña"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            disabled={ocupado}
          />
          {error && (
            <p role="alert" className="text-sm font-semibold text-danger">
              {error}
            </p>
          )}
          <Button size="lg" type="submit" disabled={ocupado}>
            {ocupado ? 'Entrando...' : 'Entrar'}
          </Button>
          <Button
            variant="ghost"
            size="lg"
            onClick={() => {
              setRecuperando(true)
              setError('')
            }}
          >
            Olvidé mi contraseña
          </Button>
        </form>
      )}
    </div>
  )
}
