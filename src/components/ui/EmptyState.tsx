import { Card } from './Card'

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <Card className="flex flex-col items-center py-10 text-center">
      <p className="text-lg font-bold text-gold">{title}</p>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
    </Card>
  )
}
