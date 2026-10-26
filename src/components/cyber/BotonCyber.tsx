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
 * Botón del sistema (jerarquía Premium Graphite & Soft Teal).
 *
 * - Primario: verde azulado sólido, texto blanco.
 * - Secundario: superficie diferenciada, texto principal, borde discreto.
 * - Terciario (ghost): sin fondo, texto de acento moderado.
 * - Destructivo: rojo semántico suave (tinta + texto), nunca neón.
 *
 * Reglas aplicadas:
 * - Sin gradientes ni brillos: sombra pequeña solo en el primario.
 * - Sin transiciones de transform: en teléfonos antiguos el scale al tocar
 *   se siente a tirones. Solo baja un poco la opacidad al pulsar.
 * - `box-shadow` es estático: nunca se anima.
 * - Los estados `:hover` se evitan porque en WebViews antiguas con pantalla
 *   táctil se quedan pegados.
 * - `focus-visible` con anillo de acento para navegación por teclado.
 * - `memo` para que un re-render global no re-evalúe el componente.
 */
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-cta-surface text-white border border-cta-surface shadow-sm',
  secondary: 'bg-selected text-fg border border-line-strong',
  danger: 'bg-danger/10 text-danger border border-danger/40',
  ghost: 'bg-transparent text-cta-text border border-transparent',
}

const SIZES: Record<Size, string> = {
  md: 'px-4 py-2.5 text-base',
  lg: 'px-5 py-4 text-lg w-full',
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
        'active:opacity-90',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-active/60',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        SIZES[size],
        VARIANTS[variant],
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </button>
  )
})
