import type { ComponentType, SVGProps } from 'react'

type StatCardProps = {
  icon: ComponentType<SVGProps<SVGSVGElement>>
  label: string
  value: number | string
}

export default function StatCard({ icon: Icon, label, value }: StatCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-400/10 dark:text-teal-300">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-1 truncate text-2xl font-semibold text-slate-950 dark:text-white">
            {value}
          </p>
        </div>
      </div>
    </div>
  )
}
