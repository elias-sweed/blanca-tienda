import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { FondoNeon } from '../cyber/FondoNeon'
import { AvisosPWA } from '../AvisosPWA'
import { Configuracion } from '../Configuracion'
import { InvitacionBloqueo } from '../InvitacionBloqueo'
import { SeguridadBloqueo } from '../SeguridadBloqueo'
import { Tutorial } from '../Tutorial'
import { useAuth } from '../../context/authContext'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { tutorialNoVisto } from '../tutorialStorage'
import { leerPerfil, type Perfil } from '../../utils/perfil'

function formatDate(d: Date) {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  return `${days[d.getDay()]} ${d.getDate()} de ${months[d.getMonth()]}`
}

function formatTime(d: Date) {
  return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
}

export function AppLayout({ title, children }: { title: string; children: ReactNode }) {
  const [now, setNow] = useState(new Date())
  // Solo la primera visita abre el tutorial; después se vuelve a ver desde el
  // menú del círculo. La lectura es perezosa para no abrirlo dos veces.
  const [tutorial, setTutorial] = useState(() => tutorialNoVisto())
  const [menu, setMenu] = useState(false)
  const [config, setConfig] = useState(false)
  const [seguridad, setSeguridad] = useState(false)
  const [perfil, setPerfil] = useState<Perfil>(() => leerPerfil())
  const online = useOnlineStatus()
  const navigate = useNavigate()
  const { bloquear, cerrarSesion, bloqueoConfigurado } = useAuth()

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col">
      <FondoNeon />
      <header className="sticky top-0 z-30 border-b border-line bg-chrome px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-title">{title}</h1>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenu(!menu)}
              aria-label="Perfil y ayuda"
              aria-expanded={menu}
              className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 border-line-active/60 bg-cta/20 transition-transform duration-150 active:scale-95"
            >
              {perfil.foto && <img src={perfil.foto} alt="" className="h-full w-full object-cover" />}
            </button>

            {/* Punto de estado pegado arriba a la derecha del círculo:
                verde conectado, rojo si se quedó sin internet. */}
            <span
              aria-hidden="true"
              className={`absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full ring-2 ring-chrome ${
                online ? 'bg-success' : 'bg-danger'
              }`}
            />

            {menu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenu(false)} />
                <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-line-strong bg-raised p-2 shadow-xl">
                  <div className="border-b border-line px-3 pb-2 pt-1">
                    <p className="truncate text-sm font-bold text-title">{perfil.nombre || 'Mi perfil'}</p>
                    <p className="truncate text-xs text-fg-mute">Blanca Tienda</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMenu(false)
                      setConfig(true)
                    }}
                    className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-3 text-left text-sm font-semibold text-fg transition-colors duration-150 hover:bg-hover"
                  >
                    <span aria-hidden="true">⚙️</span> Configuración
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenu(false)
                      setSeguridad(true)
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-3 text-left text-sm font-semibold text-fg transition-colors duration-150 hover:bg-hover"
                  >
                    <span aria-hidden="true">🔐</span> Seguridad y bloqueo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenu(false)
                      setTutorial(true)
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-3 text-left text-sm font-semibold text-fg transition-colors duration-150 hover:bg-hover"
                  >
                    <span aria-hidden="true">❓</span> Cómo usar esta app?
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenu(false)
                      navigate('/historial')
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-3 text-left text-sm font-semibold text-fg transition-colors duration-150 hover:bg-hover"
                  >
                    <span aria-hidden="true">📋</span> Historial
                  </button>
                  <div className="my-1 border-t border-line" />
                  {bloqueoConfigurado && (
                    <button
                      type="button"
                      onClick={() => {
                        setMenu(false)
                        bloquear()
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-3 text-left text-sm font-semibold text-fg transition-colors duration-150 hover:bg-hover"
                    >
                      <span aria-hidden="true">🔒</span> Bloquear aplicación
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={async () => {
                      setMenu(false)
                      await cerrarSesion()
                      navigate('/login', { replace: true })
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-3 text-left text-sm font-semibold text-danger transition-colors duration-150 hover:bg-hover"
                  >
                    <span aria-hidden="true">🚪</span> Cerrar sesión
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="mt-1 flex items-center justify-between text-xs text-fg-mute">
          <span>{formatDate(now)}</span>
          <span className="font-bold text-fg-soft">{formatTime(now)}</span>
        </div>
      </header>
      <main className="relative z-10 flex-1 px-4 pb-24 pt-4">{children}</main>

      <AvisosPWA />

      <Configuracion
        key={config ? 'abierto' : 'cerrado'}
        open={config}
        perfil={perfil}
        onClose={() => setConfig(false)}
        onGuardar={setPerfil}
      />
      <Tutorial open={tutorial} onClose={() => setTutorial(false)} />
      <SeguridadBloqueo open={seguridad} onClose={() => setSeguridad(false)} />
      <InvitacionBloqueo pausada={tutorial || config || seguridad} onConfigurar={() => setSeguridad(true)} />
    </div>
  )
}
