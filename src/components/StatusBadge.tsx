import { cn } from '../utils/cn'
import { normalizeStatus } from '../utils/status'

export default function StatusBadge({ status }: { status: string | null | undefined }) {
  const normalizedStatus = normalizeStatus(status)

  return (
    <span
      className={cn(
        'inline-flex min-w-24 items-center justify-center rounded-md px-2.5 py-1 text-xs font-semibold',
        normalizedStatus === 'PENDING' &&
          'bg-amber-100 text-amber-800 ring-1 ring-amber-200 dark:bg-amber-400/10 dark:text-amber-200 dark:ring-amber-400/30',
        normalizedStatus === 'APPROVED' &&
          'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-200 dark:ring-emerald-400/30',
        normalizedStatus === 'DENIED' &&
          'bg-red-100 text-red-800 ring-1 ring-red-200 dark:bg-red-400/10 dark:text-red-200 dark:ring-red-400/30',
        !['PENDING', 'APPROVED', 'DENIED'].includes(normalizedStatus) &&
          'bg-slate-100 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-700/40 dark:text-slate-200 dark:ring-slate-600',
      )}
    >
      {normalizedStatus}
    </span>
  )
}
