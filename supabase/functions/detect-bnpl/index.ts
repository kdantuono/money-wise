/**
 * detect-bnpl — AI Layer 2 BNPL detection regex (Phase 04 refactor v2).
 *
 * Schema v2 (ADR-0003): popola payment_obligations con kind='BNPL_INSTALLMENT'
 * quando rileva pattern BNPL nelle transactions.
 *
 * 10 BNPL providers IT/EU pattern matching (preserved da legacy):
 *  - Klarna, Scalapay, Clearpay, Afterpay, Affirm, PayPal Pay in 4,
 *    Splitit, Sequra, Younited Pay, Soisy
 *
 * Logica: per ogni transaction nuova del household, regex match descrizione →
 * se pattern detected, crea payment_obligations entry (status=SCHEDULED se due_date
 * stimato future, PAID se già processata) + audit source='sync'.
 */

import { handleCors } from '../_shared/cors.ts'
import { createUserClient, getUserId, getHouseholdId, setAuditSource } from '../_shared/supabase.ts'
import { jsonResponse, errorResponse } from '../_shared/responses.ts'

interface RequestBody {
  transactionIds?: string[]  // optional, default = recenti non ancora processate
}

const BNPL_PATTERNS: Array<{ pattern: RegExp; brand: string }> = [
  { pattern: /\bklarna\b/i, brand: 'Klarna' },
  { pattern: /\bscalapay\b/i, brand: 'Scalapay' },
  { pattern: /\bclearpay\b/i, brand: 'Clearpay' },
  { pattern: /\bafterpay\b/i, brand: 'Afterpay' },
  { pattern: /\baffirm\b/i, brand: 'Affirm' },
  { pattern: /paypal\s*pay\s*in\s*4/i, brand: 'PayPal Pay in 4' },
  { pattern: /\bsplitit\b/i, brand: 'Splitit' },
  { pattern: /\bsequra\b/i, brand: 'Sequra' },
  { pattern: /younited\s*pay/i, brand: 'Younited Pay' },
  { pattern: /\bsoisy\b/i, brand: 'Soisy' },
]

function matchBnpl(description: string): { match: boolean; brand?: string } {
  for (const { pattern, brand } of BNPL_PATTERNS) {
    if (pattern.test(description)) return { match: true, brand }
  }
  return { match: false }
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const userId = await getUserId(req)
    const householdId = await getHouseholdId(req)
    const supabase = createUserClient(req)
    const body: RequestBody = req.body ? await req.json() : {}

    // Fetch transactions to scan
    let txQuery = supabase
      .from('transactions')
      .select('id, description, amount_cents, currency, occurred_at, position_id, household_id')
      .eq('household_id', householdId)

    if (body.transactionIds && body.transactionIds.length > 0) {
      txQuery = txQuery.in('id', body.transactionIds)
    } else {
      txQuery = txQuery.order('occurred_at', { ascending: false }).limit(100)
    }

    const { data: txs } = await txQuery
    if (!txs) return jsonResponse({ success: true, data: { detected: 0 } })

    await setAuditSource(supabase, 'sync')

    let detectedCount = 0
    const detections: Array<{ transactionId: string; brand: string; obligationId?: string }> = []

    for (const tx of txs) {
      const result = matchBnpl(tx.description ?? '')
      if (!result.match) continue

      // Check idempotency: payment_obligations già esistente per questa transaction?
      const { data: existing } = await supabase
        .from('payment_obligations')
        .select('id')
        .eq('settled_by_transaction_id', tx.id)
        .maybeSingle()

      if (existing) {
        detections.push({ transactionId: tx.id, brand: result.brand!, obligationId: existing.id })
        continue
      }

      // Insert payment_obligation BNPL_INSTALLMENT (PAID se already processed transaction)
      const { data: inserted, error } = await supabase
        .from('payment_obligations')
        .insert({
          source_position_id: tx.position_id,
          household_id: householdId,
          kind: 'BNPL_INSTALLMENT',
          amount_cents: tx.amount_cents,
          currency: tx.currency,
          due_date: tx.occurred_at.split('T')[0],
          status: 'PAID',
          settled_by_transaction_id: tx.id,
          // TODO Phase 06: ML confidence calibration AI Layer 2. Valore corrente arbitrario, sostituire con calibrated probability.
          projection_confidence: 0.85,
          generated_by: 'AI_FORECAST',
        })
        .select('id')
        .single()

      if (error) {
        console.warn(JSON.stringify({ event: 'bnpl_obligation_insert_failed', tx_id: tx.id, error: error.message }))
        continue
      }
      if (inserted) {
        detectedCount++
        detections.push({ transactionId: tx.id, brand: result.brand!, obligationId: inserted.id })
      }
    }

    return jsonResponse({ success: true, data: { detected: detectedCount, detections } })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error(JSON.stringify({ event: 'detect_bnpl_error', error: message }))
    const status = message === 'Unauthorized' ? 401 : 500
    return errorResponse(message, status)
  }
})
