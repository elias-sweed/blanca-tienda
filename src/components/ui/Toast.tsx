import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { ToastContext, type ToastType } from './ToastContext'

interface Toast {
  id: number
  message: string
  type: ToastType
}

/** Máximo de avisos en pantalla: evita que un fallo en bucle tape la app. */
const MAX_TOASTS = 3
const DURATION = 3500

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  // Contador incremental: `Date.now()` se repite si llegan dos avisos en el
  // mismo milisegundo y React choque con claves duplicadas.
  const seqRef = useRef(0)
  const timersRef = useRef<number[]>([])

  // Al desmontar se limpian los temporizadores: no queda ninguno huérfano
  // intentando actualizar un estado que ya no existe.
  useEffect(() => {
    const timers = timersRef.current
    return () => {
      for (const timer of timers) window.clearTimeout(timer)
    }
  }, [])

  const show = useCallback((message: string, type: ToastType = 'success') => {
    seqRef.current += 1
    const id = seqRef.current

    // Idempotencia: repetir el mismo mensaje no apila copias, reemplaza la que
    // hubiera y reinicia su cuenta atrás.
    setToasts((prev) =>
      [...prev.filter((t) => t.message !== message || t.type !== type), { id, message, type }].slice(
        -MAX_TOASTS,
      ),
    )

    const timer = window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, DURATION)
    timersRef.current.push(timer)
  }, [])

  const colors: Record<ToastType, string> = {
    success: 'bg-surface text-success border-success/50 shadow-[0_0_18px_rgba(57,255,20,0.4)]',
    error: 'bg-surface text-danger border-danger/60 shadow-[0_0_18px_rgba(255,23,68,0.5)]',
    info: 'bg-surface text-info border-info/50 shadow-[0_0_18px_rgba(40,100,255,0.45)]',
    warning: 'bg-warning text-black border-warning shadow-[0_0_18px_rgba(255,255,0,0.35)]',
  }

  const icon: Record<ToastType, string> = {
    success: '✓',
    error: '✕',
    info: 'i',
    warning: '!',
  }

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {/* En móvil el header ocupa ~64px: los avisos van justo debajo para no taparlo. */}
      <div
        className="pointer-events-none fixed inset-x-0 top-[4.5rem] z-[130] flex flex-col items-center gap-2 px-4"
        role="region"
        aria-live="polite"
        aria-label="Avisos"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex w-full max-w-sm items-center gap-3 rounded-2xl border px-4 py-3 text-left font-semibold shadow-xl shadow-black/80 ${colors[t.type]}`}
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current text-sm font-bold">
              {icon[t.type]}
            </span>
            <span className="min-w-0 flex-1 text-sm">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
