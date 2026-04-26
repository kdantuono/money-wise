/**
 * banking-revoke — disconnessione Saltedge + soft delete provider_connection v2.
 * Phase 04 refactor 2026-04-26.
 *
 * Flow:
 *  1. Auth user + household
 *  2. Lookup provider_connections target
 *  3. Saltedge revoke (DELETE /connections/{id}) — best effort, continua se fail
 *  4. Update provider_connections.status = REVOKED_BY_USER
 *  5. Soft delete financial_positions associate (set deleted_at, status=CLOSED)
 */

import { corsHeaders } from '../_shared/cors.ts'
import { createServiceClient, getUserId, getHouseholdId, setAuditSource } from '../_shared/supabase.ts'
import { SaltEdgeClient } from '../_shared/saltedge.ts'

interface RequestBody {
  providerConnectionId?: string  // v2 provider_connections.id
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const userId = await getUserId(req)
    const householdId = await getHouseholdId(req)
    const body: RequestBody = req.body ? await req.json() : {}

    if (!body.providerConnectionId) {
      return new Response(JSON.stringify({ success: false, error: 'Missing providerConnectionId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createServiceClient()
    const saltEdge = new SaltEdgeClient()

    await setAuditSource(supabase, 'user_action')

    const { data: pc } = await supabase
      .from('provider_connections')
      .select('id, household_id, provider, provider_connection_id')
      .eq('id', body.providerConnectionId)
      .eq('household_id', householdId)
      .maybeSingle()

    if (!pc) {
      return new Response(JSON.stringify({ success: false, error: 'ProviderConnectionNotFound' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Saltedge revoke (best effort)
    if (pc.provider === 'saltedge' && pc.provider_connection_id) {
      try {
        await saltEdge.revokeConnection(pc.provider_connection_id)
      } catch (err) {
        console.warn(JSON.stringify({ event: 'saltedge_revoke_failed', error: String(err) }))
      }
    }

    // Update provider_connection v2
    await supabase
      .from('provider_connections')
      .update({ status: 'REVOKED_BY_USER', last_error_at: new Date().toISOString() })
      .eq('id', pc.id)

    // Soft delete financial_positions associate
    await supabase
      .from('financial_positions')
      .update({ deleted_at: new Date().toISOString(), status: 'CLOSED' })
      .eq('household_id', householdId)
      .eq('provider', pc.provider)
      .is('deleted_at', null)

    return new Response(JSON.stringify({ success: true, data: { providerConnectionId: pc.id } }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error(JSON.stringify({ event: 'banking_revoke_error', error: message }))
    const status = message === 'Unauthorized' ? 401 : 500
    return new Response(JSON.stringify({ success: false, error: message }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
