# Category System Strategy - MoneyWise

> **Strategic plan for category management features**
> **Created: December 7, 2025**
> **Status: Phase 1 Enhanced in progress, Post-MVP features defined**

---

## Executive Summary

This document captures the complete strategy for MoneyWise's category system, including MVP features, enhanced features, and post-MVP roadmap based on competitive analysis of Copilot Money, YNAB, and Monarch Money.

---

## Current State

### What We HAVE

| Component | Status | Description |
|-----------|--------|-------------|
| Prisma Schema | ✅ Complete | Hierarchical model with `parentId`, `icon`, `color`, `rules`, `metadata`, `isSystem`, `isDefault` |
| Backend CRUD | ✅ Complete | CategoriesController with create, read, update, delete |
| CategorySelector | ✅ Complete | 567-line dropdown component for transaction forms |
| Categories Client | ✅ Complete | Full API client with error handling |
| Category Seed | ✅ Complete | 47 default categories across 12 groups |

### What We're Building (Phase 1 Enhanced)

| Feature | Priority | Effort |
|---------|----------|--------|
| `/dashboard/categories` management page | MVP | 4h |
| CategoryTree component (collapsible hierarchy) | MVP | 4h |
| CategoryForm modal (name, type, parent, icon, color) | MVP | 4h |
| Icon picker (curated Lucide preset ~50 icons) | MVP | 2h |
| Color picker (preset palette) | MVP | 2h |
| Spending rollup queries (backend) | Enhanced | 4h |
| Category spending summary component | Enhanced | 4h |
| Quick recategorize with "Apply to similar" | Enhanced | 4h |
| Rule creation on recategorize | Enhanced | 2h |

**Total: ~4 days**

---

## Schema Reference

```prisma
model Category {
  id          String         @id @default(uuid()) @db.Uuid
  name        String         @db.VarChar(255)
  slug        String         @unique @db.VarChar(255)
  description String?        @db.Text
  type        CategoryType   // EXPENSE, INCOME, TRANSFER
  status      CategoryStatus @default(ACTIVE)

  // Visual customization
  color String? @db.VarChar(7)   // Hex color code (#RRGGBB)
  icon  String? @db.VarChar(100) // Icon identifier (e.g., "utensils", "car")

  // System flags
  isDefault Boolean @default(false) @map("is_default")
  isSystem  Boolean @default(false) @map("is_system")

  // Ordering and hierarchy
  sortOrder Int     @default(0) @map("sort_order")
  parentId  String? @map("parent_id") @db.Uuid
  parent    Category?  @relation("CategoryHierarchy", fields: [parentId], references: [id])
  children  Category[] @relation("CategoryHierarchy")

  // Auto-categorization rules
  rules    Json? // { keywords: [], merchantPatterns: [], autoAssign: bool, confidence: number }
  metadata Json? // { budgetEnabled: bool, monthlyLimit: number, taxDeductible: bool }

  // Relations
  familyId     String        @map("family_id") @db.Uuid
  family       Family        @relation(fields: [familyId], references: [id], onDelete: Cascade)
  transactions Transaction[]
  budgets      Budget[]
}
```

---

## 3 Power Features - Strategic Value

### 1. Smart Auto-Categorization Rules (HIGH VALUE)

**Why:** 73% of users prefer personalized experiences. Copilot's #1 feature is AI categorization.

**How it works:**
- User categorizes "NETFLIX" as "Entertainment → Streaming"
- System creates rule: `{ merchant: "NETFLIX", category: "streaming" }`
- Future Netflix transactions auto-categorize
- Confidence threshold: High (auto-apply), Medium (suggest), Low (ask)

**Rule Structure:**
```typescript
interface CategoryRule {
  keywords?: string[];           // ["netflix", "spotify"]
  merchantPatterns?: string[];   // ["NETFLIX.*", "SPOTIFY.*"]
  autoAssign?: boolean;          // true = auto-apply
  confidence?: number;           // 0.0 - 1.0
}
```

**Implementation:** Phase 1 Enhanced (basic) + Post-MVP (AI-powered)

---

### 2. Spending Rollup with Drill-Down (HIGH VALUE)

**Why:** Users want "Where is my money going?" at a glance.

**Visual Example:**
```
Monthly Spending by Category

🍽️ Food & Dining      ████████████████  $1,245 (32%)
   ├─ Restaurants      ██████████        $890
   ├─ Groceries        ████              $320
   └─ Coffee           █                  $35

🏠 Housing             ████████████      $950 (24%)
🚗 Transportation      ████████          $620 (16%)
```

**SQL Query (Recursive CTE):**
```sql
WITH RECURSIVE category_tree AS (
  SELECT id, name, parent_id, id as root_id, 0 as depth
  FROM categories WHERE parent_id IS NULL AND family_id = $1
  UNION ALL
  SELECT c.id, c.name, c.parent_id, ct.root_id, ct.depth + 1
  FROM categories c
  JOIN category_tree ct ON c.parent_id = ct.id
)
SELECT
  ct.root_id,
  parent_cat.name as parent_name,
  SUM(t.amount) as total_spending,
  COUNT(*) as transaction_count
FROM transactions t
JOIN category_tree ct ON t.category_id = ct.id
JOIN categories parent_cat ON ct.root_id = parent_cat.id
WHERE t.date BETWEEN $2 AND $3
GROUP BY ct.root_id, parent_cat.name
ORDER BY total_spending DESC;
```

**Implementation:** Phase 1 Enhanced

---

### 3. Quick Recategorize with Learning (HIGH VALUE)

**Why:** Mint's biggest complaint was mis-categorization. Users need FAST correction.

**UI Flow:**
1. User sees "UBER" categorized as "Transportation"
2. Clicks → changes to "Food & Dining → Restaurants" (it was Uber Eats)
3. Prompt: "Always categorize UBER EATS as Restaurants?" → Yes
4. Rule created, future Uber Eats auto-categorized correctly

**Implementation:** Phase 1 Enhanced

---

## Icon Strategy

### Recommended: Lucide React (Already Installed)

**Curated Finance Icon Set (~50 icons):**

```typescript
export const CATEGORY_ICONS = {
  // Food & Dining
  'utensils': 'Utensils',
  'coffee': 'Coffee',
  'shopping-cart': 'ShoppingCart',
  'pizza': 'Pizza',
  'wine': 'Wine',
  'beer': 'Beer',

  // Transportation
  'car': 'Car',
  'bus': 'Bus',
  'train': 'Train',
  'plane': 'Plane',
  'fuel': 'Fuel',
  'parking': 'ParkingCircle',

  // Housing
  'home': 'Home',
  'building': 'Building',
  'key': 'Key',
  'lightbulb': 'Lightbulb',
  'thermometer': 'Thermometer',
  'droplet': 'Droplet',

  // Shopping
  'shopping-bag': 'ShoppingBag',
  'shirt': 'Shirt',
  'gift': 'Gift',
  'package': 'Package',

  // Entertainment
  'tv': 'Tv',
  'music': 'Music',
  'gamepad': 'Gamepad2',
  'film': 'Film',
  'ticket': 'Ticket',

  // Health
  'heart-pulse': 'HeartPulse',
  'pill': 'Pill',
  'stethoscope': 'Stethoscope',
  'dumbbell': 'Dumbbell',

  // Finance
  'wallet': 'Wallet',
  'credit-card': 'CreditCard',
  'piggy-bank': 'PiggyBank',
  'banknote': 'Banknote',
  'trending-up': 'TrendingUp',
  'trending-down': 'TrendingDown',

  // Education
  'book': 'Book',
  'graduation-cap': 'GraduationCap',
  'laptop': 'Laptop',

  // Personal
  'scissors': 'Scissors',
  'sparkles': 'Sparkles',
  'baby': 'Baby',
  'dog': 'Dog',

  // Business
  'briefcase': 'Briefcase',
  'calculator': 'Calculator',
  'receipt': 'Receipt',

  // Other
  'help-circle': 'HelpCircle',
  'more-horizontal': 'MoreHorizontal',
  'folder': 'Folder',
} as const;
```

---

## Color Palette

### Preset Colors (12 primary + shades)

```typescript
export const CATEGORY_COLORS = [
  // Primary palette
  '#EF4444', // Red
  '#F97316', // Orange
  '#F59E0B', // Amber
  '#EAB308', // Yellow
  '#84CC16', // Lime
  '#22C55E', // Green
  '#10B981', // Emerald
  '#14B8A6', // Teal
  '#06B6D4', // Cyan
  '#0EA5E9', // Sky
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#8B5CF6', // Violet
  '#A855F7', // Purple
  '#D946EF', // Fuchsia
  '#EC4899', // Pink
  '#F43F5E', // Rose
  '#78716C', // Stone (neutral)
];
```

---

## Post-MVP Roadmap

### Phase A: AI-Powered Categorization (Post-MVP)
- Machine learning model for transaction classification
- Train on user corrections
- Merchant database integration
- Confidence scoring with explanations

### Phase B: Advanced Category Features
- **Category Merge**: Combine two categories, reassign all transactions
- **Transaction Split**: Split one transaction across multiple categories
- **Category Budgets**: Set spending limits per category (link to Budget module)
- **Tax Categories**: Mark categories as tax-deductible, generate reports

### Phase C: Insights & Analytics
- **Spending Trends**: "You spent 20% more on Food this month"
- **Anomaly Detection**: "Unusual $500 transaction in Entertainment"
- **Peer Comparison**: "You spend less on Dining than similar households"
- **Forecasting**: "At this rate, you'll spend $X on Food this month"

---

## Competitive Analysis

| Feature | Copilot | YNAB | Monarch | MoneyWise (Target) |
|---------|---------|------|---------|-------------------|
| AI auto-categorization | ✅ | ❌ | ✅ | 🟡 Rules-based MVP |
| Custom categories | ✅ | ✅ | ✅ | ✅ Phase 1 |
| Category hierarchy | ✅ | ✅ | ✅ | ✅ Phase 1 |
| Spending rollup | ✅ | ✅ | ✅ | ✅ Phase 1 Enhanced |
| Category rules | ✅ | ❌ | ✅ | ✅ Phase 1 Enhanced |
| Icons/colors | ✅ | ✅ | ✅ | ✅ Phase 1 |
| Merge categories | ✅ | ✅ | ✅ | 🔮 Post-MVP |
| Split transactions | ✅ | ✅ | ✅ | 🔮 Post-MVP |

---

## References

- [G & Co. - Best UX Design Practices for Finance Apps 2025](https://www.g-co.agency/insights/the-best-ux-design-practices-for-finance-apps-in-2025)
- [Shakuro - Personal Finance App Design Practices](https://shakuro.com/blog/using-design-practices-to-build-better-personal-finance-apps)
- [Eleken - Fintech UX Best Practices 2025](https://www.eleken.co/blog-posts/fintech-ux-best-practices)
- [Money with Katie - Copilot Review](https://moneywithkatie.com/copilot-review-a-budgeting-app-that-finally-gets-it-right/)
- [NerdWallet - Best Budget Apps 2025](https://www.nerdwallet.com/finance/learn/best-budget-apps)
- [Pyramid Analytics - Parent-Child Hierarchies](https://www.pyramidanalytics.com/blog/parent-child-hierarchies-made-easy/)

---

*Document Version: 1.0 | Last Updated: December 7, 2025*
