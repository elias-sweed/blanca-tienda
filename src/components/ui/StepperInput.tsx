import { useRef, useState } from 'react'
import errorSound from '../../assets/Sounds/Error/Error.mp3'

interface Props {
  label: string
  value: string
  onChange: (value: string) => void
  /** Avisa cuando el usuario escribe algo que no es un número. */
  onInvalid?: () => void
  placeholder?: string
  /** Texto fijo dentro del campo, por ejemplo "S/". */
  prefix?: string
  /** Cantidad que suma o resta cada botón. */
  step?: number
  /** Si es `false` solo se aceptan números enteros. */
  decimal?: boolean
  /** Valor mínimo. */
  min?: number
  /** Deja el campo vacío al borrar todo con el teclado. */
  allowEmpty?: boolean
  /** Ayuda bajo el campo. */
  help?: string
  id?: string
}

/**
 * Campo numérico para celular: abre el teclado de números y trae botones + y -
 * para no tener que escribir a mano. Si se teclea algo que no es número (salvo
 * el punto decimal), lo borra, suena la alarma y avisa con un toast.
 */
export function StepperInput({
  label,
  value,
  onChange,
  onInvalid,
  placeholder,
  prefix,
  step = 1,
  decimal = false,
  min = 0,
  allowEmpty = false,
  help,
  id,
}: Props) {
  const inputId = id ?? label
  const [aviso, setAviso] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  function tocarError() {
    setAviso(true)
    window.setTimeout(() => setAviso(false), 2500)
    try {
      if (!audioRef.current) audioRef.current = new Audio(errorSound)
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(() => {})
    } catch {
      // Si el navegador bloquea el audio, el aviso visual sigue funcionando.
    }
    onInvalid?.()
  }

  function filtrar(raw: string) {
    let limpio = raw.replace(/[^0-9.]/g, '')

    if (!decimal) {
      limpio = limpio.replace(/\./g, '')
    } else {
      // Solo un punto, y nunca como primer carácter.
      const partes = limpio.split('.')
      limpio = partes.length > 2 ? `${partes[0]}.${partes.slice(1).join('')}` : limpio
      limpio = limpio.replace(/^\./, '0.')
      // Sin ceros a la izquierda: "012" pasa a "12", pero "0.50" se respeta.
      const [ent, dec] = limpio.split('.')
      const entero = (ent || '').replace(/^0+(?=\d)/, '')
      limpio = dec === undefined ? entero : `${entero || '0'}.${dec}`
    }

    if (limpio !== raw) tocarError()
    return limpio
  }

  function cambiar(raw: string) {
    const limpio = filtrar(raw)
    if (limpio === '' && !allowEmpty) return
    onChange(limpio)
  }

  function limpiar() {
    onChange('')
  }

  function mover(delta: number) {
    const base = Number(value)
    const actual = Number.isFinite(base) && value !== '' ? base : 0
    let siguiente = actual + delta
    if (siguiente < min) siguiente = min
    if (!decimal) siguiente = Math.round(siguiente)
    onChange(String(siguiente))
  }

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-xs font-bold uppercase tracking-wider text-fg-mute">
        {label}
      </label>

      <div className="flex items-stretch gap-2">
        <button
          type="button"
          onClick={() => mover(-step)}
          aria-label={`Restar ${step}`}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-line bg-raised text-2xl font-bold text-cta-text transition active:scale-95"
        >
          −
        </button>

        <div className="relative flex-1">
          {prefix && (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base font-bold text-fg-mute">
              {prefix}
            </span>
          )}

          <input
            id={inputId}
            value={value}
            onChange={(e) => cambiar(e.target.value)}
            placeholder={placeholder}
            inputMode="decimal"
            autoComplete="off"
            className={`w-full rounded-xl border bg-inset py-3 text-base font-semibold text-fg placeholder:text-fg-mute/70 transition focus:ring-2 focus:outline-none ${
              prefix ? 'pl-9' : 'pl-4'
            } ${value ? 'pr-10' : 'pr-3'} ${
              aviso ? 'border-danger ring-danger/40' : 'border-line focus:border-accent-text focus:ring-accent/40'
            }`}
          />

          {value !== '' && (
            <button
              type="button"
              onClick={limpiar}
              aria-label="Borrar"
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-raised text-base leading-none text-fg-mute transition active:scale-90"
            >
              ×
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => mover(step)}
          aria-label={`Sumar ${step}`}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-line bg-raised text-2xl font-bold text-cta-text transition active:scale-95"
        >
          +
        </button>
      </div>

      {(aviso || help) && (
        <p className={`text-xs ${aviso ? 'text-danger' : 'text-fg-mute'}`}>
          {aviso ? 'Aquí solo se escriben números' : help}
        </p>
      )}
    </div>
  )
}