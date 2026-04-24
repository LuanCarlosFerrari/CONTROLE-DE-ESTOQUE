import { Link } from 'react-router-dom'
import { Package, Users, ShoppingCart, ArrowRight, BarChart2, Shield, Zap, TrendingUp, CheckCircle2 } from 'lucide-react'
import stockTagImg from '../../assets/App-Logo.png'

const features = [
  { icon: Package, title: 'Controle de Estoque', desc: 'Gerencie produtos, categorias, quantidades e alertas de estoque mínimo em tempo real.' },
  { icon: Users, title: 'Gestão de Clientes', desc: 'Cadastro completo de clientes com histórico de compras e informações de contato.' },
  { icon: ShoppingCart, title: 'Registro de Vendas', desc: 'Registre vendas, acompanhe o histórico e visualize relatórios detalhados.' },
  { icon: BarChart2, title: 'Dashboards', desc: 'Visualize métricas essenciais do seu negócio com gráficos e indicadores.' },
  { icon: Shield, title: 'Segurança', desc: 'Autenticação segura via Supabase com dados protegidos em nuvem.' },
  { icon: Zap, title: 'Tempo Real', desc: 'Atualizações instantâneas sincronizadas entre todos os usuários.' },
]

const stats = [
  { value: '99.9%', label: 'Uptime garantido' },
  { value: '<1s', label: 'Tempo de resposta' },
  { value: '100%', label: 'Dados na nuvem' },
]

export default function Landing() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-900)', overflowX: 'hidden' }} className="landing-grid">

      {/* ── Header ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(13,16,23,0.88)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 1px 0 0 rgba(16,185,129,0.06)',
      }}>
        {/* Accent line no topo */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: 'linear-gradient(90deg, transparent 0%, rgba(16,185,129,0.6) 40%, rgba(16,185,129,0.6) 60%, transparent 100%)',
          pointerEvents: 'none',
        }} />

        <div className="landing-header-inner">

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9,
              border: '1px solid rgba(16,185,129,0.25)',
              overflow: 'hidden', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(16,185,129,0.06)',
            }}>
              <img src={stockTagImg} alt="StockTag" style={{ width: 28, height: 28, objectFit: 'contain' }} />
            </div>
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: 16, color: 'var(--text)', letterSpacing: '-0.01em' }}>StockTag</span>
            <span style={{
              fontSize: 10, fontWeight: 600, color: 'var(--amber)',
              background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
              borderRadius: 4, padding: '2px 6px', letterSpacing: '0.04em',
            }}>BETA</span>
          </div>

          {/* Nav central */}
          <nav className="landing-nav">
            {[
              { label: 'Início', href: '#hero' },
              { label: 'Funcionalidades', href: '#funcionalidades' },
              { label: 'Contatos', href: '#contatos' },
            ].map(item => (
              <a key={item.label} href={item.href}
                style={{
                  color: 'var(--text-muted)', textDecoration: 'none', fontSize: 14,
                  fontWeight: 500, padding: '6px 14px', borderRadius: 7,
                  transition: 'color 0.18s, background 0.18s',
                  fontFamily: 'DM Sans, sans-serif',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' }}
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Ações */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            <Link to="/login"
              className="landing-btn-entrar"
              style={{
                color: 'var(--text-muted)', textDecoration: 'none', fontSize: 14,
                fontWeight: 500, padding: '7px 16px', borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.09)',
                background: 'rgba(255,255,255,0.03)',
                transition: 'all 0.18s',
                fontFamily: 'DM Sans, sans-serif',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.16)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
            >
              Entrar
            </Link>
            <Link to="/register" className="btn-primary" style={{
              textDecoration: 'none', padding: '7px 18px', fontSize: 14,
              borderRadius: 8, gap: 6, display: 'inline-flex', alignItems: 'center',
              fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
            }}>
              <span className="header-cta-text">Começar grátis</span> <ArrowRight size={13} />
            </Link>
          </div>

        </div>
      </header>

      {/* ── Hero ── */}
      <section id="hero" style={{ position: 'relative', overflow: 'hidden' }}>

        {/* Background layers */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url(https://images.unsplash.com/photo-1553413077-190dd305871c?w=1920&q=80)',
          backgroundSize: 'cover', backgroundPosition: 'center',
          filter: 'brightness(0.12) saturate(0.5)',
          zIndex: 0,
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(160deg, rgba(16,185,129,0.07) 0%, transparent 50%, rgba(16,185,129,0.03) 100%)',
          zIndex: 1,
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, transparent 0%, rgba(13,16,23,0.6) 60%, var(--bg-900) 100%)',
          zIndex: 2,
        }} />

        {/* Glow orb */}
        <div style={{
          position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)',
          width: 600, height: 600,
          background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)',
          pointerEvents: 'none', zIndex: 1,
        }} />

        <div style={{ position: 'relative', zIndex: 3, maxWidth: 1160, margin: '0 auto', padding: '100px 32px 80px' }}>

          {/* Badge */}
          <div className="animate-fade-in" style={{ display: 'flex', justifyContent: 'center', marginBottom: 40 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
              borderRadius: 100, padding: '6px 16px 6px 10px',
              fontSize: 12, color: 'var(--amber)', fontWeight: 600, letterSpacing: '0.04em',
            }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 18, height: 18, borderRadius: '50%',
                background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)',
              }}>
                <CheckCircle2 size={10} color="var(--amber)" />
              </span>
              SISTEMA COMPLETO DE GESTÃO EMPRESARIAL
            </div>
          </div>

          {/* Headline */}
          <div className="animate-fade-in" style={{ textAlign: 'center', maxWidth: 860, margin: '0 auto' }}>
            <h1 className="hero-title" style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 'clamp(38px, 5.5vw, 64px)',
              fontWeight: 700,
              lineHeight: 1.15,
              color: 'var(--text)',
              marginBottom: 28,
              letterSpacing: '-0.02em',
            }}>
              Controle seu negócio{' '}
              <span style={{ color: 'var(--amber)' }} className="glow-text">
                com precisão
              </span>
            </h1>

            <p style={{
              fontSize: 18, color: 'var(--text-muted)', lineHeight: 1.75,
              maxWidth: 520, margin: '0 auto 48px',
              fontFamily: 'DM Sans, sans-serif',
            }}>
              Estoque, clientes e vendas em um único lugar. Simples, rápido e conectado à nuvem.
            </p>

            {/* CTAs */}
            <div className="hero-ctas" style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 56 }}>
              <Link to="/register" className="btn-primary" style={{
                textDecoration: 'none', padding: '14px 28px', fontSize: 15,
                display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 10,
              }}>
                Criar conta grátis <ArrowRight size={16} />
              </Link>
              <Link to="/login" className="btn-secondary" style={{
                textDecoration: 'none', padding: '14px 28px', fontSize: 15,
                borderRadius: 10,
              }}>
                Já tenho conta
              </Link>
            </div>

            {/* Stats row */}
            <div className="landing-stats-row" style={{
              display: 'flex', justifyContent: 'center', gap: 0,
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 12, overflow: 'hidden',
              background: 'rgba(255,255,255,0.02)',
              maxWidth: 480, margin: '0 auto 72px',
            }}>
              {stats.map((s, i) => (
                <div key={i} style={{
                  flex: 1, padding: '16px 0', textAlign: 'center',
                  borderRight: i < stats.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                }}>
                  <div style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: 20, color: 'var(--amber)' }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 2, letterSpacing: '0.02em' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Dashboard Preview */}
          <div className="animate-fade-in" style={{
            background: 'rgba(18,22,30,0.9)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 20, overflow: 'hidden',
            boxShadow: '0 0 0 1px rgba(16,185,129,0.05), 0 60px 100px rgba(0,0,0,0.7)',
            animationDelay: '0.3s', opacity: 0,
            backdropFilter: 'blur(10px)',
          }}>
            {/* Browser chrome */}
            <div style={{
              background: 'rgba(255,255,255,0.03)', padding: '12px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{ display: 'flex', gap: 5 }}>
                {['#FF5F57', '#FEBC2E', '#28C840'].map((c, i) => (
                  <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: 0.8 }} />
                ))}
              </div>
              <div style={{
                flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: 6,
                height: 24, maxWidth: 300, margin: '0 auto',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--amber)', opacity: 0.6 }} />
                <span style={{ fontSize: 11, color: 'var(--text-subtle)', fontFamily: 'JetBrains Mono, monospace' }}>app.stocktag.com.br/dashboard</span>
              </div>
            </div>

            {/* Mock UI */}
            <div style={{ display: 'flex', height: 340 }}>
              {/* Sidebar */}
              <div style={{ width: 196, background: 'rgba(255,255,255,0.02)', borderRight: '1px solid rgba(255,255,255,0.05)', padding: '16px 12px', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px', marginBottom: 16 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--amber)', opacity: 0.9 }} />
                  <div style={{ width: 60, height: 10, borderRadius: 3, background: 'rgba(255,255,255,0.12)' }} />
                </div>
                <div style={{ fontSize: 9, color: 'var(--text-subtle)', letterSpacing: '0.08em', padding: '0 8px', marginBottom: 6 }}>MENU</div>
                {[
                  { w: 80, active: true, label: 'Dashboard' },
                  { w: 68, active: false, label: 'Produtos' },
                  { w: 72, active: false, label: 'Clientes' },
                  { w: 60, active: false, label: 'Vendas' },
                ].map((item, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '9px 8px', borderRadius: 7, marginBottom: 2,
                    background: item.active ? 'rgba(16,185,129,0.12)' : 'transparent',
                    border: item.active ? '1px solid rgba(16,185,129,0.15)' : '1px solid transparent',
                  }}>
                    <div style={{ width: 13, height: 13, borderRadius: 3, background: item.active ? 'var(--amber)' : 'rgba(255,255,255,0.15)', flexShrink: 0 }} />
                    <div style={{ width: item.w, height: 9, borderRadius: 2, background: item.active ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.1)' }} />
                  </div>
                ))}
              </div>

              {/* Main content */}
              <div style={{ flex: 1, padding: '20px', overflowY: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ width: 100, height: 12, borderRadius: 3, background: 'rgba(255,255,255,0.15)' }} />
                    <div style={{ width: 150, height: 8, borderRadius: 3, background: 'rgba(255,255,255,0.06)' }} />
                  </div>
                  <div style={{ width: 80, height: 28, borderRadius: 7, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.2)' }} />
                </div>

                {/* Stat cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
                  {[
                    { label: 'Produtos', val: '128', color: 'var(--amber)', bg: 'rgba(16,185,129,0.08)' },
                    { label: 'Clientes', val: '47', color: 'var(--blue)', bg: 'rgba(59,130,246,0.08)' },
                    { label: 'Vendas hoje', val: 'R$2.4k', color: 'var(--emerald)', bg: 'rgba(52,211,153,0.08)' },
                    { label: 'Baixo estoque', val: '3', color: 'var(--red)', bg: 'rgba(239,68,68,0.08)' },
                  ].map((s, i) => (
                    <div key={i} style={{
                      background: s.bg, borderRadius: 10, padding: '12px 10px',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}>
                      <div style={{ fontSize: 9, color: 'var(--text-subtle)', marginBottom: 8, letterSpacing: '0.04em' }}>{s.label}</div>
                      <div style={{ fontSize: 17, fontWeight: 700, fontFamily: 'DM Sans, sans-serif', color: s.color }}>{s.val}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 4 }}>
                        <TrendingUp size={8} color="var(--emerald)" />
                        <div style={{ width: 28, height: 6, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Chart */}
                <div style={{
                  background: 'rgba(255,255,255,0.02)', borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.05)', padding: '14px 16px',
                  height: 150,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>Vendas — últimos 7 dias</div>
                    <div style={{ width: 48, height: 18, borderRadius: 4, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.15)' }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 7, height: 84 }}>
                    {[35, 58, 42, 74, 50, 66, 90].map((h, i) => (
                      <div key={i} style={{
                        flex: 1, height: `${h}%`, borderRadius: '5px 5px 0 0',
                        background: i === 6
                          ? 'linear-gradient(to top, var(--amber), rgba(16,185,129,0.7))'
                          : 'rgba(255,255,255,0.07)',
                        boxShadow: i === 6 ? '0 0 12px rgba(16,185,129,0.3)' : 'none',
                        transition: 'all 0.2s',
                      }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="funcionalidades" style={{ maxWidth: 1160, margin: '0 auto', padding: '80px 32px 100px' }}>

        {/* Section header */}
        <div style={{ marginBottom: 64, textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)',
            borderRadius: 100, padding: '5px 14px', marginBottom: 20,
            fontSize: 11, color: 'var(--amber)', fontWeight: 600, letterSpacing: '0.06em',
          }}>
            FUNCIONALIDADES
          </div>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 'clamp(28px, 3.5vw, 42px)',
              fontWeight: 700, color: 'var(--text)',
              letterSpacing: '-0.02em', lineHeight: 1.2,
              margin: '0 0 12px',
            }}>
              Tudo que você precisa{' '}
              <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>em um só lugar.</span>
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 15, maxWidth: 480, lineHeight: 1.6, margin: '0 auto' }}>
              Uma plataforma completa para gestão do seu negócio, do estoque às finanças.
            </p>
          </div>
        </div>

        {/* Feature grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {features.map(({ icon: Icon, title, desc }, idx) => (
            <div key={title} className="card-hover" style={{
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 16, padding: '28px 28px 24px',
              display: 'flex', flexDirection: 'column', gap: 14,
              transition: 'all 0.25s ease',
              cursor: 'default',
            }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(16,185,129,0.05)'
                e.currentTarget.style.borderColor = 'rgba(16,185,129,0.2)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.025)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: 'rgba(16,185,129,0.08)',
                  border: '1px solid rgba(16,185,129,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={20} color="var(--amber)" strokeWidth={1.75} />
                </div>
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 12, color: 'rgba(255,255,255,0.12)', fontWeight: 500,
                }}>
                  {String(idx + 1).padStart(2, '0')}
                </span>
              </div>
              <div>
                <h3 style={{
                  fontFamily: 'DM Sans, sans-serif', fontSize: 16, fontWeight: 600,
                  color: 'var(--text)', marginBottom: 8,
                }}>
                  {title}
                </h3>
                <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.65, margin: 0 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section id="sobre" style={{ maxWidth: 1160, margin: '0 auto 100px', padding: '0 32px' }}>
        <div style={{
          position: 'relative', overflow: 'hidden',
          borderRadius: 24, padding: '72px 60px',
          background: 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(16,185,129,0.04) 50%, rgba(13,16,23,0.8) 100%)',
          border: '1px solid rgba(16,185,129,0.2)',
          textAlign: 'center',
        }}>
          {/* Glow */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 500, height: 300,
            background: 'radial-gradient(ellipse, rgba(16,185,129,0.1) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          {/* Corner accents */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: 100, height: 100, borderTop: '1px solid rgba(16,185,129,0.3)', borderLeft: '1px solid rgba(16,185,129,0.3)', borderRadius: '24px 0 0 0', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: 0, right: 0, width: 100, height: 100, borderBottom: '1px solid rgba(16,185,129,0.3)', borderRight: '1px solid rgba(16,185,129,0.3)', borderRadius: '0 0 24px 0', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              marginBottom: 24, fontSize: 12, color: 'var(--amber)', fontWeight: 600,
              letterSpacing: '0.06em',
            }}>
              <span style={{ width: 20, height: 1, background: 'var(--amber)', display: 'inline-block', opacity: 0.6 }} />
              COMECE AGORA
              <span style={{ width: 20, height: 1, background: 'var(--amber)', display: 'inline-block', opacity: 0.6 }} />
            </div>

            <h2 style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 'clamp(28px, 3.5vw, 44px)',
              fontWeight: 700, color: 'var(--text)',
              letterSpacing: '-0.02em', lineHeight: 1.2,
              marginBottom: 16,
            }}>
              Pronto para ter controle<br />total do seu negócio?
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 16, marginBottom: 40, lineHeight: 1.6 }}>
              Crie sua conta e comece a controlar seu estoque em minutos. Sem custo.
            </p>
            <div className="hero-ctas" style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/register" className="btn-primary" style={{
                textDecoration: 'none', padding: '15px 32px', fontSize: 15,
                display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 10,
              }}>
                Criar conta grátis <ArrowRight size={16} />
              </Link>
              <Link to="/login" className="btn-secondary" style={{
                textDecoration: 'none', padding: '15px 32px', fontSize: 15, borderRadius: 10,
              }}>
                Fazer login
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Contatos ── */}
      <section id="contatos" style={{ maxWidth: 1160, margin: '0 auto', padding: '0 32px 100px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)',
            borderRadius: 100, padding: '5px 14px', marginBottom: 20,
            fontSize: 11, color: 'var(--amber)', fontWeight: 600, letterSpacing: '0.06em',
          }}>
            CONTATOS
          </div>
          <h2 style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 'clamp(26px, 3vw, 38px)',
            fontWeight: 700, color: 'var(--text)',
            letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 12,
          }}>
            Fale com a gente
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 15, maxWidth: 440, margin: '0 auto', lineHeight: 1.6 }}>
            Tem alguma dúvida ou sugestão? Entre em contato pelos canais abaixo.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {[
            {
              icon: (
                <svg width="20" height="20" fill="none" stroke="var(--amber)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                </svg>
              ),
              label: 'E-mail',
              value: 'luan.carlos.ferrari@gmail.com',
              href: 'mailto:luan.carlos.ferrari@gmail.com',
            },
            {
              icon: (
                <svg width="20" height="20" fill="none" stroke="var(--amber)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.14 12 19.79 19.79 0 0 1 1.08 3.4 2 2 0 0 1 3 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16l.92.92z"/>
                </svg>
              ),
              label: 'Telefone',
              value: '+55 (18) 99790-1991',
              href: 'tel:+5518997901991',
            },
            {
              icon: (
                <svg width="20" height="20" fill="none" stroke="var(--amber)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                </svg>
              ),
              label: 'WhatsApp',
              value: 'Clique para conversar',
              href: 'https://wa.me/5518997901991',
            },
          ].map((item, i) => (
            <a key={i} href={item.href} target="_blank" rel="noopener noreferrer" style={{
              textDecoration: 'none',
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 16, padding: '24px 24px',
              display: 'flex', alignItems: 'center', gap: 16,
              transition: 'all 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.05)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.2)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)' }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {item.icon}
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-subtle)', marginBottom: 4, fontWeight: 500 }}>{item.label}</div>
                <div style={{ fontSize: 15, color: 'var(--text)', fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>{item.value}</div>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.01)' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '56px 32px 40px', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 48, flexWrap: 'wrap' }}>

          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                border: '1px solid rgba(16,185,129,0.25)',
                overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(16,185,129,0.06)',
              }}>
                <img src={stockTagImg} alt="StockTag" style={{ width: 26, height: 26, objectFit: 'contain' }} />
              </div>
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>StockTag</span>
            </div>
            <p style={{ color: 'var(--text-subtle)', fontSize: 13, lineHeight: 1.7, maxWidth: 280, margin: '0 0 24px' }}>
              Controle de estoque, clientes e vendas em um único lugar. Simples, rápido e conectado à nuvem.
            </p>
            {/* Redes sociais */}
            <div style={{ display: 'flex', gap: 10 }}>
              {[
                {
                  label: 'Facebook',
                  href: 'https://facebook.com',
                  icon: <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073C24 5.404 18.627 0 12 0S0 5.404 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.268h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/></svg>,
                },
                {
                  label: 'Instagram',
                  href: 'https://instagram.com',
                  icon: <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>,
                },
                {
                  label: 'LinkedIn',
                  href: 'https://linkedin.com',
                  icon: <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>,
                },
                {
                  label: 'Twitter / X',
                  href: 'https://x.com',
                  icon: <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
                },
              ].map(s => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                  aria-label={s.label}
                  style={{
                    width: 36, height: 36, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--text-subtle)', background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)', textDecoration: 'none',
                    transition: 'all 0.18s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--amber)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.3)'; e.currentTarget.style.background = 'rgba(16,185,129,0.08)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-subtle)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Links do produto */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 20 }}>PRODUTO</div>
            {[
              { label: 'Funcionalidades', href: '#funcionalidades' },
              { label: 'Segurança', href: '#sobre' },
              { label: 'Criar conta', href: '/register' },
              { label: 'Entrar', href: '/login' },
            ].map(l => (
              <div key={l.label} style={{ marginBottom: 12 }}>
                <a href={l.href} style={{
                  color: 'var(--text-subtle)', textDecoration: 'none', fontSize: 14,
                  transition: 'color 0.18s',
                }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-subtle)'}
                >{l.label}</a>
              </div>
            ))}
          </div>

          {/* Contato */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 20 }}>CONTATO</div>
            {[
              { label: 'luan.carlos.ferrari@gmail.com', href: 'mailto:luan.carlos.ferrari@gmail.com' },
              { label: '+55 (18) 99790-1991', href: 'tel:+5518997901991' },
              { label: 'WhatsApp', href: 'https://wa.me/5518997901991' },
            ].map(l => (
              <div key={l.label} style={{ marginBottom: 12 }}>
                <a href={l.href} target="_blank" rel="noopener noreferrer" style={{
                  color: 'var(--text-subtle)', textDecoration: 'none', fontSize: 14,
                  transition: 'color 0.18s',
                }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-subtle)'}
                >{l.label}</a>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '20px 32px' }}>
          <div style={{ maxWidth: 1160, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <p style={{ color: 'var(--text-subtle)', fontSize: 12, margin: 0 }}>
              © 2025 StockTag — Todos os direitos reservados.
            </p>
            <div style={{ display: 'flex', gap: 20 }}>
              {['Privacidade', 'Termos de uso'].map(t => (
                <a key={t} href="#" style={{ color: 'var(--text-subtle)', fontSize: 12, textDecoration: 'none', transition: 'color 0.18s' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-subtle)'}
                >{t}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}
