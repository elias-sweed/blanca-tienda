import { Link } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { Card } from '../components/ui/Card'

export default function Mas() {
  return (
    <AppLayout title="Más">
      <div className="flex flex-col gap-3">
        <Link to="/historial">
          <Card>
            <p className="font-medium">Historial</p>
            <p className="text-sm text-gray-500">Ver ventas, movimientos y cierres</p>
          </Card>
        </Link>
        <Card>
          <p className="font-medium">Configuración</p>
          <p className="text-sm text-gray-500">Próximamente</p>
        </Card>
      </div>
    </AppLayout>
  )
}
