/**
 * Banking Webhook — Handles SaltEdge webhook callbacks
 *
 * PUBLIC endpoint (no JWT required).
 * SaltEdge sends callbacks when:
 * - notify: Connection creation started
 * - success: Connection successfully created
 * - fail: Connection failed
 *
 * Always returns 200 to prevent SaltEdge retries.
 *
 * POST — SaltEdge Service-type apps authenticate via App-id + Secret headers.
 * Returns { status: 'ok' }
 */

import { corsHeaders } from '../_shared/cors.ts'
import { createServiceClient } from '../_shared/supabase.ts'
import { SaltEdgeClient, type SaltEdgeAccount } from '../_shared/saltedge.ts'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WebhookPayload {
  data: {
    customer_id: string
    connection_id?: string
    error_class?: string
    error_message?: string
    provider_code?: string
    provider_name?: string
    country_code?: string
    custom_fields?: Record<string, unknown>
  }
  meta: {
    version: string
    time: string
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonOk(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function mapAccountType(nature: string): string {
  const typeMap: Record<string, string> = {
    checking: 'CHECKING',
    savings: 'SAVINGS',
    credit: 'CREDIT_CARD',
    credit_card: 'CREDIT_CARD',
    loan: 'LOAN',
    mortgage: 'MORTGAGE',
    investment: 'INVESTMENT',
  }
  return typeMap[nature?.toLowerCase()] ?? 'OTHER'
}

// ---------------------------------------------------------------------------
// Account storage (reused for 'finish' stage)
// ---------------------------------------------------------------------------

async function fetchAndStoreAccounts(
  supabase: ReturnType<typeof createServiceClient>,
  saltEdge: SaltEdgeClient,
  userId: string,
  saltEdgeConnectionId: string,
): Promise<void> {
  let accounts: SaltEdgeAccount[]
  try {
    accounts = await saltEdge.getAccounts(saltEdgeConnectionId)
  } catch (err) {
    console.warn('[banking-webhook] Failed to fetch accounts:', err)
    return
  }

  let connectionData
  try {
    connectionData = await saltEdge.getConnection(saltEdgeConnectionId)
  } catch (err) {
    console.warn('[banking-webhook] Failed to get connection details:', err)
    return
  }

  for (const seAccount of accounts) {
    try {
      const saltEdgeAcctId = String(seAccount.id)

      const { data: existing } = await supabase
        .from('accounts')
        .select('id')
        .eq('saltedge_account_id', saltEdgeAcctId)
        .eq('user_id', userId)
        .maybeSingle()

      if (existing) {
        await supabase
          .from('accounts')
          .update({
            current_balance: seAccount.balance,
            sync_status: 'SYNCED',
            last_sync_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
      } else {
        await supabase
          .from('accounts')
          .insert({
            user_id: userId,
            name: seAccount.name,
            account_number: seAccount.extra?.iban || null,
            banking_provider: 'SALTEDGE',
            saltedge_account_id: saltEdgeAcctId,
            saltedge_connection_id: saltEdgeConnectionId,
            sync_status: 'PENDING',
            institution_name: connectionData.provider_name,
            current_balance: seAccount.balance,
            currency: seAccount.currency_code,
            source: 'SALTEDGE',
            type: mapAccountType(seAccount.nature),
            status: 'ACTIVE',
            settings: {
              bankCountry: connectionData.country_code,
              accountHolderName: seAccount.extra?.holder_name || null,
              accountType: seAccount.nature,
              provider: 'SALTEDGE',
            },
          })
      }
    } catch (err) {
      console.warn(`[banking-webhook] Failed to store account ${seAccount.id}:`, err)
    }
  }
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonOk({ status: 'error', message: 'Method not allowed' })
  }

  try {
    const saltEdge = new SaltEdgeClient()
    const supabase = createServiceClient()

    // 1. Parse payload
    let payload: WebhookPayload
    try {
      payload = await req.json()
    } catch {
      console.error('[banking-webhook] Failed to parse payload')
      return jsonOk({ status: 'error', message: 'Invalid JSON' })
    }

    const { data } = payload

    if (!data?.customer_id) {
      console.warn('[banking-webhook] Missing customer_id in payload')
      return jsonOk({ status: 'error', message: 'Missing customer_id' })
    }

    // 3. Determine stage from URL path (primary) or payload (fallback)
    //    SaltEdge webhook URLs are configured as:
    //    .../banking-webhook/notify  -> start
    //    .../banking-webhook/success -> finish
    //    .../banking-webhook/fail    -> fail
    const url = new URL(req.url)
    const segments = url.pathname.split('/').filter(Boolean)
    const lastSegment = segments[segments.length - 1]

    let stage: 'start' | 'finish' | 'fail'
    if (lastSegment === 'notify') {
      stage = 'start'
    } else if (lastSegment === 'fail') {
      stage = 'fail'
    } else if (lastSegment === 'success') {
      stage = 'finish'
    } else {
      // Fallback for root path or unrecognized segment: use payload-based detection
      stage = data.error_class ? 'fail' : 'finish'
    }

    console.log(`[banking-webhook] Processing: customer=${data.customer_id}, connection=${data.connection_id}, stage=${stage}`)

    // 4. Find customer by saltedge_customer_id
    const { data: customer } = await supabase
      .from('banking_customers')
      .select('*')
      .eq('saltedge_customer_id', data.customer_id)
      .maybeSingle()

    if (!customer) {
      console.warn(`[banking-webhook] Customer not found for SaltEdge ID: ${data.customer_id}`)
      return jsonOk({ status: 'ok' })
    }

    // 5. Find pending connection for this customer
    let connection: Record<string, unknown> | null = null

    // Try to find by pending status first
    const { data: pendingConn } = await supabase
      .from('banking_connections')
      .select('*')
      .eq('customer_id', customer.id)
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    connection = pendingConn

    // Fallback: find by SaltEdge connection ID
    if (!connection && data.connection_id) {
      const { data: existingConn } = await supabase
        .from('banking_connections')
        .select('*')
        .eq('saltedge_connection_id', data.connection_id)
        .maybeSingle()

      connection = existingConn
    }

    // Also try IN_PROGRESS connections
    if (!connection) {
      const { data: inProgressConn } = await supabase
        .from('banking_connections')
        .select('*')
        .eq('customer_id', customer.id)
        .eq('status', 'IN_PROGRESS')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      connection = inProgressConn
    }

    if (!connection) {
      console.warn(`[banking-webhook] No connection found for customer: ${customer.id}`)
      return jsonOk({ status: 'ok' })
    }

    // 6. Update connection based on stage
    switch (stage) {
      case 'start':
        await supabase
          .from('banking_connections')
          .update({
            status: 'IN_PROGRESS',
            saltedge_connection_id: data.connection_id || null,
          })
          .eq('id', connection.id)
        break

      case 'finish': {
        // Fetch connection details from SaltEdge
        const saltEdgeConnId = data.connection_id!
        let providerCode: string | null = data.provider_code || null
        let providerName: string | null = data.provider_name || null
        let countryCode: string | null = data.country_code || null
        let lastSuccessAt: string | null = null

        try {
          const connDetails = await saltEdge.getConnection(saltEdgeConnId)
          providerCode = connDetails.provider_code
          providerName = connDetails.provider_name
          countryCode = connDetails.country_code
          lastSuccessAt = connDetails.last_success_at || null
        } catch (err) {
          console.warn('[banking-webhook] Failed to fetch connection details:', err)
        }

        await supabase
          .from('banking_connections')
          .update({
            status: 'AUTHORIZED',
            saltedge_connection_id: saltEdgeConnId,
            provider_code: providerCode,
            provider_name: providerName,
            country_code: countryCode,
            authorized_at: new Date().toISOString(),
            last_success_at: lastSuccessAt ? new Date(lastSuccessAt).toISOString() : new Date().toISOString(),
            metadata: {
              ...(typeof connection.metadata === 'object' && connection.metadata ? connection.metadata : {}),
              webhookFinishedAt: new Date().toISOString(),
            },
          })
          .eq('id', connection.id)

        // Auto-fetch and store accounts
        await fetchAndStoreAccounts(
          supabase,
          saltEdge,
          connection.user_id as string,
          saltEdgeConnId,
        )
        break
      }

      case 'fail':
        await supabase
          .from('banking_connections')
          .update({
            status: 'FAILED',
            saltedge_connection_id: data.connection_id || null,
            metadata: {
              ...(typeof connection.metadata === 'object' && connection.metadata ? connection.metadata : {}),
              errorClass: data.error_class,
              errorMessage: data.error_message,
              failedAt: new Date().toISOString(),
            },
          })
          .eq('id', connection.id)
        break
    }

    return jsonOk({ status: 'ok' })
  } catch (error) {
    console.error('[banking-webhook] Unhandled error:', error)
    // Always return 200 to prevent SaltEdge retries
    return jsonOk({ status: 'ok' })
  }
})
