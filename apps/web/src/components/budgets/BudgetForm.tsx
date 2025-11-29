'use client';

/**
 * BudgetForm Component
 *
 * Form for creating and editing budgets.
 * Supports category selection, amount input, period selection, and date ranges.
 *
 * @module components/budgets/BudgetForm
 */

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import type { Budget, CreateBudgetData, UpdateBudgetData, BudgetPeriod } from '@/services/budgets.client';

/**
 * Category option for dropdown
 */
export interface CategoryOption {
  id: string;
  name: string;
  icon?: string | null;
  color?: string | null;
}

export interface BudgetFormProps {
  /** Existing budget for edit mode (optional) */
  budget?: Budget;
  /** Available categories for selection */
  categories: CategoryOption[];
  /** Called when form is submitted */
  onSubmit: (data: CreateBudgetData | UpdateBudgetData) => Promise<void>;
  /** Called when form is cancelled */
  onCancel: () => void;
  /** Whether form is submitting */
  isSubmitting?: boolean;
  /** Error message to display */
  error?: string | null;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for testing */
  'data-testid'?: string;
}

/**
 * Budget period options
 */
const periodOptions: { value: BudgetPeriod; label: string }[] = [
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'YEARLY', label: 'Yearly' },
  { value: 'CUSTOM', label: 'Custom' },
];

/**
 * Get default dates for a period
 */
function getDefaultDates(period: BudgetPeriod): { startDate: string; endDate: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  switch (period) {
    case 'MONTHLY': {
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0);
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      };
    }
    case 'QUARTERLY': {
      const quarter = Math.floor(month / 3);
      const start = new Date(year, quarter * 3, 1);
      const end = new Date(year, quarter * 3 + 3, 0);
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      };
    }
    case 'YEARLY': {
      return {
        startDate: `${year}-01-01`,
        endDate: `${year}-12-31`,
      };
    }
    case 'CUSTOM':
    default: {
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0);
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      };
    }
  }
}

/**
 * BudgetForm Component
 *
 * @param props - Component props
 * @returns Budget form
 *
 * @example
 * ```tsx
 * <BudgetForm
 *   categories={categories}
 *   onSubmit={handleSubmit}
 *   onCancel={handleCancel}
 * />
 * ```
 */
export function BudgetForm({
  budget,
  categories,
  onSubmit,
  onCancel,
  isSubmitting = false,
  error,
  className,
  'data-testid': testId,
}: BudgetFormProps) {
  const isEditing = !!budget;

  // Form state
  const [name, setName] = useState(budget?.name || '');
  const [categoryId, setCategoryId] = useState(budget?.category?.id || '');
  const [amount, setAmount] = useState(budget?.amount?.toString() || '');
  const [period, setPeriod] = useState<BudgetPeriod>(budget?.period || 'MONTHLY');
  const [startDate, setStartDate] = useState(budget?.startDate || '');
  const [endDate, setEndDate] = useState(budget?.endDate || '');
  const [notes, setNotes] = useState(budget?.notes || '');
  const [formError, setFormError] = useState<string | null>(null);

  // Set default dates when period changes (only for new budgets)
  useEffect(() => {
    if (!isEditing && !startDate && !endDate) {
      const defaults = getDefaultDates(period);
      setStartDate(defaults.startDate);
      setEndDate(defaults.endDate);
    }
  }, [period, isEditing, startDate, endDate]);

  // Update dates when period changes
  const handlePeriodChange = (newPeriod: BudgetPeriod) => {
    setPeriod(newPeriod);
    if (newPeriod !== 'CUSTOM') {
      const defaults = getDefaultDates(newPeriod);
      setStartDate(defaults.startDate);
      setEndDate(defaults.endDate);
    }
  };

  // Form validation
  const validateForm = (): boolean => {
    if (!name.trim()) {
      setFormError('Budget name is required');
      return false;
    }
    if (!categoryId) {
      setFormError('Please select a category');
      return false;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setFormError('Amount must be greater than 0');
      return false;
    }
    if (!startDate || !endDate) {
      setFormError('Start and end dates are required');
      return false;
    }
    if (new Date(startDate) >= new Date(endDate)) {
      setFormError('End date must be after start date');
      return false;
    }
    setFormError(null);
    return true;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const data: CreateBudgetData = {
      name: name.trim(),
      categoryId,
      amount: parseFloat(amount),
      period,
      startDate,
      endDate,
      notes: notes.trim() || undefined,
    };

    await onSubmit(data);
  };

  return (
    <Card
      className={cn('w-full max-w-lg', className)}
      data-testid={testId || 'budget-form'}
    >
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>
            {isEditing ? 'Edit Budget' : 'Create Budget'}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Error display */}
          {(error || formError) && (
            <div
              className="rounded-md bg-red-50 p-3 text-sm text-red-700"
              role="alert"
            >
              {error || formError}
            </div>
          )}

          {/* Budget name */}
          <div className="space-y-2">
            <Label htmlFor="budget-name">Budget Name</Label>
            <Input
              id="budget-name"
              type="text"
              placeholder="e.g., Groceries Budget"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
              data-testid="budget-name-input"
            />
          </div>

          {/* Category selection */}
          <div className="space-y-2">
            <Label htmlFor="budget-category">Category</Label>
            <select
              id="budget-category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              disabled={isSubmitting}
              className={cn(
                'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                'disabled:cursor-not-allowed disabled:opacity-50'
              )}
              data-testid="budget-category-select"
            >
              <option value="">Select a category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="budget-amount">Budget Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                $
              </span>
              <Input
                id="budget-amount"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isSubmitting}
                className="pl-7"
                data-testid="budget-amount-input"
              />
            </div>
          </div>

          {/* Period */}
          <div className="space-y-2">
            <Label htmlFor="budget-period">Period</Label>
            <select
              id="budget-period"
              value={period}
              onChange={(e) => handlePeriodChange(e.target.value as BudgetPeriod)}
              disabled={isSubmitting}
              className={cn(
                'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                'disabled:cursor-not-allowed disabled:opacity-50'
              )}
              data-testid="budget-period-select"
            >
              {periodOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="budget-start-date">Start Date</Label>
              <Input
                id="budget-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={isSubmitting || period !== 'CUSTOM'}
                data-testid="budget-start-date-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="budget-end-date">End Date</Label>
              <Input
                id="budget-end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={isSubmitting || period !== 'CUSTOM'}
                data-testid="budget-end-date-input"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="budget-notes">Notes (optional)</Label>
            <textarea
              id="budget-notes"
              placeholder="Add any notes about this budget..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSubmitting}
              rows={3}
              className={cn(
                'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                'disabled:cursor-not-allowed disabled:opacity-50',
                'resize-none'
              )}
              data-testid="budget-notes-input"
            />
          </div>
        </CardContent>

        <CardFooter className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            data-testid="budget-cancel-button"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            data-testid="budget-submit-button"
          >
            {isSubmitting
              ? isEditing
                ? 'Saving...'
                : 'Creating...'
              : isEditing
                ? 'Save Changes'
                : 'Create Budget'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

export default BudgetForm;
