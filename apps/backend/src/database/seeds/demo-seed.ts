 
 
/**
 * MoneyWise Database Seeding Script
 * ================================================================================
 *
 * This script populates the development database with realistic demo data.
 * It is idempotent (safe to run multiple times) and production-safe.
 *
 * Usage:
 *   pnpm db:seed                    (from apps/backend directory)
 *   ts-node src/database/seeds/index.ts
 *
 * What gets seeded:
 *   - Demo family (Smith Family)
 *   - 2 users (admin + member)
 *   - 4 accounts (checking, savings, credit card, investment)
 *   - 20 transaction categories (income, expense, transfer)
 *   - 100 realistic transactions (3 months of history)
 *   - 3 budgets (groceries, transportation, entertainment)
 *
 * Notes:
 *   - Runs only in development/test environments (production-safe)
 *   - Cleans up existing seed data before seeding (idempotent)
 *   - Uses Prisma Decimal for exact financial precision
 *   - Generates realistic transaction patterns
 */

import { PrismaClient, Prisma } from '../../../generated/prisma';

// Initialize Prisma Client
const prisma = new PrismaClient();

// ============================================================================
// Constants
// ============================================================================

// Seed user emails for identification and cleanup
const SEED_USER_EMAILS = [
  'test@example.com',
  'member@example.com',
];

// Seed family name for identification
const SEED_FAMILY_NAME = 'Test Family';

// Demo password (bcrypt hash for "SecurePass123!")
const DEMO_PASSWORD_HASH = '$2a$10$upBGppPkxrkdZQJgP9waBesoJ1/hyPXYCKI1720xwbPRjtB9Of6qK';

// ============================================================================
// Helper Functions
// ============================================================================

function createDecimal(value: number | string): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

function parseDecimal(value: string | number): Prisma.Decimal {
  if (typeof value === 'number') {
    return createDecimal(value.toFixed(2));
  }
  return createDecimal(value);
}

function getRandomDateInPast(daysAgo: number = 90): Date {
  const now = new Date();
  const randomDays = Math.floor(Math.random() * daysAgo);
  const date = new Date(now.getTime() - randomDays * 24 * 60 * 60 * 1000);
  return date;
}

// ============================================================================
// Main Seeding Function
// ============================================================================

async function main() {
  try {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        '❌ SAFETY CHECK FAILED: Seeding is not allowed in production!\n' +
          '   This script should only run in development or test environments.',
      );
    }

    console.log('\n🌱 MoneyWise Database Seeding Started');
    console.log('==========================================\n');

    console.log('🧹 Cleaning up existing seed data...');
    await cleanupSeedData();
    console.log('   ✅ Cleanup complete\n');

    console.log('👨‍👩‍👧‍👦 Creating demo family...');
    const family = await createDemoFamily();
    console.log(`   ✅ Created family: "${family.name}" (ID: ${family.id})\n`);

    console.log('👤 Creating users...');
    const admin = await createAdminUser(family.id);
    const member = await createMemberUser(family.id);
    console.log(`   ✅ Created admin: ${admin.firstName} ${admin.lastName} (${admin.email})`);
    console.log(`   ✅ Created member: ${member.firstName} ${member.lastName} (${member.email})\n`);

    console.log('📂 Creating transaction categories...');
    const categories = await createCategories(family.id);
    console.log(`   ✅ Created ${categories.length} categories\n`);

    console.log('🏦 Creating accounts...');
    const accounts = await createAccounts(admin.id);
    console.log(`   ✅ Created ${accounts.length} accounts\n`);

    console.log('💳 Creating transactions (100 realistic transactions)...');
    const transactions = await createTransactions(accounts, categories);
    console.log(`   ✅ Created ${transactions.length} transactions\n`);

    console.log('💰 Creating budgets...');
    const budgets = await createBudgets(family.id, categories);
    console.log(`   ✅ Created ${budgets.length} budgets\n`);

    console.log('✅ Database seeding completed successfully!\n');
    console.log('📊 Seeding Summary:');
    console.log(`   Family: ${family.name}`);
    console.log(`   Users: 2 users created`);
    console.log(`   Accounts: ${accounts.length} accounts`);
    console.log(`   Categories: ${categories.length} categories`);
    console.log(`   Transactions: ${transactions.length} transactions`);
    console.log(`   Budgets: ${budgets.length} budgets`);
    console.log('\n🚀 Ready to test! You can now:');
    console.log('   1. Start the app: pnpm dev');
    console.log('   2. Log in with: test@example.com / SecurePass123!');
    console.log('   3. View transactions and reports\n');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function cleanupSeedData(): Promise<void> {
  try {
    const seedUsers = await prisma.user.findMany({
      where: { email: { in: SEED_USER_EMAILS } },
    });

    if (seedUsers.length === 0) return;

    await prisma.user.deleteMany({
      where: { id: { in: seedUsers.map((u) => u.id) } },
    });

    const seedFamily = await prisma.family.findFirst({
      where: { name: SEED_FAMILY_NAME },
    });

    if (seedFamily) {
      await prisma.family.delete({ where: { id: seedFamily.id } });
    }
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw new Error(`Failed to clean up seed data`);
  }
}

async function createDemoFamily(): Promise<{ id: string; name: string }> {
  return prisma.family.create({
    data: { name: SEED_FAMILY_NAME },
  });
}

async function createAdminUser(familyId: string): Promise<{ id: string; firstName: string; lastName: string; email: string }> {
  return prisma.user.create({
    data: {
      email: 'test@example.com',
      firstName: 'Tester',
      lastName: 'User',
      passwordHash: DEMO_PASSWORD_HASH,
      role: 'ADMIN',
      status: 'ACTIVE',
      familyId,
      timezone: 'America/New_York',
      currency: 'USD',
    },
  });
}

async function createMemberUser(familyId: string): Promise<{ id: string; firstName: string; lastName: string; email: string }> {
  return prisma.user.create({
    data: {
      email: 'member@example.com',
      firstName: 'Member',
      lastName: 'User',
      passwordHash: DEMO_PASSWORD_HASH,
      role: 'MEMBER',
      status: 'ACTIVE',
      familyId,
      timezone: 'America/New_York',
      currency: 'USD',
    },
  });
}

async function createCategories(familyId: string): Promise<Array<{ id: string; slug: string }>> {
  const categoryData: Array<Prisma.CategoryCreateInput> = [
    { family: { connect: { id: familyId } }, name: 'Salary', slug: 'salary', type: 'INCOME', status: 'ACTIVE', icon: 'briefcase', color: '#10B981' },
    { family: { connect: { id: familyId } }, name: 'Freelance', slug: 'freelance', type: 'INCOME', status: 'ACTIVE', icon: 'laptop', color: '#10B981' },
    { family: { connect: { id: familyId } }, name: 'Investment Income', slug: 'investment-income', type: 'INCOME', status: 'ACTIVE', icon: 'trending-up', color: '#10B981' },
    { family: { connect: { id: familyId } }, name: 'Refunds', slug: 'refunds', type: 'INCOME', status: 'ACTIVE', icon: 'undo', color: '#10B981' },
    { family: { connect: { id: familyId } }, name: 'Groceries', slug: 'groceries', type: 'EXPENSE', status: 'ACTIVE', icon: 'shopping-cart', color: '#F59E0B' },
    { family: { connect: { id: familyId } }, name: 'Restaurants', slug: 'restaurants', type: 'EXPENSE', status: 'ACTIVE', icon: 'utensils', color: '#F59E0B' },
    { family: { connect: { id: familyId } }, name: 'Fast Food', slug: 'fast-food', type: 'EXPENSE', status: 'ACTIVE', icon: 'hamburger', color: '#F59E0B' },
    { family: { connect: { id: familyId } }, name: 'Cafes', slug: 'cafes', type: 'EXPENSE', status: 'ACTIVE', icon: 'coffee', color: '#F59E0B' },
    { family: { connect: { id: familyId } }, name: 'Gas', slug: 'gas', type: 'EXPENSE', status: 'ACTIVE', icon: 'fuel', color: '#EF4444' },
    { family: { connect: { id: familyId } }, name: 'Public Transit', slug: 'public-transit', type: 'EXPENSE', status: 'ACTIVE', icon: 'train', color: '#EF4444' },
    { family: { connect: { id: familyId } }, name: 'Ride Share', slug: 'ride-share', type: 'EXPENSE', status: 'ACTIVE', icon: 'car', color: '#EF4444' },
    { family: { connect: { id: familyId } }, name: 'Parking', slug: 'parking', type: 'EXPENSE', status: 'ACTIVE', icon: 'square', color: '#EF4444' },
    { family: { connect: { id: familyId } }, name: 'Utilities', slug: 'utilities', type: 'EXPENSE', status: 'ACTIVE', icon: 'zap', color: '#6366F1' },
    { family: { connect: { id: familyId } }, name: 'Internet', slug: 'internet', type: 'EXPENSE', status: 'ACTIVE', icon: 'wifi', color: '#6366F1' },
    { family: { connect: { id: familyId } }, name: 'Phone', slug: 'phone', type: 'EXPENSE', status: 'ACTIVE', icon: 'phone', color: '#6366F1' },
    { family: { connect: { id: familyId } }, name: 'Movies', slug: 'movies', type: 'EXPENSE', status: 'ACTIVE', icon: 'film', color: '#A855F7' },
    { family: { connect: { id: familyId } }, name: 'Gaming', slug: 'gaming', type: 'EXPENSE', status: 'ACTIVE', icon: 'gamepad-2', color: '#A855F7' },
    { family: { connect: { id: familyId } }, name: 'Subscriptions', slug: 'subscriptions', type: 'EXPENSE', status: 'ACTIVE', icon: 'repeat', color: '#A855F7' },
    { family: { connect: { id: familyId } }, name: 'Healthcare', slug: 'healthcare', type: 'EXPENSE', status: 'ACTIVE', icon: 'heart', color: '#EC4899' },
    // Note: Account Transfer category removed - transfers use FlowType on transactions, not categories
  ];

  return Promise.all(categoryData.map((data) => prisma.category.create({ data })));
}

async function createAccounts(userId: string): Promise<Array<{ id: string; name: string; currentBalance: Prisma.Decimal }>> {
  const accountsData: Array<Prisma.AccountCreateInput> = [
    {
      user: { connect: { id: userId } },
      name: 'Chase Checking',
      type: 'CHECKING',
      status: 'ACTIVE',
      source: 'MANUAL',
      currentBalance: parseDecimal('5432.50'),
      currency: 'USD',
      institutionName: 'Chase Bank',
    },
    {
      user: { connect: { id: userId } },
      name: 'Chase Savings',
      type: 'SAVINGS',
      status: 'ACTIVE',
      source: 'MANUAL',
      currentBalance: parseDecimal('12850.00'),
      currency: 'USD',
      institutionName: 'Chase Bank',
    },
    {
      user: { connect: { id: userId } },
      name: 'Chase Freedom Unlimited',
      type: 'CREDIT_CARD',
      status: 'ACTIVE',
      source: 'MANUAL',
      currentBalance: parseDecimal('-842.35'),
      creditLimit: parseDecimal('5000.00'),
      currency: 'USD',
      institutionName: 'Chase Bank',
    },
    {
      user: { connect: { id: userId } },
      name: 'Vanguard 401(k)',
      type: 'INVESTMENT',
      status: 'ACTIVE',
      source: 'MANUAL',
      currentBalance: parseDecimal('87500.00'),
      currency: 'USD',
      institutionName: 'Vanguard',
    },
  ];

  return Promise.all(accountsData.map((data) => prisma.account.create({ data })));
}

async function createTransactions(
  accounts: Array<{ id: string; name: string }>,
  categories: Array<{ id: string; slug: string }>,
): Promise<Array<{ id: string }>> {
  const checkingAccount = accounts.find((a) => a.name === 'Chase Checking')!;
  const creditCard = accounts.find((a) => a.name === 'Chase Freedom Unlimited')!;

  const groceryCategory = categories.find((c) => c.slug === 'groceries')!;
  const restaurantCategory = categories.find((c) => c.slug === 'restaurants')!;
  const gasCategory = categories.find((c) => c.slug === 'gas')!;
  const salaryCategory = categories.find((c) => c.slug === 'salary')!;
  const cafeCategory = categories.find((c) => c.slug === 'cafes')!;

  const transactions: Prisma.TransactionCreateInput[] = [];

  // Generate 6 salaries over 3 months (every 2 weeks)
  for (let i = 0; i < 6; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i * 14);
    transactions.push({
      account: { connect: { id: checkingAccount.id } },
      amount: parseDecimal('5200.00'),
      type: 'CREDIT',
      status: 'POSTED',
      source: 'MANUAL',
      currency: 'USD',
      date: date,
      description: 'Monthly Salary',
      merchantName: 'Employer Inc.',
      category: { connect: { id: salaryCategory.id } },
      includeInBudget: false,
    });
  }

  // Generate grocery transactions
  for (let i = 0; i < 12; i++) {
    const amounts = [95, 128, 75, 165, 110, 92, 145, 88, 125, 102, 155, 118];
    transactions.push({
      account: { connect: { id: checkingAccount.id } },
      amount: parseDecimal(amounts[i]),
      type: 'DEBIT',
      status: 'POSTED',
      source: 'MANUAL',
      currency: 'USD',
      date: getRandomDateInPast(90),
      description: 'Whole Foods Market',
      merchantName: 'Whole Foods Market',
      category: { connect: { id: groceryCategory.id } },
    });
  }

  // Generate restaurant transactions
  for (let i = 0; i < 15; i++) {
    const merchants = ['Chipotle', 'Olive Garden', 'Panera Bread', 'Outback Steakhouse'];
    const merchant = merchants[Math.floor(Math.random() * merchants.length)];
    transactions.push({
      account: { connect: { id: checkingAccount.id } },
      amount: parseDecimal((Math.random() * 40 + 15).toFixed(2)),
      type: 'DEBIT',
      status: 'POSTED',
      source: 'MANUAL',
      currency: 'USD',
      date: getRandomDateInPast(90),
      description: merchant,
      merchantName: merchant,
      category: { connect: { id: restaurantCategory.id } },
    });
  }

  // Generate gas transactions
  for (let i = 0; i < 10; i++) {
    transactions.push({
      account: { connect: { id: checkingAccount.id } },
      amount: parseDecimal((Math.random() * 30 + 40).toFixed(2)),
      type: 'DEBIT',
      status: 'POSTED',
      source: 'MANUAL',
      currency: 'USD',
      date: getRandomDateInPast(90),
      description: 'Shell Gas Station',
      merchantName: 'Shell Gas Station',
      category: { connect: { id: gasCategory.id } },
    });
  }

  // Generate coffee transactions
  for (let i = 0; i < 20; i++) {
    transactions.push({
      account: { connect: { id: creditCard.id } },
      amount: parseDecimal((Math.random() * 4 + 3).toFixed(2)),
      type: 'DEBIT',
      status: Math.random() < 0.1 ? 'PENDING' : 'POSTED',
      source: 'MANUAL',
      currency: 'USD',
      date: getRandomDateInPast(90),
      description: 'Starbucks Coffee',
      merchantName: 'Starbucks Coffee',
      category: { connect: { id: cafeCategory.id } },
    });
  }

  // Generate remaining transactions to reach 100
  const merchants = [
    { name: 'Netflix', amount: 15.99, slug: 'subscriptions' },
    { name: 'Spotify', amount: 12.99, slug: 'subscriptions' },
    { name: 'Amazon Prime', amount: 14.99, slug: 'subscriptions' },
  ];

  for (let i = 0; i < 37; i++) {
    const merchant = merchants[Math.floor(Math.random() * merchants.length)];
    const cat = categories.find((c) => c.slug === merchant.slug)!;
    transactions.push({
      account: { connect: { id: creditCard.id } },
      amount: parseDecimal(merchant.amount.toFixed(2)),
      type: 'DEBIT',
      status: 'POSTED',
      source: 'MANUAL',
      currency: 'USD',
      date: getRandomDateInPast(90),
      description: merchant.name,
      merchantName: merchant.name,
      category: { connect: { id: cat.id } },
    });
  }

  return Promise.all(transactions.map((data) => prisma.transaction.create({ data })));
}

async function createBudgets(familyId: string, categories: Array<{ id: string; slug: string }>): Promise<Array<{ id: string }>> {
  const groceryCategory = categories.find((c) => c.slug === 'groceries')!;
  const gasCategory = categories.find((c) => c.slug === 'gas')!;
  const entCategory = categories.find((c) => c.slug === 'subscriptions')!;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const budgetsData: Array<Prisma.BudgetCreateInput> = [
    {
      family: { connect: { id: familyId } },
      category: { connect: { id: groceryCategory.id } },
      name: 'Groceries Budget',
      amount: parseDecimal('800.00'),
      period: 'MONTHLY',
      status: 'ACTIVE',
      startDate: startOfMonth,
      endDate: endOfMonth,
      alertThresholds: [50, 75, 90],
    },
    {
      family: { connect: { id: familyId } },
      category: { connect: { id: gasCategory.id } },
      name: 'Gas Budget',
      amount: parseDecimal('400.00'),
      period: 'MONTHLY',
      status: 'ACTIVE',
      startDate: startOfMonth,
      endDate: endOfMonth,
      alertThresholds: [50, 75, 90],
    },
    {
      family: { connect: { id: familyId } },
      category: { connect: { id: entCategory.id } },
      name: 'Entertainment Budget',
      amount: parseDecimal('300.00'),
      period: 'MONTHLY',
      status: 'ACTIVE',
      startDate: startOfMonth,
      endDate: endOfMonth,
      alertThresholds: [50, 75, 90],
    },
  ];

  return Promise.all(budgetsData.map((data) => prisma.budget.create({ data })));
}

// Execute
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
