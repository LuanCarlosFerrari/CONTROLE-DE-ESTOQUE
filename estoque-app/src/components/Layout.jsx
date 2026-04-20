import { Outlet } from 'react-router-dom'
import { useState } from 'react'
import Sidebar from './Sidebar'
import TrialBanner from './TrialBanner'
import { Menu } from 'lucide-react'
import stockTagImg from '../assets/Stock_Tag.png'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-900)' }}>
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header className="mobile-header">
          <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu">
            <Menu size={22} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src={stockTagImg} alt="StockTag" style={{ width: 80, height: 80, objectFit: 'contain' }} />
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>StockTag</span>
          </div>
          <div style={{ width: 40 }} />
        </header>

        <TrialBanner />
        <main style={{ flex: 1, overflow: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
