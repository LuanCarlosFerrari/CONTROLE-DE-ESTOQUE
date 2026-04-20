import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Package, Users, ShoppingCart, LogOut, TrendingUp, Clock, CheckCircle, Sun, Moon } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'

const links = [
  { to: '/app/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/app/estoque', icon: Package, label: 'Estoque' },
  { to: '/app/clientes', icon: Users, label: 'Clientes' },
  { to: '/app/vendas', icon: ShoppingCart, label: 'Vendas' },
]

export default function Sidebar() {
  const { signOut, user, trialDaysLeft, isTrial, isActive } = useAuth()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const trialColor = trialDaysLeft <= 2 ? 'var(--red)' : trialDaysLeft <= 4 ? '#F97316' : 'var(--amber)'
  const trialBg = trialDaysLeft <= 2 ? 'rgba(239,68,68,0.1)' : trialDaysLeft <= 4 ? 'rgba(249,115,22,0.1)' : 'rgba(245,158,11,0.1)'
  const trialBorder = trialDaysLeft <= 2 ? 'rgba(239,68,68,0.25)' : trialDaysLeft <= 4 ? 'rgba(249,115,22,0.25)' : 'rgba(245,158,11,0.25)'

  return (
    <aside style={{
      width: 220, minWidth: 220,
      background: 'var(--bg-800)',
      borderRight: '1px solid var(--bg-600)',
      height: '100vh', position: 'sticky', top: 0,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Logo */}
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid var(--bg-600)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--amber)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={16} color="#000" />
          </div>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>StockPro</span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '16px 12px' }}>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-subtle)', padding: '0 8px', marginBottom: 8 }}>
          Menu
        </p>
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <Icon size={16} />{label}
          </NavLink>
        ))}
      </nav>

      {/* Trial / Status banner */}
      <div style={{ padding: '0 12px 12px' }}>
        {isTrial && trialDaysLeft !== null && (
          <div style={{
            background: trialBg, border: `1px solid ${trialBorder}`,
            borderRadius: 10, padding: '10px 12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Clock size={13} color={trialColor} />
              <span style={{ fontSize: 11, fontWeight: 700, color: trialColor, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Trial
              </span>
            </div>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
              {trialDaysLeft === 0 ? 'Expira hoje!' : `${trialDaysLeft} dia${trialDaysLeft !== 1 ? 's' : ''} restante${trialDaysLeft !== 1 ? 's' : ''}`}
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Assine para continuar</p>
            {/* Barra de progresso */}
            <div style={{ height: 3, background: 'var(--bg-500)', borderRadius: 2, marginTop: 8 }}>
              <div style={{ height: '100%', width: `${(trialDaysLeft / 7) * 100}%`, background: trialColor, borderRadius: 2, transition: 'width 0.3s' }} />
            </div>
          </div>
        )}

        {isActive && (
          <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle size={14} color="var(--emerald)" />
            <span style={{ fontSize: 12, color: '#34D399', fontWeight: 500 }}>Assinatura ativa</span>
          </div>
        )}
      </div>

      {/* User / Logout */}
      <div style={{ padding: '12px 12px 16px', borderTop: '1px solid var(--bg-600)' }}>
        <div style={{ padding: '0 8px', marginBottom: 10 }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.email}
          </p>
        </div>
        <button
          onClick={toggle}
          className="sidebar-link"
          style={{ width: '100%', border: 'none', background: 'none', marginBottom: 4 }}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          {theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
        </button>
        <button className="sidebar-link" style={{ width: '100%', border: 'none', background: 'none' }} onClick={handleSignOut}>
          <LogOut size={16} /> Sair
        </button>
      </div>
    </aside>
  )
}
