import type { DistrictClient, InstallationRequest, NewWaterDistrict, RegistrationDecision, WaterDistrict } from '../types'
import { createWaterDistrictClient, getCentralSupabaseClient } from './supabaseFactory'

const installationRequestColumns = `
  id,
  device_id,
  manufacturer,
  device_model,
  os_version,
  sdk_int,
  app_version,
  app_version_code,
  installed_at,
  registration_status,
  first_registered_at,
  updated_at
`

export async function getAdminSession() {
  const supabase = getCentralSupabaseClient()
  const { data, error } = await supabase.auth.getSession()

  if (error) {
    throw error
  }

  if (!data.session) {
    return null
  }

  return {
    accessToken: data.session.access_token,
    email: data.session.user.email ?? 'Administrator',
    user: data.session.user,
  }
}

export async function signInAdmin(email: string, password: string) {
  const supabase = getCentralSupabaseClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    throw error
  }

  if (!data.session) {
    throw new Error('Sign in completed without an active session')
  }

  return {
    accessToken: data.session.access_token,
    email: data.session.user.email ?? email,
    user: data.session.user,
  }
}

export async function signUpAdmin(email: string, password: string) {
  const supabase = getCentralSupabaseClient()
  const { data, error } = await supabase.auth.signUp({ email, password })

  if (error) {
    throw error
  }

  // The registration_admin claim lives in app_metadata, which the client cannot
  // write. A new account can sign in but sees nothing until an existing
  // administrator grants the claim.
  return {
    email: data.user?.email ?? email,
    needsEmailConfirmation: !data.session,
  }
}

export async function signOutAdmin() {
  const supabase = getCentralSupabaseClient()
  const { error } = await supabase.auth.signOut()

  if (error) {
    throw error
  }
}

export async function fetchWaterDistricts() {
  const supabase = getCentralSupabaseClient()
  const { data, error } = await supabase
    .from('RegistrationApp')
    .select('*')
    .order('water_district', { ascending: true })

  if (error) {
    throw error
  }

  return (data ?? []) as WaterDistrict[]
}

export async function fetchWaterDistrict(waterDistrictId: string) {
  const supabase = getCentralSupabaseClient()
  const { data, error } = await supabase
    .from('RegistrationApp')
    .select('*')
    .eq('id', waterDistrictId)
    .single()

  if (error) {
    throw error
  }

  return data as WaterDistrict
}

export async function createWaterDistrict(input: NewWaterDistrict) {
  const supabase = getCentralSupabaseClient()
  const { data, error } = await supabase
    .from('RegistrationApp')
    .insert(input)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return data as WaterDistrict
}

// Probes a district project before its credentials are stored. Anon has no
// select on installation_request by design, so the check goes through the
// status function instead -- which also proves the district schema was applied.
export async function testWaterDistrictConnection(supabaseUrl: string, supabaseAnonKey: string) {
  const client = createWaterDistrictClient(supabaseUrl, supabaseAnonKey)
  const { error } = await client.rpc('get_registration_status', {
    p_device_id: '__connection_test__',
  })

  if (!error) {
    return
  }

  if (error.code === 'PGRST202') {
    throw new Error(
      'Reached the project, but get_registration_status is missing. Run supabase/installation_request.sql there first.',
    )
  }

  if (/api key/i.test(error.message)) {
    throw new Error('The project rejected this anon key.')
  }

  throw new Error(error.message)
}

export async function fetchInstallationRequests(client: DistrictClient) {
  const { data, error } = await client
    .from('installation_request')
    .select(installationRequestColumns)
    .order('installed_at', { ascending: false, nullsFirst: false })

  if (error) {
    throw error
  }

  return (data ?? []) as InstallationRequest[]
}

export async function updateInstallationRequestStatus(
  client: DistrictClient,
  requestId: number,
  status: RegistrationDecision,
) {
  const { data, error } = await client
    .from('installation_request')
    // updated_at is set by a trigger in the district project, so it is not sent
    // here -- the update grant only covers registration_status.
    .update({ registration_status: status })
    .eq('id', requestId)
    .select(installationRequestColumns)
    .single()

  if (error) {
    throw error
  }

  return data as InstallationRequest
}
