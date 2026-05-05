// ── AlertsBanner component ────────────────────────────────────────────────────
export default function AlertsBanner({ alerts, onDismiss }) {
  if (!alerts || alerts.length === 0) return null

  const getAlertColor = (type) => {
    const colors = {
      'TEMPERATURE':  'bg-orange-100 border-orange-300 text-orange-800',
      'HUMIDITY':     'bg-blue-100 border-blue-300 text-blue-800',
      'SOIL_MOISTURE':'bg-green-100 border-green-300 text-green-800',
      'CRITICAL':     'bg-red-100 border-red-300 text-red-800'
    }
    return colors[type] || 'bg-yellow-100 border-yellow-300 text-yellow-800'
  }

  const getAlertIcon = (type) => {
    const icons = {
      'TEMPERATURE':  '🌡️',
      'HUMIDITY':     '💧',
      'SOIL_MOISTURE':'🌱',
      'CRITICAL':     '🚨'
    }
    return icons[type] || '⚠️'
  }

  return (
    <div className="space-y-2 mb-4">
      {alerts.map((alert, idx) => (
        <div
          key={idx}
          className={`border-l-4 rounded-lg p-4 flex items-center justify-between animate-bounce ${getAlertColor(alert.type)}`}
          style={{ animationDelay: `${idx * 100}ms`, animationDuration: '2s' }}
        >
          <div className="flex items-center gap-3 flex-1">
            <span className="text-2xl">{getAlertIcon(alert.type)}</span>
            <div>
              <p className="font-semibold text-sm">{alert.title}</p>
              <p className="text-xs opacity-90">{alert.message}</p>
              {alert.timestamp && (
                <p className="text-xs opacity-70 mt-1">
                  {new Date(alert.timestamp).toLocaleTimeString('es-CO')}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => onDismiss(idx)}
            className="ml-4 text-lg hover:opacity-70 transition-opacity"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
