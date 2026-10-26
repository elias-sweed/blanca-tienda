import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { PantallaMarca } from '../components/PantallaMarca'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
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
 * Acceso con la cuenta maestra. No hay recuperación desde aquí.
 */
export default function Login() {
  const { iniciarSesion, configurado } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [verContrasena, setVerContrasena] = useState(false)
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)

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

  if (!configurado) {
    return (
      <PantallaMarca
        titulo="La app no está lista"
        subtitulo="Pide ayuda para terminar de preparar la app. Mientras tanto, no se puede entrar."
      />
    )
  }

  return (
    <PantallaMarca titulo="Blanca Tienda" subtitulo="Ingresa para ver tu tienda.">
      <form className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 shadow-sm sm:p-5" onSubmit={entrar}>
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
              className="flex h-11 w-11 items-center justify-center rounded-lg text-fg-mute focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-active/60"
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
      </form>
    </PantallaMarca>
  )
}
