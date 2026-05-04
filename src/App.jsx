import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import Dashboard from './pages/Dashboard.jsx'
import SensorsPage from './pages/SensorsPage.jsx'
import CropsPage from './pages/CropsPage.jsx'
import AlertsPage from './pages/AlertsPage.jsx'
import IrrigationPage from './pages/IrrigationPage.jsx'

/* ─── Sidebar Navigation ──────────────────────────────────── */
const navItems = [
  { icon: '⬡', label: 'Dashboard',   path: '/',           section: 'PRINCIPAL' },
  { icon: '◈', label: 'Sensores',    path: '/sensors',    section: 'MONITOREO' },
  { icon: '❋', label: 'Cultivos',    path: '/crops',      section: 'MONITOREO' },
  { icon: '◉', label: 'Alertas',     path: '/alerts',     section: 'MONITOREO' },
  { icon: '◌', label: 'Riego',       path: '/irrigation', section: 'CONTROL' },
]

function Sidebar() {
  const navigate  = useNavigate()
  const location  = useLocation()
  let lastSection = ''

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-icon">🌿</div>
        <div>
          <div className="logo-text">AGROPULSE</div>
          <div className="logo-sub">IoT Monitor v2.0</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const showSection = item.section !== lastSection
          lastSection = item.section
          return (
            <React.Fragment key={item.path}>
              {showSection && (
                <div className="nav-section-label">{item.section}</div>
              )}
              <div
                className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                onClick={() => navigate(item.path)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </div>
            </React.Fragment>
          )
        })}
      </nav>

      {/* Versión */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-subtle)' }}>
        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>
          BACKEND_STATUS
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <span className="status-dot" />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Spring Boot 3.2</span>
        </div>
      </div>
    </aside>
  )
}

function Topbar({ pageTitle }) {
  const now = new Date().toLocaleString('es-CO', {
    weekday: 'long', hour: '2-digit', minute: '2-digit'
  })

  return (
    <div className="topbar">
      <div className="topbar-title">
        <strong>{pageTitle}</strong>
        <span style={{ marginLeft: 8, opacity: 0.5 }}>/ Invernadero Principal</span>
      </div>
      <div className="topbar-status">
        <span className="status-dot" />
        <span>Conectado — {now}</span>
      </div>
    </div>
  )
}

/* ─── Page titles lookup ───────────────────────────────────── */
const pageTitles = {
  '/':           'Dashboard',
  '/sensors':    'Sensores',
  '/crops':      'Cultivos',
  '/alerts':     'Alertas',
  '/irrigation': 'Riego',
}

function Layout() {
  const location = useLocation()
  const title    = pageTitles[location.pathname] ?? 'AgroPulse'

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar pageTitle={title} />
        <Routes>
          <Route path="/"           element={<Dashboard />} />
          <Route path="/sensors"    element={<SensorsPage />} />
          <Route path="/crops"      element={<CropsPage />} />
          <Route path="/alerts"     element={<AlertsPage />} />
          <Route path="/irrigation" element={<IrrigationPage />} />
        </Routes>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  )
}
