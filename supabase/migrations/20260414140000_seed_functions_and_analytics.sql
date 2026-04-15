-- ============================================================================
-- MoneyWise (Zecca) — Seed Functions + Analytics DB Functions
-- Phase 0, Week 2: Default categories auto-seed + RPC analytics
-- ============================================================================

-- ============================================================================
-- SECTION 1: CATEGORY SEED FUNCTION
-- Called by handle_new_user() on signup — every family gets default categories.
-- ============================================================================

CREATE OR REPLACE FUNCTION private.seed_default_categories(target_family_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  -- Parent category IDs for hierarchy
  food_id UUID;
  bills_id UUID;
  shopping_id UUID;
  transport_id UUID;
  housing_id UUID;
  entertainment_id UUID;
  health_id UUID;
  investments_id UUID;
BEGIN
  -- ========== EXPENSE PARENT CATEGORIES ==========

  INSERT INTO public.categories (id, name, slug, type, status, icon, color, is_default, is_system, sort_order, depth, family_id)
  VALUES (gen_random_uuid(), 'Uncategorized', 'uncategorized', 'EXPENSE', 'ACTIVE', 'question-mark-circle', '#9CA3AF', true, true, 999, 0, target_family_id);

  INSERT INTO public.categories (id, name, slug, type, status, icon, color, is_default, is_system, sort_order, depth, family_id)
  VALUES (gen_random_uuid(), 'Food & Dining', 'food-dining', 'EXPENSE', 'ACTIVE', 'utensils', '#F59E0B', true, false, 10, 0, target_family_id)
  RETURNING id INTO food_id;

  INSERT INTO public.categories (id, name, slug, type, status, icon, color, is_default, is_system, sort_order, depth, family_id)
  VALUES (gen_random_uuid(), 'Bills & Utilities', 'bills', 'EXPENSE', 'ACTIVE', 'document-text', '#EF4444', true, false, 20, 0, target_family_id)
  RETURNING id INTO bills_id;

  INSERT INTO public.categories (id, name, slug, type, status, icon, color, is_default, is_system, sort_order, depth, family_id)
  VALUES (gen_random_uuid(), 'Shopping', 'shopping', 'EXPENSE', 'ACTIVE', 'shopping-bag', '#8B5CF6', true, false, 30, 0, target_family_id)
  RETURNING id INTO shopping_id;

  INSERT INTO public.categories (id, name, slug, type, status, icon, color, is_default, is_system, sort_order, depth, family_id)
  VALUES (gen_random_uuid(), 'Transportation', 'transportation', 'EXPENSE', 'ACTIVE', 'truck', '#3B82F6', true, false, 40, 0, target_family_id)
  RETURNING id INTO transport_id;

  INSERT INTO public.categories (id, name, slug, type, status, icon, color, is_default, is_system, sort_order, depth, family_id)
  VALUES (gen_random_uuid(), 'Housing', 'housing', 'EXPENSE', 'ACTIVE', 'home', '#10B981', true, false, 50, 0, target_family_id)
  RETURNING id INTO housing_id;

  INSERT INTO public.categories (id, name, slug, type, status, icon, color, is_default, is_system, sort_order, depth, family_id)
  VALUES (gen_random_uuid(), 'Entertainment', 'entertainment', 'EXPENSE', 'ACTIVE', 'sparkles', '#EC4899', true, false, 60, 0, target_family_id)
  RETURNING id INTO entertainment_id;

  INSERT INTO public.categories (id, name, slug, type, status, icon, color, is_default, is_system, sort_order, depth, family_id)
  VALUES (gen_random_uuid(), 'Health & Fitness', 'health-fitness', 'EXPENSE', 'ACTIVE', 'heart', '#14B8A6', true, false, 70, 0, target_family_id)
  RETURNING id INTO health_id;

  -- Standalone expense parents (no children)
  INSERT INTO public.categories (id, name, slug, type, status, icon, color, is_default, is_system, sort_order, depth, family_id) VALUES
    (gen_random_uuid(), 'Personal Care', 'personal-care', 'EXPENSE', 'ACTIVE', 'user', '#F472B6', true, false, 80, 0, target_family_id),
    (gen_random_uuid(), 'Education', 'education', 'EXPENSE', 'ACTIVE', 'academic-cap', '#6366F1', true, false, 90, 0, target_family_id),
    (gen_random_uuid(), 'Travel', 'travel', 'EXPENSE', 'ACTIVE', 'airplane', '#0EA5E9', true, false, 100, 0, target_family_id),
    (gen_random_uuid(), 'Gifts & Donations', 'gifts-donations', 'EXPENSE', 'ACTIVE', 'gift', '#F97316', true, false, 110, 0, target_family_id),
    (gen_random_uuid(), 'Pets', 'pets', 'EXPENSE', 'ACTIVE', 'paw', '#A855F7', true, false, 120, 0, target_family_id),
    (gen_random_uuid(), 'Kids', 'kids', 'EXPENSE', 'ACTIVE', 'child', '#22D3EE', true, false, 130, 0, target_family_id),
    (gen_random_uuid(), 'Taxes', 'taxes', 'EXPENSE', 'ACTIVE', 'receipt-percent', '#64748B', true, false, 140, 0, target_family_id),
    (gen_random_uuid(), 'Fees & Charges', 'fees-charges', 'EXPENSE', 'ACTIVE', 'banknotes', '#78716C', true, false, 150, 0, target_family_id);

  -- ========== EXPENSE CHILD CATEGORIES ==========

  -- Food & Dining children
  INSERT INTO public.categories (id, name, slug, type, status, icon, color, is_default, is_system, sort_order, depth, parent_id, family_id) VALUES
    (gen_random_uuid(), 'Groceries', 'groceries', 'EXPENSE', 'ACTIVE', 'shopping-cart', '#F59E0B', true, false, 11, 1, food_id, target_family_id),
    (gen_random_uuid(), 'Restaurants', 'restaurants', 'EXPENSE', 'ACTIVE', 'building-storefront', '#F59E0B', true, false, 12, 1, food_id, target_family_id),
    (gen_random_uuid(), 'Coffee Shops', 'coffee-shops', 'EXPENSE', 'ACTIVE', 'coffee', '#F59E0B', true, false, 13, 1, food_id, target_family_id);

  -- Bills & Utilities children
  INSERT INTO public.categories (id, name, slug, type, status, icon, color, is_default, is_system, sort_order, depth, parent_id, family_id) VALUES
    (gen_random_uuid(), 'Utilities', 'utilities', 'EXPENSE', 'ACTIVE', 'bolt', '#EF4444', true, false, 21, 1, bills_id, target_family_id),
    (gen_random_uuid(), 'Phone', 'phone', 'EXPENSE', 'ACTIVE', 'phone', '#EF4444', true, false, 22, 1, bills_id, target_family_id),
    (gen_random_uuid(), 'Internet', 'internet', 'EXPENSE', 'ACTIVE', 'wifi', '#EF4444', true, false, 23, 1, bills_id, target_family_id),
    (gen_random_uuid(), 'Insurance', 'insurance', 'EXPENSE', 'ACTIVE', 'shield-check', '#EF4444', true, false, 24, 1, bills_id, target_family_id);

  -- Shopping children
  INSERT INTO public.categories (id, name, slug, type, status, icon, color, is_default, is_system, sort_order, depth, parent_id, family_id) VALUES
    (gen_random_uuid(), 'Clothing', 'clothing', 'EXPENSE', 'ACTIVE', 'shirt', '#8B5CF6', true, false, 31, 1, shopping_id, target_family_id),
    (gen_random_uuid(), 'Electronics', 'electronics', 'EXPENSE', 'ACTIVE', 'computer-desktop', '#8B5CF6', true, false, 32, 1, shopping_id, target_family_id);

  -- Transportation children
  INSERT INTO public.categories (id, name, slug, type, status, icon, color, is_default, is_system, sort_order, depth, parent_id, family_id) VALUES
    (gen_random_uuid(), 'Gas & Fuel', 'gas-fuel', 'EXPENSE', 'ACTIVE', 'fire', '#3B82F6', true, false, 41, 1, transport_id, target_family_id),
    (gen_random_uuid(), 'Public Transit', 'public-transit', 'EXPENSE', 'ACTIVE', 'train', '#3B82F6', true, false, 42, 1, transport_id, target_family_id),
    (gen_random_uuid(), 'Parking', 'parking', 'EXPENSE', 'ACTIVE', 'parking', '#3B82F6', true, false, 43, 1, transport_id, target_family_id);

  -- Housing children
  INSERT INTO public.categories (id, name, slug, type, status, icon, color, is_default, is_system, sort_order, depth, parent_id, family_id) VALUES
    (gen_random_uuid(), 'Rent', 'rent', 'EXPENSE', 'ACTIVE', 'key', '#10B981', true, false, 51, 1, housing_id, target_family_id),
    (gen_random_uuid(), 'Mortgage', 'mortgage', 'EXPENSE', 'ACTIVE', 'building-library', '#10B981', true, false, 52, 1, housing_id, target_family_id),
    (gen_random_uuid(), 'Home Maintenance', 'home-maintenance', 'EXPENSE', 'ACTIVE', 'wrench', '#10B981', true, false, 53, 1, housing_id, target_family_id);

  -- Entertainment children
  INSERT INTO public.categories (id, name, slug, type, status, icon, color, is_default, is_system, sort_order, depth, parent_id, family_id) VALUES
    (gen_random_uuid(), 'Streaming Services', 'streaming', 'EXPENSE', 'ACTIVE', 'play', '#EC4899', true, false, 61, 1, entertainment_id, target_family_id),
    (gen_random_uuid(), 'Movies & Events', 'movies-events', 'EXPENSE', 'ACTIVE', 'ticket', '#EC4899', true, false, 62, 1, entertainment_id, target_family_id);

  -- Health & Fitness children
  INSERT INTO public.categories (id, name, slug, type, status, icon, color, is_default, is_system, sort_order, depth, parent_id, family_id) VALUES
    (gen_random_uuid(), 'Medical', 'medical', 'EXPENSE', 'ACTIVE', 'medical-bag', '#14B8A6', true, false, 71, 1, health_id, target_family_id),
    (gen_random_uuid(), 'Gym', 'gym', 'EXPENSE', 'ACTIVE', 'dumbbell', '#14B8A6', true, false, 72, 1, health_id, target_family_id);

  -- ========== INCOME CATEGORIES ==========

  INSERT INTO public.categories (id, name, slug, type, status, icon, color, is_default, is_system, sort_order, depth, family_id)
  VALUES (gen_random_uuid(), 'Salary', 'salary', 'INCOME', 'ACTIVE', 'briefcase', '#22C55E', true, false, 10, 0, target_family_id);

  INSERT INTO public.categories (id, name, slug, type, status, icon, color, is_default, is_system, sort_order, depth, family_id)
  VALUES (gen_random_uuid(), 'Investments', 'investments', 'INCOME', 'ACTIVE', 'chart-bar', '#3B82F6', true, false, 20, 0, target_family_id)
  RETURNING id INTO investments_id;

  -- Investments children
  INSERT INTO public.categories (id, name, slug, type, status, icon, color, is_default, is_system, sort_order, depth, parent_id, family_id) VALUES
    (gen_random_uuid(), 'Dividends', 'dividends', 'INCOME', 'ACTIVE', 'currency-dollar', '#3B82F6', true, false, 21, 1, investments_id, target_family_id),
    (gen_random_uuid(), 'Interest', 'interest', 'INCOME', 'ACTIVE', 'percent', '#3B82F6', true, false, 22, 1, investments_id, target_family_id);

  -- Standalone income categories
  INSERT INTO public.categories (id, name, slug, type, status, icon, color, is_default, is_system, sort_order, depth, family_id) VALUES
    (gen_random_uuid(), 'Freelance', 'freelance', 'INCOME', 'ACTIVE', 'laptop', '#8B5CF6', true, false, 30, 0, target_family_id),
    (gen_random_uuid(), 'Rental Income', 'rental-income', 'INCOME', 'ACTIVE', 'building-office', '#F59E0B', true, false, 40, 0, target_family_id),
    (gen_random_uuid(), 'Bonus', 'bonus', 'INCOME', 'ACTIVE', 'star', '#EAB308', true, false, 50, 0, target_family_id),
    (gen_random_uuid(), 'Refunds', 'refunds', 'INCOME', 'ACTIVE', 'arrow-uturn-left', '#14B8A6', true, false, 60, 0, target_family_id),
    (gen_random_uuid(), 'Gifts Received', 'gifts-received', 'INCOME', 'ACTIVE', 'gift', '#EC4899', true, false, 70, 0, target_family_id),
    (gen_random_uuid(), 'Other Income', 'other-income', 'INCOME', 'ACTIVE', 'plus-circle', '#9CA3AF', true, false, 999, 0, target_family_id);
END;
$$;

-- ============================================================================
-- SECTION 2: UPDATE handle_new_user TO SEED CATEGORIES ON SIGNUP
-- ============================================================================

CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_family_id UUID;
BEGIN
  -- Create a new single-member family
  INSERT INTO public.families (id, name, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    COALESCE(NEW.raw_user_meta_data->>'family_name', 'La mia famiglia'),
    now(),
    now()
  )
  RETURNING id INTO new_family_id;

  -- Create the user profile (first user = ADMIN)
  INSERT INTO public.profiles (
    id, first_name, last_name, role, status, currency, family_id, created_at, updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    'ADMIN',
    'ACTIVE',
    COALESCE(NEW.raw_user_meta_data->>'currency', 'EUR'),
    new_family_id,
    now(),
    now()
  );

  -- Seed default categories for the new family
  PERFORM private.seed_default_categories(new_family_id);

  RETURN NEW;
END;
$$;

-- ============================================================================
-- SECTION 3: ANALYTICS RPC FUNCTIONS (callable via supabase.rpc())
-- These run as the calling user and respect RLS.
-- ============================================================================

-- 3.1 Category spending rollup with hierarchical aggregation
CREATE OR REPLACE FUNCTION public.get_category_spending(
  date_from DATE,
  date_to DATE,
  parent_only BOOLEAN DEFAULT true
)
RETURNS TABLE (
  category_id UUID,
  category_name TEXT,
  category_icon TEXT,
  category_color TEXT,
  total_amount NUMERIC,
  transaction_count BIGINT,
  percentage NUMERIC
)
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  WITH RECURSIVE my_family AS (
    SELECT family_id FROM public.profiles WHERE id = auth.uid()
  ),
  category_tree AS (
    -- Base: top-level categories
    SELECT c.id, c.name, c.icon, c.color, c.id AS root_id
    FROM public.categories c, my_family f
    WHERE c.family_id = f.family_id
      AND c.status = 'ACTIVE'
      AND c.parent_id IS NULL

    UNION ALL

    -- Recursive: children carry forward root_id
    SELECT c.id, c.name, c.icon, c.color, ct.root_id
    FROM public.categories c
    JOIN category_tree ct ON c.parent_id = ct.id
    WHERE c.status = 'ACTIVE'
  ),
  spending AS (
    SELECT
      CASE WHEN parent_only THEN ct.root_id ELSE ct.id END AS cat_id,
      ABS(t.amount) AS amt
    FROM category_tree ct
    JOIN public.transactions t ON t.category_id = ct.id
    JOIN public.accounts a ON t.account_id = a.id
    WHERE t.date >= date_from
      AND t.date <= date_to
      AND t.type = 'DEBIT'
      AND (a.user_id = auth.uid() OR a.family_id = (SELECT family_id FROM my_family))
  ),
  aggregated AS (
    SELECT
      cat_id,
      SUM(amt) AS total,
      COUNT(*) AS cnt
    FROM spending
    GROUP BY cat_id
  ),
  grand_total AS (
    SELECT COALESCE(SUM(total), 0) AS gt FROM aggregated
  )
  SELECT
    ag.cat_id AS category_id,
    c.name::TEXT AS category_name,
    c.icon::TEXT AS category_icon,
    c.color::TEXT AS category_color,
    ag.total AS total_amount,
    ag.cnt AS transaction_count,
    CASE WHEN gt.gt > 0
      THEN ROUND((ag.total / gt.gt) * 100, 1)
      ELSE 0
    END AS percentage
  FROM aggregated ag
  JOIN public.categories c ON c.id = ag.cat_id
  CROSS JOIN grand_total gt
  ORDER BY ag.total DESC;
$$;

-- 3.2 Dashboard stats: balance, income, expenses, savings rate
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(
  period TEXT DEFAULT 'MONTHLY'
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  my_fid UUID;
  period_start DATE;
  prev_period_start DATE;
  prev_period_end DATE;
  result JSON;
BEGIN
  SELECT family_id INTO my_fid FROM public.profiles WHERE id = auth.uid();

  -- Calculate period boundaries
  CASE period
    WHEN 'WEEKLY' THEN
      period_start := date_trunc('week', CURRENT_DATE)::DATE;
      prev_period_start := (period_start - INTERVAL '7 days')::DATE;
      prev_period_end := (period_start - INTERVAL '1 day')::DATE;
    WHEN 'YEARLY' THEN
      period_start := date_trunc('year', CURRENT_DATE)::DATE;
      prev_period_start := (period_start - INTERVAL '1 year')::DATE;
      prev_period_end := (period_start - INTERVAL '1 day')::DATE;
    ELSE -- MONTHLY
      period_start := date_trunc('month', CURRENT_DATE)::DATE;
      prev_period_start := (period_start - INTERVAL '1 month')::DATE;
      prev_period_end := (period_start - INTERVAL '1 day')::DATE;
  END CASE;

  SELECT json_build_object(
    'totalBalance', COALESCE((
      SELECT SUM(current_balance) FROM public.accounts
      WHERE (user_id = auth.uid() OR family_id = my_fid)
        AND status = 'ACTIVE'
    ), 0),
    'monthlyIncome', COALESCE((
      SELECT SUM(amount) FROM public.transactions t
      JOIN public.accounts a ON t.account_id = a.id
      WHERE (a.user_id = auth.uid() OR a.family_id = my_fid)
        AND t.type = 'CREDIT'
        AND t.date >= period_start
        AND t.status = 'POSTED'
    ), 0),
    'monthlyExpenses', COALESCE((
      SELECT SUM(amount) FROM public.transactions t
      JOIN public.accounts a ON t.account_id = a.id
      WHERE (a.user_id = auth.uid() OR a.family_id = my_fid)
        AND t.type = 'DEBIT'
        AND t.date >= period_start
        AND t.status = 'POSTED'
    ), 0),
    'prevIncome', COALESCE((
      SELECT SUM(amount) FROM public.transactions t
      JOIN public.accounts a ON t.account_id = a.id
      WHERE (a.user_id = auth.uid() OR a.family_id = my_fid)
        AND t.type = 'CREDIT'
        AND t.date >= prev_period_start AND t.date <= prev_period_end
        AND t.status = 'POSTED'
    ), 0),
    'prevExpenses', COALESCE((
      SELECT SUM(amount) FROM public.transactions t
      JOIN public.accounts a ON t.account_id = a.id
      WHERE (a.user_id = auth.uid() OR a.family_id = my_fid)
        AND t.type = 'DEBIT'
        AND t.date >= prev_period_start AND t.date <= prev_period_end
        AND t.status = 'POSTED'
    ), 0),
    'accountCount', (
      SELECT COUNT(*) FROM public.accounts
      WHERE (user_id = auth.uid() OR family_id = my_fid)
        AND status = 'ACTIVE'
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- 3.3 Spending trends (time-series data for charts)
CREATE OR REPLACE FUNCTION public.get_spending_trends(
  period TEXT DEFAULT 'MONTHLY',
  num_periods INT DEFAULT 12
)
RETURNS TABLE (
  period_date DATE,
  income NUMERIC,
  expenses NUMERIC
)
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  WITH my_family AS (
    SELECT family_id FROM public.profiles WHERE id = auth.uid()
  ),
  date_series AS (
    SELECT generate_series(
      CASE period
        WHEN 'WEEKLY'  THEN (CURRENT_DATE - (num_periods * 7 || ' days')::INTERVAL)::DATE
        WHEN 'YEARLY'  THEN (CURRENT_DATE - (num_periods || ' years')::INTERVAL)::DATE
        ELSE (CURRENT_DATE - (num_periods || ' months')::INTERVAL)::DATE
      END,
      CURRENT_DATE,
      CASE period
        WHEN 'WEEKLY'  THEN '1 week'::INTERVAL
        WHEN 'YEARLY'  THEN '1 year'::INTERVAL
        ELSE '1 month'::INTERVAL
      END
    )::DATE AS bucket_start
  ),
  tx_data AS (
    SELECT
      t.date,
      t.type,
      t.amount
    FROM public.transactions t
    JOIN public.accounts a ON t.account_id = a.id
    CROSS JOIN my_family f
    WHERE (a.user_id = auth.uid() OR a.family_id = f.family_id)
      AND t.status = 'POSTED'
      AND t.date >= (SELECT MIN(bucket_start) FROM date_series)
  )
  SELECT
    ds.bucket_start AS period_date,
    COALESCE(SUM(CASE WHEN tx.type = 'CREDIT' THEN tx.amount END), 0) AS income,
    COALESCE(SUM(CASE WHEN tx.type = 'DEBIT' THEN tx.amount END), 0) AS expenses
  FROM date_series ds
  LEFT JOIN tx_data tx ON tx.date >= ds.bucket_start
    AND tx.date < ds.bucket_start + CASE period
      WHEN 'WEEKLY'  THEN '1 week'::INTERVAL
      WHEN 'YEARLY'  THEN '1 year'::INTERVAL
      ELSE '1 month'::INTERVAL
    END
  GROUP BY ds.bucket_start
  ORDER BY ds.bucket_start;
$$;

-- 3.4 Balance summary per account (for dashboard account list)
CREATE OR REPLACE FUNCTION public.get_balance_summary()
RETURNS TABLE (
  account_id UUID,
  account_name TEXT,
  account_type public.account_type,
  current_balance NUMERIC,
  currency TEXT,
  institution_name TEXT,
  last_sync_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT
    a.id AS account_id,
    a.name::TEXT AS account_name,
    a.type AS account_type,
    a.current_balance,
    a.currency::TEXT,
    a.institution_name::TEXT,
    a.last_sync_at
  FROM public.accounts a
  WHERE (a.user_id = auth.uid() OR a.family_id = (
    SELECT family_id FROM public.profiles WHERE id = auth.uid()
  ))
    AND a.status = 'ACTIVE'
  ORDER BY a.current_balance DESC;
$$;
