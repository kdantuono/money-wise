/**
 * Banking Revoke — Revokes a banking connection
 *
 * Authenticated endpoint (user JWT required).
 * Soft-deletes accounts (marks as HIDDEN + DISCONNECTED) and
 * deletes the BankingConnection record.
 *
 * POST { connectionId } or POST { accountId }
 * Returns { success: true }
 */

import { handleCors } from '../_shared/cors.ts'
import { createServiceClient, getUserId } from '../_shared/supabase.ts'
import { jsonResponse, errorResponse } from '../_shared/responses.ts'

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    const userId = await getUserId(req)

    const body = await req.json()
    const connectionId: string | undefined = body.connectionId
    const accountId: string | undefined = body.accountId

    if (!connectionId && !accountId) {
      return errorResponse('Either connectionId or accountId is required', 400)
    }

    const supabase = createServiceClient()

    let targetConnectionId: string | null = null
    let saltEdgeConnectionId: string | null = null

    if (connectionId) {
      // Direct connection ID provided
      const { data: connection, error: connErr } = await supabase
        .from('banking_connections')
        .select('*')
        .eq('id', connectionId)
        .single()

      if (connErr || !connection) {
        return errorResponse(`Banking connection not found: ${connectionId}`, 404)
      }

      if (connection.user_id !== userId) {
        return errorResponse('Unauthorized', 403)
      }

      targetConnectionId = connection.id
      saltEdgeConnectionId = connection.saltedge_connection_id
    } else if (accountId) {
      // Look up connection via account
      const { data: account, error: acctErr } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', accountId)
        .single()

      if (acctErr || !account) {
        return errorResponse(`Account not found: ${accountId}`, 404)
      }

      if (account.user_id !== userId) {
        return errorResponse('Unauthorized', 403)
      }

      saltEdgeConnectionId = account.saltedge_connection_id

      if (!saltEdgeConnectionId) {
        // No connection ID on account; just hide the account directly
        await supabase
          .from('accounts')
          .update({
            status: 'HIDDEN',
            sync_status: 'DISCONNECTED',
            saltedge_connection_id: null,
            saltedge_account_id: null,
          })
          .eq('id', accountId)

        return jsonResponse({ success: true })
      }

      // Find the BankingConnection by saltedge_connection_id
      const { data: connection } = await supabase
        .from('banking_connections')
        .select('id')
        .eq('saltedge_connection_id', saltEdgeConnectionId)
        .eq('user_id', userId)
        .maybeSingle()

      if (connection) {
        targetConnectionId = connection.id
      } else {
        // No connection found; just mark accounts as hidden
        await supabase
          .from('accounts')
          .update({
            status: 'HIDDEN',
            sync_status: 'DISCONNECTED',
          })
          .eq('saltedge_connection_id', saltEdgeConnectionId)
          .eq('user_id', userId)

        return jsonResponse({ success: true })
      }
    }

    // Mark accounts as HIDDEN and DISCONNECTED
    if (saltEdgeConnectionId) {
      const { count: updatedCount } = await supabase
        .from('accounts')
        .update({
          status: 'HIDDEN',
          sync_status: 'DISCONNECTED',
        })
        .eq('user_id', userId)
        .eq('saltedge_connection_id', saltEdgeConnectionId)
        .select('id', { count: 'exact', head: true })

      // Fallback: if no accounts matched, disconnect SALTEDGE accounts with no connection ID
      if (!updatedCount || updatedCount === 0) {
        await supabase
          .from('accounts')
          .update({
            status: 'HIDDEN',
            sync_status: 'DISCONNECTED',
          })
          .eq('user_id', userId)
          .eq('banking_provider', 'SALTEDGE')
          .is('saltedge_connection_id', null)
      }
    }

    // Delete the BankingConnection record
    if (targetConnectionId) {
      await supabase
        .from('banking_connections')
        .delete()
        .eq('id', targetConnectionId)
    }

    return jsonResponse({ success: true })
  } catch (error) {
    console.error('[banking-revoke] Error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return errorResponse(message, 500)
  }
})
