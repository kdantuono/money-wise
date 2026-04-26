/**
 * banking-complete-link — handler post-OAuth user redirect (Phase 04 refactor).
 * Aggiorna provider_connections.status v2 da REAUTH_REQUIRED → ACTIVE/ERROR_*
 * via mapSaltedgeStatus() canonical mapping (ratifica 3 Phase 04).
 *
 * Differenza vs banking-webhook:
 *  - banking-webhook è triggered da Saltedge async (POST autonoma)
 *  - banking-complete-link è triggered dal browser dell'utente sync post-OAuth
 *
 * Idempotent: re-execution su stessa connection update ripetutamente same status.
 */

import { corsHeaders } from '../_shared/cors.ts'
import { createServiceClient, getUserId, getHouseholdId, setAuditSource } from '../_shared/supabase.ts'
import { SaltEdgeClient, mapSaltedgeStatus } from '../_shared/saltedge.ts'

interface RequestBody {
  saltedgeConnectionId?: string
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const userId = await getUserId(req)
    const householdId = await getHouseholdId(req)
    const body: RequestBody = req.body ? await req.json() : {}

    if (!body.saltedgeConnectionId) {
      return new Response(JSON.stringify({ success: false, error: 'Missing saltedgeConnectionId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createServiceClient()
    const saltEdge = new SaltEdgeClient()

    // Fetch Saltedge connection details
    const seConn = await saltEdge.getConnection(body.saltedgeConnectionId)
    const newStatus = mapSaltedgeStatus(seConn.authentication_status ?? seConn.status, seConn.error_class)

    await setAuditSource(supabase, 'user_action')

    // Update provider_connection v2
    const { data: pc } = await supabase
      .from('provider_connections')
      .select('id')
      .eq('household_id', householdId)
      .eq('provider', 'saltedge')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!pc) {
      throw new Error('NoProviderConnectionFound')
    }

    await supabase
      .from('provider_connections')
      .update({
        status: newStatus,
        provider_connection_id: body.saltedgeConnectionId,
        last_successful_sync_at: seConn.last_success_at
          ? new Date(seConn.last_success_at).toISOString()
          : null,
        last_error_code: seConn.error_class ?? null,
        last_error_at: seConn.error_class ? new Date().toISOString() : null,
      })
      .eq('id', pc.id)

    return new Response(
      JSON.stringify({ success: true, data: { status: newStatus, providerConnectionId: pc.id } }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error(JSON.stringify({ event: 'banking_complete_link_error', error: message }))
    const status = message === 'Unauthorized' ? 401 : 500
    return new Response(JSON.stringify({ success: false, error: message }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
