import { Search } from 'lucide-react'

export default function SearchBar({ value, onChange, placeholder = 'Buscar...', resultCount, style }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, ...style }}>
      <div style={{ position: 'relative', flex: 1, maxWidth: 380 }}>
        <Search size={14} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
        <input
          className="input-field"
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{ paddingLeft: 38, fontSize: 13 }}
        />
      </div>
      {value && resultCount !== undefined && (
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {resultCount} resultado{resultCount !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  )
}
