import { Component } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: 'var(--bg-900)', gap: 16, padding: 24, textAlign: 'center',
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <AlertTriangle size={24} color="var(--red)" />
        </div>
        <div>
          <h2 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
            Algo deu errado
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', maxWidth: 360 }}>
            Ocorreu um erro inesperado. Recarregue a página para continuar.
          </p>
          {this.state.error?.message && (
            <p style={{
              fontSize: 12, color: 'var(--text-subtle)', marginTop: 8,
              fontFamily: 'JetBrains Mono, monospace',
              background: 'var(--bg-700)', padding: '6px 12px', borderRadius: 6,
            }}>
              {this.state.error.message}
            </p>
          )}
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--amber)', color: '#000',
            fontWeight: 700, fontSize: 14, padding: '10px 20px',
            borderRadius: 8, border: 'none', cursor: 'pointer',
          }}
        >
          <RefreshCw size={15} /> Recarregar página
        </button>
      </div>
    )
  }
}
