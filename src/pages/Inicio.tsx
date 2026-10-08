import { AppLayout } from '../components/layout/AppLayout'
import { Card } from '../components/ui/Card'

export default function Inicio() {
  return (
    <AppLayout title="Inicio">
      <h2 className="mb-3 text-lg font-semibold">Resumen de hoy</h2>
      <div className="flex flex-col gap-3">
        <Card>
          <p className="text-sm text-gray-500">Ventas</p>
          <p className="text-2xl font-bold">S/ 0.00</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Productos vendidos</p>
          <p className="text-2xl font-bold">0</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Productos con poco stock</p>
          <p className="text-2xl font-bold">0</p>
        </Card>
      </div>
    </AppLayout>
  )
}
