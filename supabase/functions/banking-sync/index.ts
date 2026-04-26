/**
 * banking-sync — pull periodico transactions + balance update da Saltedge.
 * Phase 04 refactor 2026-04-26: schema v2.
 *
 * Idempotency forte (ADR-0011):
 *  - INSERT transactions con ON CONFLICT (position_id, provider_transaction_id) DO NOTHING
 *  - Saltedge ritorna `id` stabile per transaction → idempotency key naturale
 *
 * Flow:
 *  1. Auth + household
 *  2. Per ogni provider_connection ACTIVE del household:
 *     a. Refresh Saltedge connection
 *     b. Per ogni financial_positions del provider (saltedge):
 *        - Fetch transactions Saltedge dal último sync
 *        - INSERT transactions v2 con sign mapping (Ratifica 2 Phase 03)
 *        - Update current_balance_cents da Saltedge canonical (Ratifica 5 Phase 04)
 *  3. Update provider_connections.last_successful_sync_at
 */

import { corsHeaders } from '../_shared/cors.ts'
import { createServiceClient, getUserId, getHouseholdId, setAuditSource } from '../_shared/supabase.ts'
import { SaltEdgeClient } from '../_shared/saltedge.ts'

const DEFAULT_SYNC_DAYS_BACK = 30  // TBD ratifica esplicita Phase 06+ se cambia

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const userId = await getUserId(req)
    const householdId = await getHouseholdId(req)
    const supabase = createServiceClient()
    const saltEdge = new SaltEdgeClient()

    await setAuditSource(supabase, 'sync')

    // Fetch ACTIVE provider_connections
    const { data: connections } = await supabase
      .from('provider_connections')
      .select('id, provider, provider_connection_id, last_successful_sync_at')
      .eq('household_id', householdId)
      .eq('provider', 'saltedge')
      .eq('status', 'ACTIVE')

    if (!connections || connections.length === 0) {
      return new Response(JSON.stringify({ success: true, data: { synced: 0, message: 'No active connections' } }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch currency decimals map per amount conversion (Ratifica 5)
    const { data: currencies } = await supabase.from('currencies').select('code, decimals')
    const decimalsMap: Record<string, number> = {}
    for (const c of currencies ?? []) decimalsMap[c.code] = c.decimals

    let syncedTxCount = 0
    let updatedBalances = 0

    for (const conn of connections) {
      if (!conn.provider_connection_id) continue

      // Saltedge refresh (best effort)
      try {
        await saltEdge.refreshConnection(conn.provider_connection_id)
      } catch (err) {
        console.warn(JSON.stringify({ event: 'saltedge_refresh_failed', conn: conn.id, error: String(err) }))
      }

      // Fetch financial_positions per questa connection (provider_account_id non null)
      const { data: positions } = await supabase
        .from('financial_positions')
        .select('id, provider_account_id, currency, current_balance_cents')
        .eq('household_id', householdId)
        .eq('provider', 'saltedge')
        .is('deleted_at', null)
        .not('provider_account_id', 'is', null)

      if (!positions) continue

      const fromDate = conn.last_successful_sync_at
        ? new Date(conn.last_successful_sync_at).toISOString().split('T')[0]
        : new Date(Date.now() - DEFAULT_SYNC_DAYS_BACK * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      // Saltedge accounts (for balance update)
      const seAccounts = await saltEdge.getAccounts(conn.provider_connection_id)
      const seAccountById: Record<string, typeof seAccounts[number]> = {}
      for (const a of seAccounts) seAccountById[String(a.id)] = a

      for (const pos of positions) {
        const seAcc = seAccountById[pos.provider_account_id!]
        if (!seAcc) continue

        // Update balance (Ratifica 5: Saltedge canonical)
        const decimals = decimalsMap[seAcc.currency_code.toUpperCase()] ?? 2
        const balanceCents = Math.round(seAcc.balance * Math.pow(10, decimals))
        if (balanceCents !== pos.current_balance_cents) {
          await supabase
            .from('financial_positions')
            .update({ current_balance_cents: balanceCents, balance_as_of: new Date().toISOString() })
            .eq('id', pos.id)
          updatedBalances++
        }

        // Fetch transactions
        const seTxs = await saltEdge.getTransactions(conn.provider_connection_id, pos.provider_account_id!, fromDate)

        for (const tx of seTxs) {
          if (tx.duplicated) continue  // Saltedge marca duplicati noti

          const txDecimals = decimalsMap[tx.currency_code.toUpperCase()] ?? 2
          const amountCents = Math.abs(Math.round(tx.amount * Math.pow(10, txDecimals)))
          const direction: 'CREDIT' | 'DEBIT' =
            tx.amount > 0 ? 'CREDIT' : 'DEBIT'  // Ratifica 2 Phase 03: amount=0 → DEBIT default

          // Idempotency forte: ON CONFLICT (position_id, provider_transaction_id) DO NOTHING
          // (advisor uq_transactions_provider_tx partial unique index Phase 01)
          const { error: insertError } = await supabase.from('transactions').insert({
            position_id: pos.id,
            household_id: householdId,
            amount_cents: amountCents,
            direction,
            currency: tx.currency_code.toUpperCase(),
            description: tx.description,
            provider_transaction_id: String(tx.id),
            occurred_at: tx.made_on,
            synced_at: new Date().toISOString(),
          })

          if (insertError) {
            // 23505 = unique_violation → idempotent skip
            if (insertError.code !== '23505') {
              console.warn(JSON.stringify({ event: 'tx_insert_failed', tx_id: tx.id, error: insertError.message }))
            }
            continue
          }
          syncedTxCount++
        }
      }

      // Update last_successful_sync_at
      await supabase
        .from('provider_connections')
        .update({ last_successful_sync_at: new Date().toISOString(), last_error_code: null, last_error_at: null })
        .eq('id', conn.id)
    }

    return new Response(
      JSON.stringify({ success: true, data: { syncedTxCount, updatedBalances, connections: connections.length } }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error(JSON.stringify({ event: 'banking_sync_error', error: message }))
    const status = message === 'Unauthorized' ? 401 : 500
    return new Response(JSON.stringify({ success: false, error: message }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
