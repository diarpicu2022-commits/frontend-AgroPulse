import { useState } from 'react'
import {
  Home, Activity, Leaf, Bell, Bot, Settings, LogOut,
  Cpu, Zap, BarChart3, ChevronRight, Mail,
  Sprout, X, Menu, Key
} from 'lucide-react'
import { AuthProvider, useAuth } from './context/AuthContext'
import type { LucideIcon } from 'lucide-react'
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

interface NavItem {
  id: PageId
  label: string
  icon: LucideIcon
}

const ADMIN_NAV: NavItem[] = [
  { id: 'dashboard',   label: 'Inicio',        icon: Home      },
  { id: 'analytics',   label: 'Analíticas',    icon: BarChart3 },
  { id: 'sensors',     label: 'Sensores',      icon: Activity  },
  { id: 'actuators',   label: 'Actuadores',    icon: Zap       },
  { id: 'rules',       label: 'Automatización',icon: Cpu       },
  { id: 'reports',     label: 'Reportes',      icon: Mail      },
  { id: 'greenhouses', label: 'Invernadero',   icon: Sprout    },
  { id: 'crops',       label: 'Cultivos',      icon: Leaf      },
  { id: 'ai',          label: 'IA',            icon: Bot       },
  { id: 'ml',          label: 'ML',            icon: Cpu       },
  { id: 'alerts',      label: 'Alertas',       icon: Bell      },
  { id: 'logs',        label: 'Logs',          icon: Activity  },
  { id: 'users',       label: 'Usuarios',      icon: Key       },
  { id: 'admin',       label: 'Gestión Roles', icon: Settings  },
  { id: 'support',     label: 'Soporte',       icon: Mail      },
  { id: 'settings',    label: 'Config',        icon: Settings  },
]

const USER_NAV: NavItem[] = [
  { id: 'dashboard',   label: 'Inicio',        icon: Home      },
  { id: 'analytics',   label: 'Analíticas',    icon: BarChart3 },
  { id: 'sensors',     label: 'Sensores',      icon: Activity  },
  { id: 'actuators',   label: 'Actuadores',    icon: Zap       },
  { id: 'rules',       label: 'Automatización',icon: Cpu       },
  { id: 'reports',     label: 'Reportes',      icon: Mail      },
  { id: 'crops',       label: 'Cultivos',      icon: Leaf      },
  { id: 'ai',          label: 'IA',            icon: Bot       },
  { id: 'ml',          label: 'ML',            icon: Cpu       },
  { id: 'alerts',      label: 'Alertas',       icon: Bell      },
  { id: 'support',     label: 'Soporte',       icon: Mail      },
  { id: 'settings',    label: 'Config',        icon: Settings  },
]

function AppInner() {
  const { user, logout } = useAuth()
  const [page, setPage]               = useState<PageId>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (!user) return <LoginPage />

  const isAdmin = user.role === 'ADMIN' || user.role === 'admin'
  const navItems = isAdmin ? ADMIN_NAV : USER_NAV

  const navigate = (id: PageId) => { setPage(id); setSidebarOpen(false) }

  const initials = (user as AppUser).full_name || user.username || '?'

  return (
    <div className="min-h-screen bg-gray-50 relative">

      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-gradient-to-b from-green-900 via-green-700 to-emerald-700 text-white shadow-2xl z-40 transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        {/* Logo & user mini-card */}
        <div className="bg-gradient-to-b from-green-950 to-green-900 px-4 py-5 border-b border-green-600/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">🌿</span>
              <div>
                <span className="text-base font-bold tracking-wide font-heading">AgroPulse</span>
                <span className="text-[10px] opacity-50 bg-white/10 px-1.5 py-0.5 rounded ml-1.5">v10</span>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 hover:bg-green-700 rounded-lg transition-colors lg:hidden"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex items-center gap-3 bg-white/10 rounded-xl px-3 py-2.5">
            {user.avatar
              ? <img src={user.avatar} alt="avatar" className="w-9 h-9 rounded-full object-cover ring-2 ring-white/30" />
              : <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold">
                  {initials[0].toUpperCase()}
                </div>
            }
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate">{(user as AppUser).full_name || user.username}</p>
              <p className="text-[10px] opacity-60 capitalize">{isAdmin ? '⚙️ Admin' : '👤 Usuario'}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="py-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 145px)' }}>
          {navItems.map(item => {
            const Icon   = item.icon
            const active = page === item.id
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                className={`w-full flex items-center gap-3 px-5 py-2.5 text-sm transition-all duration-200 ${
                  active
                    ? 'bg-green-500/80 text-white font-semibold border-r-4 border-yellow-300 shadow-md'
                    : 'text-green-100 hover:bg-green-600/50 hover:text-white'
                }`}
              >
                <Icon size={18} className={active ? 'text-yellow-300' : ''} />
                <span className="flex-1 text-left">{item.label}</span>
                {active && <ChevronRight size={14} className="text-yellow-300" />}
              </button>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-green-600/50 p-2">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-5 py-2.5 text-sm text-red-200 hover:bg-red-600/60 hover:text-white transition-all duration-200 rounded-lg"
          >
            <LogOut size={18} />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-20 shadow-sm lg:ml-64">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors lg:hidden"
          >
            <Menu size={20} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-base font-bold text-gray-800">
              {navItems.find(n => n.id === page)?.label ?? 'AgroPulse'}
            </h1>
            <p className="text-xs text-gray-400 hidden sm:block">
              {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-gray-500">{isAdmin ? 'Administrador' : 'Usuario'}</p>
            <p className="text-sm font-semibold text-gray-800">{(user as AppUser).full_name || user.username}</p>
          </div>
          {user.avatar
            ? <img src={user.avatar} alt="avatar" className="w-9 h-9 rounded-full object-cover ring-2 ring-green-400 shadow-sm" />
            : <div className="w-9 h-9 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-sm">
                <span className="text-white text-sm font-bold">{initials[0].toUpperCase()}</span>
              </div>
          }
        </div>
      </header>

      {/* Main */}
      <main className="px-4 py-4 pb-8 lg:px-8 lg:ml-64 min-h-[calc(100vh-57px)]">
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
