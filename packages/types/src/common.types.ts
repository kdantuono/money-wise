/**
 * Common Type Definitions
 * Shared across all packages (frontend, backend, shared)
 * Used to eliminate 'any' types and improve type safety
 */

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * Generic API Response wrapper for consistent response structure
 */
export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  message?: string;
  timestamp?: string;
  errors?: ApiError[];
}

/**
 * API Error structure with field-level validation errors
 */
export interface ApiError {
  code: string;
  message: string;
  field?: string;
  context?: Record<string, unknown>;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * Request query parameters for list endpoints
 */
export interface QueryParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  filter?: Record<string, unknown>;
}

// ============================================================================
// AUTHENTICATION TYPES
// ============================================================================

/**
 * JWT Token Payload structure
 */
export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

/**
 * User session object
 */
export interface UserSession {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  isAuthenticated: boolean;
  expiresAt?: number;
}

/**
 * Login credentials
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Registration payload
 */
export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

// ============================================================================
// DATABASE TYPES
// ============================================================================

/**
 * Generic database record with audit fields
 */
export interface DatabaseRecord {
  id: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt?: Date | string | null;
}

/**
 * Transaction record from database
 */
export interface TransactionRecord extends DatabaseRecord {
  userId: string;
  amount: number;
  currency: string;
  category: string;
  description: string;
  date: Date | string;
  type: 'income' | 'expense';
  status: 'pending' | 'completed' | 'failed';
}

/**
 * Budget record from database
 */
export interface BudgetRecord extends DatabaseRecord {
  userId: string;
  name: string;
  limit: number;
  spent: number;
  currency: string;
  category: string;
  period: 'monthly' | 'yearly';
  startDate: Date | string;
  endDate?: Date | string;
}

/**
 * User record from database
 */
export interface UserRecord extends DatabaseRecord {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  passwordHash?: string;
  isVerified: boolean;
  lastLogin?: Date | string;
}

// ============================================================================
// SERVICE METHOD TYPES
// ============================================================================

/**
 * Generic service result type
 */
export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: ServiceError;
}

/**
 * Service error with structured information
 */
export interface ServiceError {
  code: string;
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
}

/**
 * Validation result from service validation
 */
export interface ValidationResult {
  isValid: boolean;
  errors?: ValidationError[];
}

/**
 * Field-level validation error
 */
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

// ============================================================================
// FORM TYPES
// ============================================================================

/**
 * Form state type for React forms
 */
export interface FormState<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
  isValid: boolean;
}

/**
 * Form handler types
 */
export type FormSubmitHandler<T> = (values: T) => Promise<void> | void;
export type FormChangeHandler<T> = (values: T) => void;
export type FormValidationHandler<T> = (values: T) => ValidationError[];

// ============================================================================
// NEXT.JS API TYPES
// ============================================================================

/**
 * Next.js API route handler (for standalone type package compatibility)
 */
export type NextApiHandler<T = unknown> = (
  req: NextApiRequest,
  res: NextApiResponse<T>
) => Promise<void> | void;

/**
 * Next.js API request with typed body
 */
export interface NextApiRequest {
  method?: string;
  headers: Record<string, string | string[]>;
  body?: unknown;
  query?: Record<string, string | string[]>;
  cookies?: Record<string, string>;
}

/**
 * Next.js API response
 */
export interface NextApiResponse<T = unknown> {
  status: (statusCode: number) => NextApiResponse<T>;
  json: (body: T) => void;
  end: () => void;
  setHeader: (name: string, value: string | string[]) => void;
}

/**
 * Generic component prop type base
 */
export type ComponentProps<T extends Record<string, unknown> = {}> = T & {
  children?: unknown;
};

/**
 * Event handler type aliases
 */
export type FormEventHandler = (event: { preventDefault: () => void }) => void;
export type InputChangeHandler = (event: {
  target: { value: string | number };
}) => void;
export type MouseEventHandler = (event: { button: number }) => void;

// ============================================================================
// NESTJS SPECIFIC TYPES
// ============================================================================

/**
 * NestJS ExecutionContext interface (minimal)
 */
export interface ExecutionContext {
  getRequest: () => unknown;
  getResponse: () => unknown;
  getArgs: () => unknown[];
  switchToHttp: () => HttpArgumentsHost;
}

/**
 * NestJS HttpArgumentsHost interface
 */
export interface HttpArgumentsHost {
  getRequest: () => unknown;
  getResponse: () => unknown;
}

/**
 * NestJS service method types
 */
export interface RepositoryOptions {
  skip?: number;
  take?: number;
  where?: Record<string, unknown>;
  order?: Record<string, 'ASC' | 'DESC'>;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Async function type with optional return value
 */
export type AsyncFunction<T = void> = (
  ...args: unknown[]
) => Promise<T>;

/**
 * Generic constructor function
 */
export type Constructor<T> = new (...args: unknown[]) => T;

/**
 * Type guard function - determines if a value matches a specific type
 */
export type TypeGuard<T> = (value: unknown) => value is T;

/**
 * Omit type to exclude specific fields
 */
export type OmitFields<T, K extends keyof T> = Omit<T, K>;

/**
 * Pick type to select specific fields
 */
export type PickFields<T, K extends keyof T> = Pick<T, K>;

/**
 * Extract type from array
 */
export type ArrayElement<T extends readonly unknown[]> =
  T extends readonly (infer E)[] ? E : never;

// ============================================================================
// ENUM TYPES
// ============================================================================

export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense',
}

export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest',
}

export enum BudgetPeriod {
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  CUSTOM = 'custom',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

// ============================================================================
// BANKING INTEGRATION TYPES
// ============================================================================

export enum BankingProvider {
  MANUAL = 'MANUAL',
  SALTEDGE = 'SALTEDGE',
  TINK = 'TINK',
  YAPILY = 'YAPILY',
  TRUELAYER = 'TRUELAYER',
}

export enum BankingConnectionStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  AUTHORIZED = 'AUTHORIZED',
  REVOKED = 'REVOKED',
  EXPIRED = 'EXPIRED',
  FAILED = 'FAILED',
}

export enum BankingSyncStatus {
  PENDING = 'PENDING',
  SYNCING = 'SYNCING',
  SYNCED = 'SYNCED',
  ERROR = 'ERROR',
  DISCONNECTED = 'DISCONNECTED',
}

// ============================================================================
// END OF TYPE DEFINITIONS
// ============================================================================

// All types are exported via individual export statements above.
// The types are organized by category for easy reference and maintenance.
