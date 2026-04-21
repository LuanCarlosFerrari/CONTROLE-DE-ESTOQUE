import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ArrowLeft } from 'lucide-react'
import stockTagImg from '../../assets/Stock_Tag.png'
import { useAuth } from '../../contexts/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await signIn(email, password)
    if (error) {
      setError(error.message === 'Invalid login credentials' ? 'Email ou senha incorretos.' : error.message)
      setLoading(false)
    } else {
      navigate('/app/dashboard')
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-900)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }} className="landing-grid">
      <div className="animate-fade-in" style={{ width: '100%', maxWidth: 420 }}>
        {/* Back */}
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', textDecoration: 'none', fontSize: 14, marginBottom: 32, transition: 'color 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <ArrowLeft size={14} /> Voltar
        </Link>

        {/* Card */}
        <div style={{ background: 'var(--bg-800)', border: '1px solid var(--bg-500)', borderRadius: 16, padding: '36px 32px' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
            <img src={stockTagImg} alt="StockTag" style={{ width: 104, height: 104, objectFit: 'contain', borderRadius: 16 }} />
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: 18, color: 'var(--text)' }}>StockTag</span>
          </div>

          <h1 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 24, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
            Entrar na conta
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 28 }}>
            Bem-vindo de volta. Insira seus dados.
          </p>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 14, color: '#F87171' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 6 }}>
                Email
              </label>
              <input
                className="input-field"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 6 }}>
                Senha
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input-field"
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{ paddingRight: 42 }}
                />
                <button type="button" onClick={() => setShowPass(!showPass)} style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                  display: 'flex', alignItems: 'center',
                }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--text-muted)' }}>
            Não tem conta?{' '}
            <Link to="/register" style={{ color: 'var(--amber)', textDecoration: 'none', fontWeight: 500 }}>
              Criar agora
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
