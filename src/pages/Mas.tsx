import { AppLayout } from '../components/layout/AppLayout'
import { Card } from '../components/ui/Card'

const links = ['Historial', 'Reportes', 'Configuración']

export default function Mas() {
  return (
    <AppLayout title="Más">
      <div className="flex flex-col gap-3">
        {links.map((l) => (
          <Card key={l}>
            <p className="font-medium">{l}</p>
          </Card>
        ))}
      </div>
    </AppLayout>
  )
}
