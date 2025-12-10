'use client';

import { useState, useRef, useEffect, useCallback, useMemo, KeyboardEvent } from 'react';
import { ChevronDown, X, Search, Check, Loader2 } from 'lucide-react';
import type { CategoryOption, CategoryType } from '@/services/categories.client';

/**
 * Map icon names to emoji representations
 * Provides visual icons for categories without a complex icon library
 */
const CATEGORY_ICONS: Record<string, string> = {
  // Food & Dining
  'shopping-cart': '🛒',
  'utensils': '🍴',
  'coffee': '☕',
  'wine': '🍷',
  'pizza': '🍕',
  'apple': '🍎',
  // Transportation
  'car': '🚗',
  'plane': '✈️',
  'train': '🚂',
  'bus': '🚌',
  'bike': '🚲',
  'fuel': '⛽',
  // Entertainment
  'film': '🎬',
  'music': '🎵',
  'tv': '📺',
  'gamepad': '🎮',
  'ticket': '🎫',
  // Shopping
  'shopping-bag': '🛍️',
  'shirt': '👕',
  'gift': '🎁',
  'tag': '🏷️',
  // Home & Utilities
  'home': '🏠',
  'bolt': '⚡',
  'droplet': '💧',
  'wifi': '📶',
  'phone': '📱',
  'wrench': '🔧',
  // Health & Personal
  'heart': '❤️',
  'pill': '💊',
  'activity': '💪',
  'scissors': '✂️',
  'sparkles': '✨',
  // Finance
  'wallet': '💰',
  'piggy-bank': '🐷',
  'credit-card': '💳',
  'bank': '🏦',
  'coins': '🪙',
  'trending-up': '📈',
  'trending-down': '📉',
  // Education & Work
  'book': '📚',
  'graduation-cap': '🎓',
  'briefcase': '💼',
  'laptop': '💻',
  'pen': '✏️',
  // Travel & Leisure
  'map': '🗺️',
  'compass': '🧭',
  'camera': '📷',
  'umbrella': '☂️',
  // Transfers
  'arrow-right-left': '↔️',
  'repeat': '🔄',
  'send': '📤',
  'download': '📥',
  // Default
  'circle': '⚪',
  'folder': '📁',
  'star': '⭐',
  'flag': '🚩',
};

/**
 * Get emoji icon for a category icon name
 */
function getCategoryIcon(iconName: string | null): string {
  if (!iconName) return '📊';
  return CATEGORY_ICONS[iconName.toLowerCase()] || '📊';
}

/**
 * CategorySelector Component Props
 */
export interface CategorySelectorProps {
  /** Currently selected category ID */
  value?: string;
  /** Callback when category is selected */
  onChange: (categoryId: string | undefined) => void;
  /** Available categories to display */
  categories: CategoryOption[];
  /** Filter to show only categories of this type */
  filterType?: CategoryType;
  /** Label for accessibility */
  label?: string;
  /** Placeholder text when no selection */
  placeholder?: string;
  /** Show search input in dropdown */
  searchable?: boolean;
  /** Allow clearing the selection */
  clearable?: boolean;
  /** Show categories grouped by type */
  showGroups?: boolean;
  /** Disable the selector */
  disabled?: boolean;
  /** Mark as required field */
  required?: boolean;
  /** Loading state */
  isLoading?: boolean;
  /** Error message to display */
  error?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * CategorySelector Component
 *
 * A searchable dropdown for selecting transaction categories.
 * Supports filtering by type, keyboard navigation, and accessibility.
 *
 * @example
 * ```tsx
 * <CategorySelector
 *   value={selectedCategory}
 *   onChange={setSelectedCategory}
 *   categories={categories}
 *   filterType="EXPENSE"
 *   searchable
 *   clearable
 * />
 * ```
 */
export function CategorySelector({
  value,
  onChange,
  categories,
  filterType,
  label,
  placeholder = 'Select a category',
  searchable = false,
  clearable = true,
  showGroups = false,
  disabled = false,
  required = false,
  isLoading = false,
  error,
  className = '',
}: CategorySelectorProps) {
  // State
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Filter categories by type and search
  const filteredCategories = useMemo(() => {
    let result = categories;

    // Filter by type
    if (filterType) {
      result = result.filter((cat) => cat.type === filterType);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((cat) =>
        cat.name.toLowerCase().includes(query)
      );
    }

    return result;
  }, [categories, filterType, searchQuery]);

  // Group categories by type (EXPENSE and INCOME only - transfers use FlowType)
  const groupedCategories = useMemo(() => {
    if (!showGroups) return null;

    const groups: Record<CategoryType, CategoryOption[]> = {
      EXPENSE: [],
      INCOME: [],
    };

    filteredCategories.forEach((cat) => {
      if (cat.type in groups) {
        groups[cat.type].push(cat);
      }
    });

    return groups;
  }, [filteredCategories, showGroups]);

  // Get flat list for keyboard navigation
  const flatOptions = useMemo(() => {
    if (showGroups && groupedCategories) {
      return [
        ...groupedCategories.EXPENSE,
        ...groupedCategories.INCOME,
      ];
    }
    return filteredCategories;
  }, [showGroups, groupedCategories, filteredCategories]);

  // Selected category
  const selectedCategory = useMemo(
    () => categories.find((cat) => cat.id === value),
    [categories, value]
  );

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchable && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, searchable]);

  // Reset highlight when options change
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [filteredCategories]);

  // Handle toggle dropdown
  const handleToggle = useCallback(() => {
    if (disabled) return;
    setIsOpen((prev) => !prev);
    if (isOpen) {
      setSearchQuery('');
    }
  }, [disabled, isOpen]);

  // Handle select category
  const handleSelect = useCallback(
    (categoryId: string) => {
      onChange(categoryId);
      setIsOpen(false);
      setSearchQuery('');
    },
    [onChange]
  );

  // Handle clear selection
  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange(undefined);
    },
    [onChange]
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return;

      switch (e.key) {
        case 'Enter':
          e.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
          } else if (highlightedIndex >= 0 && flatOptions[highlightedIndex]) {
            handleSelect(flatOptions[highlightedIndex].id);
          }
          break;

        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          setSearchQuery('');
          break;

        case 'ArrowDown':
          e.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
          } else {
            setHighlightedIndex((prev) =>
              prev < flatOptions.length - 1 ? prev + 1 : prev
            );
          }
          break;

        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
      }
    },
    [disabled, isOpen, highlightedIndex, flatOptions, handleSelect]
  );

  // Render category option
  const renderOption = (category: CategoryOption, index: number) => {
    const isSelected = category.id === value;
    const isHighlighted = index === highlightedIndex;

    return (
      <li
        key={category.id}
        role="option"
        aria-selected={isSelected}
        data-testid={`category-option-${category.id}`}
        onClick={() => handleSelect(category.id)}
        onMouseEnter={() => setHighlightedIndex(index)}
        className={`
          flex items-center gap-2 px-3 py-2 cursor-pointer
          ${isHighlighted ? 'bg-blue-50' : 'hover:bg-gray-50'}
          ${isSelected ? 'bg-blue-50' : ''}
        `}
      >
        {/* Icon and color indicator */}
        <span
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-sm"
          style={{ backgroundColor: category.color ? `${category.color}20` : '#f3f4f6' }}
          aria-hidden="true"
        >
          {getCategoryIcon(category.icon)}
        </span>

        {/* Category name */}
        <span className="flex-grow truncate">{category.name}</span>

        {/* Color dot */}
        {category.color && (
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: category.color }}
            aria-hidden="true"
          />
        )}

        {/* Selected check */}
        {isSelected && (
          <Check className="h-4 w-4 text-blue-600 flex-shrink-0" aria-hidden="true" />
        )}
      </li>
    );
  };

  // Render group header
  const renderGroupHeader = (type: CategoryType) => (
    <li
      key={`group-${type}`}
      className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50"
    >
      {type.toLowerCase()}
    </li>
  );

  // Render empty state
  const renderEmptyState = () => (
    <li className="px-3 py-4 text-center text-gray-500">
      {categories.length === 0 ? (
        'No categories available'
      ) : (
        'No results found'
      )}
    </li>
  );

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      onKeyDown={handleKeyDown}
    >
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Combobox trigger */}
      <div
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-disabled={disabled}
        aria-required={required}
        aria-label={label || 'Select a category'}
        aria-controls="category-listbox"
        tabIndex={disabled ? -1 : 0}
        onClick={handleToggle}
        className={`
          relative w-full flex items-center gap-2 px-3 py-2 rounded-lg border
          bg-white text-left cursor-pointer
          ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-100' : 'hover:border-gray-400'}
          ${error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}
          focus:outline-none focus:ring-2 focus:ring-offset-0
          transition-colors duration-150
        `}
      >
        {/* Loading spinner */}
        {isLoading && (
          <Loader2 className="h-4 w-4 text-gray-400 animate-spin" aria-hidden="true" />
        )}

        {/* Selected value or placeholder */}
        {selectedCategory ? (
          <div className="flex items-center gap-2 flex-grow min-w-0">
            {/* Icon with color background */}
            <span
              className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 text-sm"
              style={{ backgroundColor: selectedCategory.color ? `${selectedCategory.color}20` : '#f3f4f6' }}
              aria-hidden="true"
            >
              {getCategoryIcon(selectedCategory.icon)}
            </span>
            <span className="truncate">{selectedCategory.name}</span>
            {/* Color dot */}
            {selectedCategory.color && (
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: selectedCategory.color }}
                aria-hidden="true"
              />
            )}
          </div>
        ) : (
          <span className="text-gray-500 flex-grow">
            {isLoading ? 'Loading...' : categories.length === 0 ? 'No categories available' : placeholder}
          </span>
        )}

        {/* Clear button */}
        {clearable && selectedCategory && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear selection"
            className="p-1 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <X className="h-4 w-4 text-gray-400" aria-hidden="true" />
          </button>
        )}

        {/* Dropdown arrow */}
        <ChevronDown
          className={`h-4 w-4 text-gray-400 flex-shrink-0 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </div>

      {/* Error message */}
      {error && (
        <p className="mt-1 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg overflow-hidden"
          role="presentation"
        >
          {/* Search input */}
          {searchable && (
            <div className="p-2 border-b border-gray-200">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
                  aria-hidden="true"
                />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search categories..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  aria-label="Search categories"
                />
              </div>
            </div>
          )}

          {/* Options list */}
          <ul
            id="category-listbox"
            ref={listRef}
            role="listbox"
            aria-label="Categories"
            className="max-h-60 overflow-y-auto"
          >
            {flatOptions.length === 0 ? (
              renderEmptyState()
            ) : showGroups && groupedCategories ? (
              // Grouped rendering
              <>
                {groupedCategories.EXPENSE.length > 0 && (
                  <>
                    {renderGroupHeader('EXPENSE')}
                    {groupedCategories.EXPENSE.map((cat, i) =>
                      renderOption(cat, i)
                    )}
                  </>
                )}
                {groupedCategories.INCOME.length > 0 && (
                  <>
                    {renderGroupHeader('INCOME')}
                    {groupedCategories.INCOME.map((cat, i) =>
                      renderOption(
                        cat,
                        groupedCategories.EXPENSE.length + i
                      )
                    )}
                  </>
                )}
              </>
            ) : (
              // Flat rendering
              flatOptions.map((cat, i) => renderOption(cat, i))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export default CategorySelector;
