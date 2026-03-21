/**
 * One-time migration script to encrypt plaintext emails in the database.
 * 
 * Run with: DATABASE_URL="postgresql://hilarioferreira@localhost:5432/SwiftSync?schema=public" ENCRYPTION_MASTER_KEY="56a6a7c838af31dd14e456491322a8f2" npx tsx scripts/encrypt-emails.ts
 */

import 'dotenv/config';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../lib/generated/prisma/client';
import { encrypt, decrypt } from '../lib/adaptive-encryption';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function migrateEmails() {
  console.log('\n=== Encrypting Plaintext Emails ===\n');

  const users = await prisma.user.findMany();
  let migrated = 0;
  let skipped = 0;

  for (const user of users) {
    // Check if the email is already encrypted (has the GENERATION:...:... format)
    const isEncrypted = user.email.split(':').length === 5;

    if (isEncrypted) {
      try {
        const decrypted = decrypt(user.email);
        console.log(`  ✓ User ${user.id} — already encrypted (${decrypted})`);
        skipped++;
      } catch {
        console.log(`  ⚠ User ${user.id} — encrypted but can't decrypt (different key?), skipping`);
        skipped++;
      }
      continue;
    }

    // Email is plaintext — encrypt it
    const plainEmail = user.email;
    const encryptedEmail = encrypt(plainEmail);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        email: encryptedEmail,
      },
    });

    console.log(`  🔒 User ${user.id} — encrypted: ${plainEmail} → ${encryptedEmail.substring(0, 40)}...`);
    migrated++;
  }

  console.log(`\n✅ Done! Migrated: ${migrated}, Skipped: ${skipped}`);
  await prisma.$disconnect();
  process.exit(0);
}

migrateEmails().catch((e) => {
  console.error('❌ Migration failed:', e);
  process.exit(1);
});
