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
      targets: obj, val: value, duration: 800, easing: 'easeOutCubic',
      update: () => { if (valueRef.current) valueRef.current.textContent = obj.val.toFixed(1) },
    })
  }, [value])

  useEffect(() => {
    if (!dotRef.current) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    anime({ targets: dotRef.current, scale: [1, 1.7, 1], duration: 2200, loop: true, easing: 'easeInOutSine' })
  }, [])

  useEffect(() => {
    if (!ecgRef.current) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    anime({ targets: ecgRef.current, strokeDashoffset: [220, 0], duration: 1400, easing: 'easeOutCubic' })
  }, [])

  const pct = min != null && max != null && value != null
    ? Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))
    : null

  return (
    <div
      className="relative overflow-hidden flex flex-col cursor-default"
      style={{
        background: `linear-gradient(145deg, #0d1a0a, #0a1508)`,
        border: `1px solid ${rgba(0.25)}`,
        borderRadius: 14,
        padding: '14px 14px 20px',
        gap: 8,
        boxShadow: `0 0 20px ${rgba(0.06)}`,
      }}
    >
      {/* Glow top-right corner */}
      <div style={{
        position: 'absolute', top: 0, right: 0, width: 60, height: 60,
        background: `radial-gradient(circle at top right, ${rgba(0.12)}, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      {/* Label */}
      <p style={{
        color: 'rgba(255,255,255,0.38)', fontSize: 9, letterSpacing: '2px',
        textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace',
      }}>
        {label}
      </p>

      {/* Source */}
      {source && (
        <p style={{
          color: rgba(0.45), fontSize: 8, letterSpacing: '1px',
          fontFamily: 'JetBrains Mono, monospace', marginTop: -4,
        }}>
          ↗ {source}
        </p>
      )}

      {/* Value */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 2 }}>
        <span
          ref={valueRef}
          style={{
            color: hex, fontSize: 30, fontWeight: 800,
            fontFamily: 'JetBrains Mono, monospace', lineHeight: 1,
            textShadow: `0 0 18px ${rgba(0.5)}`,
          }}
        >
          {value != null ? value.toFixed(1) : '—'}
        </span>
        <span style={{
          color: 'rgba(255,255,255,0.28)', fontSize: 12,
          fontFamily: 'JetBrains Mono, monospace',
        }}>
          {unit}
        </span>
      </div>

      {/* Progress bar */}
      {pct != null && (
        <div style={{ marginTop: 4 }}>
          <div style={{ height: 3, background: rgba(0.1), borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              width: `${pct}%`, height: '100%', background: hex, borderRadius: 99,
              boxShadow: `0 0 8px ${rgba(0.6)}`,
              transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 7.5, fontFamily: 'JetBrains Mono, monospace' }}>{min}{unit}</span>
            <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 7.5, fontFamily: 'JetBrains Mono, monospace' }}>{max}{unit}</span>
          </div>
        </div>
      )}

      {/* ECG waveform */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 28, pointerEvents: 'none' }} aria-hidden>
        <svg viewBox="0 0 110 28" preserveAspectRatio="none" width="100%" height="28">
          <path
            ref={ecgRef}
            d="M0 14 L20 14 L24 5 L28 23 L32 14 L52 14 L57 7 L63 21 L69 14 L110 14"
            stroke={hex} strokeWidth="1.4" strokeOpacity="0.25" fill="none"
            strokeDasharray="220" strokeDashoffset="220" strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Pulse dot */}
      <div style={{ position: 'absolute', bottom: 8, left: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
        <div ref={dotRef} style={{ width: 5, height: 5, borderRadius: '50%', background: hex, boxShadow: `0 0 6px ${rgba(0.7)}` }} />
        <span style={{ color: rgba(0.4), fontSize: 7, fontFamily: 'JetBrains Mono, monospace', letterSpacing: 1 }}>LIVE</span>
      </div>
    </div>
  )
}
