export default function EmptyState({ icon: Icon, title, subtitle, card = false }) {
  const inner = (
    <>
      <div style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--bg-700)', border: '1px solid var(--bg-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        <Icon size={28} color="var(--bg-400)" />
      </div>
      <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>{title}</p>
      {subtitle && <p style={{ fontSize: 13, color: 'var(--text-subtle)' }}>{subtitle}</p>}
    </>
  )

  if (card) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-800)', border: '1px solid var(--bg-500)', borderRadius: 14, padding: '72px 32px', textAlign: 'center' }}>
        {inner}
      </div>
    )
  }

  return (
    <div style={{ padding: '72px 32px', textAlign: 'center' }}>
      {inner}
    </div>
  )
}
