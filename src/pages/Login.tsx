import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { FondoNeon } from '../components/cyber/FondoNeon'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useToast } from '../components/ui/ToastContext'
import { useAuth } from '../context/authContext'

interface EstadoNavegacion {
  desde?: string
}

function IconoOjo({ oculto }: { oculto: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M2.1 12s3.6-6.5 9.9-6.5S21.9 12 21.9 12s-3.6 6.5-9.9 6.5S2.1 12 2.1 12Z" />
      <circle cx="12" cy="12" r="3" />
      {oculto && <path d="m3 3 18 18" />}
    </svg>
  )
}

/**
 * Pantalla de acceso con la cuenta maestra de Supabase.
 *
 * No hay registro público: la cuenta se crea una sola vez desde el panel de
 * Supabase. Aquí solo se escribe el correo y la contraseña.
 */
export default function Login() {
  const { iniciarSesion, recuperarContrasena, configurado } = useAuth()
  const { show } = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [verContrasena, setVerContrasena] = useState(false)
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
      setError(res.mensaje ?? 'No pudimos entrar.')
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
      <div className="relative flex min-h-dvh flex-col overflow-y-auto">
        <FondoNeon />
        <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-5 py-8 text-center">
          <h1 className="text-xl font-bold text-title">La app no está lista</h1>
          <p className="text-sm text-fg-mute">
            Pide ayuda para terminar de preparar la app. Mientras tanto, no se puede entrar.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-dvh flex-col overflow-y-auto">
      <FondoNeon />

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-5 pb-[calc(2rem_+_env(safe-area-inset-bottom))] pt-[calc(2rem_+_env(safe-area-inset-top))]">
        <header className="flex flex-col items-center gap-3 text-center">
          <img
            src="/blanca-login.jpg"
            alt="Blanca"
            width={600}
            height={800}
            loading="eager"
            decoding="async"
            className="h-24 w-24 rounded-full border-2 border-line-active/60 object-cover object-[50%_35%] shadow-sm ring-4 ring-cta/10"
          />
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight text-title sm:text-3xl">
              Blanca Tienda
            </h1>
            <p className="text-sm text-fg-mute">
              {recuperando
                ? 'Escribe tu correo para recuperar tu acceso.'
                : 'Ingresa para ver tu tienda.'}
            </p>
          </div>
        </header>

        {recuperando ? (
          <form
            className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 shadow-sm sm:p-5"
            onSubmit={enviarEnlace}
          >
            <Input
              label="Correo"
              name="correo-recuperar"
              type="email"
              inputMode="email"
              enterKeyHint="send"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
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
              <p className="rounded-xl border border-success/40 bg-success/10 px-3 py-2 text-sm font-semibold text-success">
                Revisa tu correo. Abre el enlace desde este mismo teléfono.
              </p>
            ) : (
              <Button size="lg" type="submit" disabled={ocupado}>
                {ocupado ? 'Enviando...' : 'Enviar enlace'}
              </Button>
            )}
            <Button
              variant="secondary"
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
          <form
            className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 shadow-sm sm:p-5"
            onSubmit={entrar}
          >
            <Input
              label="Correo"
              name="correo"
              type="email"
              inputMode="email"
              enterKeyHint="next"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="tucorreo@ejemplo.com"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              disabled={ocupado}
            />
            <Input
              label="Contraseña"
              name="contrasena"
              type={verContrasena ? 'text' : 'password'}
              enterKeyHint="go"
              autoComplete="current-password"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="Tu contraseña"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              disabled={ocupado}
              trailing={
                <button
                  type="button"
                  onClick={() => setVerContrasena((visible) => !visible)}
                  aria-label={verContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-pressed={verContrasena}
                  className="flex h-11 w-11 items-center justify-center rounded-lg text-fg-mute transition-[transform,opacity] duration-150 hover:text-fg active:scale-95 active:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-active/60"
                >
                  <IconoOjo oculto={verContrasena} />
                </button>
              }
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
              variant="secondary"
              size="lg"
              onClick={() => {
                setRecuperando(true)
                setError('')
                setVerContrasena(false)
              }}
            >
              Olvidé mi contraseña
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
