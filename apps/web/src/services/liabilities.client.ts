/**
 * Liabilities Client — Supabase
 *
 * Direct Supabase queries replacing BFF fetch calls.
 * RLS policies handle family/user isolation automatically.
 *
 * @module services/liabilities.client
 */

import { createClient } from '@/utils/supabase/client'
import type { Database, Json } from '@/utils/supabase/database.types'

type LiabilityRow = Database['public']['Tables']['liabilities']['Row']
type LiabilityInsert = Database['public']['Tables']['liabilities']['Insert']
type InstallmentPlanRow = Database['public']['Tables']['installment_plans']['Row']
type InstallmentRow = Database['public']['Tables']['installments']['Row']

// =============================================================================
// Type Definitions (preserved for component compatibility)
// =============================================================================

export type LiabilityType = 'CREDIT_CARD' | 'BNPL' | 'LOAN' | 'MORTGAGE' | 'OTHER';
export type LiabilityStatus = 'ACTIVE' | 'PAID_OFF' | 'CLOSED';

export interface Installment {
  id: string;
  planId: string;
  amount: number;
  dueDate: string;
  installmentNumber: number;
  isPaid: boolean;
  paidAt?: string;
  transactionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InstallmentPlan {
  id: string;
  liabilityId: string;
  totalAmount: number;
  installmentAmount: number;
  numberOfInstallments: number;
  remainingInstallments: number;
  currency: string;
  startDate: string;
  endDate: string;
  isPaidOff: boolean;
  installments: Installment[];
  createdAt: string;
  updatedAt: string;
}

export interface Liability {
  id: string;
  familyId: string;
  type: LiabilityType;
  status: LiabilityStatus;
  name: string;
  currentBalance: number;
  creditLimit?: number;
  originalAmount?: number;
  currency: string;
  interestRate?: number;
  minimumPayment?: number;
  billingCycleDay?: number;
  paymentDueDay?: number;
  statementCloseDay?: number;
  lastStatementDate?: string;
  accountId?: string;
  provider?: string;
  externalId?: string;
  purchaseDate?: string;
  metadata?: Record<string, unknown>;
  installmentPlans?: InstallmentPlan[];
  availableCredit?: number;
  utilizationPercent?: number;
  nextPaymentDate?: string;
  isBNPL: boolean;
  isCreditCard: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpcomingPayment {
  liabilityId: string;
  liabilityName: string;
  liabilityType: LiabilityType;
  dueDate: string;
  amount: number;
  currency: string;
  installmentId?: string;
  installmentNumber?: number;
  totalInstallments?: number;
  isInstallment: boolean;
  daysUntilDue: number;
  isOverdue: boolean;
}

export interface BNPLDetectionResult {
  provider: string;
  confidence: number;
  matchedPattern: string;
  suggestedName: string;
}

export interface LiabilitiesSummary {
  totalLiabilities: number;
  totalOwed: number;
  totalCreditLimit: number;
  overallUtilization: number;
  upcomingPaymentCount: number;
  upcomingPaymentTotal: number;
  byType: {
    [key in LiabilityType]?: {
      count: number;
      totalOwed: number;
    };
  };
}

export interface CreateLiabilityRequest {
  type: LiabilityType;
  name: string;
  currentBalance?: number;
  creditLimit?: number;
  originalAmount?: number;
  currency?: string;
  interestRate?: number;
  minimumPayment?: number;
  billingCycleDay?: number;
  paymentDueDay?: number;
  statementCloseDay?: number;
  accountId?: string;
  provider?: string;
  purchaseDate?: string;
  status?: LiabilityStatus;
  metadata?: Record<string, unknown>;
}

export interface UpdateLiabilityRequest {
  type?: LiabilityType;
  name?: string;
  currentBalance?: number;
  creditLimit?: number;
  originalAmount?: number;
  currency?: string;
  interestRate?: number;
  minimumPayment?: number;
  billingCycleDay?: number;
  paymentDueDay?: number;
  statementCloseDay?: number;
  accountId?: string;
  provider?: string;
  purchaseDate?: string;
  status?: LiabilityStatus;
  metadata?: Record<string, unknown>;
}

export interface CreateInstallmentPlanRequest {
  totalAmount: number;
  installmentAmount: number;
  numberOfInstallments: number;
  startDate: string;
  currency?: string;
}

export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
}

// =============================================================================
// Error Classes
// =============================================================================

export class LiabilitiesApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorType?: string
  ) {
    super(message);
    this.name = 'LiabilitiesApiError';
    Object.setPrototypeOf(this, LiabilitiesApiError.prototype);
  }
}

export class AuthenticationError extends LiabilitiesApiError {
  constructor(message: string = 'Authentication required. Please log in.') {
    super(message, 401, 'AuthenticationError');
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

export class ValidationError extends LiabilitiesApiError {
  constructor(message: string = 'Invalid request data.') {
    super(message, 400, 'ValidationError');
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class NotFoundError extends LiabilitiesApiError {
  constructor(message: string = 'Liability not found.') {
    super(message, 404, 'NotFoundError');
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

// =============================================================================
// Row → Client Type Mappers
// =============================================================================

function rowToInstallment(row: InstallmentRow): Installment {
  return {
    id: row.id,
    planId: row.plan_id,
    amount: Number(row.amount),
    dueDate: row.due_date,
    installmentNumber: row.installment_number,
    isPaid: row.is_paid,
    paidAt: row.paid_at ?? undefined,
    transactionId: row.transaction_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToInstallmentPlan(
  row: InstallmentPlanRow & { installments: InstallmentRow[] }
): InstallmentPlan {
  return {
    id: row.id,
    liabilityId: row.liability_id,
    totalAmount: Number(row.total_amount),
    installmentAmount: Number(row.installment_amount),
    numberOfInstallments: row.number_of_installments,
    remainingInstallments: row.remaining_installments,
    currency: row.currency,
    startDate: row.start_date,
    endDate: row.end_date,
    isPaidOff: row.is_paid_off,
    installments: (row.installments ?? []).map(rowToInstallment),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

type LiabilityWithPlans = LiabilityRow & {
  installment_plans: (InstallmentPlanRow & { installments: InstallmentRow[] })[];
}

function rowToLiability(row: LiabilityRow | LiabilityWithPlans): Liability {
  const type = row.type as LiabilityType;
  const currentBalance = Number(row.current_balance);
  const creditLimit = row.credit_limit != null ? Number(row.credit_limit) : undefined;
  const availableCredit = creditLimit != null ? Math.max(0, creditLimit - currentBalance) : undefined;
  const utilizationPercent = creditLimit && creditLimit > 0
    ? Math.round((currentBalance / creditLimit) * 100)
    : undefined;

  const plans = 'installment_plans' in row
    ? (row.installment_plans ?? []).map(rowToInstallmentPlan)
    : undefined;

  // Compute next payment date from installment plans
  let nextPaymentDate: string | undefined;
  if (plans) {
    const now = new Date().toISOString();
    for (const plan of plans) {
      for (const inst of plan.installments) {
        if (!inst.isPaid && inst.dueDate >= now) {
          if (!nextPaymentDate || inst.dueDate < nextPaymentDate) {
            nextPaymentDate = inst.dueDate;
          }
        }
      }
    }
  }

  return {
    id: row.id,
    familyId: row.family_id,
    type,
    status: row.status as LiabilityStatus,
    name: row.name,
    currentBalance,
    creditLimit,
    originalAmount: row.original_amount != null ? Number(row.original_amount) : undefined,
    currency: row.currency,
    interestRate: row.interest_rate != null ? Number(row.interest_rate) : undefined,
    minimumPayment: row.minimum_payment != null ? Number(row.minimum_payment) : undefined,
    billingCycleDay: row.billing_cycle_day ?? undefined,
    paymentDueDay: row.payment_due_day ?? undefined,
    statementCloseDay: row.statement_close_day ?? undefined,
    lastStatementDate: row.last_statement_date ?? undefined,
    accountId: row.account_id ?? undefined,
    provider: row.provider ?? undefined,
    externalId: row.external_id ?? undefined,
    purchaseDate: row.purchase_date ?? undefined,
    metadata: row.metadata as Record<string, unknown> | undefined,
    installmentPlans: plans,
    availableCredit,
    utilizationPercent,
    nextPaymentDate,
    isBNPL: type === 'BNPL',
    isCreditCard: type === 'CREDIT_CARD',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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

  if (error || !profile) throw new LiabilitiesApiError('Could not resolve family', 500);
  return profile.family_id;
}

// Known BNPL provider patterns for client-side detection
const BNPL_PATTERNS: { provider: string; patterns: RegExp[] }[] = [
  { provider: 'Klarna', patterns: [/klarna/i, /k\*klarna/i] },
  { provider: 'Afterpay', patterns: [/afterpay/i, /after\s*pay/i] },
  { provider: 'Affirm', patterns: [/affirm/i] },
  { provider: 'Clearpay', patterns: [/clearpay/i, /clear\s*pay/i] },
  { provider: 'Zip', patterns: [/\bzip\b/i, /zip\s*pay/i, /zip\s*money/i] },
  { provider: 'Sezzle', patterns: [/sezzle/i] },
  { provider: 'PayPal Pay Later', patterns: [/paypal.*later/i, /pay\s*in\s*4/i] },
  { provider: 'Scalapay', patterns: [/scalapay/i] },
];

// =============================================================================
// Liabilities Client
// =============================================================================

export const liabilitiesClient = {
  async getLiabilities(): Promise<Liability[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('liabilities')
      .select('*, installment_plans(*, installments(*))')
      .order('created_at', { ascending: false });

    if (error) throw new LiabilitiesApiError(error.message, 500);
    return (data ?? []).map((row) => rowToLiability(row as LiabilityWithPlans));
  },

  async getLiability(liabilityId: string): Promise<Liability> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('liabilities')
      .select('*, installment_plans(*, installments(*))')
      .eq('id', liabilityId)
      .single();

    if (error) throw new NotFoundError();
    return rowToLiability(data as LiabilityWithPlans);
  },

  async getSummary(): Promise<LiabilitiesSummary> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('liabilities')
      .select('*, installment_plans(*, installments(*))')
      .eq('status', 'ACTIVE');

    if (error) throw new LiabilitiesApiError(error.message, 500);

    const liabilities = (data ?? []).map((row) => rowToLiability(row as LiabilityWithPlans));

    let totalOwed = 0;
    let totalCreditLimit = 0;
    let upcomingPaymentCount = 0;
    let upcomingPaymentTotal = 0;
    const byType: LiabilitiesSummary['byType'] = {};
    const now = new Date();
    const thirtyDaysFromNow = new Date(now);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    for (const l of liabilities) {
      totalOwed += l.currentBalance;
      if (l.creditLimit) totalCreditLimit += l.creditLimit;

      const t = l.type;
      if (!byType[t]) byType[t] = { count: 0, totalOwed: 0 };
      byType[t]!.count += 1;
      byType[t]!.totalOwed += l.currentBalance;

      // Count upcoming installment payments within 30 days
      if (l.installmentPlans) {
        for (const plan of l.installmentPlans) {
          for (const inst of plan.installments) {
            if (!inst.isPaid) {
              const dueDate = new Date(inst.dueDate);
              if (dueDate <= thirtyDaysFromNow) {
                upcomingPaymentCount += 1;
                upcomingPaymentTotal += inst.amount;
              }
            }
          }
        }
      }
    }

    const overallUtilization = totalCreditLimit > 0
      ? Math.round((totalOwed / totalCreditLimit) * 100)
      : 0;

    return {
      totalLiabilities: liabilities.length,
      totalOwed,
      totalCreditLimit,
      overallUtilization,
      upcomingPaymentCount,
      upcomingPaymentTotal,
      byType,
    };
  },

  async getUpcomingPayments(days: number = 30): Promise<UpcomingPayment[]> {
    const supabase = createClient();
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() + days);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    // Get unpaid installments within the date range, joined to plans and liabilities
    const { data, error } = await supabase
      .from('installments')
      .select('*, installment_plans!inner(*, liabilities!inner(id, name, type, currency))')
      .eq('is_paid', false)
      .lte('due_date', cutoffStr)
      .order('due_date', { ascending: true });

    if (error) throw new LiabilitiesApiError(error.message, 500);

    const todayStr = now.toISOString().split('T')[0];

    return (data ?? []).map((row) => {
      const plan = row.installment_plans as InstallmentPlanRow & {
        liabilities: { id: string; name: string; type: string; currency: string };
      };
      const liability = plan.liabilities;
      const dueDate = row.due_date;
      const dueDateObj = new Date(dueDate);
      const diffMs = dueDateObj.getTime() - now.getTime();
      const daysUntilDue = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      return {
        liabilityId: liability.id,
        liabilityName: liability.name,
        liabilityType: liability.type as LiabilityType,
        dueDate,
        amount: Number(row.amount),
        currency: liability.currency,
        installmentId: row.id,
        installmentNumber: row.installment_number,
        totalInstallments: plan.number_of_installments,
        isInstallment: true,
        daysUntilDue,
        isOverdue: dueDate < todayStr,
      };
    });
  },

  async createLiability(data: CreateLiabilityRequest): Promise<Liability> {
    const supabase = createClient();
    const familyId = await getUserFamilyId(supabase);

    const insert: LiabilityInsert = {
      type: data.type as Database['public']['Enums']['liability_type'],
      name: data.name,
      current_balance: data.currentBalance ?? 0,
      credit_limit: data.creditLimit ?? null,
      original_amount: data.originalAmount ?? null,
      currency: data.currency ?? 'EUR',
      interest_rate: data.interestRate ?? null,
      minimum_payment: data.minimumPayment ?? null,
      billing_cycle_day: data.billingCycleDay ?? null,
      payment_due_day: data.paymentDueDay ?? null,
      statement_close_day: data.statementCloseDay ?? null,
      account_id: data.accountId ?? null,
      provider: data.provider ?? null,
      purchase_date: data.purchaseDate ?? null,
      status: (data.status ?? 'ACTIVE') as Database['public']['Enums']['liability_status'],
      metadata: (data.metadata ?? null) as Json,
      family_id: familyId,
    };

    // Type-safe insert with explicit casting to avoid Next.js build type inference issues
    const { data: created, error } = await (supabase
      .from('liabilities')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert as any)(insert)
      .select('*, installment_plans(*, installments(*))')
      .single();

    if (error) throw new ValidationError(error.message);
    return rowToLiability(created as LiabilityWithPlans);
  },

  async updateLiability(
    liabilityId: string,
    data: UpdateLiabilityRequest
  ): Promise<Liability> {
    const supabase = createClient();
    const update: Database['public']['Tables']['liabilities']['Update'] = {};

    if (data.type !== undefined) update.type = data.type as Database['public']['Enums']['liability_type'];
    if (data.name !== undefined) update.name = data.name;
    if (data.currentBalance !== undefined) update.current_balance = data.currentBalance;
    if (data.creditLimit !== undefined) update.credit_limit = data.creditLimit;
    if (data.originalAmount !== undefined) update.original_amount = data.originalAmount;
    if (data.currency !== undefined) update.currency = data.currency;
    if (data.interestRate !== undefined) update.interest_rate = data.interestRate;
    if (data.minimumPayment !== undefined) update.minimum_payment = data.minimumPayment;
    if (data.billingCycleDay !== undefined) update.billing_cycle_day = data.billingCycleDay;
    if (data.paymentDueDay !== undefined) update.payment_due_day = data.paymentDueDay;
    if (data.statementCloseDay !== undefined) update.statement_close_day = data.statementCloseDay;
    if (data.accountId !== undefined) update.account_id = data.accountId;
    if (data.provider !== undefined) update.provider = data.provider;
    if (data.purchaseDate !== undefined) update.purchase_date = data.purchaseDate;
    if (data.status !== undefined) update.status = data.status as Database['public']['Enums']['liability_status'];
    if (data.metadata !== undefined) update.metadata = (data.metadata ?? null) as Json;

    // Type-safe update with explicit casting to avoid Next.js build type inference issues
    const { data: updated, error } = await (supabase
      .from('liabilities')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update as any)(update)
      .eq('id', liabilityId)
      .select('*, installment_plans(*, installments(*))')
      .single();

    if (error) throw new LiabilitiesApiError(error.message, 400);
    return rowToLiability(updated as LiabilityWithPlans);
  },

  async deleteLiability(liabilityId: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('liabilities')
      .delete()
      .eq('id', liabilityId);

    if (error) throw new LiabilitiesApiError(error.message, 400);
  },

  /**
   * Detect BNPL provider from transaction description (client-side pattern matching).
   */
  async detectBNPL(
    description: string,
    merchantName?: string
  ): Promise<BNPLDetectionResult | null> {
    const text = `${description} ${merchantName ?? ''}`.trim();
    for (const { provider, patterns } of BNPL_PATTERNS) {
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
          return {
            provider,
            confidence: 0.85,
            matchedPattern: match[0],
            suggestedName: `${provider} - ${merchantName ?? description}`.slice(0, 100),
          };
        }
      }
    }
    return null;
  },

  async createInstallmentPlan(
    liabilityId: string,
    data: CreateInstallmentPlanRequest
  ): Promise<InstallmentPlan> {
    const supabase = createClient();

    // Calculate end date based on number of installments (monthly by default)
    const startDate = new Date(data.startDate);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + data.numberOfInstallments);

    const { data: plan, error } = await supabase
      .from('installment_plans')
      .insert({
        liability_id: liabilityId,
        total_amount: data.totalAmount,
        installment_amount: data.installmentAmount,
        number_of_installments: data.numberOfInstallments,
        remaining_installments: data.numberOfInstallments,
        start_date: data.startDate,
        end_date: endDate.toISOString().split('T')[0],
        currency: data.currency ?? 'EUR',
      })
      .select()
      .single();

    if (error) throw new ValidationError(error.message);

    // Create individual installment records
    const installmentInserts = Array.from(
      { length: data.numberOfInstallments },
      (_, i) => {
        const dueDate = new Date(startDate);
        dueDate.setMonth(dueDate.getMonth() + i + 1);
        return {
          plan_id: plan.id,
          amount: data.installmentAmount,
          due_date: dueDate.toISOString().split('T')[0],
          installment_number: i + 1,
        };
      }
    );

    const { data: installments, error: instError } = await supabase
      .from('installments')
      .insert(installmentInserts)
      .select();

    if (instError) throw new ValidationError(instError.message);

    return rowToInstallmentPlan({
      ...plan,
      installments: installments ?? [],
    });
  },

  async markInstallmentPaid(
    _liabilityId: string,
    installmentId: string,
    transactionId?: string
  ): Promise<Installment> {
    const supabase = createClient();

    const update: Database['public']['Tables']['installments']['Update'] = {
      is_paid: true,
      paid_at: new Date().toISOString(),
    };
    if (transactionId) update.transaction_id = transactionId;

    const { data, error } = await supabase
      .from('installments')
      .update(update)
      .eq('id', installmentId)
      .select()
      .single();

    if (error) throw new LiabilitiesApiError(error.message, 400);

    // Update remaining installments count on the plan
    const installment = rowToInstallment(data);

    // Update remaining_installments directly
    const { data: planData } = await supabase
      .from('installments')
      .select('plan_id')
      .eq('id', installmentId)
      .single();

    if (planData) {
      const { count } = await supabase
        .from('installments')
        .select('*', { count: 'exact', head: true })
        .eq('plan_id', planData.plan_id)
        .eq('is_paid', false);

      await supabase
        .from('installment_plans')
        .update({
          remaining_installments: count ?? 0,
          is_paid_off: (count ?? 0) === 0,
        })
        .eq('id', planData.plan_id);
    }

    return installment;
  },
};

export default liabilitiesClient;
