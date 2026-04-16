/**
 * Scheduled Transactions Client — Supabase
 *
 * Direct Supabase queries replacing BFF fetch calls.
 * RLS policies handle family/user isolation automatically.
 *
 * @module services/scheduled.client
 */

import { createClient } from '@/utils/supabase/client'
import type { Database, Json } from '@/utils/supabase/database.types'

type ScheduledRow = Database['public']['Tables']['scheduled_transactions']['Row']
type ScheduledInsert = Database['public']['Tables']['scheduled_transactions']['Insert']
type RecurrenceRow = Database['public']['Tables']['recurrence_rules']['Row']

// =============================================================================
// Type Definitions (preserved for component compatibility)
// =============================================================================

export type TransactionType = 'DEBIT' | 'CREDIT';
export type FlowType =
  | 'EXPENSE'
  | 'INCOME'
  | 'TRANSFER'
  | 'LIABILITY_PAYMENT'
  | 'REFUND'
  | 'ADJUSTMENT';
export type ScheduledTransactionStatus =
  | 'ACTIVE'
  | 'PAUSED'
  | 'COMPLETED'
  | 'CANCELLED';
export type RecurrenceFrequency =
  | 'DAILY'
  | 'WEEKLY'
  | 'BIWEEKLY'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'YEARLY';

export interface RecurrenceRule {
  id: string;
  frequency: RecurrenceFrequency;
  interval: number;
  dayOfWeek?: number;
  dayOfMonth?: number;
  endDate?: string;
  endCount?: number;
  occurrenceCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduledTransaction {
  id: string;
  familyId: string;
  accountId: string;
  status: ScheduledTransactionStatus;
  amount: number;
  type: TransactionType;
  flowType?: FlowType;
  currency: string;
  description: string;
  merchantName?: string;
  categoryId?: string;
  nextDueDate: string;
  lastExecutedAt?: string;
  autoCreate: boolean;
  reminderDaysBefore: number;
  metadata?: Record<string, unknown>;
  recurrenceRule?: RecurrenceRule;
  createdAt: string;
  updatedAt: string;
  isOverdue: boolean;
  daysUntilDue: number;
  recurrenceDescription?: string;
}

export interface UpcomingScheduled {
  scheduledTransactionId: string;
  dueDate: string;
  description: string;
  amount: number;
  currency: string;
  type: TransactionType;
  flowType?: FlowType;
  merchantName?: string;
  categoryId?: string;
  accountId: string;
  daysUntilDue: number;
  isOverdue: boolean;
}

export interface CalendarEvent {
  id: string;
  scheduledTransactionId: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
  type: TransactionType;
  flowType?: FlowType;
  category?: {
    id: string;
    name: string;
    icon?: string;
    color?: string;
  };
  account?: {
    id: string;
    name: string;
  };
  isOverdue: boolean;
  status: ScheduledTransactionStatus;
}

export interface CreateRecurrenceRuleRequest {
  frequency: RecurrenceFrequency;
  interval?: number;
  dayOfWeek?: number;
  dayOfMonth?: number;
  endDate?: string;
  endCount?: number;
}

export interface CreateScheduledTransactionRequest {
  accountId: string;
  amount: number;
  type: TransactionType;
  flowType?: FlowType;
  currency?: string;
  description: string;
  merchantName?: string;
  categoryId?: string;
  nextDueDate: string;
  autoCreate?: boolean;
  reminderDaysBefore?: number;
  status?: ScheduledTransactionStatus;
  recurrenceRule?: CreateRecurrenceRuleRequest;
  metadata?: Record<string, unknown>;
}

export interface UpdateScheduledTransactionRequest {
  accountId?: string;
  amount?: number;
  type?: TransactionType;
  flowType?: FlowType;
  currency?: string;
  description?: string;
  merchantName?: string;
  categoryId?: string;
  nextDueDate?: string;
  autoCreate?: boolean;
  reminderDaysBefore?: number;
  status?: ScheduledTransactionStatus;
  recurrenceRule?: CreateRecurrenceRuleRequest | null;
  metadata?: Record<string, unknown>;
}

export interface ScheduledFilterOptions {
  status?: ScheduledTransactionStatus;
  type?: TransactionType;
  flowType?: FlowType;
  accountId?: string;
  categoryId?: string;
  skip?: number;
  take?: number;
}

export interface PaginatedScheduledResponse {
  data: ScheduledTransaction[];
  total: number;
  hasMore: boolean;
  skip: number;
  take: number;
}

export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
}

// =============================================================================
// Error Classes
// =============================================================================

export class ScheduledApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorType?: string
  ) {
    super(message);
    this.name = 'ScheduledApiError';
    Object.setPrototypeOf(this, ScheduledApiError.prototype);
  }
}

export class AuthenticationError extends ScheduledApiError {
  constructor(message: string = 'Authentication required. Please log in.') {
    super(message, 401, 'AuthenticationError');
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

export class ValidationError extends ScheduledApiError {
  constructor(message: string = 'Invalid request data.') {
    super(message, 400, 'ValidationError');
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class NotFoundError extends ScheduledApiError {
  constructor(message: string = 'Scheduled transaction not found.') {
    super(message, 404, 'NotFoundError');
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

// =============================================================================
// Row → Client Type Mappers
// =============================================================================

function rowToRecurrenceRule(row: RecurrenceRow): RecurrenceRule {
  return {
    id: row.id,
    frequency: row.frequency as RecurrenceFrequency,
    interval: row.repeat_interval,
    dayOfWeek: row.day_of_week ?? undefined,
    dayOfMonth: row.day_of_month ?? undefined,
    endDate: row.end_date ?? undefined,
    endCount: row.end_count ?? undefined,
    occurrenceCount: row.occurrence_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function describeRecurrence(rule: RecurrenceRule): string {
  const intervalStr = rule.interval > 1 ? `every ${rule.interval} ` : 'every ';
  const freqMap: Record<RecurrenceFrequency, string> = {
    DAILY: 'day',
    WEEKLY: 'week',
    BIWEEKLY: '2 weeks',
    MONTHLY: 'month',
    QUARTERLY: 'quarter',
    YEARLY: 'year',
  };
  const freq = rule.interval > 1
    ? freqMap[rule.frequency] + 's'
    : freqMap[rule.frequency];
  return `${intervalStr}${freq}`;
}

type ScheduledWithRecurrence = ScheduledRow & {
  recurrence_rules: RecurrenceRow | null;
}

function rowToScheduledTransaction(row: ScheduledWithRecurrence): ScheduledTransaction {
  const now = new Date();
  const dueDate = new Date(row.next_due_date);
  const diffMs = dueDate.getTime() - now.getTime();
  const daysUntilDue = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  // recurrence_rules is one-to-one so Supabase returns a single object
  const recurrenceRow = row.recurrence_rules ?? null;
  const recurrenceRule = recurrenceRow ? rowToRecurrenceRule(recurrenceRow) : undefined;

  return {
    id: row.id,
    familyId: row.family_id,
    accountId: row.account_id,
    status: row.status as ScheduledTransactionStatus,
    amount: Number(row.amount),
    type: row.type as TransactionType,
    flowType: (row.flow_type as FlowType) ?? undefined,
    currency: row.currency,
    description: row.description,
    merchantName: row.merchant_name ?? undefined,
    categoryId: row.category_id ?? undefined,
    nextDueDate: row.next_due_date,
    lastExecutedAt: row.last_executed_at ?? undefined,
    autoCreate: row.auto_create,
    reminderDaysBefore: row.reminder_days_before,
    metadata: row.metadata as Record<string, unknown> | undefined,
    recurrenceRule,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isOverdue: daysUntilDue < 0 && row.status === 'ACTIVE',
    daysUntilDue,
    recurrenceDescription: recurrenceRule ? describeRecurrence(recurrenceRule) : undefined,
  };
}

/**
 * Look up the current user's family_id from their profile.
 */
async function getUserFamilyId(supabase: ReturnType<typeof createClient>): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new AuthenticationError();

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('family_id')
    .eq('id', user.id)
    .single();

  if (error || !profile) throw new ScheduledApiError('Could not resolve family', 500);
  return profile.family_id;
}

/**
 * Calculate the next due date based on recurrence rule.
 */
function calculateNextDueDate(currentDueDate: string, rule: RecurrenceRule): string {
  const d = new Date(currentDueDate);
  const interval = rule.interval;

  switch (rule.frequency) {
    case 'DAILY':
      d.setDate(d.getDate() + interval);
      break;
    case 'WEEKLY':
      d.setDate(d.getDate() + 7 * interval);
      break;
    case 'BIWEEKLY':
      d.setDate(d.getDate() + 14 * interval);
      break;
    case 'MONTHLY':
      d.setMonth(d.getMonth() + interval);
      break;
    case 'QUARTERLY':
      d.setMonth(d.getMonth() + 3 * interval);
      break;
    case 'YEARLY':
      d.setFullYear(d.getFullYear() + interval);
      break;
  }

  return d.toISOString().split('T')[0];
}

// =============================================================================
// Scheduled Transactions Client
// =============================================================================

export const scheduledClient = {
  async getScheduledTransactions(
    options?: ScheduledFilterOptions
  ): Promise<ScheduledTransaction[] | PaginatedScheduledResponse> {
    const supabase = createClient();
    let query = supabase
      .from('scheduled_transactions')
      .select('*, recurrence_rules(*)', { count: 'exact' })
      .order('next_due_date', { ascending: true });

    if (options?.status) query = query.eq('status', options.status);
    if (options?.type) query = query.eq('type', options.type);
    if (options?.flowType && options.flowType !== 'ADJUSTMENT') query = query.eq('flow_type', options.flowType as Database['public']['Enums']['flow_type']);
    if (options?.accountId) query = query.eq('account_id', options.accountId);
    if (options?.categoryId) query = query.eq('category_id', options.categoryId);

    const usePagination = options?.skip !== undefined || options?.take !== undefined;
    const skip = options?.skip ?? 0;
    const take = options?.take ?? 50;

    if (usePagination) {
      query = query.range(skip, skip + take - 1);
    }

    const { data, error, count } = await query;

    if (error) throw new ScheduledApiError(error.message, 500);

    const transactions = (data ?? []).map((row) =>
      rowToScheduledTransaction(row as ScheduledWithRecurrence)
    );

    if (usePagination) {
      const total = count ?? 0;
      return {
        data: transactions,
        total,
        hasMore: skip + take < total,
        skip,
        take,
      };
    }

    return transactions;
  },

  async getScheduledTransaction(id: string): Promise<ScheduledTransaction> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('scheduled_transactions')
      .select('*, recurrence_rules(*)')
      .eq('id', id)
      .single();

    if (error) throw new NotFoundError();
    return rowToScheduledTransaction(data as ScheduledWithRecurrence);
  },

  async getUpcoming(days: number = 30): Promise<UpcomingScheduled[]> {
    const supabase = createClient();
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() + days);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('scheduled_transactions')
      .select('*')
      .eq('status', 'ACTIVE')
      .lte('next_due_date', cutoffStr)
      .order('next_due_date', { ascending: true });

    if (error) throw new ScheduledApiError(error.message, 500);

    return (data ?? []).map((row) => {
      const dueDate = new Date(row.next_due_date);
      const diffMs = dueDate.getTime() - now.getTime();
      const daysUntilDue = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      return {
        scheduledTransactionId: row.id,
        dueDate: row.next_due_date,
        description: row.description,
        amount: Number(row.amount),
        currency: row.currency,
        type: row.type as TransactionType,
        flowType: (row.flow_type as FlowType) ?? undefined,
        merchantName: row.merchant_name ?? undefined,
        categoryId: row.category_id ?? undefined,
        accountId: row.account_id,
        daysUntilDue,
        isOverdue: daysUntilDue < 0,
      };
    });
  },

  async getCalendarEvents(
    startDate: Date,
    endDate: Date
  ): Promise<CalendarEvent[]> {
    const supabase = createClient();
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('scheduled_transactions')
      .select('*, categories(id, name, icon, color), accounts(id, name)')
      .gte('next_due_date', startStr)
      .lte('next_due_date', endStr)
      .order('next_due_date', { ascending: true });

    if (error) throw new ScheduledApiError(error.message, 500);

    const now = new Date();

    return (data ?? []).map((row) => {
      const dueDate = new Date(row.next_due_date);
      const category = row.categories as { id: string; name: string; icon: string | null; color: string | null } | null;
      const account = row.accounts as { id: string; name: string } | null;

      return {
        id: `${row.id}-${row.next_due_date}`,
        scheduledTransactionId: row.id,
        date: row.next_due_date,
        description: row.description,
        amount: Number(row.amount),
        currency: row.currency,
        type: row.type as TransactionType,
        flowType: (row.flow_type as FlowType) ?? undefined,
        category: category ? {
          id: category.id,
          name: category.name,
          icon: category.icon ?? undefined,
          color: category.color ?? undefined,
        } : undefined,
        account: account ? { id: account.id, name: account.name } : undefined,
        isOverdue: dueDate < now && row.status === 'ACTIVE',
        status: row.status as ScheduledTransactionStatus,
      };
    });
  },

  async createScheduledTransaction(
    data: CreateScheduledTransactionRequest
  ): Promise<ScheduledTransaction> {
    const supabase = createClient();
    const familyId = await getUserFamilyId(supabase);

    const insert: ScheduledInsert = {
      account_id: data.accountId,
      amount: data.amount,
      type: data.type as Database['public']['Enums']['transaction_type'],
      flow_type: (data.flowType && data.flowType !== 'ADJUSTMENT')
        ? data.flowType as Database['public']['Enums']['flow_type']
        : null,
      currency: data.currency ?? 'EUR',
      description: data.description,
      merchant_name: data.merchantName ?? null,
      category_id: data.categoryId ?? null,
      next_due_date: data.nextDueDate,
      auto_create: data.autoCreate ?? false,
      reminder_days_before: data.reminderDaysBefore ?? 3,
      status: (data.status ?? 'ACTIVE') as Database['public']['Enums']['scheduled_transaction_status'],
      metadata: (data.metadata ?? null) as Json,
      family_id: familyId,
    };

    // Type-safe insert with explicit casting to avoid Next.js build type inference issues
    const { data: created, error } = await (supabase
      .from('scheduled_transactions')
      .insert as any)(insert)
      .select('*, recurrence_rules(*)')
      .single();

    if (error) throw new ValidationError(error.message);

    // Create recurrence rule if provided
    if (data.recurrenceRule) {
      const { error: rrError } = await supabase
        .from('recurrence_rules')
        .insert({
          scheduled_transaction_id: created.id,
          frequency: data.recurrenceRule.frequency as Database['public']['Enums']['recurrence_frequency'],
          repeat_interval: data.recurrenceRule.interval ?? 1,
          day_of_week: data.recurrenceRule.dayOfWeek ?? null,
          day_of_month: data.recurrenceRule.dayOfMonth ?? null,
          end_date: data.recurrenceRule.endDate ?? null,
          end_count: data.recurrenceRule.endCount ?? null,
        });

      if (rrError) throw new ValidationError(rrError.message);

      // Re-fetch with the recurrence rule included
      const { data: refetched, error: refetchError } = await supabase
        .from('scheduled_transactions')
        .select('*, recurrence_rules(*)')
        .eq('id', created.id)
        .single();

      if (refetchError) throw new ScheduledApiError(refetchError.message, 500);
      return rowToScheduledTransaction(refetched as ScheduledWithRecurrence);
    }

    return rowToScheduledTransaction(created as ScheduledWithRecurrence);
  },

  async updateScheduledTransaction(
    id: string,
    data: UpdateScheduledTransactionRequest
  ): Promise<ScheduledTransaction> {
    const supabase = createClient();
    const update: Database['public']['Tables']['scheduled_transactions']['Update'] = {};

    if (data.accountId !== undefined) update.account_id = data.accountId;
    if (data.amount !== undefined) update.amount = data.amount;
    if (data.type !== undefined) update.type = data.type as Database['public']['Enums']['transaction_type'];
    if (data.flowType !== undefined) update.flow_type = (data.flowType === 'ADJUSTMENT' ? null : data.flowType) as Database['public']['Enums']['flow_type'] | null;
    if (data.currency !== undefined) update.currency = data.currency;
    if (data.description !== undefined) update.description = data.description;
    if (data.merchantName !== undefined) update.merchant_name = data.merchantName;
    if (data.categoryId !== undefined) update.category_id = data.categoryId;
    if (data.nextDueDate !== undefined) update.next_due_date = data.nextDueDate;
    if (data.autoCreate !== undefined) update.auto_create = data.autoCreate;
    if (data.reminderDaysBefore !== undefined) update.reminder_days_before = data.reminderDaysBefore;
    if (data.status !== undefined) update.status = data.status as Database['public']['Enums']['scheduled_transaction_status'];
    if (data.metadata !== undefined) update.metadata = (data.metadata ?? null) as Json;

    const { data: updated, error } = await supabase
      .from('scheduled_transactions')
      .update(update)
      .eq('id', id)
      .select('*, recurrence_rules(*)')
      .single();

    if (error) throw new ScheduledApiError(error.message, 400);

    // Handle recurrence rule update
    if (data.recurrenceRule !== undefined) {
      if (data.recurrenceRule === null) {
        // Delete existing recurrence rule
        await supabase
          .from('recurrence_rules')
          .delete()
          .eq('scheduled_transaction_id', id);
      } else {
        // Upsert recurrence rule
        const { data: existingRule } = await supabase
          .from('recurrence_rules')
          .select('id')
          .eq('scheduled_transaction_id', id)
          .single();

        if (existingRule) {
          await supabase
            .from('recurrence_rules')
            .update({
              frequency: data.recurrenceRule.frequency as Database['public']['Enums']['recurrence_frequency'],
              repeat_interval: data.recurrenceRule.interval ?? 1,
              day_of_week: data.recurrenceRule.dayOfWeek ?? null,
              day_of_month: data.recurrenceRule.dayOfMonth ?? null,
              end_date: data.recurrenceRule.endDate ?? null,
              end_count: data.recurrenceRule.endCount ?? null,
            })
            .eq('id', existingRule.id);
        } else {
          await supabase
            .from('recurrence_rules')
            .insert({
              scheduled_transaction_id: id,
              frequency: data.recurrenceRule.frequency as Database['public']['Enums']['recurrence_frequency'],
              repeat_interval: data.recurrenceRule.interval ?? 1,
              day_of_week: data.recurrenceRule.dayOfWeek ?? null,
              day_of_month: data.recurrenceRule.dayOfMonth ?? null,
              end_date: data.recurrenceRule.endDate ?? null,
              end_count: data.recurrenceRule.endCount ?? null,
            });
        }

        // Re-fetch to get updated recurrence rule
        const { data: refetched, error: refetchError } = await supabase
          .from('scheduled_transactions')
          .select('*, recurrence_rules(*)')
          .eq('id', id)
          .single();

        if (!refetchError && refetched) {
          return rowToScheduledTransaction(refetched as ScheduledWithRecurrence);
        }
      }
    }

    return rowToScheduledTransaction(updated as ScheduledWithRecurrence);
  },

  async deleteScheduledTransaction(id: string): Promise<void> {
    const supabase = createClient();

    // Delete recurrence rule first (FK constraint)
    await supabase
      .from('recurrence_rules')
      .delete()
      .eq('scheduled_transaction_id', id);

    const { error } = await supabase
      .from('scheduled_transactions')
      .delete()
      .eq('id', id);

    if (error) throw new ScheduledApiError(error.message, 400);
  },

  async skipNextOccurrence(id: string): Promise<ScheduledTransaction> {
    const supabase = createClient();

    // Fetch the current transaction with its recurrence rule
    const current = await scheduledClient.getScheduledTransaction(id);

    if (!current.recurrenceRule) {
      throw new ValidationError('Cannot skip a non-recurring transaction');
    }

    const nextDueDate = calculateNextDueDate(
      current.nextDueDate,
      current.recurrenceRule
    );

    // Update occurrence count on the recurrence rule
    await supabase
      .from('recurrence_rules')
      .update({ occurrence_count: current.recurrenceRule.occurrenceCount + 1 })
      .eq('id', current.recurrenceRule.id);

    // Update the next due date
    const { data: updated, error } = await supabase
      .from('scheduled_transactions')
      .update({ next_due_date: nextDueDate })
      .eq('id', id)
      .select('*, recurrence_rules(*)')
      .single();

    if (error) throw new ScheduledApiError(error.message, 400);
    return rowToScheduledTransaction(updated as ScheduledWithRecurrence);
  },

  async markCompleted(
    id: string,
    transactionId?: string
  ): Promise<ScheduledTransaction> {
    const supabase = createClient();
    const current = await scheduledClient.getScheduledTransaction(id);

    const update: Database['public']['Tables']['scheduled_transactions']['Update'] = {
      last_executed_at: new Date().toISOString(),
    };

    // If recurring, advance to next due date; otherwise mark as completed
    if (current.recurrenceRule) {
      const nextDueDate = calculateNextDueDate(
        current.nextDueDate,
        current.recurrenceRule
      );

      // Check if we've exceeded end conditions
      const rule = current.recurrenceRule;
      const newCount = rule.occurrenceCount + 1;
      const exceededCount = rule.endCount != null && newCount >= rule.endCount;
      const exceededDate = rule.endDate != null && nextDueDate > rule.endDate;

      if (exceededCount || exceededDate) {
        update.status = 'COMPLETED';
      } else {
        update.next_due_date = nextDueDate;
      }

      // Update occurrence count
      await supabase
        .from('recurrence_rules')
        .update({ occurrence_count: newCount })
        .eq('id', rule.id);
    } else {
      update.status = 'COMPLETED';
    }

    // Store transaction link in metadata if provided
    if (transactionId) {
      const currentMeta = (current.metadata ?? {}) as Record<string, Json | undefined>;
      update.metadata = {
        ...currentMeta,
        lastTransactionId: transactionId,
      } as Json;
    }

    const { data: updated, error } = await supabase
      .from('scheduled_transactions')
      .update(update)
      .eq('id', id)
      .select('*, recurrence_rules(*)')
      .single();

    if (error) throw new ScheduledApiError(error.message, 400);
    return rowToScheduledTransaction(updated as ScheduledWithRecurrence);
  },

  async generateFromLiabilities(): Promise<ScheduledTransaction[]> {
    const supabase = createClient();
    const familyId = await getUserFamilyId(supabase);

    // Get active liabilities with payment info
    const { data: liabilities, error: lError } = await supabase
      .from('liabilities')
      .select('*')
      .eq('status', 'ACTIVE')
      .not('minimum_payment', 'is', null);

    if (lError) throw new ScheduledApiError(lError.message, 500);
    if (!liabilities || liabilities.length === 0) return [];

    // Get existing scheduled transactions to avoid duplicates
    const { data: existing } = await supabase
      .from('scheduled_transactions')
      .select('metadata')
      .eq('family_id', familyId)
      .eq('status', 'ACTIVE');

    const existingLiabilityIds = new Set(
      (existing ?? [])
        .map((s) => (s.metadata as Record<string, unknown>)?.liabilityId)
        .filter(Boolean)
    );

    const newLiabilities = liabilities.filter(
      (l) => !existingLiabilityIds.has(l.id)
    );

    if (newLiabilities.length === 0) return [];

    // We need an account_id. Find the first active account for the family
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id')
      .eq('family_id', familyId)
      .eq('status', 'ACTIVE')
      .limit(1);

    const defaultAccountId = accounts?.[0]?.id;
    if (!defaultAccountId) {
      throw new ValidationError('No active account found to link scheduled payments');
    }

    const inserts: ScheduledInsert[] = newLiabilities.map((l) => {
      // Calculate next due date from payment_due_day
      const now = new Date();
      let nextDue = new Date(now.getFullYear(), now.getMonth(), l.payment_due_day ?? 1);
      if (nextDue <= now) {
        nextDue.setMonth(nextDue.getMonth() + 1);
      }

      return {
        account_id: defaultAccountId,
        amount: Number(l.minimum_payment),
        type: 'DEBIT' as const,
        flow_type: 'LIABILITY_PAYMENT' as const,
        currency: l.currency,
        description: `${l.name} payment`,
        next_due_date: nextDue.toISOString().split('T')[0],
        family_id: familyId,
        metadata: { liabilityId: l.id, autoGenerated: true } as Json,
      };
    });

    const { data: created, error: cError } = await supabase
      .from('scheduled_transactions')
      .insert(inserts)
      .select('*, recurrence_rules(*)');

    if (cError) throw new ScheduledApiError(cError.message, 500);

    // Create monthly recurrence rules for each
    if (created && created.length > 0) {
      const rrInserts = created.map((st) => ({
        scheduled_transaction_id: st.id,
        frequency: 'MONTHLY' as const,
        repeat_interval: 1,
      }));

      await supabase.from('recurrence_rules').insert(rrInserts);

      // Re-fetch to include recurrence rules
      const ids = created.map((st) => st.id);
      const { data: refetched } = await supabase
        .from('scheduled_transactions')
        .select('*, recurrence_rules(*)')
        .in('id', ids);

      return (refetched ?? []).map((row) =>
        rowToScheduledTransaction(row as ScheduledWithRecurrence)
      );
    }

    return (created ?? []).map((row) =>
      rowToScheduledTransaction(row as ScheduledWithRecurrence)
    );
  },
};

export default scheduledClient;
