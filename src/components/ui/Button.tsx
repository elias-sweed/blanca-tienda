import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size = 'md' | 'lg'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const variants: Record<Variant, string> = {
  primary:
    'bg-berry text-cream border border-plum shadow-lg shadow-cosmos/60 active:bg-plum active:scale-[0.98]',
  secondary:
    'bg-barossa text-gold border border-berry/60 active:bg-plum/60 active:scale-[0.98]',
  danger:
    'bg-red-800 text-cream border border-red-900 active:bg-red-950 active:scale-[0.98]',
  ghost: 'bg-transparent text-gold border border-transparent active:bg-berry/20',
}

const sizes: Record<Size, string> = {
  md: 'px-4 py-2.5 text-base',
  lg: 'px-5 py-4 text-lg w-full',
}

export function Button({ variant = 'primary', size = 'md', className = '', ...props }: Props) {
  return (
    <button
      className={`rounded-xl font-bold tracking-wide shadow-md shadow-black/40 transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  )
}
