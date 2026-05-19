# Weather / Climate Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar capas climáticas estilo IDEAM (OpenWeatherMap tiles) y datos meteorológicos por invernadero (Open-Meteo) a la página de mapa existente.

**Architecture:** Solo frontend. `src/lib/weather.ts` encapsula fetching y conversión. `MapPage.tsx` consume el helper: agrega un componente `WeatherTileLayer` (raster source en MapLibre GL), estado de capa activa, datos de clima en cada popup, y una barra de control bajo el mapa.

**Tech Stack:** React + TypeScript, MapLibre GL (ya instalado), Open-Meteo API (gratuita, sin key), OpenWeatherMap raster tiles (`VITE_OPENWEATHER_KEY`), anime.js.

---

## File Structure

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `src/lib/weather.ts` | Crear | Tipos, fetch Open-Meteo, URL tiles OWM, conversores WMO |
| `src/components/ui/map.tsx` | Modificar (1 línea) | Exportar `useMap` para uso externo |
| `src/pages/MapPage.tsx` | Modificar | Estado clima, `WeatherTileLayer`, popup weather, barra de capas |

---

## Task 1: Crear `src/lib/weather.ts`

**Files:**
- Create: `src/lib/weather.ts`

- [ ] **Step 1: Crear el archivo con tipos e implementación completa**

Crea `src/lib/weather.ts` con el contenido exacto:

```typescript
const OWM_KEY = (import.meta.env.VITE_OPENWEATHER_KEY as string) || ''

export interface WeatherData {
  temperature: number   // °C redondeado
  humidity: number      // %
  precipitation: number // mm última hora
  windSpeed: number     // km/h redondeado
  uvIndex: number
  weatherCode: number   // WMO weather code
  icon: string          // emoji
  description: string   // texto español
}

export async function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,uv_index,weather_code` +
    `&timezone=auto`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`)
  const data = await res.json() as {
    current: {
      temperature_2m: number
      relative_humidity_2m: number
      precipitation: number
      wind_speed_10m: number
      uv_index: number
      weather_code: number
    }
  }
  const c = data.current
  return {
    temperature:   Math.round(c.temperature_2m),
    humidity:      c.relative_humidity_2m,
    precipitation: c.precipitation,
    windSpeed:     Math.round(c.wind_speed_10m),
    uvIndex:       c.uv_index,
    weatherCode:   c.weather_code,
    icon:          wmoToIcon(c.weather_code),
    description:   wmoToDescription(c.weather_code),
  }
}

export function owmTileUrl(layer: string): string {
  return `https://tile.openweathermap.org/map/${layer}/{z}/{x}/{y}.png?appid=${OWM_KEY}`
}

export function hasOwmKey(): boolean {
  return Boolean(OWM_KEY)
}

export function wmoToIcon(code: number): string {
  if (code === 0)           return '☀️'
  if (code <= 3)            return '⛅'
  if (code <= 48)           return '🌫️'
  if (code <= 57)           return '🌦️'
  if (code <= 67)           return '🌧️'
  if (code <= 77)           return '❄️'
  if (code <= 82)           return '🌦️'
  if (code <= 86)           return '🌨️'
  if (code <= 99)           return '⛈️'
  return '🌡️'
}

export function wmoToDescription(code: number): string {
  if (code === 0)             return 'Despejado'
  if (code === 1)             return 'Mayormente despejado'
  if (code === 2)             return 'Parcialmente nublado'
  if (code === 3)             return 'Nublado'
  if (code <= 48)             return 'Niebla'
  if (code <= 55)             return 'Llovizna'
  if (code <= 57)             return 'Llovizna intensa'
  if (code <= 65)             return 'Lluvia'
  if (code <= 67)             return 'Lluvia intensa'
  if (code <= 77)             return 'Nieve'
  if (code <= 82)             return 'Chubascos'
  if (code <= 86)             return 'Nieve con chubascos'
  if (code <= 99)             return 'Tormenta eléctrica'
  return 'Sin datos'
}

export function uvLabel(index: number): { label: string; color: string } {
  if (index <= 2) return { label: 'Bajo',     color: '#4ade80' }
  if (index <= 5) return { label: 'Moderado', color: '#fde68a' }
  if (index <= 7) return { label: 'Alto',     color: '#fb923c' }
  return             { label: 'Muy alto',  color: '#f87171' }
}
```

- [ ] **Step 2: Verificar que compila**

```bash
cd "frontend AgroPulse" && npx tsc --noEmit
```
Expected: sin errores relacionados a `weather.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/weather.ts
git commit -m "feat: add weather utility (Open-Meteo fetch + OWM tile helpers)"
```

---

## Task 2: Exportar `useMap` de `src/components/ui/map.tsx`

**Files:**
- Modify: `src/components/ui/map.tsx:92`

`useMap` está definido en la línea 92 de `map.tsx` como función privada. Necesitamos exportarla para que `WeatherTileLayer` (en MapPage.tsx) pueda usarla dentro del árbol de `<Map>`.

- [ ] **Step 1: Agregar `export` a `useMap`**

En `src/components/ui/map.tsx` línea 92, cambiar:

```typescript
function useMap() {
```

por:

```typescript
export function useMap() {
```

- [ ] **Step 2: Verificar build**

```bash
npx tsc --noEmit
```
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/map.tsx
git commit -m "feat: export useMap hook from map component"
```

---

## Task 3: Añadir WeatherTileLayer, estado de clima y popup en `MapPage.tsx`

**Files:**
- Modify: `src/pages/MapPage.tsx`

- [ ] **Step 1: Actualizar imports**

Reemplazar la línea de imports de map.tsx:

```typescript
import { Map, MapMarker, MarkerContent, MarkerPopup, MarkerTooltip, MapControls } from '@/components/ui/map'
```

por:

```typescript
import { Map, MapMarker, MarkerContent, MarkerPopup, MarkerTooltip, MapControls, useMap } from '@/components/ui/map'
import { fetchWeather, owmTileUrl, hasOwmKey, uvLabel, type WeatherData } from '../lib/weather'
```

- [ ] **Step 2: Agregar tipo `WeatherLayer` y componente `WeatherTileLayer` antes del componente principal**

Insertar justo después de los imports y antes de `interface MapPageProps`:

```typescript
type WeatherLayer = 'none' | 'precipitation_new' | 'temp_new' | 'clouds_new' | 'wind_new'

function WeatherTileLayer({ activeLayer }: { activeLayer: WeatherLayer }) {
  const { map, isLoaded } = useMap()

  useEffect(() => {
    if (!map || !isLoaded) return

    const SRC = 'owm-weather'
    const LYR = 'owm-weather-layer'

    const cleanup = () => {
      try {
        if (map.getLayer(LYR)) map.removeLayer(LYR)
        if (map.getSource(SRC)) map.removeSource(SRC)
      } catch { /* map already destroyed */ }
    }

    cleanup()

    if (activeLayer !== 'none' && hasOwmKey()) {
      map.addSource(SRC, {
        type: 'raster',
        tiles: [owmTileUrl(activeLayer)],
        tileSize: 256,
      })
      map.addLayer({
        id: LYR,
        type: 'raster',
        source: SRC,
        paint: { 'raster-opacity': 0.7 },
      })
    }

    return cleanup
  }, [map, isLoaded, activeLayer])

  return null
}
```

- [ ] **Step 3: Agregar nuevo estado dentro del componente `MapPage`**

Dentro de `export default function MapPage(...)`, después de la declaración de `const wrapperRef`, agregar:

```typescript
const [activeLayer,      setActiveLayer]      = useState<WeatherLayer>('none')
const [weather,          setWeather]          = useState<Record<number, WeatherData>>({})
const [weatherLoading,   setWeatherLoading]   = useState<Record<number, boolean>>({})
const layerBarRef = useRef<HTMLDivElement>(null)
```

- [ ] **Step 4: Actualizar `handleMarkerClick` para cargar clima**

Reemplazar la función `handleMarkerClick` existente:

```typescript
const handleMarkerClick = (ghId: number) => {
  if (readings[ghId]) return
  readingRepository.list(null, 10, ghId).then(data => {
    setReadings(prev => ({ ...prev, [ghId]: data.readings ?? [] }))
  }).catch(() => {})
}
```

por:

```typescript
const handleMarkerClick = (ghId: number) => {
  if (!readings[ghId]) {
    readingRepository.list(null, 10, ghId).then(data => {
      setReadings(prev => ({ ...prev, [ghId]: data.readings ?? [] }))
    }).catch(() => {})
  }
  const gh = mapped.find(g => g.id === ghId)
  if (gh && gh.latitude != null && gh.longitude != null && !weather[ghId] && !weatherLoading[ghId]) {
    setWeatherLoading(prev => ({ ...prev, [ghId]: true }))
    fetchWeather(gh.latitude, gh.longitude)
      .then(w  => setWeather(prev => ({ ...prev, [ghId]: w })))
      .catch(() => {})
      .finally(() => setWeatherLoading(prev => ({ ...prev, [ghId]: false })))
  }
}
```

- [ ] **Step 5: Agregar `WeatherTileLayer` dentro de `<Map>` en el JSX**

Dentro del JSX, dentro de `<Map center={center} zoom={zoom}>`, agrega `<WeatherTileLayer activeLayer={activeLayer} />` justo después de `<MapControls />`:

```tsx
<Map center={center} zoom={zoom}>
  <MapControls />
  <WeatherTileLayer activeLayer={activeLayer} />
  {mapped.map(gh => { ... })}
</Map>
```

- [ ] **Step 6: Agregar sección de clima en el popup**

Dentro del popup de cada marcador, en la sección `<div className="p-3 space-y-2">`, agrega la sección de clima justo antes del bloque `{lastReadings.length > 0 ? ...}`:

```tsx
{/* Clima exterior */}
{weatherLoading[gh.id] && (
  <div className="space-y-1.5 mb-2">
    <div className="skeleton h-3 rounded-lg w-1/2" />
    <div className="skeleton h-10 rounded-lg" />
    <div className="skeleton h-6 rounded-lg" />
  </div>
)}
{weather[gh.id] && !weatherLoading[gh.id] && (() => {
  const w = weather[gh.id]
  const uv = uvLabel(w.uvIndex)
  return (
    <div className="mb-2">
      <p className="text-[10px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
        🌦 Clima exterior
      </p>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl leading-none">{w.icon}</span>
        <div>
          <div className="text-sm font-bold" style={{ color: '#7dd3fc' }}>{w.temperature}°C</div>
          <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{w.description}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1">
        {([
          { label: 'Humedad',     value: `${w.humidity}%`,          color: '#7dd3fc' },
          { label: 'Lluvia (1h)', value: `${w.precipitation} mm`,   color: '#7dd3fc' },
          { label: 'Viento',      value: `${w.windSpeed} km/h`,     color: '#7dd3fc' },
          { label: 'UV',          value: uv.label,                  color: uv.color  },
        ] as const).map(({ label, value, color }) => (
          <div key={label} className="rounded-lg px-2 py-1.5" style={{ background: 'rgba(0,120,255,0.1)' }}>
            <div className="text-[9px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</div>
            <div className="text-[11px] font-semibold" style={{ color }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  )
})()}
```

- [ ] **Step 7: Verificar build**

```bash
npx tsc --noEmit && npm run build 2>&1 | tail -5
```
Expected: `✓ built in ...`

- [ ] **Step 8: Commit**

```bash
git add src/pages/MapPage.tsx
git commit -m "feat: add WeatherTileLayer and per-greenhouse weather popup"
```

---

## Task 4: Agregar barra de control de capas bajo el mapa

**Files:**
- Modify: `src/pages/MapPage.tsx`

- [ ] **Step 1: Definir constante `WEATHER_LAYERS` antes del componente**

Justo antes de `export default function MapPage`, agrega:

```typescript
const WEATHER_LAYERS = [
  { id: 'precipitation_new' as const, label: 'Lluvia',       icon: '🌧' },
  { id: 'temp_new'          as const, label: 'Temperatura',  icon: '🌡' },
  { id: 'clouds_new'        as const, label: 'Nubes',        icon: '☁️' },
  { id: 'wind_new'          as const, label: 'Viento',       icon: '💨' },
]
```

- [ ] **Step 2: Agregar `useEffect` para animar la barra**

Dentro del componente `MapPage`, después del `useEffect` que anima los marcadores, agregar:

```typescript
useEffect(() => {
  if (loading || !layerBarRef.current) return
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) return
  anime({
    targets:    layerBarRef.current,
    opacity:    [0, 1],
    translateY: [8, 0],
    duration:   340,
    delay:      200,
    easing:     'easeOutCubic',
  })
}, [loading])
```

- [ ] **Step 3: Agregar la barra en el JSX**

Justo después del `<div>` que contiene el mapa (el div con `style={{ height: 'calc(100vh - 220px)' ... }}`), y **antes** del bloque `{unmapped.length > 0 && ...}`, agrega:

```tsx
{/* Barra de capas climáticas */}
<div ref={layerBarRef} className="biopunk-card p-3" style={{ opacity: 0 }}>
  <div className="flex flex-wrap items-center gap-2 justify-center">
    {WEATHER_LAYERS.map(layer => {
      const active = activeLayer === layer.id
      const disabled = !hasOwmKey()
      return (
        <button
          key={layer.id}
          disabled={disabled}
          onClick={() => setActiveLayer(prev => prev === layer.id ? 'none' : layer.id)}
          className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
          style={{
            background:  active ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.05)',
            borderColor: active ? 'rgba(74,222,128,0.5)'  : 'rgba(255,255,255,0.1)',
            color:       active ? '#4ade80'                : 'rgba(255,255,255,0.5)',
            opacity:     disabled ? 0.4 : 1,
            cursor:      disabled ? 'not-allowed' : 'pointer',
          }}
        >
          {layer.icon} {layer.label}
        </button>
      )
    })}
    <button
      onClick={() => setActiveLayer('none')}
      className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
      style={{
        background:  activeLayer === 'none' ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.05)',
        borderColor: activeLayer === 'none' ? 'rgba(74,222,128,0.5)'  : 'rgba(255,255,255,0.1)',
        color:       activeLayer === 'none' ? '#4ade80'                : 'rgba(255,255,255,0.5)',
      }}
    >
      ✕ Sin capa
    </button>
  </div>
  {!hasOwmKey() && (
    <p className="text-center mt-2" style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>
      Agrega <code style={{ color: 'rgba(74,222,128,0.6)' }}>VITE_OPENWEATHER_KEY</code> en Vercel para activar las capas climáticas
    </p>
  )}
</div>
```

- [ ] **Step 4: Verificar build final**

```bash
npm run build 2>&1 | tail -8
```
Expected: `✓ built in ...` sin errores TypeScript.

- [ ] **Step 5: Commit final**

```bash
git add src/pages/MapPage.tsx
git commit -m "feat: add weather layer control bar to map page"
```
