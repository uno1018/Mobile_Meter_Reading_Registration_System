import { useMemo } from 'react'
import type { AdminSession, WaterDistrict } from '../types'
import { createWaterDistrictClient } from '../services/supabaseFactory'

export function useSupabaseConnection(
  waterDistrict: WaterDistrict | null | undefined,
  adminSession: AdminSession | null | undefined,
) {
  const client = useMemo(() => {
    if (!waterDistrict) {
      return null
    }

    return createWaterDistrictClient(
      waterDistrict.supabase_url,
      waterDistrict.supabase_anon_key,
      adminSession?.accessToken,
    )
  }, [adminSession?.accessToken, waterDistrict])

  return {
    client,
    connectedDistrict: waterDistrict ?? null,
    isConnected: Boolean(client && waterDistrict?.active),
  }
}
