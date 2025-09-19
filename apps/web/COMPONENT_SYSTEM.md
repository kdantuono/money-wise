# MoneyWise Component System Documentation

## 🎯 Overview

The MoneyWise Component System v2.0 is an enterprise-grade, accessible, and mobile-first UI component library specifically designed for financial applications. Built with React, TypeScript, and Tailwind CSS, it provides a comprehensive set of components that meet WCAG 2.1 AA accessibility standards.

## ✨ Key Features

### 🎨 Enhanced Design System
- **Financial-grade color palette** with semantic color scales
- **Comprehensive design tokens** for consistent styling
- **Premium shadows and animations** for professional feel
- **Dark mode support** throughout all components

### 📱 Mobile-First Architecture
- **Progressive enhancement** from mobile to desktop
- **Touch-optimized interactions** and gestures
- **Responsive grid systems** with adaptive layouts
- **Performance-optimized** for all device types

### ♿ WCAG 2.1 AA Compliance
- **Keyboard navigation** for all interactive elements
- **Screen reader optimization** with ARIA labels
- **High contrast mode** support
- **Focus management** and indication
- **Color contrast ratios** meeting accessibility standards

### 📊 Interactive Data Visualizations
- **Recharts integration** with custom styling
- **Animated transitions** and hover states
- **Drill-down capabilities** and interactive filters
- **Responsive chart layouts** for all screen sizes

## 🏗️ Architecture

### Design Token System
```typescript
// Enhanced design tokens with financial theming
const designTokens = {
  colors: {
    primary: { /* Blue scale for brand */ },
    success: { /* Green scale for gains */ },
    warning: { /* Amber scale for alerts */ },
    error: { /* Red scale for losses */ },
    neutral: { /* Gray scale for UI */ }
  },
  typography: { /* Professional font scales */ },
  spacing: { /* Consistent rhythm */ },
  animations: { /* Smooth transitions */ }
}
```

### Component Categories

#### 📊 Charts & Visualizations
- **BalanceHistory**: Interactive area chart with time range filters
- **WeeklyActivity**: Multi-view bar chart with comparison modes
- **ExpenseStatistics**: Pie chart with category breakdowns

#### 💳 Cards & Financial Components
- **CreditCards**: 3D animated credit card display with security features
- **RecentTransactions**: Transaction list with status indicators
- **QuickTransfer**: Transfer interface with contact selection

#### 🎛️ Layout & Navigation
- **DashboardWrapper**: Authentication and loading state management
- **Mobile Header**: Sticky navigation with search functionality
- **Responsive Grids**: Adaptive layout containers

## 🚀 Getting Started

### Installation
```bash
# The components are part of the MoneyWise web application
cd apps/web
npm install
```

### Basic Usage
```jsx
import { BalanceHistory } from '@/app/components/balance-history';
import { WeeklyActivity } from '@/app/components/weekly-activity';
import { CreditCards } from '@/app/components/credit-cards';
import DashboardWrapper from '@/app/DashboardWrapper';

export default function Dashboard() {
  return (
    <DashboardWrapper>
      <div className="p-4 lg:p-8 space-y-6 lg:space-y-8">
        {/* Mobile-first responsive grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          <div className="lg:col-span-2 xl:col-span-4">
            <CreditCards />
          </div>
          <div className="lg:col-span-1 xl:col-span-2">
            {/* Additional content */}
          </div>
        </div>

        {/* Charts section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          <div className="lg:col-span-2 xl:col-span-4">
            <WeeklyActivity />
          </div>
          <div className="lg:col-span-1 xl:col-span-2">
            <BalanceHistory />
          </div>
        </div>
      </div>
    </DashboardWrapper>
  );
}
```

## 📱 Mobile-First Examples

### Responsive Credit Cards
```jsx
// Cards automatically adapt from horizontal scroll on mobile
// to grid layout on desktop
<div className="flex lg:grid lg:grid-cols-2 gap-4 lg:gap-6">
  {cards.map(card => (
    <CreditCardComponent key={card.id} {...card} />
  ))}
</div>
```

### Mobile Navigation
```jsx
// Sticky mobile header with enhanced search
<div className="block lg:hidden bg-white sticky top-0 z-sticky">
  <div className="flex items-center justify-between mb-4">
    <div>
      <h1 className="text-financial-heading">Dashboard</h1>
      <p className="text-financial-caption">Welcome back</p>
    </div>
    <Button size="sm" className="rounded-xl">
      <Plus className="h-4 w-4" />
    </Button>
  </div>
</div>
```

## 🎨 Design Token Usage

### Color System
```jsx
// Using semantic financial colors
<div className="text-success-600">+$2,340 Profit</div>
<div className="text-error-600">-$1,200 Loss</div>
<div className="bg-primary-500 text-white">Primary Action</div>
```

### Typography Scale
```jsx
// Financial typography hierarchy
<h1 className="text-financial-heading">Section Title</h1>
<h2 className="text-financial-subheading">Subsection</h2>
<p className="text-financial-body">Body text</p>
<span className="text-financial-caption">Caption text</span>
```

### Spacing System
```jsx
// Consistent spacing using design tokens
<div className="space-y-6 lg:space-y-8">
  <div className="p-4 lg:p-6">Content</div>
</div>
```

## 📊 Chart Components

### Balance History Chart
```jsx
<BalanceHistory
  timeRange="6m"           // '3m' | '6m' | 'all'
  className="custom-class"
  data={customData}        // Optional custom data
/>
```

**Features:**
- Interactive time range selector
- Animated area chart with gradients
- Custom tooltip with detailed financial information
- Accessibility table for screen readers
- Responsive design with mobile optimizations

### Weekly Activity Chart
```jsx
<WeeklyActivity
  defaultViewMode="comparison"  // 'comparison' | 'net' | 'volume'
  data={weeklyData}
/>
```

**Features:**
- Multiple view modes with smooth transitions
- Enhanced tooltips with transaction details
- Weekly totals and statistics
- Touch-friendly mobile interface

## 💳 Credit Card Component

### Enhanced Features
```jsx
<CreditCards
  onCardClick={(cardId) => handleCardSelection(cardId)}
  showQuickActions={true}
/>
```

**Advanced Capabilities:**
- 3D hover animations with perspective
- Security features (number masking/revealing)
- Credit utilization visualization
- Card brand detection and logos
- Premium gradient backgrounds
- Accessibility-compliant keyboard navigation

## ♿ Accessibility Implementation

### WCAG 2.1 AA Compliance

#### Keyboard Navigation
```jsx
// All interactive elements support keyboard access
<Card
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }}
  tabIndex={0}
  aria-label="Credit card ending in 1234"
/>
```

#### Screen Reader Support
```jsx
// Hidden data tables for screen readers
<div className="sr-only">
  <table>
    <caption>Weekly activity data by day</caption>
    <thead>
      <tr>
        <th>Day</th>
        <th>Deposits</th>
        <th>Withdrawals</th>
      </tr>
    </thead>
    <tbody>
      {data.map(item => (
        <tr key={item.day}>
          <td>{item.day}</td>
          <td>${item.deposits}</td>
          <td>${item.withdrawals}</td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

#### High Contrast Support
```jsx
// Automatic high contrast mode detection
@media (prefers-contrast: high) {
  .card-financial {
    @apply border-2 border-black;
  }
}
```

#### Reduced Motion Support
```jsx
// Respects user motion preferences
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## 🎭 Animation System

### Framer Motion Integration
```jsx
// Staggered children animations
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
}

<motion.div
  variants={containerVariants}
  initial="hidden"
  animate="visible"
>
  {children}
</motion.div>
```

### Performance Optimizations
- **Transform3d** for hardware acceleration
- **will-change** properties for smooth animations
- **AnimatePresence** for mount/unmount transitions
- **Layout animations** with automatic FLIP calculations

## 🧪 Testing Strategy

### Accessibility Testing
```javascript
// Automated accessibility testing with Playwright
import { injectAxe, checkA11y } from '@axe-core/playwright';

test('Dashboard accessibility', async ({ page }) => {
  await page.goto('/dashboard');
  await injectAxe(page);
  await checkA11y(page);
});
```

### Visual Regression Testing
```javascript
// Visual regression tests for components
test('Credit cards visual regression', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.locator('[data-testid="credit-cards"]'))
    .toHaveScreenshot('credit-cards.png');
});
```

### Performance Testing
```javascript
// Core Web Vitals monitoring
test('Performance budget', async ({ page }) => {
  const metrics = await page.evaluate(() => {
    return new Promise((resolve) => {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        resolve(entries);
      }).observe({ entryTypes: ['largest-contentful-paint'] });
    });
  });

  expect(metrics.value).toBeLessThan(2500); // LCP < 2.5s
});
```

## 🚀 Performance Optimizations

### Code Splitting
```jsx
// Lazy loading for large components
const ExpensiveChart = lazy(() => import('./ExpensiveChart'));

<Suspense fallback={<ChartSkeleton />}>
  <ExpensiveChart />
</Suspense>
```

### Memoization
```jsx
// Expensive calculations memoized
const chartData = useMemo(() => {
  return processFinancialData(rawData);
}, [rawData]);

// Components memoized to prevent unnecessary re-renders
const ChartComponent = memo(({ data }) => {
  return <Chart data={data} />;
});
```

### Image Optimization
```jsx
// Next.js Image component for optimal loading
import Image from 'next/image';

<Image
  src="/card-background.jpg"
  alt="Credit card background"
  width={400}
  height={250}
  priority={false}
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,..."
/>
```

## 🔧 Development Workflow

### Component Development
1. **Design Token Integration**: Use design tokens for all styling
2. **Mobile-First Approach**: Start with mobile layout and enhance
3. **Accessibility First**: Implement ARIA labels and keyboard navigation
4. **Animation Enhancement**: Add smooth transitions with Framer Motion
5. **Testing Coverage**: Write accessibility and performance tests

### Quality Gates
- ✅ WCAG 2.1 AA compliance verified
- ✅ Performance budget maintained (LCP < 2.5s, CLS < 0.1)
- ✅ Cross-browser compatibility tested
- ✅ Mobile usability score > 95%
- ✅ Visual regression tests passing

## 📈 Roadmap

### Phase 2 Enhancements (Q2 2025)
- **Advanced Charts**: Candlestick charts for investment tracking
- **Real-time Updates**: WebSocket integration for live data
- **Enhanced Animations**: Page transitions and micro-interactions
- **PWA Features**: Offline support and push notifications

### Phase 3 Features (Q3 2025)
- **Voice Interface**: Accessibility improvements with voice commands
- **AI Insights**: Smart financial recommendations
- **Advanced Theming**: Custom brand theme support
- **Component Variants**: Additional card layouts and chart types

## 🤝 Contributing

### Component Standards
1. Follow the existing TypeScript patterns
2. Implement full WCAG 2.1 AA accessibility
3. Include comprehensive JSDoc documentation
4. Add unit tests and accessibility tests
5. Follow the mobile-first responsive design approach

### Code Review Checklist
- [ ] Design tokens used consistently
- [ ] Accessibility requirements met
- [ ] Mobile-responsive implementation
- [ ] Performance optimizations applied
- [ ] Tests written and passing
- [ ] Documentation updated

---

## 📚 Additional Resources

- [Design Tokens Reference](./src/lib/design-tokens.ts)
- [Component Library Registry](./src/lib/component-library.ts)
- [Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Performance Best Practices](https://web.dev/performance/)

For questions or contributions, please refer to the component library registry and follow the established patterns for consistency and maintainability.