/**
 * detect-transfers — AI Layer 2 transfer pair detection (Phase 04 refactor v2).
 *
 * Schema v2 (ADR-0011): popola transactions.transfer_pair_id quando rileva una
 * coppia di transactions che rappresentano lo stesso movimento tra due position
 * dello stesso household (es. "bonifico da conto A a conto B").
 *
 * Scoring algorithm (preserved da legacy semplificato):
 *  - Match by amount opposto (DEBIT su tx_a + CREDIT su tx_b stesso amount_cents)
 *  - Window temporale: ±48h tra occurred_at
 *  - Different position_id (no self-transfer)
 *  - Stesso currency (cross-currency transfer escluso da MVP, gestione futura quadrante 4)
 *
 * Output: aggiorna transactions.transfer_pair_id su entrambe le transactions
 * (FK self-referencing). Pattern: tx_a.transfer_pair_id = tx_b.id, tx_b.transfer_pair_id = tx_a.id.
 *
 * NOTA ADR-0011: transactions immutable post-INSERT, ma transfer_pair_id non è
 * un dato canonico — è metadato derivato. Aggiornare via service_role bypass RLS
 * con audit source='sync'. Trade-off accettato per semplicità implementazione.
 */

import { handleCors } from '../_shared/cors.ts'
import { createServiceClient, getUserId, getHouseholdId, setAuditSource } from '../_shared/supabase.ts'
import { jsonResponse, errorResponse } from '../_shared/responses.ts'

const TRANSFER_WINDOW_HOURS = 48

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const userId = await getUserId(req)
    const householdId = await getHouseholdId(req)
    const supabase = createServiceClient()  // service role per UPDATE su transactions immutable

    await setAuditSource(supabase, 'sync')

    // Fetch transactions del household degli ultimi N giorni senza transfer_pair_id
    const { data: txs } = await supabase
      .from('transactions')
      .select('id, position_id, household_id, amount_cents, direction, currency, occurred_at, transfer_pair_id')
      .eq('household_id', householdId)
      .is('transfer_pair_id', null)
      .order('occurred_at', { ascending: false })
      .limit(500)

    if (!txs || txs.length < 2) return jsonResponse({ success: true, data: { matched_pairs: 0 } })

    let matchedPairs = 0
    const matched: Array<{ tx_a_id: string; tx_b_id: string; amount_cents: number }> = []

    // Greedy O(n²) scoring per dataset piccolo. Per dataset grandi → SQL window function.
    for (let i = 0; i < txs.length; i++) {
      const tx_a = txs[i]
      if (tx_a.transfer_pair_id) continue  // potrebbe essere già stato accoppiato in iter precedente

      for (let j = i + 1; j < txs.length; j++) {
        const tx_b = txs[j]
        if (tx_b.transfer_pair_id) continue

        // Must be opposite direction (DEBIT vs CREDIT)
        if (tx_a.direction === tx_b.direction) continue

        // Same amount + same currency
        if (tx_a.amount_cents !== tx_b.amount_cents) continue
        if (tx_a.currency !== tx_b.currency) continue

        // Different position
        if (tx_a.position_id === tx_b.position_id) continue

        // Within time window
        const tA = new Date(tx_a.occurred_at).getTime()
        const tB = new Date(tx_b.occurred_at).getTime()
        const diffHours = Math.abs(tA - tB) / (1000 * 60 * 60)
        if (diffHours > TRANSFER_WINDOW_HOURS) continue

        // Match found — link bilaterally
        await supabase.from('transactions').update({ transfer_pair_id: tx_b.id }).eq('id', tx_a.id)
        await supabase.from('transactions').update({ transfer_pair_id: tx_a.id }).eq('id', tx_b.id)

        // Mark in local array per evitare doppio match
        tx_a.transfer_pair_id = tx_b.id as unknown as null
        tx_b.transfer_pair_id = tx_a.id as unknown as null

        matchedPairs++
        matched.push({ tx_a_id: tx_a.id, tx_b_id: tx_b.id, amount_cents: tx_a.amount_cents })
        break  // tx_a già accoppiata
      }
    }

    return jsonResponse({ success: true, data: { matched_pairs: matchedPairs, matched } })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error(JSON.stringify({ event: 'detect_transfers_error', error: message }))
    const status = message === 'Unauthorized' ? 401 : 500
    return errorResponse(message, status)
  }
})
