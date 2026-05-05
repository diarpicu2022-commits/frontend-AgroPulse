// ── SensorCard component ──────────────────────────────────────────────────────
export default function SensorCard({ icon: Icon, label, value, unit, color, min, max }) {
  const pct = min != null && max != null
    ? Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))
    : null

  const isOk = pct != null && pct >= 0 && pct <= 100

  // Gradients based on sensor type
  const gradients = {
    'bg-orange-500': 'from-orange-50 to-amber-50 border-orange-100',
    'bg-blue-500':   'from-blue-50 to-cyan-50 border-blue-100',
    'bg-cyan-500':   'from-cyan-50 to-sky-50 border-cyan-100',
    'bg-green-600':  'from-green-50 to-emerald-50 border-green-100',
  }

  const gradientClass = gradients[color] || 'from-gray-50 to-gray-50 border-gray-100'

  return (
    <div className={`bg-gradient-to-br ${gradientClass} rounded-2xl shadow-sm border p-4 flex flex-col gap-3 hover:shadow-md transition-all duration-300 hover:scale-[1.02]`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl ${color} shadow-md`}>
            <Icon size={22} className="text-white" />
          </div>
          <span className="text-sm font-semibold text-gray-700">{label}</span>
        </div>
        <span className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
          isOk ? 'bg-green-100 text-green-700 shadow-sm' : 'bg-red-100 text-red-700 shadow-sm'
        }`}>
          {isOk ? '✓ Óptimo' : '⚠ Fuera'}
        </span>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-4xl font-bold text-gray-800 font-mono">
          {value != null ? value.toFixed(1) : '—'}
        </span>
        <span className="text-sm text-gray-500 mb-1">{unit}</span>
      </div>
      {pct != null && (
        <div className="space-y-2 pt-1">
          <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden shadow-inner">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isOk ? 'bg-gradient-to-r from-green-400 to-emerald-500' : pct < 0 ? 'bg-gradient-to-r from-blue-400 to-cyan-500' : 'bg-gradient-to-r from-red-400 to-rose-500'
              }`}
              style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 font-medium">
            <span>{min}{unit}</span>
            <span className="text-center text-gray-600">{Math.round(pct)}%</span>
            <span>{max}{unit}</span>
          </div>
        </div>
      )}
    </div>
  )
}
