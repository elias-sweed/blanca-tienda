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
        className="text-xs font-bold uppercase tracking-wider text-fg-mute"
      >
        {label}
      </label>
      <input
        id={inputId}
        className={`w-full rounded-xl border border-line bg-inset px-4 py-3 text-base font-semibold text-fg placeholder:text-fg-mute/70 transition focus:border-accent-text focus:ring-2 focus:ring-accent/40 focus:outline-none ${className}`}
        {...props}
      />
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  )
}
