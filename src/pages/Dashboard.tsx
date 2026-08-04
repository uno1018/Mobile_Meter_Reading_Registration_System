import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { AlertTriangle, Building2, CheckCircle2, Database, Smartphone, Wifi, XCircle } from 'lucide-react'
import { fetchWaterDistricts } from '../services/registrationService'
import { getCentralConfigError } from '../services/supabaseFactory'
import type { WaterDistrict } from '../types'
import { CardSkeleton } from '../components/LoadingSkeleton'
import StatCard from '../components/StatCard'
import WaterDistrictCard from '../components/WaterDistrictCard'

export default function Dashboard() {
  const navigate = useNavigate()
  const centralConfigError = getCentralConfigError()
  const [connectingDistrictId, setConnectingDistrictId] = useState<string | null>(null)
  const [lastConnectedDistrict, setLastConnectedDistrict] = useState(() => {
    if (typeof window === 'undefined') {
      return 'None'
    }

    return window.localStorage.getItem('connected-water-district') ?? 'None'
  })

  const waterDistrictsQuery = useQuery({
    queryKey: ['water-districts'],
    queryFn: fetchWaterDistricts,
    enabled: !centralConfigError,
  })

  const waterDistricts = waterDistrictsQuery.data ?? []

  const handleConnect = (district: WaterDistrict) => {
    setConnectingDistrictId(district.id)
    window.localStorage.setItem('connected-water-district', district.water_district)
    setLastConnectedDistrict(district.water_district)
    navigate(`/district/${district.id}`)
  }

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
          <Database className="h-5 w-5 text-slate-400" aria-hidden="true" />
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
                isConnecting={connectingDistrictId === district.id}
                key={district.id}
                onConnect={handleConnect}
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
              Insert rows into `RegistrationApp` to make them available here.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
