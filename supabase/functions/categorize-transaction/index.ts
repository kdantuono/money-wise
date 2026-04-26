/**
 * categorize-transaction — AI Layer 2 cascade categorization (Phase 04 refactor v2).
 *
 * Schema v2 (ADR-0011 + ADR-0012):
 *   - transactions immutable post-INSERT, modifiche utente in transaction_overrides
 *   - categories (system) + user_categories (per utente, system_slug=NULL=custom puro)
 *
 * 5-strategy cascade (preserved from legacy):
 *   1. Saltedge category direct mapping
 *   2. Merchant name regex match
 *   3. Description keyword match
 *   4. User history learning
 *   5. Default 'other_expense' (system slug)
 *
 * Output: aggiorna transaction_overrides.category_id (system override) per la transaction.
 */

import { handleCors } from '../_shared/cors.ts'
import { createUserClient, getUserId, getHouseholdId, setAuditSource } from '../_shared/supabase.ts'
import { jsonResponse, errorResponse } from '../_shared/responses.ts'

interface RequestBody {
  transactionId: string
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const userId = await getUserId(req)
    const householdId = await getHouseholdId(req)
    const supabase = createUserClient(req)
    const body: RequestBody = await req.json()

    if (!body.transactionId) return errorResponse('Missing transactionId', 400)

    // Fetch transaction (RLS scoped via authenticated user)
    const { data: tx } = await supabase
      .from('transactions')
      .select('id, description, household_id')
      .eq('id', body.transactionId)
      .maybeSingle()

    if (!tx || tx.household_id !== householdId) {
      return errorResponse('TransactionNotFound', 404)
    }

    // Strategy cascade — semplificato per Phase 04 (full impl Phase 06 AI Layer 2)
    let categorySlug = 'other_expense'  // default fallback

    const desc = (tx.description ?? '').toLowerCase()
    if (/conad|coop|esselunga|carrefour|lidl|eurospin/.test(desc)) categorySlug = 'food'
    else if (/agip|eni|q8|tamoil|esso/.test(desc)) categorySlug = 'transport'
    else if (/enel|hera|a2a|acea/.test(desc)) categorySlug = 'utilities'
    else if (/netflix|spotify|amazon prime|disney/.test(desc)) categorySlug = 'subscriptions'
    else if (/f24|imu|inps|irpef/.test(desc)) categorySlug = 'taxes'

    // Resolve category id by slug
    const { data: cat } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', categorySlug)
      .maybeSingle()

    if (!cat) return errorResponse(`CategorySlugNotFound: ${categorySlug}`, 500)

    await setAuditSource(supabase, 'user_action')

    // UPSERT transaction_overrides (system category_id + null user_category_id, ratifica 2 Phase 01)
    const { error: upsertError } = await supabase
      .from('transaction_overrides')
      .upsert({
        transaction_id: tx.id,
        category_id: cat.id,
        user_category_id: null,
      }, { onConflict: 'transaction_id' })

    if (upsertError) return errorResponse(`UpsertFailed: ${upsertError.message}`, 500)

    return jsonResponse({ success: true, data: { transactionId: tx.id, categorySlug, categoryId: cat.id } })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error(JSON.stringify({ event: 'categorize_transaction_error', error: message }))
    const status = message === 'Unauthorized' ? 401 : 500
    return errorResponse(message, status)
  }
})
