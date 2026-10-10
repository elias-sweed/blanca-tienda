import { memo, type HTMLAttributes, type ReactNode } from 'react'

interface Props extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

/**
 * Tarjeta base del sistema.
 *
 * El brillo reactivo NO se anima con `box-shadow` (repinta el área completa en
 * cada frame). En su lugar hay una capa fija `::before` que solo cambia su
 * `opacity`, que es una propiedad del compositor.
 *
 * El borde activo y el fondo estático se pintan una sola vez; el contenido
 * interior nunca se anima.
 */
export const TarjetaCyber = memo(function TarjetaCyber({
  children,
  className = '',
  ...props
}: Props) {
  return (
    <div
      className={[
        'group relative isolate overflow-hidden rounded-2xl',
        'border border-line bg-surface p-4',
        // Capa del brillo: opacidad 0 -> 0.06 al interactuar. Sin transiciones de layout.
        'before:pointer-events-none before:absolute before:inset-0 before:z-[-1]',
        'before:bg-gradient-to-br before:from-cta/10 before:to-accent/10',
        'before:opacity-0 before:transition-opacity before:duration-150 before:ease-out',
        'hover:before:opacity-100 active:before:opacity-100',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </div>
  )
})