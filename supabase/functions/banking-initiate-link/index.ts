/**
 * banking-initiate-link — crea Saltedge customer + connect session, ritorna OAuth URL.
 * Phase 04 refactor 2026-04-26: schema v2 (provider_connections + provider_customer_id ALTER).
 *
 * Flow:
 *  1. Auth user + risolve household_id v2
 *  2. Lookup/create Saltedge customer (identifier = sha256Hex(user_id))
 *  3. Lookup/create provider_connections per (household, provider=saltedge), status='REAUTH_REQUIRED'
 *     popolando provider_customer_id (Phase 03 ALTER)
 *  4. Create Saltedge connect session
 *  5. Ritorna { connectUrl, expiresAt }
 */

import { corsHeaders } from '../_shared/cors.ts'
import { createServiceClient, getUserId, getHouseholdId, setAuditSource } from '../_shared/supabase.ts'
import { SaltEdgeClient, sha256Hex } from '../_shared/saltedge.ts'

interface RequestBody {
  returnTo?: string
  providerCode?: string
  countryCode?: string
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const userId = await getUserId(req)
    const householdId = await getHouseholdId(req)
    const supabase = createServiceClient()
    const saltEdge = new SaltEdgeClient()

    const body: RequestBody = req.body ? await req.json() : {}

    // Step 1: Saltedge customer (idempotent via sha256(user_id) identifier)
    const identifier = await sha256Hex(userId)
    const customer = await saltEdge.createCustomer(identifier)
    if (!customer.id) throw new Error('Saltedge customer creation failed')

    // Step 2: Idempotent provider_connection lookup/create
    await setAuditSource(supabase, 'user_action')
    const { data: existing } = await supabase
      .from('provider_connections')
      .select('id, provider_customer_id')
      .eq('household_id', householdId)
      .eq('provider', 'saltedge')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existing) {
      if (!existing.provider_customer_id) {
        await supabase
          .from('provider_connections')
          .update({ provider_customer_id: customer.id, status: 'REAUTH_REQUIRED' })
          .eq('id', existing.id)
      }
    } else {
      await supabase.from('provider_connections').insert({
        household_id: householdId,
        provider: 'saltedge',
        provider_customer_id: customer.id,
        status: 'REAUTH_REQUIRED',
      })
    }

    // Step 3: Connect session
    const { connectUrl, expiresAt } = await saltEdge.createConnectSession(customer.id, {
      returnTo: body.returnTo,
      providerCode: body.providerCode,
      countryCode: body.countryCode,
    })

    return new Response(
      JSON.stringify({ success: true, data: { connectUrl, expiresAt: expiresAt.toISOString() } }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error(JSON.stringify({ event: 'banking_initiate_link_error', error: message }))
    const status = message === 'Unauthorized' ? 401 : 500
    return new Response(JSON.stringify({ success: false, error: message }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
