import { memo, type HTMLAttributes, type ReactNode } from 'react'

interface Props extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

/**
 * Tarjeta base del sistema.
 *
 * Superficie neutra, borde sutil y sombra pequeña. Sin gradientes ni brillos
 * reactivos: la interacción se marca con el borde, que es barato de pintar.
 */
export const TarjetaCyber = memo(function TarjetaCyber({
  children,
  className = '',
  ...props
}: Props) {
  return (
    <div
      className={[
        'rounded-2xl',
        'border border-line bg-surface p-4',
        'transition-colors duration-150',
        'hover:border-line-strong',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </div>
  )
})
