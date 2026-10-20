import type { Sugerencia } from '../../utils/sugerencias'
import { normalize } from '../../utils/search'

interface Props {
  /** Nombre para lectores de pantalla, por ejemplo "Colores frecuentes". */
  etiqueta: string
  opciones: readonly Sugerencia[]
  valor: string
  onElegir: (valor: string) => void
}

/**
 * Atajos de una sola línea para elegir un color o una categoría con un toque.
 * La fila se desliza en horizontal para no alargar el formulario en el celular.
 * Nunca obliga: el campo de texto sigue libre para escribir otra cosa.
 */
export function QuickPicks({ etiqueta, opciones, valor, onElegir }: Props) {
  const actual = normalize(valor)

  return (
    <div
      role="group"
      aria-label={etiqueta}
      className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
    >
      {opciones.map((opcion) => {
        const activo = actual !== '' && normalize(opcion.valor) === actual
        return (
          <button
            key={opcion.valor}
            type="button"
            aria-pressed={activo}
            onClick={() => onElegir(opcion.valor)}
            className={`flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-2 text-sm font-bold transition-colors duration-150 ${
              activo
                ? 'border-line-active bg-selected text-label-active'
                : 'border-line bg-surface text-fg-mute hover:border-line-active hover:bg-hover hover:text-fg'
            }`}
          >
            {opcion.color && (
              <span
                aria-hidden="true"
                className="h-3.5 w-3.5 shrink-0 rounded-full border border-line-strong"
                style={{ backgroundColor: opcion.color }}
              />
            )}
            {opcion.valor}
          </button>
        )
      })}
    </div>
  )
}
