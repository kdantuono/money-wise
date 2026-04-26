/**
 * SaltEdge API v6 Client + Phase 04 helpers per Edge Functions Zecca.
 *
 * Cambi Phase 04 (2026-04-26):
 *  - Aggiunto verifySignature() RSA-SHA256 webhook verification (chiusura
 *    gap B19 ADR-0008).
 *  - Aggiunto mapSaltedgeNatureToKind() — mapping canonical 11+ Saltedge
 *    nature → v2 PositionKind (ratifica 2 Phase 04). Single source of
 *    truth in architecture/edge-functions-map.md.
 *  - Aggiunto mapSaltedgeStatus() — mapping authentication_status +
 *    error_class → v2 connection_status (ratifica 3 Phase 04).
 *
 * Authentication request → Saltedge: App-id + Secret headers (no RSA signing).
 * Authentication webhook ← Saltedge: RSA-SHA256 signature verification
 *  via SALTEDGE_WEBHOOK_PUBLIC_KEY secret + replay protection ±5 min.
 *
 * Environment variables (set as Supabase secrets):
 * - SALTEDGE_APP_ID
 * - SALTEDGE_SECRET
 * - SALTEDGE_API_URL (optional, defaults to https://www.saltedge.com/api/v6)
 * - SALTEDGE_WEBHOOK_PUBLIC_KEY (PEM-encoded RSA public key, mandatory pre BANKING_INTEGRATION_ENABLED=true)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PositionKind = 'CASH' | 'CREDIT_LINE' | 'LOAN' | 'BNPL' | 'INVESTMENT' | 'CRYPTO' | 'OTHER'
export type PositionNature = 'ASSET' | 'LIABILITY'

export type ConnectionStatus =
  | 'ACTIVE'
  | 'EXPIRING_SOON'
  | 'EXPIRED'
  | 'REAUTH_REQUIRED'
  | 'REVOKED_BY_USER'
  | 'ERROR_GENERIC'
  | 'ERROR_AUTH'
  | 'ERROR_NETWORK'

export interface SaltEdgeAccount {
  id: string
  name: string
  nature: string
  balance: number
  currency_code: string
  extra?: {
    iban?: string
    cards?: string[]
    available_amount?: number
    holder_name?: string
    [key: string]: unknown
  }
  [key: string]: unknown
}

export interface SaltEdgeTransaction {
  id: string
  duplicated: boolean
  mode: string
  status: string
  made_on: string
  amount: number
  currency_code: string
  description: string
  category?: string
  account_id: string
  extra?: {
    merchant_name?: string
    mcc?: string
    original_amount?: number
    original_currency_code?: string
    [key: string]: unknown
  }
  [key: string]: unknown
}

export interface SaltEdgeCustomer {
  id?: string
  customer_id?: string
  identifier: string
  secret?: string
}

export interface SaltEdgeConnection {
  id: string
  secret: string
  provider_id: string
  provider_code: string
  provider_name: string
  country_code: string
  status: string
  authentication_status?: string
  error_class?: string
  categorization?: string
  created_at: string
  updated_at: string
  last_success_at?: string
  next_refresh_possible_at?: string
  show_consent_confirmation?: boolean
  last_consent_id?: string
}

export interface ConnectSessionOptions {
  returnTo?: string
  providerCode?: string
  countryCode?: string
}

export interface NatureMapResult {
  kind: PositionKind
  nature: PositionNature
  isSavingsCash: boolean  // true se nature='savings'/'bonus' → CASH con flag savings
  requiresWarning: boolean  // true se nature non in lista canonical
}

// ---------------------------------------------------------------------------
// Phase 04 helpers — ratifiche 2, 3, 5
// ---------------------------------------------------------------------------

/**
 * Mapping canonical Saltedge nature → v2 PositionKind (ratifica 2 Phase 04).
 * Single source of truth documentata in architecture/edge-functions-map.md.
 *
 * Lista canonica 11+ nature:
 *  - account, checking, debit_card, ewallet → CASH (cash_accounts)
 *  - savings, bonus → CASH (cash_accounts, isSavingsCash=true)
 *  - credit_card, card, credit → CREDIT_LINE (credit_lines)
 *  - loan → LOAN (loans)
 *  - mortgage → LOAN (loans, amortization_type='FRENCH' default IT)
 *  - investment → INVESTMENT (investment_accounts)
 *  - insurance + nature non in lista → OTHER (parent-only) + requiresWarning
 */
export function mapSaltedgeNatureToKind(nature: string): NatureMapResult {
  const n = (nature || '').toLowerCase().trim()

  switch (n) {
    case 'account':
    case 'checking':
    case 'debit_card':
    case 'ewallet':
      return { kind: 'CASH', nature: 'ASSET', isSavingsCash: false, requiresWarning: false }
    case 'savings':
    case 'bonus':
      return { kind: 'CASH', nature: 'ASSET', isSavingsCash: true, requiresWarning: false }
    case 'credit_card':
    case 'card':
    case 'credit':
      return { kind: 'CREDIT_LINE', nature: 'LIABILITY', isSavingsCash: false, requiresWarning: false }
    case 'loan':
      return { kind: 'LOAN', nature: 'LIABILITY', isSavingsCash: false, requiresWarning: false }
    case 'mortgage':
      return { kind: 'LOAN', nature: 'LIABILITY', isSavingsCash: false, requiresWarning: false }
    case 'investment':
      return { kind: 'INVESTMENT', nature: 'ASSET', isSavingsCash: false, requiresWarning: false }
    case 'insurance':
      return { kind: 'OTHER', nature: 'ASSET', isSavingsCash: false, requiresWarning: false }
    default:
      // Ratifica 4: default OTHER + warning per drift Saltedge detection
      return { kind: 'OTHER', nature: 'ASSET', isSavingsCash: false, requiresWarning: true }
  }
}

/**
 * Mapping canonical Saltedge authentication_status → v2 ConnectionStatus
 * (ratifica 3 Phase 04). Documentato in architecture/edge-functions-map.md.
 *
 * NOTE schema: connection_status enum Phase 01 ha 8 valori (no DISABLED).
 * Sub-decisione applicativa: 'disabled' Saltedge → v2 'EXPIRED' (semantica
 * equivalente: connection non più operativa).
 */
export function mapSaltedgeStatus(
  status: string,
  errorClass?: string,
): ConnectionStatus {
  const s = (status || '').toLowerCase().trim()
  const ec = (errorClass || '').toLowerCase().trim()

  switch (s) {
    case 'success':
      return 'ACTIVE'
    case 'pending':
      return 'REAUTH_REQUIRED'
    case 'error':
      // Discriminator binario via error_class
      if (['forbidden', 'invalidcredentials'].some((k) => ec.includes(k))) {
        return 'ERROR_AUTH'
      }
      if (['connectionfailed', 'timeout'].some((k) => ec.includes(k))) {
        return 'ERROR_NETWORK'
      }
      return 'ERROR_GENERIC'
    case 'inactive':
    case 'imported':
      return 'EXPIRED'
    case 'disabled':
      // Sub-decisione: enum v2 non ha DISABLED, mapping a EXPIRED
      return 'EXPIRED'
    default:
      return 'ERROR_GENERIC'
  }
}

/**
 * RSA-SHA256 signature verification per webhook Saltedge (ADR-0008, B19).
 *
 * Saltedge firma il webhook payload con RSA-SHA256 usando la sua public key.
 * Il header `Signature` contiene la signature in base64.
 * Replay protection: il payload contiene `meta.time` con timestamp ISO-8601;
 * tolerance ±5 minuti rispetto a now().
 *
 * @param payload — body raw del webhook (string, NON parsed)
 * @param signature — valore del header `Signature` (base64)
 * @param publicKeyPem — PEM-encoded RSA public key da SALTEDGE_WEBHOOK_PUBLIC_KEY env
 * @param payloadTimestamp — meta.time da JSON parsed (ISO-8601 string)
 * @returns Promise<{valid: boolean, reason?: string}>
 *
 * Esempio di uso:
 *   const sig = req.headers.get('Signature') ?? ''
 *   const body = await req.text()
 *   const parsed = JSON.parse(body)
 *   const result = await verifySignature(body, sig, Deno.env.get('SALTEDGE_WEBHOOK_PUBLIC_KEY')!, parsed.meta?.time)
 *   if (!result.valid) return new Response('', {status: 401})
 *
 * Edge case:
 *   - signature missing → result.valid=false, reason='missing_signature'
 *   - timestamp out of tolerance → result.valid=false, reason='replay_protection'
 *   - public key malformed → result.valid=false, reason='invalid_public_key'
 *   - signature mismatch → result.valid=false, reason='signature_mismatch'
 */
export async function verifySignature(
  payload: string,
  signature: string,
  publicKeyPem: string,
  payloadTimestamp?: string,
): Promise<{ valid: boolean; reason?: string }> {
  if (!signature || !signature.trim()) {
    return { valid: false, reason: 'missing_signature' }
  }
  if (!publicKeyPem || !publicKeyPem.trim()) {
    return { valid: false, reason: 'missing_public_key' }
  }

  // Replay protection ±5 min
  if (payloadTimestamp) {
    const ts = new Date(payloadTimestamp).getTime()
    if (isNaN(ts)) {
      return { valid: false, reason: 'invalid_timestamp' }
    }
    const drift = Math.abs(Date.now() - ts)
    // Tolerance ratificata in ADR-0008 §replay protection. Modifiche richiedono ratifica esplicita.
    const TOLERANCE_MS = 5 * 60 * 1000  // ±5 minuti come da ADR-0008
    if (drift > TOLERANCE_MS) {
      return { valid: false, reason: 'replay_protection' }
    }
  }

  // Import RSA public key da PEM
  let key: CryptoKey
  try {
    const pemContents = publicKeyPem
      .replace(/-----BEGIN PUBLIC KEY-----/, '')
      .replace(/-----END PUBLIC KEY-----/, '')
      .replace(/\s/g, '')
    const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0))

    key = await crypto.subtle.importKey(
      'spki',
      binaryDer,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    )
  } catch {
    return { valid: false, reason: 'invalid_public_key' }
  }

  // Decode signature da base64
  let signatureBytes: Uint8Array
  try {
    signatureBytes = Uint8Array.from(atob(signature), (c) => c.charCodeAt(0))
  } catch {
    return { valid: false, reason: 'invalid_signature_encoding' }
  }

  const payloadBytes = new TextEncoder().encode(payload)

  let isValid: boolean
  try {
    isValid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      key,
      signatureBytes,
      payloadBytes,
    )
  } catch {
    return { valid: false, reason: 'verification_error' }
  }

  return isValid
    ? { valid: true }
    : { valid: false, reason: 'signature_mismatch' }
}

// ---------------------------------------------------------------------------
// Utility: SHA-256 hex hash (for customer identifier generation)
// ---------------------------------------------------------------------------

export async function sha256Hex(input: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// ---------------------------------------------------------------------------
// SaltEdge Client (preserved da legacy con tipo SaltEdgeConnection esteso)
// ---------------------------------------------------------------------------

export class SaltEdgeClient {
  private readonly appId: string
  private readonly secret: string
  private readonly apiUrl: string

  constructor() {
    this.appId = Deno.env.get('SALTEDGE_APP_ID') ?? ''
    this.secret = Deno.env.get('SALTEDGE_SECRET') ?? ''
    this.apiUrl = Deno.env.get('SALTEDGE_API_URL') ?? 'https://www.saltedge.com/api/v6'

    if (!this.appId || !this.secret) {
      throw new Error('SaltEdge credentials not configured (SALTEDGE_APP_ID, SALTEDGE_SECRET required)')
    }
  }

  async request<T>(method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, body?: object): Promise<T> {
    const url = `${this.apiUrl}${path}`
    const bodyStr = body ? JSON.stringify(body) : undefined

    const headers: Record<string, string> = {
      'App-id': this.appId,
      'Secret': this.secret,
      'Content-Type': 'application/json',
    }

    const fetchOptions: RequestInit = { method, headers }
    if (bodyStr) {
      fetchOptions.body = bodyStr
    }

    const response = await fetch(url, fetchOptions)
    const responseData = await response.json()

    if (response.status >= 400) {
      const errorData = responseData?.error
      const errorMessage = errorData?.message || responseData?.error_message || response.statusText
      const errorClass = errorData?.class || responseData?.error_class || 'UnknownError'
      throw new Error(`SaltEdge API error (${errorClass}): ${errorMessage}`)
    }

    return responseData as T
  }

  async createCustomer(identifier: string): Promise<SaltEdgeCustomer> {
    try {
      const response = await this.request<{ data: SaltEdgeCustomer }>('POST', '/customers', {
        data: { identifier },
      })
      const customerId = response.data.customer_id || response.data.id
      return { ...response.data, id: customerId }
    } catch (error) {
      if (error instanceof Error && error.message?.includes('DuplicatedCustomer')) {
        const existing = await this.getCustomerByIdentifier(identifier)
        if (existing) return existing
      }
      throw error
    }
  }

  async getCustomerByIdentifier(identifier: string): Promise<SaltEdgeCustomer | null> {
    try {
      const response = await this.request<{ data: SaltEdgeCustomer }>(
        'GET',
        `/customers/${encodeURIComponent(identifier)}`,
      )
      if (response.data) {
        const customerId = response.data.customer_id || response.data.id
        return { ...response.data, id: customerId }
      }
      return null
    } catch {
      return null
    }
  }

  async createConnectSession(
    customerId: string,
    options?: ConnectSessionOptions,
  ): Promise<{ connectUrl: string; expiresAt: Date }> {
    const fromDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const response = await this.request<{ data: { connect_url: string; expires_at: string } }>(
      'POST',
      '/connections/connect',
      {
        data: {
          customer_id: customerId,
          consent: { scopes: ['accounts', 'transactions'], from_date: fromDate },
          attempt: { return_to: options?.returnTo || '', fetch_scopes: ['accounts', 'transactions'] },
          ...(options?.providerCode && { provider_code: options.providerCode }),
          ...(options?.countryCode && { country_code: options.countryCode }),
        },
      },
    )

    return { connectUrl: response.data.connect_url, expiresAt: new Date(response.data.expires_at) }
  }

  async getConnection(connectionId: string): Promise<SaltEdgeConnection> {
    const response = await this.request<{ data: SaltEdgeConnection }>('GET', `/connections/${connectionId}`)
    return response.data
  }

  async refreshConnection(connectionId: string): Promise<void> {
    await this.request('POST', `/connections/${connectionId}/refresh`)
  }

  async revokeConnection(connectionId: string): Promise<void> {
    await this.request('DELETE', `/connections/${connectionId}`)
  }

  async listConnectionsForCustomer(customerId: string): Promise<SaltEdgeConnection[]> {
    const response = await this.request<{ data: SaltEdgeConnection[] }>(
      'GET',
      `/connections?customer_id=${customerId}`,
    )
    return response.data || []
  }

  async findLatestActiveConnection(customerId: string): Promise<SaltEdgeConnection | null> {
    const connections = await this.listConnectionsForCustomer(customerId)
    const sorted = connections.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    const recent = sorted.find((c) => new Date(c.created_at) > fiveMinutesAgo)
    if (recent) return recent
    const active = sorted.find((c) => c.status === 'active')
    if (active) return active
    return null
  }

  async getAccounts(connectionId: string): Promise<SaltEdgeAccount[]> {
    const response = await this.request<{ data: SaltEdgeAccount[] }>(
      'GET',
      `/accounts?connection_id=${connectionId}`,
    )
    return response.data || []
  }

  async getTransactions(
    connectionId: string,
    accountId: string,
    fromDate: string,
  ): Promise<SaltEdgeTransaction[]> {
    const allTransactions: SaltEdgeTransaction[] = []
    let nextId: string | undefined

    do {
      const params = new URLSearchParams({
        connection_id: connectionId,
        account_id: accountId,
        from_date: fromDate,
      })
      if (nextId) params.append('from_id', nextId)

      const response = await this.request<{
        data: SaltEdgeTransaction[]
        meta: { next_id?: string }
      }>('GET', `/transactions?${params}`)

      const transactions = response.data || []
      allTransactions.push(...transactions)
      nextId = response.meta?.next_id
    } while (nextId)

    return allTransactions
  }
}
