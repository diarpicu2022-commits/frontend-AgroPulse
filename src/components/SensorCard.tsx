import { useRef, useEffect } from 'react'
import type { LucideIcon } from 'lucide-react'
import anime from 'animejs'
import BotanicalSvg from './ui/BotanicalSvg'
import type { AccentColor } from '../styles/tokens'
import { ACCENT_HEX, ACCENT_RGBA } from '../styles/tokens'

interface SensorCardProps {
  icon: LucideIcon
  label: string
  value: number | null | undefined
  unit: string
  accent?: AccentColor
  /** @deprecated use accent instead */
  color?: string
  min?: number | null
  max?: number | null
}

export default function SensorCard({ icon: Icon, label, value, unit, accent = 'green', min, max }: SensorCardProps) {
  const valueRef = useRef<HTMLSpanElement>(null)
  const dotRef   = useRef<HTMLDivElement>(null)
  const ecgRef   = useRef<SVGPathElement>(null)
  const prevRef  = useRef<number>(0)

  const hex  = ACCENT_HEX[accent]
  const rgba = ACCENT_RGBA[accent]

  // Preserve existing count-up animation
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

  // Pulse dot
  useEffect(() => {
    if (!dotRef.current) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    anime({ targets: dotRef.current, scale: [1, 1.6, 1], duration: 2000, loop: true, easing: 'easeInOutSine' })
  }, [])

  // ECG draw on mount
  useEffect(() => {
    if (!ecgRef.current) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    anime({ targets: ecgRef.current, strokeDashoffset: [220, 0], duration: 1200, easing: 'easeOutCubic' })
  }, [])

  const pct = min != null && max != null && value != null
    ? Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))
    : null
  const isOk = pct != null && pct >= 20 && pct <= 80

  return (
    <div
      className="relative overflow-hidden rounded-[14px] p-4 flex flex-col gap-3 cursor-default"
      style={{ background: '#0a1e0f', border: `1px solid ${rgba(0.12)}` }}
    >
      {/* Botanical corner */}
      <div className="absolute top-0 right-0 pointer-events-none" style={{ opacity: 0.18 }}>
        <BotanicalSvg size={56} color={hex} animate={false} />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between relative z-10">
        <div className="p-2 rounded-xl" style={{ background: rgba(0.10), border: `1px solid ${rgba(0.20)}` }}>
          <Icon size={16} style={{ color: hex }} />
        </div>
        <span className="font-mono text-[8px] tracking-[2px] uppercase px-2.5 py-1 rounded-full"
              style={{ background: rgba(0.08), border: `1px solid ${rgba(0.20)}`, color: hex }}>
          {pct == null ? 'sin rango' : isOk ? 'óptimo' : 'fuera'}
        </span>
      </div>

      {/* Label + Value */}
      <div className="relative z-10">
        <p className="font-mono text-[9px] tracking-[2px] uppercase mb-1.5"
           style={{ color: 'rgba(255,255,255,0.35)' }}>
          {label}
        </p>
        <div className="flex items-baseline gap-1.5">
          <span ref={valueRef} className="font-mono text-3xl font-bold leading-none"
                style={{ color: '#e2ffe9' }}>
            {value != null ? value.toFixed(1) : '—'}
          </span>
          <span className="font-mono text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>{unit}</span>
        </div>
      </div>

      {/* Progress bar */}
      {pct != null && (
        <div className="relative z-10">
          <div className="h-1 rounded-full overflow-hidden" style={{ background: rgba(0.10) }}>
            <div className="h-full rounded-full transition-all duration-700"
                 style={{ width: `${pct}%`, background: hex, boxShadow: `0 0 8px ${rgba(0.4)}` }} />
          </div>
          <div className="flex justify-between mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>
            <span className="font-mono text-[8px]">{min}{unit}</span>
            <span className="font-mono text-[8px]">{Math.round(pct)}%</span>
            <span className="font-mono text-[8px]">{max}{unit}</span>
          </div>
        </div>
      )}

      {/* ECG background waveform */}
      <div className="absolute bottom-0 left-0 right-0 h-7 pointer-events-none" aria-hidden>
        <svg viewBox="0 0 110 28" preserveAspectRatio="none" width="100%" height="28">
          <path
            ref={ecgRef}
            d="M0 14 L22 14 L26 6 L30 22 L34 14 L55 14 L60 8 L66 20 L72 14 L110 14"
            stroke={hex} strokeWidth="1.2" strokeOpacity="0.22" fill="none"
            strokeDasharray="220" strokeDashoffset="220" strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Pulse dot */}
      <div className="absolute bottom-3 left-3 flex items-center gap-1.5 z-10">
        <div ref={dotRef} className="w-1.5 h-1.5 rounded-full" style={{ background: hex }} />
        <span className="font-mono text-[8px]" style={{ color: rgba(0.5) }}>live</span>
      </div>
    </div>
  )
}
