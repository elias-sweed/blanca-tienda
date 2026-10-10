import type { ButtonHTMLAttributes } from 'react'
import { BotonCyber } from '../cyber/BotonCyber'

/**
 * Envoltorio retrocompatible. La implementación vive en `BotonCyber`.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'md' | 'lg'
}) {
  return (
    <BotonCyber variant={variant} size={size} className={className} {...props} />
  )
}