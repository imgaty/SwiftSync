import 'dotenv/config';  // loads .env only (not .env.local)

import { decrypt, resetFailedAttempts } from '../lib/adaptive-encryption';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../lib/generated/prisma/client';

async function test() {
  console.log('ENCRYPTION_MASTER_KEY:', process.env.ENCRYPTION_MASTER_KEY?.slice(0, 8) + '... (length: ' + process.env.ENCRYPTION_MASTER_KEY?.length + ')');

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const users = await prisma.user.findMany({ select: { id: true, email: true } });
  console.log('Total users:', users.length);

  for (const user of users) {
    resetFailedAttempts();
    try {
      const email = decrypt(user.email);
      console.log('OK:', user.id.slice(0, 8), '->', email);
    } catch (e: any) {
      console.log('FAIL:', user.id.slice(0, 8), '->', e.message);
    }
  }

  await prisma.$disconnect();
  pool.end();
}
test().catch(console.error);
