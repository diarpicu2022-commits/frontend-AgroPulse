# AgroPulse Frontend

Dashboard web para el sistema IoT de monitoreo de invernaderos. Construido con React 18 + TypeScript 5, desplegado en Vercel.

## Stack

| Capa | Tecnología |
|---|---|
| Lenguaje | TypeScript 5.5 |
| Framework | React 18 + Vite 5 |
| Estilos | Tailwind CSS 3 |
| Animaciones | anime.js 3 + GSAP 3 |
| Routing | React Router DOM 6 |
| Base de datos | Supabase JS SDK |
| Gráficas | Recharts |
| Mapa | MapLibre GL |
| 3D | Three.js + Spline |
| Scroll suave | Lenis |
| UI components | shadcn/ui + Radix |
| Despliegue | Vercel |

## Estructura del proyecto

```
src/
├── pages/              # Vistas principales (una por ruta)
│   ├── LandingPage.tsx
│   ├── DashboardPage.tsx
│   ├── GreenhousePage.tsx
│   ├── SensorsPage.tsx
│   ├── ActuatorsPage.tsx
│   ├── AlertsPage.tsx
│   ├── MapPage.tsx
│   └── ...
├── components/         # Componentes reutilizables
├── services/           # Llamadas a la API REST del backend
├── repositories/       # Patrón Repository (acceso a datos)
├── hooks/              # Custom hooks de React
├── context/            # React Context (auth, theme, etc.)
├── core/               # Clases base y utilidades OOP
├── types/              # Interfaces y tipos TypeScript
├── lib/                # Configuración de librerías externas
├── styles/             # Estilos globales
└── utils/              # Funciones utilitarias
```

### Arquitectura

El frontend sigue el patrón **Repository/Service**:

- `repositories/` — acceso a datos (Supabase o API REST), sin lógica de UI
- `services/` — lógica de negocio, orquesta repositories
- `pages/` + `components/` — UI pura, llaman a services

Toda animación usa **anime.js**; cada página y componente nuevo debe incluir animaciones de entrada.

## Variables de entorno

```env
# Backend API
VITE_API_URL=https://agropulse-backend.onrender.com

# Supabase
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

> **Nunca hardcodear** URLs ni keys en el código. Usar siempre variables `VITE_*` de Vercel.

## Correr en local

**Prerequisitos:** Node.js 20+, npm 10+

```bash
cd "frontend AgroPulse"

# Instalar dependencias
npm install

# Servidor de desarrollo (hot-reload)
npm run dev
# → http://localhost:5173

# Verificar tipos TypeScript
npm run typecheck

# Build de producción
npm run build
```

## Diseño

El sistema de diseño sigue la estética **dark-tech + biofílico orgánico**:

- Fondo oscuro (`#0a0a0f`, `#0d1117`)
- Acentos verde-esmeralda (`#10b981`, `#059669`)
- Tipografía: Geist Variable
- Efectos glassmorphism en cards
- Animaciones anime.js en todos los elementos interactivos

> Nunca usar `bg-white` ni colores `gray-*` claros — causan texto invisible sobre fondo oscuro.

## Build

El bundle de producción es ~707 KB. El comando `npm run build` compila TypeScript y empaqueta con Vite. Vercel ejecuta este comando automáticamente en cada push a `main`.
