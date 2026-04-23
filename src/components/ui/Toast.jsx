import { useEffect } from 'react'
import { CheckCircle, XCircle, X } from 'lucide-react'

export default function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div className={`toast toast-${type}`}>
      {type === 'success'
        ? <CheckCircle size={16} color="var(--emerald)" />
        : <XCircle size={16} color="var(--red)" />
      }
      <span style={{ flex: 1, fontSize: 14 }}>{message}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}>
        <X size={14} />
      </button>
    </div>
  )
}
