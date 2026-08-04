import type { DeviceStats, InstallationRequest, RegistrationStatus } from '../types'

export function normalizeStatus(status: RegistrationStatus | null | undefined) {
  return (status?.trim().toUpperCase() || 'PENDING') as 'PENDING' | 'APPROVED' | 'DENIED' | string
}

export function calculateDeviceStats(requests: InstallationRequest[]): DeviceStats {
  return requests.reduce<DeviceStats>(
    (stats, request) => {
      const status = normalizeStatus(request.registration_status)
      stats.total += 1

      if (status === 'APPROVED') {
        stats.approved += 1
      } else if (status === 'DENIED') {
        stats.denied += 1
      } else {
        stats.pending += 1
      }

      return stats
    },
    { approved: 0, denied: 0, pending: 0, total: 0 },
  )
}
