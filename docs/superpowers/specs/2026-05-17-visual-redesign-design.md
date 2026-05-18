# AgroPulse Visual Redesign — Design Spec

## Goal

Replace the current light/green-glass theme with a full Biopunk IoT dark theme across all pages, establishing a design token foundation that every component draws from, with Space Grotesk + JetBrains Mono typography, SVG botanical decorations, and orchestrated anime.js animations on every new or modified element.

## Design Decisions

All decisions were locked in during brainstorming:

| Decision | Choice |
|---|---|
| Palette | Biopunk IoT (deep black + neon green/cyan) |
| Typography | Space Grotesk (UI) + JetBrains Mono (data) |
| Illustrations | SVG Botánico inline (zero dependencies) |
| Animations | anime.js orchestrated (existing library) |
| Scope | All 5 main pages + App shell |
| Architecture | Design system first: tokens → components → pages |

---

## Color Tokens

```
bg-deep:      #020d05   (page background)
bg-surface:   #051a0a   (sections, cards background)
bg-card:      #0a1e0f   (card interiors)
bg-sidebar:   #030f07   (sidebar)
accent-green: #4ade80   (primary accent — data, active states)
accent-cyan:  #22d3ee   (secondary accent — humidity, water sensors)
accent-lime:  #a3e635   (tertiary — soil, pH)
accent-red:   #f87171   (alerts, temperature extremes, ECG line)
text-primary: #e2ffe9   (headings, key values)
text-muted:   rgba(255,255,255,0.35)  (labels, secondary text)
```

---

## Typography

Two Google Fonts — loaded via `@import` in `index.css`:

- **Space Grotesk** (wght 300–700): all UI text, headings, labels, navigation
- **JetBrains Mono** (wght 400–700): all sensor values, numeric data, badges, timestamps, unit labels

### Scale

| Token | Font | Size | Weight | Use |
|---|---|---|---|---|
| heading-xl | Space Grotesk | 28px / 700 | — | Page hero titles |
| heading-lg | Space Grotesk | 18px / 600 | — | Section headers |
| body | Space Grotesk | 14px / 400 | — | Paragraphs, descriptions |
| data-xl | JetBrains Mono | 28px / 700 | — | Primary sensor readings |
| data-md | JetBrains Mono | 14px / 500 | — | Secondary values, ranges |
| label | JetBrains Mono | 9px / 600 | tracking 2px uppercase | Sensor labels, badges |

---

## Design System Architecture

### Layer 1 — Tokens

**`src/styles/tokens.ts`** — single source of truth for all color, spacing, and animation constants exported as typed TS objects. No runtime cost; just constants referenced by components.

### Layer 2 — Shared UI Components

**`src/components/ui/BotanicalSvg.tsx`**
- Reusable inline SVG botanical decoration (leaf + stem)
- Props: `size`, `color` (accent token), `className`
- Used in card corners and page headers as non-interactive watermarks
- No external dependencies; pure SVG paths

**`src/components/SensorCard.tsx`** — full replacement of current light card
- Dark background (`bg-card`)
- Accent color variant prop: `'green' | 'cyan' | 'lime' | 'red'`
- Botanical SVG in top-right corner (via BotanicalSvg)
- ECG waveform SVG as bottom-edge background decoration
- Pulsing dot status indicator (anime.js `scale` loop)
- Count-up animation on value change (existing anime.js pattern, already in codebase)
- Progress bar in accent color

**`src/components/ui/PageHeader.tsx`** — new shared page header
- Left: section title (heading-lg) + breadcrumb
- Right: live badge + optional action slot
- Bottom-right: large botanical SVG watermark at 6% opacity

### Layer 3 — Pages

The following pages are redesigned (see Page Designs section):
- `src/App.tsx` (shell: sidebar + header)
- `src/pages/LoginPage.tsx`
- `src/pages/Dashboard.tsx`
- `src/pages/SensorsPage.tsx`
- `src/pages/GreenhousePage.tsx`
- `src/pages/MapPage.tsx`

---

## Tailwind Config Changes

`tailwind.config.js` receives a new color group:

```js
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
}
```

Font families updated:

```js
fontFamily: {
  heading: ['Space Grotesk', 'sans-serif'],
  body:    ['Space Grotesk', 'sans-serif'],
  mono:    ['JetBrains Mono', 'monospace'],
  data:    ['JetBrains Mono', 'monospace'],
}
```

New box shadows:

```js
'neon-green': '0 0 20px rgba(74,222,128,0.35)',
'neon-cyan':  '0 0 20px rgba(34,211,238,0.30)',
'card-biopunk': '0 0 0 1px rgba(74,222,128,0.12), 0 8px 32px rgba(0,0,0,0.5)',
```

---

## CSS Changes (`src/index.css`)

Replace current Google Fonts import:
```css
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
```

Update base `html` font to Space Grotesk. Update `body` background to `#020d05`.

Add utility classes in `@layer components`:

```css
.biopunk-card      { background: #0a1e0f; border: 1px solid rgba(74,222,128,0.12); border-radius: 14px; }
.biopunk-label     { font-family: 'JetBrains Mono'; font-size: 9px; letter-spacing: 2px; text-transform: uppercase; color: rgba(255,255,255,0.35); }
.biopunk-value     { font-family: 'JetBrains Mono'; font-size: 28px; font-weight: 700; color: #e2ffe9; }
.biopunk-surface   { background: #051a0a; }
.accent-dot        { width: 6px; height: 6px; border-radius: 50%; }  /* color set by variant */
```

---

## Page Designs

### App Shell (`src/App.tsx`)

**Sidebar** changes:
- Background: `bg-sidebar` (#030f07) with `border-r: rgba(74,222,128,0.07)`
- Logo mark: AgroPulse SVG emblem (same design as brainstorm companion) + "AgroPulse" in Space Grotesk 700 + "v10" badge
- Nav group labels: JetBrains Mono 9px uppercase, `text-muted`
- Active nav item: `bg: rgba(74,222,128,0.08)`, left border `2px solid #4ade80`, text `#4ade80`
- Inactive: `text-muted`, hover `rgba(74,222,128,0.05)`
- anime.js: stagger entrance for nav items on mount (already coded — preserve existing)

**Header** changes:
- Background: `#020d05/90` with `backdrop-blur-md`
- Border bottom: `rgba(74,222,128,0.08)`
- "En línea" badge: JetBrains Mono, accent-green border
- Page title: Space Grotesk 700

**AuthLoadingScreen**: replace current gradient with `#020d05` background, keep existing anime.js pulse.

### Login Page (`src/pages/LoginPage.tsx`)

- Full-page background: `bg-deep` with subtle dot-grid overlay (CSS `repeating-linear-gradient` as in design system)
- Large `BotanicalSvg` (size 280, `lg:block hidden`) on right panel, animated with anime.js sway (rotate ±3° loop, 3s, always-on)
- Card: `biopunk-card` style, 380px max-width, centered
- Logo mark SVG + "AgroPulse" heading
- Inputs: dark background `#0a1e0f`, accent-green focus ring
- Submit button: accent-green background, white text
- anime.js: card entrance `translateY(20px → 0) + opacity(0 → 1)` on mount

### Dashboard (`src/pages/Dashboard.tsx`)

- PageHeader component at top
- Stat cards: `biopunk-card` with accent-color top border stripe (3px)
- SensorCard grid: existing 4-col grid, all cards redesigned via new SensorCard component
- anime.js: stagger entrance for all cards on mount (`delay: stagger(60ms)`)

### Sensors Page (`src/pages/SensorsPage.tsx`)

- PageHeader component
- Sensor grid uses new SensorCard for all sensor readings
- Table/list rows: dark `bg-card` rows, `accent-green` left border on hover
- anime.js: row entrance stagger, count-up on value update (existing pattern)

### Greenhouse Page (`src/pages/GreenhousePage.tsx`)

- PageHeader component
- Existing anime.js animations preserved (already sophisticated per memory)
- Card backgrounds updated to biopunk-card style
- Botanical SVG watermarks in section headers

### Map Page (`src/pages/MapPage.tsx`)

- PageHeader component
- Map container: dark border `rgba(74,222,128,0.15)`, rounded corners
- Marker popups: `biopunk-card` style
- Legend: JetBrains Mono labels

---

## Animation Catalogue

Every new or modified component must include at least one anime.js animation. Respect `prefers-reduced-motion: reduce` (existing guard already in codebase — preserve it).

| Component | Animation | Implementation |
|---|---|---|
| SensorCard | count-up on value change | `anime({ targets: obj, val: newVal })` — already exists in current SensorCard, preserve |
| SensorCard | pulse dot | `anime({ scale: [1,1.6,1], loop: true })` |
| SensorCard | ECG draw on mount | `anime({ targets: path, strokeDashoffset: [220, 0], duration: 1200, easing: 'easeOutCubic' })` on mount |
| BotanicalSvg | subtle sway (always-on) | `anime({ targets: svg, rotate: [-3, 3], direction: 'alternate', loop: true, easing: 'easeInOutSine', duration: 3000 })` on mount |
| PageHeader | botanical fade-in | `anime({ opacity: [0,0.06], scale: [0.9,1] })` on mount |
| Login card | entrance | `anime({ translateY: [20,0], opacity: [0,1] })` on mount |
| Dashboard cards | stagger entrance | `anime({ targets: cards, opacity:[0,1], translateY:[12,0], delay: stagger(60) })` |
| Sidebar nav items | stagger entrance | existing code — preserve |
| Page transition | fade+slide | existing `mainRef` animation in App.tsx — preserve |

---

## Constraints

- **No hardcoded URLs or API keys** — env vars only (Render/Vercel)
- **TypeScript throughout** — all new files `.tsx` / `.ts`
- **anime.js for all animations** — no new animation libraries
- **Google Fonts via @import** — no npm font packages for these two fonts
- **Existing functionality untouched** — only visual layer changes; all data fetching, auth, routing logic preserved
- **`prefers-reduced-motion` guard** — all anime.js calls already guarded; new calls must follow the same pattern

---

## Files Summary

| File | Action | Notes |
|---|---|---|
| `tailwind.config.js` | Modify | Add `biopunk` colors, update fontFamily, add shadows |
| `src/index.css` | Modify | New fonts import, base vars, biopunk utility classes |
| `src/styles/tokens.ts` | Create | Color + spacing constants |
| `src/components/ui/BotanicalSvg.tsx` | Create | Reusable SVG botanical decoration |
| `src/components/ui/PageHeader.tsx` | Create | Shared page header with botanical watermark |
| `src/components/SensorCard.tsx` | Modify | Full Biopunk redesign, preserve count-up anime |
| `src/App.tsx` | Modify | Sidebar + header redesign, preserve all logic |
| `src/pages/LoginPage.tsx` | Modify | Biopunk card, botanical illustration |
| `src/pages/Dashboard.tsx` | Modify | PageHeader + biopunk stat/sensor cards |
| `src/pages/SensorsPage.tsx` | Modify | PageHeader + biopunk sensor grid |
| `src/pages/GreenhousePage.tsx` | Modify | PageHeader + biopunk cards, preserve existing animations |
| `src/pages/MapPage.tsx` | Modify | PageHeader + dark map styling |
