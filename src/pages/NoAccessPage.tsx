import { useRef, useEffect } from 'react'
import { Sprout, Lock, Mail, BarChart3, Leaf, Cpu, RefreshCw, LogOut } from 'lucide-react'
import anime from 'animejs'
import { useAuth } from '../context/AuthContext'

const STEPS = [
  { icon: Mail,      n: '01', title: 'Solicita Acceso',   desc: 'Pide al administrador que te asigne uno o más invernaderos en "Gestión de Roles".' },
  { icon: Leaf,      n: '02', title: 'Admin Configura',   desc: 'El admin activa tus invernaderos. Usa el mismo navegador o dispositivo.' },
  { icon: BarChart3, n: '03', title: 'Verifica y Accede', desc: 'Presiona el botón de abajo para revisar tu acceso y entrar al sistema.' },
]

const FEATURES = [
  { icon: BarChart3, label: 'Sensores en tiempo real' },
  { icon: Cpu,       label: 'Control de actuadores'   },
  { icon: Leaf,      label: 'Gestión de cultivos'     },
]

export default function NoAccessPage() {
  const { user, logout, refreshAccess } = useAuth()
  const logoRef  = useRef<HTMLDivElement>(null)
  const msgRef   = useRef<HTMLDivElement>(null)
  const stepsRef = useRef<HTMLDivElement>(null)
  const featRef  = useRef<HTMLDivElement>(null)
  const actRef   = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return

    anime({ targets: logoRef.current,  opacity: [0, 1], scale: [0.8, 1],    duration: 600, easing: 'easeOutCubic' })
    anime({ targets: msgRef.current,   opacity: [0, 1], translateY: [16, 0], duration: 500, delay: 120, easing: 'easeOutCubic' })
    anime({
      targets:  stepsRef.current ? Array.from(stepsRef.current.children) : [],
      opacity:  [0, 1], translateY: [22, 0],
      delay:    anime.stagger(90, { start: 300 }),
      duration: 420, easing: 'easeOutCubic',
    })
    anime({
      targets:  featRef.current ? Array.from(featRef.current.children) : [],
      opacity:  [0, 1], translateX: [-10, 0],
      delay:    anime.stagger(60, { start: 680 }),
      duration: 320, easing: 'easeOutCubic',
    })
    anime({ targets: actRef.current, opacity: [0, 1], translateY: [12, 0], duration: 400, delay: 900, easing: 'easeOutCubic' })
  }, [])

  const name = user?.full_name || user?.username || user?.email?.split('@')[0] || 'Operario'

  return (
    <div className="min-h-screen flex items-center justify-center p-5"
         style={{ background: 'linear-gradient(135deg, #0A150D 0%, #162A1C 55%, #0D1F12 100%)' }}>
      <div className="w-full max-w-2xl flex flex-col items-center gap-8">

        {/* Logo */}
        <div ref={logoRef} className="text-center">
          <div className="relative inline-block mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl
                            flex items-center justify-center shadow-[0_0_32px_rgba(34,197,94,0.4)]">
              <Sprout size={30} className="text-white" />
            </div>
            <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-amber-400 rounded-xl
                            flex items-center justify-center shadow-sm">
              <Lock size={13} className="text-amber-900" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white font-heading mb-2">AgroPulse</h1>
          <span className="text-xs bg-amber-400/15 text-amber-300 border border-amber-400/30
                           px-3 py-1 rounded-full font-medium tracking-wide">
            Acceso Pendiente
          </span>
        </div>

        {/* Message */}
        <div ref={msgRef} className="text-center max-w-sm">
          <p className="text-white/70 text-sm leading-relaxed">
            Bienvenido, <span className="text-green-300 font-semibold">{name}</span>.
            Tu cuenta de operario está activa pero aún no tienes acceso a ningún invernadero.
            Sigue los pasos para comenzar a monitorear.
          </p>
        </div>

        {/* Steps */}
        <div ref={stepsRef} className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
          {STEPS.map(({ icon: Icon, n, title, desc }) => (
            <div key={n} className="bg-white/5 border border-white/10 rounded-3xl p-5 text-center">
              <div className="w-10 h-10 mx-auto mb-3 bg-green-500/15 border border-green-500/25
                              rounded-2xl flex items-center justify-center">
                <Icon size={17} className="text-green-400" />
              </div>
              <p className="text-[10px] font-bold text-green-400 uppercase tracking-widest mb-1.5">{n}</p>
              <h3 className="text-white font-semibold text-sm mb-2">{title}</h3>
              <p className="text-white/40 text-xs leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* Feature preview chips */}
        <div className="text-center">
          <p className="text-white/25 text-[11px] uppercase tracking-widest mb-3">Con acceso podrás ver</p>
          <div ref={featRef} className="flex flex-wrap justify-center gap-2">
            {FEATURES.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1.5 bg-white/5 border border-white/10
                                          rounded-xl px-3 py-1.5">
                <Icon size={12} className="text-green-400 shrink-0" />
                <span className="text-white/55 text-xs">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div ref={actRef} className="flex flex-col items-center gap-3">
          <button
            onClick={refreshAccess}
            className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500
                       hover:from-green-600 hover:to-emerald-600 text-white font-semibold
                       px-6 py-3 rounded-2xl text-sm shadow-[0_0_20px_rgba(34,197,94,0.3)]
                       transition-all duration-200 hover:-translate-y-0.5 transform-gpu cursor-pointer">
            <RefreshCw size={15} />
            Verificar acceso
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-white/30 text-xs
                       hover:text-white/60 transition-colors cursor-pointer">
            <LogOut size={12} />
            Cerrar sesión
          </button>
        </div>

      </div>
    </div>
  )
}
