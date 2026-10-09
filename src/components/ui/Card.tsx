import type { ReactNode } from 'react'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-plum/70 bg-barossa/80 p-4 shadow-lg shadow-cosmos/60 backdrop-blur-sm ${className}`}>
      {children}
    </div>
  )
}
