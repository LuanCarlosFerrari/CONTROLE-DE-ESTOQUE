import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../hooks/useToast'
import { Package, Wrench, BedDouble, UtensilsCrossed, Save, Zap, KeyRound, CheckCircle, Clock, ShieldAlert, User, Sun, Moon, Send, Link2, LinkIcon, Link2Off, QrCode } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import PageHeader from '../components/ui/PageHeader'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import Toast from '../components/ui/Toast'
import Label from '../components/ui/FormLabel'

const BUSINESS_TYPES = [
  { value: 'estoque', icon: Package, label: 'Loja/Comércio',    desc: 'Produtos, clientes e vendas' },
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


export default function Configuracoes() {
  const { user, subscription, businessType, businessName, updateSubscription } = useAuth()

  const [selectedType, setSelectedType] = useState(businessType)
  const [name, setName] = useState(businessName)
  const [savingProfile, setSavingProfile] = useState(false)

  const [pixChave,  setPixChave]  = useState(subscription?.pix_chave  || '')
  const [pixNome,   setPixNome]   = useState(subscription?.pix_nome   || '')
  const [pixCidade, setPixCidade] = useState(subscription?.pix_cidade || '')
  const [savingPix, setSavingPix] = useState(false)

  const [resetLoading, setResetLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const { toast, showToast, clearToast } = useToast()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()

  const [telegramSession, setTelegramSession] = useState(null)
  const [telegramLoading, setTelegramLoading] = useState(true)
  const [unlinking, setUnlinking] = useState(false)
  const [linking, setLinking] = useState(false)

  const handlePagar = () => navigate('/app/pagar')

  useEffect(() => {
    setSelectedType(businessType)
    setName(businessName)
  }, [businessType, businessName])

  useEffect(() => {
    setPixChave(subscription?.pix_chave  || '')
    setPixNome(subscription?.pix_nome    || '')
    setPixCidade(subscription?.pix_cidade || '')
  }, [subscription])

  const handleSavePix = async (e) => {
    e.preventDefault()
    setSavingPix(true)
    const { error } = await updateSubscription({
      pix_chave:  pixChave.trim()  || null,
      pix_nome:   pixNome.trim()   || null,
      pix_cidade: pixCidade.trim() || null,
    })
    setSavingPix(false)
    if (error) return showToast(typeof error === 'string' ? error : error.message, 'error')
    showToast('PIX configurado!')
  }

  useEffect(() => {
    if (!user?.id) return
    supabase
      .from('bot_sessions')
      .select('chat_id, state, updated_at')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setTelegramSession(data)
        setTelegramLoading(false)
      })
  }, [user?.id])

  const handleUnlinkTelegram = async () => {
    setUnlinking(true)
    await supabase
      .from('bot_sessions')
      .update({ user_id: null, state: 'UNLINKED' })
      .eq('user_id', user.id)
    setTelegramSession(null)
    setUnlinking(false)
    showToast('Conta Telegram desvinculada.')
  }

  const handleConnectTelegram = async () => {
    setLinking(true)
    const { data: token, error } = await supabase.rpc('create_telegram_link_token', { p_user_id: user.id })
    if (error || !token) {
      setLinking(false)
      showToast('Erro ao gerar link. Tente novamente.')
      return
    }
    window.open(`https://t.me/App_massage_bot?start=${token}`, '_blank')
  }

  useEffect(() => {
    if (!linking || !user?.id) return
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('bot_sessions')
        .select('chat_id, state, updated_at')
        .eq('user_id', user.id)
        .maybeSingle()
      if (data) {
        setTelegramSession(data)
        setLinking(false)
        showToast('Telegram vinculado com sucesso! 🎉')
      }
    }, 3000)
    const timeout = setTimeout(() => setLinking(false), 5 * 60 * 1000)
    return () => { clearInterval(interval); clearTimeout(timeout) }
  }, [linking, user?.id])

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSavingProfile(true)
    const { error } = await updateSubscription({
      business_name: name.trim() || null,
      business_type: selectedType,
    })
    setSavingProfile(false)
    if (error) return showToast(typeof error === 'string' ? error : error.message, 'error')
    showToast('Configurações salvas!')
  }

  const handleResetPassword = async () => {
    if (!user?.email) return
    setResetLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(user.email)
    setResetLoading(false)
    if (error) return showToast(error.message, 'error')
    setResetSent(true)
    showToast('Link enviado para o seu email!')
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
      <PageHeader title="Configurações" subtitle="Gerencie os dados do seu negócio e conta" />

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

      {/* Seção: Bot Telegram */}
      <Section title="Bot Telegram" subtitle="Consulte dados do sistema diretamente pelo Telegram">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 20, padding: '14px 16px', background: 'var(--bg-700)', borderRadius: 10, border: '1px solid var(--bg-600)' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(51,144,236,0.12)', border: '1px solid rgba(51,144,236,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Send size={18} color="#3390EC" />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>StockTag Bot</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Receba resumos do caixa, alertas de estoque baixo, parcelas vencidas, OS em aberto e check-outs do dia diretamente no Telegram.
            </p>
          </div>
        </div>

        {telegramLoading ? (
          <p style={{ fontSize: 13, color: 'var(--text-subtle)' }}>Verificando vinculação...</p>
        ) : telegramSession ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 10, marginBottom: 16 }}>
              <CheckCircle size={16} color="#34D399" />
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#34D399', marginBottom: 1 }}>Conta vinculada</p>
                <p style={{ fontSize: 12, color: 'var(--text-subtle)' }}>
                  Chat ID: {telegramSession.chat_id} · Vinculado em {new Date(telegramSession.updated_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
            <button
              className="btn-secondary"
              onClick={handleUnlinkTelegram}
              disabled={unlinking}
              style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}
            >
              <Link2Off size={14} />
              {unlinking ? 'Desvinculando...' : 'Desvincular conta Telegram'}
            </button>
          </div>
        ) : linking ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'rgba(51,144,236,0.06)', border: '1px solid rgba(51,144,236,0.2)', borderRadius: 10 }}>
            <Clock size={16} color="#3390EC" />
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#3390EC', marginBottom: 2 }}>Aguardando vinculação...</p>
              <p style={{ fontSize: 12, color: 'var(--text-subtle)' }}>Conclua o processo no Telegram. Esta janela atualiza automaticamente.</p>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, marginBottom: 20 }}>
              <Link2Off size={16} color="#F59E0B" />
              <p style={{ fontSize: 13, color: '#F59E0B', fontWeight: 600 }}>Conta não vinculada</p>
            </div>
            <button
              className="btn-primary"
              onClick={handleConnectTelegram}
              style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}
            >
              <Send size={14} />
              Conectar no Telegram
            </button>
            <p style={{ fontSize: 12, color: 'var(--text-subtle)', marginTop: 10 }}>
              Você será redirecionado ao Telegram. A vinculação é automática.
            </p>
          </div>
        )}
      </Section>

      {/* Seção: PIX */}
      <Section title="PIX" subtitle="Configure sua chave PIX para gerar QR Codes nas vendas">
        <form onSubmit={handleSavePix}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <Label>Chave PIX</Label>
              <input
                className="input-field"
                placeholder="CPF, CNPJ, email, telefone ou chave aleatória"
                value={pixChave}
                onChange={e => setPixChave(e.target.value)}
                style={{ width: '100%' }}
              />
              <p style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 4 }}>
                Exibida no QR Code — use a mesma chave cadastrada no seu banco.
              </p>
            </div>
            <div>
              <Label>Nome do recebedor</Label>
              <input
                className="input-field"
                placeholder="Seu nome ou razão social"
                value={pixNome}
                onChange={e => setPixNome(e.target.value)}
                maxLength={25}
              />
              <p style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 4 }}>Máx. 25 chars, sem acentos.</p>
            </div>
            <div>
              <Label>Cidade</Label>
              <input
                className="input-field"
                placeholder="Ex: Sao Paulo"
                value={pixCidade}
                onChange={e => setPixCidade(e.target.value)}
                maxLength={15}
              />
              <p style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 4 }}>Máx. 15 chars, sem acentos.</p>
            </div>
          </div>

          {pixChave && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 10, marginBottom: 20 }}>
              <QrCode size={16} color="#34D399" />
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                QR Code PIX ativo — aparecerá nas vendas com pagamento em PIX.
              </p>
            </div>
          )}

          {(() => {
            const pixSaved =
              (pixChave.trim() || '') === (subscription?.pix_chave || '') &&
              (pixNome.trim()  || '') === (subscription?.pix_nome  || '') &&
              (pixCidade.trim()|| '') === (subscription?.pix_cidade|| '')
            return pixSaved && pixChave ? (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 16px', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#34D399' }}>
                <CheckCircle size={15} /> Chave PIX salva
              </div>
            ) : (
              <button type="submit" className="btn-primary" disabled={savingPix}>
                <Save size={15} />
                {savingPix ? 'Salvando...' : 'Salvar PIX'}
              </button>
            )
          })()}
        </form>
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
              className="btn-primary"
              style={{ display: 'inline-flex', padding: '10px 20px', fontSize: 14, border: 'none' }}
            >
              <Zap size={15} /> Assinar via PIX
            </button>
          </div>
        )}
      </Section>

      {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
    </div>
  )
}
