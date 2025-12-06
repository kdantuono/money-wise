'use client';

import { memo } from 'react';
import { X, Tag, Trash2, CheckSquare, Square, Loader2 } from 'lucide-react';

// =============================================================================
// Type Definitions
// =============================================================================

export interface BulkActionsBarProps {
  /** Number of selected items */
  selectedCount: number;
  /** Total number of items */
  totalCount: number;
  /** Whether all items are selected */
  isAllSelected: boolean;
  /** Whether a bulk operation is in progress */
  isProcessing?: boolean;
  /** Callback to categorize selected items */
  onCategorize: () => void;
  /** Callback to delete selected items */
  onDelete: () => void;
  /** Callback to clear selection */
  onClearSelection: () => void;
  /** Callback to select all items */
  onSelectAll: () => void;
}

// =============================================================================
// Component Implementation
// =============================================================================

/**
 * BulkActionsBar Component
 *
 * Fixed bar at the bottom of the screen showing bulk action options
 * when transactions are selected. Provides categorize, delete, and
 * selection management actions.
 */
export const BulkActionsBar = memo(function BulkActionsBar({
  selectedCount,
  totalCount,
  isAllSelected,
  isProcessing = false,
  onCategorize,
  onDelete,
  onClearSelection,
  onSelectAll,
}: BulkActionsBarProps) {
  // Don't render if nothing is selected
  if (selectedCount === 0) {
    return null;
  }

  const itemText = selectedCount === 1 ? 'item' : 'items';

  return (
    <div
      role="toolbar"
      aria-label="Bulk actions"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3">
          {/* Selection Info */}
          <div className="flex items-center gap-4">
            {/* Selected Count */}
            <div role="status" className="flex items-center gap-2">
              {isProcessing && (
                <Loader2
                  data-testid="processing-spinner"
                  className="h-4 w-4 animate-spin text-blue-600"
                />
              )}
              <span className="text-sm font-medium text-gray-900">
                {isProcessing ? (
                  'Processing...'
                ) : (
                  <>
                    {selectedCount} {itemText} selected
                  </>
                )}
              </span>
            </div>

            {/* Select All / Deselect All Toggle */}
            <button
              type="button"
              onClick={isAllSelected ? onClearSelection : onSelectAll}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium
                text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg
                focus:outline-none focus:ring-2 focus:ring-blue-500
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors duration-150"
            >
              {isAllSelected ? (
                <>
                  <Square className="h-4 w-4" />
                  Deselect All
                </>
              ) : (
                <>
                  <CheckSquare className="h-4 w-4" />
                  Select All ({totalCount})
                </>
              )}
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Categorize Button */}
            <button
              type="button"
              onClick={onCategorize}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium
                text-gray-700 bg-white border border-gray-300 rounded-lg
                hover:bg-gray-50 hover:text-gray-900
                focus:outline-none focus:ring-2 focus:ring-blue-500
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors duration-150"
            >
              <Tag className="h-4 w-4" />
              Categorize
            </button>

            {/* Delete Button */}
            <button
              type="button"
              onClick={onDelete}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium
                text-red-600 bg-white border border-red-300 rounded-lg
                hover:bg-red-50 hover:text-red-700
                focus:outline-none focus:ring-2 focus:ring-red-500
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors duration-150"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>

            {/* Cancel / Clear Selection Button */}
            <button
              type="button"
              onClick={onClearSelection}
              disabled={isProcessing}
              aria-label="Clear selection"
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg
                focus:outline-none focus:ring-2 focus:ring-gray-500
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors duration-150"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default BulkActionsBar;
