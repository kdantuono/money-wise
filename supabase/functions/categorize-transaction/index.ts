import { handleCors } from '../_shared/cors.ts'
import { createUserClient, getFamilyId } from '../_shared/supabase.ts'
import { jsonResponse, errorResponse } from '../_shared/responses.ts'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CategorizationInput {
  description: string
  merchantName?: string | null
  amount?: number
  type?: 'DEBIT' | 'CREDIT'
  metadata?: {
    saltedgeId?: string
    category?: string
    extra?: { merchant_name?: string; [key: string]: unknown }
  } | null
}

interface CategorizationResult {
  categoryId: string | null
  confidence: number
  matchedBy: 'enrichment' | 'merchant_exact' | 'merchant_partial' | 'keyword' | 'fallback'
}

interface CategoryRow {
  id: string
  slug: string
  type: 'INCOME' | 'EXPENSE'
  is_system: boolean
  rules: {
    merchantPatterns?: string[]
    keywords?: string[]
    autoAssign?: boolean
    confidence?: number
  } | null
}

interface LearnInput {
  action: 'learn'
  transactionId: string
  categoryId: string
  merchantName: string
}

// ---------------------------------------------------------------------------
// SaltEdge category mapping
// ---------------------------------------------------------------------------

const SALTEDGE_CATEGORY_MAP: Record<string, string[]> = {
  shopping: ['groceries', 'shopping', 'retail'],
  food_and_beverage: ['groceries', 'restaurants', 'food'],
  entertainment: ['entertainment', 'leisure'],
  transportation: ['transportation', 'car', 'gas', 'fuel'],
  utilities: ['utilities', 'bills'],
  health: ['healthcare', 'medical'],
  travel: ['travel', 'vacation'],
  income: ['salary', 'income', 'wages'],
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Map DEBIT/CREDIT to category type */
function toCategoryType(txType: 'DEBIT' | 'CREDIT'): 'EXPENSE' | 'INCOME' {
  return txType === 'DEBIT' ? 'EXPENSE' : 'INCOME'
}

// ---------------------------------------------------------------------------
// Categorization strategies
// ---------------------------------------------------------------------------

function matchSaltEdgeCategory(
  saltEdgeCategory: string,
  categories: CategoryRow[],
  expectedType: 'EXPENSE' | 'INCOME',
): CategorizationResult | null {
  const possibleSlugs = SALTEDGE_CATEGORY_MAP[saltEdgeCategory.toLowerCase()]
  if (!possibleSlugs?.length) return null

  const match = categories.find(
    (c) => possibleSlugs.includes(c.slug) && c.type === expectedType,
  )
  return match ? { categoryId: match.id, confidence: 85, matchedBy: 'enrichment' } : null
}

function matchMerchantExact(
  merchantName: string,
  categories: CategoryRow[],
  expectedType: 'EXPENSE' | 'INCOME',
): CategorizationResult | null {
  const normalized = merchantName.toLowerCase().trim()

  for (const cat of categories) {
    if (cat.type !== expectedType) continue
    if (!cat.rules?.merchantPatterns) continue

    const exact = cat.rules.merchantPatterns.some(
      (p) => p.toLowerCase() === normalized,
    )
    if (exact) {
      return { categoryId: cat.id, confidence: 90, matchedBy: 'merchant_exact' }
    }
  }
  return null
}

function matchMerchantPartial(
  merchantName: string,
  categories: CategoryRow[],
  expectedType: 'EXPENSE' | 'INCOME',
): CategorizationResult | null {
  const normalized = merchantName.toLowerCase().trim()

  for (const cat of categories) {
    if (cat.type !== expectedType) continue
    if (!cat.rules?.merchantPatterns) continue

    const partial = cat.rules.merchantPatterns.some(
      (p) =>
        normalized.includes(p.toLowerCase()) ||
        p.toLowerCase().includes(normalized),
    )
    if (partial) {
      return { categoryId: cat.id, confidence: 75, matchedBy: 'merchant_partial' }
    }
  }
  return null
}

function matchKeywords(
  description: string,
  categories: CategoryRow[],
  expectedType: 'EXPENSE' | 'INCOME',
): CategorizationResult | null {
  const normalized = description.toLowerCase().trim()

  for (const cat of categories) {
    if (cat.type !== expectedType) continue
    if (!cat.rules?.keywords) continue

    const kw = cat.rules.keywords.some((k) =>
      normalized.includes(k.toLowerCase()),
    )
    if (kw) {
      return { categoryId: cat.id, confidence: 60, matchedBy: 'keyword' }
    }
  }
  return null
}

/** Run the 5-strategy cascade for a single input */
function categorize(
  input: CategorizationInput,
  categories: CategoryRow[],
  uncategorizedId: string | null,
): CategorizationResult {
  const expectedType = toCategoryType(input.type || 'DEBIT')

  // Strategy 1: SaltEdge enrichment
  if (input.metadata?.category) {
    const r = matchSaltEdgeCategory(input.metadata.category, categories, expectedType)
    if (r) return r
  }

  // Strategy 2 & 3: Merchant exact then partial
  const merchantName = input.merchantName || input.metadata?.extra?.merchant_name
  if (merchantName) {
    const exact = matchMerchantExact(merchantName, categories, expectedType)
    if (exact) return exact

    const partial = matchMerchantPartial(merchantName, categories, expectedType)
    if (partial) return partial
  }

  // Strategy 4: Keyword matching
  const kw = matchKeywords(input.description, categories, expectedType)
  if (kw) return kw

  // Strategy 5: Fallback
  return { categoryId: uncategorizedId, confidence: 0, matchedBy: 'fallback' }
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

    // ----- LEARN MODE -----
    if (body.action === 'learn') {
      const { categoryId, merchantName } = body as LearnInput

      if (!categoryId || !UUID_RE.test(categoryId)) {
        return errorResponse('Invalid categoryId UUID')
      }
      if (!merchantName || typeof merchantName !== 'string') {
        return errorResponse('merchantName is required for learn action')
      }

      const supabase = createUserClient(req)

      // Get current category (RLS ensures family ownership)
      const { data: category, error: catErr } = await supabase
        .from('categories')
        .select('id, rules')
        .eq('id', categoryId)
        .single()

      if (catErr || !category) {
        return errorResponse('Category not found', 404)
      }

      const currentRules = (category.rules as CategoryRow['rules']) || {}
      const merchantPatterns = currentRules.merchantPatterns || []
      const normalizedMerchant = merchantName.toLowerCase().trim()

      const alreadyExists = merchantPatterns.some(
        (p) => p.toLowerCase() === normalizedMerchant,
      )

      if (!alreadyExists) {
        merchantPatterns.push(normalizedMerchant)

        const updatedRules = {
          ...currentRules,
          merchantPatterns,
          autoAssign: true,
          confidence: 90,
        }

        const { error: updateErr } = await supabase
          .from('categories')
          .update({ rules: updatedRules })
          .eq('id', categoryId)

        if (updateErr) {
          return errorResponse('Failed to update category rules', 500)
        }
      }

      return jsonResponse({ success: true, merchantPatterns })
    }

    // ----- CATEGORIZATION MODE -----
    const familyId = await getFamilyId(req)

    // Load active categories for this family
    const supabase = createUserClient(req)
    const { data: categories, error: catErr } = await supabase
      .from('categories')
      .select('id, slug, type, is_system, rules')
      .eq('family_id', familyId)
      .eq('status', 'ACTIVE')

    if (catErr) {
      return errorResponse('Failed to load categories', 500)
    }

    const cats = (categories || []) as CategoryRow[]

    // Find the uncategorized system category
    const uncategorized = cats.find((c) => c.slug === 'uncategorized' && c.is_system)
    const uncategorizedId = uncategorized?.id ?? null

    // Bulk mode
    if (Array.isArray(body.transactions)) {
      const results = (body.transactions as CategorizationInput[]).map((tx) =>
        categorize(tx, cats, uncategorizedId),
      )
      return jsonResponse({ results })
    }

    // Single mode
    if (!body.description || typeof body.description !== 'string') {
      return errorResponse('description is required')
    }

    const result = categorize(body as CategorizationInput, cats, uncategorizedId)
    return jsonResponse(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    const status = message === 'Unauthorized' || message === 'Missing Authorization header' ? 401 : 500
    return errorResponse(message, status)
  }
})
