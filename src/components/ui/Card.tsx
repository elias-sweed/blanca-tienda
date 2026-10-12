import type { ReactNode } from 'react'
import { TarjetaCyber } from '../cyber/TarjetaCyber'

/**
 * Envoltorio retrocompatible. La implementación vive en `TarjetaCyber`:
 * superficie neutra, borde sutil y sombra pequeña, sin efectos costosos.
 */
export function Card({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <TarjetaCyber className={['shadow-sm', className].join(' ')}>
      {children}
    </TarjetaCyber>
  )
}