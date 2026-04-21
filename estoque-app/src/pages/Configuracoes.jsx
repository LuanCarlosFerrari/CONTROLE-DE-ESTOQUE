import { useState, useEffect } from 'react'
import { Package, Wrench, BedDouble, UtensilsCrossed, Save, Zap, KeyRound, CheckCircle, Clock, ShieldAlert, User } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import Toast from '../components/ui/Toast'
import { createPaymentPreference } from '../lib/mercadopago'

const BUSINESS_TYPES = [
  { value: 'estoque', icon: Package, label: 'Estoque Geral',    desc: 'Produtos, clientes e vendas' },
  { value: 'oficina', icon: Wrench,  label: 'Oficina Mecânica', desc: 'OS, veículos e peças' },
  { value: 'hotel',   icon: BedDouble, label: 'Hotel / Pousada', desc: 'Quartos e reservas' },
  { value: 'bar',     icon: UtensilsCrossed, label: 'Bar / Restaurante', desc: 'Mesas, comandas e cardápio' },
]

const Section = ({ title, subtitle, children }) => (
  <div style={{ background: 'var(--bg-800)', border: '1px solid var(--bg-500)', borderRadius: 14, overflow: 'hidden', marginBottom: 20, width: '100%' }}>
    <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--bg-600)' }}>
      <h2 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: subtitle ? 3 : 0 }}>{title}</h2>
      {subtitle && <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{subtitle}</p>}
    </div>
    <div style={{ padding: '24px' }}>
      {children}
    </div>
  </div>
)

const Label = ({ children }) => (
  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-subtle)', marginBottom: 8 }}>
    {children}
  </label>
)

export default function Configuracoes() {
  const { user, subscription, businessType, businessName, updateSubscription } = useAuth()

  const [selectedType, setSelectedType] = useState(businessType)
  const [name, setName] = useState(businessName)
  const [savingProfile, setSavingProfile] = useState(false)

  const [resetLoading, setResetLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const [toast, setToast] = useState(null)
  const [loadingPay, setLoadingPay] = useState(false)
  const [payError, setPayError] = useState(null)

  const handlePagar = async () => {
    setLoadingPay(true)
    setPayError(null)
    try {
      const url = await createPaymentPreference()
      window.location.href = url
    } catch (err) {
      setPayError('Não foi possível iniciar o pagamento. Tente novamente.')
      setLoadingPay(false)
    }
  }

  useEffect(() => {
    setSelectedType(businessType)
    setName(businessName)
  }, [businessType, businessName])

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSavingProfile(true)
    const { error } = await updateSubscription({
      business_name: name.trim() || null,
      business_type: selectedType,
    })
    setSavingProfile(false)
    if (error) return setToast({ msg: typeof error === 'string' ? error : error.message, type: 'error' })
    setToast({ msg: 'Configurações salvas!', type: 'success' })
  }

  const handleResetPassword = async () => {
    if (!user?.email) return
    setResetLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(user.email)
    setResetLoading(false)
    if (error) return setToast({ msg: error.message, type: 'error' })
    setResetSent(true)
    setToast({ msg: 'Link enviado para o seu email!', type: 'success' })
  }

  const statusInfo = {
    trial:   { label: 'Trial ativo',     color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)',  icon: Clock },
    active:  { label: 'Assinatura ativa', color: '#34D399', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.25)', icon: CheckCircle },
    expired: { label: 'Trial expirado',  color: '#F87171', bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.25)',  icon: ShieldAlert },
    banned:  { label: 'Conta suspensa',  color: '#F87171', bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.25)',  icon: ShieldAlert },
  }
  const subStatus = statusInfo[subscription?.status] || statusInfo.trial
  const SubIcon = subStatus.icon

  const typeChanged = selectedType !== businessType
  const nameChanged = name !== businessName

  return (
    <div className="animate-fade-in page-content config-page">
      {/* Header */}
      <div style={{ marginBottom: 32, paddingBottom: 24, borderBottom: '1px solid var(--bg-600)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <div style={{ width: 3, height: 22, background: 'var(--amber)', borderRadius: 2 }} />
          <h1 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 26, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>Configurações</h1>
        </div>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', paddingLeft: 15 }}>Gerencie os dados do seu negócio e conta</p>
      </div>

      {/* Seção: Dados do negócio */}
      <Section title="Dados do negócio" subtitle="Nome exibido na plataforma e tipo de operação">
        <form onSubmit={handleSaveProfile}>
          <div style={{ marginBottom: 24 }}>
            <Label>Nome do negócio</Label>
            <input
              className="input-field"
              placeholder="Ex: Oficina do João, Hotel Beira Mar..."
              value={name}
              onChange={e => setName(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: 28 }}>
            <Label>Tipo de negócio</Label>
            {typeChanged && (
              <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#F59E0B' }}>
                ⚠️ Ao trocar o tipo, o menu lateral será atualizado. Os dados existentes não são apagados.
              </div>
            )}
            <div className="config-type-grid">
              {BUSINESS_TYPES.map(({ value, icon: Icon, label, desc }) => {
                const selected = selectedType === value
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSelectedType(value)}
                    style={{
                      background: selected ? 'rgba(16,185,129,0.08)' : 'var(--bg-700)',
                      border: `1.5px solid ${selected ? 'var(--amber)' : 'var(--bg-500)'}`,
                      borderRadius: 12, padding: '14px', cursor: 'pointer', textAlign: 'left',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { if (!selected) e.currentTarget.style.borderColor = 'var(--bg-400)' }}
                    onMouseLeave={e => { if (!selected) e.currentTarget.style.borderColor = 'var(--bg-500)' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 9, background: selected ? 'rgba(16,185,129,0.15)' : 'var(--bg-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={17} color={selected ? 'var(--amber)' : 'var(--text-subtle)'} />
                      </div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 700, color: selected ? 'var(--text)' : 'var(--text-muted)', marginBottom: 2 }}>{label}</p>
                        <p style={{ fontSize: 11, color: 'var(--text-subtle)' }}>{desc}</p>
                      </div>
                      {selected && (
                        <CheckCircle size={16} color="var(--amber)" style={{ marginLeft: 'auto', flexShrink: 0 }} />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={savingProfile || (!typeChanged && !nameChanged)}
            style={{ opacity: (!typeChanged && !nameChanged) ? 0.5 : 1 }}
          >
            <Save size={15} />
            {savingProfile ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </form>
      </Section>

      {/* Seção: Conta */}
      <Section title="Conta" subtitle="Informações de acesso">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24, padding: '14px 16px', background: 'var(--bg-700)', borderRadius: 10, border: '1px solid var(--bg-600)' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <User size={18} color="var(--amber)" />
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{user?.email}</p>
            <p style={{ fontSize: 12, color: 'var(--text-subtle)' }}>Email de acesso (não pode ser alterado)</p>
          </div>
        </div>

        <div>
          <Label>Senha</Label>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
            Enviaremos um link para o seu email para redefinir a senha.
          </p>
          <button
            className="btn-secondary"
            onClick={handleResetPassword}
            disabled={resetLoading || resetSent}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            {resetSent
              ? <><CheckCircle size={15} color="#34D399" /> Link enviado!</>
              : <><KeyRound size={15} /> {resetLoading ? 'Enviando...' : 'Redefinir senha'}</>
            }
          </button>
        </div>
      </Section>

      {/* Seção: Assinatura */}
      <Section title="Assinatura" subtitle="Status do seu plano atual">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', background: subStatus.bg, border: `1px solid ${subStatus.border}`, borderRadius: 10, marginBottom: subscription?.status === 'trial' ? 16 : 0 }}>
          <SubIcon size={20} color={subStatus.color} />
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: subStatus.color, marginBottom: 2 }}>{subStatus.label}</p>
            {subscription?.status === 'trial' && subscription?.trial_ends_at && (
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Expira em {new Date(subscription.trial_ends_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}
            {subscription?.status === 'active' && subscription?.subscription_ends_at && (
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Próxima cobrança em {new Date(subscription.subscription_ends_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
              </p>
            )}
          </div>
        </div>

        {subscription?.status === 'trial' && (
          <div style={{ background: 'var(--bg-700)', border: '1px solid var(--bg-600)', borderRadius: 10, padding: '16px 18px' }}>
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--amber)', marginBottom: 12 }}>Plano mensal</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 12 }}>
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 32, fontWeight: 800, color: 'var(--text)' }}>R$ 129</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>/mês</span>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, marginBottom: 16 }}>
              {['Todos os módulos desbloqueados', 'Dados ilimitados', 'Suporte prioritário', 'Atualizações incluídas'].map(item => (
                <li key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>
                  <CheckCircle size={13} color="var(--amber)" /> {item}
                </li>
              ))}
            </ul>
            <button
              onClick={handlePagar}
              disabled={loadingPay}
              className="btn-primary"
              style={{ display: 'inline-flex', padding: '10px 20px', fontSize: 14, opacity: loadingPay ? 0.7 : 1, cursor: loadingPay ? 'not-allowed' : 'pointer', border: 'none' }}
            >
              <Zap size={15} /> {loadingPay ? 'Redirecionando...' : 'Pagar com MercadoPago'}
            </button>
            {payError && (
              <p style={{ color: 'var(--red)', fontSize: 13, marginTop: 8 }}>{payError}</p>
            )}
          </div>
        )}
      </Section>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
