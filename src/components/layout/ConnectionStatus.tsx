import { useOnlineStatus } from '../../hooks/useOnlineStatus'

export function ConnectionStatus() {
  const online = useOnlineStatus()
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
        online
          ? 'border-green-600/50 bg-green-900/40 text-green-300'
          : 'border-amber-600/50 bg-amber-900/40 text-amber-300'
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${online ? 'bg-green-400' : 'bg-amber-400'}`} />
      {online ? 'Conectado' : 'Sin conexión'}
    </span>
  )
}
