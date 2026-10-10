import { Button } from './Button'

interface Props {
  /** Qué salió mal, en palabras de la tienda, sin tecnicismos. */
  title?: string
  description?: string
  /** Si se pasa, muestra el botón para volver a intentarlo. */
  onRetry?: () => void
}

/**
 * Estado de error: nunca deja un hueco en blanco ni un mensaje de consola.
 * Explica qué pasó, tranquiliza y ofrece un reintento.
 */
export function ErrorState({
  title = 'Tuvimos un problema',
  description = 'No pudimos cargar la información. Reintenta en unos segundos.',
  onRetry,
}: Props) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-2xl border border-danger/40 bg-danger/10 px-4 py-8 text-center"
    >
      <span
        className="flex h-12 w-12 items-center justify-center rounded-full bg-danger text-2xl font-bold text-white"
        aria-hidden="true"
      >
        !
      </span>
      <div>
        <p className="text-lg font-bold text-title">{title}</p>
        <p className="mt-1 text-sm text-fg-mute">{description}</p>
      </div>
      {onRetry && (
        <Button variant="secondary" size="md" onClick={onRetry}>
          Volver a intentar
        </Button>
      )}
    </div>
  )
}
