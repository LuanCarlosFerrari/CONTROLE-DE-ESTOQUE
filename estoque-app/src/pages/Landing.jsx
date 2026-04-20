import { Link } from 'react-router-dom'
import { Package, Users, ShoppingCart, ArrowRight, BarChart2, Shield, Zap } from 'lucide-react'
import stockTagImg from '../assets/Stock_Tag.png'

const features = [
  { icon: Package, title: 'Controle de Estoque', desc: 'Gerencie produtos, categorias, quantidades e alertas de estoque mínimo em tempo real.' },
  { icon: Users, title: 'Gestão de Clientes', desc: 'Cadastro completo de clientes com histórico de compras e informações de contato.' },
  { icon: ShoppingCart, title: 'Registro de Vendas', desc: 'Registre vendas, acompanhe o histórico e visualize relatórios detalhados.' },
  { icon: BarChart2, title: 'Dashboards', desc: 'Visualize métricas essenciais do seu negócio com gráficos e indicadores.' },
  { icon: Shield, title: 'Segurança', desc: 'Autenticação segura via Supabase com dados protegidos em nuvem.' },
  { icon: Zap, title: 'Tempo Real', desc: 'Atualizações instantâneas sincronizadas entre todos os usuários.' },
]

export default function Landing() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-900)' }} className="landing-grid">

      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 40,
        borderBottom: '1px solid var(--bg-600)',
        background: 'rgba(12,12,12,0.85)',
        backdropFilter: 'blur(12px)',
        padding: '0 40px',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src={stockTagImg} alt="StockTag" style={{ width: 34, height: 34, objectFit: 'contain', borderRadius: 8 }} />
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 18, color: 'var(--text)' }}>StockTag</span>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Link to="/login"
              style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: 14, fontWeight: 500, transition: 'color 0.2s' }}
              onMouseEnter={e => e.target.style.color = 'var(--text)'}
              onMouseLeave={e => e.target.style.color = 'var(--text-muted)'}
            >
              Entrar
            </Link>
            <Link to="/register" className="btn-primary" style={{ textDecoration: 'none', padding: '8px 18px', fontSize: 14 }}>
              Começar grátis
            </Link>
          </div>
        </div>
      </header>

      {/* Hero com imagem de fundo */}
      <section style={{ position: 'relative', overflow: 'hidden' }}>
        {/* Imagem de fundo — armazém/estoque */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url(https://images.unsplash.com/photo-1553413077-190dd305871c?w=1920&q=80)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'brightness(0.2)',
          zIndex: 0,
        }} />
        {/* Overlay degradê para fundir com o fundo escuro */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(12,12,12,0.2) 0%, rgba(12,12,12,0.75) 70%, var(--bg-900) 100%)',
          zIndex: 1,
        }} />

        <div style={{ position: 'relative', zIndex: 2, maxWidth: 1100, margin: '0 auto', padding: '120px 40px 80px' }}>

          {/* Texto principal */}
          <div className="animate-fade-in" style={{ textAlign: 'center', maxWidth: 760, margin: '0 auto' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)',
              borderRadius: 20, padding: '6px 14px', marginBottom: 32,
              fontSize: 13, color: 'var(--amber)', fontWeight: 500,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--amber)', display: 'inline-block' }} />
              Sistema completo de gestão
            </div>

            <h1 style={{
              fontFamily: 'Syne, sans-serif',
              fontSize: 'clamp(40px, 6vw, 72px)',
              fontWeight: 800,
              lineHeight: 1.05,
              color: 'var(--text)',
              marginBottom: 24,
              letterSpacing: '-0.03em',
            }}>
              Controle seu negócio{' '}
              <span style={{ color: 'var(--amber)' }} className="glow-text">
                com precisão
              </span>
            </h1>

            <p style={{ fontSize: 18, color: 'var(--text-muted)', lineHeight: 1.7, maxWidth: 560, margin: '0 auto 40px' }}>
              Gerencie estoque, clientes e vendas em um único lugar. Simples, rápido e integrado a um banco de dados online e robusto.
            </p>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/register" className="btn-primary" style={{ textDecoration: 'none', padding: '13px 28px', fontSize: 15 }}>
                Criar conta grátis
                <ArrowRight size={16} />
              </Link>
              <Link to="/login" className="btn-secondary" style={{ textDecoration: 'none', padding: '13px 28px', fontSize: 15 }}>
                Já tenho conta
              </Link>
            </div>
          </div>

          {/* Dashboard Preview */}
          <div className="animate-fade-in" style={{
            marginTop: 72,
            background: 'var(--bg-800)',
            border: '1px solid var(--bg-500)',
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: '0 40px 80px rgba(0,0,0,0.6)',
            animationDelay: '0.2s', opacity: 0,
          }}>
            {/* Mock browser bar */}
            <div style={{ background: 'var(--bg-700)', padding: '12px 16px', borderBottom: '1px solid var(--bg-600)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', gap: 6 }}>
                {['#EF4444', '#10B981', '#10B981'].map((c, i) => (
                  <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: 0.7 }} />
                ))}
              </div>
              <div style={{ flex: 1, background: 'var(--bg-600)', borderRadius: 4, height: 22, maxWidth: 280, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>app.stocktag.com.br/dashboard</span>
              </div>
            </div>

            {/* Mock UI */}
            <div style={{ display: 'flex', height: 320 }}>
              {/* Sidebar mock */}
              <div style={{ width: 180, background: 'var(--bg-800)', borderRight: '1px solid var(--bg-600)', padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 6, background: 'var(--amber)' }} />
                  <div style={{ width: 70, height: 12, borderRadius: 4, background: 'var(--bg-500)' }} />
                </div>
                {[100, 80, 90, 75].map((w, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px', borderRadius: 6, marginBottom: 4,
                    background: i === 0 ? 'rgba(16,185,129,0.1)' : 'transparent',
                  }}>
                    <div style={{ width: 14, height: 14, borderRadius: 3, background: i === 0 ? 'var(--amber)' : 'var(--bg-500)' }} />
                    <div style={{ width: w * 0.8, height: 10, borderRadius: 3, background: i === 0 ? 'rgba(16,185,129,0.3)' : 'var(--bg-600)' }} />
                  </div>
                ))}
              </div>

              {/* Content mock */}
              <div style={{ flex: 1, padding: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
                  {[
                    { label: 'Produtos', val: '128', color: 'var(--amber)' },
                    { label: 'Clientes', val: '47', color: 'var(--blue)' },
                    { label: 'Vendas hoje', val: 'R$ 2.4k', color: 'var(--emerald)' },
                    { label: 'Estoque baixo', val: '3', color: 'var(--red)' },
                  ].map((s, i) => (
                    <div key={i} style={{ background: 'var(--bg-700)', borderRadius: 8, padding: 12, border: '1px solid var(--bg-500)' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-subtle)', marginBottom: 6 }}>{s.label}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'Syne', color: s.color }}>{s.val}</div>
                    </div>
                  ))}
                </div>
                <div style={{ background: 'var(--bg-700)', borderRadius: 8, border: '1px solid var(--bg-500)', padding: 12, height: 160 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>Vendas dos últimos 7 dias</div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100 }}>
                    {[40, 65, 45, 80, 55, 70, 90].map((h, i) => (
                      <div key={i} style={{ flex: 1, height: `${h}%`, background: i === 6 ? 'var(--amber)' : 'var(--bg-500)', borderRadius: '4px 4px 0 0', opacity: i === 6 ? 1 : 0.6 }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Features */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 40px 100px' }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 36, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>
            Tudo que você precisa
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 16 }}>
            Uma plataforma completa para gestão do seu negócio
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="stat-card card-hover">
              <div style={{
                width: 40, height: 40, borderRadius: 10, background: 'rgba(16,185,129,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
              }}>
                <Icon size={20} color="var(--amber)" />
              </div>
              <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>
                {title}
              </h3>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ maxWidth: 1100, margin: '0 auto 80px', padding: '0 40px' }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.05))',
          border: '1px solid rgba(16,185,129,0.2)',
          borderRadius: 20, padding: '60px 40px', textAlign: 'center',
        }}>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 36, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>
            Comece agora mesmo
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 16, marginBottom: 32 }}>
            Crie sua conta e comece a controlar seu estoque em minutos.
          </p>
          <Link to="/register" className="btn-primary" style={{ textDecoration: 'none', padding: '14px 32px', fontSize: 16 }}>
            Criar conta grátis
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--bg-600)', padding: '24px 40px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-subtle)', fontSize: 13 }}>
          © 2025 StockTag — Controle Multiplataforma
        </p>
      </footer>

    </div>
  )
}
