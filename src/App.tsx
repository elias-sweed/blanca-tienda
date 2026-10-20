import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { AuthGate } from './components/AuthGate'
import { LockGate } from './components/LockGate'
import { usePWA } from './hooks/usePWA'
import { BottomNav } from './components/layout/BottomNav'
import { Button } from './components/ui/Button'
import Compras from './pages/Compras'
import Inicio from './pages/Inicio'
import Ventas from './pages/Ventas'
import Inventario from './pages/Inventario'
import Caja from './pages/Caja'
import Mas from './pages/Mas'
import Historial from './pages/Historial'
import Login from './pages/Login'
import Recuperar from './pages/Recuperar'

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

/** Pantallas privadas: solo se ven con la sesión de Supabase iniciada. */
function AppPrivada() {
  return (
    <AuthGate>
      <LockGate>
        <Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/ventas" element={<Ventas />} />
          <Route path="/inventario" element={<Inventario />} />
          <Route path="/caja" element={<Caja />} />
          <Route path="/compras" element={<Compras />} />
          <Route path="/mas" element={<Mas />} />
          <Route path="/historial" element={<Historial />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <BottomNav />
      </LockGate>
    </AuthGate>
  )
}

export default function App() {
  // Registra el service worker una sola vez al abrir la app.
  usePWA()

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        {/* El enlace del correo deja la sesión lista; esta pantalla confirma. */}
        <Route path="/recuperar" element={<Recuperar />} />
        <Route path="/*" element={<AppPrivada />} />
      </Routes>
    </BrowserRouter>
  )
}
