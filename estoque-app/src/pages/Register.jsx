import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { TrendingUp, Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password !== confirm) return setError('As senhas não coincidem.')
    if (password.length < 6) return setError('A senha deve ter pelo menos 6 caracteres.')
    setLoading(true)
    setError('')
    const { error, data } = await signUp(email, password)
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      // If email confirmation is disabled, user is auto-logged in
      if (data?.session) {
        navigate('/app/dashboard')
      } else {
        setSuccess(true)
        setLoading(false)
      }
    }
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-900)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} className="landing-grid">
        <div className="animate-fade-in" style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <CheckCircle size={32} color="var(--emerald)" />
          </div>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>Conta criada!</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 15, marginBottom: 24 }}>
            Verifique seu email para confirmar a conta e depois faça login.
          </p>
          <Link to="/login" className="btn-primary" style={{ textDecoration: 'none', padding: '12px 28px' }}>
            Ir para o login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-900)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} className="landing-grid">
      <div className="animate-fade-in" style={{ width: '100%', maxWidth: 420 }}>
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', textDecoration: 'none', fontSize: 14, marginBottom: 32 }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <ArrowLeft size={14} /> Voltar
        </Link>

        <div style={{ background: 'var(--bg-800)', border: '1px solid var(--bg-500)', borderRadius: 16, padding: '36px 32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--amber)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={18} color="#000" />
            </div>
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 18, color: 'var(--text)' }}>StockPro</span>
          </div>

          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
            Criar conta
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 28 }}>
            Preencha os dados para começar.
          </p>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 14, color: '#F87171' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 6 }}>Email</label>
              <input className="input-field" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 6 }}>Senha</label>
              <div style={{ position: 'relative' }}>
                <input className="input-field" type={showPass ? 'text' : 'password'} placeholder="Mín. 6 caracteres" value={password} onChange={e => setPassword(e.target.value)} required style={{ paddingRight: 42 }} />
                <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 6 }}>Confirmar senha</label>
              <input className="input-field" type="password" placeholder="Repita a senha" value={confirm} onChange={e => setConfirm(e.target.value)} required />
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
              {loading ? 'Criando conta...' : 'Criar conta'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--text-muted)' }}>
            Já tem conta?{' '}
            <Link to="/login" style={{ color: 'var(--amber)', textDecoration: 'none', fontWeight: 500 }}>Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
