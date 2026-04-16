/**
 * Accounts Client — Supabase
 *
 * Direct Supabase queries replacing BFF fetch calls.
 * RLS policies handle family/user isolation automatically.
 *
 * @module services/accounts.client
 */

import { createClient } from '@/utils/supabase/client'
import type { Database } from '@/utils/supabase/database.types'
import {
  AccountType,
  AccountStatus,
  AccountSource,
  type FinancialSummary,
  type DeletionEligibilityResponse,
  type RestoreEligibilityResponse,
} from '../types/account.types'

type AccountRow = Database['public']['Tables']['accounts']['Row']
type AccountInsert = Database['public']['Tables']['accounts']['Insert']

// =============================================================================
// Type Definitions (preserved for component compatibility)
// =============================================================================

export interface AccountSettings {
  autoSync?: boolean
  syncFrequency?: 'daily' | 'hourly' | 'manual'
  notifications?: boolean
  budgetIncluded?: boolean
  icon?: string
  color?: string
}

export interface Account {
  id: string
  userId: string | null
  familyId: string | null
  name: string
  type: AccountType
  status: AccountStatus
  source: AccountSource
  currentBalance: number
  availableBalance?: number | null
  creditLimit?: number | null
  currency: string
  institutionName?: string | null
  isActive: boolean
  syncEnabled: boolean
  lastSyncAt?: string | null
  syncError?: string | null
  settings?: AccountSettings | null
  saltEdgeConnectionId?: string | null
  maskedAccountNumber?: string | null
  displayName: string
  isManualAccount: boolean
  isSyncable: boolean
  needsSync: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateAccountRequest {
  name: string
  type: AccountType
  source: AccountSource
  currentBalance: number
  currency?: string
  institutionName?: string
  accountNumber?: string
  creditLimit?: number
  userId?: string
  familyId?: string
}

export interface UpdateAccountRequest {
  name?: string
  status?: AccountStatus
  currentBalance?: number
  availableBalance?: number
  creditLimit?: number
  institutionName?: string
  syncEnabled?: boolean
  settings?: { icon?: string; color?: string }
}

// =============================================================================
// Error Classes
// =============================================================================

export class AccountsApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorType?: string
  ) {
    super(message)
    this.name = 'AccountsApiError'
  }
}

export class AuthenticationError extends AccountsApiError {
  constructor(message = 'Authentication required. Please log in.') {
    super(message, 401, 'AuthenticationError')
    this.name = 'AuthenticationError'
  }
}

export class ValidationError extends AccountsApiError {
  constructor(message = 'Invalid request data.') {
    super(message, 400, 'ValidationError')
    this.name = 'ValidationError'
  }
}

export class NotFoundError extends AccountsApiError {
  constructor(message = 'Account not found.') {
    super(message, 404, 'NotFoundError')
    this.name = 'NotFoundError'
  }
}

export class LinkedTransfersError extends AccountsApiError {
  constructor(message = 'Cannot delete account with linked transfers.', public linkedTransferCount = 0) {
    super(message, 400, 'LINKED_TRANSFERS_EXIST')
    this.name = 'LinkedTransfersError'
  }
}

export class RelinkRequiredError extends AccountsApiError {
  constructor(
    message = 'Banking connection is revoked. Re-linking required.',
    public siblingAccountCount = 0,
    public providerName?: string,
    public suggestion?: string
  ) {
    super(message, 409, 'RELINK_REQUIRED')
    this.name = 'RelinkRequiredError'
  }
}

// =============================================================================
// Row → Client Type Mapper
// =============================================================================

function maskAccountNumber(num: string | null): string | null {
  if (!num || num.length < 4) return num
  return '••••' + num.slice(-4)
}

function rowToAccount(row: AccountRow): Account {
  const source = row.source as AccountSource
  const status = row.status as AccountStatus
  const isManual = source === 'MANUAL'

  return {
    id: row.id,
    userId: row.user_id,
    familyId: row.family_id,
    name: row.name,
    type: row.type as AccountType,
    status,
    source,
    currentBalance: Number(row.current_balance),
    availableBalance: row.available_balance != null ? Number(row.available_balance) : null,
    creditLimit: row.credit_limit != null ? Number(row.credit_limit) : null,
    currency: row.currency,
    institutionName: row.institution_name,
    isActive: status === 'ACTIVE',
    syncEnabled: row.sync_enabled,
    lastSyncAt: row.last_sync_at,
    syncError: row.sync_error,
    settings: row.settings as AccountSettings | null,
    saltEdgeConnectionId: row.saltedge_connection_id,
    maskedAccountNumber: maskAccountNumber(row.account_number),
    displayName: row.institution_name ? `${row.name} (${row.institution_name})` : row.name,
    isManualAccount: isManual,
    isSyncable: !isManual && status === 'ACTIVE' && row.sync_enabled,
    needsSync: !isManual && status === 'ACTIVE' && row.sync_enabled && !row.last_sync_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// =============================================================================
// Accounts Client
// =============================================================================

export const accountsClient = {
  async getAccounts(includeHidden = true): Promise<Account[]> {
    const supabase = createClient()
    let query = supabase.from('accounts').select('*').order('created_at', { ascending: false })

    if (!includeHidden) {
      query = query.neq('status', 'HIDDEN')
    }

    const { data, error } = await query
    if (error) throw new AccountsApiError(error.message, 500)
    return (data ?? []).map(rowToAccount)
  },

  async getAccount(accountId: string): Promise<Account> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', accountId)
      .single()

    if (error) throw new NotFoundError()
    return rowToAccount(data)
  },

  async createAccount(input: CreateAccountRequest): Promise<Account> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new AccountsApiError('Not authenticated', 401)

    const insert: AccountInsert = {
      name: input.name,
      type: input.type,
      source: input.source,
      current_balance: input.currentBalance,
      currency: input.currency ?? 'EUR',
      institution_name: input.institutionName,
      credit_limit: input.creditLimit,
      user_id: input.familyId ? null : user.id,
      family_id: input.familyId ?? null,
    }

    // XOR: if no familyId provided, set user_id (personal account)
    if (!insert.family_id) {
      insert.user_id = user.id
    }

    // Type-safe insert with explicit casting to avoid Next.js build type inference issues
    const { data, error } = await (supabase
      .from('accounts')
      .insert as any)(insert)
      .select()
      .single()

    if (error) throw new AccountsApiError(error.message, 400)
    return rowToAccount(data)
  },

  async updateAccount(accountId: string, input: UpdateAccountRequest): Promise<Account> {
    const supabase = createClient()
    const update: Database['public']['Tables']['accounts']['Update'] = {}

    if (input.name !== undefined) update.name = input.name
    if (input.status !== undefined) update.status = input.status as Database['public']['Enums']['account_status']
    if (input.currentBalance !== undefined) update.current_balance = input.currentBalance
    if (input.availableBalance !== undefined) update.available_balance = input.availableBalance
    if (input.creditLimit !== undefined) update.credit_limit = input.creditLimit
    if (input.institutionName !== undefined) update.institution_name = input.institutionName
    if (input.syncEnabled !== undefined) update.sync_enabled = input.syncEnabled
    if (input.settings !== undefined) update.settings = input.settings

    // Type-safe update with explicit casting to avoid Next.js build type inference issues
    const { data, error } = await (supabase
      .from('accounts')
      .update as any)(update)
      .eq('id', accountId)
      .select()
      .single()

    if (error) throw new AccountsApiError(error.message, 400)
    return rowToAccount(data)
  },

  async deleteAccount(accountId: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', accountId)

    if (error) throw new AccountsApiError(error.message, 400)
  },

  async hideAccount(accountId: string): Promise<Account> {
    return accountsClient.updateAccount(accountId, { status: AccountStatus.HIDDEN })
  },

  async restoreAccount(accountId: string): Promise<Account> {
    return accountsClient.updateAccount(accountId, { status: AccountStatus.ACTIVE })
  },

  async getAccountBalance(accountId: string): Promise<{ currentBalance: number; availableBalance?: number }> {
    const account = await accountsClient.getAccount(accountId)
    return {
      currentBalance: account.currentBalance,
      availableBalance: account.availableBalance ?? undefined,
    }
  },

  async getFinancialSummary(): Promise<FinancialSummary> {
    const supabase = createClient()
    const { data, error } = await supabase.rpc('get_balance_summary')
    if (error) throw new AccountsApiError(error.message, 500)

    const liabilityTypes = ['CREDIT_CARD', 'LOAN', 'MORTGAGE']
    let totalAssets = 0
    let totalLiabilities = 0
    let totalAvailableCredit = 0

    const accounts: FinancialSummary['accounts'] = (data ?? []).map((a) => {
      const balance = Number(a.current_balance)
      const isLiability = liabilityTypes.includes(a.account_type)

      if (isLiability) {
        totalLiabilities += Math.abs(balance)
      } else {
        totalAssets += balance
      }

      return {
        accountId: a.account_id,
        accountName: a.account_name,
        accountType: a.account_type as AccountType,
        accountNature: isLiability ? 'LIABILITY' : 'ASSET',
        currentBalance: balance,
        displayAmount: Math.abs(balance),
        displayLabel: isLiability ? (balance === 0 ? 'Paid Off' : 'Owed') : (balance >= 0 ? 'Available' : 'Overdrawn'),
        affectsNetWorth: isLiability ? 'negative' : 'positive',
        currency: a.currency,
      } as FinancialSummary['accounts'][number]
    })

    return {
      totalAssets,
      totalLiabilities,
      netWorth: totalAssets - totalLiabilities,
      totalAvailableCredit,
      accounts,
      currency: 'EUR',
      calculatedAt: new Date().toISOString(),
    }
  },

  async checkDeletionEligibility(accountId: string): Promise<DeletionEligibilityResponse> {
    const supabase = createClient()
    const account = await accountsClient.getAccount(accountId)
    const { count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('account_id', accountId)
      .not('transfer_group_id', 'is', null)

    const linkedTransferCount = count ?? 0

    return {
      canDelete: linkedTransferCount === 0,
      canHide: true,
      currentStatus: account.status as AccountStatus,
      blockReason: linkedTransferCount > 0 ? `Account has ${linkedTransferCount} linked transfers` : undefined,
      blockers: [],
      linkedTransferCount,
    }
  },

  async checkRestoreEligibility(accountId: string): Promise<RestoreEligibilityResponse> {
    const account = await accountsClient.getAccount(accountId)
    return {
      canRestore: account.status === 'HIDDEN',
      requiresRelink: !account.isManualAccount && !account.saltEdgeConnectionId,
      currentStatus: account.status as AccountStatus,
      source: account.source as AccountSource,
      isBankingAccount: !account.isManualAccount,
    } as RestoreEligibilityResponse
  },
}

export default accountsClient
