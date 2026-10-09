import { useOnlineStatus } from '../../hooks/useOnlineStatus'

export function ConnectionStatus() {
  const online = useOnlineStatus()
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
        online
          ? 'border-cta-text/50 bg-cta/25 text-success'
          : 'border-danger/50 bg-danger/10 text-danger'
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${online ? 'bg-cta-text' : 'bg-danger'}`} />
      {online ? 'Conectado' : 'Sin conexión'}
    </span>
  )
}
