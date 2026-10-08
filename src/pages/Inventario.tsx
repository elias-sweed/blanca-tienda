import { AppLayout } from '../components/layout/AppLayout'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'

export default function Inventario() {
  return (
    <AppLayout title="Inventario">
      <Button size="lg" className="mb-4">+ Agregar producto</Button>
      <EmptyState title="Aún no hay productos" description="Agrega tu primer producto para ver el inventario." />
    </AppLayout>
  )
}
