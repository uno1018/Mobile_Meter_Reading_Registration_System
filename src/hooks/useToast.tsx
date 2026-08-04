import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '../utils/cn'

type ToastType = 'success' | 'error' | 'info'

type Toast = {
  id: string
  message?: string
  title: string
  type: ToastType
}

type ToastContextValue = {
  addToast: (toast: Omit<Toast, 'id'>) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const toastIcons = {
  error: XCircle,
  info: AlertTriangle,
  success: CheckCircle2,
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = crypto.randomUUID()
    setToasts((current) => [...current, { ...toast, id }])

    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id))
    }, 4_500)
  }, [])

  const value = useMemo(() => ({ addToast }), [addToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[min(420px,calc(100vw-2rem))] flex-col gap-3">
        {toasts.map((toast) => {
          const Icon = toastIcons[toast.type]

          return (
            <div
              className={cn(
                'pointer-events-auto flex items-start gap-3 rounded-lg border bg-white p-4 shadow-xl shadow-slate-900/10 dark:bg-neutral-900',
                toast.type === 'success' &&
                  'border-emerald-200 text-emerald-900 dark:border-emerald-900/70 dark:text-emerald-100',
                toast.type === 'error' &&
                  'border-red-200 text-red-900 dark:border-red-900/70 dark:text-red-100',
                toast.type === 'info' &&
                  'border-amber-200 text-amber-900 dark:border-amber-900/70 dark:text-amber-100',
              )}
              key={toast.id}
              role="status"
            >
              <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold">{toast.title}</p>
                {toast.message ? <p className="mt-1 text-sm opacity-80">{toast.message}</p> : null}
              </div>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)

  if (!context) {
    throw new Error('useToast must be used inside ToastProvider')
  }

  return context
}
