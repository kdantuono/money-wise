/**
 * Test ID Constants
 * Centralized data-testid values for E2E tests
 *
 * Usage:
 * - In components: <div data-testid={TEST_IDS.DASHBOARD.CONTAINER}>
 * - In tests: page.locator(TEST_IDS.DASHBOARD.CONTAINER)
 */

export const TEST_IDS = {
  // Authentication
  AUTH: {
    // Login
    LOGIN_FORM: '[data-testid="login-form"]',
    EMAIL_INPUT: '[data-testid="email-input"]',
    PASSWORD_INPUT: '[data-testid="password-input"]',
    LOGIN_BUTTON: '[data-testid="login-button"]',
    FORGOT_PASSWORD_LINK: '[data-testid="forgot-password-link"]',
    REGISTER_LINK: '[data-testid="register-link"]',

    // Register
    REGISTER_FORM: '[data-testid="register-form"]',
    FIRST_NAME_INPUT: '[data-testid="first-name-input"]',
    LAST_NAME_INPUT: '[data-testid="last-name-input"]',
    CONFIRM_PASSWORD_INPUT: '[data-testid="confirm-password-input"]',
    REGISTER_BUTTON: '[data-testid="register-button"]',

    // Common
    ERROR_MESSAGE: '[data-testid="error-message"]', // Login uses 'error-message', Register uses 'auth-error'
    ERROR_MESSAGE_REGISTER: '[data-testid="auth-error"]',
    SUCCESS_MESSAGE: '[data-testid="auth-success"]',
    LOADING_SPINNER: '[data-testid="auth-loading"]',
  },

  // Dashboard
  DASHBOARD: {
    CONTAINER: '[data-testid="dashboard"]',
    BALANCE_WIDGET: '[data-testid="balance-widget"]',
    CURRENT_BALANCE: '[data-testid="current-balance"]',
    CASH_FLOW_CHART: '[data-testid="cash-flow-chart"]',
    CATEGORY_BREAKDOWN: '[data-testid="category-breakdown"]',
    SPENDING_BREAKDOWN: '[data-testid="spending-breakdown"]',
    RECENT_TRANSACTIONS: '[data-testid="recent-transactions"]',
    TRANSACTION_ITEM: '[data-testid="transaction-item"]',
    TRANSACTION_DATE: '[data-testid="transaction-date"]',
    DATE_FILTER: '[data-testid="date-filter"]',
    REFRESH_BUTTON: '[data-testid="refresh-button"]',
  },

  // Navigation
  NAV: {
    MAIN_NAV: '[data-testid="main-nav"]',
    DASHBOARD_LINK: '[data-testid="nav-dashboard"]',
    BANKING_LINK: '[data-testid="nav-banking"]',
    ACCOUNTS_LINK: '[data-testid="nav-accounts"]',
    TRANSACTIONS_LINK: '[data-testid="nav-transactions"]',
    BUDGETS_LINK: '[data-testid="nav-budgets"]',
    REPORTS_LINK: '[data-testid="nav-reports"]',
    SETTINGS_LINK: '[data-testid="nav-settings"]',
    USER_MENU: '[data-testid="user-menu"]',
    LOGOUT_BUTTON: '[data-testid="logout-button"]',
  },

  // Banking
  BANKING: {
    CONTAINER: '[data-testid="banking-container"]',
    LINK_BANK_BUTTON: '[data-testid="link-bank-button"]',
    ACCOUNTS_LIST: '[data-testid="accounts-list"]',
    ACCOUNT_CARD: '[data-testid="account-card"]',
    ACCOUNT_NAME: '[data-testid="account-name"]',
    ACCOUNT_BALANCE: '[data-testid="account-balance"]',
    ACCOUNT_TYPE: '[data-testid="account-type"]',
    SYNC_BUTTON: '[data-testid="sync-button"]',
    DISCONNECT_BUTTON: '[data-testid="disconnect-button"]',
    BANKING_PROVIDER: '[data-testid="banking-provider"]',
  },

  // Transactions
  TRANSACTIONS: {
    CONTAINER: '[data-testid="transactions-container"]',
    LIST: '[data-testid="transactions-list"]',
    ITEM: '[data-testid="transaction-item"]',
    ADD_BUTTON: '[data-testid="add-transaction-button"]',
    EDIT_BUTTON: '[data-testid="edit-transaction-button"]',
    DELETE_BUTTON: '[data-testid="delete-transaction-button"]',

    // Form
    FORM: '[data-testid="transaction-form"]',
    AMOUNT_INPUT: '[data-testid="transaction-amount"]',
    DESCRIPTION_INPUT: '[data-testid="transaction-description"]',
    CATEGORY_SELECT: '[data-testid="transaction-category"]',
    DATE_INPUT: '[data-testid="transaction-date"]',
    ACCOUNT_SELECT: '[data-testid="transaction-account"]',
    NOTES_INPUT: '[data-testid="transaction-notes"]',
    SUBMIT_BUTTON: '[data-testid="save-transaction-button"]',
    CANCEL_BUTTON: '[data-testid="cancel-transaction-button"]',

    // Filters
    SEARCH_INPUT: '[data-testid="transaction-search"]',
    TYPE_FILTER: '[data-testid="transaction-type-filter"]',
    CATEGORY_FILTER: '[data-testid="transaction-category-filter"]',
    DATE_RANGE_FILTER: '[data-testid="transaction-date-range"]',
  },

  // Accounts
  ACCOUNTS: {
    CONTAINER: '[data-testid="accounts-container"]',
    LIST: '[data-testid="accounts-list"]',
    CARD: '[data-testid="account-card"]',
    ADD_BUTTON: '[data-testid="add-account-button"]',

    // Form
    FORM: '[data-testid="account-form"]',
    NAME_INPUT: '[data-testid="account-name"]',
    TYPE_SELECT: '[data-testid="account-type"]',
    BALANCE_INPUT: '[data-testid="account-balance"]',
    CURRENCY_SELECT: '[data-testid="account-currency"]',
    SUBMIT_BUTTON: '[data-testid="save-account-button"]',
  },

  // Budgets
  BUDGETS: {
    CONTAINER: '[data-testid="budgets-container"]',
    LIST: '[data-testid="budgets-list"]',
    CARD: '[data-testid="budget-card"]',
    ADD_BUTTON: '[data-testid="add-budget-button"]',

    // Form
    FORM: '[data-testid="budget-form"]',
    NAME_INPUT: '[data-testid="budget-name"]',
    AMOUNT_INPUT: '[data-testid="budget-amount"]',
    CATEGORY_SELECT: '[data-testid="budget-category"]',
    PERIOD_SELECT: '[data-testid="budget-period"]',
    SUBMIT_BUTTON: '[data-testid="save-budget-button"]',
  },

  // Common UI
  COMMON: {
    LOADING_SPINNER: '[data-testid="loading-spinner"]',
    ERROR_ALERT: '[data-testid="error-alert"]',
    SUCCESS_ALERT: '[data-testid="success-alert"]',
    WARNING_ALERT: '[data-testid="warning-alert"]',
    INFO_ALERT: '[data-testid="info-alert"]',
    MODAL: '[data-testid="modal"]',
    MODAL_CLOSE: '[data-testid="modal-close"]',
    CONFIRM_BUTTON: '[data-testid="confirm-button"]',
    CANCEL_BUTTON: '[data-testid="cancel-button"]',
    SUBMIT_BUTTON: '[data-testid="submit-button"]',
    DELETE_BUTTON: '[data-testid="delete-button"]',
    EDIT_BUTTON: '[data-testid="edit-button"]',
  },

  // Forms
  FORM: {
    ERROR: '[data-testid="form-error"]',
    SUCCESS: '[data-testid="form-success"]',
    SUBMIT: '[data-testid="form-submit"]',
    CANCEL: '[data-testid="form-cancel"]',
    FIELD_ERROR: (fieldName: string) => `[data-testid="${fieldName}-error"]`,
  },
} as const;

/**
 * Role-based selectors (preferred for accessibility)
 */
export const ROLES = {
  BUTTON: '[role="button"]',
  LINK: '[role="link"]',
  ALERT: '[role="alert"]',
  DIALOG: '[role="dialog"]',
  LISTBOX: '[role="listbox"]',
  OPTION: '[role="option"]',
  NAVIGATION: '[role="navigation"]',
  MAIN: '[role="main"]',
  FORM: '[role="form"]',
  SEARCH: '[role="search"]',
} as const;

/**
 * Helper to build custom test ID selector
 */
export function testId(id: string): string {
  return `[data-testid="${id}"]`;
}

/**
 * Helper to build combined selector (test ID or fallback)
 */
export function testIdOr(id: string, fallback: string): string {
  return `[data-testid="${id}"], ${fallback}`;
}
