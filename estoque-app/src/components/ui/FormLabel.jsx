export default function FormLabel({ children, required }) {
  return (
    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-subtle)', marginBottom: 7 }}>
      {children}{required && <span style={{ color: 'var(--amber)', marginLeft: 3 }}>*</span>}
    </label>
  )
}
