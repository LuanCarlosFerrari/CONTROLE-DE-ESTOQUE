export default function StatCard({ label, sublabel, value, icon: Icon, color, border, glow }) {
  return (
    <div
      style={{
        background: `linear-gradient(135deg, var(--bg-700) 0%, ${glow} 100%)`,
        border: `1px solid ${border}`,
        borderRadius: 14, padding: '20px 22px',
        transition: 'transform 0.2s, box-shadow 0.2s',
        cursor: 'default',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 32px ${glow}` }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: Icon ? 'space-between' : 'flex-start', marginBottom: 16 }}>
        <div>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-subtle)', display: 'block' }}>
            {label}
          </span>
          {sublabel && (
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: 'var(--text-subtle)', letterSpacing: '0.04em' }}>
              {sublabel}
            </span>
          )}
        </div>
        {Icon && (
          <div style={{ width: 36, height: 36, borderRadius: 9, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={17} color={color} />
          </div>
        )}
      </div>
      <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 26, fontWeight: 700, color, lineHeight: 1, letterSpacing: '-0.02em' }}>
        {value}
      </p>
    </div>
  )
}
