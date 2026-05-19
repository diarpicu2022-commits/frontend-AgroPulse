# Weather / Climate Map — Design Spec

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Agregar visualización climática a MapPage: capas de color estilo IDEAM sobre el mapa (OpenWeatherMap tiles) y datos meteorológicos precisos por invernadero en el popup (Open-Meteo), sin cambios de backend.

**Architecture:** Solo frontend. Dos APIs externas llamadas directamente desde el navegador. `src/lib/weather.ts` encapsula toda la lógica de fetching y conversión. `MapPage.tsx` consume ese helper, gestiona estado de capa activa y datos de clima por invernadero, y renderiza la barra de control de capas y la sección de clima en cada popup.

**Tech Stack:** React + TypeScript, MapLibre GL (ya en uso), Open-Meteo (gratis, sin API key), OpenWeatherMap raster tiles (`VITE_OPENWEATHER_KEY`), anime.js.

---

## 1. Fuentes de Datos

### Open-Meteo (sin API key)
URL: `https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,uv_index,weather_code&timezone=auto`

Campos usados del objeto `current`:
| Campo | Unidad | Uso en UI |
|---|---|---|
| `temperature_2m` | °C | Temperatura principal |
| `relative_humidity_2m` | % | Humedad |
| `precipitation` | mm | Lluvia última hora |
| `wind_speed_10m` | km/h | Viento |
| `uv_index` | 0–11+ | Índice UV → etiqueta español |
| `weather_code` | WMO code | Icono emoji + descripción español |

### OpenWeatherMap Tiles (requiere `VITE_OPENWEATHER_KEY`)
URL base: `https://tile.openweathermap.org/map/{layer}/{z}/{x}/{y}.png?appid={key}`

Capas disponibles:
| `layer` | Descripción |
|---|---|
| `precipitation_new` | Precipitación |
| `temp_new` | Temperatura |
| `clouds_new` | Nubosidad |
| `wind_new` | Viento |

Si `VITE_OPENWEATHER_KEY` no está definida, los botones de capa se muestran deshabilitados con aviso "Agrega VITE_OPENWEATHER_KEY para activar capas".

---

## 2. `src/lib/weather.ts` (archivo nuevo)

```typescript
export interface WeatherData {
  temperature: number   // °C
  humidity: number      // %
  precipitation: number // mm acumulados hoy
  windSpeed: number     // km/h
  uvIndex: number
  weatherCode: number   // WMO weather code
  icon: string          // emoji
  description: string   // texto en español
}

export async function fetchWeather(lat: number, lon: number): Promise<WeatherData>
// Llama Open-Meteo con los 6 campos. Mapea current → WeatherData.
// Lanza error si response no ok.

export function owmTileUrl(layer: string, z: number, x: number, y: number): string
// Devuelve URL del tile OWM. Lee import.meta.env.VITE_OPENWEATHER_KEY.

export function wmoToIcon(code: number): string
// Convierte código WMO a emoji. Ej: 0→"☀️", 1-3→"⛅", 51-67→"🌧", 71-77→"❄️", 80-82→"🌦", 95→"⛈"

export function wmoToDescription(code: number): string
// Convierte código WMO a texto español corto. Ej: 0→"Despejado", 61→"Lluvia leve", 95→"Tormenta"

export function uvLabel(index: number): { label: string; color: string }
// 0-2 → {label:"Bajo", color:"#4ade80"}, 3-5 → {label:"Moderado", color:"#fde68a"},
// 6-7 → {label:"Alto", color:"#fb923c"}, 8+ → {label:"Muy alto", color:"#f87171"}
```

---

## 3. Cambios en `src/pages/MapPage.tsx`

### Estado nuevo
```typescript
type WeatherLayer = 'none' | 'precipitation_new' | 'temp_new' | 'clouds_new' | 'wind_new'
const [activeLayer, setActiveLayer]     = useState<WeatherLayer>('none')
const [showLayerBar, setShowLayerBar]   = useState(true)
const [weather, setWeather]             = useState<Record<number, WeatherData>>({})
const [weatherLoading, setWeatherLoading] = useState<Record<number, boolean>>({})
```

### `handleMarkerClick` actualizado
Al hacer clic en un marcador con coordenadas GPS:
1. Carga lecturas de sensores (comportamiento existente, sin cambio).
2. Si `weather[ghId]` no existe y la greenhouse tiene lat/lon → llama `fetchWeather(lat, lon)`, guarda en `weather[ghId]`. Maneja error silenciosamente (no bloquea la UI).

### Componente interno `WeatherTileLayer`
Componente React que vive dentro de `<Map>`. Usa `useMap()` para obtener la instancia de MapLibre GL. Cuando `activeLayer` cambia:
- Si había una capa anterior → elimina source `owm-weather` y layer `owm-weather-layer`.
- Si `activeLayer !== 'none'` y hay API key → agrega source raster `owm-weather` (tiles OWM) y layer raster con `raster-opacity: 0.7`.
- Limpieza en `useEffect` return: elimina source y layer si el componente se desmonta.

```typescript
// Dentro del JSX del Map:
<WeatherTileLayer activeLayer={activeLayer} />
```

### Popup del marcador — sección de clima
Dentro del `<MarkerPopup>`, **antes** de "Últimas lecturas", se agrega una sección condicional:

```
Si weatherLoading[gh.id] → spinner (skeleton 2 líneas)
Si weather[gh.id] → sección "🌦 Clima exterior actual":
  - Fila icono grande + temperatura °C + descripción
  - Grid 2×2: Humedad %, Lluvia (1h) mm, Viento km/h, UV (etiqueta + color)
Si no hay datos (ni loading) → no renderizar sección (click activa la carga)
```

### Barra de control de capas
Debajo del `<div>` que contiene el mapa, antes del bloque de invernaderos sin GPS:

```
┌──────────────────────────────────────────────────────────┐
│ 🌧 Lluvia  │  🌡 Temperatura  │  ☁️ Nubes  │  💨 Viento  │  ✕ Sin capa │
└──────────────────────────────────────────────────────────┘
```
- 5 botones pill. El activo tiene estilo `badge-green` (borde verde, fondo verde/15).
- Si no hay `VITE_OPENWEATHER_KEY`: los primeros 4 botones están deshabilitados (`opacity-40 cursor-not-allowed`) y aparece texto pequeño debajo: `"Agrega VITE_OPENWEATHER_KEY en Vercel/Render para activar las capas climáticas"`.
- Animación de entrada con anime.js (`translateY [8,0] opacity [0,1]`).

---

## 4. UI — Referencia visual del popup completo

```
┌──────────────────────────┐
│ [foto o placeholder]     │
├──────────────────────────┤
│ Invernadero Norte        │
│                          │
│ 🌦 Clima exterior actual │  ← sección nueva
│ ⛅  22°C                 │
│    Parcialmente nublado  │
│ ┌──────────┬───────────┐ │
│ │ Humedad  │ Lluvia hoy│ │
│ │   78%    │  2.4 mm   │ │
│ ├──────────┼───────────┤ │
│ │ Viento   │ UV        │ │
│ │ 12 km/h  │ Moderado  │ │
│ └──────────┴───────────┘ │
│                          │
│ Últimas lecturas         │  ← sección existente
│  Temperatura    24.3     │
│                          │
│   [Ir al Dashboard →]    │
└──────────────────────────┘
```

---

## 5. Variables de Entorno

| Variable | Dónde | Descripción |
|---|---|---|
| `VITE_OPENWEATHER_KEY` | Vercel (frontend) | API key de OpenWeatherMap. Sin ella, las capas de tiles se deshabilitan pero el clima por popup (Open-Meteo) sigue funcionando. |

Open-Meteo no requiere variable de entorno.

---

## 6. Comportamiento sin API key

Si `VITE_OPENWEATHER_KEY` no está definida:
- Los 4 botones de capa (lluvia, temperatura, nubes, viento) aparecen deshabilitados con `opacity-40`.
- Se muestra texto de ayuda debajo de la barra.
- El botón "✕ Sin capa" sigue activo (siempre).
- Los datos de clima en el popup (Open-Meteo) **siguen funcionando** sin restricción.

---

## 7. Manejo de Errores

- Si `fetchWeather` falla (sin conexión, rate limit): `weatherLoading[ghId]` pasa a `false`, `weather[ghId]` no se setea. El popup muestra la sección de sensores normalmente, sin la sección de clima.
- Si el tile OWM no carga (key inválida, etc.): MapLibre simplemente no muestra el tile — no hay error visible.
- Invernaderos sin GPS (`lat == null`): no se muestran en el mapa (comportamiento existente), no se llama a Open-Meteo.
