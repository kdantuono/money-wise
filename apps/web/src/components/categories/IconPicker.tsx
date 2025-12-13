'use client';

import { useState, useMemo, useCallback, memo } from 'react';
import {
  Search, Check,
  // Food & Dining
  Utensils, Coffee, Pizza, Wine, Beer, Soup, Salad, Sandwich, Beef, Drumstick,
  IceCream, Cake, Cookie, Apple, Cherry, Egg, Fish,
  CupSoda, Milk, Candy, Popcorn, Ham,
  // Shopping
  ShoppingCart, ShoppingBag, ShoppingBasket, Store, Shirt, Gift, Package,
  Percent, Tags, Tag, Barcode, Receipt, CreditCard, Wallet, Gem, Watch, Glasses,
  // Transportation
  Car, Bus, Train, Plane, Fuel, ParkingCircle, Bike, Ship, Rocket, Truck,
  Navigation, MapPin, Route, Compass,
  // Housing & Utilities
  Home, Building, Building2, Key, Lightbulb, Thermometer, Droplet, Plug, Zap,
  Flame, Wind, Snowflake, Sun, Bath, Bed, Sofa, Lamp, DoorOpen, Warehouse,
  Factory, TreeDeciduous, Fence,
  // Entertainment
  Tv, Music, Gamepad2, Film, Ticket, Clapperboard, Radio, Headphones, Speaker,
  Mic, Camera, Video, Youtube, Play, Puzzle, Drama, PartyPopper, Sparkles,
  // Health & Fitness
  HeartPulse, Heart, Pill, Stethoscope, Dumbbell, Activity, Syringe, Cross,
  Hospital, Footprints, PersonStanding, Timer, Medal, Trophy,
  // Finance & Business
  PiggyBank, Banknote, Coins, CircleDollarSign, TrendingUp, TrendingDown,
  BarChart3, LineChart, PieChart, Calculator, Briefcase, Landmark, Vault,
  FileText, ClipboardList, Scale,
  // Education
  Book, BookOpen, GraduationCap, Laptop, Monitor, Smartphone, Tablet, Library,
  School, Pen, Pencil, Highlighter, Notebook, Languages, Globe,
  // Travel & Leisure
  Luggage, Map, Mountain, Trees, Palmtree, Umbrella, Sunrise, Tent,
  Binoculars, Anchor, Sailboat, BedDouble,
  // Personal Care
  Scissors, Star, Smile, Flower, Flower2, Waves, Palette,
  // Family & Pets
  Baby, Dog, Cat, Bird, Rabbit, Users,
  // Bills & Subscriptions
  Mail, Phone, Wifi, Cloud, Server, HardDrive, Newspaper, Repeat, CalendarCheck, Bell,
  // Other
  HelpCircle, MoreHorizontal, Folder, Flag, Bookmark, Archive, Box, CircleDot,
  Circle, Square, Triangle, Hexagon, Shapes, Hash, AtSign,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// =============================================================================
// Pre-built icon map for performance (tree-shaking friendly)
// =============================================================================

const ICON_MAP: Record<string, LucideIcon> = {
  // Food & Dining
  Utensils, Coffee, Pizza, Wine, Beer, Soup, Salad, Sandwich, Beef, Drumstick,
  IceCream, Cake, Cookie, Apple, Cherry, Egg, Fish,
  CupSoda, Milk, Candy, Popcorn, Ham,
  // Shopping
  ShoppingCart, ShoppingBag, ShoppingBasket, Store, Shirt, Gift, Package,
  Percent, Tags, Tag, Barcode, Receipt, CreditCard, Wallet, Gem, Watch, Glasses,
  // Transportation
  Car, Bus, Train, Plane, Fuel, ParkingCircle, Bike, Ship, Rocket, Truck,
  Navigation, MapPin, Route, Compass,
  // Housing & Utilities
  Home, Building, Building2, Key, Lightbulb, Thermometer, Droplet, Plug, Zap,
  Flame, Wind, Snowflake, Sun, Bath, Bed, Sofa, Lamp, DoorOpen, Warehouse,
  Factory, TreeDeciduous, Fence,
  // Entertainment
  Tv, Music, Gamepad2, Film, Ticket, Clapperboard, Radio, Headphones, Speaker,
  Mic, Camera, Video, Youtube, Play, Puzzle, Drama, PartyPopper, Sparkles,
  // Health & Fitness
  HeartPulse, Heart, Pill, Stethoscope, Dumbbell, Activity, Syringe, Cross,
  Hospital, Footprints, PersonStanding, Timer, Medal, Trophy,
  // Finance & Business
  PiggyBank, Banknote, Coins, CircleDollarSign, TrendingUp, TrendingDown,
  BarChart3, LineChart, PieChart, Calculator, Briefcase, Landmark, Vault,
  FileText, ClipboardList, Scale,
  // Education
  Book, BookOpen, GraduationCap, Laptop, Monitor, Smartphone, Tablet, Library,
  School, Pen, Pencil, Highlighter, Notebook, Languages, Globe,
  // Travel & Leisure
  Luggage, Map, Mountain, Trees, Palmtree, Umbrella, Sunrise, Tent,
  Binoculars, Anchor, Sailboat, BedDouble,
  // Personal Care
  Scissors, Star, Smile, Flower, Flower2, Waves, Palette,
  // Family & Pets
  Baby, Dog, Cat, Bird, Rabbit, Users,
  // Bills & Subscriptions
  Mail, Phone, Wifi, Cloud, Server, HardDrive, Newspaper, Repeat, CalendarCheck, Bell,
  // Other
  HelpCircle, MoreHorizontal, Folder, Flag, Bookmark, Archive, Box, CircleDot,
  Circle, Square, Triangle, Hexagon, Shapes, Hash, AtSign,
};

// =============================================================================
// Icons organized by category
// =============================================================================

export const ICON_CATEGORIES = {
  'Food & Dining': [
    'Utensils', 'Coffee', 'Pizza', 'Wine', 'Beer', 'Soup', 'Salad', 'Sandwich', 'Beef', 'Drumstick',
    'IceCream', 'Cake', 'Cookie', 'Apple', 'Cherry', 'Egg', 'Fish',
    'CupSoda', 'Milk', 'Candy', 'Popcorn', 'Ham',
  ],
  'Shopping': [
    'ShoppingCart', 'ShoppingBag', 'ShoppingBasket', 'Store', 'Shirt', 'Gift',
    'Package', 'Percent', 'Tags', 'Tag', 'Barcode', 'Receipt', 'CreditCard',
    'Wallet', 'Gem', 'Watch', 'Glasses',
  ],
  'Transportation': [
    'Car', 'Bus', 'Train', 'Plane', 'Fuel', 'ParkingCircle', 'Bike', 'Ship',
    'Rocket', 'Truck', 'Navigation', 'MapPin', 'Route', 'Compass',
  ],
  'Housing & Utilities': [
    'Home', 'Building', 'Building2', 'Key', 'Lightbulb', 'Thermometer',
    'Droplet', 'Plug', 'Zap', 'Flame', 'Wind', 'Snowflake', 'Sun', 'Bath',
    'Bed', 'Sofa', 'Lamp', 'DoorOpen', 'Warehouse', 'Factory', 'TreeDeciduous', 'Fence',
  ],
  'Entertainment': [
    'Tv', 'Music', 'Gamepad2', 'Film', 'Ticket', 'Clapperboard', 'Radio',
    'Headphones', 'Speaker', 'Mic', 'Camera', 'Video', 'Youtube', 'Play',
    'Puzzle', 'Drama', 'PartyPopper', 'Sparkles',
  ],
  'Health & Fitness': [
    'HeartPulse', 'Heart', 'Pill', 'Stethoscope', 'Dumbbell', 'Activity',
    'Syringe', 'Cross', 'Hospital', 'Footprints', 'PersonStanding', 'Timer',
    'Medal', 'Trophy',
  ],
  'Finance & Business': [
    'Wallet', 'CreditCard', 'PiggyBank', 'Banknote', 'Coins', 'CircleDollarSign',
    'TrendingUp', 'TrendingDown', 'BarChart3', 'LineChart', 'PieChart',
    'Calculator', 'Briefcase', 'Landmark', 'Vault', 'FileText', 'ClipboardList', 'Scale',
  ],
  'Education': [
    'Book', 'BookOpen', 'GraduationCap', 'Laptop', 'Monitor', 'Smartphone',
    'Tablet', 'Library', 'School', 'Pen', 'Pencil', 'Highlighter', 'Notebook',
    'Languages', 'Globe',
  ],
  'Travel & Leisure': [
    'Plane', 'Luggage', 'Map', 'Compass', 'Mountain', 'Trees', 'Palmtree',
    'Umbrella', 'Sun', 'Sunrise', 'Tent', 'Camera', 'Binoculars', 'Anchor',
    'Ship', 'Sailboat', 'BedDouble', 'Ticket',
  ],
  'Personal Care': [
    'Scissors', 'Sparkles', 'Heart', 'Star', 'Smile', 'Flower', 'Flower2',
    'Bath', 'Waves', 'Droplet', 'Palette',
  ],
  'Family & Pets': [
    'Baby', 'Dog', 'Cat', 'Bird', 'Fish', 'Rabbit', 'Users', 'Heart', 'Home',
    'Gift', 'Cake', 'PartyPopper', 'Candy', 'Gamepad2',
  ],
  'Bills & Subscriptions': [
    'Receipt', 'FileText', 'Mail', 'Phone', 'Wifi', 'Globe', 'Cloud', 'Server',
    'HardDrive', 'Tv', 'Newspaper', 'Radio', 'Music', 'Film', 'Repeat',
    'CalendarCheck', 'Bell', 'CreditCard',
  ],
  'Other': [
    'HelpCircle', 'MoreHorizontal', 'Folder', 'Tag', 'Star', 'Flag', 'Bookmark',
    'Archive', 'Box', 'CircleDot', 'Circle', 'Square', 'Triangle', 'Hexagon',
    'Shapes', 'Hash', 'AtSign',
  ],
} as const;

// Flat list for backward compatibility
export const CATEGORY_ICONS = Object.values(ICON_CATEGORIES).flat();

export type IconCategoryName = keyof typeof ICON_CATEGORIES;
export type CategoryIconName = typeof CATEGORY_ICONS[number];

// =============================================================================
// Type Definitions
// =============================================================================

export interface IconPickerProps {
  value?: string | null;
  onChange: (iconName: string) => void;
  className?: string;
  disabled?: boolean;
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatIconName(name: string): string {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/([0-9]+)/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

// =============================================================================
// Memoized Icon Button Component
// =============================================================================

interface IconButtonProps {
  iconName: string;
  isSelected: boolean;
  disabled: boolean;
  onSelect: (name: string) => void;
}

const IconButton = memo(function IconButton({
  iconName,
  isSelected,
  disabled,
  onSelect,
}: IconButtonProps) {
  const IconComponent = ICON_MAP[iconName];
  if (!IconComponent) return null;

  const displayName = formatIconName(iconName);

  return (
    <button
      type="button"
      onClick={() => onSelect(iconName)}
      disabled={disabled}
      title={displayName}
      role="option"
      aria-selected={isSelected}
      className={`
        relative flex items-center justify-center p-2.5 rounded-lg
        transition-all duration-150
        ${isSelected
          ? 'bg-blue-100 ring-2 ring-blue-500 scale-110'
          : 'bg-white hover:bg-gray-100 hover:scale-105'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
      `}
    >
      <IconComponent className="h-5 w-5 text-gray-700" />
      {isSelected && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
          <Check className="h-2.5 w-2.5 text-white" />
        </span>
      )}
    </button>
  );
});

// =============================================================================
// Main Component
// =============================================================================

export function IconPicker({
  value,
  onChange,
  className = '',
  disabled = false,
}: IconPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<IconCategoryName | 'all'>('all');

  const categoryNames = useMemo(() => Object.keys(ICON_CATEGORIES) as IconCategoryName[], []);

  // Filter icons based on search query and category
  const filteredIcons = useMemo(() => {
    let icons: string[];

    if (activeCategory === 'all') {
      icons = [...new Set(CATEGORY_ICONS)];
    } else {
      icons = [...ICON_CATEGORIES[activeCategory]];
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      icons = icons.filter((iconName) =>
        formatIconName(iconName).toLowerCase().includes(query)
      );
    }

    return icons;
  }, [searchQuery, activeCategory]);

  // Show grouped view only when "All" selected and no search
  const showGrouped = activeCategory === 'all' && !searchQuery.trim();

  const handleSelect = useCallback(
    (iconName: string) => {
      if (!disabled) {
        onChange(iconName);
      }
    },
    [onChange, disabled]
  );

  const SelectedIcon = value ? ICON_MAP[value] : null;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
          aria-hidden="true"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search icons..."
          disabled={disabled}
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            disabled:opacity-50 disabled:bg-gray-100"
          aria-label="Search icons"
        />
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => setActiveCategory('all')}
          disabled={disabled}
          className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors
            ${activeCategory === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          All
        </button>
        {categoryNames.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            disabled={disabled}
            className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors
              ${activeCategory === cat
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Icon Grid */}
      <div
        className="max-h-64 overflow-y-auto p-2 border border-gray-200 rounded-lg bg-gray-50"
        role="listbox"
        aria-label="Available icons"
      >
        {showGrouped ? (
          <div className="space-y-4">
            {categoryNames.map((categoryName) => (
              <div key={categoryName}>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">
                  {categoryName}
                </h4>
                <div className="grid grid-cols-8 gap-1">
                  {ICON_CATEGORIES[categoryName].map((iconName) => (
                    <IconButton
                      key={iconName}
                      iconName={iconName}
                      isSelected={value === iconName}
                      disabled={disabled}
                      onSelect={handleSelect}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : filteredIcons.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-500">
            No icons found
          </div>
        ) : (
          <div className="grid grid-cols-8 gap-1">
            {filteredIcons.map((iconName) => (
              <IconButton
                key={iconName}
                iconName={iconName}
                isSelected={value === iconName}
                disabled={disabled}
                onSelect={handleSelect}
              />
            ))}
          </div>
        )}
      </div>

      {/* Selected Icon Preview */}
      {value && SelectedIcon && (
        <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 px-3 py-2 rounded-lg">
          <SelectedIcon className="h-5 w-5 text-blue-600" />
          <span>Selected: <span className="font-medium text-blue-700">{formatIconName(value)}</span></span>
        </div>
      )}
    </div>
  );
}

export default IconPicker;
