'use client';

import { useState, useCallback } from 'react';
import { Check } from 'lucide-react';

// =============================================================================
// Constants
// =============================================================================

/**
 * Preset color palette for categories
 * Organized in rows of 4 for visual harmony
 */
export const CATEGORY_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', // Red, Orange, Amber, Yellow
  '#84CC16', '#22C55E', '#10B981', '#14B8A6', // Lime, Green, Emerald, Teal
  '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1', // Cyan, Sky, Blue, Indigo
  '#8B5CF6', '#A855F7', '#D946EF', '#EC4899', // Violet, Purple, Fuchsia, Pink
  '#78716C', '#64748B', // Stone, Slate (neutrals)
] as const;

export type CategoryColor = typeof CATEGORY_COLORS[number];

/**
 * Color name mappings for accessibility
 */
const COLOR_NAMES: Record<string, string> = {
  '#EF4444': 'Red',
  '#F97316': 'Orange',
  '#F59E0B': 'Amber',
  '#EAB308': 'Yellow',
  '#84CC16': 'Lime',
  '#22C55E': 'Green',
  '#10B981': 'Emerald',
  '#14B8A6': 'Teal',
  '#06B6D4': 'Cyan',
  '#0EA5E9': 'Sky',
  '#3B82F6': 'Blue',
  '#6366F1': 'Indigo',
  '#8B5CF6': 'Violet',
  '#A855F7': 'Purple',
  '#D946EF': 'Fuchsia',
  '#EC4899': 'Pink',
  '#78716C': 'Stone',
  '#64748B': 'Slate',
};

// =============================================================================
// Type Definitions
// =============================================================================

export interface ColorPickerProps {
  /** Currently selected color (hex code) */
  value?: string | null;
  /** Callback when color is selected */
  onChange: (color: string) => void;
  /** Additional CSS classes */
  className?: string;
  /** Whether the picker is disabled */
  disabled?: boolean;
  /** Show custom hex input */
  showCustomInput?: boolean;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get the name of a color from its hex code
 */
function getColorName(hex: string): string {
  return COLOR_NAMES[hex.toUpperCase()] || COLOR_NAMES[hex] || 'Custom';
}

/**
 * Validate hex color format
 */
function isValidHex(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

// =============================================================================
// Component Implementation
// =============================================================================

export function ColorPicker({
  value,
  onChange,
  className = '',
  disabled = false,
  showCustomInput = false,
}: ColorPickerProps) {
  const [customColor, setCustomColor] = useState(value || '');
  const [customError, setCustomError] = useState<string | null>(null);

  // Handle preset color selection
  const handlePresetSelect = useCallback(
    (color: string) => {
      if (!disabled) {
        onChange(color);
        setCustomColor(color);
        setCustomError(null);
      }
    },
    [onChange, disabled]
  );

  // Handle custom color input
  const handleCustomChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value;
      setCustomColor(input);

      // Add # prefix if missing
      const colorValue = input.startsWith('#') ? input : `#${input}`;

      if (colorValue.length === 7) {
        if (isValidHex(colorValue)) {
          onChange(colorValue.toUpperCase());
          setCustomError(null);
        } else {
          setCustomError('Invalid hex color');
        }
      } else {
        setCustomError(null);
      }
    },
    [onChange]
  );

  // Normalize value for comparison
  const normalizedValue = value?.toUpperCase();

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Color Grid */}
      <div
        className="grid grid-cols-9 gap-2"
        role="listbox"
        aria-label="Available colors"
      >
        {CATEGORY_COLORS.map((color) => {
          const isSelected = normalizedValue === color;
          const colorName = getColorName(color);

          return (
            <button
              key={color}
              type="button"
              onClick={() => handlePresetSelect(color)}
              disabled={disabled}
              title={colorName}
              role="option"
              aria-selected={isSelected}
              aria-label={colorName}
              className={`
                relative w-8 h-8 rounded-full
                transition-transform duration-150
                ${isSelected ? 'ring-2 ring-offset-2 ring-gray-900 scale-110' : 'hover:scale-110'}
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900
              `}
              style={{ backgroundColor: color }}
            >
              {isSelected && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <Check
                    className={`h-4 w-4 ${
                      ['#EAB308', '#F59E0B', '#84CC16'].includes(color)
                        ? 'text-gray-900'
                        : 'text-white'
                    }`}
                  />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Custom Color Input */}
      {showCustomInput && (
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Custom:</label>
          <div className="flex items-center gap-2 flex-1">
            {/* Color preview */}
            <div
              className="w-8 h-8 rounded-full border-2 border-gray-300 flex-shrink-0"
              style={{
                backgroundColor: isValidHex(customColor) ? customColor : '#ffffff',
              }}
            />
            {/* Hex input */}
            <input
              type="text"
              value={customColor}
              onChange={handleCustomChange}
              placeholder="#FF5733"
              disabled={disabled}
              maxLength={7}
              className={`
                flex-1 px-3 py-1.5 text-sm border rounded-md
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                ${customError ? 'border-red-300' : 'border-gray-300'}
                ${disabled ? 'opacity-50 bg-gray-100' : ''}
              `}
              aria-label="Custom hex color"
            />
          </div>
        </div>
      )}

      {/* Error message */}
      {customError && (
        <p className="text-sm text-red-600">{customError}</p>
      )}

      {/* Selected color display */}
      {value && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>Selected:</span>
          <span
            className="w-4 h-4 rounded-full border border-gray-300"
            style={{ backgroundColor: value }}
          />
          <span className="font-medium">
            {getColorName(value)} ({value})
          </span>
        </div>
      )}
    </div>
  );
}

export default ColorPicker;
