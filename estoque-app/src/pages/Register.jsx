import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ArrowLeft, CheckCircle, Package, Wrench, BedDouble, Wine, ArrowRight } from 'lucide-react'
import stockTagImg from '../assets/Stock_Tag.png'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const BUSINESS_TYPES = [
  {
    value: 'estoque',
    icon: Package,
    label: 'Estoque Geral',
    desc: 'Produtos, clientes e vendas',
  },
  {
    value: 'oficina',
    icon: Wrench,
    label: 'Oficina Mecânica',
    desc: 'OS, veículos e peças',
  },
  {
    value: 'hotel',
    icon: BedDouble,
    label: 'Hotel / Pousada',
    desc: 'Quartos e reservas',
  },
  {
    value: 'adega',
    icon: Wine,
    label: 'Adega / Vinhos',
    desc: 'Safras, lotes e fornecedores',
  },
]

export default function Register() {
  const [step, setStep] = useState(1)
  const [businessType, setBusinessType] = useState('')
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

    const { error, data } = await signUp(email, password, { business_type: businessType })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    if (data?.session) {
      // Auto-login: atualiza subscription com business_type
      await supabase
        .from('subscriptions')
        .update({ business_type: businessType })
        .eq('user_id', data.user.id)
      navigate('/app/dashboard')
    } else {
      // Email confirmation necessário: salva localmente para aplicar no primeiro login
      localStorage.setItem('pending_business_type', businessType)
      setSuccess(true)
      setLoading(false)
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
      <div className="animate-fade-in" style={{ width: '100%', maxWidth: step === 1 ? 560 : 420 }}>
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', textDecoration: 'none', fontSize: 14, marginBottom: 32 }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <ArrowLeft size={14} /> Voltar
        </Link>

        <div style={{ background: 'var(--bg-800)', border: '1px solid var(--bg-500)', borderRadius: 16, padding: '36px 32px' }}>
          {/* Logo + progress */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img src={stockTagImg} alt="StockTag" style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 10 }} />
              <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 18, color: 'var(--text)' }}>StockTag</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {[1, 2].map(s => (
                <div key={s} style={{ width: s === step ? 20 : 8, height: 8, borderRadius: 4, background: s === step ? 'var(--amber)' : s < step ? 'var(--emerald)' : 'var(--bg-500)', transition: 'all 0.3s' }} />
              ))}
            </div>
          </div>

          {/* Step 1 — Tipo de negócio */}
          {step === 1 && (
            <>
              <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                Qual é o seu negócio?
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>
                Escolha o tipo para personalizarmos a plataforma.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
                {BUSINESS_TYPES.map(({ value, icon: Icon, label, desc }) => {
                  const selected = businessType === value
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setBusinessType(value)}
                      style={{
                        background: selected ? 'rgba(16,185,129,0.08)' : 'var(--bg-700)',
                        border: `1.5px solid ${selected ? 'var(--amber)' : 'var(--bg-500)'}`,
                        borderRadius: 12, padding: '16px 14px',
                        cursor: 'pointer', textAlign: 'left',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { if (!selected) e.currentTarget.style.borderColor = 'var(--bg-400)' }}
                      onMouseLeave={e => { if (!selected) e.currentTarget.style.borderColor = 'var(--bg-500)' }}
                    >
                      <div style={{ width: 36, height: 36, borderRadius: 9, background: selected ? 'rgba(16,185,129,0.15)' : 'var(--bg-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                        <Icon size={18} color={selected ? 'var(--amber)' : 'var(--text-subtle)'} />
                      </div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: selected ? 'var(--text)' : 'var(--text-muted)', marginBottom: 3 }}>{label}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-subtle)' }}>{desc}</p>
                    </button>
                  )
                })}
              </div>

              <button
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
                disabled={!businessType}
                onClick={() => setStep(2)}
              >
                Continuar <ArrowRight size={15} />
              </button>
            </>
          )}

          {/* Step 2 — Credenciais */}
          {step === 2 && (
            <>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, marginBottom: 20, padding: 0 }}
              >
                <ArrowLeft size={13} /> Voltar
              </button>

              <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                Criar conta
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>
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
            </>
          )}
        </div>
      </div>
    </div>
  )
}
