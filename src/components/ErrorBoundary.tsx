import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
          <span className="text-5xl">😵</span>
          <h1 className="text-xl font-bold text-title">Algo salió mal</h1>
          <p className="text-sm text-fg-mute">
            Tuvimos un problema inesperado. Recarga la página para seguir.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-xl bg-cta-surface px-6 py-3 font-bold text-white shadow-sm border border-cta-surface"
          >
            Recargar
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
