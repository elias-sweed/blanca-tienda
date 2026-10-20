import type { InputHTMLAttributes, ReactNode } from 'react'
import { HelpTooltip } from './HelpTooltip'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  /** Validación en tiempo real: muestra el mensaje y marca el campo en rojo. */
  error?: string
  /** Ayuda opcional: muestra un botón "?" al lado del título del campo. */
  help?: string
  /** Control opcional dentro del campo, por ejemplo "ver contraseña". */
  trailing?: ReactNode
}

export function Input({ label, error, help, trailing, className = '', id, ...props }: Props) {
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
      <div className="relative">
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={`w-full rounded-xl border bg-inset px-4 py-3 text-base font-semibold text-fg placeholder:text-fg-mute transition-colors duration-150 focus:outline-none ${
            trailing ? 'pr-14' : ''
          } ${
            error
              ? 'border-danger focus:border-danger focus:ring-2 focus:ring-danger/40'
              : 'border-line focus:border-line-active focus:ring-2 focus:ring-line-active/30'
          } ${className}`}
          {...props}
        />
        {trailing && (
          <div className="absolute inset-y-0 right-1 flex items-center">{trailing}</div>
        )}
      </div>
      {error && (
        <p id={`${inputId}-error`} className="text-sm font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
