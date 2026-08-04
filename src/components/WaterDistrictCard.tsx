import { Building2, Loader2, Wifi } from 'lucide-react'
import type { WaterDistrict } from '../types'
import StatusBadge from './StatusBadge'

type WaterDistrictCardProps = {
  isConnecting?: boolean
  onConnect: (district: WaterDistrict) => void
  waterDistrict: WaterDistrict
}

export default function WaterDistrictCard({
  isConnecting = false,
  onConnect,
  waterDistrict,
}: WaterDistrictCardProps) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-start justify-between gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-300">
          <Building2 className="h-5 w-5" aria-hidden="true" />
        </span>
        <StatusBadge status={waterDistrict.active ? 'APPROVED' : 'DENIED'} />
      </div>

      <div className="mt-5 min-h-24">
        <h2 className="line-clamp-2 text-lg font-semibold text-slate-950 dark:text-white">
          {waterDistrict.water_district}
        </h2>
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
          {waterDistrict.description || 'No description'}
        </p>
      </div>

      <button
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:bg-slate-300 disabled:text-slate-600 dark:disabled:bg-neutral-700 dark:disabled:text-slate-400"
        disabled={!waterDistrict.active || isConnecting}
        onClick={() => onConnect(waterDistrict)}
        type="button"
      >
        {isConnecting ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Wifi className="h-4 w-4" aria-hidden="true" />
        )}
        Connect
      </button>
    </article>
  )
}
