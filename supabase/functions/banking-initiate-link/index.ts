/**
 * Banking Initiate Link — Starts the SaltEdge OAuth flow
 *
 * Authenticated endpoint (user JWT required).
 * Creates a SaltEdge customer (if needed), a pending BankingConnection,
 * and returns a redirect URL for the user to authorize their bank.
 *
 * POST { provider, providerCode?, countryCode?, returnTo? }
 * Returns { redirectUrl, connectionId }
 */

import { handleCors } from '../_shared/cors.ts'
import { createServiceClient, getUserId } from '../_shared/supabase.ts'
import { jsonResponse, errorResponse } from '../_shared/responses.ts'
import { SaltEdgeClient, sha256Hex } from '../_shared/saltedge.ts'

Deno.serve(async (req: Request) => {
  // CORS preflight
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    // 1. Authenticate user
    const userId = await getUserId(req)

    // 2. Parse input
    const body = await req.json()
    const provider: string = body.provider || 'SALTEDGE'
    const providerCode: string | undefined = body.providerCode
    const countryCode: string | undefined = body.countryCode
    const returnTo: string | undefined = body.returnTo

    if (provider !== 'SALTEDGE') {
      return errorResponse(`Provider ${provider} is not yet supported`, 400)
    }

    const supabase = createServiceClient()
    const saltEdge = new SaltEdgeClient()

    // 3. Check/create BankingCustomer record (upsert: userId + provider unique)
    const identifier = (await sha256Hex(userId)).substring(0, 32)

    const { data: existingCustomer } = await supabase
      .from('banking_customers')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', provider)
      .maybeSingle()

    let customerId: string
    let saltEdgeCustomerId: string

    if (existingCustomer?.saltedge_customer_id) {
      // Customer already exists with SaltEdge ID
      customerId = existingCustomer.id
      saltEdgeCustomerId = existingCustomer.saltedge_customer_id
    } else {
      // Create customer in SaltEdge
      const saltEdgeCustomer = await saltEdge.createCustomer(identifier)

      if (existingCustomer) {
        // Update existing record with SaltEdge customer ID
        await supabase
          .from('banking_customers')
          .update({ saltedge_customer_id: saltEdgeCustomer.id })
          .eq('id', existingCustomer.id)

        customerId = existingCustomer.id
      } else {
        // Insert new banking_customers row
        const { data: newCustomer, error: insertError } = await supabase
          .from('banking_customers')
          .insert({
            user_id: userId,
            provider,
            identifier,
            saltedge_customer_id: saltEdgeCustomer.id,
          })
          .select('id')
          .single()

        if (insertError) throw new Error(`Failed to create banking customer: ${insertError.message}`)
        customerId = newCustomer.id
      }

      saltEdgeCustomerId = saltEdgeCustomer.id!
    }

    // 4. Create pending BankingConnection record
    const { data: connection, error: connError } = await supabase
      .from('banking_connections')
      .insert({
        user_id: userId,
        customer_id: customerId,
        provider,
        status: 'PENDING',
        provider_code: providerCode || null,
        country_code: countryCode || null,
        metadata: { initiatedAt: new Date().toISOString() },
      })
      .select('id')
      .single()

    if (connError) throw new Error(`Failed to create banking connection: ${connError.message}`)
    const connectionId = connection.id

    // 5. Build return_to URL
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:3000'
    let baseReturnTo: string

    if (returnTo) {
      try {
        new URL(returnTo) // validate it's absolute
        baseReturnTo = returnTo
      } catch {
        baseReturnTo = new URL(returnTo, frontendUrl).toString()
      }
    } else {
      baseReturnTo = `${frontendUrl.replace(/\/+$/, '')}/banking/callback`
    }

    const returnToUrl = new URL(baseReturnTo)
    returnToUrl.searchParams.set('connectionId', connectionId)

    // 6. Create SaltEdge connect session
    const session = await saltEdge.createConnectSession(saltEdgeCustomerId, {
      returnTo: returnToUrl.toString(),
      providerCode,
      countryCode,
    })

    // 7. Update connection with redirect URL and expiry
    await supabase
      .from('banking_connections')
      .update({
        redirect_url: session.connectUrl,
        expires_at: session.expiresAt.toISOString(),
      })
      .eq('id', connectionId)

    return jsonResponse({
      redirectUrl: session.connectUrl,
      connectionId,
    })
  } catch (error) {
    console.error('[banking-initiate-link] Error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return errorResponse(message, 500)
  }
})
