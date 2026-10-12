import { NavLink } from 'react-router-dom'
import { useLowStock } from '../../hooks/useLowStock'

const items = [
  { to: '/', label: 'Inicio', icon: '🏠' },
  { to: '/ventas', label: 'Ventas', icon: '🛒' },
  { to: '/inventario', label: 'Inventario', icon: '📦' },
  { to: '/caja', label: 'Caja', icon: '💰' },
  { to: '/historial', label: 'Historial', icon: '📋' },
]

export function BottomNav() {
  // Mismo cálculo que Inicio y Ventas: el punto rojo nunca contradice al resto.
  const stock = useLowStock()
  const bajos = stock.data?.length ?? 0

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-line bg-chrome">
      <div className="mx-auto flex max-w-md">
        {items.map((item) => {
          const esInventario = item.to === '/inventario'
          const aviso = esInventario && bajos > 0
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              aria-label={aviso ? `${item.label}, ${bajos} con stock bajo` : undefined}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 border-t-2 py-2 text-xs transition-colors duration-150 ${
                  isActive
                    ? 'border-accent-text font-bold text-fg'
                    : 'border-transparent font-medium text-fg-mute hover:text-fg-soft'
                }`
              }
            >
              <span className="relative text-xl">
                {item.icon}
                {aviso && (
                  <span
                    className="absolute -right-2.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold leading-none text-white"
                    aria-hidden="true"
                  >
                    {bajos > 9 ? '9+' : bajos}
                  </span>
                )}
              </span>
              {item.label}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
