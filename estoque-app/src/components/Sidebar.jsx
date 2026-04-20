import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Package, Users, ShoppingCart, LogOut,
  Clock, CheckCircle, Sun, Moon,
  Wrench, BedDouble, Wine, Truck, Car, Calendar, Settings, Wallet,
} from 'lucide-react'
import stockTagImg from '../assets/Stock_Tag.png'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'

const MENUS = {
  estoque: [
    { to: '/app/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/app/estoque',   icon: Package,         label: 'Estoque' },
    { to: '/app/clientes',  icon: Users,           label: 'Clientes' },
    { to: '/app/caixa',     icon: Wallet,          label: 'Caixa' },
  ],
  oficina: [
    { to: '/app/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/app/ordens', icon: Wrench, label: 'Ordens de Serviço' },
    { to: '/app/veiculos', icon: Car, label: 'Veículos' },
    { to: '/app/estoque', icon: Package, label: 'Peças / Estoque' },
    { to: '/app/clientes', icon: Users, label: 'Clientes' },
  ],
  hotel: [
    { to: '/app/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/app/quartos', icon: BedDouble, label: 'Quartos' },
    { to: '/app/reservas', icon: Calendar, label: 'Reservas' },
    { to: '/app/clientes', icon: Users, label: 'Clientes' },
  ],
  adega: [
    { to: '/app/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/app/vinhos', icon: Wine, label: 'Vinhos / Lotes', soon: true },
    { to: '/app/fornecedores', icon: Truck, label: 'Fornecedores', soon: true },
    { to: '/app/clientes', icon: Users, label: 'Clientes' },
    { to: '/app/caixa', icon: Wallet, label: 'Caixa' },
  ],
}

const LABELS = {
  estoque: 'Estoque Geral',
  oficina: 'Oficina Mecânica',
  hotel: 'Hotel / Pousada',
  adega: 'Adega / Vinhos',
}

export default function Sidebar({ isOpen, onClose }) {
  const { signOut, user, trialDaysLeft, isTrial, isActive, businessType, businessName } = useAuth()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const links = MENUS[businessType] ?? MENUS.estoque

  const trialColor = trialDaysLeft <= 2 ? 'var(--red)' : trialDaysLeft <= 4 ? '#F97316' : 'var(--warning)'
  const trialBg = trialDaysLeft <= 2 ? 'rgba(239,68,68,0.1)' : trialDaysLeft <= 4 ? 'rgba(249,115,22,0.1)' : 'rgba(245,158,11,0.1)'
  const trialBorder = trialDaysLeft <= 2 ? 'rgba(239,68,68,0.25)' : trialDaysLeft <= 4 ? 'rgba(249,115,22,0.25)' : 'rgba(245,158,11,0.25)'

  return (
    <aside className={`sidebar-root${isOpen ? ' open' : ''}`} style={{
      width: 220, minWidth: 220,
      background: 'var(--bg-800)',
      borderRight: '1px solid var(--bg-600)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Logo */}
      <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid var(--bg-600)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <img src={stockTagImg} alt="StockTag" style={{ width: 32, height: 32, objectFit: 'contain', borderRadius: 8 }} />
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>StockTag</span>
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-subtle)', paddingLeft: 2 }}>
          {businessName || LABELS[businessType] || 'Estoque Geral'}
        </span>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '16px 12px' }}>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-subtle)', padding: '0 8px', marginBottom: 8 }}>
          Menu
        </p>
        {links.map(({ to, icon: Icon, label, soon }) =>
          soon ? (
            <div
              key={to}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 10px', borderRadius: 8, marginBottom: 2,
                color: 'var(--text-subtle)', fontSize: 14, cursor: 'default',
                opacity: 0.5,
              }}
            >
              <Icon size={16} />
              <span style={{ flex: 1 }}>{label}</span>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', background: 'var(--bg-600)', color: 'var(--text-subtle)', borderRadius: 4, padding: '2px 5px' }}>
                Em breve
              </span>
            </div>
          ) : (
            <NavLink key={to} to={to} onClick={onClose} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <Icon size={16} />{label}
            </NavLink>
          )
        )}
      </nav>

      {/* Configurações — fixo no fundo da nav */}
      <div style={{ padding: '0 12px 8px', borderTop: '1px solid var(--bg-600)', paddingTop: 8 }}>
        <NavLink to="/app/configuracoes" onClick={onClose} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <Settings size={16} /> Configurações
        </NavLink>
      </div>

      {/* Trial / Status banner */}
      <div style={{ padding: '0 12px 12px' }}>
        {isTrial && trialDaysLeft !== null && (
          <div style={{ background: trialBg, border: `1px solid ${trialBorder}`, borderRadius: 10, padding: '10px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Clock size={13} color={trialColor} />
              <span style={{ fontSize: 11, fontWeight: 700, color: trialColor, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Trial</span>
            </div>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
              {trialDaysLeft === 0 ? 'Expira hoje!' : `${trialDaysLeft} dia${trialDaysLeft !== 1 ? 's' : ''} restante${trialDaysLeft !== 1 ? 's' : ''}`}
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Assine para continuar</p>
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
        <button onClick={toggle} className="sidebar-link" style={{ width: '100%', border: 'none', background: 'none', marginBottom: 4 }}>
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
