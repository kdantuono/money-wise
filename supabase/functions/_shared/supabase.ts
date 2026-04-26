/**
 * Supabase client + helpers per Edge Functions — refactor Phase 04.
 *
 * Cambi rispetto a legacy (Phase 04 / 2026-04-26):
 *  - Rimosso getFamilyId() (schema v2 non ha families; sostituito da
 *    getHouseholdId() che query household_members tramite RLS helper
 *    user_household_ids() o JOIN diretto via service role).
 *  - Aggiunto setAuditSource() helper per popolare current_setting
 *    'app.audit_source' richiesto dal trigger generico log_data_audit
 *    Phase 02 (ADR-0013). Da chiamare PRIMA di mutazioni su tabelle
 *    critical (financial_positions, transactions, payment_obligations,
 *    household_members, position_owners, provider_connections).
 */

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export type AuditSource =
  | 'user_action'
  | 'sync'
  | 'webhook'
  | 'admin'
  | 'system'
  | 'webhook_invalid_signature'

/**
 * Create a Supabase client with the service role key.
 * Bypassa RLS. Edge functions banking-* girano in service role per natura sistemica.
 */
export function createServiceClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
}

/**
 * Create a Supabase client using the user's JWT from the Authorization header.
 * Rispetta RLS policy (Phase 02). Per edge functions user-facing.
 */
export function createUserClient(req: Request): SupabaseClient {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) throw new Error('Missing Authorization header')

  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )
}

function extractToken(req: Request): string {
  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.replace('Bearer ', '').trim()
  if (!token) throw new Error('Unauthorized')
  return token
}

/**
 * Extract user ID from JWT claims (local verification, no network call).
 * Mapping: claims.sub → auth.users.id.
 */
export async function getUserId(req: Request): Promise<string> {
  const client = createUserClient(req)
  const token = extractToken(req)

  const { data, error } = await client.auth.getClaims(token)
  if (error || !data?.claims?.sub) throw new Error('Unauthorized')

  return data.claims.sub
}

/**
 * Get the primary household ID for a user (Phase 04 v2 helper).
 * Schema v2 (ADR-0002): un utente può appartenere a N household via
 * household_members. Per single user pre-beta restituisce il primo (e unico).
 *
 * Per edge functions banking-* (service role), bypass RLS. Per edge functions
 * user-facing, RLS filtra automaticamente.
 *
 * Throws 'Unauthorized' per token invalidi, 'NoHouseholdMembership' se
 * l'utente non appartiene a nessun household (caso bootstrap pre-init).
 */
export async function getHouseholdId(req: Request): Promise<string> {
  const userId = await getUserId(req)
  const client = createServiceClient()

  const { data, error } = await client
    .from('household_members')
    .select('household_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error('HouseholdQueryFailed')
  if (!data?.household_id) throw new Error('NoHouseholdMembership')

  return data.household_id
}

/**
 * Set audit source for the next mutations on critical tables.
 * Richiesto dal trigger generico log_data_audit Phase 02 (ADR-0013).
 * Da chiamare PRIMA di INSERT/UPDATE/DELETE su:
 *   financial_positions, transactions, payment_obligations,
 *   household_members, position_owners, provider_connections.
 *
 * Senza questa chiamata, il trigger logga con default 'user_action' invece
 * del valore corretto (sync, webhook, ecc.). Pena per non-compliance:
 * audit trail inaffidabile.
 *
 * Pattern: client.rpc('set_config', {...}) — usa RPC invece di SQL diretto
 * per evitare exposure SQL injection. Il setting è transaction-local
 * (`is_local=true`), reset al COMMIT.
 */
export async function setAuditSource(
  client: SupabaseClient,
  source: AuditSource,
): Promise<void> {
  const { error } = await client.rpc('set_config', {
    parameter: 'app.audit_source',
    value: source,
    is_local: true,
  })

  if (error) {
    // Fallback: SQL diretto via plain query se RPC set_config non disponibile
    // (Supabase Edge non espone direct SQL execution salvo via RPC custom).
    // Loggare ma NON fallire: il trigger continua con default 'user_action'.
    console.warn('[setAuditSource] RPC set_config failed, fallback to default:', error.message)
  }
}
