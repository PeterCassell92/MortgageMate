import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create MortgageAdvisor system user with id=0
  const advisorExists = await prisma.user.findUnique({
    where: { id: 0 }
  });

  if (!advisorExists) {
    // Generate a random salt and hash for the system user (won't be used for login)
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash('SYSTEM_USER_NO_LOGIN', salt);

    await prisma.$executeRaw`
      INSERT INTO users (id, username, password_hash, salt, created_at, updated_at)
      VALUES (0, 'MortgageAdvisor', ${passwordHash}, ${salt}, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING;
    `;

    // Reset the sequence to start from 1 for regular users
    await prisma.$executeRaw`
      SELECT setval('users_id_seq', 1, false);
    `;

    console.log('✅ Created MortgageAdvisor system user (id=0)');
  } else {
    console.log('ℹ️  MortgageAdvisor system user already exists');
  }

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
