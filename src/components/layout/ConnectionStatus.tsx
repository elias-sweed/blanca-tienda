import { useOnlineStatus } from '../../hooks/useOnlineStatus'

export function ConnectionStatus() {
  const online = useOnlineStatus()
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
        online
          ? 'border-success/50 bg-success/15 text-success'
          : 'border-danger/60 bg-danger/15 text-danger'
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${online ? 'bg-success shadow-[0_0_8px_rgba(57,255,20,0.9)]' : 'bg-danger shadow-[0_0_8px_rgba(255,23,68,0.9)]'}`}
      />
      {online ? 'Conectado' : 'Sin conexión'}
    </span>
  )
}
