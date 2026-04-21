import { Trash2 } from 'lucide-react'
import Modal from './Modal'

export default function ConfirmModal({ title = 'Excluir', message, onConfirm, onClose, loading = false }) {
  return (
    <Modal title={title} onClose={onClose}>
      <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <Trash2 size={22} color="#F87171" />
        </div>
        <p style={{ fontSize: 15, color: 'var(--text)', fontWeight: 500, marginBottom: 8 }}>Tem certeza?</p>
        {message && <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{message}</p>}
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        <button className="btn-secondary" onClick={onClose} style={{ flex: 1 }} disabled={loading}>Cancelar</button>
        <button className="btn-danger" onClick={onConfirm} style={{ flex: 1, padding: '10px 20px', justifyContent: 'center' }} disabled={loading}>
          {loading ? 'Excluindo...' : 'Excluir'}
        </button>
      </div>
    </Modal>
  )
}
