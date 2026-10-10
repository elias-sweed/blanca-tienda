import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size = 'md' | 'lg'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const variants: Record<Variant, string> = {
  primary:
    'bg-gradient-to-b from-cta-hover to-cta text-bg border border-cta hover:brightness-110 active:from-cta-dark active:to-cta-dark active:scale-[0.98] shadow-[0_0_24px_rgba(0,245,255,0.5)] shadow-lg shadow-black/70',
  secondary:
    'bg-gradient-to-b from-accent-hover to-accent text-white border border-accent hover:brightness-110 active:scale-[0.98] shadow-[0_0_20px_rgba(139,0,255,0.45)] shadow-lg shadow-black/70',
  danger:
    'bg-danger text-white border border-danger hover:brightness-110 active:scale-[0.98] shadow-[0_0_22px_rgba(255,23,68,0.55)] shadow-lg shadow-black/70',
  ghost: 'bg-transparent text-accent-text border border-transparent hover:text-fg hover:bg-hover active:scale-[0.98]',
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
