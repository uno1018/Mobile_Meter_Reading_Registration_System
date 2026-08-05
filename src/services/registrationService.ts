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
  // without the claim is the usual reason an insert here is refused. The
  // district functions raise 42501 too, but say so in their own message.
  if (code === '42501' && !message?.includes('district admin key')) {
    parts.push(
      'The signed-in account is missing the registration_admin claim in app_metadata. Grant it in the central project, then sign out and back in.',
    )
  }

  // A district that has not had the current schema applied.
  if (code === 'PGRST202') {
    parts.push('Run supabase/installation_requests.sql in the district project.')
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

export async function updateWaterDistrict(waterDistrictId: string, input: NewWaterDistrict) {
  const supabase = getCentralSupabaseClient()
  const { data, error } = await supabase
    .from('RegistrationApp')
    .update(input)
    .eq('id', waterDistrictId)
    .select('*')
    .single()

  if (error) {
    throw toError(error, 'The registry row could not be updated.')
  }

  return data as WaterDistrict
}

// Removes the registry row only. Devices live in the district's own project and
// are untouched, so re-adding the district brings its inventory back.
export async function deleteWaterDistrict(waterDistrictId: string) {
  const supabase = getCentralSupabaseClient()
  const { error } = await supabase.from('RegistrationApp').delete().eq('id', waterDistrictId)

  if (error) {
    throw toError(error, 'The registry row could not be deleted.')
  }
}

// Probes a district project before its credentials are stored. Anon has no
// select on installation_requests by design, so the check goes through the
// status function instead -- which also proves the district schema was applied.
export async function testWaterDistrictConnection(
  supabaseUrl: string,
  supabaseAnonKey: string,
  adminKey: string,
) {
  const client = createWaterDistrictClient(supabaseUrl, supabaseAnonKey)
  const { error } = await client.rpc('get_registration_status', {
    p_device_id: '__connection_test__',
  })

  if (error) {
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

  // The anon probe above only proves the project is reachable and carries the
  // schema. The console reads devices through the admin key, so check that too
  // -- otherwise a district saves cleanly and then fails on the first page load.
  const adminProbe = await client.rpc('admin_list_installation_requests', {
    p_admin_key: adminKey,
  })

  if (adminProbe.error) {
    if (adminProbe.error.code === 'PGRST202') {
      throw new Error(
        'The district project has an older schema without the console functions. Re-run supabase/installation_requests.sql there.',
      )
    }

    if (adminProbe.error.code === '42501') {
      throw new Error(
        'The project did not accept this admin key. Run set_district_admin_key there with the same value.',
      )
    }

    throw toError(adminProbe.error, 'The admin key could not be verified.')
  }
}

// Both district calls go through security definer functions that check the
// admin key, rather than selecting the table directly: the district cannot
// verify the central project's token, so there is no district session to
// authorize against.
function requireAdminKey(adminKey: string | null | undefined) {
  if (!adminKey) {
    throw new Error(
      'This Water District has no admin key. Add one to its registry row, then run set_district_admin_key with the same value in the district project.',
    )
  }

  return adminKey
}

export async function fetchInstallationRequests(
  client: DistrictClient,
  adminKey: string | null | undefined,
) {
  const { data, error } = await client.rpc('admin_list_installation_requests', {
    p_admin_key: requireAdminKey(adminKey),
  })

  if (error) {
    throw toError(error, 'The installation requests could not be read.')
  }

  return (data ?? []) as InstallationRequest[]
}

export async function updateInstallationRequestStatus(
  client: DistrictClient,
  adminKey: string | null | undefined,
  requestId: number,
  status: RegistrationDecision,
) {
  const { data, error } = await client.rpc('admin_set_registration_status', {
    p_admin_key: requireAdminKey(adminKey),
    p_request_id: requestId,
    p_status: status,
  })

  if (error) {
    throw toError(error, 'The registration status could not be updated.')
  }

  return data as InstallationRequest
}
