import { useRef, useEffect } from 'react'
import { AlertTriangle, Thermometer, Droplets, Leaf, X, type LucideIcon } from 'lucide-react'
import anime from 'animejs'
import type { AutoAlert } from '../types'

interface AlertsBannerProps {
  alerts: AutoAlert[]
  onDismiss: (idx: number) => void
}

const ALERT_CONFIG: Record<string, { icon: LucideIcon; cls: string }> = {
  TEMPERATURE:   { icon: Thermometer,   cls: 'alert-warning' },
  HUMIDITY:      { icon: Droplets,      cls: 'alert-info'    },
  SOIL_MOISTURE: { icon: Leaf,          cls: 'alert-success' },
  CRITICAL:      { icon: AlertTriangle, cls: 'alert-danger'  },
}

export default function AlertsBanner({ alerts, onDismiss }: AlertsBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const prevLen      = useRef(0)

  useEffect(() => {
    if (!containerRef.current || alerts.length === 0 || alerts.length <= prevLen.current) {
      prevLen.current = alerts.length
      return
    }
    prevLen.current = alerts.length
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    anime({
      targets:    Array.from(containerRef.current.children) as Element[],
      opacity:    [0, 1],
      translateX: [-12, 0],
      delay:      anime.stagger(70),
      duration:   280,
      easing:     'easeOutCubic',
    })
  }, [alerts.length])

  if (!alerts.length) return null

  return (
    <div ref={containerRef} className="space-y-2">
      {alerts.map((alert, idx) => {
        const cfg = ALERT_CONFIG[alert.type] ?? { icon: AlertTriangle, cls: 'alert-warning' }
        const AlertIcon = cfg.icon
        return (
          <div key={idx} className={cfg.cls}>
            <AlertIcon size={15} className="shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm leading-snug">{alert.title}</p>
              <p className="text-xs opacity-80 mt-0.5">{alert.message}</p>
            </div>
            {alert.timestamp && (
              <span className="text-[11px] opacity-55 shrink-0 hidden sm:block">
                {new Date(alert.timestamp).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button
              onClick={() => onDismiss(idx)}
              aria-label="Descartar"
              className="shrink-0 p-1 rounded-lg hover:bg-black/10 transition-colors"
            >
              <X size={13} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
