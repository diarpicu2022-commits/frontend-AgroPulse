export const COLORS = {
  bgDeep:      '#020d05',
  bgSurface:   '#051a0a',
  bgCard:      '#0a1e0f',
  bgSidebar:   '#030f07',
  green:       '#4ade80',
  cyan:        '#22d3ee',
  lime:        '#a3e635',
  red:         '#f87171',
  textPrimary: '#e2ffe9',
  textMuted:   'rgba(255,255,255,0.35)',
} as const

export const FONTS = {
  ui:   "'Space Grotesk', sans-serif",
  data: "'JetBrains Mono', monospace",
} as const

export type AccentColor = 'green' | 'cyan' | 'lime' | 'red'

export const ACCENT_HEX: Record<AccentColor, string> = {
  green: '#4ade80',
  cyan:  '#22d3ee',
  lime:  '#a3e635',
  red:   '#f87171',
}

export const ACCENT_RGBA: Record<AccentColor, (a: number) => string> = {
  green: (a) => `rgba(74,222,128,${a})`,
  cyan:  (a) => `rgba(34,211,238,${a})`,
  lime:  (a) => `rgba(163,230,53,${a})`,
  red:   (a) => `rgba(248,113,113,${a})`,
}
