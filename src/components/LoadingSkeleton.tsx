import { cn } from '../utils/cn'

export function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-slate-200/80 dark:bg-neutral-800',
        className,
      )}
    />
  )
}

export function CardSkeleton() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <SkeletonBlock className="h-4 w-32" />
      <SkeletonBlock className="mt-4 h-8 w-48" />
      <SkeletonBlock className="mt-6 h-10 w-full" />
    </div>
  )
}

export function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 8 }).map((_, index) => (
        <SkeletonBlock className="h-12 w-full" key={index} />
      ))}
    </div>
  )
}
