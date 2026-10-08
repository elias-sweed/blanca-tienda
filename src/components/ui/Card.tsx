import type { ReactNode } from 'react'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-gold/20 bg-surface p-4 shadow-lg shadow-black/30 ${className}`}>
      {children}
    </div>
  )
}
