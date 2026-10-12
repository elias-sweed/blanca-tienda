interface Opcion<T extends string> {
  valor: T
  etiqueta: string
}

interface Props<T extends string> {
  titulo: string
  opciones: readonly Opcion<T>[]
  valor: T
  onChange: (valor: T) => void
}

/**
 * Filtro de una sola línea con botones grandes (sin menús escondidos):
 * se elige tocando y el seleccionado queda resaltado.
 */
export function FilterChips<T extends string>({ titulo, opciones, valor, onChange }: Props<T>) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-bold uppercase tracking-wider text-fg-mute">{titulo}</span>
      <div className="flex gap-2" role="group" aria-label={titulo}>
        {opciones.map((o) => (
          <button
            key={o.valor}
            type="button"
            aria-pressed={valor === o.valor}
            onClick={() => onChange(o.valor)}
            className={`flex-1 rounded-xl border px-2 py-2 text-xs font-bold transition-colors duration-150 ${
              valor === o.valor
                ? 'border-line-active bg-selected text-label-active'
                : 'border-line bg-surface text-fg-mute hover:border-line-active hover:bg-hover hover:text-fg'
            }`}
          >
            {o.etiqueta}
          </button>
        ))}
      </div>
    </div>
  )
}
