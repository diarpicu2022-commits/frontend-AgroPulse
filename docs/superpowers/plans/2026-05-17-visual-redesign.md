# AgroPulse Visual Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current light/green-glass UI with a full Biopunk IoT dark theme across all 5 main pages and the App shell.

**Architecture:** Design-system-first — Task 1 lays tokens + CSS foundation that all subsequent tasks reference. New shared components (BotanicalSvg, SensorCard, PageHeader) are built before pages. Each page task is a targeted replacement of only the visual layer; all data-fetching and business logic is untouched.

**Tech Stack:** React 18 + TypeScript, anime.js (already installed), Tailwind CSS, Recharts, Google Fonts (Space Grotesk + JetBrains Mono via @import)

---

## File Map

| File | Action |
|---|---|
| `src/styles/tokens.ts` | Create — color/font/accent constants |
| `tailwind.config.js` | Modify — add biopunk colors, update fontFamily, update sidebar + shadow tokens |
| `src/index.css` | Modify — new fonts, base vars, biopunk CSS utilities |
| `src/components/ui/BotanicalSvg.tsx` | Create — reusable SVG botanical decoration with anime.js sway |
| `src/components/ui/PageHeader.tsx` | Create — shared page header with botanical watermark and entrance animation |
| `src/components/SensorCard.tsx` | Modify — full biopunk redesign; keep count-up anime.js logic |
| `src/App.tsx` | Modify — sidebar logo + nav colors + header styling |
| `src/pages/LoginPage.tsx` | Modify — biopunk card + botanical decoration + replace gsap with anime.js |
| `src/pages/Dashboard.tsx` | Modify — SENSOR_META accent, PageHeader, biopunk cards + chart colors |
| `src/pages/SensorsPage.tsx` | Modify — PageHeader, biopunk sensor list cards |
| `src/pages/GreenhousePage.tsx` | Modify — PageHeader, biopunk greenhouse cards |
| `src/pages/MapPage.tsx` | Modify — PageHeader, dark map container styling |

---

## Task 1: Design Foundation — Tokens + Tailwind + CSS

**Files:**
- Create: `src/styles/tokens.ts`
- Modify: `tailwind.config.js`
- Modify: `src/index.css`

- [ ] **Step 1: Create `src/styles/tokens.ts`**

```typescript
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
```

- [ ] **Step 2: Update `tailwind.config.js`**

Replace the `colors` section's `sidebar` block and `fontFamily` block, and add new shadows. The full updated export is:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary:    '#4ade80',
        secondary:  '#22d3ee',
        cta:        '#f59e0b',
        background: '#020d05',
        dark:       '#14532D',
        biopunk: {
          deep:    '#020d05',
          surface: '#051a0a',
          card:    '#0a1e0f',
          sidebar: '#030f07',
          green:   '#4ade80',
          cyan:    '#22d3ee',
          lime:    '#a3e635',
          red:     '#f87171',
          text:    '#e2ffe9',
          muted:   'rgba(255,255,255,0.35)',
        },
        sidebar: {
          DEFAULT: '#030f07',
          deep:    '#020d05',
          mid:     '#051a0a',
          light:   '#0a1e0f',
          border:  'rgba(74,222,128,0.07)',
        },
        glass: {
          DEFAULT: 'rgba(255,255,255,0.72)',
          dark:    'rgba(2,13,5,0.90)',
          border:  'rgba(74,222,128,0.10)',
        },
        success: '#4ade80',
        warning: '#f59e0b',
        danger:  '#f87171',
        info:    '#22d3ee',
        foreground: 'var(--foreground)',
        border:     'var(--border)',
        ring:       'var(--ring)',
        input:      'var(--input)',
        card: { DEFAULT: 'var(--card)', foreground: 'var(--card-foreground)' },
        popover: { DEFAULT: 'var(--popover)', foreground: 'var(--popover-foreground)' },
        muted: { DEFAULT: 'var(--muted)', foreground: 'var(--muted-foreground)' },
        accent: { DEFAULT: 'var(--accent)', foreground: 'var(--accent-foreground)' },
        destructive: { DEFAULT: 'var(--destructive)', foreground: 'var(--destructive-foreground)' },
      },
      fontFamily: {
        heading: ['Space Grotesk', 'sans-serif'],
        body:    ['Space Grotesk', 'sans-serif'],
        sans:    ['Space Grotesk', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
        data:    ['JetBrains Mono', 'monospace'],
      },
      screens: {
        xs: '375px', sm: '640px', md: '768px', lg: '1024px',
        xl: '1280px', '2xl': '1536px', '3xl': '1920px', '4k': '2560px',
      },
      borderRadius: { 'xl2': '1rem', '2xl': '1rem', '3xl': '1.5rem', '4xl': '2rem' },
      boxShadow: {
        'glass':        '0 8px 32px rgba(0,0,0,0.50)',
        'glass-dark':   '0 8px 32px rgba(0,0,0,0.60)',
        'card':         '0 0 0 1px rgba(74,222,128,0.10), 0 4px 24px rgba(0,0,0,0.5)',
        'card-hover':   '0 0 0 1px rgba(74,222,128,0.20), 0 8px 32px rgba(0,0,0,0.6)',
        'glow-green':   '0 0 20px rgba(74,222,128,0.35)',
        'glow-cyan':    '0 0 20px rgba(34,211,238,0.30)',
        'glow-sm':      '0 0 12px rgba(74,222,128,0.25)',
        'inner-glow':   'inset 0 0 20px rgba(74,222,128,0.06)',
        'card-biopunk': '0 0 0 1px rgba(74,222,128,0.12), 0 8px 32px rgba(0,0,0,0.5)',
        'sensor':       '0 0 0 1px rgba(74,222,128,0.10), 0 4px 20px rgba(0,0,0,0.5)',
        'neon-green':   '0 0 20px rgba(74,222,128,0.35)',
        'neon-cyan':    '0 0 20px rgba(34,211,238,0.30)',
      },
      backgroundImage: {
        'gradient-nature':        'linear-gradient(135deg, #020d05 0%, #051a0a 40%, #020d05 100%)',
        'gradient-sidebar':       'linear-gradient(180deg, #030f07 0%, #051a0a 50%, #030f07 100%)',
        'gradient-card':          'linear-gradient(135deg, #0a1e0f 0%, #051a0a 100%)',
        'gradient-sensor-temp':   'linear-gradient(135deg, #0a1e0f 0%, #1a0f0f 100%)',
        'gradient-sensor-hum':    'linear-gradient(135deg, #0a1e0f 0%, #0f1a1f 100%)',
        'gradient-sensor-soil':   'linear-gradient(135deg, #0a1e0f 0%, #0f1a10 100%)',
        'gradient-sensor-light':  'linear-gradient(135deg, #0a1e0f 0%, #1a1a0f 100%)',
        'gradient-sensor-co2':    'linear-gradient(135deg, #0a1e0f 0%, #0a1e0f 100%)',
        'mesh-green':             'radial-gradient(at 40% 20%, rgba(74,222,128,0.06) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(34,211,238,0.04) 0px, transparent 50%)',
      },
      animation: {
        'fade-in':       'fadeIn 0.4s ease-out both',
        'fade-up':       'fadeUp 0.45s ease-out both',
        'fade-down':     'fadeDown 0.35s ease-out both',
        'slide-in-left': 'slideInLeft 0.4s ease-out both',
        'scale-in':      'scaleIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
        'pulse-slow':    'pulse 4s cubic-bezier(0.4,0,0.6,1) infinite',
        'float':         'float 6s ease-in-out infinite',
        'shimmer':       'shimmer 2s linear infinite',
        'ping-slow':     'ping 2.5s cubic-bezier(0,0,0.2,1) infinite',
        'glow-pulse':    'glowPulse 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:      { from: { opacity: '0' },                                 to: { opacity: '1' } },
        fadeUp:      { from: { opacity: '0', transform: 'translateY(20px)' },  to: { opacity: '1', transform: 'translateY(0)' } },
        fadeDown:    { from: { opacity: '0', transform: 'translateY(-12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideInLeft: { from: { opacity: '0', transform: 'translateX(-24px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        scaleIn:     { from: { opacity: '0', transform: 'scale(0.92)' },       to: { opacity: '1', transform: 'scale(1)' } },
        float:       { '0%, 100%': { transform: 'translateY(0px)' }, '50%': { transform: 'translateY(-12px)' } },
        shimmer:     { from: { backgroundPosition: '-200% 0' }, to: { backgroundPosition: '200% 0' } },
        glowPulse:   { '0%, 100%': { boxShadow: '0 0 12px rgba(74,222,128,0.2)' }, '50%': { boxShadow: '0 0 28px rgba(74,222,128,0.45)' } },
      },
      backdropBlur: { xs: '2px', sm: '4px', md: '12px', lg: '20px', xl: '32px' },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 3: Update `src/index.css`**

Replace the entire file content with the following (keep the shadcn/tw-animate/fontsource imports untouched, update everything else):

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* ── Google Fonts ─────────────────────────────────────────────────────────── */
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
@import "tw-animate-css";
@import "shadcn/tailwind.css";
@import "@fontsource-variable/geist";

/* ── Base ─────────────────────────────────────────────────────────────────── */
@layer base {
  *, *::before, *::after { box-sizing: border-box; }

  html {
    font-family: 'Space Grotesk', sans-serif;
    scroll-behavior: smooth;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
  }

  body { background: #020d05; color: #e2ffe9; }

  h1, h2, h3, h4, h5, h6 { font-family: 'Space Grotesk', sans-serif; }

  ::-webkit-scrollbar            { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track      { background: transparent; }
  ::-webkit-scrollbar-thumb      { background: rgba(74,222,128,0.25); border-radius: 9999px; }
  ::-webkit-scrollbar-thumb:hover{ background: rgba(74,222,128,0.45); }

  :focus-visible { outline: none; box-shadow: 0 0 0 2px #020d05, 0 0 0 4px #4ade80; }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }

  :root {
    --background: #020d05; --foreground: #e2ffe9;
    --card: #0a1e0f; --card-foreground: #e2ffe9;
    --popover: #0a1e0f; --popover-foreground: #e2ffe9;
    --primary: #4ade80; --primary-foreground: #020d05;
    --secondary: #051a0a; --secondary-foreground: #e2ffe9;
    --muted: #051a0a; --muted-foreground: rgba(255,255,255,0.35);
    --accent: #051a0a; --accent-foreground: #4ade80;
    --destructive: #f87171; --border: rgba(74,222,128,0.12);
    --input: rgba(74,222,128,0.08); --ring: #4ade80; --radius: 0.625rem;
    --sidebar: #030f07; --sidebar-foreground: #e2ffe9;
    --sidebar-primary: #4ade80; --sidebar-primary-foreground: #020d05;
    --sidebar-accent: rgba(74,222,128,0.08); --sidebar-accent-foreground: #4ade80;
    --sidebar-border: rgba(74,222,128,0.07); --sidebar-ring: #4ade80;
  }
  * { @apply border-border; }
  .maplibregl-popup-content { @apply bg-transparent! shadow-none! p-0! rounded-none!; }
  .maplibregl-popup-tip { @apply hidden!; }
}

/* ── Components ───────────────────────────────────────────────────────────── */
@layer components {

  /* ── Buttons ── */
  .btn {
    @apply inline-flex items-center justify-center gap-2 font-semibold rounded-2xl
           transition-all duration-200 cursor-pointer select-none
           focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-400
           disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none;
  }
  .btn-sm  { @apply btn px-3 py-1.5 text-xs; }
  .btn-md  { @apply btn px-4 py-2.5 text-sm; }
  .btn-lg  { @apply btn px-6 py-3 text-base; }

  .btn-primary {
    @apply btn text-sm px-4 py-2.5;
    background: #4ade80;
    color: #020d05;
    font-weight: 700;
    box-shadow: 0 0 16px rgba(74,222,128,0.25);
  }
  .btn-primary:hover {
    background: #86efac;
    box-shadow: 0 0 24px rgba(74,222,128,0.4);
    transform: translateY(-1px);
  }
  .btn-secondary {
    @apply btn text-sm px-4 py-2.5;
    background: rgba(74,222,128,0.06);
    border: 1px solid rgba(74,222,128,0.15);
    color: rgba(255,255,255,0.7);
  }
  .btn-secondary:hover { background: rgba(74,222,128,0.10); color: #e2ffe9; }
  .btn-ghost {
    @apply btn bg-transparent text-sm px-4 py-2.5;
    color: rgba(255,255,255,0.5);
  }
  .btn-ghost:hover { background: rgba(74,222,128,0.06); color: #e2ffe9; }
  .btn-danger {
    @apply btn text-sm px-4 py-2.5;
    background: rgba(248,113,113,0.08);
    border: 1px solid rgba(248,113,113,0.2);
    color: #f87171;
  }
  .btn-danger:hover { background: rgba(248,113,113,0.15); }
  .btn-icon {
    @apply btn w-9 h-9 p-0 rounded-xl;
    background: rgba(74,222,128,0.06);
    border: 1px solid rgba(74,222,128,0.12);
    color: rgba(255,255,255,0.5);
  }
  .btn-icon:hover { background: rgba(74,222,128,0.10); color: #e2ffe9; }

  /* ── Cards ── */
  .card {
    background: #0a1e0f;
    border: 1px solid rgba(74,222,128,0.12);
    border-radius: 14px;
  }
  .card-hover {
    @apply card cursor-pointer transition-all duration-200;
  }
  .card-hover:hover {
    border-color: rgba(74,222,128,0.22);
    box-shadow: 0 0 0 1px rgba(74,222,128,0.08), 0 8px 32px rgba(0,0,0,0.5);
    transform: translateY(-1px);
  }
  .card-glass      { @apply card; backdrop-filter: blur(12px); }
  .card-glass-dark { @apply card; backdrop-filter: blur(12px); }

  /* Biopunk utilities */
  .biopunk-card    { background: #0a1e0f; border: 1px solid rgba(74,222,128,0.12); border-radius: 14px; }
  .biopunk-surface { background: #051a0a; }
  .biopunk-label   { font-family: 'JetBrains Mono', monospace; font-size: 9px; letter-spacing: 2px; text-transform: uppercase; color: rgba(255,255,255,0.35); }
  .biopunk-value   { font-family: 'JetBrains Mono', monospace; font-size: 28px; font-weight: 700; color: #e2ffe9; }

  /* ── Inputs ── */
  .input-field {
    width: 100%;
    border: 1px solid rgba(74,222,128,0.15);
    border-radius: 10px;
    padding: 0.6rem 1rem;
    font-size: 0.875rem;
    background: #0a1e0f;
    color: #e2ffe9;
  }
  .input-field::placeholder { color: rgba(255,255,255,0.25); }
  .input-field:focus { outline: none; border-color: rgba(74,222,128,0.45); box-shadow: 0 0 0 3px rgba(74,222,128,0.08); }

  .input-field-dark {
    width: 100%;
    border: 1px solid rgba(74,222,128,0.15);
    border-radius: 10px;
    padding: 0.65rem 1rem;
    font-size: 0.875rem;
    background: #0a1e0f;
    color: #e2ffe9;
  }
  .input-field-dark::placeholder { color: rgba(255,255,255,0.25); }
  .input-field-dark:focus { outline: none; border-color: rgba(74,222,128,0.45); box-shadow: 0 0 0 3px rgba(74,222,128,0.08); }

  /* ── Badges ── */
  .badge        { display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.7rem; font-weight: 500; padding: 0.15rem 0.5rem; border-radius: 9999px; font-family: 'JetBrains Mono', monospace; }
  .badge-green  { @apply badge; background: rgba(74,222,128,0.1); color: #4ade80; border: 1px solid rgba(74,222,128,0.2); }
  .badge-cyan   { @apply badge; background: rgba(34,211,238,0.1); color: #22d3ee; border: 1px solid rgba(34,211,238,0.2); }
  .badge-blue   { @apply badge; background: rgba(34,211,238,0.1); color: #22d3ee; border: 1px solid rgba(34,211,238,0.2); }
  .badge-yellow { @apply badge; background: rgba(245,158,11,0.1); color: #f59e0b; border: 1px solid rgba(245,158,11,0.2); }
  .badge-red    { @apply badge; background: rgba(248,113,113,0.1); color: #f87171; border: 1px solid rgba(248,113,113,0.2); }
  .badge-gray   { @apply badge; background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.4); border: 1px solid rgba(255,255,255,0.08); }
  .badge-purple { @apply badge; background: rgba(167,139,250,0.1); color: #a78bfa; border: 1px solid rgba(167,139,250,0.2); }
  .badge-teal   { @apply badge; background: rgba(34,211,238,0.1); color: #22d3ee; border: 1px solid rgba(34,211,238,0.2); }

  /* ── Section headings ── */
  .section-title    { font-size: 1.125rem; font-weight: 600; color: #e2ffe9; font-family: 'Space Grotesk', sans-serif; }
  .section-subtitle { font-size: 0.8rem; color: rgba(255,255,255,0.35); margin-top: 0.15rem; font-family: 'JetBrains Mono', monospace; }

  /* ── Page container ── */
  .page-container { @apply space-y-5 max-w-[1600px] mx-auto; }

  /* ── Stat tile ── */
  .stat-tile  { @apply card p-4 flex flex-col gap-2 cursor-default transition-all duration-200; }
  .stat-tile:hover { border-color: rgba(74,222,128,0.22); }
  .stat-value { font-family: 'JetBrains Mono', monospace; font-size: 1.75rem; font-weight: 700; color: #e2ffe9; }
  .stat-label { font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; color: rgba(255,255,255,0.35); text-transform: uppercase; letter-spacing: 0.1em; }
  .stat-delta-up   { font-size: 0.7rem; font-weight: 600; color: #4ade80; }
  .stat-delta-down { font-size: 0.7rem; font-weight: 600; color: #f87171; }

  /* ── Sidebar nav item ── */
  .nav-item {
    display: flex; align-items: center; gap: 0.75rem;
    padding: 0.625rem 1rem; border-radius: 10px; font-size: 0.8125rem;
    font-weight: 500; cursor: pointer; transition: all 0.15s ease;
    color: rgba(255,255,255,0.35); width: 100%;
    border-left: 2px solid transparent;
  }
  .nav-item:hover { background: rgba(74,222,128,0.06); color: rgba(255,255,255,0.75); }
  .nav-item-active {
    @apply nav-item;
    background: rgba(74,222,128,0.08);
    color: #4ade80;
    border-left-color: #4ade80;
    box-shadow: inset 0 0 12px rgba(74,222,128,0.04);
  }

  /* ── Empty state ── */
  .empty-state       { @apply flex flex-col items-center justify-center py-16 text-center; }
  .empty-state-icon  { color: rgba(74,222,128,0.25); margin-bottom: 0.75rem; }
  .empty-state-title { color: rgba(255,255,255,0.5); font-weight: 500; margin-bottom: 0.25rem; }
  .empty-state-sub   { color: rgba(255,255,255,0.25); font-size: 0.875rem; }

  /* ── Skeleton loader ── */
  .skeleton {
    background: linear-gradient(90deg, #0a1e0f 25%, #0d2614 50%, #0a1e0f 75%);
    background-size: 200% 100%;
    animation: shimmer 2s linear infinite;
    border-radius: 14px;
  }

  /* ── Table ── */
  .data-table    { width: 100%; font-size: 0.875rem; }
  .data-table th { font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; font-weight: 600; color: rgba(255,255,255,0.35); text-transform: uppercase; letter-spacing: 0.1em; padding: 0.75rem 1rem; text-align: left; background: rgba(74,222,128,0.03); }
  .data-table td { padding: 0.75rem 1rem; color: rgba(255,255,255,0.75); border-top: 1px solid rgba(74,222,128,0.06); }
  .data-table tr:hover td { background: rgba(74,222,128,0.03); }

  /* ── Alert strip ── */
  .alert-strip   { @apply flex items-start gap-3 px-4 py-3 rounded-2xl text-sm font-medium; }
  .alert-warning { @apply alert-strip; background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.2); color: #f59e0b; }
  .alert-danger  { @apply alert-strip; background: rgba(248,113,113,0.08); border: 1px solid rgba(248,113,113,0.2); color: #f87171; }
  .alert-success { @apply alert-strip; background: rgba(74,222,128,0.08); border: 1px solid rgba(74,222,128,0.2); color: #4ade80; }
  .alert-info    { @apply alert-strip; background: rgba(34,211,238,0.08); border: 1px solid rgba(34,211,238,0.2); color: #22d3ee; }

  /* ── Live dot ── */
  .live-dot { @apply relative flex h-2.5 w-2.5; }
  .live-dot::before { content: ''; @apply absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping-slow; }
  .live-dot::after  { content: ''; @apply relative inline-flex h-2.5 w-2.5 rounded-full bg-green-400; }
}

/* ── Utility overrides ────────────────────────────────────────────────────── */
@layer utilities {
  .text-balance   { text-wrap: balance; }
  .scrollbar-none { scrollbar-width: none; }
  .scrollbar-none::-webkit-scrollbar { display: none; }
  .blur-xs        { backdrop-filter: blur(2px); }

  .glass-white { background: rgba(255,255,255,0.05); backdrop-filter: blur(16px); }
  .glass-dark  { background: rgba(2,13,5,0.90); backdrop-filter: blur(20px); }

  .sidebar-bg  { background: #030f07; }

  .text-gradient-green {
    background: linear-gradient(135deg, #4ade80, #22d3ee);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  }
  .text-gradient-gold {
    background: linear-gradient(135deg, #f59e0b, #fbbf24);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  }
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```
cd "frontend AgroPulse" && npm run build
```

Expected: build completes without TypeScript errors. (Warnings about existing code are OK.)

- [ ] **Step 5: Commit**

```bash
git add src/styles/tokens.ts tailwind.config.js src/index.css
git commit -m "feat(design): biopunk token system, tailwind config, CSS foundation"
```

---

## Task 2: BotanicalSvg Component

**Files:**
- Create: `src/components/ui/BotanicalSvg.tsx`

- [ ] **Step 1: Create `src/components/ui/BotanicalSvg.tsx`**

```typescript
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```
npm run build
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/BotanicalSvg.tsx
git commit -m "feat(ui): add BotanicalSvg component with anime.js sway animation"
```

---

## Task 3: SensorCard Redesign

**Files:**
- Modify: `src/components/SensorCard.tsx`

The current SensorCard uses a light theme. Replace the entire file. The count-up animation logic (anime.js `obj.val`) is preserved exactly.

- [ ] **Step 1: Replace `src/components/SensorCard.tsx`**

```typescript
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```
npm run build
```

Expected: no errors. (Dashboard.tsx will warn about `color` prop being deprecated — that's fine; it still compiles because `color` is kept as an optional prop.)

- [ ] **Step 3: Commit**

```bash
git add src/components/SensorCard.tsx
git commit -m "feat(ui): biopunk SensorCard with ECG animation, pulse dot, botanical corner"
```

---

## Task 4: PageHeader Component

**Files:**
- Create: `src/components/ui/PageHeader.tsx`

- [ ] **Step 1: Create `src/components/ui/PageHeader.tsx`**

```typescript
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```
npm run build
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/PageHeader.tsx
git commit -m "feat(ui): add PageHeader component with botanical watermark and entrance animation"
```

---

## Task 5: App Shell Redesign

**Files:**
- Modify: `src/App.tsx`

The data/auth logic is untouched. Changes are:
1. Add a local `LogoMarkSvg` component (inline SVG emblem)
2. Replace the Sprout icon + gradient logo with LogoMarkSvg + biopunk text
3. Update sidebar and header inline color classes
4. Update `AuthLoadingScreen` background

- [ ] **Step 1: Add `LogoMarkSvg` to `src/App.tsx`**

After the last import line in `src/App.tsx`, add this component definition (before the `ADMIN_GROUPS` constant):

```typescript
function LogoMarkSvg() {
  return (
    <svg width="28" height="28" viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <defs><clipPath id="lmClip"><circle cx="28" cy="28" r="26"/></clipPath></defs>
      <circle cx="28" cy="28" r="27" fill="#020d05" stroke="rgba(74,222,128,0.4)" strokeWidth="1.2"/>
      <g clipPath="url(#lmClip)">
        <rect x="2" y="2" width="52" height="52" fill="#071209"/>
        <path d="M 8 31 A 20 20 0 0 1 48 31 Z" fill="#f59e0b"/>
        <ellipse cx="28" cy="31" rx="16" ry="4" fill="rgba(251,191,36,0.22)"/>
        <path d="M 2 31 Q 15 26 28 30 Q 41 34 54 31 L 54 54 L 2 54 Z" fill="#14532d"/>
        <path d="M 2 36 Q 15 32 28 35 Q 41 38 54 36 L 54 54 L 2 54 Z" fill="#166534"/>
        <path d="M 2 41 Q 15 38 28 40 Q 41 42 54 41 L 54 54 L 2 54 Z" fill="#15803d"/>
        <path d="M 11 27 Q 5 20 9 13 Q 16 16 11 27 Z" fill="#22c55e" opacity="0.8"/>
        <path d="M 45 27 Q 51 20 47 13 Q 40 16 45 27 Z" fill="#22c55e" opacity="0.8"/>
        <path d="M 4 31 L 13 31 L 16 23 L 20 39 L 24 31 L 28 31 L 31 25 L 34 37 L 37 31 L 52 31"
              stroke="#f87171" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      </g>
    </svg>
  )
}
```

- [ ] **Step 2: Update the sidebar logo section in `src/App.tsx`**

Find the sidebar logo block (the `<div className="px-4 pt-5 pb-4 border-b border-sidebar-border">` div containing the Sprout icon). Replace the inner logo content:

**Find:**
```tsx
<div className="flex items-center gap-2.5">
  <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-glow-sm">
    <Sprout size={16} className="text-white" />
  </div>
  <div>
    <span className="text-base font-bold text-white font-heading tracking-tight">AgroPulse</span>
    <span className="ml-2 text-[9px] font-medium bg-green-500/20 text-green-300 px-1.5 py-0.5 rounded-md">v10</span>
  </div>
</div>
```

**Replace with:**
```tsx
<div className="flex items-center gap-2.5">
  <LogoMarkSvg />
  <div>
    <span className="text-base font-bold font-heading tracking-tight" style={{ color: '#e2ffe9' }}>
      Agro<span style={{ color: '#f97316' }}>Pulse</span>
    </span>
    <span className="ml-2 text-[9px] font-medium px-1.5 py-0.5 rounded-md"
          style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)' }}>
      v10
    </span>
  </div>
</div>
```

- [ ] **Step 3: Update `AuthLoadingScreen` background in `src/App.tsx`**

Find:
```tsx
style={{ background: 'linear-gradient(135deg, #0A150D 0%, #162A1C 60%, #0D1F12 100%)' }}
```

Replace with:
```tsx
style={{ background: '#020d05' }}
```

(There are two of these — one in `AuthLoadingScreen` and one in the "Verificando acceso" loading state inside `AppInner`. Update both.)

- [ ] **Step 4: Update header background in `src/App.tsx`**

Find:
```tsx
className="sticky top-0 z-20 lg:ml-64 bg-[#0A150D]/90 backdrop-blur-md
           border-b border-white/10"
```

Replace with:
```tsx
className="sticky top-0 z-20 lg:ml-64 backdrop-blur-md"
style={{ background: 'rgba(2,13,5,0.92)', borderBottom: '1px solid rgba(74,222,128,0.08)' }}
```

Note: since JSX doesn't allow both `className` and `style` on a single line in some editors, split it across two lines:

```tsx
<header
  className="sticky top-0 z-20 lg:ml-64 backdrop-blur-md"
  style={{ background: 'rgba(2,13,5,0.92)', borderBottom: '1px solid rgba(74,222,128,0.08)' }}
>
```

- [ ] **Step 5: Remove the `Sprout` import from App.tsx if it's no longer used**

Check that `Sprout` is not used elsewhere in the file. If only the logo section used it, remove it from the `lucide-react` import line.

- [ ] **Step 6: Verify TypeScript compiles**

```
npm run build
```

Expected: no errors.

- [ ] **Step 7: Start dev server and verify sidebar logo and header look correct**

```
npm run dev
```

Open http://localhost:5173, log in. Verify:
- Sidebar background is `#030f07` (very dark green-black)
- Logo shows the circular emblem SVG + "AgroPulse" with orange "Pulse"
- Active nav item has a green left border and subtle green bg
- Page header has `rgba(2,13,5,0.92)` dark background

- [ ] **Step 8: Commit**

```bash
git add src/App.tsx
git commit -m "feat(shell): biopunk sidebar logo, nav colors, header styling"
```

---

## Task 6: LoginPage Redesign

**Files:**
- Modify: `src/pages/LoginPage.tsx`

Changes:
- Background: remove `bg-gradient-nature`, use `#020d05` with dot grid
- Remove floating blobs (blobRef1, blobRef2, blobRef3) — replace with botanical SVG decorations
- Replace gsap card entrance with anime.js
- Card: use biopunk dark card styling
- Update logo: replace Sprout + gradient with LogoMark SVG

The business logic (login/register/verify handlers) is completely preserved.

- [ ] **Step 1: Update imports in `src/pages/LoginPage.tsx`**

Remove `gsap` import. Add `BotanicalSvg` import:

**Find:**
```typescript
import gsap from 'gsap'
```

**Replace with:**
```typescript
import BotanicalSvg from '../components/ui/BotanicalSvg'
```

- [ ] **Step 2: Remove blob refs and add logo ref in `src/pages/LoginPage.tsx`**

Find and remove the three blob refs:
```typescript
const blobRef1   = useRef<HTMLDivElement>(null)
const blobRef2   = useRef<HTMLDivElement>(null)
const blobRef3   = useRef<HTMLDivElement>(null)
```

Keep `cardRef`, `verifyRef`, `digitRefs`.

- [ ] **Step 3: Replace mount animation useEffect (gsap → anime.js)**

Find the mount animation `useEffect` (the one that does `gsap.timeline()` and blob animations):

```typescript
useEffect(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) return

  const tl = gsap.timeline()
  tl.from(cardRef.current, {
    opacity: 0, scale: 0.9, y: 32, duration: 0.75, ease: 'power3.out',
  })

  ;[blobRef1, blobRef2, blobRef3].forEach((ref, i) => {
    if (!ref.current) return
    anime({
      targets: ref.current, translateY: [0, -16 + i * 5],
      duration: 4000 + i * 800, direction: 'alternate', loop: true, easing: 'easeInOutSine', delay: i * 600,
    })
  })

  return () => { gsap.killTweensOf(cardRef.current) }
}, [])
```

Replace with:
```typescript
useEffect(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) return
  anime({
    targets: cardRef.current,
    opacity: [0, 1],
    scale: [0.92, 1],
    translateY: [24, 0],
    duration: 600,
    easing: 'easeOutCubic',
  })
}, [])
```

- [ ] **Step 4: Replace the entire JSX `return` block**

Replace everything from `return (` down to the end of the component with:

```tsx
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
         style={{ background: '#020d05' }}>

      {/* Dot grid overlay */}
      <div className="absolute inset-0 pointer-events-none"
           style={{ backgroundImage: 'radial-gradient(rgba(74,222,128,0.15) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

      {/* Botanical decoration — desktop right side */}
      <div className="absolute right-12 top-1/2 -translate-y-1/2 hidden lg:block pointer-events-none" style={{ opacity: 0.35 }}>
        <BotanicalSvg size={280} color="#4ade80" animate />
      </div>
      <div className="absolute left-12 bottom-12 hidden lg:block pointer-events-none" style={{ opacity: 0.18 }}>
        <BotanicalSvg size={160} color="#22d3ee" animate />
      </div>

      {/* Login card */}
      <div ref={cardRef} className="relative z-10 w-full max-w-md" style={{ opacity: 0 }}>
        <div className="rounded-[24px] overflow-hidden"
             style={{ background: '#0a1e0f', border: '1px solid rgba(74,222,128,0.15)', boxShadow: '0 0 60px rgba(0,0,0,0.8)' }}>

          {/* Header */}
          <div className="pt-8 pb-6 px-8 text-center" style={{ borderBottom: '1px solid rgba(74,222,128,0.08)' }}>
            {/* Logo mark SVG */}
            <div className="flex justify-center mb-4">
              <svg width="56" height="56" viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg">
                <defs><clipPath id="loginLogoClip"><circle cx="28" cy="28" r="26"/></clipPath></defs>
                <circle cx="28" cy="28" r="27" fill="#020d05" stroke="rgba(74,222,128,0.4)" strokeWidth="1.2"/>
                <g clipPath="url(#loginLogoClip)">
                  <rect x="2" y="2" width="52" height="52" fill="#071209"/>
                  <path d="M 8 31 A 20 20 0 0 1 48 31 Z" fill="#f59e0b"/>
                  <ellipse cx="28" cy="31" rx="16" ry="4" fill="rgba(251,191,36,0.22)"/>
                  <path d="M 2 31 Q 15 26 28 30 Q 41 34 54 31 L 54 54 L 2 54 Z" fill="#14532d"/>
                  <path d="M 2 36 Q 15 32 28 35 Q 41 38 54 36 L 54 54 L 2 54 Z" fill="#166534"/>
                  <path d="M 2 41 Q 15 38 28 40 Q 41 42 54 41 L 54 54 L 2 54 Z" fill="#15803d"/>
                  <path d="M 11 27 Q 5 20 9 13 Q 16 16 11 27 Z" fill="#22c55e" opacity="0.8"/>
                  <path d="M 45 27 Q 51 20 47 13 Q 40 16 45 27 Z" fill="#22c55e" opacity="0.8"/>
                  <path d="M 4 31 L 13 31 L 16 23 L 20 39 L 24 31 L 28 31 L 31 25 L 34 37 L 37 31 L 52 31"
                        stroke="#f87171" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </g>
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-1" style={{ color: '#e2ffe9', fontFamily: "'Space Grotesk', sans-serif" }}>
              Agro<span style={{ color: '#f97316' }}>Pulse</span>
            </h1>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'JetBrains Mono', monospace" }}>
              Sistema Inteligente de Invernaderos
            </p>
          </div>

          {/* Tabs — hidden when verifying */}
          {!verifying && (
            <div className="px-6 pt-5">
              <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.1)' }}>
                {tabs.map(t => (
                  <button
                    key={t.id}
                    onClick={() => switchTab(t.id)}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer"
                    style={tab === t.id
                      ? { background: '#4ade80', color: '#020d05', fontFamily: "'JetBrains Mono', monospace" }
                      : { color: 'rgba(255,255,255,0.35)', fontFamily: "'JetBrains Mono', monospace" }
                    }
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Body */}
          <div className="px-6 pb-8 pt-5">
            {verifying ? (
              <div ref={verifyRef} className="space-y-5">
                <div className="text-center space-y-1">
                  <div className="w-12 h-12 mx-auto rounded-2xl flex items-center justify-center mb-3"
                       style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)' }}>
                    <Mail size={20} style={{ color: '#4ade80' }} />
                  </div>
                  <h3 className="text-base font-bold" style={{ color: '#e2ffe9' }}>Verifica tu email</h3>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    Cuenta creada para <span style={{ color: '#4ade80' }}>{savedCreds.email}</span>
                  </p>
                </div>
                {emailSent ? (
                  <div className="rounded-2xl p-4 text-center space-y-1"
                       style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)' }}>
                    <Mail size={18} className="mx-auto mb-2" style={{ color: '#4ade80' }} />
                    <p className="text-sm font-semibold" style={{ color: '#4ade80' }}>Código enviado a tu correo</p>
                    <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      Revisa tu bandeja de entrada (y spam) en <span style={{ color: '#4ade80' }}>{savedCreds.email}</span>
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl p-4 text-center" style={{ background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.1)' }}>
                    <p className="text-[10px] uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.35)', fontFamily: "'JetBrains Mono', monospace" }}>
                      Tu código de verificación
                    </p>
                    <div className="flex justify-center gap-2">
                      {verifyCode.split('').map((d, i) => (
                        <div key={i} className="w-9 h-11 rounded-xl flex items-center justify-center text-xl font-bold font-mono"
                             style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)', color: '#4ade80' }}>
                          {d}
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] mt-3" style={{ color: 'rgba(255,255,255,0.25)' }}>Introdúcelo en los campos de abajo</p>
                  </div>
                )}
                {error && (
                  <div className="alert-danger">{error}</div>
                )}
                <form onSubmit={handleVerify} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold mb-2 text-center uppercase tracking-wide"
                           style={{ color: 'rgba(255,255,255,0.5)', fontFamily: "'JetBrains Mono', monospace" }}>
                      Ingresa el código
                    </label>
                    <div className="flex justify-center gap-2">
                      {codeDigits.map((d, i) => (
                        <input
                          key={i}
                          ref={el => { digitRefs.current[i] = el }}
                          type="text" inputMode="numeric" maxLength={1} value={d}
                          onChange={e => handleDigit(i, e.target.value)}
                          onKeyDown={e => handleDigitKey(i, e)}
                          className="w-10 h-12 text-center text-lg font-bold font-mono rounded-xl transition-all"
                          style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)', color: '#e2ffe9' }}
                        />
                      ))}
                    </div>
                  </div>
                  <button type="submit" disabled={loading} className="w-full btn-primary py-3 text-sm">
                    {loading
                      ? <><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />Verificando…</>
                      : <><span>Confirmar y acceder</span><ArrowRight size={16} /></>}
                  </button>
                  <button type="button" onClick={() => { setVerifying(false); setTab('register'); setError('') }}
                          className="w-full text-xs py-1 transition-colors"
                          style={{ color: 'rgba(255,255,255,0.25)' }}>
                    ← Volver al registro
                  </button>
                </form>
              </div>
            ) : (
              <div id="login-form-content">
                {success && <div className="mb-4 alert-success">{success}</div>}
                {error   && <div className="mb-4 alert-danger">{error}</div>}

                {/* Local Login */}
                {tab === 'local' && (
                  <form onSubmit={handleLocalLogin} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold mb-2 uppercase tracking-wide"
                             style={{ color: 'rgba(255,255,255,0.5)', fontFamily: "'JetBrains Mono', monospace" }}>Usuario</label>
                      <div className="relative">
                        <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.25)' }} />
                        <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                               placeholder="admin" disabled={loading}
                               className="input-field-dark pl-10" autoComplete="username" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-2 uppercase tracking-wide"
                             style={{ color: 'rgba(255,255,255,0.5)', fontFamily: "'JetBrains Mono', monospace" }}>Contraseña</label>
                      <div className="relative">
                        <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.25)' }} />
                        <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                               placeholder="••••••••" disabled={loading}
                               className="input-field-dark pl-10 pr-10" autoComplete="current-password" />
                        <button type="button" onClick={() => setShowPass(v => !v)}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer transition-colors"
                                style={{ color: 'rgba(255,255,255,0.25)' }}>
                          {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>
                    <button type="submit" disabled={loading} className="w-full btn-primary py-3 text-sm mt-2">
                      {loading
                        ? <><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />Verificando…</>
                        : <><span>Ingresar</span><ArrowRight size={16} /></>}
                    </button>
                    <p className="text-center text-[11px] pt-1" style={{ color: 'rgba(255,255,255,0.25)', fontFamily: "'JetBrains Mono', monospace" }}>
                      Puede tardar ~1 min si el servidor está en reposo
                    </p>
                  </form>
                )}

                {/* Register */}
                {tab === 'register' && (
                  <form onSubmit={handleRegister} className="space-y-3">
                    {[
                      { label: 'Nombre completo', val: regName,  set: setRegName,  ph: 'Tu nombre',            type: 'text',     req: false },
                      { label: 'Email *',          val: regEmail, set: setRegEmail, ph: 'tu@email.com',         type: 'email',    req: true  },
                      { label: 'Usuario *',        val: regUser,  set: setRegUser,  ph: 'usuario123',           type: 'text',     req: true  },
                      { label: 'Contraseña *',     val: regPass,  set: setRegPass,  ph: 'Mínimo 6 caracteres',  type: 'password', req: true  },
                      { label: 'Confirmar *',      val: regPass2, set: setRegPass2, ph: 'Repite la contraseña', type: 'password', req: true  },
                    ].map(field => (
                      <div key={field.label}>
                        <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide"
                               style={{ color: 'rgba(255,255,255,0.5)', fontFamily: "'JetBrains Mono', monospace" }}>
                          {field.label}
                        </label>
                        <input type={field.type} value={field.val} onChange={e => field.set(e.target.value)}
                               placeholder={field.ph} required={field.req} className="input-field-dark" />
                      </div>
                    ))}
                    <button type="submit" disabled={loading} className="w-full btn-primary py-3 text-sm mt-1">
                      {loading
                        ? <><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />Creando…</>
                        : 'Crear cuenta'}
                    </button>
                    <p className="text-center text-[11px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                      Tu cuenta será asignada a un invernadero por el administrador
                    </p>
                  </form>
                )}

                {/* Google */}
                {tab === 'google' && (
                  <div className="space-y-4 pt-2">
                    <p className="text-sm text-center" style={{ color: 'rgba(255,255,255,0.4)' }}>Accede con tu cuenta de Google</p>
                    <button onClick={handleGoogleLogin} disabled={loading}
                            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-700 font-semibold py-3 rounded-2xl transition-all duration-200 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transform-gpu disabled:opacity-50">
                      {loading
                        ? <><div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />Conectando...</>
                        : <>
                            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                            </svg>
                            Continuar con Google
                          </>}
                    </button>
                    <p className="text-[11px] text-center" style={{ color: 'rgba(255,255,255,0.25)' }}>Se abrirá una ventana del navegador</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <p className="text-center text-[11px] mt-5" style={{ color: 'rgba(255,255,255,0.18)', fontFamily: "'JetBrains Mono', monospace" }}>
          © Universidad Cooperativa de Colombia · Nariño
        </p>
      </div>
    </div>
  )
```

- [ ] **Step 5: Verify TypeScript compiles and check for unused imports**

```
npm run build
```

If there's an error about `gsap` being imported but not used, the import was already removed in Step 1. Check that `Chrome` from lucide-react isn't used (it's in the current imports but the Google button uses an inline SVG — remove `Chrome` from the lucide import if not used elsewhere).

- [ ] **Step 6: Visual check**

```
npm run dev
```

Open login page. Verify: dark `#020d05` background, dot grid visible, botanical SVGs on right (desktop), biopunk card with orange-highlighted "Pulse" in the heading, green tab bar, dark inputs with green focus ring.

- [ ] **Step 7: Commit**

```bash
git add src/pages/LoginPage.tsx
git commit -m "feat(login): biopunk card, botanical decoration, replace gsap with anime.js"
```

---

## Task 7: Dashboard Redesign

**Files:**
- Modify: `src/pages/Dashboard.tsx`

Changes:
- Update `SensorMeta` interface: `color: string` → `accent: AccentColor`
- Update `SENSOR_META` values to use new accent colors
- Import and add `PageHeader` component
- Update sensor card render call (remove `color`, add `accent`)
- Update chart colors (CartesianGrid, Line, axes)
- Update greenhouse selector and stat area styling

- [ ] **Step 1: Add imports to `src/pages/Dashboard.tsx`**

Add to the import section:
```typescript
import PageHeader from '../components/ui/PageHeader'
import type { AccentColor } from '../styles/tokens'
```

- [ ] **Step 2: Update `SensorMeta` interface and `SENSOR_META` in `src/pages/Dashboard.tsx`**

Find:
```typescript
interface SensorMeta { label: string; unit: string; icon: LucideIcon; color: string }

const SENSOR_META: Record<string, SensorMeta> = {
  TEMPERATURE_INTERNAL: { label: 'Temp. Interior',   unit: '°C',  icon: Thermometer, color: 'bg-orange-500' },
  TEMPERATURE_EXTERNAL: { label: 'Temp. Exterior',   unit: '°C',  icon: Thermometer, color: 'bg-blue-500'   },
  TEMPERATURE:          { label: 'Temperatura',      unit: '°C',  icon: Thermometer, color: 'bg-orange-500' },
  HUMIDITY:             { label: 'Humedad Interior', unit: '%',   icon: Droplets,    color: 'bg-cyan-500'   },
  HUMIDITY_EXTERNAL:    { label: 'Humedad Exterior', unit: '%',   icon: Droplets,    color: 'bg-sky-500'    },
  SOIL_MOISTURE:        { label: 'Humedad Suelo',    unit: '%',   icon: Leaf,        color: 'bg-green-600'  },
  LIGHT:                { label: 'Luminosidad',      unit: 'lx',  icon: Sun,         color: 'bg-yellow-500' },
  CO2:                  { label: 'CO₂',              unit: 'ppm', icon: Activity,    color: 'bg-purple-500' },
}
```

Replace with:
```typescript
interface SensorMeta { label: string; unit: string; icon: LucideIcon; accent: AccentColor }

const SENSOR_META: Record<string, SensorMeta> = {
  TEMPERATURE_INTERNAL: { label: 'Temp. Interior',   unit: '°C',  icon: Thermometer, accent: 'red'   },
  TEMPERATURE_EXTERNAL: { label: 'Temp. Exterior',   unit: '°C',  icon: Thermometer, accent: 'cyan'  },
  TEMPERATURE:          { label: 'Temperatura',      unit: '°C',  icon: Thermometer, accent: 'red'   },
  HUMIDITY:             { label: 'Humedad Interior', unit: '%',   icon: Droplets,    accent: 'cyan'  },
  HUMIDITY_EXTERNAL:    { label: 'Humedad Exterior', unit: '%',   icon: Droplets,    accent: 'cyan'  },
  SOIL_MOISTURE:        { label: 'Humedad Suelo',    unit: '%',   icon: Leaf,        accent: 'lime'  },
  LIGHT:                { label: 'Luminosidad',      unit: 'lx',  icon: Sun,         accent: 'lime'  },
  CO2:                  { label: 'CO₂',              unit: 'ppm', icon: Activity,    accent: 'green' },
}
```

- [ ] **Step 3: Update the fallback meta and SensorCard render call in `src/pages/Dashboard.tsx`**

Find:
```typescript
const meta = SENSOR_META[type] ?? { label: type, unit: '', icon: Activity, color: 'bg-gray-500' }
```
Replace with:
```typescript
const meta = SENSOR_META[type] ?? { label: type, unit: '', icon: Activity, accent: 'green' as AccentColor }
```

Find:
```tsx
<SensorCard key={r.sensorId} icon={meta.icon} label={meta.label} unit={meta.unit}
  value={r.value} color={meta.color} min={min} max={max} />
```
Replace with:
```tsx
<SensorCard key={r.sensorId} icon={meta.icon} label={meta.label} unit={meta.unit}
  value={r.value} accent={meta.accent} min={min} max={max} />
```

- [ ] **Step 4: Replace the Dashboard header block with PageHeader in `src/pages/Dashboard.tsx`**

Find:
```tsx
{/* Header */}
<div className="flex items-start justify-between gap-3">
  <div>
    <h2 className="section-title">Panel de Control</h2>
    <p className="section-subtitle">
      {crop ? `Cultivo activo: ${crop.name}` : 'Sin cultivo activo'}
      {lastUpdate && ` · ${lastUpdate}`}
    </p>
  </div>
  <button onClick={loadData} className="btn-primary px-4 py-2 text-sm shrink-0">
    <RefreshCw size={14} />
    Actualizar
  </button>
</div>
```

Replace with:
```tsx
<PageHeader
  title="Panel de Control"
  subtitle={crop ? `Cultivo activo: ${crop.name}${lastUpdate ? ' · ' + lastUpdate : ''}` : lastUpdate ?? undefined}
  action={
    <button onClick={loadData} className="btn-primary px-4 py-2 text-sm shrink-0">
      <RefreshCw size={14} />
      Actualizar
    </button>
  }
/>
```

- [ ] **Step 5: Update the greenhouse selector styling**

Find:
```tsx
<span className="text-sm text-gray-500 font-medium shrink-0">Invernadero</span>
```
Replace with:
```tsx
<span className="text-sm font-medium shrink-0 font-mono" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>Invernadero</span>
```

Find:
```tsx
className="appearance-none input-field py-2 pr-8 text-sm font-medium"
```
Replace with:
```tsx
className="appearance-none input-field py-2 pr-8 text-sm font-medium"
```
(No change needed here — `input-field` is now biopunk-styled from Task 1.)

- [ ] **Step 6: Update Recharts chart colors**

Find the `<LineChart>` / `<CartesianGrid>` / `<Line>` section. Update:

```tsx
<CartesianGrid strokeDasharray="3 3" stroke="rgba(74,222,128,0.06)" />
<XAxis dataKey="time" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
<YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
<Tooltip contentStyle={{ background: '#0a1e0f', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 10, color: '#e2ffe9', fontFamily: 'JetBrains Mono' }} />
<Line type="monotone" dataKey="temp" stroke="#4ade80" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#4ade80' }} />
```

- [ ] **Step 7: Update chart container background**

Find the `<div>` wrapping the `<ResponsiveContainer>`. Add a dark background:
```tsx
<div className="rounded-[14px] p-4" style={{ background: '#0a1e0f', border: '1px solid rgba(74,222,128,0.1)' }}>
  <ResponsiveContainer ...>
    ...
  </ResponsiveContainer>
</div>
```

- [ ] **Step 8: Verify TypeScript compiles**

```
npm run build
```

Expected: no errors.

- [ ] **Step 9: Visual check**

```
npm run dev
```

Navigate to Dashboard. Verify:
- PageHeader visible at top with "Panel de Control" in Space Grotesk
- Sensor cards are dark biopunk style with accent colors (red for temperature, cyan for humidity, etc.)
- Line chart has dark background and green line
- Greenhouse selector is dark-styled

- [ ] **Step 10: Commit**

```bash
git add src/pages/Dashboard.tsx
git commit -m "feat(dashboard): biopunk PageHeader, sensor card accents, dark chart styling"
```

---

## Task 8: SensorsPage Redesign

**Files:**
- Modify: `src/pages/SensorsPage.tsx`

Changes:
- Add PageHeader with "Nuevo" button as action
- Update sensor list cards from `card-hover` to biopunk inline styles
- Update form from `card` to biopunk card

- [ ] **Step 1: Add PageHeader import to `src/pages/SensorsPage.tsx`**

```typescript
import PageHeader from '../components/ui/PageHeader'
```

- [ ] **Step 2: Replace the header block with PageHeader**

Find:
```tsx
{/* Header */}
<div className="flex items-start justify-between gap-3 flex-wrap">
  <div>
    <h2 className="section-title">Sensores</h2>
    <p className="section-subtitle">
      Monitoreo y gestión de sensores
      {lastSyncSecs > 0 && <span className="ml-2 text-white/30">· actualizado hace {lastSyncSecs}s</span>}
    </p>
  </div>
  <div className="flex gap-2 items-center flex-wrap">
    <select value={filterGhId} onChange={e => setFilterGhId(e.target.value)}
      className="input-field py-2 text-sm">
      <option value="">Todos los invernaderos</option>
      {greenhouses.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
    </select>
    {allowedGreenhouseIds === null && (
      <button onClick={handleDeduplicate} disabled={deduplicating}
        className="btn-secondary px-4 py-2 text-sm disabled:opacity-60">
        <RefreshCw size={14} className={deduplicating ? 'animate-spin' : ''} />
        {deduplicating ? 'Limpiando…' : 'Deduplicar'}
      </button>
    )}
    <button onClick={() => setShowForm(!showForm)} className={showForm ? 'btn-secondary px-4 py-2 text-sm' : 'btn-primary px-4 py-2 text-sm'}>
      {showForm ? <><X size={14} /> Cancelar</> : <><Plus size={14} /> Nuevo</>}
    </button>
  </div>
</div>
```

Replace with:
```tsx
<PageHeader
  title="Sensores"
  subtitle={`Monitoreo y gestión${lastSyncSecs > 0 ? ` · hace ${lastSyncSecs}s` : ''}`}
  action={
    <div className="flex gap-2 items-center">
      <select value={filterGhId} onChange={e => setFilterGhId(e.target.value)}
              className="input-field py-1.5 text-sm" style={{ width: 'auto' }}>
        <option value="">Todos</option>
        {greenhouses.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
      </select>
      {allowedGreenhouseIds === null && (
        <button onClick={handleDeduplicate} disabled={deduplicating} className="btn-secondary px-3 py-1.5 text-sm">
          <RefreshCw size={13} className={deduplicating ? 'animate-spin' : ''} />
          {deduplicating ? 'Limpiando…' : 'Dedup'}
        </button>
      )}
      <button onClick={() => setShowForm(!showForm)} className={showForm ? 'btn-secondary px-3 py-1.5 text-sm' : 'btn-primary px-3 py-1.5 text-sm'}>
        {showForm ? <><X size={13} />Cancelar</> : <><Plus size={13} />Nuevo</>}
      </button>
    </div>
  }
/>
```

- [ ] **Step 3: Update the create form styling**

Find:
```tsx
<form ref={formRef} onSubmit={handleSubmit} className="card p-5 space-y-4">
  <div className="flex items-center justify-between">
    <h3 className="font-semibold text-gray-800">Nuevo Sensor</h3>
```

Replace with:
```tsx
<form ref={formRef} onSubmit={handleSubmit} className="biopunk-card p-5 space-y-4">
  <div className="flex items-center justify-between">
    <h3 className="font-semibold" style={{ color: '#e2ffe9' }}>Nuevo Sensor</h3>
```

- [ ] **Step 4: Update sensor list card styling**

Find:
```tsx
<div key={s.id} className="card-hover p-4">
  <div className="flex items-start justify-between gap-2">
    <div className="flex items-start gap-3 flex-1 min-w-0">
      <div className="p-2 bg-green-100 rounded-xl shrink-0">
        <Activity size={16} className="text-green-600" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-800 truncate text-sm">{s.name}</h3>
        <p className="text-xs text-gray-500 mt-0.5">{info.label} · {info.unit}</p>
```

Replace with:
```tsx
<div key={s.id} className="card-hover p-4">
  <div className="flex items-start justify-between gap-2">
    <div className="flex items-start gap-3 flex-1 min-w-0">
      <div className="p-2 rounded-xl shrink-0"
           style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)' }}>
        <Activity size={16} style={{ color: '#4ade80' }} />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold truncate text-sm" style={{ color: '#e2ffe9' }}>{s.name}</h3>
        <p className="text-xs mt-0.5 font-mono" style={{ color: 'rgba(255,255,255,0.35)' }}>{info.label} · {info.unit}</p>
```

- [ ] **Step 5: Verify TypeScript compiles**

```
npm run build
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/pages/SensorsPage.tsx
git commit -m "feat(sensors): biopunk PageHeader, dark card styling for sensor list"
```

---

## Task 9: GreenhousePage Redesign

**Files:**
- Modify: `src/pages/GreenhousePage.tsx`

Changes:
- Add PageHeader
- Update greenhouse cards from white/glass to biopunk dark
- Preserve all existing anime.js animations

- [ ] **Step 1: Add PageHeader import to `src/pages/GreenhousePage.tsx`**

```typescript
import PageHeader from '../components/ui/PageHeader'
```

- [ ] **Step 2: Find the header section in the JSX and replace**

In GreenhousePage's `return`, find the section title + "Nuevo Invernadero" button. The exact pattern to search for is:

```tsx
<h2 className="section-title">Invernaderos</h2>
```

(or similar — it may be wrapped in a flex container). Replace the entire header div with:

```tsx
<PageHeader
  title="Invernaderos"
  subtitle="Gestión de invernaderos y dispositivos ESP32"
  action={
    isAdmin ? (
      <button onClick={() => setShowForm(!showForm)}
              className={showForm ? 'btn-secondary px-3 py-1.5 text-sm' : 'btn-primary px-3 py-1.5 text-sm'}>
        {showForm ? <><X size={13} />Cancelar</> : <><Plus size={13} />Nuevo</>}
      </button>
    ) : undefined
  }
/>
```

Note: If `Plus` and `X` are not already imported in this file, add them: `import { ..., Plus, X } from 'lucide-react'` (check existing imports first).

- [ ] **Step 3: Update greenhouse card containers**

Find the pattern where greenhouse cards are rendered (likely mapping over `greenhouses` array and rendering a card div). Update card containers:

Find: `className="card p-5` or `className="card-hover p-5`
Replace with: `className="biopunk-card p-5`

Find: `className="card p-4` or `className="card-hover p-4`
Replace with: `className="biopunk-card p-4`

Find any inner section headers that use `text-gray-800` or `text-gray-900`:
Replace those color values with `color: '#e2ffe9'` via inline style or remove the gray class.

Find: `className="font-semibold text-gray-800`
Replace with: `className="font-semibold" style={{ color: '#e2ffe9' }}`

- [ ] **Step 4: Update create form**

Find: `className="card p-5 space-y-4"` (the new greenhouse form)
Replace with: `className="biopunk-card p-5 space-y-4"`

- [ ] **Step 5: Verify TypeScript compiles**

```
npm run build
```

Expected: no errors.

- [ ] **Step 6: Visual check — verify existing animations still work**

```
npm run dev
```

Navigate to Invernaderos. Verify:
- Greenhouse cards are dark `#0a1e0f` background
- Expand/collapse animations work (existing anime.js)
- Forms show dark styling
- All CRUD operations still work

- [ ] **Step 7: Commit**

```bash
git add src/pages/GreenhousePage.tsx
git commit -m "feat(greenhouse): biopunk PageHeader and card styling, preserve existing animations"
```

---

## Task 10: MapPage Redesign

**Files:**
- Modify: `src/pages/MapPage.tsx`

Changes:
- Add PageHeader
- Dark border on map container
- Biopunk popup card styling

- [ ] **Step 1: Add PageHeader import to `src/pages/MapPage.tsx`**

```typescript
import PageHeader from '../components/ui/PageHeader'
```

- [ ] **Step 2: Find the JSX return and add PageHeader**

In `MapPage`'s return, find the outermost wrapper and add `PageHeader` as the first child:

Find the `return (` block. The current return looks like:
```tsx
return (
  <div ref={wrapperRef} className="space-y-5" style={{ opacity: 0 }}>
    ...
  </div>
)
```

After the opening `<div ref={wrapperRef} ...>`, add:
```tsx
<PageHeader title="Mapa de Invernaderos" subtitle="Ubicación geográfica y sensores en tiempo real" accent="cyan" />
```

- [ ] **Step 3: Update map container styling**

Find the Map container div (likely a div wrapping `<Map ...>`). Update border and background:

Find: `className="rounded-2xl overflow-hidden` (or similar map container class)
Replace with or add style:
```tsx
style={{ border: '1px solid rgba(74,222,128,0.15)', borderRadius: '14px', overflow: 'hidden' }}
```

- [ ] **Step 4: Update any popup or legend text**

Find any text that uses `text-gray-800`, `text-gray-600`, `text-gray-500` inside MapPage (popup content, legends). Replace with biopunk equivalents:

```tsx
style={{ color: '#e2ffe9' }}           // for headings
style={{ color: 'rgba(255,255,255,0.5)' }}  // for labels
```

If `MapPage` renders a list of unmapped greenhouses below the map, update those cards too:

Find: `className="card p-4` (unmapped greenhouses list)
Replace with: `className="biopunk-card p-4`

- [ ] **Step 5: Verify TypeScript compiles**

```
npm run build
```

Expected: no errors.

- [ ] **Step 6: Visual check**

```
npm run dev
```

Navigate to Mapa. Verify:
- PageHeader visible with cyan accent
- Map has dark green border
- Marker animations still work (existing anime.js stagger)

- [ ] **Step 7: Final full build**

```
npm run build
```

Expected: successful production build, no TypeScript errors. Build size may differ slightly from before (font change).

- [ ] **Step 8: Commit**

```bash
git add src/pages/MapPage.tsx
git commit -m "feat(map): biopunk PageHeader and dark container border"
```

---

## Completion Checklist

After all 10 tasks:

- [ ] `npm run build` passes with no TypeScript errors
- [ ] Login page: dark `#020d05` background, biopunk card, botanical decorations
- [ ] Dashboard: dark sensor cards with ECG + pulse dot, accent colors per sensor type, dark chart
- [ ] Sensors page: dark card list, biopunk form
- [ ] Greenhouse page: dark cards, all existing animations work
- [ ] Map page: dark bordered map container, PageHeader
- [ ] Sidebar: `#030f07` background, LogoMark SVG, green accent nav items
- [ ] All pages: Space Grotesk for UI text, JetBrains Mono for data/labels
- [ ] All pages: `prefers-reduced-motion` guard respected (existing pattern)
- [ ] No hardcoded URLs or API keys introduced
