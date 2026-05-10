import { useState } from 'react'

interface Toast {
  id: number
  msg: string
  type: 'error' | 'success' | 'info'
}

interface UseToastReturn {
  toasts: Toast[]
  show: (msg: string, type?: 'error' | 'success' | 'info') => void
}

export function useToast(): UseToastReturn {
  const [toasts, setToasts] = useState<Toast[]>([])

  const show = (msg: string, type: 'error' | 'success' | 'info' = 'error') => {
    const id = Date.now()
    setToasts(p => [...p, { id, msg, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000)
  }

  return { toasts, show }
}

interface ToastContainerProps {
  toasts: Toast[]
}

export function ToastContainer({ toasts }: ToastContainerProps) {
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
