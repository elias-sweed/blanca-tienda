import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size = 'md' | 'lg'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-white active:bg-primary-dark',
  secondary: 'bg-white text-gray-800 border border-gray-300',
  danger: 'bg-red-600 text-white active:bg-red-700',
  ghost: 'bg-transparent text-primary',
}

const sizes: Record<Size, string> = {
  md: 'px-4 py-2.5 text-base',
  lg: 'px-5 py-4 text-lg w-full',
}

export function Button({ variant = 'primary', size = 'md', className = '', ...props }: Props) {
  return (
    <button
      className={`rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  )
}
