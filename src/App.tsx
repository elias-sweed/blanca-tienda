import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { BottomNav } from './components/layout/BottomNav'
import Inicio from './pages/Inicio'
import Ventas from './pages/Ventas'
import Inventario from './pages/Inventario'
import Caja from './pages/Caja'
import Mas from './pages/Mas'
import Historial from './pages/Historial'

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
      </Routes>
      <BottomNav />
    </BrowserRouter>
  )
}
