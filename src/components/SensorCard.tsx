import { useRef, useEffect } from 'react'
import type { LucideIcon } from 'lucide-react'
import anime from 'animejs'
import type { AccentColor } from '../styles/tokens'
import { ACCENT_HEX, ACCENT_RGBA } from '../styles/tokens'

interface SensorCardProps {
  icon: LucideIcon
  label: string
  value: number | null | undefined
  unit: string
  accent?: AccentColor
  source?: string
  min?: number | null
  max?: number | null
  /** @deprecated use accent instead */
  color?: string
}

export default function SensorCard({
  label, value, unit, accent = 'green', source, min, max,
}: SensorCardProps) {
  const valueRef = useRef<HTMLSpanElement>(null)
  const dotRef   = useRef<HTMLDivElement>(null)
  const ecgRef   = useRef<SVGPathElement>(null)
  const prevRef  = useRef<number>(0)

  const hex  = ACCENT_HEX[accent]
  const rgba = ACCENT_RGBA[accent]

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

  useEffect(() => {
    if (!dotRef.current) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    anime({ targets: dotRef.current, scale: [1, 1.6, 1], duration: 2000, loop: true, easing: 'easeInOutSine' })
  }, [])

  useEffect(() => {
    if (!ecgRef.current) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    anime({ targets: ecgRef.current, strokeDashoffset: [220, 0], duration: 1200, easing: 'easeOutCubic' })
  }, [])

  const pct = min != null && max != null && value != null
    ? Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))
    : null

  return (
    <div
      className="relative overflow-hidden rounded-[12px] p-3 flex flex-col gap-2 cursor-default"
      style={{ background: '#0d1a0a', border: `1px solid ${rgba(0.2)}` }}
    >
      {/* Label */}
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '8px', letterSpacing: '1.8px', textTransform: 'uppercase', marginBottom: 0 }}>
        {label}
      </p>

      {/* Source tag */}
      {source && (
        <p style={{ color: 'rgba(255,255,255,0.18)', fontSize: '7px', letterSpacing: '1px', fontFamily: 'JetBrains Mono, monospace', marginTop: -4 }}>
          {source}
        </p>
      )}

      {/* Value */}
      <div className="flex items-baseline gap-1">
        <span ref={valueRef} style={{ color: hex, fontSize: '26px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>
          {value != null ? value.toFixed(1) : '—'}
        </span>
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', fontFamily: 'JetBrains Mono, monospace' }}>{unit}</span>
      </div>

      {/* Progress bar */}
      {pct != null && (
        <div>
          <div style={{ height: 3, background: rgba(0.1), borderRadius: 2 }}>
            <div style={{ width: `${pct}%`, height: '100%', background: hex, borderRadius: 2, boxShadow: `0 0 6px ${rgba(0.45)}`, transition: 'width 0.7s cubic-bezier(0.4,0,0.2,1)' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
            <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '7px', fontFamily: 'JetBrains Mono, monospace' }}>{min}{unit}</span>
            <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '7px', fontFamily: 'JetBrains Mono, monospace' }}>{max}{unit}</span>
          </div>
        </div>
      )}

      {/* ECG waveform */}
      <div className="absolute bottom-0 left-0 right-0 h-6 pointer-events-none" aria-hidden>
        <svg viewBox="0 0 110 24" preserveAspectRatio="none" width="100%" height="24">
          <path
            ref={ecgRef}
            d="M0 12 L22 12 L26 5 L30 19 L34 12 L55 12 L60 7 L66 17 L72 12 L110 12"
            stroke={hex} strokeWidth="1.2" strokeOpacity="0.2" fill="none"
            strokeDasharray="220" strokeDashoffset="220" strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Pulse dot */}
      <div className="absolute bottom-2 left-2.5 flex items-center gap-1">
        <div ref={dotRef} style={{ width: 5, height: 5, borderRadius: '50%', background: hex }} />
        <span style={{ color: rgba(0.5), fontSize: '7px', fontFamily: 'JetBrains Mono, monospace' }}>live</span>
      </div>
    </div>
  )
}
