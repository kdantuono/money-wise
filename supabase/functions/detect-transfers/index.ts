import { handleCors } from '../_shared/cors.ts'
import { createUserClient, getUserId } from '../_shared/supabase.ts'
import { jsonResponse, errorResponse } from '../_shared/responses.ts'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW'

interface TransferSuggestion {
  transactionId: string
  matchedTransactionId: string
  confidence: ConfidenceLevel
  confidenceScore: number
  reasons: string[]
  amount: number
  matchedAmount: number
  daysDifference: number
}

interface TransactionRow {
  id: string
  amount: number
  flow_type: string
  date: string
  description: string | null
  account_id: string
  transfer_group_id: string | null
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BNPL_PATTERN = /pay.?in.?3|klarna|afterpay|satispay|affirm/i
const MAX_DAY_DIFF = 3

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

function scoreMatch(
  transaction: TransactionRow,
  match: TransactionRow,
): TransferSuggestion {
  let score = 0
  const reasons: string[] = []

  // Amount comparison (40 pts max)
  const txAmount = Number(transaction.amount)
  const mAmount = Number(match.amount)
  const amountDiff = Math.abs(txAmount - mAmount)
  const amountRatio = txAmount > 0 ? amountDiff / txAmount : 0

  if (amountDiff === 0) {
    score += 40
    reasons.push('Exact amount match')
  } else if (amountRatio <= 0.01) {
    score += 35
    reasons.push('Amount within 1%')
  } else if (amountRatio <= 0.05) {
    score += 25
    reasons.push('Amount within 5%')
  }

  // Date proximity (30 pts max)
  const daysDiff = Math.abs(
    (new Date(transaction.date).getTime() - new Date(match.date).getTime()) /
      (1000 * 60 * 60 * 24),
  )

  if (daysDiff === 0) {
    score += 30
    reasons.push('Same day')
  } else if (daysDiff <= 1) {
    score += 25
    reasons.push('Within 1 day')
  } else if (daysDiff <= 2) {
    score += 15
    reasons.push('Within 2 days')
  } else {
    score += 5
    reasons.push('Within 3 days')
  }

  // Different accounts bonus (15 pts)
  if (transaction.account_id !== match.account_id) {
    score += 15
    reasons.push('Different accounts')
  }

  // BNPL pattern detection (15 pts)
  const desc = `${transaction.description || ''} ${match.description || ''}`
  if (BNPL_PATTERN.test(desc)) {
    score += 15
    reasons.push('BNPL pattern detected')
  }

  // Confidence level
  let confidence: ConfidenceLevel
  if (score >= 80) {
    confidence = 'HIGH'
  } else if (score >= 50) {
    confidence = 'MEDIUM'
  } else {
    confidence = 'LOW'
  }

  return {
    transactionId: transaction.id,
    matchedTransactionId: match.id,
    confidence,
    confidenceScore: score,
    reasons,
    amount: txAmount,
    matchedAmount: mAmount,
    daysDifference: Math.round(daysDiff),
  }
}

// ---------------------------------------------------------------------------
// Find potential matches for a single transaction
// ---------------------------------------------------------------------------

async function findPotentialMatches(
  supabase: ReturnType<typeof createUserClient>,
  transactionId: string,
): Promise<TransferSuggestion[]> {
  // Get the source transaction (RLS enforces family scope)
  const { data: transaction, error: txErr } = await supabase
    .from('transactions')
    .select('id, amount, flow_type, date, description, account_id, transfer_group_id')
    .eq('id', transactionId)
    .single()

  if (txErr || !transaction) return []

  const tx = transaction as TransactionRow

  // Determine opposite flow type
  const oppositeFlowType = tx.flow_type === 'INCOME' ? 'EXPENSE' : 'INCOME'

  // Date range: +/- 3 days
  const startDate = new Date(tx.date)
  startDate.setDate(startDate.getDate() - MAX_DAY_DIFF)
  const endDate = new Date(tx.date)
  endDate.setDate(endDate.getDate() + MAX_DAY_DIFF)

  // Find candidates
  const { data: matches, error: matchErr } = await supabase
    .from('transactions')
    .select('id, amount, flow_type, date, description, account_id, transfer_group_id')
    .neq('id', transactionId)
    .eq('flow_type', oppositeFlowType)
    .is('transfer_group_id', null)
    .gte('date', startDate.toISOString().slice(0, 10))
    .lte('date', endDate.toISOString().slice(0, 10))

  if (matchErr || !matches) return []

  return (matches as TransactionRow[])
    .map((m) => scoreMatch(tx, m))
    .filter((s) => s.confidenceScore >= 30)
    .sort((a, b) => b.confidenceScore - a.confidenceScore)
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  // CORS preflight
  const corsResp = handleCors(req)
  if (corsResp) return corsResp

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    const body = await req.json()
    const supabase = createUserClient(req)

    // Verify the user is authenticated
    await getUserId(req)

    // ----- ALL SUGGESTIONS MODE -----
    if (body.action === 'all') {
      // Get last 100 transactions without a transfer group
      const { data: transactions, error: txErr } = await supabase
        .from('transactions')
        .select('id, amount, flow_type, date, description, account_id, transfer_group_id')
        .is('transfer_group_id', null)
        .order('date', { ascending: false })
        .limit(100)

      if (txErr) {
        return errorResponse('Failed to load transactions', 500)
      }

      const suggestions: TransferSuggestion[] = []
      const seen = new Set<string>()

      for (const tx of (transactions || []) as TransactionRow[]) {
        const matches = await findPotentialMatches(supabase, tx.id)
        for (const match of matches) {
          const key = [tx.id, match.matchedTransactionId].sort().join('-')
          if (!seen.has(key) && match.confidenceScore >= 50) {
            seen.add(key)
            suggestions.push(match)
          }
        }
      }

      suggestions.sort((a, b) => b.confidenceScore - a.confidenceScore)
      return jsonResponse({ suggestions })
    }

    // ----- SINGLE TRANSACTION MODE -----
    if (!body.transactionId || typeof body.transactionId !== 'string') {
      return errorResponse('transactionId is required')
    }

    const suggestions = await findPotentialMatches(supabase, body.transactionId)
    return jsonResponse({ suggestions })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    const status = message === 'Unauthorized' || message === 'Missing Authorization header' ? 401 : 500
    return errorResponse(message, status)
  }
})
