import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { AlertTriangle, Building2, CheckCircle2, Database, Plus, Smartphone, Wifi, XCircle } from 'lucide-react'
import { deleteWaterDistrict, fetchWaterDistricts, getAdminSession } from '../services/registrationService'
import { getCentralConfigError } from '../services/supabaseFactory'
import type { WaterDistrict } from '../types'
import ConfirmDialog from '../components/ConfirmDialog'
import WaterDistrictDialog from '../components/WaterDistrictDialog'
import { CardSkeleton } from '../components/LoadingSkeleton'
import StatCard from '../components/StatCard'
import WaterDistrictCard from '../components/WaterDistrictCard'
import { useToast } from '../hooks/useToast'

export default function Dashboard() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const centralConfigError = getCentralConfigError()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingDistrict, setEditingDistrict] = useState<WaterDistrict | null>(null)
  const [deletingDistrict, setDeletingDistrict] = useState<WaterDistrict | null>(null)
  const [connectingDistrictId, setConnectingDistrictId] = useState<string | null>(null)
  const [lastConnectedDistrict, setLastConnectedDistrict] = useState(() => {
    if (typeof window === 'undefined') {
      return 'None'
    }

    return window.localStorage.getItem('connected-water-district') ?? 'None'
  })

  const adminSessionQuery = useQuery({
    queryKey: ['admin-session'],
    queryFn: getAdminSession,
    enabled: !centralConfigError,
  })

  const waterDistrictsQuery = useQuery({
    queryKey: ['water-districts'],
    queryFn: fetchWaterDistricts,
    enabled: !centralConfigError,
  })

  const waterDistricts = waterDistrictsQuery.data ?? []
  const canAddDistrict = Boolean(adminSessionQuery.data)

  const handleConnect = (district: WaterDistrict) => {
    setConnectingDistrictId(district.id)
    window.localStorage.setItem('connected-water-district', district.water_district)
    setLastConnectedDistrict(district.water_district)
    navigate(`/district/${district.id}`)
  }

  const openDialog = (district: WaterDistrict | null) => {
    setEditingDistrict(district)
    setDialogOpen(true)
  }

  const deleteMutation = useMutation({
    mutationFn: (district: WaterDistrict) => deleteWaterDistrict(district.id),
    onError: (error) => {
      addToast({
        message: error instanceof Error ? error.message : 'The registry row could not be deleted.',
        title: 'Could not delete Water District',
        type: 'error',
      })
    },
    onSuccess: async (_, district) => {
      await queryClient.invalidateQueries({ queryKey: ['water-districts'] })
      addToast({
        message: `${district.water_district} was removed from the registry.`,
        title: 'Water District deleted',
        type: 'success',
      })
      setDeletingDistrict(null)
    },
  })

  if (centralConfigError) {
    return (
      <section className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <h2 className="text-lg font-semibold">Central Supabase configuration is missing</h2>
            <p className="mt-2 text-sm leading-6">{centralConfigError}</p>
            <p className="mt-2 text-sm leading-6">
              Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to `.env.local`.
            </p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard icon={Building2} label="Total Water Districts" value={waterDistricts.length} />
        <StatCard icon={Wifi} label="Connected Water District" value={lastConnectedDistrict} />
        <StatCard icon={Smartphone} label="Total Devices" value={0} />
        <StatCard icon={AlertTriangle} label="Pending" value={0} />
        <StatCard icon={CheckCircle2} label="Approved" value={0} />
        <StatCard icon={XCircle} label="Denied" value={0} />
      </section>

      {waterDistrictsQuery.isError ? (
        <section className="rounded-lg border border-red-200 bg-red-50 p-5 text-red-900 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div>
              <h2 className="font-semibold">Unable to load Water Districts</h2>
              <p className="mt-1 text-sm">
                {waterDistrictsQuery.error instanceof Error
                  ? waterDistrictsQuery.error.message
                  : 'The central registry request failed.'}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Registry</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Active rows can connect to their independent Supabase project.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Database className="h-5 w-5 text-slate-400" aria-hidden="true" />
            <button
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:bg-slate-300 disabled:text-slate-600 dark:disabled:bg-neutral-700 dark:disabled:text-slate-400"
              disabled={!canAddDistrict}
              onClick={() => openDialog(null)}
              title={canAddDistrict ? undefined : 'Sign in as an administrator to add a Water District'}
              type="button"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add Water District
            </button>
          </div>
        </div>

        {waterDistrictsQuery.isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <CardSkeleton key={index} />
            ))}
          </div>
        ) : waterDistricts.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {waterDistricts.map((district) => (
              <WaterDistrictCard
                canManage={canAddDistrict}
                isConnecting={connectingDistrictId === district.id}
                key={district.id}
                onConnect={handleConnect}
                onDelete={setDeletingDistrict}
                onEdit={openDialog}
                waterDistrict={district}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center dark:border-neutral-700 dark:bg-neutral-900">
            <Building2 className="mx-auto h-10 w-10 text-slate-400" aria-hidden="true" />
            <h2 className="mt-4 text-lg font-semibold text-slate-950 dark:text-white">
              No Water Districts registered
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {canAddDistrict
                ? 'Add a district Supabase project to make it available here.'
                : 'Sign in as an administrator to add a Water District.'}
            </p>
            {canAddDistrict ? (
              <button
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800"
                onClick={() => openDialog(null)}
                type="button"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add Water District
              </button>
            ) : null}
          </div>
        )}
      </section>

      <WaterDistrictDialog
        onClose={() => setDialogOpen(false)}
        open={dialogOpen}
        waterDistrict={editingDistrict}
      />

      <ConfirmDialog
        confirmLabel="Delete"
        description={
          deletingDistrict
            ? `${deletingDistrict.water_district} will be removed from the registry. Its devices are not touched -- they live in the district's own Supabase project, and re-adding the district brings them back.`
            : ''
        }
        isLoading={deleteMutation.isPending}
        onCancel={() => setDeletingDistrict(null)}
        onConfirm={() => {
          if (deletingDistrict) {
            deleteMutation.mutate(deletingDistrict)
          }
        }}
        open={Boolean(deletingDistrict)}
        title="Delete Water District"
        variant="deny"
      />
    </div>
  )
}
