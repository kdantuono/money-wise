/**
 * Category Seed - System Category Definitions
 *
 * Defines the default system categories for the MoneyWise application.
 * Categories are hierarchical (max depth 2) and support:
 * - EXPENSE: Track spending (Food & Dining, Bills, Shopping, etc.)
 * - INCOME: Track earnings (Salary, Investments, etc.)
 *
 * Note: TRANSFER is a FlowType on transactions, not a category type.
 * Transfers don't need categories - the fromAccount/toAccount tells the story.
 *
 * System categories (isSystem=true): Cannot be deleted by users
 * Default categories (isDefault=true): Can be edited but not deleted
 *
 * @phase Phase 0 - Schema Foundation
 */

/**
 * Category type enum matching Prisma CategoryType
 * Note: TRANSFER is not a category type - it's a FlowType on transactions
 */
export type CategoryType = 'INCOME' | 'EXPENSE';

/**
 * System category definition interface
 * Represents a category before database insertion
 */
export interface SystemCategoryDefinition {
  name: string;
  slug: string;
  type: CategoryType;
  icon: string;
  color: string;
  sortOrder: number;
  isDefault: boolean;
  isSystem: boolean;
  parentSlug?: string;
}

// ============================================================================
// EXPENSE CATEGORIES
// ============================================================================

const EXPENSE_CATEGORIES: SystemCategoryDefinition[] = [
  // Uncategorized - System category for unclassified expenses
  {
    name: 'Uncategorized',
    slug: 'uncategorized',
    type: 'EXPENSE',
    icon: 'question-mark-circle',
    color: '#9CA3AF',
    sortOrder: 999,
    isDefault: false,
    isSystem: true,
  },
  // Food & Dining
  {
    name: 'Food & Dining',
    slug: 'food-dining',
    type: 'EXPENSE',
    icon: 'utensils',
    color: '#F59E0B',
    sortOrder: 10,
    isDefault: true,
    isSystem: false,
  },
  {
    name: 'Groceries',
    slug: 'groceries',
    type: 'EXPENSE',
    icon: 'shopping-cart',
    color: '#F59E0B',
    sortOrder: 11,
    isDefault: true,
    isSystem: false,
    parentSlug: 'food-dining',
  },
  {
    name: 'Restaurants',
    slug: 'restaurants',
    type: 'EXPENSE',
    icon: 'building-storefront',
    color: '#F59E0B',
    sortOrder: 12,
    isDefault: true,
    isSystem: false,
    parentSlug: 'food-dining',
  },
  {
    name: 'Coffee Shops',
    slug: 'coffee-shops',
    type: 'EXPENSE',
    icon: 'coffee',
    color: '#F59E0B',
    sortOrder: 13,
    isDefault: true,
    isSystem: false,
    parentSlug: 'food-dining',
  },
  // Bills & Utilities
  {
    name: 'Bills & Utilities',
    slug: 'bills',
    type: 'EXPENSE',
    icon: 'document-text',
    color: '#EF4444',
    sortOrder: 20,
    isDefault: true,
    isSystem: false,
  },
  {
    name: 'Utilities',
    slug: 'utilities',
    type: 'EXPENSE',
    icon: 'bolt',
    color: '#EF4444',
    sortOrder: 21,
    isDefault: true,
    isSystem: false,
    parentSlug: 'bills',
  },
  {
    name: 'Phone',
    slug: 'phone',
    type: 'EXPENSE',
    icon: 'phone',
    color: '#EF4444',
    sortOrder: 22,
    isDefault: true,
    isSystem: false,
    parentSlug: 'bills',
  },
  {
    name: 'Internet',
    slug: 'internet',
    type: 'EXPENSE',
    icon: 'wifi',
    color: '#EF4444',
    sortOrder: 23,
    isDefault: true,
    isSystem: false,
    parentSlug: 'bills',
  },
  {
    name: 'Insurance',
    slug: 'insurance',
    type: 'EXPENSE',
    icon: 'shield-check',
    color: '#EF4444',
    sortOrder: 24,
    isDefault: true,
    isSystem: false,
    parentSlug: 'bills',
  },
  // Shopping
  {
    name: 'Shopping',
    slug: 'shopping',
    type: 'EXPENSE',
    icon: 'shopping-bag',
    color: '#8B5CF6',
    sortOrder: 30,
    isDefault: true,
    isSystem: false,
  },
  {
    name: 'Clothing',
    slug: 'clothing',
    type: 'EXPENSE',
    icon: 'shirt',
    color: '#8B5CF6',
    sortOrder: 31,
    isDefault: true,
    isSystem: false,
    parentSlug: 'shopping',
  },
  {
    name: 'Electronics',
    slug: 'electronics',
    type: 'EXPENSE',
    icon: 'computer-desktop',
    color: '#8B5CF6',
    sortOrder: 32,
    isDefault: true,
    isSystem: false,
    parentSlug: 'shopping',
  },
  // Transportation
  {
    name: 'Transportation',
    slug: 'transportation',
    type: 'EXPENSE',
    icon: 'truck',
    color: '#3B82F6',
    sortOrder: 40,
    isDefault: true,
    isSystem: false,
  },
  {
    name: 'Gas & Fuel',
    slug: 'gas-fuel',
    type: 'EXPENSE',
    icon: 'fire',
    color: '#3B82F6',
    sortOrder: 41,
    isDefault: true,
    isSystem: false,
    parentSlug: 'transportation',
  },
  {
    name: 'Public Transit',
    slug: 'public-transit',
    type: 'EXPENSE',
    icon: 'train',
    color: '#3B82F6',
    sortOrder: 42,
    isDefault: true,
    isSystem: false,
    parentSlug: 'transportation',
  },
  {
    name: 'Parking',
    slug: 'parking',
    type: 'EXPENSE',
    icon: 'parking',
    color: '#3B82F6',
    sortOrder: 43,
    isDefault: true,
    isSystem: false,
    parentSlug: 'transportation',
  },
  // Housing
  {
    name: 'Housing',
    slug: 'housing',
    type: 'EXPENSE',
    icon: 'home',
    color: '#10B981',
    sortOrder: 50,
    isDefault: true,
    isSystem: false,
  },
  {
    name: 'Rent',
    slug: 'rent',
    type: 'EXPENSE',
    icon: 'key',
    color: '#10B981',
    sortOrder: 51,
    isDefault: true,
    isSystem: false,
    parentSlug: 'housing',
  },
  {
    name: 'Mortgage',
    slug: 'mortgage',
    type: 'EXPENSE',
    icon: 'building-library',
    color: '#10B981',
    sortOrder: 52,
    isDefault: true,
    isSystem: false,
    parentSlug: 'housing',
  },
  {
    name: 'Home Maintenance',
    slug: 'home-maintenance',
    type: 'EXPENSE',
    icon: 'wrench',
    color: '#10B981',
    sortOrder: 53,
    isDefault: true,
    isSystem: false,
    parentSlug: 'housing',
  },
  // Entertainment
  {
    name: 'Entertainment',
    slug: 'entertainment',
    type: 'EXPENSE',
    icon: 'sparkles',
    color: '#EC4899',
    sortOrder: 60,
    isDefault: true,
    isSystem: false,
  },
  {
    name: 'Streaming Services',
    slug: 'streaming',
    type: 'EXPENSE',
    icon: 'play',
    color: '#EC4899',
    sortOrder: 61,
    isDefault: true,
    isSystem: false,
    parentSlug: 'entertainment',
  },
  {
    name: 'Movies & Events',
    slug: 'movies-events',
    type: 'EXPENSE',
    icon: 'ticket',
    color: '#EC4899',
    sortOrder: 62,
    isDefault: true,
    isSystem: false,
    parentSlug: 'entertainment',
  },
  // Health & Fitness
  {
    name: 'Health & Fitness',
    slug: 'health-fitness',
    type: 'EXPENSE',
    icon: 'heart',
    color: '#14B8A6',
    sortOrder: 70,
    isDefault: true,
    isSystem: false,
  },
  {
    name: 'Medical',
    slug: 'medical',
    type: 'EXPENSE',
    icon: 'medical-bag',
    color: '#14B8A6',
    sortOrder: 71,
    isDefault: true,
    isSystem: false,
    parentSlug: 'health-fitness',
  },
  {
    name: 'Gym',
    slug: 'gym',
    type: 'EXPENSE',
    icon: 'dumbbell',
    color: '#14B8A6',
    sortOrder: 72,
    isDefault: true,
    isSystem: false,
    parentSlug: 'health-fitness',
  },
  // Personal Care
  {
    name: 'Personal Care',
    slug: 'personal-care',
    type: 'EXPENSE',
    icon: 'user',
    color: '#F472B6',
    sortOrder: 80,
    isDefault: true,
    isSystem: false,
  },
  // Education
  {
    name: 'Education',
    slug: 'education',
    type: 'EXPENSE',
    icon: 'academic-cap',
    color: '#6366F1',
    sortOrder: 90,
    isDefault: true,
    isSystem: false,
  },
  // Travel
  {
    name: 'Travel',
    slug: 'travel',
    type: 'EXPENSE',
    icon: 'airplane',
    color: '#0EA5E9',
    sortOrder: 100,
    isDefault: true,
    isSystem: false,
  },
  // Gifts & Donations
  {
    name: 'Gifts & Donations',
    slug: 'gifts-donations',
    type: 'EXPENSE',
    icon: 'gift',
    color: '#F97316',
    sortOrder: 110,
    isDefault: true,
    isSystem: false,
  },
  // Pets
  {
    name: 'Pets',
    slug: 'pets',
    type: 'EXPENSE',
    icon: 'paw',
    color: '#A855F7',
    sortOrder: 120,
    isDefault: true,
    isSystem: false,
  },
  // Kids
  {
    name: 'Kids',
    slug: 'kids',
    type: 'EXPENSE',
    icon: 'child',
    color: '#22D3EE',
    sortOrder: 130,
    isDefault: true,
    isSystem: false,
  },
  // Taxes
  {
    name: 'Taxes',
    slug: 'taxes',
    type: 'EXPENSE',
    icon: 'receipt-percent',
    color: '#64748B',
    sortOrder: 140,
    isDefault: true,
    isSystem: false,
  },
  // Fees & Charges
  {
    name: 'Fees & Charges',
    slug: 'fees-charges',
    type: 'EXPENSE',
    icon: 'banknotes',
    color: '#78716C',
    sortOrder: 150,
    isDefault: true,
    isSystem: false,
  },
];

// ============================================================================
// INCOME CATEGORIES
// ============================================================================

const INCOME_CATEGORIES: SystemCategoryDefinition[] = [
  // Salary
  {
    name: 'Salary',
    slug: 'salary',
    type: 'INCOME',
    icon: 'briefcase',
    color: '#22C55E',
    sortOrder: 10,
    isDefault: true,
    isSystem: false,
  },
  // Investments
  {
    name: 'Investments',
    slug: 'investments',
    type: 'INCOME',
    icon: 'chart-bar',
    color: '#3B82F6',
    sortOrder: 20,
    isDefault: true,
    isSystem: false,
  },
  {
    name: 'Dividends',
    slug: 'dividends',
    type: 'INCOME',
    icon: 'currency-dollar',
    color: '#3B82F6',
    sortOrder: 21,
    isDefault: true,
    isSystem: false,
    parentSlug: 'investments',
  },
  {
    name: 'Interest',
    slug: 'interest',
    type: 'INCOME',
    icon: 'percent',
    color: '#3B82F6',
    sortOrder: 22,
    isDefault: true,
    isSystem: false,
    parentSlug: 'investments',
  },
  // Freelance
  {
    name: 'Freelance',
    slug: 'freelance',
    type: 'INCOME',
    icon: 'laptop',
    color: '#8B5CF6',
    sortOrder: 30,
    isDefault: true,
    isSystem: false,
  },
  // Rental Income
  {
    name: 'Rental Income',
    slug: 'rental-income',
    type: 'INCOME',
    icon: 'building-office',
    color: '#F59E0B',
    sortOrder: 40,
    isDefault: true,
    isSystem: false,
  },
  // Bonus
  {
    name: 'Bonus',
    slug: 'bonus',
    type: 'INCOME',
    icon: 'star',
    color: '#EAB308',
    sortOrder: 50,
    isDefault: true,
    isSystem: false,
  },
  // Refunds
  {
    name: 'Refunds',
    slug: 'refunds',
    type: 'INCOME',
    icon: 'arrow-uturn-left',
    color: '#14B8A6',
    sortOrder: 60,
    isDefault: true,
    isSystem: false,
  },
  // Gifts Received
  {
    name: 'Gifts Received',
    slug: 'gifts-received',
    type: 'INCOME',
    icon: 'gift',
    color: '#EC4899',
    sortOrder: 70,
    isDefault: true,
    isSystem: false,
  },
  // Other Income
  {
    name: 'Other Income',
    slug: 'other-income',
    type: 'INCOME',
    icon: 'plus-circle',
    color: '#9CA3AF',
    sortOrder: 999,
    isDefault: true,
    isSystem: false,
  },
];

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * All system categories combined
 * Note: No TRANSFER categories - transfers use FlowType on transactions
 */
export const SYSTEM_CATEGORIES: SystemCategoryDefinition[] = [
  ...EXPENSE_CATEGORIES,
  ...INCOME_CATEGORIES,
];

/**
 * All system category slugs for quick lookup
 */
export const SYSTEM_CATEGORY_SLUGS: string[] = SYSTEM_CATEGORIES.map(
  (c) => c.slug,
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get a category definition by its slug
 */
export function getCategoryBySlug(
  slug: string,
): SystemCategoryDefinition | undefined {
  return SYSTEM_CATEGORIES.find((c) => c.slug === slug);
}

/**
 * Get all expense categories
 */
export function getExpenseCategories(): SystemCategoryDefinition[] {
  return SYSTEM_CATEGORIES.filter((c) => c.type === 'EXPENSE');
}

/**
 * Get all income categories
 */
export function getIncomeCategories(): SystemCategoryDefinition[] {
  return SYSTEM_CATEGORIES.filter((c) => c.type === 'INCOME');
}

// Note: getTransferCategories removed - transfers don't have categories

/**
 * Get top-level categories (no parent)
 */
export function getTopLevelCategories(): SystemCategoryDefinition[] {
  return SYSTEM_CATEGORIES.filter((c) => !c.parentSlug);
}

/**
 * Get child categories for a given parent slug
 */
export function getChildCategories(
  parentSlug: string,
): SystemCategoryDefinition[] {
  return SYSTEM_CATEGORIES.filter((c) => c.parentSlug === parentSlug);
}
