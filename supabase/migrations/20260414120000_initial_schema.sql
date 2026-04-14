-- ============================================================================
-- MoneyWise (Zecca) — Supabase Schema Migration
-- Phase 0: Initial Schema (Prisma → PostgreSQL)
-- Date: 2026-04-14
--
-- Converts the full Prisma schema (21 models, 27 enums) to Supabase SQL.
-- Key change: User model splits into auth.users + public.profiles.
-- Password history dropped (Supabase Auth handles this).
-- All currency defaults changed from USD to EUR (EU project).
-- ============================================================================

-- ============================================================================
-- SECTION 1: UTILITY FUNCTIONS
-- ============================================================================

-- Auto-update updated_at column on row modification
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SECTION 2: ENUM TYPES (27 total)
-- ============================================================================

-- User & auth enums
CREATE TYPE user_role AS ENUM ('ADMIN', 'MEMBER', 'VIEWER');
CREATE TYPE user_status AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- Account enums
CREATE TYPE account_type AS ENUM ('CHECKING', 'SAVINGS', 'CREDIT_CARD', 'INVESTMENT', 'LOAN', 'MORTGAGE', 'OTHER');
CREATE TYPE account_status AS ENUM ('ACTIVE', 'INACTIVE', 'HIDDEN', 'CLOSED', 'ERROR');
CREATE TYPE account_source AS ENUM ('SALTEDGE', 'TINK', 'YAPILY', 'PLAID', 'MANUAL');

-- Banking provider enums
CREATE TYPE banking_provider AS ENUM ('MANUAL', 'SALTEDGE', 'TINK', 'YAPILY', 'TRUELAYER');
CREATE TYPE banking_connection_status AS ENUM ('PENDING', 'IN_PROGRESS', 'AUTHORIZED', 'REVOKED', 'EXPIRED', 'FAILED');
CREATE TYPE banking_sync_status AS ENUM ('PENDING', 'SYNCING', 'SYNCED', 'ERROR', 'DISCONNECTED');

-- Transaction enums
CREATE TYPE transaction_type AS ENUM ('DEBIT', 'CREDIT');
CREATE TYPE flow_type AS ENUM ('EXPENSE', 'INCOME', 'TRANSFER', 'LIABILITY_PAYMENT', 'REFUND');
CREATE TYPE transfer_role AS ENUM ('SOURCE', 'DESTINATION');
CREATE TYPE transaction_status AS ENUM ('PENDING', 'POSTED', 'CANCELLED');
CREATE TYPE transaction_source AS ENUM ('PLAID', 'MANUAL', 'IMPORT', 'SALTEDGE');

-- Category enums
CREATE TYPE category_type AS ENUM ('INCOME', 'EXPENSE');
CREATE TYPE category_status AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- Budget enums
CREATE TYPE budget_period AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM');
CREATE TYPE budget_status AS ENUM ('ACTIVE', 'COMPLETED', 'DRAFT');

-- Achievement enums
CREATE TYPE achievement_type AS ENUM ('SAVINGS', 'BUDGET', 'CONSISTENCY', 'EDUCATION');
CREATE TYPE achievement_status AS ENUM ('LOCKED', 'IN_PROGRESS', 'UNLOCKED');

-- Liability enums
CREATE TYPE liability_type AS ENUM ('CREDIT_CARD', 'BNPL', 'LOAN', 'MORTGAGE', 'OTHER');
CREATE TYPE liability_status AS ENUM ('ACTIVE', 'PAID_OFF', 'CLOSED');

-- Notification enums
CREATE TYPE notification_type AS ENUM ('BUDGET_ALERT', 'BILL_REMINDER', 'TRANSACTION_ALERT', 'SYNC_ERROR', 'ACHIEVEMENT', 'SYSTEM');
CREATE TYPE notification_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE notification_status AS ENUM ('PENDING', 'SENT', 'READ', 'DISMISSED');

-- Scheduling enums
CREATE TYPE recurrence_frequency AS ENUM ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');
CREATE TYPE scheduled_transaction_status AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- Audit enums
CREATE TYPE audit_event_type AS ENUM (
  'PASSWORD_CHANGED', 'PASSWORD_RESET_REQUESTED', 'PASSWORD_RESET_COMPLETED',
  'LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGIN_LOCKED',
  'ACCOUNT_CREATED', 'ACCOUNT_DELETED', 'ACCOUNT_SUSPENDED', 'ACCOUNT_REACTIVATED',
  'TWO_FACTOR_ENABLED', 'TWO_FACTOR_DISABLED'
);

-- ============================================================================
-- SECTION 3: CORE TABLES
-- ============================================================================

-- 3.1 Families — core organizational unit for multi-tenancy
CREATE TABLE families (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.2 Profiles — replaces Prisma User model
-- id matches auth.users.id (1:1 relationship, same UUID)
-- email/password/verification handled by auth.users
CREATE TABLE profiles (
  id            UUID         PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name    VARCHAR(255) NOT NULL,
  last_name     VARCHAR(255) NOT NULL,
  role          user_role    NOT NULL DEFAULT 'MEMBER',
  status        user_status  NOT NULL DEFAULT 'ACTIVE',
  avatar        VARCHAR(255),
  timezone      VARCHAR(50),
  currency      VARCHAR(3)   NOT NULL DEFAULT 'EUR',
  preferences   JSONB,
  last_login_at TIMESTAMPTZ,
  family_id     UUID         NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_family_id      ON profiles(family_id);
CREATE INDEX idx_profiles_status_created ON profiles(status, created_at);
CREATE INDEX idx_profiles_family_role    ON profiles(family_id, role);

-- 3.3 Accounts — financial accounts (bank, credit card, investment, etc.)
-- Dual ownership: user_id XOR family_id (exactly one must be set)
CREATE TABLE accounts (
  id                     UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  name                   VARCHAR(255)      NOT NULL,
  type                   account_type      NOT NULL DEFAULT 'OTHER',
  status                 account_status    NOT NULL DEFAULT 'ACTIVE',
  source                 account_source    NOT NULL,
  current_balance        NUMERIC(15,2)     NOT NULL DEFAULT 0,
  available_balance      NUMERIC(15,2),
  credit_limit           NUMERIC(15,2),
  currency               VARCHAR(3)        NOT NULL DEFAULT 'EUR',
  institution_name       VARCHAR(255),
  account_number         VARCHAR(255),
  routing_number         VARCHAR(255),
  plaid_account_id       VARCHAR(255),
  plaid_item_id          VARCHAR(255),
  plaid_access_token     TEXT,
  plaid_metadata         JSONB,
  banking_provider       banking_provider,
  saltedge_account_id    VARCHAR(255),
  saltedge_connection_id VARCHAR(255),
  tink_account_id        VARCHAR(255),
  yapily_account_id      VARCHAR(255),
  sync_status            banking_sync_status NOT NULL DEFAULT 'PENDING',
  is_active              BOOLEAN           NOT NULL DEFAULT true,
  sync_enabled           BOOLEAN           NOT NULL DEFAULT true,
  last_sync_at           TIMESTAMPTZ,
  sync_error             VARCHAR(500),
  settings               JSONB,
  user_id                UUID              REFERENCES profiles(id) ON DELETE CASCADE,
  family_id              UUID              REFERENCES families(id) ON DELETE CASCADE,
  created_at             TIMESTAMPTZ       NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ       NOT NULL DEFAULT now(),
  CONSTRAINT chk_accounts_ownership      CHECK ((user_id IS NULL) != (family_id IS NULL)),
  CONSTRAINT uq_accounts_plaid_account   UNIQUE (plaid_account_id),
  CONSTRAINT uq_accounts_saltedge_account UNIQUE (saltedge_account_id),
  CONSTRAINT uq_accounts_tink_account    UNIQUE (tink_account_id),
  CONSTRAINT uq_accounts_yapily_account  UNIQUE (yapily_account_id)
);

CREATE INDEX idx_accounts_user_id        ON accounts(user_id);
CREATE INDEX idx_accounts_family_id      ON accounts(family_id);
CREATE INDEX idx_accounts_user_status    ON accounts(user_id, status);
CREATE INDEX idx_accounts_family_status  ON accounts(family_id, status);
CREATE INDEX idx_accounts_plaid_item     ON accounts(plaid_item_id);
CREATE INDEX idx_accounts_provider_sync  ON accounts(banking_provider, sync_status);

-- 3.4 Categories — hierarchical transaction classification
-- Self-referential tree: parent_id for parent-child hierarchy (max depth 3)
CREATE TABLE categories (
  id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255)    NOT NULL,
  slug        VARCHAR(255)    NOT NULL,
  description TEXT,
  type        category_type   NOT NULL,
  status      category_status NOT NULL DEFAULT 'ACTIVE',
  color       VARCHAR(7),
  icon        VARCHAR(100),
  is_default  BOOLEAN         NOT NULL DEFAULT false,
  is_system   BOOLEAN         NOT NULL DEFAULT false,
  sort_order  INT             NOT NULL DEFAULT 0,
  depth       INT             NOT NULL DEFAULT 0,
  rules       JSONB,
  metadata    JSONB,
  parent_id   UUID            REFERENCES categories(id) ON DELETE CASCADE,
  family_id   UUID            NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ     NOT NULL DEFAULT now(),
  CONSTRAINT uq_categories_family_slug UNIQUE (family_id, slug)
);

CREATE INDEX idx_categories_family_type   ON categories(family_id, type);
CREATE INDEX idx_categories_family_status ON categories(family_id, status);
CREATE INDEX idx_categories_parent_id     ON categories(parent_id);
CREATE INDEX idx_categories_type_status   ON categories(type, status);

-- 3.5 Transactions — individual financial transactions
-- Amount stored as absolute value; type (DEBIT/CREDIT) determines direction
CREATE TABLE transactions (
  id                      UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  amount                  NUMERIC(15,2)      NOT NULL,
  type                    transaction_type   NOT NULL,
  status                  transaction_status NOT NULL DEFAULT 'POSTED',
  source                  transaction_source NOT NULL,
  currency                VARCHAR(3)         NOT NULL DEFAULT 'EUR',
  flow_type               flow_type,
  transfer_group_id       UUID,
  transfer_role           transfer_role,
  date                    DATE               NOT NULL,
  authorized_date         TIMESTAMPTZ,
  description             VARCHAR(500)       NOT NULL,
  merchant_name           VARCHAR(255),
  original_description    VARCHAR(255),
  reference               VARCHAR(255),
  check_number            VARCHAR(255),
  notes                   TEXT,
  is_pending              BOOLEAN            NOT NULL DEFAULT false,
  is_recurring            BOOLEAN            NOT NULL DEFAULT false,
  is_hidden               BOOLEAN            NOT NULL DEFAULT false,
  include_in_budget       BOOLEAN            NOT NULL DEFAULT true,
  plaid_transaction_id    VARCHAR(255),
  plaid_account_id        VARCHAR(255),
  saltedge_transaction_id VARCHAR(255),
  plaid_metadata          JSONB,
  location                JSONB,
  tags                    JSONB,
  attachments             JSONB,
  split_details           JSONB,
  account_id              UUID               NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  category_id             UUID               REFERENCES categories(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ        NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ        NOT NULL DEFAULT now(),
  CONSTRAINT uq_transactions_plaid_id    UNIQUE (plaid_transaction_id),
  CONSTRAINT uq_transactions_saltedge_id UNIQUE (saltedge_transaction_id)
);

CREATE INDEX idx_transactions_account_date   ON transactions(account_id, date);
CREATE INDEX idx_transactions_category_date  ON transactions(category_id, date);
CREATE INDEX idx_transactions_status_date    ON transactions(status, date);
CREATE INDEX idx_transactions_merchant_date  ON transactions(merchant_name, date);
CREATE INDEX idx_transactions_amount_date    ON transactions(amount, date);
CREATE INDEX idx_transactions_flow_type_date ON transactions(flow_type, date);
CREATE INDEX idx_transactions_transfer_group ON transactions(transfer_group_id);

-- 3.6 Budgets — spending limits per category per family
CREATE TABLE budgets (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name             VARCHAR(255)  NOT NULL,
  amount           NUMERIC(15,2) NOT NULL,
  period           budget_period NOT NULL DEFAULT 'MONTHLY',
  status           budget_status NOT NULL DEFAULT 'ACTIVE',
  start_date       DATE          NOT NULL,
  end_date         DATE          NOT NULL,
  alert_thresholds INT[]         NOT NULL DEFAULT '{50,75,90}',
  settings         JSONB,
  notes            TEXT,
  category_id      UUID          NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  family_id        UUID          NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_budgets_family_status ON budgets(family_id, status);
CREATE INDEX idx_budgets_family_period ON budgets(family_id, period);
CREATE INDEX idx_budgets_category_id   ON budgets(category_id);
CREATE INDEX idx_budgets_date_range    ON budgets(start_date, end_date);

-- ============================================================================
-- SECTION 4: SUPPORTING TABLES
-- ============================================================================

-- 4.1 Achievements — gamification templates
CREATE TABLE achievements (
  id            UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  title         VARCHAR(255)     NOT NULL,
  description   TEXT             NOT NULL,
  type          achievement_type NOT NULL,
  icon          VARCHAR(100),
  points        INT              NOT NULL DEFAULT 0,
  requirements  JSONB            NOT NULL,
  sort_order    INT              NOT NULL DEFAULT 0,
  is_active     BOOLEAN          NOT NULL DEFAULT true,
  is_repeatable BOOLEAN          NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ      NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ      NOT NULL DEFAULT now()
);

CREATE INDEX idx_achievements_type_active ON achievements(type, is_active);
CREATE INDEX idx_achievements_sort        ON achievements(sort_order);

-- 4.2 User Achievements — per-user progress tracking
CREATE TABLE user_achievements (
  id             UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  status         achievement_status NOT NULL DEFAULT 'LOCKED',
  progress       JSONB,
  unlocked_at    TIMESTAMPTZ,
  notified_at    TIMESTAMPTZ,
  achievement_id UUID               NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  user_id        UUID               NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ        NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ        NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_achievements_achievement_user UNIQUE (achievement_id, user_id)
);

CREATE INDEX idx_user_achievements_user_status    ON user_achievements(user_id, status);
CREATE INDEX idx_user_achievements_user_unlocked  ON user_achievements(user_id, unlocked_at);
CREATE INDEX idx_user_achievements_achievement    ON user_achievements(achievement_id);

-- 4.3 Audit Logs — security and activity event tracking (write-once, no updated_at)
CREATE TABLE audit_logs (
  id                UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type        audit_event_type NOT NULL,
  description       VARCHAR(255)     NOT NULL,
  ip_address        VARCHAR(45),
  user_agent        VARCHAR(255),
  metadata          JSONB,
  is_security_event BOOLEAN          NOT NULL DEFAULT false,
  user_id           UUID             REFERENCES profiles(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ      NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_user_event_created ON audit_logs(user_id, event_type, created_at);
CREATE INDEX idx_audit_logs_event_created      ON audit_logs(event_type, created_at);
CREATE INDEX idx_audit_logs_ip_created         ON audit_logs(ip_address, created_at);
CREATE INDEX idx_audit_logs_security_created   ON audit_logs(is_security_event, created_at);

-- 4.4 Banking Customers — provider customer records (SaltEdge v6 requirement)
CREATE TABLE banking_customers (
  id                   UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID             NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider             banking_provider NOT NULL DEFAULT 'SALTEDGE',
  saltedge_customer_id VARCHAR(255)     UNIQUE,
  tink_customer_id     VARCHAR(255)     UNIQUE,
  yapily_customer_id   VARCHAR(255)     UNIQUE,
  identifier           VARCHAR(255)     NOT NULL,
  is_active            BOOLEAN          NOT NULL DEFAULT true,
  created_at           TIMESTAMPTZ      NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ      NOT NULL DEFAULT now(),
  CONSTRAINT uq_banking_customer_user_provider UNIQUE (user_id, provider)
);

CREATE INDEX idx_banking_customer_provider_active ON banking_customers(provider, is_active);

-- 4.5 Banking Connections — OAuth flow and provider link tracking
CREATE TABLE banking_connections (
  id                     UUID                      PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID                      NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  customer_id            UUID                      REFERENCES banking_customers(id) ON DELETE SET NULL,
  provider               banking_provider          NOT NULL,
  status                 banking_connection_status NOT NULL DEFAULT 'PENDING',
  saltedge_connection_id VARCHAR(255)              UNIQUE,
  tink_connection_id     VARCHAR(255)              UNIQUE,
  yapily_connection_id   VARCHAR(255)              UNIQUE,
  provider_code          VARCHAR(255),
  provider_name          VARCHAR(255),
  country_code           VARCHAR(10),
  redirect_url           TEXT,
  authorization_url      TEXT,
  expires_at             TIMESTAMPTZ,
  authorized_at          TIMESTAMPTZ,
  last_success_at        TIMESTAMPTZ,
  next_refresh_at        TIMESTAMPTZ,
  metadata               JSONB,
  created_at             TIMESTAMPTZ               NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ               NOT NULL DEFAULT now(),
  CONSTRAINT uq_banking_conn_user_saltedge UNIQUE (user_id, saltedge_connection_id)
);

CREATE INDEX idx_banking_conn_user_status     ON banking_connections(user_id, status);
CREATE INDEX idx_banking_conn_customer        ON banking_connections(customer_id);
CREATE INDEX idx_banking_conn_provider_status ON banking_connections(provider, status);
CREATE INDEX idx_banking_conn_expires         ON banking_connections(expires_at);

-- 4.6 Banking Sync Logs — immutable sync audit trail (no updated_at)
CREATE TABLE banking_sync_logs (
  id                  UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id          UUID               NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  provider            banking_provider   NOT NULL,
  status              banking_sync_status NOT NULL,
  started_at          TIMESTAMPTZ        NOT NULL DEFAULT now(),
  completed_at        TIMESTAMPTZ,
  accounts_synced     INT,
  transactions_synced INT,
  balance_updated     BOOLEAN            NOT NULL DEFAULT false,
  error               TEXT,
  error_code          VARCHAR(50),
  metadata            JSONB
);

CREATE INDEX idx_sync_logs_account_date    ON banking_sync_logs(account_id, started_at);
CREATE INDEX idx_sync_logs_provider_status ON banking_sync_logs(provider, status);
CREATE INDEX idx_sync_logs_status_date     ON banking_sync_logs(status, started_at);

-- 4.7 User Preferences — per-user settings and customization
CREATE TABLE user_preferences (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID        NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  timezone              VARCHAR(50) NOT NULL DEFAULT 'UTC',
  currency              VARCHAR(3)  NOT NULL DEFAULT 'EUR',
  date_format           VARCHAR(20) NOT NULL DEFAULT 'YYYY-MM-DD',
  locale                VARCHAR(10) NOT NULL DEFAULT 'en-US',
  email_notifications   BOOLEAN     NOT NULL DEFAULT true,
  push_notifications    BOOLEAN     NOT NULL DEFAULT true,
  budget_alerts         BOOLEAN     NOT NULL DEFAULT true,
  bill_reminders        BOOLEAN     NOT NULL DEFAULT true,
  weekly_digest         BOOLEAN     NOT NULL DEFAULT true,
  ui_preferences        JSONB,
  financial_preferences JSONB,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4.8 Notifications — in-app and push notifications
CREATE TABLE notifications (
  id           UUID                  PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID                  NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type         notification_type     NOT NULL,
  priority     notification_priority NOT NULL DEFAULT 'MEDIUM',
  status       notification_status   NOT NULL DEFAULT 'PENDING',
  title        VARCHAR(255)          NOT NULL,
  message      TEXT                  NOT NULL,
  link         VARCHAR(500),
  sent_at      TIMESTAMPTZ,
  read_at      TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  metadata     JSONB,
  created_at   TIMESTAMPTZ           NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ           NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_status  ON notifications(user_id, status);
CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at);
CREATE INDEX idx_notifications_type_status  ON notifications(type, status);

-- 4.9 Push Subscriptions — Web Push API endpoints per device
CREATE TABLE push_subscriptions (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID         NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint        TEXT         NOT NULL UNIQUE,
  p256dh          VARCHAR(255) NOT NULL,
  auth            VARCHAR(255) NOT NULL,
  user_agent      VARCHAR(500),
  device_name     VARCHAR(100),
  is_active       BOOLEAN      NOT NULL DEFAULT true,
  last_used_at    TIMESTAMPTZ,
  failed_attempts INT          NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_push_subscriptions_user_active ON push_subscriptions(user_id, is_active);

-- 4.10 Liabilities — credit cards, BNPL, loans, and other debts
CREATE TABLE liabilities (
  id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id           UUID            NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  type                liability_type  NOT NULL,
  status              liability_status NOT NULL DEFAULT 'ACTIVE',
  name                VARCHAR(255)    NOT NULL,
  current_balance     NUMERIC(15,2)   NOT NULL DEFAULT 0,
  credit_limit        NUMERIC(15,2),
  original_amount     NUMERIC(15,2),
  currency            VARCHAR(3)      NOT NULL DEFAULT 'EUR',
  interest_rate       NUMERIC(5,2),
  minimum_payment     NUMERIC(15,2),
  billing_cycle_day   INT,
  payment_due_day     INT,
  statement_close_day INT,
  last_statement_date DATE,
  account_id          UUID            REFERENCES accounts(id) ON DELETE SET NULL,
  provider            VARCHAR(100),
  external_id         VARCHAR(255),
  purchase_date       DATE,
  metadata            JSONB,
  created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX idx_liabilities_family_status ON liabilities(family_id, status);
CREATE INDEX idx_liabilities_family_type   ON liabilities(family_id, type);
CREATE INDEX idx_liabilities_account       ON liabilities(account_id);

-- 4.11 Installment Plans — fixed payment schedules for BNPL and loans
CREATE TABLE installment_plans (
  id                     UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  liability_id           UUID          NOT NULL REFERENCES liabilities(id) ON DELETE CASCADE,
  total_amount           NUMERIC(15,2) NOT NULL,
  installment_amount     NUMERIC(15,2) NOT NULL,
  number_of_installments INT           NOT NULL,
  remaining_installments INT           NOT NULL DEFAULT 0,
  currency               VARCHAR(3)    NOT NULL DEFAULT 'EUR',
  start_date             DATE          NOT NULL,
  end_date               DATE          NOT NULL,
  is_paid_off            BOOLEAN       NOT NULL DEFAULT false,
  created_at             TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_installment_plans_liability ON installment_plans(liability_id);

-- 4.12 Installments — individual payments in an installment plan
CREATE TABLE installments (
  id                 UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id            UUID          NOT NULL REFERENCES installment_plans(id) ON DELETE CASCADE,
  amount             NUMERIC(15,2) NOT NULL,
  due_date           DATE          NOT NULL,
  installment_number INT           NOT NULL,
  is_paid            BOOLEAN       NOT NULL DEFAULT false,
  paid_at            TIMESTAMPTZ,
  transaction_id     UUID          REFERENCES transactions(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_installments_plan_due    ON installments(plan_id, due_date);
CREATE INDEX idx_installments_due_status  ON installments(due_date, is_paid);

-- 4.13 Scheduled Transactions — recurring bills and scheduled payments
CREATE TABLE scheduled_transactions (
  id                   UUID                          PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id            UUID                          NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  account_id           UUID                          NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  status               scheduled_transaction_status  NOT NULL DEFAULT 'ACTIVE',
  amount               NUMERIC(15,2)                 NOT NULL,
  type                 transaction_type              NOT NULL,
  flow_type            flow_type,
  currency             VARCHAR(3)                    NOT NULL DEFAULT 'EUR',
  description          VARCHAR(500)                  NOT NULL,
  merchant_name        VARCHAR(255),
  category_id          UUID                          REFERENCES categories(id) ON DELETE SET NULL,
  next_due_date        DATE                          NOT NULL,
  last_executed_at     TIMESTAMPTZ,
  auto_create          BOOLEAN                       NOT NULL DEFAULT false,
  reminder_days_before INT                           NOT NULL DEFAULT 3,
  metadata             JSONB,
  created_at           TIMESTAMPTZ                   NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ                   NOT NULL DEFAULT now()
);

CREATE INDEX idx_scheduled_tx_family_status ON scheduled_transactions(family_id, status);
CREATE INDEX idx_scheduled_tx_due_status    ON scheduled_transactions(next_due_date, status);
CREATE INDEX idx_scheduled_tx_account       ON scheduled_transactions(account_id);

-- 4.14 Recurrence Rules — defines recurrence pattern for scheduled transactions
CREATE TABLE recurrence_rules (
  id                       UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_transaction_id UUID                 NOT NULL UNIQUE REFERENCES scheduled_transactions(id) ON DELETE CASCADE,
  frequency                recurrence_frequency NOT NULL,
  repeat_interval          INT                  NOT NULL DEFAULT 1,
  day_of_week              INT,
  day_of_month             INT,
  end_date                 DATE,
  end_count                INT,
  occurrence_count         INT                  NOT NULL DEFAULT 0,
  created_at               TIMESTAMPTZ          NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ          NOT NULL DEFAULT now()
);

-- ============================================================================
-- SECTION 5: TRIGGERS
-- ============================================================================

-- 5.1 Auto-update updated_at on all mutable tables (18 tables)
-- Excluded: audit_logs, banking_sync_logs (write-once, no updated_at)
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON families
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON budgets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON achievements
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON user_achievements
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON banking_customers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON banking_connections
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON liabilities
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON installment_plans
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON installments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON scheduled_transactions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON recurrence_rules
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 5.2 Handle new user signup: auth.users INSERT → create family + profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_family_id UUID;
BEGIN
  -- Create a new single-member family for the user
  INSERT INTO public.families (id, name, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    COALESCE(NEW.raw_user_meta_data->>'family_name', 'La mia famiglia'),
    now(),
    now()
  )
  RETURNING id INTO new_family_id;

  -- Create the user profile (first user of a new family = ADMIN)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5.3 Enforce category depth (max 3 levels: 0, 1, 2)
CREATE OR REPLACE FUNCTION public.enforce_category_depth()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_category_depth
  BEFORE INSERT OR UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION public.enforce_category_depth();
