export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Account {
  id: string;
  userId: string;
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
  bankId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum AccountType {
  CHECKING = 'checking',
  SAVINGS = 'savings',
  CREDIT = 'credit',
  INVESTMENT = 'investment',
  CASH = 'cash'
}

export interface Transaction {
  id: string;
  userId: string;
  accountId: string;
  amount: number;
  type: TransactionType;
  category: string;
  subcategory?: string;
  description: string;
  date: Date;
  merchantName?: string;
  isRecurring: boolean;
  tags: string[];
  attachments: string[];
  createdAt: Date;
  updatedAt: Date;
}

export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense',
  TRANSFER = 'transfer'
}

export interface Budget {
  id: string;
  userId: string;
  name: string;
  category: string;
  amount: number;
  spent: number;
  period: BudgetPeriod;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  alertThreshold: number;
  createdAt: Date;
  updatedAt: Date;
}

export enum BudgetPeriod {
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly'
}

export interface Category {
  id: string;
  name: string;
  parentId?: string;
  color: string;
  icon: string;
  isSystemCategory: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BankConnection {
  id: string;
  userId: string;
  bankName: string;
  accountNumbers: string[];
  connectionStatus: ConnectionStatus;
  lastSyncAt?: Date;
  accessToken: string;
  refreshToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum ConnectionStatus {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
  PENDING = 'pending'
}

export interface Subscription {
  id: string;
  userId: string;
  merchantName: string;
  amount: number;
  currency: string;
  frequency: SubscriptionFrequency;
  nextBillingDate: Date;
  isActive: boolean;
  category: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum SubscriptionFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly'
}

export interface FinancialGoal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: Date;
  category: string;
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Analytics {
  userId: string;
  period: AnalyticsPeriod;
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  topCategories: CategorySpending[];
  monthlyTrends: MonthlyTrend[];
  budgetPerformance: BudgetPerformance[];
  generatedAt: Date;
}

export enum AnalyticsPeriod {
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year'
}

export interface CategorySpending {
  category: string;
  amount: number;
  percentage: number;
  transactionCount: number;
}

export interface MonthlyTrend {
  month: string;
  income: number;
  expenses: number;
  netIncome: number;
}

export interface BudgetPerformance {
  budgetId: string;
  budgetName: string;
  allocated: number;
  spent: number;
  percentage: number;
  status: BudgetStatus;
}

export enum BudgetStatus {
  ON_TRACK = 'on_track',
  OVER_BUDGET = 'over_budget',
  APPROACHING_LIMIT = 'approaching_limit'
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Request types
export interface CreateTransactionRequest {
  accountId: string;
  amount: number;
  type: TransactionType;
  category: string;
  subcategory?: string;
  description: string;
  date: Date;
  merchantName?: string;
  tags?: string[];
}

export interface UpdateTransactionRequest extends Partial<CreateTransactionRequest> {
  id: string;
}

export interface CreateBudgetRequest {
  name: string;
  category: string;
  amount: number;
  period: BudgetPeriod;
  startDate: Date;
  endDate: Date;
  alertThreshold?: number;
}

export interface UpdateBudgetRequest extends Partial<CreateBudgetRequest> {
  id: string;
}

export interface CreateAccountRequest {
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
  bankId?: string;
}

export interface UpdateAccountRequest extends Partial<CreateAccountRequest> {
  id: string;
}