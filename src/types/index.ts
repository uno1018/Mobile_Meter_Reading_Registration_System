import type { SupabaseClient, User } from '@supabase/supabase-js'

export type RegistrationStatus = 'PENDING' | 'APPROVED' | 'DENIED' | string

export type WaterDistrict = {
  id: string
  water_district: string
  description: string | null
  supabase_url: string
  supabase_anon_key: string
  active: boolean
  created_at: string
}

export type InstallationRequest = {
  id: number
  device_id: string | null
  manufacturer: string | null
  device_model: string | null
  os_version: string | null
  sdk_int: number | null
  app_version: string | null
  app_version_code: number | null
  installed_at: string | null
  registration_status: RegistrationStatus | null
  first_registered_at: string | null
  updated_at: string | null
}

export type DeviceStats = {
  total: number
  pending: number
  approved: number
  denied: number
}

export type AdminSession = {
  accessToken: string
  email: string
  user: User
}

export type DistrictClient = SupabaseClient

export type RegistrationDecision = 'APPROVED' | 'DENIED'
