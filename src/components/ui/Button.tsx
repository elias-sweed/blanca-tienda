import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size = 'md' | 'lg'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const variants: Record<Variant, string> = {
  primary:
    'bg-gradient-to-b from-cta-hover to-cta text-[#1a1508] border border-cta-text/45 shadow-lg shadow-cta/20 shadow-black/60 hover:from-cta hover:to-cta-hover active:from-cta-dark active:to-cta-dark active:scale-[0.98]',
  secondary:
    'bg-raised text-cta-text border border-cta/50 hover:bg-cta/15 active:bg-cta/25 active:scale-[0.98]',
  danger:
    'bg-danger text-fg border border-danger hover:bg-danger/85 active:bg-danger/70 active:scale-[0.98]',
  ghost: 'bg-transparent text-fg-soft border border-transparent hover:text-fg hover:bg-raised active:bg-ruby/20',
}

const sizes: Record<Size, string> = {
  md: 'px-4 py-2.5 text-base',
  lg: 'px-5 py-4 text-lg w-full',
}

export function Button({ variant = 'primary', size = 'md', className = '', ...props }: Props) {
  return (
    <button
      className={`rounded-xl font-bold tracking-wide shadow-md shadow-black/50 transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  )
}
