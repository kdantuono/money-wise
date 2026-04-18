/**
 * account-delete — GDPR Art. 17 erasure endpoint.
 *
 * POST /functions/v1/account-delete
 *   body: { password: string, exportDataFirst?: boolean }
 *   headers: Authorization: Bearer <user JWT>
 *
 * Flow:
 *   1. getClaims() → userId, email
 *   2. Re-verify password via signInWithPassword (defense against session hijack)
 *   3. (Optional) collect all personal data and return as JSON blob
 *   4. If user is the sole member of their family → delete the family row
 *      (cascades to family-scoped tables: accounts, budgets, categories,
 *       liabilities, scheduled_transactions)
 *   5. auth.admin.deleteUser(userId) → cascades to profiles and all
 *      user-scoped tables (audit_logs, user_preferences, notifications,
 *      push_subscriptions, user_achievements, banking_*)
 *
 * The ordering (family first, then user) ensures we don't orphan user-owned
 * family rows: deleting the user first would CASCADE the profile, and if
 * that was the last profile on the family, we'd still need a separate
 * sweep — doing family first collapses the two cases.
 *
 * JWT verification is DISABLED at the gateway (see supabase/config.toml —
 * verify_jwt=false). Auth is enforced here via getClaims() per
 * feedback_edge_functions_jwt memory.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { handleCors } from '../_shared/cors.ts'
import { jsonResponse, errorResponse } from '../_shared/responses.ts'

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

interface DeleteInput {
  password: string
  exportDataFirst?: boolean
}

function parseInput(raw: unknown): DeleteInput | { error: string } {
  if (!raw || typeof raw !== 'object') {
    return { error: 'Invalid request body' }
  }
  const body = raw as Record<string, unknown>
  const password = body.password
  const exportDataFirst = body.exportDataFirst

  if (typeof password !== 'string' || password.length === 0) {
    return { error: 'password is required' }
  }
  if (exportDataFirst !== undefined && typeof exportDataFirst !== 'boolean') {
    return { error: 'exportDataFirst must be boolean' }
  }
  return { password, exportDataFirst: exportDataFirst === true }
}

// ---------------------------------------------------------------------------
// Supabase clients
// ---------------------------------------------------------------------------

function createUserClient(authHeader: string) {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )
}

function createAdminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// ---------------------------------------------------------------------------
// Data export
// ---------------------------------------------------------------------------

// Tables owned by the user via profiles.id (schema invariant: they all
// carry a `user_id UUID REFERENCES profiles(id) ON DELETE CASCADE` column).
//
// ⚠️ `banking_sync_logs` is NOT here despite touching user data: it has
// `account_id` (FK to accounts) but NO `user_id` column. Including it would
// cause the export query below to fail silently (PostgREST rejects the
// `.eq('user_id', ...)` filter) and leave sync-log rows out of the JSON
// export. For the common sole-member case, those rows cascade via
// families → accounts and are still deleted server-side; for multi-member
// families, the sync logs survive the user delete (known limitation, see
// migration 20260417020000 header comment). Post-beta: either add user_id
// to the table or join via accounts.family_id.
const USER_SCOPED_TABLES = [
  'audit_logs',
  'banking_customers',
  'banking_connections',
  'user_preferences',
  'notifications',
  'push_subscriptions',
  'user_achievements',
] as const

// Tables scoped by family (exported only when the user is the sole member)
const FAMILY_SCOPED_TABLES = [
  'accounts',
  'budgets',
  'categories',
  'liabilities',
  'scheduled_transactions',
  'transactions',
] as const

type TableName = typeof USER_SCOPED_TABLES[number] | typeof FAMILY_SCOPED_TABLES[number]

type SupabaseAdminClient = ReturnType<typeof createAdminClient>

async function exportUserData(
  admin: SupabaseAdminClient,
  userId: string,
  familyId: string,
  isSoleMember: boolean
): Promise<Record<string, unknown>> {
  const exported: Record<string, unknown> = {
    userId,
    familyId,
    isSoleMember,
    exportedAt: new Date().toISOString(),
    profile: null,
    userScoped: {} as Record<string, unknown[]>,
    familyScoped: {} as Record<string, unknown[]>,
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  exported.profile = profile ?? null

  for (const table of USER_SCOPED_TABLES) {
    const { data } = await admin.from(table).select('*').eq('user_id', userId)
    ;(exported.userScoped as Record<string, unknown[]>)[table] = data ?? []
  }

  // Family data is only exported when the user owns the family exclusively;
  // sharing family data from multi-member families would leak other users'
  // personal data.
  if (isSoleMember) {
    for (const table of FAMILY_SCOPED_TABLES) {
      const column = table === 'transactions' ? 'family_id' : 'family_id'
      const { data } = await admin.from(table).select('*').eq(column, familyId)
      ;(exported.familyScoped as Record<string, unknown[]>)[table] = data ?? []
    }
  }

  return exported
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

async function handleDelete(req: Request): Promise<Response> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return errorResponse('Unauthorized', 401)

  // JWT claims
  const userClient = createUserClient(authHeader)
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) return errorResponse('Unauthorized', 401)

  const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token)
  if (claimsError || !claimsData?.claims?.sub) {
    return errorResponse('Unauthorized', 401)
  }
  const userId = claimsData.claims.sub
  const email = (claimsData.claims.email as string | undefined) ?? ''

  if (!email) {
    return errorResponse('Email not in token claims', 401)
  }

  // Parse + validate body
  let rawBody: unknown
  try {
    rawBody = await req.json()
  } catch {
    return errorResponse('Invalid JSON', 400)
  }
  const parsed = parseInput(rawBody)
  if ('error' in parsed) return errorResponse(parsed.error, 400)

  // Password reverify
  const verifyClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const { error: reverifyError } = await verifyClient.auth.signInWithPassword({
    email,
    password: parsed.password,
  })
  if (reverifyError) {
    return errorResponse('password_mismatch', 401)
  }

  const admin = createAdminClient()

  // Look up family + membership count
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('family_id')
    .eq('id', userId)
    .maybeSingle()

  if (profileError || !profile) {
    return errorResponse('profile_not_found', 404)
  }
  const familyId = profile.family_id as string

  const { count: memberCount, error: countError } = await admin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('family_id', familyId)

  if (countError) {
    return errorResponse('family_lookup_failed', 500)
  }
  const isSoleMember = (memberCount ?? 0) <= 1

  // Optional export
  let exportData: Record<string, unknown> | undefined
  if (parsed.exportDataFirst) {
    try {
      exportData = await exportUserData(admin, userId, familyId, isSoleMember)
    } catch (err) {
      return errorResponse(
        `export_failed: ${err instanceof Error ? err.message : 'unknown'}`,
        500
      )
    }
  }

  // Delete family first (if sole member) — cascades to family-scoped tables.
  if (isSoleMember) {
    const { error: famErr } = await admin
      .from('families')
      .delete()
      .eq('id', familyId)
    if (famErr) {
      return errorResponse(`family_delete_failed: ${famErr.message}`, 500)
    }
  }

  // Delete user — cascades profiles + user-scoped tables.
  const { error: userErr } = await admin.auth.admin.deleteUser(userId)
  if (userErr) {
    return errorResponse(`user_delete_failed: ${userErr.message}`, 500)
  }

  return jsonResponse({
    success: true,
    deletedAt: new Date().toISOString(),
    familyDeleted: isSoleMember,
    exportData,
  })
}

// ---------------------------------------------------------------------------
// Entrypoint
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    return await handleDelete(req)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown_error'
    return errorResponse(`internal_error: ${msg}`, 500)
  }
})

// Exported for tests
export { handleDelete, parseInput, USER_SCOPED_TABLES, FAMILY_SCOPED_TABLES }
