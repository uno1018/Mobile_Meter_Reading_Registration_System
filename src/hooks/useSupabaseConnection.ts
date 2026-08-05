import { useMemo } from 'react'
import type { WaterDistrict } from '../types'
import { createWaterDistrictClient } from '../services/supabaseFactory'

export function useSupabaseConnection(waterDistrict: WaterDistrict | null | undefined) {
  const client = useMemo(() => {
    if (!waterDistrict) {
      return null
    }

    return createWaterDistrictClient(waterDistrict.supabase_url, waterDistrict.supabase_anon_key)
  }, [waterDistrict])

  return {
    client,
    connectedDistrict: waterDistrict ?? null,
    isConnected: Boolean(client && waterDistrict?.active),
  }
}
