/**
 * MoneyWise Minimal Auth Seed
 * ================================================================================
 *
 * Creates only the minimum required data for authentication:
 *   - 1 Family (required for user)
 *   - 2 Users (admin + member)
 *
 * This is the DEFAULT seed for development. All other data (accounts,
 * transactions, categories) should come from real SaltEdge connections.
 *
 * Usage:
 *   pnpm db:seed              (runs this by default)
 *   pnpm db:seed:auth         (explicit auth-only seed)
 *
 * Credentials:
 *   - test@example.com / SecurePass123! (ADMIN)
 *   - member@example.com / SecurePass123! (MEMBER)
 */

import { PrismaClient } from '../../../generated/prisma';

const prisma = new PrismaClient();

// Seed identifiers for cleanup
export const SEED_USER_EMAILS = ['test@example.com', 'member@example.com'];
export const SEED_FAMILY_NAME = 'Test Family';

// Demo password (bcrypt hash for "SecurePass123!")
const DEMO_PASSWORD_HASH =
  '$2a$10$upBGppPkxrkdZQJgP9waBesoJ1/hyPXYCKI1720xwbPRjtB9Of6qK';

/**
 * Clean up existing seed data (idempotent)
 */
export async function cleanupAuthSeed(): Promise<void> {
  // Find seed users
  const seedUsers = await prisma.user.findMany({
    where: { email: { in: SEED_USER_EMAILS } },
  });

  if (seedUsers.length > 0) {
    // Delete users (cascades to related data)
    await prisma.user.deleteMany({
      where: { id: { in: seedUsers.map((u) => u.id) } },
    });
  }

  // Delete seed family
  const seedFamily = await prisma.family.findFirst({
    where: { name: SEED_FAMILY_NAME },
  });

  if (seedFamily) {
    await prisma.family.delete({ where: { id: seedFamily.id } });
  }
}

/**
 * Create minimal auth data
 */
export async function seedAuth(): Promise<{
  family: { id: string; name: string };
  admin: { id: string; email: string };
  member: { id: string; email: string };
}> {
  // Create family
  const family = await prisma.family.create({
    data: { name: SEED_FAMILY_NAME },
  });

  // Create admin user
  const admin = await prisma.user.create({
    data: {
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      passwordHash: DEMO_PASSWORD_HASH,
      role: 'ADMIN',
      status: 'ACTIVE',
      familyId: family.id,
      timezone: 'Europe/Rome',
      currency: 'EUR',
    },
  });

  // Create member user
  const member = await prisma.user.create({
    data: {
      email: 'member@example.com',
      firstName: 'Member',
      lastName: 'User',
      passwordHash: DEMO_PASSWORD_HASH,
      role: 'MEMBER',
      status: 'ACTIVE',
      familyId: family.id,
      timezone: 'Europe/Rome',
      currency: 'EUR',
    },
  });

  return { family, admin, member };
}

/**
 * Main execution
 */
async function main() {
  try {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        '❌ SAFETY CHECK FAILED: Seeding is not allowed in production!',
      );
    }

    console.log('\n🔐 MoneyWise Auth Seed');
    console.log('='.repeat(50) + '\n');

    console.log('🧹 Cleaning up existing seed data...');
    await cleanupAuthSeed();
    console.log('   ✅ Cleanup complete\n');

    console.log('🌱 Creating minimal auth data...');
    const { family, admin, member } = await seedAuth();

    console.log(`   ✅ Family: "${family.name}"`);
    console.log(`   ✅ Admin: ${admin.email}`);
    console.log(`   ✅ Member: ${member.email}\n`);

    console.log('✅ Auth seed completed!\n');
    console.log('📋 Credentials:');
    console.log('   Email:    test@example.com');
    console.log('   Password: SecurePass123!\n');
    console.log('💡 Next steps:');
    console.log('   1. Start the app: pnpm dev');
    console.log('   2. Login at http://localhost:3000');
    console.log('   3. Connect your bank via SaltEdge\n');
  } catch (error) {
    console.error('❌ Auth seed failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Only run if executed directly (not imported)
if (require.main === module) {
  main();
}
