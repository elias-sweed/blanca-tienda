import type { InputHTMLAttributes } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export function Input({ label, error, className = '', id, ...props }: Props) {
  const inputId = id ?? props.name ?? label
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={inputId}
        className="text-xs font-bold uppercase tracking-wider text-muted"
      >
        {label}
      </label>
      <input
        id={inputId}
        className={`w-full rounded-xl border border-plum bg-cosmos/70 px-4 py-3 text-base font-semibold text-cream placeholder-muted/60 focus:border-gold focus:bg-cosmos/90 focus:outline-none focus:ring-2 focus:ring-berry/40 ${className}`}
        {...props}
      />
      {error && <p className="text-sm text-red-300">{error}</p>}
    </div>
  )
}
