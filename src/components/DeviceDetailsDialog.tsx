import type { InstallationRequest } from '../types'
import { formatDateTime } from '../utils/date'
import StatusBadge from './StatusBadge'

type DeviceDetailsDialogProps = {
  onClose: () => void
  request: InstallationRequest | null
}

const fieldClass =
  'rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-neutral-800 dark:bg-neutral-900'

export default function DeviceDetailsDialog({ onClose, request }: DeviceDetailsDialogProps) {
  if (!request) {
    return null
  }

  const fields = [
    ['ID', request.id],
    ['Device ID', request.device_id || '-'],
    ['Manufacturer', request.manufacturer || '-'],
    ['Model', request.device_model || '-'],
    ['Android Version', request.os_version || '-'],
    ['SDK', request.sdk_int ?? '-'],
    ['App Version', request.app_version || '-'],
    ['App Version Code', request.app_version_code ?? '-'],
    ['Installed', formatDateTime(request.installed_at)],
    ['First Registered', formatDateTime(request.first_registered_at)],
    ['Updated', formatDateTime(request.updated_at)],
  ] as const

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-slate-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-950">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-teal-700 dark:text-teal-300">Device Details</p>
            <h2 className="mt-1 break-words text-xl font-semibold text-slate-950 dark:text-white">
              {request.device_id || `Request ${request.id}`}
            </h2>
          </div>
          <StatusBadge status={request.registration_status} />
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {fields.map(([label, value]) => (
            <div className={fieldClass} key={label}>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {label}
              </p>
              <p className="mt-1 break-words text-sm font-medium text-slate-950 dark:text-white">
                {value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-neutral-700 dark:text-slate-200 dark:hover:bg-neutral-900"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
