import { useRef, useEffect, useMemo } from 'react'
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
  timestamp?: string
}

function getStatus(timestamp?: string): { dot: string; text: string; active: boolean } {
  if (!timestamp) return { dot: '#555', text: 'SIN DATOS', active: false }
  const age = Date.now() - new Date(/Z|[+-]\d{2}:\d{2}$/.test(timestamp) ? timestamp : timestamp + 'Z').getTime()
  const minutes = age / 60000
  if (minutes < 3)  return { dot: '#4ade80', text: 'EN LÍNEA',  active: true  }
  if (minutes < 10) return { dot: '#fbbf24', text: 'TARDÍO',    active: false }
  return               { dot: '#f87171', text: 'SIN SEÑAL', active: false }
}

export default function SensorCard({
  icon: Icon, label, value, unit, accent = 'green', source, min, max, timestamp,
}: SensorCardProps) {
  const valueRef  = useRef<HTMLSpanElement>(null)
  const dotRef    = useRef<HTMLDivElement>(null)
  const barRef    = useRef<HTMLDivElement>(null)
  const prevRef   = useRef<number>(0)

  const hex  = ACCENT_HEX[accent]
  const rgba = ACCENT_RGBA[accent]

  const pct = min != null && max != null && value != null
    ? Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))
    : null

  const status = useMemo(() => getStatus(timestamp), [timestamp])

  /* animate value count-up */
  useEffect(() => {
    if (!valueRef.current || value == null) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const from = prevRef.current
    prevRef.current = value
    if (reduced) { valueRef.current.textContent = value.toFixed(1); return }
    const obj = { val: from }
    anime({
      targets: obj, val: value, duration: 800, easing: 'easeOutExpo',
      update: () => { if (valueRef.current) valueRef.current.textContent = obj.val.toFixed(1) },
    })
  }, [value])

  /* animate progress bar width */
  useEffect(() => {
    if (!barRef.current || pct == null) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) { barRef.current.style.width = `${pct}%`; return }
    anime({ targets: barRef.current, width: `${pct}%`, duration: 900, easing: 'easeOutCubic' })
  }, [pct])

  /* animate status dot if active */
  useEffect(() => {
    if (!dotRef.current || !status.active) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    anime({
      targets: dotRef.current,
      scale: [1, 1.7, 1],
      opacity: [1, 0.3, 1],
      duration: 1800,
      loop: true,
      easing: 'easeInOutSine',
    })
  }, [status.active])

  return (
    <div
      style={{
        background: 'linear-gradient(160deg,#0c1509 0%,#090e07 100%)',
        border: `1px solid ${rgba(0.15)}`,
        borderRadius: 14,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        cursor: 'default',
        boxShadow: `inset 3px 0 0 ${hex}`,
      }}
    >
      {/* ── Header ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 14px 0',
        gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 9, flexShrink: 0,
            background: rgba(0.12),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={14} style={{ color: hex }} />
          </div>
          <span style={{
            color: 'rgba(255,255,255,0.55)',
            fontSize: 9,
            letterSpacing: '1.8px',
            textTransform: 'uppercase',
            fontFamily: 'JetBrains Mono, monospace',
            fontWeight: 600,
          }}>
            {label}
          </span>
        </div>
        {source && (
          <span style={{
            background: rgba(0.08),
            border: `1px solid ${rgba(0.18)}`,
            borderRadius: 20,
            color: rgba(0.65),
            fontSize: 7.5,
            padding: '2px 6px',
            fontFamily: 'JetBrains Mono, monospace',
            flexShrink: 0,
          }}>
            {source}
          </span>
        )}
      </div>

      {/* ── Divider ── */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', margin: '10px 14px 0' }} />

      {/* ── Value ── */}
      <div style={{ padding: '10px 14px 0', display: 'flex', alignItems: 'baseline', gap: 5 }}>
        <span
          ref={valueRef}
          style={{
            color: hex,
            fontSize: 42,
            fontWeight: 800,
            fontFamily: 'JetBrains Mono, monospace',
            lineHeight: 1,
            letterSpacing: '-1px',
          }}
        >
          {value != null ? value.toFixed(1) : '—'}
        </span>
        <span style={{
          color: 'rgba(255,255,255,0.25)',
          fontSize: 14,
          fontFamily: 'JetBrains Mono, monospace',
          paddingBottom: 2,
        }}>
          {unit}
        </span>
      </div>

      {/* ── Progress bar ── */}
      {pct != null ? (
        <div style={{ padding: '10px 14px 0' }}>
          <div style={{ height: 3, background: rgba(0.09), borderRadius: 99, overflow: 'hidden' }}>
            <div
              ref={barRef}
              style={{
                width: 0,
                height: '100%',
                background: `linear-gradient(90deg, ${hex}, ${rgba(0.6)})`,
                borderRadius: 99,
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
            <span style={{ color: 'rgba(255,255,255,0.18)', fontSize: 7, fontFamily: 'JetBrains Mono, monospace' }}>
              {min}{unit}
            </span>
            <span style={{ color: rgba(0.5), fontSize: 7.5, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
              {Math.round(pct)}%
            </span>
            <span style={{ color: 'rgba(255,255,255,0.18)', fontSize: 7, fontFamily: 'JetBrains Mono, monospace' }}>
              {max}{unit}
            </span>
          </div>
        </div>
      ) : (
        <div style={{ height: 14 }} />
      )}

      {/* ── Footer: status ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        padding: '10px 14px 12px',
        marginTop: 'auto',
      }}>
        <div
          ref={dotRef}
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: status.dot,
            flexShrink: 0,
            boxShadow: status.active ? `0 0 6px ${status.dot}` : 'none',
          }}
        />
        <span style={{
          color: status.active ? 'rgba(74,222,128,0.7)' : 'rgba(255,255,255,0.25)',
          fontSize: 8,
          fontFamily: 'JetBrains Mono, monospace',
          letterSpacing: '1.5px',
          fontWeight: 600,
        }}>
          {status.text}
        </span>
      </div>
    </div>
  )
}
