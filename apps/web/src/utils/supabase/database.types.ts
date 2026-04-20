export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          account_number: string | null
          available_balance: number | null
          banking_provider:
            | Database["public"]["Enums"]["banking_provider"]
            | null
          created_at: string
          credit_limit: number | null
          currency: string
          current_balance: number
          family_id: string | null
          id: string
          institution_name: string | null
          is_active: boolean
          last_sync_at: string | null
          name: string
          plaid_access_token: string | null
          plaid_account_id: string | null
          plaid_item_id: string | null
          plaid_metadata: Json | null
          routing_number: string | null
          saltedge_account_id: string | null
          saltedge_connection_id: string | null
          settings: Json | null
          source: Database["public"]["Enums"]["account_source"]
          status: Database["public"]["Enums"]["account_status"]
          sync_enabled: boolean
          sync_error: string | null
          sync_status: Database["public"]["Enums"]["banking_sync_status"]
          tink_account_id: string | null
          type: Database["public"]["Enums"]["account_type"]
          updated_at: string
          user_id: string | null
          yapily_account_id: string | null
        }
        Insert: {
          account_number?: string | null
          available_balance?: number | null
          banking_provider?:
            | Database["public"]["Enums"]["banking_provider"]
            | null
          created_at?: string
          credit_limit?: number | null
          currency?: string
          current_balance?: number
          family_id?: string | null
          id?: string
          institution_name?: string | null
          is_active?: boolean
          last_sync_at?: string | null
          name: string
          plaid_access_token?: string | null
          plaid_account_id?: string | null
          plaid_item_id?: string | null
          plaid_metadata?: Json | null
          routing_number?: string | null
          saltedge_account_id?: string | null
          saltedge_connection_id?: string | null
          settings?: Json | null
          source: Database["public"]["Enums"]["account_source"]
          status?: Database["public"]["Enums"]["account_status"]
          sync_enabled?: boolean
          sync_error?: string | null
          sync_status?: Database["public"]["Enums"]["banking_sync_status"]
          tink_account_id?: string | null
          type?: Database["public"]["Enums"]["account_type"]
          updated_at?: string
          user_id?: string | null
          yapily_account_id?: string | null
        }
        Update: {
          account_number?: string | null
          available_balance?: number | null
          banking_provider?:
            | Database["public"]["Enums"]["banking_provider"]
            | null
          created_at?: string
          credit_limit?: number | null
          currency?: string
          current_balance?: number
          family_id?: string | null
          id?: string
          institution_name?: string | null
          is_active?: boolean
          last_sync_at?: string | null
          name?: string
          plaid_access_token?: string | null
          plaid_account_id?: string | null
          plaid_item_id?: string | null
          plaid_metadata?: Json | null
          routing_number?: string | null
          saltedge_account_id?: string | null
          saltedge_connection_id?: string | null
          settings?: Json | null
          source?: Database["public"]["Enums"]["account_source"]
          status?: Database["public"]["Enums"]["account_status"]
          sync_enabled?: boolean
          sync_error?: string | null
          sync_status?: Database["public"]["Enums"]["banking_sync_status"]
          tink_account_id?: string | null
          type?: Database["public"]["Enums"]["account_type"]
          updated_at?: string
          user_id?: string | null
          yapily_account_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      achievements: {
        Row: {
          created_at: string
          description: string
          icon: string | null
          id: string
          is_active: boolean
          is_repeatable: boolean
          points: number
          requirements: Json
          sort_order: number
          title: string
          type: Database["public"]["Enums"]["achievement_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          icon?: string | null
          id?: string
          is_active?: boolean
          is_repeatable?: boolean
          points?: number
          requirements: Json
          sort_order?: number
          title: string
          type: Database["public"]["Enums"]["achievement_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          is_repeatable?: boolean
          points?: number
          requirements?: Json
          sort_order?: number
          title?: string
          type?: Database["public"]["Enums"]["achievement_type"]
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          created_at: string
          description: string
          event_type: Database["public"]["Enums"]["audit_event_type"]
          id: string
          ip_address: string | null
          is_security_event: boolean
          metadata: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description: string
          event_type: Database["public"]["Enums"]["audit_event_type"]
          id?: string
          ip_address?: string | null
          is_security_event?: boolean
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          event_type?: Database["public"]["Enums"]["audit_event_type"]
          id?: string
          ip_address?: string | null
          is_security_event?: boolean
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      banking_connections: {
        Row: {
          authorization_url: string | null
          authorized_at: string | null
          country_code: string | null
          created_at: string
          customer_id: string | null
          expires_at: string | null
          id: string
          last_success_at: string | null
          metadata: Json | null
          next_refresh_at: string | null
          provider: Database["public"]["Enums"]["banking_provider"]
          provider_code: string | null
          provider_name: string | null
          redirect_url: string | null
          saltedge_connection_id: string | null
          status: Database["public"]["Enums"]["banking_connection_status"]
          tink_connection_id: string | null
          updated_at: string
          user_id: string
          yapily_connection_id: string | null
        }
        Insert: {
          authorization_url?: string | null
          authorized_at?: string | null
          country_code?: string | null
          created_at?: string
          customer_id?: string | null
          expires_at?: string | null
          id?: string
          last_success_at?: string | null
          metadata?: Json | null
          next_refresh_at?: string | null
          provider: Database["public"]["Enums"]["banking_provider"]
          provider_code?: string | null
          provider_name?: string | null
          redirect_url?: string | null
          saltedge_connection_id?: string | null
          status?: Database["public"]["Enums"]["banking_connection_status"]
          tink_connection_id?: string | null
          updated_at?: string
          user_id: string
          yapily_connection_id?: string | null
        }
        Update: {
          authorization_url?: string | null
          authorized_at?: string | null
          country_code?: string | null
          created_at?: string
          customer_id?: string | null
          expires_at?: string | null
          id?: string
          last_success_at?: string | null
          metadata?: Json | null
          next_refresh_at?: string | null
          provider?: Database["public"]["Enums"]["banking_provider"]
          provider_code?: string | null
          provider_name?: string | null
          redirect_url?: string | null
          saltedge_connection_id?: string | null
          status?: Database["public"]["Enums"]["banking_connection_status"]
          tink_connection_id?: string | null
          updated_at?: string
          user_id?: string
          yapily_connection_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "banking_connections_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "banking_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "banking_connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      banking_customers: {
        Row: {
          created_at: string
          id: string
          identifier: string
          is_active: boolean
          provider: Database["public"]["Enums"]["banking_provider"]
          saltedge_customer_id: string | null
          tink_customer_id: string | null
          updated_at: string
          user_id: string
          yapily_customer_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          identifier: string
          is_active?: boolean
          provider?: Database["public"]["Enums"]["banking_provider"]
          saltedge_customer_id?: string | null
          tink_customer_id?: string | null
          updated_at?: string
          user_id: string
          yapily_customer_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          identifier?: string
          is_active?: boolean
          provider?: Database["public"]["Enums"]["banking_provider"]
          saltedge_customer_id?: string | null
          tink_customer_id?: string | null
          updated_at?: string
          user_id?: string
          yapily_customer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "banking_customers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      banking_sync_logs: {
        Row: {
          account_id: string
          accounts_synced: number | null
          balance_updated: boolean
          completed_at: string | null
          error: string | null
          error_code: string | null
          id: string
          metadata: Json | null
          provider: Database["public"]["Enums"]["banking_provider"]
          started_at: string
          status: Database["public"]["Enums"]["banking_sync_status"]
          transactions_synced: number | null
        }
        Insert: {
          account_id: string
          accounts_synced?: number | null
          balance_updated?: boolean
          completed_at?: string | null
          error?: string | null
          error_code?: string | null
          id?: string
          metadata?: Json | null
          provider: Database["public"]["Enums"]["banking_provider"]
          started_at?: string
          status: Database["public"]["Enums"]["banking_sync_status"]
          transactions_synced?: number | null
        }
        Update: {
          account_id?: string
          accounts_synced?: number | null
          balance_updated?: boolean
          completed_at?: string | null
          error?: string | null
          error_code?: string | null
          id?: string
          metadata?: Json | null
          provider?: Database["public"]["Enums"]["banking_provider"]
          started_at?: string
          status?: Database["public"]["Enums"]["banking_sync_status"]
          transactions_synced?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "banking_sync_logs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          alert_thresholds: number[]
          amount: number
          category_id: string
          created_at: string
          end_date: string
          family_id: string
          id: string
          name: string
          notes: string | null
          period: Database["public"]["Enums"]["budget_period"]
          settings: Json | null
          start_date: string
          status: Database["public"]["Enums"]["budget_status"]
          updated_at: string
        }
        Insert: {
          alert_thresholds?: number[]
          amount: number
          category_id: string
          created_at?: string
          end_date: string
          family_id: string
          id?: string
          name: string
          notes?: string | null
          period?: Database["public"]["Enums"]["budget_period"]
          settings?: Json | null
          start_date: string
          status?: Database["public"]["Enums"]["budget_status"]
          updated_at?: string
        }
        Update: {
          alert_thresholds?: number[]
          amount?: number
          category_id?: string
          created_at?: string
          end_date?: string
          family_id?: string
          id?: string
          name?: string
          notes?: string | null
          period?: Database["public"]["Enums"]["budget_period"]
          settings?: Json | null
          start_date?: string
          status?: Database["public"]["Enums"]["budget_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string | null
          created_at: string
          depth: number
          description: string | null
          expense_class: string | null
          family_id: string
          icon: string | null
          id: string
          is_default: boolean
          is_system: boolean
          metadata: Json | null
          name: string
          parent_id: string | null
          rules: Json | null
          slug: string
          sort_order: number
          status: Database["public"]["Enums"]["category_status"]
          type: Database["public"]["Enums"]["category_type"]
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          depth?: number
          description?: string | null
          expense_class?: string | null
          family_id: string
          icon?: string | null
          id?: string
          is_default?: boolean
          is_system?: boolean
          metadata?: Json | null
          name: string
          parent_id?: string | null
          rules?: Json | null
          slug: string
          sort_order?: number
          status?: Database["public"]["Enums"]["category_status"]
          type: Database["public"]["Enums"]["category_type"]
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          depth?: number
          description?: string | null
          expense_class?: string | null
          family_id?: string
          icon?: string | null
          id?: string
          is_default?: boolean
          is_system?: boolean
          metadata?: Json | null
          name?: string
          parent_id?: string | null
          rules?: Json | null
          slug?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["category_status"]
          type?: Database["public"]["Enums"]["category_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      families: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      goal_allocations: {
        Row: {
          created_at: string
          deadline_feasible: boolean
          goal_id: string
          id: string
          monthly_amount: number
          plan_id: string
          reasoning: string | null
        }
        Insert: {
          created_at?: string
          deadline_feasible?: boolean
          goal_id: string
          id?: string
          monthly_amount: number
          plan_id: string
          reasoning?: string | null
        }
        Update: {
          created_at?: string
          deadline_feasible?: boolean
          goal_id?: string
          id?: string
          monthly_amount?: number
          plan_id?: string
          reasoning?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goal_allocations_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_allocations_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          created_at: string
          current: number
          deadline: string | null
          id: string
          monthly_allocation: number
          name: string
          priority: number
          status: Database["public"]["Enums"]["goal_status"]
          target: number | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current?: number
          deadline?: string | null
          id?: string
          monthly_allocation?: number
          name: string
          priority: number
          status?: Database["public"]["Enums"]["goal_status"]
          target?: number | null
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current?: number
          deadline?: string | null
          id?: string
          monthly_allocation?: number
          name?: string
          priority?: number
          status?: Database["public"]["Enums"]["goal_status"]
          target?: number | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      installment_plans: {
        Row: {
          created_at: string
          currency: string
          end_date: string
          id: string
          installment_amount: number
          is_paid_off: boolean
          liability_id: string
          number_of_installments: number
          remaining_installments: number
          start_date: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          end_date: string
          id?: string
          installment_amount: number
          is_paid_off?: boolean
          liability_id: string
          number_of_installments: number
          remaining_installments?: number
          start_date: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          end_date?: string
          id?: string
          installment_amount?: number
          is_paid_off?: boolean
          liability_id?: string
          number_of_installments?: number
          remaining_installments?: number
          start_date?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "installment_plans_liability_id_fkey"
            columns: ["liability_id"]
            isOneToOne: false
            referencedRelation: "liabilities"
            referencedColumns: ["id"]
          },
        ]
      }
      installments: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          id: string
          installment_number: number
          is_paid: boolean
          paid_at: string | null
          plan_id: string
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date: string
          id?: string
          installment_number: number
          is_paid?: boolean
          paid_at?: string | null
          plan_id: string
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          id?: string
          installment_number?: number
          is_paid?: boolean
          paid_at?: string | null
          plan_id?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "installments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "installment_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      liabilities: {
        Row: {
          account_id: string | null
          billing_cycle_day: number | null
          created_at: string
          credit_limit: number | null
          currency: string
          current_balance: number
          external_id: string | null
          family_id: string
          id: string
          interest_rate: number | null
          last_statement_date: string | null
          metadata: Json | null
          minimum_payment: number | null
          name: string
          original_amount: number | null
          payment_due_day: number | null
          provider: string | null
          purchase_date: string | null
          statement_close_day: number | null
          status: Database["public"]["Enums"]["liability_status"]
          type: Database["public"]["Enums"]["liability_type"]
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          billing_cycle_day?: number | null
          created_at?: string
          credit_limit?: number | null
          currency?: string
          current_balance?: number
          external_id?: string | null
          family_id: string
          id?: string
          interest_rate?: number | null
          last_statement_date?: string | null
          metadata?: Json | null
          minimum_payment?: number | null
          name: string
          original_amount?: number | null
          payment_due_day?: number | null
          provider?: string | null
          purchase_date?: string | null
          statement_close_day?: number | null
          status?: Database["public"]["Enums"]["liability_status"]
          type: Database["public"]["Enums"]["liability_type"]
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          billing_cycle_day?: number | null
          created_at?: string
          credit_limit?: number | null
          currency?: string
          current_balance?: number
          external_id?: string | null
          family_id?: string
          id?: string
          interest_rate?: number | null
          last_statement_date?: string | null
          metadata?: Json | null
          minimum_payment?: number | null
          name?: string
          original_amount?: number | null
          payment_due_day?: number | null
          provider?: string | null
          purchase_date?: string | null
          statement_close_day?: number | null
          status?: Database["public"]["Enums"]["liability_status"]
          type?: Database["public"]["Enums"]["liability_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "liabilities_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liabilities_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          dismissed_at: string | null
          id: string
          link: string | null
          message: string
          metadata: Json | null
          priority: Database["public"]["Enums"]["notification_priority"]
          read_at: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["notification_status"]
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dismissed_at?: string | null
          id?: string
          link?: string | null
          message: string
          metadata?: Json | null
          priority?: Database["public"]["Enums"]["notification_priority"]
          read_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dismissed_at?: string | null
          id?: string
          link?: string | null
          message?: string
          metadata?: Json | null
          priority?: Database["public"]["Enums"]["notification_priority"]
          read_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string
          essentials_pct: number
          id: string
          income_after_essentials: number
          monthly_income: number
          monthly_savings_target: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          essentials_pct?: number
          id?: string
          income_after_essentials: number
          monthly_income: number
          monthly_savings_target: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          essentials_pct?: number
          id?: string
          income_after_essentials?: number
          monthly_income?: number
          monthly_savings_target?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar: string | null
          created_at: string
          currency: string
          family_id: string
          first_name: string
          id: string
          last_login_at: string | null
          last_name: string
          onboarded: boolean
          preferences: Json | null
          role: Database["public"]["Enums"]["user_role"]
          status: Database["public"]["Enums"]["user_status"]
          timezone: string | null
          updated_at: string
        }
        Insert: {
          avatar?: string | null
          created_at?: string
          currency?: string
          family_id: string
          first_name: string
          id: string
          last_login_at?: string | null
          last_name: string
          onboarded?: boolean
          preferences?: Json | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["user_status"]
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          avatar?: string | null
          created_at?: string
          currency?: string
          family_id?: string
          first_name?: string
          id?: string
          last_login_at?: string | null
          last_name?: string
          onboarded?: boolean
          preferences?: Json | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["user_status"]
          timezone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          device_name: string | null
          endpoint: string
          failed_attempts: number
          id: string
          is_active: boolean
          last_used_at: string | null
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          device_name?: string | null
          endpoint: string
          failed_attempts?: number
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          device_name?: string | null
          endpoint?: string
          failed_attempts?: number
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recurrence_rules: {
        Row: {
          created_at: string
          day_of_month: number | null
          day_of_week: number | null
          end_count: number | null
          end_date: string | null
          frequency: Database["public"]["Enums"]["recurrence_frequency"]
          id: string
          occurrence_count: number
          repeat_interval: number
          scheduled_transaction_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_month?: number | null
          day_of_week?: number | null
          end_count?: number | null
          end_date?: string | null
          frequency: Database["public"]["Enums"]["recurrence_frequency"]
          id?: string
          occurrence_count?: number
          repeat_interval?: number
          scheduled_transaction_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_month?: number | null
          day_of_week?: number | null
          end_count?: number | null
          end_date?: string | null
          frequency?: Database["public"]["Enums"]["recurrence_frequency"]
          id?: string
          occurrence_count?: number
          repeat_interval?: number
          scheduled_transaction_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurrence_rules_scheduled_transaction_id_fkey"
            columns: ["scheduled_transaction_id"]
            isOneToOne: true
            referencedRelation: "scheduled_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_transactions: {
        Row: {
          account_id: string
          amount: number
          auto_create: boolean
          category_id: string | null
          created_at: string
          currency: string
          description: string
          family_id: string
          flow_type: Database["public"]["Enums"]["flow_type"] | null
          id: string
          last_executed_at: string | null
          merchant_name: string | null
          metadata: Json | null
          next_due_date: string
          reminder_days_before: number
          status: Database["public"]["Enums"]["scheduled_transaction_status"]
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
        }
        Insert: {
          account_id: string
          amount: number
          auto_create?: boolean
          category_id?: string | null
          created_at?: string
          currency?: string
          description: string
          family_id: string
          flow_type?: Database["public"]["Enums"]["flow_type"] | null
          id?: string
          last_executed_at?: string | null
          merchant_name?: string | null
          metadata?: Json | null
          next_due_date: string
          reminder_days_before?: number
          status?: Database["public"]["Enums"]["scheduled_transaction_status"]
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
        }
        Update: {
          account_id?: string
          amount?: number
          auto_create?: boolean
          category_id?: string | null
          created_at?: string
          currency?: string
          description?: string
          family_id?: string
          flow_type?: Database["public"]["Enums"]["flow_type"] | null
          id?: string
          last_executed_at?: string | null
          merchant_name?: string | null
          metadata?: Json | null
          next_due_date?: string
          reminder_days_before?: number
          status?: Database["public"]["Enums"]["scheduled_transaction_status"]
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_transactions_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string
          amount: number
          attachments: Json | null
          authorized_date: string | null
          category_id: string | null
          check_number: string | null
          created_at: string
          currency: string
          date: string
          description: string
          flow_type: Database["public"]["Enums"]["flow_type"] | null
          id: string
          include_in_budget: boolean
          is_hidden: boolean
          is_pending: boolean
          is_recurring: boolean
          location: Json | null
          merchant_name: string | null
          notes: string | null
          original_description: string | null
          plaid_account_id: string | null
          plaid_metadata: Json | null
          plaid_transaction_id: string | null
          reference: string | null
          saltedge_transaction_id: string | null
          source: Database["public"]["Enums"]["transaction_source"]
          split_details: Json | null
          status: Database["public"]["Enums"]["transaction_status"]
          tags: Json | null
          transfer_group_id: string | null
          transfer_role: Database["public"]["Enums"]["transfer_role"] | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
        }
        Insert: {
          account_id: string
          amount: number
          attachments?: Json | null
          authorized_date?: string | null
          category_id?: string | null
          check_number?: string | null
          created_at?: string
          currency?: string
          date: string
          description: string
          flow_type?: Database["public"]["Enums"]["flow_type"] | null
          id?: string
          include_in_budget?: boolean
          is_hidden?: boolean
          is_pending?: boolean
          is_recurring?: boolean
          location?: Json | null
          merchant_name?: string | null
          notes?: string | null
          original_description?: string | null
          plaid_account_id?: string | null
          plaid_metadata?: Json | null
          plaid_transaction_id?: string | null
          reference?: string | null
          saltedge_transaction_id?: string | null
          source: Database["public"]["Enums"]["transaction_source"]
          split_details?: Json | null
          status?: Database["public"]["Enums"]["transaction_status"]
          tags?: Json | null
          transfer_group_id?: string | null
          transfer_role?: Database["public"]["Enums"]["transfer_role"] | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
        }
        Update: {
          account_id?: string
          amount?: number
          attachments?: Json | null
          authorized_date?: string | null
          category_id?: string | null
          check_number?: string | null
          created_at?: string
          currency?: string
          date?: string
          description?: string
          flow_type?: Database["public"]["Enums"]["flow_type"] | null
          id?: string
          include_in_budget?: boolean
          is_hidden?: boolean
          is_pending?: boolean
          is_recurring?: boolean
          location?: Json | null
          merchant_name?: string | null
          notes?: string | null
          original_description?: string | null
          plaid_account_id?: string | null
          plaid_metadata?: Json | null
          plaid_transaction_id?: string | null
          reference?: string | null
          saltedge_transaction_id?: string | null
          source?: Database["public"]["Enums"]["transaction_source"]
          split_details?: Json | null
          status?: Database["public"]["Enums"]["transaction_status"]
          tags?: Json | null
          transfer_group_id?: string | null
          transfer_role?: Database["public"]["Enums"]["transfer_role"] | null
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          created_at: string
          id: string
          notified_at: string | null
          progress: Json | null
          status: Database["public"]["Enums"]["achievement_status"]
          unlocked_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          created_at?: string
          id?: string
          notified_at?: string | null
          progress?: Json | null
          status?: Database["public"]["Enums"]["achievement_status"]
          unlocked_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          created_at?: string
          id?: string
          notified_at?: string | null
          progress?: Json | null
          status?: Database["public"]["Enums"]["achievement_status"]
          unlocked_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          bill_reminders: boolean
          budget_alerts: boolean
          created_at: string
          currency: string
          date_format: string
          email_notifications: boolean
          financial_preferences: Json | null
          id: string
          locale: string
          push_notifications: boolean
          timezone: string
          ui_preferences: Json | null
          updated_at: string
          user_id: string
          weekly_digest: boolean
        }
        Insert: {
          bill_reminders?: boolean
          budget_alerts?: boolean
          created_at?: string
          currency?: string
          date_format?: string
          email_notifications?: boolean
          financial_preferences?: Json | null
          id?: string
          locale?: string
          push_notifications?: boolean
          timezone?: string
          ui_preferences?: Json | null
          updated_at?: string
          user_id: string
          weekly_digest?: boolean
        }
        Update: {
          bill_reminders?: boolean
          budget_alerts?: boolean
          created_at?: string
          currency?: string
          date_format?: string
          email_notifications?: boolean
          financial_preferences?: Json | null
          id?: string
          locale?: string
          push_notifications?: boolean
          timezone?: string
          ui_preferences?: Json | null
          updated_at?: string
          user_id?: string
          weekly_digest?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_balance_summary: {
        Args: never
        Returns: {
          account_id: string
          account_name: string
          account_type: Database["public"]["Enums"]["account_type"]
          currency: string
          current_balance: number
          institution_name: string
          last_sync_at: string
        }[]
      }
      get_category_spending: {
        Args: { date_from: string; date_to: string; parent_only?: boolean }
        Returns: {
          category_color: string
          category_icon: string
          category_id: string
          category_name: string
          percentage: number
          total_amount: number
          transaction_count: number
        }[]
      }
      get_dashboard_stats: { Args: { period?: string }; Returns: Json }
      get_spending_trends: {
        Args: { num_periods?: number; period?: string }
        Returns: {
          expenses: number
          income: number
          period_date: string
        }[]
      }
    }
    Enums: {
      account_source: "SALTEDGE" | "TINK" | "YAPILY" | "PLAID" | "MANUAL"
      account_status: "ACTIVE" | "INACTIVE" | "HIDDEN" | "CLOSED" | "ERROR"
      account_type:
        | "CHECKING"
        | "SAVINGS"
        | "CREDIT_CARD"
        | "INVESTMENT"
        | "LOAN"
        | "MORTGAGE"
        | "OTHER"
      achievement_status: "LOCKED" | "IN_PROGRESS" | "UNLOCKED"
      achievement_type: "SAVINGS" | "BUDGET" | "CONSISTENCY" | "EDUCATION"
      audit_event_type:
        | "PASSWORD_CHANGED"
        | "PASSWORD_RESET_REQUESTED"
        | "PASSWORD_RESET_COMPLETED"
        | "LOGIN_SUCCESS"
        | "LOGIN_FAILED"
        | "LOGIN_LOCKED"
        | "ACCOUNT_CREATED"
        | "ACCOUNT_DELETED"
        | "ACCOUNT_SUSPENDED"
        | "ACCOUNT_REACTIVATED"
        | "TWO_FACTOR_ENABLED"
        | "TWO_FACTOR_DISABLED"
      banking_connection_status:
        | "PENDING"
        | "IN_PROGRESS"
        | "AUTHORIZED"
        | "REVOKED"
        | "EXPIRED"
        | "FAILED"
      banking_provider: "MANUAL" | "SALTEDGE" | "TINK" | "YAPILY" | "TRUELAYER"
      banking_sync_status:
        | "PENDING"
        | "SYNCING"
        | "SYNCED"
        | "ERROR"
        | "DISCONNECTED"
      budget_period: "MONTHLY" | "QUARTERLY" | "YEARLY" | "CUSTOM"
      budget_status: "ACTIVE" | "COMPLETED" | "DRAFT"
      category_status: "ACTIVE" | "INACTIVE" | "ARCHIVED"
      category_type: "INCOME" | "EXPENSE"
      flow_type:
        | "EXPENSE"
        | "INCOME"
        | "TRANSFER"
        | "LIABILITY_PAYMENT"
        | "REFUND"
      goal_status: "ACTIVE" | "COMPLETED" | "ARCHIVED"
      liability_status: "ACTIVE" | "PAID_OFF" | "CLOSED"
      liability_type: "CREDIT_CARD" | "BNPL" | "LOAN" | "MORTGAGE" | "OTHER"
      notification_priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
      notification_status: "PENDING" | "SENT" | "READ" | "DISMISSED"
      notification_type:
        | "BUDGET_ALERT"
        | "BILL_REMINDER"
        | "TRANSACTION_ALERT"
        | "SYNC_ERROR"
        | "ACHIEVEMENT"
        | "SYSTEM"
      recurrence_frequency:
        | "DAILY"
        | "WEEKLY"
        | "BIWEEKLY"
        | "MONTHLY"
        | "QUARTERLY"
        | "YEARLY"
      scheduled_transaction_status:
        | "ACTIVE"
        | "PAUSED"
        | "COMPLETED"
        | "CANCELLED"
      transaction_source: "PLAID" | "MANUAL" | "IMPORT" | "SALTEDGE"
      transaction_status: "PENDING" | "POSTED" | "CANCELLED"
      transaction_type: "DEBIT" | "CREDIT"
      transfer_role: "SOURCE" | "DESTINATION"
      user_role: "ADMIN" | "MEMBER" | "VIEWER"
      user_status: "ACTIVE" | "INACTIVE" | "SUSPENDED"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_source: ["SALTEDGE", "TINK", "YAPILY", "PLAID", "MANUAL"],
      account_status: ["ACTIVE", "INACTIVE", "HIDDEN", "CLOSED", "ERROR"],
      account_type: [
        "CHECKING",
        "SAVINGS",
        "CREDIT_CARD",
        "INVESTMENT",
        "LOAN",
        "MORTGAGE",
        "OTHER",
      ],
      achievement_status: ["LOCKED", "IN_PROGRESS", "UNLOCKED"],
      achievement_type: ["SAVINGS", "BUDGET", "CONSISTENCY", "EDUCATION"],
      audit_event_type: [
        "PASSWORD_CHANGED",
        "PASSWORD_RESET_REQUESTED",
        "PASSWORD_RESET_COMPLETED",
        "LOGIN_SUCCESS",
        "LOGIN_FAILED",
        "LOGIN_LOCKED",
        "ACCOUNT_CREATED",
        "ACCOUNT_DELETED",
        "ACCOUNT_SUSPENDED",
        "ACCOUNT_REACTIVATED",
        "TWO_FACTOR_ENABLED",
        "TWO_FACTOR_DISABLED",
      ],
      banking_connection_status: [
        "PENDING",
        "IN_PROGRESS",
        "AUTHORIZED",
        "REVOKED",
        "EXPIRED",
        "FAILED",
      ],
      banking_provider: ["MANUAL", "SALTEDGE", "TINK", "YAPILY", "TRUELAYER"],
      banking_sync_status: [
        "PENDING",
        "SYNCING",
        "SYNCED",
        "ERROR",
        "DISCONNECTED",
      ],
      budget_period: ["MONTHLY", "QUARTERLY", "YEARLY", "CUSTOM"],
      budget_status: ["ACTIVE", "COMPLETED", "DRAFT"],
      category_status: ["ACTIVE", "INACTIVE", "ARCHIVED"],
      category_type: ["INCOME", "EXPENSE"],
      flow_type: [
        "EXPENSE",
        "INCOME",
        "TRANSFER",
        "LIABILITY_PAYMENT",
        "REFUND",
      ],
      goal_status: ["ACTIVE", "COMPLETED", "ARCHIVED"],
      liability_status: ["ACTIVE", "PAID_OFF", "CLOSED"],
      liability_type: ["CREDIT_CARD", "BNPL", "LOAN", "MORTGAGE", "OTHER"],
      notification_priority: ["LOW", "MEDIUM", "HIGH", "URGENT"],
      notification_status: ["PENDING", "SENT", "READ", "DISMISSED"],
      notification_type: [
        "BUDGET_ALERT",
        "BILL_REMINDER",
        "TRANSACTION_ALERT",
        "SYNC_ERROR",
        "ACHIEVEMENT",
        "SYSTEM",
      ],
      recurrence_frequency: [
        "DAILY",
        "WEEKLY",
        "BIWEEKLY",
        "MONTHLY",
        "QUARTERLY",
        "YEARLY",
      ],
      scheduled_transaction_status: [
        "ACTIVE",
        "PAUSED",
        "COMPLETED",
        "CANCELLED",
      ],
      transaction_source: ["PLAID", "MANUAL", "IMPORT", "SALTEDGE"],
      transaction_status: ["PENDING", "POSTED", "CANCELLED"],
      transaction_type: ["DEBIT", "CREDIT"],
      transfer_role: ["SOURCE", "DESTINATION"],
      user_role: ["ADMIN", "MEMBER", "VIEWER"],
      user_status: ["ACTIVE", "INACTIVE", "SUSPENDED"],
    },
  },
} as const
