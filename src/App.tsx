import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { BottomNav } from './components/layout/BottomNav'
import { Button } from './components/ui/Button'
import Inicio from './pages/Inicio'
import Ventas from './pages/Ventas'
import Inventario from './pages/Inventario'
import Caja from './pages/Caja'
import Mas from './pages/Mas'
import Historial from './pages/Historial'

function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <span className="text-5xl">🔍</span>
      <h1 className="text-xl font-bold text-title">Página no encontrada</h1>
      <p className="text-sm text-fg-mute">
        La página que buscas no existe o fue movida.
      </p>
      <Link to="/">
        <Button size="lg">Volver al inicio</Button>
      </Link>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/ventas" element={<Ventas />} />
        <Route path="/inventario" element={<Inventario />} />
        <Route path="/caja" element={<Caja />} />
        <Route path="/mas" element={<Mas />} />
        <Route path="/historial" element={<Historial />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <BottomNav />
    </BrowserRouter>
  )
}
