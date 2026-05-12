import { useRef, useEffect } from 'react'
import type { LucideIcon } from 'lucide-react'
import { TrendingUp } from 'lucide-react'
import anime from 'animejs'

interface SensorCardProps {
  icon: LucideIcon
  label: string
  value: number | null | undefined
  unit: string
  color: string
  min?: number | null
  max?: number | null
}

const SENSOR_GRADIENT: Record<string, string> = {
  'bg-orange-500': 'bg-gradient-sensor-temp',
  'bg-blue-500':   'bg-gradient-sensor-hum',
  'bg-cyan-500':   'bg-gradient-sensor-hum',
  'bg-green-600':  'bg-gradient-sensor-soil',
  'bg-yellow-500': 'bg-gradient-sensor-light',
  'bg-purple-500': 'bg-gradient-sensor-co2',
}

export default function SensorCard({ icon: Icon, label, value, unit, color, min, max }: SensorCardProps) {
  const valueRef = useRef<HTMLSpanElement>(null)
  const prevRef  = useRef<number>(0)

  const pct = min != null && max != null && value != null
    ? Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))
    : null
  const isOk = pct != null && pct >= 0 && pct <= 100

  useEffect(() => {
    if (!valueRef.current || value == null) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const from = prevRef.current
    prevRef.current = value
    if (reduced) { valueRef.current.textContent = value.toFixed(1); return }
    const obj = { val: from }
    anime({
      targets: obj,
      val: value,
      duration: 700,
      easing: 'easeOutCubic',
      update: () => { if (valueRef.current) valueRef.current.textContent = obj.val.toFixed(1) },
    })
  }, [value])

  const gradientBg = SENSOR_GRADIENT[color] || 'bg-gradient-to-br from-gray-50 to-gray-100'

  return (
    <div className={`${gradientBg} rounded-3xl border border-white/80 shadow-sensor hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 p-4 flex flex-col gap-3 transform-gpu cursor-default`}>
      <div className="flex items-center justify-between">
        <div className={`p-2.5 rounded-2xl ${color} shadow-glow-sm`}>
          <Icon size={17} className="text-white" />
        </div>
        <span className={pct == null ? 'badge-gray' : isOk ? 'badge-green' : 'badge-red'}>
          {pct == null ? 'Sin rango' : isOk ? 'Óptimo' : 'Fuera'}
        </span>
      </div>

      <div>
        <p className="stat-label mb-1">{label}</p>
        <div className="flex items-baseline gap-1.5">
          <span ref={valueRef} className="text-xl sm:text-2xl md:text-3xl font-bold font-mono text-gray-900 leading-none">
            {value != null ? value.toFixed(1) : '—'}
          </span>
          <span className="text-sm text-gray-400 font-medium">{unit}</span>
        </div>
      </div>

      {pct != null && (
        <div className="space-y-1.5">
          <div className="h-1.5 bg-gray-200/60 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                isOk
                  ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                  : pct < 50
                  ? 'bg-gradient-to-r from-blue-400 to-cyan-400'
                  : 'bg-gradient-to-r from-red-400 to-rose-400'
              }`}
              style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 font-medium">
            <span>{min}{unit}</span>
            <span className="flex items-center gap-0.5">
              <TrendingUp size={9} />
              {Math.round(pct)}%
            </span>
            <span>{max}{unit}</span>
          </div>
        </div>
      )}
    </div>
  )
}
