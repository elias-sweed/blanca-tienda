import { useOnlineStatus } from '../../hooks/useOnlineStatus'

export function ConnectionStatus() {
  const online = useOnlineStatus()
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${online ? 'bg-green-900/50 text-green-400' : 'bg-orange-900/50 text-orange-400'}`}>
      <span className={`h-2 w-2 rounded-full ${online ? 'bg-green-500' : 'bg-orange-500'}`} />
      {online ? 'Conectado' : 'Sin conexión'}
    </span>
  )
}
