import { useState, useRef, useEffect } from 'react'
import {
  Home, Activity, Leaf, Bell, Bot, Settings, LogOut,
  Cpu, Zap, BarChart3, ChevronRight, Mail,
  Sprout, X, Menu, Key, Wifi, MapPin
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import anime from 'animejs'
import { AuthProvider, useAuth } from './context/AuthContext'
import type { AppUser } from './types'
import ThreeBackground from './components/ThreeBackground'
import { initLenis, destroyLenis } from './lib/lenis'

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
import MapPage        from './pages/MapPage'
import SettingsPage   from './pages/SettingsPage'
import NoAccessPage   from './pages/NoAccessPage'

function LogoMarkSvg() {
  return (
    <svg width="28" height="28" viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <defs><clipPath id="lmClip"><circle cx="28" cy="28" r="26"/></clipPath></defs>
      <circle cx="28" cy="28" r="27" fill="#020d05" stroke="rgba(74,222,128,0.4)" strokeWidth="1.2"/>
      <g clipPath="url(#lmClip)">
        <rect x="2" y="2" width="52" height="52" fill="#071209"/>
        <path d="M 8 31 A 20 20 0 0 1 48 31 Z" fill="#f59e0b"/>
        <ellipse cx="28" cy="31" rx="16" ry="4" fill="rgba(251,191,36,0.22)"/>
        <path d="M 2 31 Q 15 26 28 30 Q 41 34 54 31 L 54 54 L 2 54 Z" fill="#14532d"/>
        <path d="M 2 36 Q 15 32 28 35 Q 41 38 54 36 L 54 54 L 2 54 Z" fill="#166534"/>
        <path d="M 2 41 Q 15 38 28 40 Q 41 42 54 41 L 54 54 L 2 54 Z" fill="#15803d"/>
        <path d="M 11 27 Q 5 20 9 13 Q 16 16 11 27 Z" fill="#22c55e" opacity="0.8"/>
        <path d="M 45 27 Q 51 20 47 13 Q 40 16 45 27 Z" fill="#22c55e" opacity="0.8"/>
        <path d="M 4 31 L 13 31 L 16 23 L 20 39 L 24 31 L 28 31 L 31 25 L 34 37 L 37 31 L 52 31"
              stroke="#f87171" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      </g>
    </svg>
  )
}

type PageId =
  | 'dashboard' | 'analytics' | 'sensors' | 'actuators' | 'rules' | 'reports'
  | 'greenhouses' | 'crops' | 'ai' | 'ml' | 'alerts' | 'logs' | 'users'
  | 'admin' | 'support' | 'settings' | 'map'

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
      { id: 'map',         label: 'Mapa',           icon: MapPin    },
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
      { id: 'map',         label: 'Mapa',           icon: MapPin    },
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
         style={{ background: '#020d05' }}>
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
  const { user, authLoading, allowedGreenhouseIds, logout, refreshAccess } = useAuth()
  const [page, setPage]               = useState<PageId>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [accessTimedOut, setAccessTimedOut] = useState(false)
  const navRef  = useRef<HTMLElement>(null)
  const mainRef = useRef<HTMLElement>(null)

  // Stagger nav items when mobile sidebar opens (not the container — CSS handles the slide)
  useEffect(() => {
    if (!user || !sidebarOpen || !navRef.current) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    const btns = navRef.current.querySelectorAll('button')
    if (btns.length > 0) {
      anime({
        targets: Array.from(btns),
        opacity: [0, 1], translateX: [-6, 0],
        delay: anime.stagger(12),
        duration: 160, easing: 'easeOutCubic',
      })
    }
  }, [sidebarOpen, user])

  // Wait up to 8s for allowedGreenhouseIds to populate before showing NoAccessPage.
  // Covers Render cold-start (~6s) so legitimate users don't see a false NoAccessPage.
  useEffect(() => {
    if (authLoading || !user) return
    const isAdm = user.role === 'ADMIN' || user.role === 'admin'
    if (isAdm || allowedGreenhouseIds === null || allowedGreenhouseIds.length > 0) {
      setAccessTimedOut(false)
      return
    }
    setAccessTimedOut(false)
    const timer = setTimeout(() => setAccessTimedOut(true), 8000)
    return () => clearTimeout(timer)
  }, [authLoading, user?.id, allowedGreenhouseIds?.length])

  // Entrance animation on login
  useEffect(() => {
    if (!user || !mainRef.current) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    anime({ targets: mainRef.current, opacity: [0, 1], translateY: [12, 0], duration: 420, easing: 'easeOutCubic' })
  }, [!!user]) // eslint-disable-line react-hooks/exhaustive-deps

  if (authLoading) return <AuthLoadingScreen />
  if (!user) return <LoginPage />

  const isAdmin = user.role === 'ADMIN' || user.role === 'admin'
  if (!isAdmin && allowedGreenhouseIds !== null && allowedGreenhouseIds.length === 0) {
    if (!accessTimedOut) {
      return (
        <div className="min-h-screen flex items-center justify-center"
             style={{ background: '#020d05' }}>
          <div className="flex flex-col items-center gap-4">
            <div className="w-6 h-6 border-2 border-green-500/30 border-t-green-400 rounded-full animate-spin" />
            <p className="text-sm text-white/50">Verificando acceso…</p>
          </div>
        </div>
      )
    }
    return (
      <div>
        <NoAccessPage />
        <div className="fixed bottom-6 inset-x-0 flex justify-center">
          <button
            onClick={refreshAccess}
            className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-xl shadow-lg transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  const groups   = isAdmin ? ADMIN_GROUPS : USER_GROUPS
  const allItems = ALL_ITEMS(groups)

  const navigate = (id: PageId) => {
    setPage(id)
    setSidebarOpen(false)
    if (mainRef.current) {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (!reduced) {
        anime({ targets: mainRef.current, opacity: [0.6, 1], translateY: [8, 0], duration: 280, easing: 'easeOutCubic' })
      }
    }
  }

  const currentItem = allItems.find(n => n.id === page)
  const initials    = (user as AppUser).full_name || user.username || '?'

  return (
    <div className="min-h-screen relative">

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
              <LogoMarkSvg />
              <div>
                <span className="text-base font-bold font-heading tracking-tight" style={{ color: '#e2ffe9' }}>
                  Agro<span style={{ color: '#f97316' }}>Pulse</span>
                </span>
                <span className="ml-2 text-[9px] font-medium px-1.5 py-0.5 rounded-md"
                      style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)' }}>
                  v10
                </span>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2.5 hover:bg-white/10 rounded-xl transition-colors lg:hidden
                         text-white/60 hover:text-white cursor-pointer touch-manipulation"
              aria-label="Cerrar menú"
            >
              <X size={18} />
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
                <p className="text-[10px] text-white/40">{isAdmin ? 'Admin' : 'Operario'}</p>
              </div>
            </div>
            <Wifi size={12} className="text-green-400/60 shrink-0" />
          </div>
        </div>

        {/* Nav groups */}
        <nav ref={navRef} className="flex-1 overflow-y-auto py-3 px-2 space-y-5">
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
      <header className="sticky top-0 z-20 lg:ml-64 backdrop-blur-md"
              style={{ background: 'rgba(2,13,5,0.92)', borderBottom: '1px solid rgba(74,222,128,0.08)' }}>
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
              <h1 className="text-sm font-bold text-white font-heading">
                {currentItem?.label ?? 'AgroPulse'}
              </h1>
              <p className="text-[11px] text-white/40 hidden sm:block capitalize">
                {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 bg-green-900/30 border border-green-500/20 rounded-xl px-3 py-1.5">
              <div className="live-dot" />
              <span className="text-xs font-medium text-green-400">En línea</span>
            </div>

            <div className="text-right hidden sm:block">
              <p className="text-xs text-white/40">{isAdmin ? 'Administrador' : 'Operario'}</p>
              <p className="text-xs font-semibold text-white/80">{(user as AppUser).full_name || user.username}</p>
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
          {page === 'map'         && <MapPage onNavigate={navigate} />}
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
  useEffect(() => {
    initLenis()
    return () => destroyLenis()
  }, [])

  return (
    <AuthProvider>
      <ThreeBackground />
      <AppInner />
    </AuthProvider>
  )
}
