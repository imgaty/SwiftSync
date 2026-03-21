/**
 * One-time migration script to decrypt encrypted personal fields in the database.
 * Converts email, name, dateOfBirth, and recoveryEmail from encrypted to plaintext.
 * 
 * Run with: npx tsx scripts/decrypt-user-fields.ts
 * (Requires DATABASE_URL and ENCRYPTION_MASTER_KEY in .env)
 */

import 'dotenv/config';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../lib/generated/prisma/client';
import { decrypt } from '../lib/adaptive-encryption';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function isEncrypted(value: string): boolean {
  // Encrypted values have the GENERATION:ALGO:SALT:IV:CIPHERTEXT format (5 colon-separated parts)
  return value.split(':').length === 5;
}

async function migrateToPlaintext() {
  console.log('\n=== Decrypting Personal Fields to Plaintext ===\n');

  const users = await prisma.user.findMany();
  let migrated = 0;
  let skipped = 0;

  for (const user of users) {
    const updates: Record<string, string> = {};

    // Decrypt email if encrypted
    if (isEncrypted(user.email)) {
      try {
        updates.email = decrypt(user.email);
        console.log(`  📧 User ${user.id} — email: decrypted`);
      } catch {
        console.log(`  ⚠ User ${user.id} — email: could not decrypt (different key?), skipping`);
      }
    }

    // Decrypt name if encrypted
    if (user.name && isEncrypted(user.name)) {
      try {
        updates.name = decrypt(user.name);
        console.log(`  👤 User ${user.id} — name: decrypted`);
      } catch {
        console.log(`  ⚠ User ${user.id} — name: could not decrypt, keeping as-is`);
      }
    }

    // Decrypt dateOfBirth if encrypted
    if (user.dateOfBirth && isEncrypted(user.dateOfBirth)) {
      try {
        updates.dateOfBirth = decrypt(user.dateOfBirth);
        console.log(`  📅 User ${user.id} — dateOfBirth: decrypted`);
      } catch {
        console.log(`  ⚠ User ${user.id} — dateOfBirth: could not decrypt, keeping as-is`);
      }
    }

    // Decrypt recoveryEmail if encrypted
    if (user.recoveryEmail && isEncrypted(user.recoveryEmail)) {
      try {
        updates.recoveryEmail = decrypt(user.recoveryEmail);
        console.log(`  📧 User ${user.id} — recoveryEmail: decrypted`);
      } catch {
        console.log(`  ⚠ User ${user.id} — recoveryEmail: could not decrypt, keeping as-is`);
      }
    }

    if (Object.keys(updates).length > 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: updates,
      });
      migrated++;
    } else {
      console.log(`  ✓ User ${user.id} — already plaintext, skipping`);
      skipped++;
    }
  }

  console.log(`\n✅ Done! Migrated: ${migrated}, Already plaintext: ${skipped}`);
  await prisma.$disconnect();
  process.exit(0);
}

migrateToPlaintext().catch((e) => {
  console.error('❌ Migration failed:', e);
  process.exit(1);
});
