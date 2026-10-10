interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  /** Cuántos resultados coinciden ahora. Se anuncia bajo el campo. */
  results?: number
  /** Total de elementos buscables, para el texto "X de Y". */
  total?: number
}

/**
 * Búsqueda con autocompletado. El filtrado no vive aquí: el componente solo
 * entrega el texto y la cantidad de coincidencias; la pantalla decide con
 * `rankMatches` qué mostrar.
 */
export function SearchBox({
  value,
  onChange,
  placeholder = 'Buscar...',
  label = 'Buscar',
  results,
  total,
}: Props) {
  const hayBusqueda = value.trim() !== ''
  const sinResultados = hayBusqueda && results === 0

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="busqueda" className="text-xs font-bold uppercase tracking-wider text-fg-mute">
        {label}
      </label>

      <div className="relative">
        <input
          id="busqueda"
          type="search"
          inputMode="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          aria-describedby="busqueda-ayuda"
          className={`w-full rounded-xl border bg-inset py-3 pl-4 pr-11 text-base font-semibold text-fg placeholder:text-fg-mute/70 transition-colors duration-150 focus:outline-none ${
            sinResultados
              ? 'border-danger focus:border-danger focus:ring-2 focus:ring-danger/40'
              : 'border-line focus:border-accent-text focus:ring-2 focus:ring-accent/40'
          }`}
        />

        {hayBusqueda && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Borrar búsqueda"
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-line-strong bg-raised text-base font-bold leading-none text-fg-soft transition-transform duration-150 ease-out will-change-transform active:scale-90"
          >
            ×
          </button>
        )}
      </div>

      <p id="busqueda-ayuda" className="text-xs" aria-live="polite">
        {sinResultados ? (
          <span className="font-bold text-danger">
            No encontramos nada con "{value.trim()}". Intenta con otra palabra.
          </span>
        ) : hayBusqueda && results !== undefined && total !== undefined ? (
          <span className="text-fg-mute">
            {results} de {total}
          </span>
        ) : null}
      </p>
    </div>
  )
}
