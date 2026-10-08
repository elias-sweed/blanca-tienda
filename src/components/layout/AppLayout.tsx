import type { ReactNode } from 'react'
import { ConnectionStatus } from './ConnectionStatus'

export function AppLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-night">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-gold/20 bg-surface px-4 py-3 shadow-md">
        <h1 className="text-xl font-bold text-gold">{title}</h1>
        <ConnectionStatus />
      </header>
      <main className="flex-1 px-4 pb-24 pt-4">{children}</main>
    </div>
  )
}
