import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

const centralSupabaseEnvSchema = z.object({
  VITE_SUPABASE_ANON_KEY: z.string().min(1, 'VITE_SUPABASE_ANON_KEY is required'),
  VITE_SUPABASE_URL: z.string().url('VITE_SUPABASE_URL must be a valid Supabase URL'),
})

const centralEnvResult = centralSupabaseEnvSchema.safeParse(import.meta.env)

let centralClient: SupabaseClient | null = null

export function getCentralConfigError() {
  if (centralEnvResult.success) {
    return null
  }

  return centralEnvResult.error.issues.map((issue) => issue.message).join('. ')
}

export function getCentralSupabaseClient() {
  if (!centralEnvResult.success) {
    throw new Error(getCentralConfigError() ?? 'Central Supabase configuration is invalid')
  }

  if (!centralClient) {
    centralClient = createClient(
      centralEnvResult.data.VITE_SUPABASE_URL,
      centralEnvResult.data.VITE_SUPABASE_ANON_KEY,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
        },
      },
    )
  }

  return centralClient
}

export function createWaterDistrictClient(
  supabaseUrl: string,
  supabaseAnonKey: string,
  accessToken?: string,
) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      : undefined,
  })
}
