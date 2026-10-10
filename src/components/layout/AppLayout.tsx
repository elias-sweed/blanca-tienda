import { useEffect, useState, type ReactNode } from 'react'
import { ConnectionStatus } from './ConnectionStatus'

function formatDate(d: Date) {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  return `${days[d.getDay()]} ${d.getDate()} de ${months[d.getMonth()]}`
}

function formatTime(d: Date) {
  return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
}

export function AppLayout({ title, children }: { title: string; children: ReactNode }) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-chrome/90 px-4 py-3 shadow-lg shadow-black/60 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-title">{title}</h1>
          <ConnectionStatus />
        </div>
        <div className="mt-1 flex items-center justify-between text-xs text-fg-mute">
          <span>{formatDate(now)}</span>
          <span className="font-bold text-fg-soft">{formatTime(now)}</span>
        </div>
      </header>
      <main className="flex-1 px-4 pb-24 pt-4">{children}</main>
    </div>
  )
}
