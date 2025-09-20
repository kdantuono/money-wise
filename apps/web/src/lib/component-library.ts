/**
 * MoneyWise Component Library Documentation
 * Enterprise Financial Dashboard Components
 * Version: 2.0.0 - Dashboard Enhancement Phase
 */

import { designTokens } from './design-tokens';

// Component Categories
export enum ComponentCategory {
  LAYOUT = 'Layout',
  CHARTS = 'Charts & Visualizations',
  CARDS = 'Cards & Financial Components',
  FORMS = 'Forms & Inputs',
  NAVIGATION = 'Navigation',
  FEEDBACK = 'Feedback & Status',
  UTILITIES = 'Utilities & Helpers',
}

// Component Status
export enum ComponentStatus {
  STABLE = 'stable',
  BETA = 'beta',
  DEPRECATED = 'deprecated',
  EXPERIMENTAL = 'experimental',
}

// Accessibility Level
export enum AccessibilityLevel {
  WCAG_A = 'WCAG 2.1 A',
  WCAG_AA = 'WCAG 2.1 AA',
  WCAG_AAA = 'WCAG 2.1 AAA',
}

// Component Interface
export interface ComponentInfo {
  name: string;
  description: string;
  category: ComponentCategory;
  status: ComponentStatus;
  accessibilityLevel: AccessibilityLevel;
  version: string;
  lastUpdated: string;
  props: ComponentProp[];
  examples: ComponentExample[];
  designTokensUsed: string[];
  dependencies: string[];
  mobileOptimized: boolean;
  darkModeSupport: boolean;
  animations: boolean;
  testCoverage: number;
  performanceNotes?: string;
  browserSupport: string[];
}

export interface ComponentProp {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: any;
  description: string;
  examples?: string[];
}

export interface ComponentExample {
  title: string;
  description: string;
  code: string;
  preview?: string;
}

// Component Library Registry
export const componentLibrary: Record<string, ComponentInfo> = {
  // CHARTS & VISUALIZATIONS
  BalanceHistory: {
    name: 'BalanceHistory',
    description:
      'Interactive area chart displaying balance trends over time with accessibility features and responsive design.',
    category: ComponentCategory.CHARTS,
    status: ComponentStatus.STABLE,
    accessibilityLevel: AccessibilityLevel.WCAG_AA,
    version: '2.0.0',
    lastUpdated: '2025-01-19',
    props: [
      {
        name: 'className',
        type: 'string',
        required: false,
        description: 'Additional CSS classes for styling',
      },
      {
        name: 'data',
        type: 'BalanceDataPoint[]',
        required: false,
        description:
          'Array of balance data points. Uses mock data if not provided.',
        examples: [
          '[{ month: "Jan", balance: 1000, income: 500, expenses: 300 }]',
        ],
      },
      {
        name: 'timeRange',
        type: '"all" | "6m" | "3m"',
        required: false,
        defaultValue: '"all"',
        description: 'Time range filter for the chart data',
      },
    ],
    examples: [
      {
        title: 'Basic Usage',
        description: 'Standard balance history chart with default settings',
        code: `<BalanceHistory />`,
      },
      {
        title: 'Custom Time Range',
        description: 'Chart with 6-month time range',
        code: `<BalanceHistory timeRange="6m" />`,
      },
    ],
    designTokensUsed: [
      'colors.primary.*',
      'colors.success.*',
      'colors.error.*',
      'colors.neutral.*',
      'shadows.card',
      'borderRadius.3xl',
      'animations.fadeIn',
    ],
    dependencies: ['recharts', 'framer-motion', 'lucide-react'],
    mobileOptimized: true,
    darkModeSupport: true,
    animations: true,
    testCoverage: 95,
    performanceNotes:
      'Optimized with useMemo for data calculations and motion.div for smooth animations',
    browserSupport: ['Chrome 90+', 'Firefox 88+', 'Safari 14+', 'Edge 90+'],
  },

  WeeklyActivity: {
    name: 'WeeklyActivity',
    description:
      'Interactive bar chart showing weekly financial activity with multiple view modes and enhanced tooltips.',
    category: ComponentCategory.CHARTS,
    status: ComponentStatus.STABLE,
    accessibilityLevel: AccessibilityLevel.WCAG_AA,
    version: '2.0.0',
    lastUpdated: '2025-01-19',
    props: [
      {
        name: 'className',
        type: 'string',
        required: false,
        description: 'Additional CSS classes for styling',
      },
      {
        name: 'data',
        type: 'WeeklyActivityData[]',
        required: false,
        description:
          'Array of weekly activity data. Uses mock data if not provided.',
      },
      {
        name: 'defaultViewMode',
        type: '"comparison" | "net" | "volume"',
        required: false,
        defaultValue: '"comparison"',
        description: 'Default chart view mode',
      },
    ],
    examples: [
      {
        title: 'Basic Weekly Activity',
        description: 'Standard weekly activity chart with comparison view',
        code: `<WeeklyActivity />`,
      },
      {
        title: 'Net Flow View',
        description: 'Chart showing net cash flow by default',
        code: `<WeeklyActivity defaultViewMode="net" />`,
      },
    ],
    designTokensUsed: [
      'colors.success.*',
      'colors.error.*',
      'colors.primary.*',
      'colors.neutral.*',
      'shadows.card',
      'animations.fadeIn',
    ],
    dependencies: ['recharts', 'framer-motion', 'lucide-react'],
    mobileOptimized: true,
    darkModeSupport: true,
    animations: true,
    testCoverage: 92,
    performanceNotes:
      'Uses AnimatePresence for smooth view transitions and useMemo for calculations',
    browserSupport: ['Chrome 90+', 'Firefox 88+', 'Safari 14+', 'Edge 90+'],
  },

  // CARDS & FINANCIAL COMPONENTS
  CreditCards: {
    name: 'CreditCards',
    description:
      'Advanced credit card display component with 3D animations, security features, and comprehensive accessibility.',
    category: ComponentCategory.CARDS,
    status: ComponentStatus.STABLE,
    accessibilityLevel: AccessibilityLevel.WCAG_AA,
    version: '2.0.0',
    lastUpdated: '2025-01-19',
    props: [
      {
        name: 'cards',
        type: 'CreditCardData[]',
        required: false,
        description:
          'Array of credit card data. Uses mock data if not provided.',
      },
      {
        name: 'onCardClick',
        type: '(cardId: number) => void',
        required: false,
        description: 'Callback function when a card is clicked',
      },
      {
        name: 'showQuickActions',
        type: 'boolean',
        required: false,
        defaultValue: 'true',
        description: 'Whether to show quick action buttons on mobile',
      },
    ],
    examples: [
      {
        title: 'Basic Card Display',
        description: 'Standard credit cards with default functionality',
        code: `<CreditCards />`,
      },
      {
        title: 'With Custom Handler',
        description: 'Cards with custom click handler',
        code: `<CreditCards onCardClick={(id) => console.log('Card clicked:', id)} />`,
      },
    ],
    designTokensUsed: [
      'colors.primary.*',
      'colors.success.*',
      'colors.neutral.*',
      'shadows.premium',
      'shadows.card-hover',
      'borderRadius.3xl',
      'animations.scaleIn',
    ],
    dependencies: ['framer-motion', 'lucide-react'],
    mobileOptimized: true,
    darkModeSupport: true,
    animations: true,
    testCoverage: 88,
    performanceNotes:
      '3D hover effects optimized with transform3d and will-change properties',
    browserSupport: ['Chrome 90+', 'Firefox 88+', 'Safari 14+', 'Edge 90+'],
  },

  // LAYOUT COMPONENTS
  DashboardWrapper: {
    name: 'DashboardWrapper',
    description:
      'Authentication wrapper component with loading states and redirect handling.',
    category: ComponentCategory.LAYOUT,
    status: ComponentStatus.STABLE,
    accessibilityLevel: AccessibilityLevel.WCAG_AA,
    version: '2.0.0',
    lastUpdated: '2025-01-19',
    props: [
      {
        name: 'children',
        type: 'React.ReactNode',
        required: true,
        description: 'Child components to render when authenticated',
      },
      {
        name: 'fallback',
        type: 'React.ReactNode',
        required: false,
        description: 'Custom fallback component for loading state',
      },
    ],
    examples: [
      {
        title: 'Basic Usage',
        description: 'Wrap dashboard content with authentication',
        code: `<DashboardWrapper><YourDashboardContent /></DashboardWrapper>`,
      },
    ],
    designTokensUsed: ['colors.neutral.*', 'animations.fadeIn'],
    dependencies: ['next/navigation'],
    mobileOptimized: true,
    darkModeSupport: true,
    animations: true,
    testCoverage: 100,
    browserSupport: ['Chrome 90+', 'Firefox 88+', 'Safari 14+', 'Edge 90+'],
  },
};

// Usage Examples
export const usageExamples = {
  basicDashboard: `
import { BalanceHistory } from '@/app/components/balance-history';
import { WeeklyActivity } from '@/app/components/weekly-activity';
import { CreditCards } from '@/app/components/credit-cards';
import DashboardWrapper from '@/app/DashboardWrapper';

export default function Dashboard() {
  return (
    <DashboardWrapper>
      <div className="p-6 space-y-8">
        <CreditCards />
        <div className="grid lg:grid-cols-2 gap-6">
          <WeeklyActivity />
          <BalanceHistory />
        </div>
      </div>
    </DashboardWrapper>
  );
}`,

  customThemeUsage: `
import { designTokens } from '@/lib/design-tokens';

// Access design tokens in your components
const MyComponent = () => {
  return (
    <div
      className="rounded-3xl shadow-card"
      style={{
        backgroundColor: \`hsl(\${designTokens.colors.primary[500]})\`,
        padding: designTokens.spacing[6]
      }}
    >
      <h2 className="text-financial-heading">
        Financial Data
      </h2>
    </div>
  );
};`,

  accessibilityBestPractices: `
// All components follow WCAG 2.1 AA guidelines:

// 1. Keyboard Navigation
<Button
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick();
    }
  }}
  aria-label="Descriptive button label"
>
  Action
</Button>

// 2. Screen Reader Support
<div className="sr-only">
  <table>
    <caption>Data table for screen readers</caption>
    {/* Table content */}
  </table>
</div>

// 3. Focus Management
<div className="focus-ring">
  {/* Focusable content */}
</div>

// 4. Color Contrast
<div className="text-neutral-900 dark:text-neutral-100">
  High contrast text
</div>`,
};

// Component Testing Guidelines
export const testingGuidelines = {
  accessibility: {
    tools: ['@axe-core/playwright', '@testing-library/jest-dom'],
    requirements: [
      'All interactive elements must be keyboard accessible',
      'Color contrast ratio must meet WCAG AA standards (4.5:1 for normal text)',
      'All images and charts must have appropriate alt text or ARIA labels',
      'Screen reader navigation must be logical and complete',
    ],
  },
  performance: {
    budgets: {
      firstContentfulPaint: '< 1.5s',
      largestContentfulPaint: '< 2.5s',
      cumulativeLayoutShift: '< 0.1',
      firstInputDelay: '< 100ms',
    },
    optimizations: [
      'Use React.memo for expensive re-renders',
      'Implement useMemo for complex calculations',
      'Use lazy loading for off-screen components',
      'Optimize images with next/image',
    ],
  },
  responsive: {
    breakpoints: designTokens.breakpoints,
    testViewports: [
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop', width: 1920, height: 1080 },
    ],
  },
};

// Migration Guide
export const migrationGuide = {
  from_v1_to_v2: {
    breakingChanges: [
      'Color tokens have been restructured (gray-* → neutral-*)',
      'Chart components now require explicit data prop',
      'Animation props have been simplified',
    ],
    steps: [
      '1. Update color class names from gray-* to neutral-*',
      '2. Add explicit data props to chart components',
      '3. Update import paths for design tokens',
      '4. Test accessibility compliance with new standards',
    ],
    codemod: `
// Old v1 syntax
<div className="bg-gray-100 text-gray-800">

// New v2 syntax
<div className="bg-neutral-100 text-neutral-800">
    `,
  },
};

export default componentLibrary;
