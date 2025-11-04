// Quick script to activate a user account
const { PrismaClient } = require('./generated/prisma');

const prisma = new PrismaClient();

async function activateUser(email) {
  try {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      console.error(`❌ User not found: ${email}`);
      process.exit(1);
    }

    console.log(`\n📋 Current user status:`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Status: ${user.status}`);
    console.log(`   Email Verified: ${user.emailVerifiedAt ? 'Yes' : 'No'}`);

    if (user.status === 'ACTIVE') {
      console.log(`\n✅ User is already ACTIVE! No changes needed.`);
      return;
    }

    // Update user status to ACTIVE
    const updatedUser = await prisma.user.update({
      where: { email: email.toLowerCase() },
      data: {
        status: 'ACTIVE',
        emailVerifiedAt: new Date() // Mark email as verified too
      }
    });

    console.log(`\n✅ User activated successfully!`);
    console.log(`   Email: ${updatedUser.email}`);
    console.log(`   Status: ${updatedUser.status}`);
    console.log(`   Email Verified: ${updatedUser.emailVerifiedAt ? 'Yes' : 'No'}`);
    console.log(`\n🎉 User can now log in!`);

  } catch (error) {
    console.error('❌ Error activating user:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Get email from command line argument
const email = process.argv[2];

if (!email) {
  console.error('Usage: node activate-user.js <email>');
  process.exit(1);
}

activateUser(email);
