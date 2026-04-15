/**
 * Banking Sync — Syncs transactions for a specific account
 *
 * Authenticated endpoint (user JWT required).
 * Fetches transactions from SaltEdge for the given account,
 * upserts them into the transactions table, and updates the account balance.
 *
 * POST { accountId }
 * Returns { syncLogId, status, transactionsSynced, balanceUpdated }
 */

import { handleCors } from '../_shared/cors.ts'
import { createServiceClient, getUserId } from '../_shared/supabase.ts'
import { jsonResponse, errorResponse } from '../_shared/responses.ts'
import { SaltEdgeClient, type SaltEdgeTransaction } from '../_shared/saltedge.ts'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map SaltEdge transaction status to our transaction_status enum */
function mapTransactionStatus(status: string): string {
  const statusMap: Record<string, string> = {
    pending: 'PENDING',
    posted: 'POSTED',
    completed: 'POSTED',
    cancelled: 'CANCELLED',
  }
  return statusMap[status?.toLowerCase()] ?? 'POSTED'
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
    const accountId: string = body.accountId

    if (!accountId) {
      return errorResponse('accountId is required', 400)
    }

    const supabase = createServiceClient()
    const saltEdge = new SaltEdgeClient()

    // 1. Find account and verify ownership
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

    if (!account.saltedge_account_id) {
      return errorResponse('Account is not linked to SaltEdge', 400)
    }

    if (!account.saltedge_connection_id) {
      return errorResponse('Account has no SaltEdge connection ID', 400)
    }

    // 2. Create sync_log entry
    const { data: syncLog, error: logErr } = await supabase
      .from('banking_sync_logs')
      .insert({
        account_id: accountId,
        provider: 'SALTEDGE',
        status: 'SYNCING',
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (logErr) throw new Error(`Failed to create sync log: ${logErr.message}`)

    // 3. Update account sync status
    await supabase
      .from('accounts')
      .update({ sync_status: 'SYNCING' })
      .eq('id', accountId)

    // 4. Fetch transactions from SaltEdge (last 90 days)
    const fromDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]

    let transactions: SaltEdgeTransaction[]
    try {
      transactions = await saltEdge.getTransactions(
        account.saltedge_connection_id,
        account.saltedge_account_id,
        fromDate,
      )
    } catch (fetchErr) {
      // Handle SaltEdge errors (e.g., connection deleted)
      const errMsg = fetchErr instanceof Error ? fetchErr.message : 'Failed to fetch transactions'

      await supabase
        .from('banking_sync_logs')
        .update({
          status: 'ERROR',
          completed_at: new Date().toISOString(),
          error: errMsg,
          error_code: 'FETCH_ERROR',
          transactions_synced: 0,
        })
        .eq('id', syncLog.id)

      await supabase
        .from('accounts')
        .update({ sync_status: 'ERROR' })
        .eq('id', accountId)

      return errorResponse(errMsg, 502)
    }

    // 5. Upsert transactions
    let transactionsSynced = 0

    for (const tx of transactions) {
      try {
        const saltEdgeTxId = String(tx.id)

        // Check if transaction already exists
        const { data: existing } = await supabase
          .from('transactions')
          .select('id')
          .eq('saltedge_transaction_id', saltEdgeTxId)
          .maybeSingle()

        const txAmount = Math.abs(tx.amount)
        const txType = tx.amount >= 0 ? 'CREDIT' : 'DEBIT'
        const flowType = tx.amount > 0 ? 'INCOME' : 'EXPENSE'

        if (existing) {
          // Update existing transaction
          await supabase
            .from('transactions')
            .update({
              amount: txAmount,
              status: mapTransactionStatus(tx.status),
              description: tx.description || 'No description',
              merchant_name: tx.extra?.merchant_name || null,
              is_pending: tx.status === 'pending',
            })
            .eq('id', existing.id)
        } else {
          // Create new transaction
          const { error: insertErr } = await supabase
            .from('transactions')
            .insert({
              account_id: accountId,
              amount: txAmount,
              type: txType,
              status: mapTransactionStatus(tx.status),
              source: 'SALTEDGE',
              currency: tx.currency_code || account.currency || 'EUR',
              flow_type: flowType,
              date: tx.made_on,
              description: tx.description || 'No description',
              merchant_name: tx.extra?.merchant_name || null,
              is_pending: tx.status === 'pending',
              saltedge_transaction_id: String(tx.id),
            })

          if (insertErr) {
            console.warn(`[banking-sync] Failed to insert transaction ${tx.id}:`, insertErr.message)
            continue
          }
        }

        transactionsSynced++
      } catch (txErr) {
        console.warn(`[banking-sync] Failed to process transaction ${tx.id}:`, txErr)
      }
    }

    // 6. Update account balance from SaltEdge
    let balanceUpdated = false
    try {
      const accounts = await saltEdge.getAccounts(account.saltedge_connection_id)
      const seAccount = accounts.find((a) => String(a.id) === account.saltedge_account_id)

      if (seAccount) {
        await supabase
          .from('accounts')
          .update({
            current_balance: seAccount.balance,
            sync_status: 'SYNCED',
            last_sync_at: new Date().toISOString(),
          })
          .eq('id', accountId)

        balanceUpdated = true
      } else {
        await supabase
          .from('accounts')
          .update({
            sync_status: 'SYNCED',
            last_sync_at: new Date().toISOString(),
          })
          .eq('id', accountId)
      }
    } catch {
      // Balance update is non-critical
      await supabase
        .from('accounts')
        .update({
          sync_status: 'SYNCED',
          last_sync_at: new Date().toISOString(),
        })
        .eq('id', accountId)
    }

    // 7. Update sync log
    await supabase
      .from('banking_sync_logs')
      .update({
        status: 'SYNCED',
        completed_at: new Date().toISOString(),
        accounts_synced: 1,
        transactions_synced: transactionsSynced,
        balance_updated: balanceUpdated,
      })
      .eq('id', syncLog.id)

    return jsonResponse({
      syncLogId: syncLog.id,
      status: 'SYNCED',
      transactionsSynced,
      balanceUpdated,
    })
  } catch (error) {
    console.error('[banking-sync] Error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return errorResponse(message, 500)
  }
})
