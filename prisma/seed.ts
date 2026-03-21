import 'dotenv/config';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../lib/generated/prisma/client';
import { hashPassword } from '../lib/adaptive-encryption';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...\n');

  // Clean existing data
  await prisma.transaction.deleteMany();
  await prisma.bankAccount.deleteMany();
  await prisma.saltEdgeConnection.deleteMany();
  await prisma.user.deleteMany();
  await prisma.bank.deleteMany();

  console.log('🗑️  Cleared existing data\n');

  // Create main user
  const hashedPassword = hashPassword('password');
  
  const mainUser = await prisma.user.create({
    data: {
      email: 'hilariobferreira@icloud.com',
      name: 'Hilário Ferreira',
      password: hashedPassword,
      dateOfBirth: '',
    },
  });

  console.log(`👤 Created user: ${mainUser.name} (${mainUser.id})`);

  console.log('\n✅ Seeding complete!');
  console.log('   Connect your bank accounts via Salt Edge from the Accounts page.');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
