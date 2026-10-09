export function Spinner({ label = 'Cargando...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-fg-mute/80">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-line-strong border-t-accent-text" />
      <p className="text-sm">{label}</p>
    </div>
  )
}
