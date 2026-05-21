export const COLORS = {
  bgDeep:      '#080e05',
  bgSurface:   '#051a0a',
  bgCard:      '#0d1a0a',
  bgSidebar:   '#040a03',
  amber:       '#fb923c',
  golden:      '#fbbf24',
  cyan:        '#22d3ee',
  violet:      '#a78bfa',
  green:       '#4ade80',
  red:         '#f87171',
  textPrimary: '#f0fdf4',
  textMuted:   'rgba(255,255,255,0.35)',
} as const

export const FONTS = {
  ui:   "'Space Grotesk', sans-serif",
  data: "'JetBrains Mono', monospace",
} as const

export type AccentColor = 'amber' | 'golden' | 'cyan' | 'violet' | 'green' | 'red'

export const ACCENT_HEX: Record<AccentColor, string> = {
  amber:  '#fb923c',
  golden: '#fbbf24',
  cyan:   '#22d3ee',
  violet: '#a78bfa',
  green:  '#4ade80',
  red:    '#f87171',
}

export const ACCENT_RGBA: Record<AccentColor, (a: number) => string> = {
  amber:  (a) => `rgba(251,146,60,${a})`,
  golden: (a) => `rgba(251,191,36,${a})`,
  cyan:   (a) => `rgba(34,211,238,${a})`,
  violet: (a) => `rgba(167,139,250,${a})`,
  green:  (a) => `rgba(74,222,128,${a})`,
  red:    (a) => `rgba(248,113,113,${a})`,
}
