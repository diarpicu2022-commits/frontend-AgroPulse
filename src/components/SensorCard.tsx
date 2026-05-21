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
  icon: Icon, label, value, unit, accent = 'green', source, min, max,
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
      targets: obj, val: value, duration: 900, easing: 'easeOutCubic',
      update: () => { if (valueRef.current) valueRef.current.textContent = obj.val.toFixed(1) },
    })
  }, [value])

  useEffect(() => {
    if (!dotRef.current) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    anime({ targets: dotRef.current, scale: [1, 1.8, 1], opacity: [1, 0.4, 1], duration: 2000, loop: true, easing: 'easeInOutSine' })
  }, [])

  useEffect(() => {
    if (!ecgRef.current) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    anime({ targets: ecgRef.current, strokeDashoffset: [220, 0], duration: 1600, easing: 'easeOutCubic' })
  }, [])

  const pct = min != null && max != null && value != null
    ? Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))
    : null

  return (
    <div
      className="relative overflow-hidden flex flex-col cursor-default"
      style={{
        background: '#090f07',
        borderRadius: 16,
        border: `1px solid ${rgba(0.18)}`,
      }}
    >
      {/* Barra de color superior */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${hex}, ${rgba(0)})`, borderRadius: '16px 16px 0 0' }} />

      {/* Contenido */}
      <div style={{ padding: '12px 14px 18px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>

        {/* Cabecera: icono + label + source */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8, flexShrink: 0,
            background: rgba(0.1), border: `1px solid ${rgba(0.2)}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={13} style={{ color: hex }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, letterSpacing: '1.5px', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>
              {label}
            </p>
            {source && (
              <p style={{ color: rgba(0.5), fontSize: 7.5, fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>
                {source}
              </p>
            )}
          </div>
        </div>

        {/* Valor grande */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, lineHeight: 1 }}>
          <span
            ref={valueRef}
            style={{
              color: hex,
              fontSize: 36,
              fontWeight: 800,
              fontFamily: 'JetBrains Mono, monospace',
              lineHeight: 1,
              filter: `drop-shadow(0 0 10px ${rgba(0.6)})`,
            }}
          >
            {value != null ? value.toFixed(1) : '—'}
          </span>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, fontFamily: 'JetBrains Mono, monospace', paddingBottom: 4 }}>
            {unit}
          </span>
        </div>

        {/* Barra de progreso */}
        {pct != null && (
          <div>
            <div style={{ height: 4, background: rgba(0.08), borderRadius: 99 }}>
              <div style={{
                width: `${pct}%`, height: '100%', background: hex, borderRadius: 99,
                boxShadow: `0 0 8px ${rgba(0.5)}`,
                transition: 'width 0.9s cubic-bezier(0.4,0,0.2,1)',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 7.5, fontFamily: 'JetBrains Mono, monospace' }}>{min}{unit}</span>
              <span style={{ color: rgba(0.45), fontSize: 7.5, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>{Math.round(pct)}%</span>
              <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 7.5, fontFamily: 'JetBrains Mono, monospace' }}>{max}{unit}</span>
            </div>
          </div>
        )}
      </div>

      {/* ECG waveform fondo */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 30, pointerEvents: 'none' }} aria-hidden>
        <svg viewBox="0 0 110 30" preserveAspectRatio="none" width="100%" height="30">
          <path
            ref={ecgRef}
            d="M0 15 L20 15 L24 5 L28 25 L32 15 L52 15 L57 7 L63 23 L69 15 L110 15"
            stroke={hex} strokeWidth="1.5" strokeOpacity="0.18" fill="none"
            strokeDasharray="220" strokeDashoffset="220" strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Pulse dot */}
      <div style={{ position: 'absolute', bottom: 9, right: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
        <div ref={dotRef} style={{ width: 5, height: 5, borderRadius: '50%', background: hex }} />
        <span style={{ color: rgba(0.35), fontSize: 7, fontFamily: 'JetBrains Mono, monospace', letterSpacing: 1 }}>LIVE</span>
      </div>
    </div>
  )
}
