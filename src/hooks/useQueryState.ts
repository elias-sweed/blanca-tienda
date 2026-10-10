import { liveQuery } from 'dexie'
import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react'

/**
 * Los 3 estados que una consulta puede tener, de forma explícita.
 *
 * `useLiveQuery` devuelve `undefined` tanto mientras carga como cuando falla,
 * así que la pantalla no puede distinguir "todavía cargo" de "se rompió". Aquí
 * el estado es un tipo cerrado: o cargo, o hay datos, o hay un error visible
 * con su botón de reintento. El usuario nunca ve la app "congelada".
 */
export type QueryState<T> =
  | { status: 'loading'; data: T | null; error: string | null }
  | { status: 'ready'; data: T; error: string | null }
  | { status: 'error'; data: T | null; error: string }

function toMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  return 'No pudimos leer los datos'
}

/**
 * Consulta reactiva a IndexedDB con tolerancia a fallos.
 *
 * - **Cargando:** `status: 'loading'`, se muestran esqueletos.
 * - **OK:** `status: 'ready'` con los datos. Cada cambio de la base re-emite.
 * - **Falla:** `status: 'error'` con mensaje y `retry()` para reintentar,
 *   sin perder los últimos datos válidos que se tuvieran (`data` se conserva).
 */
export function useQueryState<T>(
  querier: () => Promise<T>,
  deps: DependencyList,
): [QueryState<T>, () => void] {
  // El consultor más recidente vive en un ref para que la suscripción nunca
  // capture una versión vieja de la función (que cerraría sobre datos viejos).
  const querierRef = useRef(querier)

  useEffect(() => {
    querierRef.current = querier
  }, [querier])

  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<QueryState<T>>({
    status: 'loading',
    data: null,
    error: null,
  })

  useEffect(() => {
    let alive = true

    const subscription = liveQuery(() => querierRef.current()).subscribe({
      next: (value) => {
        if (!alive) return
        setState({ status: 'ready', data: value, error: null })
      },
      error: (err) => {
        if (!alive) return
        setState((prev) => ({ status: 'error', data: prev.data, error: toMessage(err) }))
      },
    })

    return () => {
      alive = false
      subscription.unsubscribe()
    }
    // `deps` lo define quien llama (mismas reglas que useEffect).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt])

  const retry = useCallback(() => {
    // Conserva los últimos datos válidos mientras vuelve a cargar: evita
    // parpadeos y que la pantalla se vacíe si el reintento tarda.
    setState((prev) => ({ status: 'loading', data: prev.data, error: null }))
    setAttempt((value) => value + 1)
  }, [])

  return [state, retry]
}
