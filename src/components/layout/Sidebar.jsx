import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Package, Users, LogOut,
  Wrench, BedDouble, Truck, Car, Calendar, CalendarDays, Settings, Wallet, LayoutGrid,
  Sun, Moon,
} from 'lucide-react'
import stockTagImg from '../../assets/App-Logo.png'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'

const MENUS = {
  estoque: [
    { section: 'Operações' },
    { to: '/app/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/app/caixa',        icon: Wallet,          label: 'Caixa' },
    { section: 'Gestão' },
    { to: '/app/estoque',      icon: Package,         label: 'Estoque' },
    { to: '/app/clientes',     icon: Users,           label: 'Clientes' },
    { to: '/app/fornecedores', icon: Truck,           label: 'Fornecedores' },
    { section: 'Ferramentas' },
    { to: '/app/calendario',   icon: CalendarDays,    label: 'Calendário' },
  ],
  oficina: [
    { section: 'Operações' },
    { to: '/app/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/app/ordens',       icon: Wrench,          label: 'Ordens de Serviço' },
    { to: '/app/caixa',        icon: Wallet,          label: 'Caixa' },
    { section: 'Gestão' },
    { to: '/app/veiculos',     icon: Car,             label: 'Veículos' },
    { to: '/app/clientes',     icon: Users,           label: 'Clientes' },
    { to: '/app/estoque',      icon: Package,         label: 'Peças / Estoque' },
    { to: '/app/fornecedores', icon: Truck,           label: 'Fornecedores' },
    { section: 'Ferramentas' },
    { to: '/app/calendario',   icon: CalendarDays,    label: 'Calendário' },
  ],
  hotel: [
    { section: 'Operações' },
    { to: '/app/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/app/reservas',     icon: Calendar,        label: 'Reservas' },
    { to: '/app/caixa',        icon: Wallet,          label: 'Caixa' },
    { section: 'Gestão' },
    { to: '/app/quartos',      icon: BedDouble,       label: 'Quartos' },
    { to: '/app/clientes',     icon: Users,           label: 'Clientes' },
    { to: '/app/fornecedores', icon: Truck,           label: 'Fornecedores' },
    { section: 'Ferramentas' },
    { to: '/app/calendario',   icon: CalendarDays,    label: 'Calendário' },
  ],
  bar: [
    { section: 'Operações' },
    { to: '/app/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/app/mesas',        icon: LayoutGrid,      label: 'Mesas' },
    { to: '/app/caixa',        icon: Wallet,          label: 'Caixa' },
    { section: 'Gestão' },
    { to: '/app/estoque',      icon: Package,         label: 'Cardápio / Estoque' },
    { to: '/app/clientes',     icon: Users,           label: 'Clientes' },
    { to: '/app/fornecedores', icon: Truck,           label: 'Fornecedores' },
    { section: 'Ferramentas' },
    { to: '/app/calendario',   icon: CalendarDays,    label: 'Calendário' },
  ],
}

const LABELS = {
  estoque: 'Estoque Geral',
  oficina: 'Oficina Mecânica',
  hotel: 'Hotel / Pousada',
  bar: 'Bar / Restaurante',
}

export default function Sidebar({ isOpen, onClose }) {
  const { signOut, user, businessType, businessName } = useAuth()
  const { theme, toggle } = useTheme()

  const handleSignOut = () => signOut()

  const links = MENUS[businessType] ?? MENUS.estoque

  return (
    <aside className={`sidebar-root${isOpen ? ' open' : ''}`} style={{
      width: 220, minWidth: 220,
      background: 'var(--bg-800)',
      borderRight: '1px solid var(--bg-600)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Logo */}
      <div style={{ padding: '0 20px 8px', borderBottom: '1px solid var(--bg-600)', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <img src={stockTagImg} alt="StockTag" style={{ width: 160, height: 160, objectFit: 'contain', marginTop: -24, marginBottom: -20 }} />
        <button
          onClick={toggle}
          title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '5px 12px', borderRadius: 20, cursor: 'pointer',
            background: 'var(--bg-700)', border: '1px solid var(--bg-500)',
            color: 'var(--text-muted)', fontSize: 11, fontWeight: 500,
            transition: 'all 0.18s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--amber)'; e.currentTarget.style.color = 'var(--amber)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--bg-500)'; e.currentTarget.style.color = 'var(--text-muted)' }}
        >
          {theme === 'dark' ? <Sun size={12} /> : <Moon size={12} />}
          {theme === 'dark' ? 'Claro' : 'Escuro'}
        </button>
        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--amber)' }}>
          {businessName || LABELS[businessType] || 'Estoque Geral'}
        </span>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '10px 12px', overflowY: 'auto', minHeight: 0 }}>
        {links.map((item, idx) => {
          if (item.section) return (
            <p key={idx} style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
              color: 'var(--text-subtle)', padding: '0 8px', marginBottom: 4,
              marginTop: idx === 0 ? 2 : 14,
            }}>
              {item.section}
            </p>
          )
          const { to, icon: Icon, label, soon } = item
          if (soon) return (
            <div key={to} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 10px', borderRadius: 8, marginBottom: 2,
              color: 'var(--text-subtle)', fontSize: 14, cursor: 'default', opacity: 0.5,
            }}>
              <Icon size={16} />
              <span style={{ flex: 1 }}>{label}</span>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', background: 'var(--bg-600)', color: 'var(--text-subtle)', borderRadius: 4, padding: '2px 5px' }}>
                Em breve
              </span>
            </div>
          )
          return (
            <NavLink key={to} to={to} onClick={onClose} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <Icon size={16} />{label}
            </NavLink>
          )
        })}
      </nav>

      {/* Configurações — fixo no fundo da nav */}
      <div style={{ padding: '8px 12px', borderTop: '1px solid var(--bg-600)', flexShrink: 0 }}>
        <NavLink to="/app/configuracoes" onClick={onClose} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <Settings size={16} /> Configurações
        </NavLink>
      </div>

      {/* User / Logout */}
      <div style={{ padding: '12px 12px 16px', borderTop: '1px solid var(--bg-600)', flexShrink: 0 }}>
        <div style={{ padding: '0 8px', marginBottom: 10 }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.email}
          </p>
        </div>
        <button className="sidebar-link" style={{ width: '100%', border: 'none', background: 'none' }} onClick={handleSignOut}>
          <LogOut size={16} /> Sair
        </button>
      </div>
    </aside>
  )
}
