import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}

const ToastContext = createContext<{ show: (message: string, type?: Toast['type']) => void }>({
  show: () => {},
})

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const show = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Date.now()
    setToasts((t) => [...t, { id, message, type }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000)
  }, [])

  const colors = {
    success: 'bg-surface text-success border-success/50 shadow-[0_0_18px_rgba(57,255,20,0.4)]',
    error: 'bg-surface text-danger border-danger/60 shadow-[0_0_18px_rgba(255,23,68,0.5)]',
    info: 'bg-surface text-info border-info/50 shadow-[0_0_18px_rgba(40,100,255,0.45)]',
  }

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {/* En móvil el header ocupa ~64px: los avisos van justo debajo para no taparlo. */}
      <div className="pointer-events-none fixed inset-x-0 top-[4.5rem] z-[70] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`w-full max-w-sm rounded-2xl border px-4 py-3 text-center font-semibold shadow-xl shadow-black/80 ${colors[t.type]}`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
