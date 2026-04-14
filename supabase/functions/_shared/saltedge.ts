/**
 * SaltEdge API v6 Client for Supabase Edge Functions
 *
 * Authentication: App-id + Secret headers on every request.
 * No RSA signing required for Service-type applications.
 *
 * Environment variables (set as Supabase secrets):
 * - SALTEDGE_APP_ID
 * - SALTEDGE_SECRET
 * - SALTEDGE_API_URL (optional, defaults to https://www.saltedge.com/api/v6)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
// SaltEdge Client
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

  // -------------------------------------------------------------------------
  // Authenticated HTTP request
  // -------------------------------------------------------------------------

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

  // -------------------------------------------------------------------------
  // Customer Management
  // -------------------------------------------------------------------------

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

  // -------------------------------------------------------------------------
  // Connect Sessions
  // -------------------------------------------------------------------------

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
          consent: {
            scopes: ['accounts', 'transactions'],
            from_date: fromDate,
          },
          attempt: {
            return_to: options?.returnTo || '',
            fetch_scopes: ['accounts', 'transactions'],
          },
          ...(options?.providerCode && { provider_code: options.providerCode }),
          ...(options?.countryCode && { country_code: options.countryCode }),
        },
      },
    )

    return {
      connectUrl: response.data.connect_url,
      expiresAt: new Date(response.data.expires_at),
    }
  }

  // -------------------------------------------------------------------------
  // Connection Management
  // -------------------------------------------------------------------------

  async getConnection(connectionId: string): Promise<SaltEdgeConnection> {
    const response = await this.request<{ data: SaltEdgeConnection }>('GET', `/connections/${connectionId}`)
    return response.data
  }

  async refreshConnection(connectionId: string): Promise<void> {
    await this.request('POST', `/connections/${connectionId}/refresh`)
  }

  async listConnectionsForCustomer(customerId: string): Promise<SaltEdgeConnection[]> {
    const response = await this.request<{ data: SaltEdgeConnection[] }>(
      'GET',
      `/connections?customer_id=${customerId}`,
    )
    return response.data || []
  }

  /**
   * Find the most recent active connection for a customer.
   * Prioritizes connections created in the last 5 minutes (may not yet be "active").
   */
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

  // -------------------------------------------------------------------------
  // Accounts
  // -------------------------------------------------------------------------

  async getAccounts(connectionId: string): Promise<SaltEdgeAccount[]> {
    const response = await this.request<{ data: SaltEdgeAccount[] }>(
      'GET',
      `/accounts?connection_id=${connectionId}`,
    )
    return response.data || []
  }

  // -------------------------------------------------------------------------
  // Transactions
  // -------------------------------------------------------------------------

  /**
   * Fetch transactions for a specific account with pagination support.
   */
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

      if (nextId) {
        params.append('from_id', nextId)
      }

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
