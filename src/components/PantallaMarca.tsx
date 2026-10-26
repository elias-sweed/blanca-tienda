import type { ReactNode } from 'react'
import { FondoNeon } from './cyber/FondoNeon'

/**
 * Marco visual de las pantallas de arranque (bienvenida, acceso, huella).
 * Sin animaciones: en un teléfono antiguo cualquier transición de opacidad
 * o escala se nota y retrasa el primer toque.
 */
export function PantallaMarca({
  titulo,
  subtitulo,
  children,
}: {
  titulo: string
  subtitulo?: string
  children?: ReactNode
}) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-y-auto bg-bg">
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
            <h1 className="text-2xl font-bold tracking-tight text-title sm:text-3xl">{titulo}</h1>
            {subtitulo ? <p className="text-sm text-fg-mute">{subtitulo}</p> : null}
          </div>
        </header>
        {children}
      </div>
    </div>
  )
}
