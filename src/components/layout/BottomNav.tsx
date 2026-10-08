import { NavLink } from 'react-router-dom'

const items = [
  { to: '/', label: 'Inicio', icon: '🏠' },
  { to: '/ventas', label: 'Ventas', icon: '🛒' },
  { to: '/inventario', label: 'Inventario', icon: '📦' },
  { to: '/caja', label: 'Caja', icon: '💰' },
  { to: '/mas', label: 'Más', icon: '☰' },
]

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white">
      <div className="mx-auto flex max-w-md">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${isActive ? 'text-primary font-semibold' : 'text-gray-500'}`
            }
          >
            <span className="text-xl">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
