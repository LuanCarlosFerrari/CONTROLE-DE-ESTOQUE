import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'

export default function Modal({ title, onClose, children, size = 'md' }) {
  const mouseDownTarget = useRef(null)
  const boxRef = useRef(null)
  const touchStartY = useRef(null)
  const touchStartScrollTop = useRef(0)

  useEffect(() => {
    const handler = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = prev
    }
  }, [onClose])

  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY
    touchStartScrollTop.current = boxRef.current?.scrollTop ?? 0
  }

  const handleTouchEnd = (e) => {
    if (touchStartY.current === null) return
    const delta = e.changedTouches[0].clientY - touchStartY.current
    if (delta > 80 && touchStartScrollTop.current === 0) onClose()
    touchStartY.current = null
  }

  const maxW = size === 'lg' ? 720 : size === 'xl' ? 900 : 520

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => { mouseDownTarget.current = e.target }}
      onClick={(e) => {
        if (e.target === e.currentTarget && mouseDownTarget.current === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        ref={boxRef}
        className="modal-box"
        style={{ maxWidth: maxW }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="modal-drag-handle" />
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px 16px', borderBottom: '1px solid var(--bg-500)'
        }}>
          <h3 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>
            {title}
          </h3>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', padding: 4, borderRadius: 4,
            display: 'flex', alignItems: 'center', transition: 'color 0.15s'
          }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: '20px 24px 24px' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
