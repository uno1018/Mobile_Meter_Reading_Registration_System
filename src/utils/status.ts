import type { DeviceStats, InstallationRequest, RegistrationStatus } from '../types'

export function normalizeStatus(status: RegistrationStatus | null | undefined) {
  return (status?.trim().toUpperCase() || 'PENDING') as 'PENDING' | 'APPROVED' | 'DENIED' | string
}

export function calculateDeviceStats(requests: InstallationRequest[]): DeviceStats {
  return requests.reduce<DeviceStats>(
    (stats, request) => {
      // While a district is disabled every row reads DISABLED, so counting the
      // stored status would report the whole fleet as pending. The status each
      // device returns to is the one worth showing.
      const status = normalizeStatus(request.status_before_disable ?? request.registration_status)
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
