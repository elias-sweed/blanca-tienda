import { AppLayout } from '../components/layout/AppLayout'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'

export default function Ventas() {
  return (
    <AppLayout title="Ventas">
      <Button size="lg" className="mb-4">+ Nueva venta</Button>
      <EmptyState title="Aún no hay ventas" description="Cuando registres una venta aparecerá aquí." />
    </AppLayout>
  )
}
