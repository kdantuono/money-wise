/**
 * Banking Complete Link — Completes the OAuth flow after user authorization
 *
 * Authenticated endpoint (user JWT required).
 * Fetches accounts from SaltEdge, stores/updates them in the accounts table,
 * and marks the connection as AUTHORIZED.
 *
 * POST { connectionId, saltEdgeConnectionId? }
 * Returns { accounts: [...], saltEdgeConnectionId }
 */

import { handleCors } from '../_shared/cors.ts'
import { createServiceClient, getUserId } from '../_shared/supabase.ts'
import { jsonResponse, errorResponse } from '../_shared/responses.ts'
import { SaltEdgeClient, type SaltEdgeAccount } from '../_shared/saltedge.ts'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map SaltEdge account nature to our account_type enum */
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

/** Small delay for retry logic */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    const userId = await getUserId(req)

    const body = await req.json()
    const connectionId: string = body.connectionId
    const providedSaltEdgeId: string | undefined = body.saltEdgeConnectionId

    if (!connectionId) {
      return errorResponse('connectionId is required', 400)
    }

    const supabase = createServiceClient()
    const saltEdge = new SaltEdgeClient()

    // 1. Find connection and verify ownership
    const { data: connection, error: connErr } = await supabase
      .from('banking_connections')
      .select('*, banking_customers(*)')
      .eq('id', connectionId)
      .single()

    if (connErr || !connection) {
      return errorResponse(`Banking connection not found: ${connectionId}`, 404)
    }

    if (connection.user_id !== userId) {
      return errorResponse('Unauthorized', 403)
    }

    // 2. Determine effective SaltEdge connection ID
    let effectiveSaltEdgeId =
      providedSaltEdgeId || connection.saltedge_connection_id || null

    // Fallback: poll SaltEdge for latest connection if ID not available
    if (!effectiveSaltEdgeId && connection.banking_customers?.saltedge_customer_id) {
      const latestConnection = await saltEdge.findLatestActiveConnection(
        connection.banking_customers.saltedge_customer_id,
      )
      if (latestConnection) {
        effectiveSaltEdgeId = latestConnection.id
      }
    }

    if (!effectiveSaltEdgeId) {
      return errorResponse(
        'SaltEdge connection ID not available. The OAuth process may not have completed successfully.',
        400,
      )
    }

    // Update stored ID if it was provided fresh
    if (providedSaltEdgeId && !connection.saltedge_connection_id) {
      await supabase
        .from('banking_connections')
        .update({
          saltedge_connection_id: providedSaltEdgeId,
          status: 'IN_PROGRESS',
        })
        .eq('id', connectionId)
    }

    // 3. Fetch accounts from SaltEdge with retry (3 attempts, 2s delay)
    let saltEdgeAccounts: SaltEdgeAccount[] = []
    const maxRetries = 3

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      saltEdgeAccounts = await saltEdge.getAccounts(effectiveSaltEdgeId)

      if (saltEdgeAccounts.length > 0) break

      if (attempt < maxRetries) {
        // Try refreshing the connection
        try {
          await saltEdge.refreshConnection(effectiveSaltEdgeId)
        } catch {
          // Non-fatal
        }
        await delay(2000)
      }
    }

    // 4. Get connection details from SaltEdge
    const connectionData = await saltEdge.getConnection(effectiveSaltEdgeId)

    // 5. Update connection to AUTHORIZED
    await supabase
      .from('banking_connections')
      .update({
        status: 'AUTHORIZED',
        saltedge_connection_id: effectiveSaltEdgeId,
        provider_code: connectionData.provider_code,
        provider_name: connectionData.provider_name,
        country_code: connectionData.country_code,
        authorized_at: new Date().toISOString(),
        last_success_at: connectionData.last_success_at
          ? new Date(connectionData.last_success_at).toISOString()
          : new Date().toISOString(),
      })
      .eq('id', connectionId)

    // 6. Store/update accounts
    const storedAccounts: Array<{
      id: string
      name: string
      type: string
      balance: number
      currency: string
    }> = []

    for (const seAccount of saltEdgeAccounts) {
      const saltEdgeAcctId = String(seAccount.id)
      const accountType = mapAccountType(seAccount.nature)

      // Check for existing account by saltedge_account_id
      const { data: existing } = await supabase
        .from('accounts')
        .select('id, status')
        .eq('saltedge_account_id', saltEdgeAcctId)
        .eq('user_id', userId)
        .maybeSingle()

      if (existing) {
        // Update existing account
        await supabase
          .from('accounts')
          .update({
            saltedge_connection_id: effectiveSaltEdgeId,
            current_balance: seAccount.balance,
            currency: seAccount.currency_code,
            institution_name: connectionData.provider_name,
            sync_status: 'PENDING',
            status: 'ACTIVE',
            banking_provider: 'SALTEDGE',
            settings: {
              bankCountry: connectionData.country_code,
              accountHolderName: seAccount.extra?.holder_name || null,
              accountType: seAccount.nature,
              provider: 'SALTEDGE',
            },
          })
          .eq('id', existing.id)

        storedAccounts.push({
          id: existing.id,
          name: seAccount.name,
          type: accountType,
          balance: seAccount.balance,
          currency: seAccount.currency_code,
        })
      } else {
        // Create new account
        const { data: newAccount, error: insertErr } = await supabase
          .from('accounts')
          .insert({
            user_id: userId,
            name: seAccount.name,
            account_number: seAccount.extra?.iban || null,
            banking_provider: 'SALTEDGE',
            saltedge_account_id: saltEdgeAcctId,
            saltedge_connection_id: effectiveSaltEdgeId,
            sync_status: 'PENDING',
            institution_name: connectionData.provider_name,
            current_balance: seAccount.balance,
            currency: seAccount.currency_code,
            source: 'SALTEDGE',
            type: accountType,
            status: 'ACTIVE',
            settings: {
              bankCountry: connectionData.country_code,
              accountHolderName: seAccount.extra?.holder_name || null,
              accountType: seAccount.nature,
              provider: 'SALTEDGE',
            },
          })
          .select('id')
          .single()

        if (insertErr) {
          console.warn(`[banking-complete-link] Failed to create account ${saltEdgeAcctId}:`, insertErr.message)
          continue
        }

        storedAccounts.push({
          id: newAccount.id,
          name: seAccount.name,
          type: accountType,
          balance: seAccount.balance,
          currency: seAccount.currency_code,
        })
      }
    }

    return jsonResponse({
      accounts: storedAccounts,
      saltEdgeConnectionId: effectiveSaltEdgeId,
    })
  } catch (error) {
    console.error('[banking-complete-link] Error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return errorResponse(message, 500)
  }
})
