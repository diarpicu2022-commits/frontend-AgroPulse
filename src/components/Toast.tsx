import { useState, useEffect, useRef } from 'react'
import { CheckCircle, XCircle, Info } from 'lucide-react'
import anime from 'animejs'

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

const TOAST_CONFIG: Record<Toast['type'], { icon: typeof CheckCircle; bg: string; border: string; text: string; iconCls: string }> = {
  success: { icon: CheckCircle, bg: 'bg-white',       border: 'border-green-200', text: 'text-gray-800', iconCls: 'text-green-500' },
  error:   { icon: XCircle,     bg: 'bg-white',       border: 'border-red-200',   text: 'text-gray-800', iconCls: 'text-red-500'   },
  info:    { icon: Info,        bg: 'bg-white',       border: 'border-blue-200',  text: 'text-gray-800', iconCls: 'text-blue-500'  },
}

function ToastItem({ toast }: { toast: Toast }) {
  const ref = useRef<HTMLDivElement>(null)
  const cfg = TOAST_CONFIG[toast.type]
  const Icon = cfg.icon

  useEffect(() => {
    if (!ref.current) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    anime({
      targets: ref.current,
      translateX: ['100%', '0%'],
      opacity: [0, 1],
      duration: 320,
      easing: 'easeOutCubic',
    })
  }, [])

  return (
    <div
      ref={ref}
      className={`flex items-start gap-3 px-4 py-3 rounded-2xl shadow-card border backdrop-blur-sm
                  text-sm font-medium min-w-[260px] max-w-[340px]
                  ${cfg.bg} ${cfg.border} ${cfg.text}`}
    >
      <Icon size={16} className={`shrink-0 mt-0.5 ${cfg.iconCls}`} />
      <span className="leading-snug">{toast.msg}</span>
    </div>
  )
}

interface ToastContainerProps {
  toasts: Toast[]
}

export function ToastContainer({ toasts }: ToastContainerProps) {
  if (!toasts.length) return null
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 items-end">
      {toasts.map(t => <ToastItem key={t.id} toast={t} />)}
    </div>
  )
}
