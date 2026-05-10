import { useState, useRef, useEffect } from 'react'
import {
  Home, Activity, Leaf, Bell, Bot, Settings, LogOut,
  Cpu, Zap, BarChart3, ChevronRight, Mail,
  Sprout, X, Menu, Key, Wifi
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import anime from 'animejs'
import { AuthProvider, useAuth } from './context/AuthContext'
import type { AppUser } from './types'

// ── Pages ──────────────────────────────────────────────────────────────────────
import LoginPage      from './pages/LoginPage'
import Dashboard      from './pages/Dashboard'
import SensorsPage    from './pages/SensorsPage'
import ActuatorsPage  from './pages/ActuatorsPage'
import CropsPage      from './pages/CropsPage'
import AlertsPage     from './pages/AlertsPage'
import AnalyticsPage  from './pages/AnalyticsPage'
import AIPage         from './pages/AIPage'
import MLPage         from './pages/MLPage'
import SupportPage    from './pages/SupportPage'
import LogsPage       from './pages/LogsPage'
import UsersPage      from './pages/UsersPage'
import AdminPanel     from './pages/AdminPanel'
import ReportsPage    from './pages/ReportsPage'
import RulesPage      from './pages/RulesPage'
import GreenhousePage from './pages/GreenhousePage'
import SettingsPage   from './pages/SettingsPage'

type PageId =
  | 'dashboard' | 'analytics' | 'sensors' | 'actuators' | 'rules' | 'reports'
  | 'greenhouses' | 'crops' | 'ai' | 'ml' | 'alerts' | 'logs' | 'users'
  | 'admin' | 'support' | 'settings'

interface NavGroup {
  label: string
  items: NavItem[]
}

interface NavItem {
  id: PageId
  label: string
  icon: LucideIcon
}

const ADMIN_GROUPS: NavGroup[] = [
  {
    label: 'Principal',
    items: [
      { id: 'dashboard',   label: 'Inicio',         icon: Home      },
      { id: 'analytics',   label: 'Analíticas',     icon: BarChart3 },
      { id: 'alerts',      label: 'Alertas',        icon: Bell      },
    ],
  },
  {
    label: 'Invernadero',
    items: [
      { id: 'greenhouses', label: 'Invernaderos',   icon: Sprout    },
      { id: 'sensors',     label: 'Sensores',       icon: Activity  },
      { id: 'actuators',   label: 'Actuadores',     icon: Zap       },
      { id: 'crops',       label: 'Cultivos',       icon: Leaf      },
      { id: 'rules',       label: 'Automatización', icon: Cpu       },
    ],
  },
  {
    label: 'Inteligencia',
    items: [
      { id: 'ai',          label: 'IA Agronómica',  icon: Bot       },
      { id: 'ml',          label: 'Machine Learning',icon: Cpu      },
      { id: 'reports',     label: 'Reportes',       icon: Mail      },
    ],
  },
  {
    label: 'Administración',
    items: [
      { id: 'logs',        label: 'Logs',           icon: Activity  },
      { id: 'users',       label: 'Usuarios',       icon: Key       },
      { id: 'admin',       label: 'Roles',          icon: Settings  },
      { id: 'support',     label: 'Soporte',        icon: Mail      },
      { id: 'settings',    label: 'Configuración',  icon: Settings  },
    ],
  },
]

const USER_GROUPS: NavGroup[] = [
  {
    label: 'Principal',
    items: [
      { id: 'dashboard',   label: 'Inicio',         icon: Home      },
      { id: 'analytics',   label: 'Analíticas',     icon: BarChart3 },
      { id: 'alerts',      label: 'Alertas',        icon: Bell      },
    ],
  },
  {
    label: 'Invernadero',
    items: [
      { id: 'sensors',     label: 'Sensores',       icon: Activity  },
      { id: 'actuators',   label: 'Actuadores',     icon: Zap       },
      { id: 'crops',       label: 'Cultivos',       icon: Leaf      },
      { id: 'rules',       label: 'Automatización', icon: Cpu       },
    ],
  },
  {
    label: 'Herramientas',
    items: [
      { id: 'ai',          label: 'IA Agronómica',  icon: Bot       },
      { id: 'ml',          label: 'Machine Learning',icon: Cpu      },
      { id: 'reports',     label: 'Reportes',       icon: Mail      },
      { id: 'support',     label: 'Soporte',        icon: Mail      },
      { id: 'settings',    label: 'Configuración',  icon: Settings  },
    ],
  },
]

const ALL_ITEMS = (groups: NavGroup[]): NavItem[] =>
  groups.flatMap(g => g.items)

function AuthLoadingScreen() {
  const wrapRef  = useRef<HTMLDivElement>(null)
  const iconRef  = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return

    anime({ targets: wrapRef.current, opacity: [0, 1], scale: [0.92, 1], duration: 500, easing: 'easeOutCubic' })

    anime({
      targets:   iconRef.current,
      scale:     [1, 1.08, 1],
      duration:  1800,
      direction: 'alternate',
      loop:      true,
      easing:    'easeInOutSine',
    })
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center"
         style={{ background: 'linear-gradient(135deg, #0A150D 0%, #162A1C 60%, #0D1F12 100%)' }}>
      <div ref={wrapRef} className="flex flex-col items-center gap-5">
        <div ref={iconRef}
             className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl
                        flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,0.4)]">
          <Sprout size={24} className="text-white" />
        </div>
        <div className="w-5 h-5 border-2 border-green-500/30 border-t-green-400 rounded-full animate-spin" />
        <p className="text-sm text-white/40 font-medium tracking-wide">Verificando sesión…</p>
      </div>
    </div>
  )
}

function AppInner() {
  const { user, authLoading, logout } = useAuth()
  const [page, setPage]               = useState<PageId>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const sidebarRef   = useRef<HTMLElement>(null)
  const mainRef      = useRef<HTMLElement>(null)

  if (authLoading) return <AuthLoadingScreen />

  if (!user) return <LoginPage />

  const isAdmin  = user.role === 'ADMIN' || user.role === 'admin'
  const groups   = isAdmin ? ADMIN_GROUPS : USER_GROUPS
  const allItems = ALL_ITEMS(groups)

  const navigate = (id: PageId) => {
    setPage(id)
    setSidebarOpen(false)
    // Animate main content out/in
    if (mainRef.current) {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (!reduced) {
        anime({ targets: mainRef.current, opacity: [0.6, 1], translateY: [8, 0], duration: 280, easing: 'easeOutCubic' })
      }
    }
  }

  // Animate sidebar on open (mobile)
  useEffect(() => {
    if (sidebarOpen && sidebarRef.current) {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (!reduced) {
        anime({ targets: sidebarRef.current, translateX: ['-100%', '0%'], opacity: [0.8, 1], duration: 280, easing: 'easeOutCubic' })
      }
    }
  }, [sidebarOpen])

  const currentItem = allItems.find(n => n.id === page)
  const initials    = (user as AppUser).full_name || user.username || '?'

  return (
    <div className="min-h-screen bg-gray-50/80 relative" style={{ backgroundImage: 'var(--tw-gradient-stops)' }}>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside
        ref={sidebarRef}
        className={`fixed top-0 left-0 h-full w-64 sidebar-bg z-40 flex flex-col
          border-r border-sidebar-border shadow-glass-dark
          transform transition-transform duration-300 ease-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
        aria-label="Navegación principal"
      >
        {/* Logo */}
        <div className="px-4 pt-5 pb-4 border-b border-sidebar-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-glow-sm">
                <Sprout size={16} className="text-white" />
              </div>
              <div>
                <span className="text-base font-bold text-white font-heading tracking-tight">AgroPulse</span>
                <span className="ml-2 text-[9px] font-medium bg-green-500/20 text-green-300 px-1.5 py-0.5 rounded-md">v10</span>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 hover:bg-white/8 rounded-lg transition-colors lg:hidden text-white/60 hover:text-white cursor-pointer"
              aria-label="Cerrar menú"
            >
              <X size={16} />
            </button>
          </div>

          {/* User mini-card */}
          <div className="flex items-center gap-3 bg-white/5 border border-sidebar-border rounded-2xl px-3 py-2.5 hover:bg-white/8 transition-colors">
            {user.avatar
              ? <img src={user.avatar} alt="Avatar" className="w-8 h-8 rounded-xl object-cover ring-2 ring-green-500/30" />
              : <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center text-xs font-bold text-white shadow-glow-sm">
                  {initials[0].toUpperCase()}
                </div>
            }
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white/90 truncate">{(user as AppUser).full_name || user.username}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <div className="live-dot scale-75" />
                <p className="text-[10px] text-white/40">{isAdmin ? 'Admin' : 'Usuario'}</p>
              </div>
            </div>
            <Wifi size={12} className="text-green-400/60 shrink-0" />
          </div>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto scrollbar-none py-3 px-2 space-y-5">
          {groups.map(group => (
            <div key={group.label}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/25 px-3 mb-1">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map(item => {
                  const Icon   = item.icon
                  const active = page === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => navigate(item.id)}
                      className={active ? 'nav-item-active w-full text-left' : 'nav-item w-full text-left'}
                      aria-current={active ? 'page' : undefined}
                    >
                      <Icon size={16} className={active ? 'text-green-400' : 'text-white/40'} />
                      <span className="flex-1">{item.label}</span>
                      {active && <ChevronRight size={12} className="text-green-400/70" />}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-sidebar-border">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm
                       font-medium text-red-400/80 hover:text-red-300 hover:bg-red-500/10
                       transition-all duration-200 cursor-pointer"
            aria-label="Cerrar sesión"
          >
            <LogOut size={16} />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 lg:ml-64 bg-white/80 backdrop-blur-md
                         border-b border-gray-200/80 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between h-14 px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="btn-icon lg:hidden"
              aria-label="Abrir menú"
            >
              <Menu size={18} />
            </button>
            <div>
              <h1 className="text-sm font-bold text-gray-900 font-heading">
                {currentItem?.label ?? 'AgroPulse'}
              </h1>
              <p className="text-[11px] text-gray-400 hidden sm:block capitalize">
                {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 bg-green-50 border border-green-100 rounded-xl px-3 py-1.5">
              <div className="live-dot" />
              <span className="text-xs font-medium text-green-700">En línea</span>
            </div>

            <div className="text-right hidden sm:block">
              <p className="text-xs text-gray-400">{isAdmin ? 'Administrador' : 'Usuario'}</p>
              <p className="text-xs font-semibold text-gray-800">{(user as AppUser).full_name || user.username}</p>
            </div>

            {user.avatar
              ? <img src={user.avatar} alt="Avatar" className="w-8 h-8 rounded-xl object-cover ring-2 ring-green-200 cursor-pointer" />
              : <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center cursor-pointer shadow-glow-sm">
                  <span className="text-white text-xs font-bold">{initials[0].toUpperCase()}</span>
                </div>
            }
          </div>
        </div>
      </header>

      {/* ── Main ────────────────────────────────────────────────── */}
      <main
        ref={mainRef}
        className="lg:ml-64 px-4 py-5 pb-10 lg:px-6 xl:px-8 min-h-[calc(100vh-56px)]"
      >
        <div className="max-w-[1600px] mx-auto">
          {page === 'dashboard'   && <Dashboard />}
          {page === 'analytics'   && <AnalyticsPage />}
          {page === 'sensors'     && <SensorsPage />}
          {page === 'actuators'   && <ActuatorsPage />}
          {page === 'rules'       && <RulesPage />}
          {page === 'reports'     && <ReportsPage />}
          {page === 'greenhouses' && <GreenhousePage />}
          {page === 'crops'       && <CropsPage />}
          {page === 'ai'          && <AIPage />}
          {page === 'ml'          && <MLPage />}
          {page === 'alerts'      && <AlertsPage />}
          {page === 'logs'        && <LogsPage />}
          {page === 'users'       && <UsersPage />}
          {page === 'admin'       && <AdminPanel user={user} />}
          {page === 'support'     && <SupportPage />}
          {page === 'settings'    && <SettingsPage />}
        </div>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  )
}
