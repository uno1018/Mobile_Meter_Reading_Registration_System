import type { DistrictClient, InstallationRequest, NewWaterDistrict, RegistrationDecision, WaterDistrict } from '../types'
import { createWaterDistrictClient, getCentralSupabaseClient } from './supabaseFactory'

// PostgREST returns its failures as a plain JSON object rather than an Error
// instance, so rethrowing one as is makes every `error instanceof Error` check
// in the UI fall through to its generic fallback text and hide the cause. Wrap
// it in a real Error, keeping hint and details: when a statement is refused,
// Postgres puts the actionable fix in hint, not in message.
function toError(error: unknown, fallbackMessage: string) {
  if (error instanceof Error) {
    return error
  }

  const { code, details, hint, message } = (error ?? {}) as {
    code?: string
    details?: string
    hint?: string
    message?: string
  }

  const parts = [message?.trim() || fallbackMessage]

  // The registry lives behind a registration_admin check, and an account
  // without the claim is the usual reason an insert here is refused.
  if (code === '42501') {
    parts.push(
      'The signed-in account is missing the registration_admin claim in app_metadata. Grant it in the central project, then sign out and back in.',
    )
  }

  if (hint) {
    parts.push(hint)
  }

  if (details) {
    parts.push(details)
  }

  const wrapped = new Error(code ? `${parts.join(' ')} (${code})` : parts.join(' '))
  wrapped.cause = error

  return wrapped
}

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
    throw toError(error, 'The registry could not be read.')
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
    throw toError(error, 'That Water District could not be read from the registry.')
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
    throw toError(error, 'The registry row could not be created.')
  }

  return data as WaterDistrict
}

// Probes a district project before its credentials are stored. Anon has no
// select on installation_requests by design, so the check goes through the
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
      'Reached the project, but get_registration_status is missing. Run supabase/installation_requests.sql there first.',
    )
  }

  if (/api key/i.test(error.message)) {
    throw new Error('The project rejected this anon key.')
  }

  throw toError(error, 'The district project could not be reached.')
}

export async function fetchInstallationRequests(client: DistrictClient) {
  const { data, error } = await client
    .from('installation_requests')
    .select(installationRequestColumns)
    .order('installed_at', { ascending: false, nullsFirst: false })

  if (error) {
    throw toError(error, 'The installation requests could not be read.')
  }

  return (data ?? []) as InstallationRequest[]
}

export async function updateInstallationRequestStatus(
  client: DistrictClient,
  requestId: number,
  status: RegistrationDecision,
) {
  const { data, error } = await client
    .from('installation_requests')
    // updated_at is set by a trigger in the district project, so it is not sent
    // here -- the update grant only covers registration_status.
    .update({ registration_status: status })
    .eq('id', requestId)
    .select(installationRequestColumns)
    .single()

  if (error) {
    throw toError(error, 'The registration status could not be updated.')
  }

  return data as InstallationRequest
}
