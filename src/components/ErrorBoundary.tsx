import { Component, type ErrorInfo, type ReactNode } from 'react'

/**
 * Last line of defence. A render error used to blank the whole app; here the shell survives and
 * the user gets the message plus a way out. Never swallows the error: it is logged with the
 * component stack so it can be fixed rather than hidden.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[EBT] render failed:', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="grid min-h-[60vh] place-items-center px-6">
        <div className="w-full max-w-[520px] rounded-[12px] border border-line-strong bg-ink-800 p-6">
          <div className="eyebrow mb-2">Something broke</div>
          <h1 className="display text-[22px] leading-7 text-t1">This screen stopped rendering</h1>
          <p className="mt-2 text-[13px] leading-5 text-t2">
            The rest of the app is still loaded. Reloading brings the screen back; nothing on-chain
            is affected.
          </p>
          <p className="mono mt-3 max-h-[96px] overflow-auto rounded-lg border border-line bg-ink-850 p-2 text-[11px] leading-4 text-t3">
            {this.state.error.message}
          </p>
          <div className="mt-4 flex gap-2">
            <button className="btn btn-primary" onClick={() => this.setState({ error: null })}>
              Try again
            </button>
            <button className="btn btn-secondary" onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>
        </div>
      </div>
    )
  }
}
