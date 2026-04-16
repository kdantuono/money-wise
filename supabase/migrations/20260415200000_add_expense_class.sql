-- Add expense_class to categories for FIXED vs VARIABLE classification
-- Every expense category is either FIXED or VARIABLE. Income categories are NULL.
-- Users can override via category settings in the future.

ALTER TABLE public.categories
  ADD COLUMN expense_class TEXT
  CHECK (expense_class IN ('FIXED', 'VARIABLE'));

COMMENT ON COLUMN public.categories.expense_class IS
  'Expense classification: FIXED (predictable, constant amount) or VARIABLE (fluctuating). NULL for income/system categories.';

-- ============================================================================
-- Default classification based on category nature
-- ============================================================================

-- FIXED: predictable monthly amount, indeterminate duration
UPDATE public.categories SET expense_class = 'FIXED' WHERE slug IN (
  -- Housing
  'housing', 'rent', 'mortgage', 'home-maintenance',
  -- Bills (fixed portion)
  'bills', 'insurance', 'internet', 'phone',
  -- Subscriptions & memberships
  'streaming', 'gym',
  -- Personal recurring
  'personal-care'
);

-- VARIABLE: fluctuating monthly amount
UPDATE public.categories SET expense_class = 'VARIABLE' WHERE slug IN (
  -- Food & Dining
  'food-dining', 'groceries', 'restaurants', 'coffee-shops',
  -- Utilities (consumption-based)
  'utilities',
  -- Transportation (usage-based)
  'transportation', 'gas-fuel', 'public-transit', 'parking',
  -- Shopping (discretionary)
  'shopping', 'clothing', 'electronics',
  -- Entertainment
  'entertainment', 'movies-events',
  -- Health
  'health-fitness', 'medical', 'dumbbell',
  -- Other variable expenses
  'education', 'travel', 'gifts-donations', 'pets', 'kids',
  'taxes', 'fees-charges',
  -- Uncategorized expenses
  'uncategorized'
);

-- Income categories and system categories intentionally left NULL
