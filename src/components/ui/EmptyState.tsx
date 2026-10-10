import type { ReactNode } from 'react'
import { Card } from './Card'

interface Props {
  title: string
  description?: string
  /** Emoji o dibujo grande para que no se vea una caja vacía. */
  icon?: ReactNode
  /** Botón o enlace de siguiente paso (divulgación progresiva). */
  action?: ReactNode
}

/**
 * Estado vacío: si no hay resultados, la pantalla nunca queda en blanco.
 * Siempre dice qué pasó y qué hacer a continuación.
 */
export function EmptyState({ title, description, icon, action }: Props) {
  return (
    <Card className="flex flex-col items-center gap-2 py-10 text-center">
      {icon && (
        <span className="text-4xl" aria-hidden="true">
          {icon}
        </span>
      )}
      <p className="text-lg font-bold text-title">{title}</p>
      {description && <p className="max-w-xs text-sm text-fg-mute">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </Card>
  )
}
