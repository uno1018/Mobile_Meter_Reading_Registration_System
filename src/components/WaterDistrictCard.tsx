import { Building2, Loader2, Pencil, Trash2, Wifi } from 'lucide-react'
import type { WaterDistrict } from '../types'
import StatusBadge from './StatusBadge'

type WaterDistrictCardProps = {
  // Both omitted for a signed out visitor, who may look but not manage.
  canManage?: boolean
  isConnecting?: boolean
  onConnect: (district: WaterDistrict) => void
  onDelete?: (district: WaterDistrict) => void
  onEdit?: (district: WaterDistrict) => void
  waterDistrict: WaterDistrict
}

export default function WaterDistrictCard({
  canManage = false,
  isConnecting = false,
  onConnect,
  onDelete,
  onEdit,
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

      <div className="mt-5 flex gap-2">
        <button
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:bg-slate-300 disabled:text-slate-600 dark:disabled:bg-neutral-700 dark:disabled:text-slate-400"
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

        {canManage ? (
          <>
            <button
              aria-label={`Edit ${waterDistrict.water_district}`}
              className="rounded-lg border border-slate-200 px-3 py-2.5 text-slate-600 transition hover:bg-slate-50 dark:border-neutral-700 dark:text-slate-300 dark:hover:bg-neutral-800"
              onClick={() => onEdit?.(waterDistrict)}
              title="Edit"
              type="button"
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              aria-label={`Delete ${waterDistrict.water_district}`}
              className="rounded-lg border border-slate-200 px-3 py-2.5 text-red-600 transition hover:bg-red-50 dark:border-neutral-700 dark:text-red-400 dark:hover:bg-red-500/10"
              onClick={() => onDelete?.(waterDistrict)}
              title="Delete"
              type="button"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </>
        ) : null}
      </div>
    </article>
  )
}
