import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[AppErrorBoundary]', error, errorInfo.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="full-viewport-min flex flex-col items-center justify-center gap-4 bg-background px-6 text-center text-on-surface"
          role="alert"
        >
          <h1 className="font-headline text-xl font-semibold">Something went wrong</h1>
          <p className="max-w-md text-sm text-on-surface-variant">
            {this.state.error?.message ?? 'An unexpected error occurred in the app.'}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition hover:opacity-90"
          >
            Reload page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
