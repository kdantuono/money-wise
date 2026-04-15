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
  if (!authHeader) throw new Error('Missing Authorization header')

  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )
}

/**
 * Extract Bearer token from Authorization header.
 */
function extractToken(req: Request): string {
  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.replace('Bearer ', '').trim()
  if (!token) throw new Error('Unauthorized')
  return token
}

/**
 * Extract user ID from JWT claims (local verification, no network call).
 * Uses getClaims() per Supabase docs for Edge Functions with Signing Keys.
 * Mapping: claims.sub → profiles.id → auth.users.id
 */
export async function getUserId(req: Request): Promise<string> {
  const client = createUserClient(req)
  const token = extractToken(req)

  const { data, error } = await client.auth.getClaims(token)
  if (error || !data?.claims?.sub) throw new Error('Unauthorized')

  return data.claims.sub
}

/**
 * Get the family ID for a user.
 * First validates JWT via getClaims(), then queries profiles table.
 * Throws 'Unauthorized' for invalid tokens, 'ProfileNotFound' for missing profiles.
 */
export async function getFamilyId(req: Request): Promise<string> {
  const client = createUserClient(req)
  const token = extractToken(req)

  const { data, error } = await client.auth.getClaims(token)
  if (error || !data?.claims?.sub) throw new Error('Unauthorized')

  const userId = data.claims.sub

  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('family_id')
    .eq('id', userId)
    .maybeSingle()

  if (profileError) throw new Error('ProfileQueryFailed')
  if (!profile?.family_id) throw new Error('ProfileNotFound')

  return profile.family_id
}
