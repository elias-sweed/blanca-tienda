import { memo, type ButtonHTMLAttributes, type ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size = 'md' | 'lg'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  /** Opcional: un botón también puede ser solo un icono o una flecha. */
  children?: ReactNode
}

/**
 * Botón del sistema.
 *
 * Reglas aplicadas:
 * - La transición es explícita sobre `transform` y `opacity`. La clase `transition`
 *   de Tailwind incluiría `box-shadow` y `background-color`, que fuerzan repintado.
 * - `box-shadow` es estático: nunca se anima.
 * - La respuesta táctil usa `active:scale-95` (150 ms). Los estados `:hover` se
 *   evitan porque en WebViews antiguas con pantalla táctil se quedan pegados.
 * - `will-change: transform` queda fijo en la hoja de estilo; declarar y cancelar
 *   `will-change` por interacción genera capas nuevas y provoca jank.
 * - `memo` para que un re-render global no re-evalúe el componente.
 */
const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-gradient-to-b from-cta-surface-hi to-cta-surface text-white border border-line-active/70',
  secondary:
    'bg-gradient-to-b from-accent-hover to-accent text-white border border-accent',
  danger:
    'bg-danger text-white border border-danger',
  ghost:
    'bg-transparent text-accent-text border border-transparent hover:text-fg',
}

const SIZES: Record<Size, string> = {
  md: 'px-4 py-2.5 text-base',
  lg: 'px-5 py-4 text-lg w-full',
}

const GLOWS: Record<Variant, string> = {
  primary: 'shadow-[0_0_20px_rgba(0,245,255,0.35)]',
  secondary: 'shadow-[0_0_18px_rgba(139,0,255,0.35)]',
  danger: 'shadow-[0_0_18px_rgba(255,23,68,0.4)]',
  ghost: '',
}

export const BotonCyber = memo(function BotonCyber({
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  children,
  ...props
}: Props) {
  return (
    <button
      type={type}
      className={[
        'rounded-xl font-bold tracking-wide',
        'transition-[transform,opacity] duration-150 ease-out will-change-transform',
        'active:scale-[0.97] active:opacity-90',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        SIZES[size],
        VARIANTS[variant],
        GLOWS[variant],
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </button>
  )
})