export function Spinner({ label = 'Cargando...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-gray-500">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-primary" />
      <p className="text-sm">{label}</p>
    </div>
  )
}
