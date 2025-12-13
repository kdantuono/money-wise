/**
 * CSV Export Utility
 *
 * Exports transactions to CSV format with both ISO and localized dates.
 *
 * @module utils/csv-export
 */

import type { Transaction } from '@/services/transactions.client';

// =============================================================================
// Type Definitions
// =============================================================================

export interface CSVExportOptions {
  /** Filename without extension */
  filename?: string;
  /** Map of category IDs to names */
  categoryMap?: Map<string, string>;
  /** Map of account IDs to names */
  accountMap?: Map<string, string>;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Escape a value for CSV format
 * - Wraps in quotes if contains comma, quote, or newline
 * - Doubles any internal quotes
 */
function escapeCSV(value: string | null | undefined): string {
  if (value === null || value === undefined) return '';

  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Format date for display in localized format
 */
function formatLocalizedDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Format amount with sign
 */
function formatAmount(amount: number, type: 'DEBIT' | 'CREDIT'): string {
  const sign = type === 'CREDIT' ? '' : '-';
  return `${sign}${Math.abs(amount).toFixed(2)}`;
}

// =============================================================================
// Export Functions
// =============================================================================

/**
 * Convert transactions to CSV string
 *
 * @param transactions - Array of transactions to export
 * @param options - Export options
 * @returns CSV string
 */
export function transactionsToCSV(
  transactions: Transaction[],
  options: CSVExportOptions = {}
): string {
  const { categoryMap = new Map(), accountMap = new Map() } = options;

  // Headers
  const headers = [
    'Date (ISO)',
    'Date',
    'Description',
    'Merchant',
    'Amount',
    'Type',
    'Category',
    'Account',
    'Status',
    'Notes',
  ];

  // Rows
  const rows = transactions.map((tx) => [
    tx.date, // ISO date
    formatLocalizedDate(tx.date), // Localized date
    escapeCSV(tx.description),
    escapeCSV(tx.merchantName),
    formatAmount(tx.amount, tx.type),
    tx.type === 'CREDIT' ? 'Income' : 'Expense',
    escapeCSV(categoryMap.get(tx.categoryId || '') || 'Uncategorized'),
    escapeCSV(accountMap.get(tx.accountId) || ''),
    tx.status,
    escapeCSV(tx.notes),
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n');

  return csvContent;
}

/**
 * Download transactions as CSV file
 *
 * @param transactions - Array of transactions to export
 * @param options - Export options
 */
export function downloadTransactionsCSV(
  transactions: Transaction[],
  options: CSVExportOptions = {}
): void {
  const { filename = 'transactions' } = options;

  const csvContent = transactionsToCSV(transactions, options);

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;

  // Trigger download
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Cleanup
  URL.revokeObjectURL(url);
}

/**
 * Get CSV export for clipboard
 *
 * @param transactions - Array of transactions
 * @param options - Export options
 * @returns Promise that resolves when copied
 */
export async function copyTransactionsToClipboard(
  transactions: Transaction[],
  options: CSVExportOptions = {}
): Promise<void> {
  const csvContent = transactionsToCSV(transactions, options);
  if (typeof window !== 'undefined' && window.navigator?.clipboard) {
    await window.navigator.clipboard.writeText(csvContent);
  } else {
    throw new Error('Clipboard API not available');
  }
}
