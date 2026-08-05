import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Database,
  Loader2,
  Power,
  ShieldCheck,
  Smartphone,
  Wifi,
  XCircle,
} from 'lucide-react'
import ConfirmDialog from '../components/ConfirmDialog'
import DataTable from '../components/DataTable'
import DeviceDetailsDialog from '../components/DeviceDetailsDialog'
import StatCard from '../components/StatCard'
import { useToast } from '../hooks/useToast'
import { useSupabaseConnection } from '../hooks/useSupabaseConnection'
import {
  fetchDistrictDevicesEnabled,
  fetchInstallationRequests,
  fetchWaterDistrict,
  getAdminSession,
  setDistrictDevicesEnabled,
  updateInstallationRequestStatus,
} from '../services/registrationService'
import { getCentralConfigError } from '../services/supabaseFactory'
import type { InstallationRequest, RegistrationDecision } from '../types'
import { calculateDeviceStats } from '../utils/status'

type PendingDecision = {
  request: InstallationRequest
  status: RegistrationDecision
}

export default function WaterDistrict() {
  const { districtId } = useParams()
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const centralConfigError = getCentralConfigError()
  const [pendingDecision, setPendingDecision] = useState<PendingDecision | null>(null)
  const [detailRequest, setDetailRequest] = useState<InstallationRequest | null>(null)
  const [confirmDisable, setConfirmDisable] = useState(false)

  const adminSessionQuery = useQuery({
    queryKey: ['admin-session'],
    queryFn: getAdminSession,
    enabled: !centralConfigError,
  })

  const waterDistrictQuery = useQuery({
    queryKey: ['water-district', districtId],
    queryFn: () => fetchWaterDistrict(districtId ?? ''),
    enabled: Boolean(districtId && !centralConfigError),
  })

  const { client, connectedDistrict, isConnected } = useSupabaseConnection(waterDistrictQuery.data)
  const districtAdminKey = waterDistrictQuery.data?.district_admin_key ?? null

  useEffect(() => {
    if (connectedDistrict) {
      window.localStorage.setItem('connected-water-district', connectedDistrict.water_district)
    }
  }, [connectedDistrict])

  const installationRequestsQuery = useQuery({
    queryKey: ['installation-requests', districtId],
    queryFn: () => {
      if (!client) {
        throw new Error('Water District connection is not ready')
      }

      return fetchInstallationRequests(client, districtAdminKey)
    },
    enabled: Boolean(client && isConnected),
  })

  const devicesEnabledQuery = useQuery({
    queryKey: ['district-devices-enabled', districtId],
    queryFn: () => {
      if (!client) {
        throw new Error('Water District connection is not ready')
      }

      return fetchDistrictDevicesEnabled(client, districtAdminKey)
    },
    enabled: Boolean(client && isConnected),
  })

  const devicesEnabled = devicesEnabledQuery.data ?? true

  const serviceMutation = useMutation({
    mutationFn: (enabled: boolean) => {
      if (!client) {
        throw new Error('Water District connection is not ready')
      }

      return setDistrictDevicesEnabled(client, districtAdminKey, enabled)
    },
    onError: (error) => {
      addToast({
        message: error instanceof Error ? error.message : 'The district could not be switched.',
        title: 'Change failed',
        type: 'error',
      })
    },
    onSuccess: async (enabled) => {
      await queryClient.invalidateQueries({ queryKey: ['district-devices-enabled', districtId] })
      addToast({
        message: enabled
          ? 'Approvals are restored and devices can register again.'
          : 'Every approved device in this district now reads back DISABLED.',
        title: enabled ? 'District enabled' : 'District disabled',
        type: 'success',
      })
      setConfirmDisable(false)
    },
  })

  const stats = useMemo(
    () => calculateDeviceStats(installationRequestsQuery.data ?? []),
    [installationRequestsQuery.data],
  )

  const decisionMutation = useMutation({
    mutationFn: ({ request, status }: PendingDecision) => {
      if (!client) {
        throw new Error('Water District connection is not ready')
      }

      return updateInstallationRequestStatus(client, districtAdminKey, request.id, status)
    },
    onError: (error) => {
      addToast({
        message:
          error instanceof Error
            ? error.message
            : 'The installation request could not be updated.',
        title: 'Update failed',
        type: 'error',
      })
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['installation-requests', districtId] })
      addToast({
        message: `Request ${variables.request.id} is now ${variables.status}.`,
        title: 'Status updated',
        type: 'success',
      })
      setPendingDecision(null)
    },
  })

  const canMutate = Boolean(adminSessionQuery.data && client && isConnected)
  const actionPendingId = decisionMutation.isPending
    ? decisionMutation.variables?.request.id ?? null
    : null

  if (centralConfigError) {
    return (
      <section className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <h2 className="text-lg font-semibold">Central Supabase configuration is missing</h2>
            <p className="mt-2 text-sm leading-6">{centralConfigError}</p>
          </div>
        </div>
      </section>
    )
  }

  if (waterDistrictQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-28 animate-pulse rounded-lg bg-slate-200 dark:bg-neutral-800" />
        <div className="h-96 animate-pulse rounded-lg bg-slate-200 dark:bg-neutral-800" />
      </div>
    )
  }

  if (waterDistrictQuery.isError || !connectedDistrict) {
    return (
      <section className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-900 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <h2 className="text-lg font-semibold">Water District not found</h2>
            <p className="mt-2 text-sm leading-6">
              {waterDistrictQuery.error instanceof Error
                ? waterDistrictQuery.error.message
                : 'The selected registry row could not be loaded.'}
            </p>
            <Link className="mt-4 inline-flex text-sm font-semibold underline" to="/">
              Back to dashboard
            </Link>
          </div>
        </div>
      </section>
    )
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-400/10 dark:text-teal-300">
              <Building2 className="h-6 w-6" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-medium text-teal-700 dark:text-teal-300">
                Connected Water District
              </p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white">
                {connectedDistrict.water_district}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                {connectedDistrict.description || 'No description'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 dark:border-neutral-700 dark:text-slate-300">
              <Wifi className="h-4 w-4 text-teal-700 dark:text-teal-300" aria-hidden="true" />
              {isConnected ? 'Connected' : 'Inactive'}
            </span>
            <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 dark:border-neutral-700 dark:text-slate-300">
              <ShieldCheck className="h-4 w-4 text-teal-700 dark:text-teal-300" aria-hidden="true" />
              {adminSessionQuery.data ? 'Admin Session' : 'Read Only'}
            </span>

            {canMutate ? (
              <button
                className={
                  devicesEnabled
                    ? 'inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-70 dark:border-red-500/30 dark:text-red-300 dark:hover:bg-red-500/10'
                    : 'inline-flex items-center gap-2 rounded-lg border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-70 dark:border-emerald-500/30 dark:text-emerald-300 dark:hover:bg-emerald-500/10'
                }
                disabled={devicesEnabledQuery.isLoading || serviceMutation.isPending}
                onClick={() => {
                  if (devicesEnabled) {
                    setConfirmDisable(true)
                  } else {
                    serviceMutation.mutate(true)
                  }
                }}
                type="button"
              >
                {serviceMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Power className="h-4 w-4" aria-hidden="true" />
                )}
                {devicesEnabled ? 'Disable Devices' : 'Enable Devices'}
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard icon={Database} label="Total Water Districts" value={1} />
        <StatCard icon={Wifi} label="Connected Water District" value={connectedDistrict.water_district} />
        <StatCard icon={Smartphone} label="Total Devices" value={stats.total} />
        <StatCard icon={AlertTriangle} label="Pending" value={stats.pending} />
        <StatCard icon={CheckCircle2} label="Approved" value={stats.approved} />
        <StatCard icon={XCircle} label="Denied" value={stats.denied} />
      </section>

      {!adminSessionQuery.data ? (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
          Sign in as an administrator to approve or deny devices.
        </section>
      ) : null}

      {devicesEnabledQuery.data === false ? (
        <section className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100">
          <div className="flex items-start gap-3">
            <Power className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div>
              <h2 className="font-semibold">Devices are disabled for this district</h2>
              <p className="mt-1 leading-6">
                Approved handsets read back DISABLED and cannot work, and new devices cannot
                register. Approving a device here is staged and takes effect once the district is
                enabled again.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {installationRequestsQuery.isError ? (
        <section className="rounded-lg border border-red-200 bg-red-50 p-5 text-red-900 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div>
              <h2 className="font-semibold">Unable to load installation requests</h2>
              <p className="mt-1 text-sm">
                {installationRequestsQuery.error instanceof Error
                  ? installationRequestsQuery.error.message
                  : 'The Water District database request failed.'}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <DataTable
        actionPendingId={actionPendingId}
        canMutate={canMutate}
        data={installationRequestsQuery.data ?? []}
        isLoading={installationRequestsQuery.isLoading}
        isRefreshing={installationRequestsQuery.isFetching && !installationRequestsQuery.isLoading}
        onApprove={(request) => setPendingDecision({ request, status: 'APPROVED' })}
        onDeny={(request) => setPendingDecision({ request, status: 'DENIED' })}
        onRefresh={() => {
          void installationRequestsQuery.refetch()
        }}
        onViewDetails={setDetailRequest}
      />

      <ConfirmDialog
        confirmLabel="Disable Devices"
        description={`Every approved device in ${connectedDistrict.water_district} will be set to DISABLED and stop working, and no new device can register. Pending and denied devices are left as they are. Approvals are restored when you enable the district again.`}
        isLoading={serviceMutation.isPending}
        onCancel={() => setConfirmDisable(false)}
        onConfirm={() => serviceMutation.mutate(false)}
        open={confirmDisable}
        title="Disable devices for this district?"
        variant="deny"
      />

      <ConfirmDialog
        confirmLabel={pendingDecision?.status === 'APPROVED' ? 'Approve Device' : 'Deny Device'}
        description={
          pendingDecision
            ? `This will set request ${pendingDecision.request.id} to ${pendingDecision.status} and update its timestamp.`
            : ''
        }
        isLoading={decisionMutation.isPending}
        onCancel={() => setPendingDecision(null)}
        onConfirm={() => {
          if (pendingDecision) {
            decisionMutation.mutate(pendingDecision)
          }
        }}
        open={Boolean(pendingDecision)}
        title={pendingDecision?.status === 'APPROVED' ? 'Approve installation request?' : 'Deny installation request?'}
        variant={pendingDecision?.status === 'DENIED' ? 'deny' : 'approve'}
      />

      <DeviceDetailsDialog onClose={() => setDetailRequest(null)} request={detailRequest} />
    </div>
  )
}
