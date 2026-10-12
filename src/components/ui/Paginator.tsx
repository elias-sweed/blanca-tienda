import { Button } from './Button'

interface Props {
  pagina: number
  totalPaginas: number
  onChange: (pagina: number) => void
}

/**
 * Paginación simple de 10 en 10: "Página X de Y" con dos botones grandes.
 * No se muestra si todo cabe en una sola página.
 */
export function Paginator({ pagina, totalPaginas, onChange }: Props) {
  if (totalPaginas <= 1) return null
  return (
    <nav className="mt-4 flex items-center justify-between gap-2" aria-label="Paginación">
      <Button variant="secondary" size="md" disabled={pagina <= 1} onClick={() => onChange(pagina - 1)}>
        ◀ Atrás
      </Button>
      <span className="text-sm font-bold text-fg-soft">
        Página {pagina} de {totalPaginas}
      </span>
      <Button variant="secondary" size="md" disabled={pagina >= totalPaginas} onClick={() => onChange(pagina + 1)}>
        Siguiente ▶
      </Button>
    </nav>
  )
}
