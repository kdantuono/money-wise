/**
 * Financial Calendar Page
 *
 * Displays scheduled transactions and upcoming payments in a calendar view.
 * Uses the /api/scheduled/calendar endpoint for data.
 *
 * @module app/dashboard/calendar/page
 */

'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Calendar as CalendarIcon,
  DollarSign,
  ArrowUpCircle,
  ArrowDownCircle,
} from 'lucide-react';
import Link from 'next/link';

// =============================================================================
// Types
// =============================================================================

interface CalendarEvent {
  id: string;
  scheduledTransactionId: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
  type: 'DEBIT' | 'CREDIT';
  flowType?: string;
  category?: {
    id: string;
    name: string;
    icon?: string;
    color?: string;
  };
  account?: {
    id: string;
    name: string;
  };
  isOverdue: boolean;
  status: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getMonthDays(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: Date[] = [];

  // Add days from previous month to fill the first week
  const firstDayOfWeek = firstDay.getDay();
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    days.push(new Date(year, month, -i));
  }

  // Add all days of current month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }

  // Add days from next month to complete the last week
  const remainingDays = 7 - (days.length % 7);
  if (remainingDays < 7) {
    for (let i = 1; i <= remainingDays; i++) {
      days.push(new Date(year, month + 1, i));
    }
  }

  return days;
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

// =============================================================================
// Component
// =============================================================================

export default function CalendarPage() {
  // State
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Computed values
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const days = useMemo(() => getMonthDays(currentYear, currentMonth), [currentYear, currentMonth]);

  /**
   * Fetch calendar events for the current month
   */
  const fetchEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get first and last day of month (with buffer for display)
      const startDate = new Date(currentYear, currentMonth, 1);
      const endDate = new Date(currentYear, currentMonth + 1, 0);

      // Format dates as ISO strings
      const params = new URLSearchParams({
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      });

      const response = await fetch(`/api/scheduled/calendar?${params}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch calendar events');
      }

      const data = await response.json();
      setEvents(data);
    } catch (err) {
      console.error('Failed to fetch calendar events:', err);
      setError('Failed to load calendar events. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [currentYear, currentMonth]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  /**
   * Navigate to previous month
   */
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  /**
   * Navigate to next month
   */
  const goToNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  /**
   * Navigate to today
   */
  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  /**
   * Get events for a specific day
   */
  const getEventsForDay = (date: Date): CalendarEvent[] => {
    return events.filter((event) => {
      const eventDate = new Date(event.date);
      return isSameDay(eventDate, date);
    });
  };

  /**
   * Get selected day events
   */
  const selectedDayEvents = selectedDate ? getEventsForDay(selectedDate) : [];

  // Calculate monthly totals
  const monthlyTotals = useMemo(() => {
    let income = 0;
    let expenses = 0;

    events.forEach((event) => {
      if (event.type === 'CREDIT') {
        income += event.amount;
      } else {
        expenses += event.amount;
      }
    });

    return { income, expenses, net: income - expenses };
  }, [events]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financial Calendar</h1>
          <p className="text-sm text-gray-500 mt-1">
            View your scheduled transactions and upcoming payments
          </p>
        </div>
        <Link
          href="/dashboard/scheduled"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg
            hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <CalendarIcon className="h-4 w-4" />
          Manage Scheduled
        </Link>
      </div>

      {/* Monthly Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <ArrowUpCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Expected Income</p>
              <p className="text-xl font-semibold text-green-600">
                {formatCurrency(monthlyTotals.income)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <ArrowDownCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Expected Expenses</p>
              <p className="text-xl font-semibold text-red-600">
                {formatCurrency(monthlyTotals.expenses)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Net Cash Flow</p>
              <p
                className={`text-xl font-semibold ${
                  monthlyTotals.net >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {monthlyTotals.net >= 0 ? '+' : ''}
                {formatCurrency(monthlyTotals.net)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Calendar Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{monthName}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={goToToday}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg
                hover:bg-gray-200 transition-colors"
            >
              Today
            </button>
            <button
              onClick={goToPreviousMonth}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>
            <button
              onClick={goToNextMonth}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Next month"
            >
              <ChevronRight className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={fetchEvents}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Calendar Grid */}
        {!isLoading && !error && (
          <>
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 border-b border-gray-200">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div
                  key={day}
                  className="px-2 py-3 text-center text-sm font-medium text-gray-500 bg-gray-50"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7">
              {days.map((date, index) => {
                const dayEvents = getEventsForDay(date);
                const isCurrentMonth = date.getMonth() === currentMonth;
                const isSelected = selectedDate && isSameDay(date, selectedDate);
                const isTodayDate = isToday(date);

                return (
                  <button
                    key={index}
                    onClick={() => setSelectedDate(date)}
                    className={`
                      min-h-[100px] p-2 border-b border-r border-gray-100 text-left
                      transition-colors hover:bg-gray-50
                      ${!isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''}
                      ${isSelected ? 'bg-blue-50 ring-2 ring-blue-500 ring-inset' : ''}
                    `}
                  >
                    <div
                      className={`
                        w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium mb-1
                        ${isTodayDate ? 'bg-blue-600 text-white' : ''}
                      `}
                    >
                      {date.getDate()}
                    </div>

                    {/* Event indicators */}
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map((event) => (
                        <div
                          key={event.id}
                          className={`
                            text-xs px-1.5 py-0.5 rounded truncate
                            ${
                              event.type === 'CREDIT'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }
                            ${event.isOverdue ? 'ring-1 ring-orange-400' : ''}
                          `}
                          title={`${event.description}: ${formatCurrency(event.amount, event.currency)}`}
                        >
                          {formatCurrency(event.amount, event.currency)}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-xs text-gray-500 px-1">
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Selected Day Details */}
      {selectedDate && selectedDayEvents.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {selectedDate.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </h3>
          <div className="space-y-3">
            {selectedDayEvents.map((event) => (
              <Link
                key={event.id}
                href={`/dashboard/scheduled`}
                className="flex items-center justify-between p-4 rounded-lg border border-gray-200
                  hover:border-gray-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      event.type === 'CREDIT' ? 'bg-green-100' : 'bg-red-100'
                    }`}
                  >
                    {event.type === 'CREDIT' ? (
                      <ArrowUpCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <ArrowDownCircle className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{event.description}</p>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      {event.category && <span>{event.category.name}</span>}
                      {event.account && (
                        <>
                          <span>•</span>
                          <span>{event.account.name}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`font-semibold ${
                      event.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {event.type === 'CREDIT' ? '+' : '-'}
                    {formatCurrency(event.amount, event.currency)}
                  </p>
                  {event.isOverdue && (
                    <span className="text-xs text-orange-600 font-medium">Overdue</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty State for Selected Day */}
      {selectedDate && selectedDayEvents.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
          <CalendarIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No scheduled transactions</h3>
          <p className="text-gray-500 text-sm">
            {selectedDate.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
      )}
    </div>
  );
}
