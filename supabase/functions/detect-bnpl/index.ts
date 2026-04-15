import { handleCors } from '../_shared/cors.ts'
import { getUserId } from '../_shared/supabase.ts'
import { jsonResponse, errorResponse } from '../_shared/responses.ts'

// ---------------------------------------------------------------------------
// BNPL provider patterns
// ---------------------------------------------------------------------------

const BNPL_PATTERNS: Record<string, RegExp> = {
  'PayPal Pay in 3': /pay\s*in\s*3/i,
  'PayPal Pay in 4': /pay\s*in\s*4/i,
  'Klarna': /klarna/i,
  'Afterpay': /afterpay|after\s*pay/i,
  'Affirm': /affirm/i,
  'Clearpay': /clearpay|clear\s*pay/i,
  'Zip': /\bzip\s*(pay|money)?\b/i,
  'Sezzle': /sezzle/i,
  'Quadpay': /quadpay|quad\s*pay/i,
  'Laybuy': /laybuy|lay\s*buy/i,
}

// ---------------------------------------------------------------------------
// Detection logic
// ---------------------------------------------------------------------------

interface BNPLResult {
  detected: boolean
  provider: string | null
  confidence: number
}

function detectBNPL(description: string): BNPLResult {
  for (const [provider, pattern] of Object.entries(BNPL_PATTERNS)) {
    if (pattern.test(description)) {
      return { detected: true, provider, confidence: 90 }
    }
  }
  return { detected: false, provider: null, confidence: 0 }
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
    // Auth is required (verify_jwt = true in config.toml)
    await getUserId(req)

    const body = await req.json()

    // ----- BULK MODE -----
    if (Array.isArray(body.descriptions)) {
      const results = (body.descriptions as string[]).map((desc) => ({
        description: desc,
        ...detectBNPL(desc),
      }))
      return jsonResponse({ results })
    }

    // ----- SINGLE MODE -----
    if (!body.description || typeof body.description !== 'string') {
      return errorResponse('description is required')
    }

    const result = detectBNPL(body.description)
    return jsonResponse(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    const status = message === 'Unauthorized' || message === 'Missing Authorization header' ? 401 : 500
    return errorResponse(message, status)
  }
})
