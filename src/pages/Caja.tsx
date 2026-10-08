import { AppLayout } from '../components/layout/AppLayout'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'

export default function Caja() {
  return (
    <AppLayout title="Caja">
      <Button size="lg" className="mb-4">Abrir caja</Button>
      <EmptyState title="Caja cerrada" description="Abre la caja para empezar a registrar el día." />
    </AppLayout>
  )
}
