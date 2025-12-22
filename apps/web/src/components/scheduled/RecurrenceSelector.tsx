'use client';

import { memo, useState, useEffect } from 'react';
import type {
  RecurrenceFrequency,
  CreateRecurrenceRuleRequest,
} from '@/services/scheduled.client';

// =============================================================================
// Type Definitions
// =============================================================================

export interface RecurrenceSelectorProps {
  value?: CreateRecurrenceRuleRequest | null;
  onChange: (value: CreateRecurrenceRuleRequest | null) => void;
  disabled?: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const FREQUENCIES: { value: RecurrenceFrequency; label: string }[] = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'BIWEEKLY', label: 'Biweekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'YEARLY', label: 'Yearly' },
];

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

const DAYS_OF_MONTH = [
  ...Array.from({ length: 31 }, (_, i) => ({ value: i + 1, label: `${i + 1}` })),
  { value: -1, label: 'Last day' },
];

// =============================================================================
// Component Implementation
// =============================================================================

export const RecurrenceSelector = memo(function RecurrenceSelector({
  value,
  onChange,
  disabled = false,
}: RecurrenceSelectorProps) {
  const [isRecurring, setIsRecurring] = useState(!!value);
  const [frequency, setFrequency] = useState<RecurrenceFrequency>(
    value?.frequency || 'MONTHLY'
  );
  const [interval, setInterval] = useState(value?.interval || 1);
  const [dayOfWeek, setDayOfWeek] = useState<number | undefined>(value?.dayOfWeek);
  const [dayOfMonth, setDayOfMonth] = useState<number | undefined>(value?.dayOfMonth);
  const [endType, setEndType] = useState<'never' | 'date' | 'count'>(
    value?.endDate ? 'date' : value?.endCount ? 'count' : 'never'
  );
  const [endDate, setEndDate] = useState(value?.endDate || '');
  const [endCount, setEndCount] = useState(value?.endCount || 12);

  // Update parent when any value changes
  useEffect(() => {
    if (!isRecurring) {
      onChange(null);
      return;
    }

    const rule: CreateRecurrenceRuleRequest = {
      frequency,
      interval,
    };

    if (frequency === 'WEEKLY' && dayOfWeek !== undefined) {
      rule.dayOfWeek = dayOfWeek;
    }

    if (
      (frequency === 'MONTHLY' || frequency === 'QUARTERLY' || frequency === 'YEARLY') &&
      dayOfMonth !== undefined
    ) {
      rule.dayOfMonth = dayOfMonth;
    }

    if (endType === 'date' && endDate) {
      rule.endDate = endDate;
    }

    if (endType === 'count' && endCount > 0) {
      rule.endCount = endCount;
    }

    onChange(rule);
  }, [isRecurring, frequency, interval, dayOfWeek, dayOfMonth, endType, endDate, endCount, onChange]);

  const handleToggleRecurring = () => {
    setIsRecurring(!isRecurring);
  };

  return (
    <div className="space-y-4">
      {/* Recurring Toggle */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleToggleRecurring}
          disabled={disabled}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
            ${isRecurring ? 'bg-blue-600' : 'bg-gray-200'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform
              ${isRecurring ? 'translate-x-6' : 'translate-x-1'}`}
          />
        </button>
        <span className="text-sm font-medium text-gray-700">
          {isRecurring ? 'Recurring transaction' : 'One-time transaction'}
        </span>
      </div>

      {isRecurring && (
        <div className="space-y-4 pl-4 border-l-2 border-blue-100">
          {/* Frequency Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Repeat
            </label>
            <div className="flex flex-wrap gap-2">
              {FREQUENCIES.map((freq) => (
                <button
                  key={freq.value}
                  type="button"
                  onClick={() => setFrequency(freq.value)}
                  disabled={disabled}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors
                    ${frequency === freq.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    }
                    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {freq.label}
                </button>
              ))}
            </div>
          </div>

          {/* Interval */}
          {frequency !== 'BIWEEKLY' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Every
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={interval}
                  onChange={(e) => setInterval(Math.max(1, parseInt(e.target.value) || 1))}
                  disabled={disabled}
                  className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">
                  {frequency === 'DAILY' && (interval === 1 ? 'day' : 'days')}
                  {frequency === 'WEEKLY' && (interval === 1 ? 'week' : 'weeks')}
                  {frequency === 'MONTHLY' && (interval === 1 ? 'month' : 'months')}
                  {frequency === 'QUARTERLY' && (interval === 1 ? 'quarter' : 'quarters')}
                  {frequency === 'YEARLY' && (interval === 1 ? 'year' : 'years')}
                </span>
              </div>
            </div>
          )}

          {/* Day of Week (for weekly) */}
          {frequency === 'WEEKLY' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                On
              </label>
              <select
                value={dayOfWeek ?? ''}
                onChange={(e) =>
                  setDayOfWeek(e.target.value ? parseInt(e.target.value) : undefined)
                }
                disabled={disabled}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Same day each week</option>
                {DAYS_OF_WEEK.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Day of Month (for monthly/quarterly/yearly) */}
          {(frequency === 'MONTHLY' ||
            frequency === 'QUARTERLY' ||
            frequency === 'YEARLY') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                On day
              </label>
              <select
                value={dayOfMonth ?? ''}
                onChange={(e) =>
                  setDayOfMonth(e.target.value ? parseInt(e.target.value) : undefined)
                }
                disabled={disabled}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Same day each period</option>
                {DAYS_OF_MONTH.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* End Condition */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ends
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="endType"
                  checked={endType === 'never'}
                  onChange={() => setEndType('never')}
                  disabled={disabled}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Never</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="endType"
                  checked={endType === 'date'}
                  onChange={() => setEndType('date')}
                  disabled={disabled}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">On date</span>
                {endType === 'date' && (
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    disabled={disabled}
                    className="ml-2 px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="endType"
                  checked={endType === 'count'}
                  onChange={() => setEndType('count')}
                  disabled={disabled}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">After</span>
                {endType === 'count' && (
                  <>
                    <input
                      type="number"
                      min={1}
                      max={999}
                      value={endCount}
                      onChange={(e) =>
                        setEndCount(Math.max(1, parseInt(e.target.value) || 1))
                      }
                      disabled={disabled}
                      className="w-20 px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">occurrences</span>
                  </>
                )}
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default RecurrenceSelector;
