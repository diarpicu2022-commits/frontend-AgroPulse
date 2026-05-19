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
  const controller = new AbortController()
  const timerId = setTimeout(() => controller.abort(), 8000)
  const res = await fetch(url, { signal: controller.signal })
  clearTimeout(timerId)
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`)
  let data: {
    current: {
      temperature_2m: number
      relative_humidity_2m: number
      precipitation: number
      wind_speed_10m: number
      uv_index: number
      weather_code: number
    }
  }
  try {
    data = await res.json()
  } catch {
    throw new Error('Open-Meteo returned an unparseable response')
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
  if (!OWM_KEY) throw new Error('VITE_OPENWEATHER_KEY is not set')
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
  if (code === 45 || code === 48) return 'Niebla'
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
  if (index <= 10) return { label: 'Muy alto', color: '#f87171' }
  return             { label: 'Extremo',   color: '#c026d3' }
}
