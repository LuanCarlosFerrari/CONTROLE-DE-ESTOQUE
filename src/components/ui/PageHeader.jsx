export default function PageHeader({ title, subtitle, accent = 'var(--amber)', actions }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28, paddingBottom: 24, borderBottom: '1px solid var(--bg-600)', flexWrap: 'wrap', gap: 16 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <div style={{ width: 3, height: 22, background: accent, borderRadius: 2 }} />
          <h1 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 26, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>
            {title}
          </h1>
        </div>
        {subtitle && (
          <div style={{ paddingLeft: 15 }}>
            {typeof subtitle === 'string'
              ? <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{subtitle}</p>
              : subtitle}
          </div>
        )}
      </div>
      {actions && <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{actions}</div>}
    </div>
  )
}
