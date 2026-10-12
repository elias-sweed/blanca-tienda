import type { InputHTMLAttributes } from 'react'
import { HelpTooltip } from './HelpTooltip'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  /** Validación en tiempo real: muestra el mensaje y marca el campo en rojo. */
  error?: string
  /** Ayuda opcional: muestra un botón "?" al lado del título del campo. */
  help?: string
}

export function Input({ label, error, help, className = '', id, ...props }: Props) {
  const inputId = id ?? props.name ?? label
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={inputId}
        className="text-xs font-bold uppercase tracking-wider text-fg-mute"
      >
        {label}
        {help && <HelpTooltip text={help} />}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-error` : undefined}
        className={`w-full rounded-xl border bg-inset px-4 py-3 text-base font-semibold text-fg placeholder:text-fg-mute transition-colors duration-150 focus:outline-none ${
          error
            ? 'border-danger focus:border-danger focus:ring-2 focus:ring-danger/40'
            : 'border-line focus:border-line-active focus:ring-2 focus:ring-line-active/30'
        } ${className}`}
        {...props}
      />
      {error && (
        <p id={`${inputId}-error`} className="text-sm font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
