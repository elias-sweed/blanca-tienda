import type { ReactNode } from 'react'
import { TarjetaCyber } from '../cyber/TarjetaCyber'

/**
 * Envoltorio retrocompatible. La implementación vive en `TarjetaCyber`, que ya
 * cumple las reglas de rendimiento (memo, brillo por opacidad, sin backdrop-filter).
 */
export function Card({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <TarjetaCyber className={['shadow-lg shadow-black/60', className].join(' ')}>
      {children}
    </TarjetaCyber>
  )
}