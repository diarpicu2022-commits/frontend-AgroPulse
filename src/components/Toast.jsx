import { useState } from 'react'

export function useToast() {
  const [toasts, setToasts] = useState([])

  const show = (msg, type = 'error') => {
    const id = Date.now()
    setToasts(p => [...p, { id, msg, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000)
  }

  return { toasts, show }
}

export function ToastContainer({ toasts }) {
  if (!toasts.length) return null
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`px-4 py-3 rounded-lg shadow-lg text-white text-sm ${
            t.type === 'error'   ? 'bg-red-600'   :
            t.type === 'success' ? 'bg-green-600' :
            'bg-blue-600'
          }`}
        >
          {t.msg}
        </div>
      ))}
    </div>
  )
}
