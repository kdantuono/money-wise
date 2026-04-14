import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Create a Supabase client with the service role key.
 * Use this for admin operations (bypasses RLS).
 */
export function createServiceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
}

/**
 * Create a Supabase client using the user's JWT from the Authorization header.
 * This client respects RLS policies.
 */
export function createUserClient(req: Request) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    throw new Error('Missing Authorization header')
  }

  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    {
      global: { headers: { Authorization: authHeader } },
    },
  )
}

/**
 * Extract user ID from JWT via Supabase auth.
 * Passes token explicitly per Supabase docs (more robust than relying on global headers).
 */
export async function getUserId(req: Request): Promise<string> {
  const client = createUserClient(req)
  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.replace('Bearer ', '').trim()
  if (!token) throw new Error('Unauthorized')
  const { data: { user }, error } = await client.auth.getUser(token)
  if (error || !user) throw new Error('Unauthorized')
  return user.id
}

/**
 * Get the family ID for a user.
 * Uses explicit token passing per Supabase docs.
 */
export async function getFamilyId(req: Request): Promise<string> {
  const client = createUserClient(req)
  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.replace('Bearer ', '').trim()
  if (!token) throw new Error('Unauthorized')
  const { data: { user }, error: authError } = await client.auth.getUser(token)
  if (authError || !user) throw new Error('Unauthorized')

  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('family_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.family_id) {
    throw new Error('User has no family')
  }

  return profile.family_id
}
