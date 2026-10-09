import type { ReactNode } from 'react'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-line bg-surface/80 p-4 shadow-lg shadow-black/60 backdrop-blur-sm ${className}`}>
      {children}
    </div>
  )
}
