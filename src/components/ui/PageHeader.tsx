import { useEffect, useRef } from 'react'
import anime from 'animejs'
import BotanicalSvg from './BotanicalSvg'
import type { AccentColor } from '../../styles/tokens'
import { ACCENT_HEX } from '../../styles/tokens'

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  accent?: AccentColor
}

export default function PageHeader({ title, subtitle, action, accent = 'green' }: PageHeaderProps) {
  const headerRef = useRef<HTMLDivElement>(null)
  const botRef    = useRef<HTMLDivElement>(null)
  const hex       = ACCENT_HEX[accent]

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    anime({ targets: headerRef.current, opacity: [0, 1], translateY: [-8, 0], duration: 400, easing: 'easeOutCubic' })
    anime({ targets: botRef.current, opacity: [0, 0.06], scale: [0.9, 1], duration: 600, easing: 'easeOutCubic' })
  }, [])

  return (
    <div ref={headerRef} className="relative flex items-start justify-between mb-6 overflow-hidden" style={{ opacity: 0 }}>
      <div>
        <h1 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#e2ffe9', fontFamily: "'Space Grotesk', sans-serif", margin: 0 }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem', letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginTop: '0.2rem' }}>
            {subtitle}
          </p>
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
             style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)' }}>
          <div className="live-dot" />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem', letterSpacing: '1px', textTransform: 'uppercase', color: '#4ade80' }}>
            en línea
          </span>
        </div>
        {action}
      </div>
      <div ref={botRef} className="absolute -right-4 -top-6 pointer-events-none" style={{ opacity: 0 }}>
        <BotanicalSvg size={120} color={hex} animate={false} />
      </div>
    </div>
  )
}
