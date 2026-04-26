import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { X, Copy, Check, QrCode, AlertCircle } from 'lucide-react'
import { gerarPixPayload } from '../../lib/pix'

export default function PixModal({ chave, nome, cidade, valor, onClose }) {
  const canvasRef  = useRef(null)
  const [copied, setCopied]   = useState(false)
  const [payload, setPayload] = useState('')
  const [error, setError]     = useState('')

  useEffect(() => {
    if (!chave) { setError('Chave PIX não configurada.'); return }

    const p = gerarPixPayload({ chave, nome, cidade, valor })
    setPayload(p)

    QRCode.toCanvas(canvasRef.current, p, {
      width: 220,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    }).catch(() => setError('Erro ao gerar QR Code.'))
  }, [chave, nome, cidade, valor])

  const handleCopy = () => {
    navigator.clipboard.writeText(payload)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1100,
      background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px',
    }}>
      <div style={{
        background: 'var(--bg-800)', border: '1px solid var(--bg-500)',
        borderRadius: 16, padding: 0, width: '100%', maxWidth: 360,
        boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid var(--bg-600)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <QrCode size={16} color="#34D399" />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: 0 }}>PIX</p>
              <p style={{ fontSize: 11, color: 'var(--text-subtle)', margin: 0 }}>Escaneie ou copie o código</p>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-subtle)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px 20px' }}>
          {error ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, marginBottom: 16 }}>
              <AlertCircle size={16} color="#F87171" />
              <p style={{ fontSize: 13, color: '#F87171', margin: 0 }}>{error}</p>
            </div>
          ) : (
            <>
              {/* QR Code */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                <div style={{ background: '#fff', borderRadius: 12, padding: 8, border: '1px solid var(--bg-500)' }}>
                  <canvas ref={canvasRef} />
                </div>
              </div>

              {/* Valor */}
              {valor > 0 && (
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <p style={{ fontSize: 11, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Valor</p>
                  <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 28, fontWeight: 800, color: 'var(--amber)', margin: 0 }}>
                    R$ {Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              )}

              {/* Chave e recebedor */}
              <div style={{ background: 'var(--bg-700)', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>Recebedor</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{nome}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>Chave</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', wordBreak: 'break-all', textAlign: 'right', maxWidth: '60%' }}>{chave}</span>
                </div>
              </div>

              {/* PIX Copia e Cola */}
              <button
                onClick={handleCopy}
                style={{
                  width: '100%', padding: '11px', borderRadius: 10,
                  background: copied ? 'rgba(52,211,153,0.1)' : 'var(--bg-700)',
                  border: `1px solid ${copied ? 'rgba(52,211,153,0.3)' : 'var(--bg-500)'}`,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  color: copied ? '#34D399' : 'var(--text-muted)', fontSize: 13, fontWeight: 600,
                  transition: 'all 0.2s',
                }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Código copiado!' : 'PIX Copia e Cola'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
