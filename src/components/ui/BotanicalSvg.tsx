import { useEffect, useRef } from 'react'
import anime from 'animejs'

interface BotanicalSvgProps {
  size?: number
  color?: string
  className?: string
  animate?: boolean
}

export default function BotanicalSvg({ size = 80, color = '#4ade80', className = '', animate = true }: BotanicalSvgProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!animate || !svgRef.current) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    anime({
      targets: svgRef.current,
      rotate: [-3, 3],
      direction: 'alternate',
      loop: true,
      easing: 'easeInOutSine',
      duration: 3000,
    })
  }, [animate])

  return (
    <svg
      ref={svgRef}
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ transformOrigin: '50% 100%', display: 'block' }}
      aria-hidden="true"
    >
      {/* Main stem */}
      <path d="M40 75 Q38 55 36 40 Q34 25 38 12" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      {/* Left leaf */}
      <path d="M38 40 Q28 32 24 20 Q34 22 38 40 Z" fill={color} opacity="0.35" />
      <path d="M38 40 Q28 32 24 20" stroke={color} strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      {/* Right leaf */}
      <path d="M37 28 Q48 20 52 10 Q42 14 37 28 Z" fill={color} opacity="0.35" />
      <path d="M37 28 Q48 20 52 10" stroke={color} strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      {/* Top bud */}
      <path d="M38 14 Q32 8 30 2 Q38 6 38 14 Z" fill={color} opacity="0.25" />
      {/* Secondary left stem */}
      <path d="M37 50 Q30 46 26 36" stroke={color} strokeWidth="0.8" strokeLinecap="round" opacity="0.3" />
      <path d="M37 50 Q30 46 26 36 Q36 38 37 50 Z" fill={color} opacity="0.15" />
    </svg>
  )
}
