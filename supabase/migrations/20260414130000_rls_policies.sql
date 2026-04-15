-- ============================================================================
-- MoneyWise (Zecca) — RLS Policies Migration
-- Phase 0, Week 1 Day 3-4: Family isolation + role-based access
--
-- Security fixes:
--   - Move SECURITY DEFINER functions from public → private schema
--   - Create helper functions for RLS (get_my_family_id, get_my_role)
--
-- RLS policy design:
--   - Family-scoped tables: family_id = user's family
--   - User-scoped tables: user_id = auth.uid()
--   - Indirect tables: chain through FK to a protected parent table
--   - Role enforcement: ADMIN/MEMBER can write, VIEWER is read-only
--   - Service-only tables: no write policies (Edge Functions use service_role)
--
-- Note: RLS is already ENABLED on all 20 tables (Supabase default).
-- ============================================================================

-- ============================================================================
-- SECTION 1: PRIVATE SCHEMA + SECURITY FIXES
-- ============================================================================

-- Create private schema (NOT exposed via Data API — only public is exposed)
CREATE SCHEMA IF NOT EXISTS private;

-- 1.1 Helper: get current user's family_id (bypasses RLS on profiles)
-- Used in all family-scoped policies to avoid circular RLS references.
CREATE OR REPLACE FUNCTION private.get_my_family_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT family_id FROM public.profiles WHERE id = auth.uid()
$$;

-- 1.2 Helper: get current user's role (bypasses RLS on profiles)
CREATE OR REPLACE FUNCTION private.get_my_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

-- 1.3 Move handle_new_user from public to private (SECURITY DEFINER fix)
CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_family_id UUID;
BEGIN
  INSERT INTO public.families (id, name, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    COALESCE(NEW.raw_user_meta_data->>'family_name', 'La mia famiglia'),
    now(),
    now()
  )
  RETURNING id INTO new_family_id;

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

  RETURN NEW;
END;
$$;

-- Recreate trigger pointing to private schema
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.handle_new_user();

-- Drop the public version
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 1.4 Move enforce_category_depth from public to private
CREATE OR REPLACE FUNCTION private.enforce_category_depth()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  parent_depth INT;
BEGIN
  IF NEW.parent_id IS NULL THEN
    NEW.depth = 0;
  ELSE
    SELECT depth INTO parent_depth
    FROM public.categories
    WHERE id = NEW.parent_id;

    IF parent_depth IS NULL THEN
      RAISE EXCEPTION 'Parent category not found: %', NEW.parent_id;
    END IF;

    IF parent_depth >= 2 THEN
      RAISE EXCEPTION 'Maximum category depth (3 levels) exceeded. Parent depth: %', parent_depth;
    END IF;

    NEW.depth = parent_depth + 1;
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate trigger pointing to private schema
DROP TRIGGER IF EXISTS trg_category_depth ON public.categories;
CREATE TRIGGER trg_category_depth
  BEFORE INSERT OR UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION private.enforce_category_depth();

-- Drop the public version
DROP FUNCTION IF EXISTS public.enforce_category_depth();

-- ============================================================================
-- SECTION 2: FAMILY-SCOPED TABLE POLICIES
-- Tables with direct family_id column
-- ============================================================================

-- --------------------------------------------------------------------------
-- 2.1 FAMILIES
-- Only visible to members. Only ADMIN can update. No client INSERT/DELETE.
-- --------------------------------------------------------------------------
CREATE POLICY "Users can view own family"
  ON families FOR SELECT
  USING (id = private.get_my_family_id());

CREATE POLICY "Admins can update own family"
  ON families FOR UPDATE
  USING (
    id = private.get_my_family_id()
    AND private.get_my_role() = 'ADMIN'
  )
  WITH CHECK (id = private.get_my_family_id());

-- --------------------------------------------------------------------------
-- 2.2 PROFILES
-- Family members can see each other. Users can update own profile only.
-- INSERT/DELETE handled by trigger/service (not client).
-- --------------------------------------------------------------------------
CREATE POLICY "Users can view family profiles"
  ON profiles FOR SELECT
  USING (family_id = private.get_my_family_id());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND family_id = private.get_my_family_id());

-- --------------------------------------------------------------------------
-- 2.3 ACCOUNTS
-- Dual ownership: user_id (personal) XOR family_id (shared).
-- ADMIN/MEMBER can write, VIEWER is read-only.
-- --------------------------------------------------------------------------
CREATE POLICY "Users can view accessible accounts"
  ON accounts FOR SELECT
  USING (
    user_id = auth.uid()
    OR family_id = private.get_my_family_id()
  );

CREATE POLICY "Members can create accounts"
  ON accounts FOR INSERT
  WITH CHECK (
    (user_id = auth.uid() OR family_id = private.get_my_family_id())
    AND private.get_my_role() IN ('ADMIN', 'MEMBER')
  );

CREATE POLICY "Members can update accessible accounts"
  ON accounts FOR UPDATE
  USING (
    (user_id = auth.uid() OR family_id = private.get_my_family_id())
    AND private.get_my_role() IN ('ADMIN', 'MEMBER')
  )
  WITH CHECK (user_id = auth.uid() OR family_id = private.get_my_family_id());

CREATE POLICY "Members can delete accessible accounts"
  ON accounts FOR DELETE
  USING (
    (user_id = auth.uid() OR family_id = private.get_my_family_id())
    AND private.get_my_role() IN ('ADMIN', 'MEMBER')
  );

-- --------------------------------------------------------------------------
-- 2.4 CATEGORIES
-- Family-scoped. ADMIN/MEMBER can write, VIEWER is read-only.
-- --------------------------------------------------------------------------
CREATE POLICY "Users can view family categories"
  ON categories FOR SELECT
  USING (family_id = private.get_my_family_id());

CREATE POLICY "Members can create categories"
  ON categories FOR INSERT
  WITH CHECK (
    family_id = private.get_my_family_id()
    AND private.get_my_role() IN ('ADMIN', 'MEMBER')
  );

CREATE POLICY "Members can update family categories"
  ON categories FOR UPDATE
  USING (
    family_id = private.get_my_family_id()
    AND private.get_my_role() IN ('ADMIN', 'MEMBER')
  );

CREATE POLICY "Members can delete family categories"
  ON categories FOR DELETE
  USING (
    family_id = private.get_my_family_id()
    AND private.get_my_role() IN ('ADMIN', 'MEMBER')
  );

-- --------------------------------------------------------------------------
-- 2.5 BUDGETS
-- Family-scoped. ADMIN/MEMBER can write, VIEWER is read-only.
-- --------------------------------------------------------------------------
CREATE POLICY "Users can view family budgets"
  ON budgets FOR SELECT
  USING (family_id = private.get_my_family_id());

CREATE POLICY "Members can create budgets"
  ON budgets FOR INSERT
  WITH CHECK (
    family_id = private.get_my_family_id()
    AND private.get_my_role() IN ('ADMIN', 'MEMBER')
  );

CREATE POLICY "Members can update family budgets"
  ON budgets FOR UPDATE
  USING (
    family_id = private.get_my_family_id()
    AND private.get_my_role() IN ('ADMIN', 'MEMBER')
  );

CREATE POLICY "Members can delete family budgets"
  ON budgets FOR DELETE
  USING (
    family_id = private.get_my_family_id()
    AND private.get_my_role() IN ('ADMIN', 'MEMBER')
  );

-- --------------------------------------------------------------------------
-- 2.6 LIABILITIES
-- Family-scoped. ADMIN/MEMBER can write, VIEWER is read-only.
-- --------------------------------------------------------------------------
CREATE POLICY "Users can view family liabilities"
  ON liabilities FOR SELECT
  USING (family_id = private.get_my_family_id());

CREATE POLICY "Members can create liabilities"
  ON liabilities FOR INSERT
  WITH CHECK (
    family_id = private.get_my_family_id()
    AND private.get_my_role() IN ('ADMIN', 'MEMBER')
  );

CREATE POLICY "Members can update family liabilities"
  ON liabilities FOR UPDATE
  USING (
    family_id = private.get_my_family_id()
    AND private.get_my_role() IN ('ADMIN', 'MEMBER')
  );

CREATE POLICY "Members can delete family liabilities"
  ON liabilities FOR DELETE
  USING (
    family_id = private.get_my_family_id()
    AND private.get_my_role() IN ('ADMIN', 'MEMBER')
  );

-- --------------------------------------------------------------------------
-- 2.7 SCHEDULED TRANSACTIONS
-- Family-scoped. ADMIN/MEMBER can write, VIEWER is read-only.
-- --------------------------------------------------------------------------
CREATE POLICY "Users can view family scheduled transactions"
  ON scheduled_transactions FOR SELECT
  USING (family_id = private.get_my_family_id());

CREATE POLICY "Members can create scheduled transactions"
  ON scheduled_transactions FOR INSERT
  WITH CHECK (
    family_id = private.get_my_family_id()
    AND private.get_my_role() IN ('ADMIN', 'MEMBER')
  );

CREATE POLICY "Members can update family scheduled transactions"
  ON scheduled_transactions FOR UPDATE
  USING (
    family_id = private.get_my_family_id()
    AND private.get_my_role() IN ('ADMIN', 'MEMBER')
  );

CREATE POLICY "Members can delete family scheduled transactions"
  ON scheduled_transactions FOR DELETE
  USING (
    family_id = private.get_my_family_id()
    AND private.get_my_role() IN ('ADMIN', 'MEMBER')
  );

-- ============================================================================
-- SECTION 3: USER-SCOPED TABLE POLICIES
-- Tables with user_id — private to each user, not shared with family
-- ============================================================================

-- --------------------------------------------------------------------------
-- 3.1 BANKING CUSTOMERS
-- User-private. ADMIN/MEMBER can manage own banking credentials.
-- --------------------------------------------------------------------------
CREATE POLICY "Users can view own banking customers"
  ON banking_customers FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Members can create banking customers"
  ON banking_customers FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND private.get_my_role() IN ('ADMIN', 'MEMBER')
  );

CREATE POLICY "Members can update own banking customers"
  ON banking_customers FOR UPDATE
  USING (user_id = auth.uid() AND private.get_my_role() IN ('ADMIN', 'MEMBER'));

CREATE POLICY "Members can delete own banking customers"
  ON banking_customers FOR DELETE
  USING (user_id = auth.uid() AND private.get_my_role() IN ('ADMIN', 'MEMBER'));

-- --------------------------------------------------------------------------
-- 3.2 BANKING CONNECTIONS
-- User-private. ADMIN/MEMBER can manage own connections.
-- --------------------------------------------------------------------------
CREATE POLICY "Users can view own banking connections"
  ON banking_connections FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Members can create banking connections"
  ON banking_connections FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND private.get_my_role() IN ('ADMIN', 'MEMBER')
  );

CREATE POLICY "Members can update own banking connections"
  ON banking_connections FOR UPDATE
  USING (user_id = auth.uid() AND private.get_my_role() IN ('ADMIN', 'MEMBER'));

CREATE POLICY "Members can delete own banking connections"
  ON banking_connections FOR DELETE
  USING (user_id = auth.uid() AND private.get_my_role() IN ('ADMIN', 'MEMBER'));

-- --------------------------------------------------------------------------
-- 3.3 USER PREFERENCES
-- User-private. Any authenticated user can manage own preferences.
-- --------------------------------------------------------------------------
CREATE POLICY "Users can view own preferences"
  ON user_preferences FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own preferences"
  ON user_preferences FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own preferences"
  ON user_preferences FOR DELETE
  USING (user_id = auth.uid());

-- --------------------------------------------------------------------------
-- 3.4 NOTIFICATIONS
-- User-private. INSERT by service only. User can read and dismiss.
-- --------------------------------------------------------------------------
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (user_id = auth.uid());

-- --------------------------------------------------------------------------
-- 3.5 PUSH SUBSCRIPTIONS
-- User-private. User can register/unregister own devices.
-- --------------------------------------------------------------------------
CREATE POLICY "Users can view own push subscriptions"
  ON push_subscriptions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create push subscriptions"
  ON push_subscriptions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own push subscriptions"
  ON push_subscriptions FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own push subscriptions"
  ON push_subscriptions FOR DELETE
  USING (user_id = auth.uid());

-- --------------------------------------------------------------------------
-- 3.6 USER ACHIEVEMENTS
-- User-private for read. INSERT/UPDATE by service only (achievement engine).
-- --------------------------------------------------------------------------
CREATE POLICY "Users can view own achievements"
  ON user_achievements FOR SELECT
  USING (user_id = auth.uid());

-- --------------------------------------------------------------------------
-- 3.7 AUDIT LOGS
-- User-private for read. INSERT by service only. Immutable (no UPDATE/DELETE).
-- --------------------------------------------------------------------------
CREATE POLICY "Users can view own audit logs"
  ON audit_logs FOR SELECT
  USING (user_id = auth.uid());

-- ============================================================================
-- SECTION 4: INDIRECT-SCOPE TABLE POLICIES
-- Tables without family_id — access determined by FK chain to a parent table
-- ============================================================================

-- --------------------------------------------------------------------------
-- 4.1 TRANSACTIONS
-- Scoped through account_id → accounts (which has family/user isolation).
-- ADMIN/MEMBER can write. VIEWER is read-only.
-- --------------------------------------------------------------------------
CREATE POLICY "Users can view transactions in accessible accounts"
  ON transactions FOR SELECT
  USING (
    account_id IN (
      SELECT id FROM accounts
      WHERE user_id = auth.uid()
         OR family_id = private.get_my_family_id()
    )
  );

CREATE POLICY "Members can create transactions"
  ON transactions FOR INSERT
  WITH CHECK (
    account_id IN (
      SELECT id FROM accounts
      WHERE user_id = auth.uid()
         OR family_id = private.get_my_family_id()
    )
    AND private.get_my_role() IN ('ADMIN', 'MEMBER')
  );

CREATE POLICY "Members can update transactions"
  ON transactions FOR UPDATE
  USING (
    account_id IN (
      SELECT id FROM accounts
      WHERE user_id = auth.uid()
         OR family_id = private.get_my_family_id()
    )
    AND private.get_my_role() IN ('ADMIN', 'MEMBER')
  );

CREATE POLICY "Members can delete transactions"
  ON transactions FOR DELETE
  USING (
    account_id IN (
      SELECT id FROM accounts
      WHERE user_id = auth.uid()
         OR family_id = private.get_my_family_id()
    )
    AND private.get_my_role() IN ('ADMIN', 'MEMBER')
  );

-- --------------------------------------------------------------------------
-- 4.2 BANKING SYNC LOGS
-- Scoped through account_id → accounts. Read-only (INSERT by service).
-- --------------------------------------------------------------------------
CREATE POLICY "Users can view sync logs for accessible accounts"
  ON banking_sync_logs FOR SELECT
  USING (
    account_id IN (
      SELECT id FROM accounts
      WHERE user_id = auth.uid()
         OR family_id = private.get_my_family_id()
    )
  );

-- --------------------------------------------------------------------------
-- 4.3 INSTALLMENT PLANS
-- Scoped through liability_id → liabilities (family-scoped).
-- ADMIN/MEMBER can write.
-- --------------------------------------------------------------------------
CREATE POLICY "Users can view family installment plans"
  ON installment_plans FOR SELECT
  USING (
    liability_id IN (
      SELECT id FROM liabilities
      WHERE family_id = private.get_my_family_id()
    )
  );

CREATE POLICY "Members can create installment plans"
  ON installment_plans FOR INSERT
  WITH CHECK (
    liability_id IN (
      SELECT id FROM liabilities
      WHERE family_id = private.get_my_family_id()
    )
    AND private.get_my_role() IN ('ADMIN', 'MEMBER')
  );

CREATE POLICY "Members can update installment plans"
  ON installment_plans FOR UPDATE
  USING (
    liability_id IN (
      SELECT id FROM liabilities
      WHERE family_id = private.get_my_family_id()
    )
    AND private.get_my_role() IN ('ADMIN', 'MEMBER')
  );

CREATE POLICY "Members can delete installment plans"
  ON installment_plans FOR DELETE
  USING (
    liability_id IN (
      SELECT id FROM liabilities
      WHERE family_id = private.get_my_family_id()
    )
    AND private.get_my_role() IN ('ADMIN', 'MEMBER')
  );

-- --------------------------------------------------------------------------
-- 4.4 INSTALLMENTS
-- Scoped through plan_id → installment_plans → liabilities (family-scoped).
-- ADMIN/MEMBER can write.
-- --------------------------------------------------------------------------
CREATE POLICY "Users can view family installments"
  ON installments FOR SELECT
  USING (
    plan_id IN (
      SELECT id FROM installment_plans
      WHERE liability_id IN (
        SELECT id FROM liabilities
        WHERE family_id = private.get_my_family_id()
      )
    )
  );

CREATE POLICY "Members can create installments"
  ON installments FOR INSERT
  WITH CHECK (
    plan_id IN (
      SELECT id FROM installment_plans
      WHERE liability_id IN (
        SELECT id FROM liabilities
        WHERE family_id = private.get_my_family_id()
      )
    )
    AND private.get_my_role() IN ('ADMIN', 'MEMBER')
  );

CREATE POLICY "Members can update installments"
  ON installments FOR UPDATE
  USING (
    plan_id IN (
      SELECT id FROM installment_plans
      WHERE liability_id IN (
        SELECT id FROM liabilities
        WHERE family_id = private.get_my_family_id()
      )
    )
    AND private.get_my_role() IN ('ADMIN', 'MEMBER')
  );

CREATE POLICY "Members can delete installments"
  ON installments FOR DELETE
  USING (
    plan_id IN (
      SELECT id FROM installment_plans
      WHERE liability_id IN (
        SELECT id FROM liabilities
        WHERE family_id = private.get_my_family_id()
      )
    )
    AND private.get_my_role() IN ('ADMIN', 'MEMBER')
  );

-- --------------------------------------------------------------------------
-- 4.5 RECURRENCE RULES
-- Scoped through scheduled_transaction_id → scheduled_transactions (family-scoped).
-- ADMIN/MEMBER can write.
-- --------------------------------------------------------------------------
CREATE POLICY "Users can view family recurrence rules"
  ON recurrence_rules FOR SELECT
  USING (
    scheduled_transaction_id IN (
      SELECT id FROM scheduled_transactions
      WHERE family_id = private.get_my_family_id()
    )
  );

CREATE POLICY "Members can create recurrence rules"
  ON recurrence_rules FOR INSERT
  WITH CHECK (
    scheduled_transaction_id IN (
      SELECT id FROM scheduled_transactions
      WHERE family_id = private.get_my_family_id()
    )
    AND private.get_my_role() IN ('ADMIN', 'MEMBER')
  );

CREATE POLICY "Members can update recurrence rules"
  ON recurrence_rules FOR UPDATE
  USING (
    scheduled_transaction_id IN (
      SELECT id FROM scheduled_transactions
      WHERE family_id = private.get_my_family_id()
    )
    AND private.get_my_role() IN ('ADMIN', 'MEMBER')
  );

CREATE POLICY "Members can delete recurrence rules"
  ON recurrence_rules FOR DELETE
  USING (
    scheduled_transaction_id IN (
      SELECT id FROM scheduled_transactions
      WHERE family_id = private.get_my_family_id()
    )
    AND private.get_my_role() IN ('ADMIN', 'MEMBER')
  );

-- ============================================================================
-- SECTION 5: GLOBAL TABLE POLICIES
-- ============================================================================

-- --------------------------------------------------------------------------
-- 5.1 ACHIEVEMENTS
-- Global templates, read-only for all authenticated users.
-- INSERT/UPDATE/DELETE by service only (admin seeding).
-- --------------------------------------------------------------------------
CREATE POLICY "Authenticated users can view achievements"
  ON achievements FOR SELECT
  USING (auth.uid() IS NOT NULL);
