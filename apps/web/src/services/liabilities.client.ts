/**
 * Liabilities API Client
 *
 * Provides type-safe HTTP client for liability management endpoints.
 * Handles credit cards, BNPL, loans, and other debts.
 *
 * @module services/liabilities.client
 */

// =============================================================================
// Type Definitions
// =============================================================================

export type LiabilityType = 'CREDIT_CARD' | 'BNPL' | 'LOAN' | 'MORTGAGE' | 'OTHER';
export type LiabilityStatus = 'ACTIVE' | 'PAID_OFF' | 'CLOSED';

/**
 * Individual installment in a plan
 */
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

/**
 * Installment plan with all installments
 */
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

/**
 * Liability data returned from API
 */
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
  // Computed fields
  availableCredit?: number;
  utilizationPercent?: number;
  nextPaymentDate?: string;
  isBNPL: boolean;
  isCreditCard: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Upcoming payment data
 */
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

/**
 * BNPL detection result
 */
export interface BNPLDetectionResult {
  provider: string;
  confidence: number;
  matchedPattern: string;
  suggestedName: string;
}

/**
 * Liabilities summary statistics
 */
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

/**
 * Data required to create a new liability
 */
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

/**
 * Data for updating an existing liability
 */
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

/**
 * Data for creating an installment plan
 */
export interface CreateInstallmentPlanRequest {
  totalAmount: number;
  installmentAmount: number;
  numberOfInstallments: number;
  startDate: string;
  currency?: string;
}

/**
 * API error response structure
 */
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
// HTTP Client
// =============================================================================

function getApiBaseUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
}

async function handleErrorResponse(response: Response): Promise<never> {
  let errorData: ApiErrorResponse | null = null;

  try {
    const text = await response.text();
    if (text) {
      errorData = JSON.parse(text);
    }
  } catch {
    // Failed to parse error response
  }

  const statusCode = response.status;
  const message = errorData?.message
    ? Array.isArray(errorData.message)
      ? errorData.message.join(', ')
      : errorData.message
    : response.statusText || 'An error occurred';

  switch (statusCode) {
    case 400:
      throw new ValidationError(message);
    case 401:
      throw new AuthenticationError(message);
    case 404:
      throw new NotFoundError(message);
    default:
      throw new LiabilitiesApiError(message, statusCode, errorData?.error);
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    await handleErrorResponse(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// =============================================================================
// Liabilities API Client
// =============================================================================

export const liabilitiesClient = {
  /**
   * Get all liabilities for the current user
   */
  async getLiabilities(): Promise<Liability[]> {
    return request<Liability[]>('/api/liabilities', { method: 'GET' });
  },

  /**
   * Get a single liability by ID
   */
  async getLiability(liabilityId: string): Promise<Liability> {
    return request<Liability>(`/api/liabilities/${liabilityId}`, {
      method: 'GET',
    });
  },

  /**
   * Get liabilities summary statistics
   */
  async getSummary(): Promise<LiabilitiesSummary> {
    return request<LiabilitiesSummary>('/api/liabilities/summary', {
      method: 'GET',
    });
  },

  /**
   * Get upcoming payments
   */
  async getUpcomingPayments(days: number = 30): Promise<UpcomingPayment[]> {
    return request<UpcomingPayment[]>(
      `/api/liabilities/upcoming?days=${days}`,
      { method: 'GET' }
    );
  },

  /**
   * Create a new liability
   */
  async createLiability(data: CreateLiabilityRequest): Promise<Liability> {
    return request<Liability>('/api/liabilities', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update an existing liability
   */
  async updateLiability(
    liabilityId: string,
    data: UpdateLiabilityRequest
  ): Promise<Liability> {
    return request<Liability>(`/api/liabilities/${liabilityId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete a liability
   */
  async deleteLiability(liabilityId: string): Promise<void> {
    return request<void>(`/api/liabilities/${liabilityId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Detect BNPL from transaction description
   */
  async detectBNPL(
    description: string,
    merchantName?: string
  ): Promise<BNPLDetectionResult | null> {
    return request<BNPLDetectionResult | null>('/api/liabilities/detect-bnpl', {
      method: 'POST',
      body: JSON.stringify({ description, merchantName }),
    });
  },

  /**
   * Create an installment plan for a liability
   */
  async createInstallmentPlan(
    liabilityId: string,
    data: CreateInstallmentPlanRequest
  ): Promise<InstallmentPlan> {
    return request<InstallmentPlan>(
      `/api/liabilities/${liabilityId}/installment-plan`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  },

  /**
   * Mark an installment as paid
   */
  async markInstallmentPaid(
    liabilityId: string,
    installmentId: string,
    transactionId?: string
  ): Promise<Installment> {
    return request<Installment>(
      `/api/liabilities/${liabilityId}/installments/${installmentId}/pay`,
      {
        method: 'PATCH',
        body: JSON.stringify({ transactionId }),
      }
    );
  },
};

export default liabilitiesClient;
