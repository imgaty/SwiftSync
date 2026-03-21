#!/usr/bin/env tsx
/**
 * 🔐 Secure Local Database Decryption Tool
 *
 * Decrypts and displays user data from the database.
 * The master key is prompted interactively — never passed as CLI arg
 * (so it won't leak into shell history).
 *
 * Usage:
 *   npx tsx scripts/decrypt-db.ts
 *
 * Requires DATABASE_URL in .env (or passed inline).
 * The ENCRYPTION_MASTER_KEY is prompted at runtime — do NOT set it in .env
 * when using this script.
 *
 * Options (via env):
 *   USER_ID=<id>     Decrypt a single user by ID
 *   USER_EMAIL=<email>  Decrypt a single user by email (matched after decryption)
 *
 * Security notes:
 * - Output goes to stdout only — nothing is written to disk
 * - Master key is read via stdin with echo disabled (hidden input)
 * - Process sets ENCRYPTION_MASTER_KEY only in-memory, never persists it
 * - Add this script to .gitignore if not already ignored via scripts/
 */

import 'dotenv/config';
import * as readline from 'readline';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../lib/generated/prisma/client';

// ─── Prompt for master key (hidden input) ────────────────────────────────────

async function promptHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    // Disable echo for password input
    if (process.stdin.isTTY) {
      process.stdout.write(question);
      const stdin = process.stdin;
      stdin.setRawMode?.(true);
      stdin.resume();

      let input = '';
      const onData = (char: Buffer) => {
        const c = char.toString('utf8');
        if (c === '\n' || c === '\r') {
          stdin.setRawMode?.(false);
          stdin.removeListener('data', onData);
          rl.close();
          process.stdout.write('\n');
          resolve(input);
        } else if (c === '\u0003') {
          // Ctrl+C
          process.stdout.write('\n');
          process.exit(1);
        } else if (c === '\u007F' || c === '\b') {
          // Backspace
          if (input.length > 0) {
            input = input.slice(0, -1);
            process.stdout.write('\b \b');
          }
        } else {
          input += c;
          process.stdout.write('•');
        }
      };
      stdin.on('data', onData);
    } else {
      // Non-TTY fallback (piped input)
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer);
      });
    }
  });
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║   🔐 SwiftSync Database Decryption Tool     ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  // Prompt for master key
  const masterKey = await promptHidden('Enter master encryption key: ');

  if (!masterKey || masterKey.length < 8) {
    console.error('❌ Invalid key — must be at least 8 characters.');
    process.exit(1);
  }

  // Set the key in-memory only (never persists to disk)
  process.env.ENCRYPTION_MASTER_KEY = masterKey;

  // Now import encryption functions AFTER the key is set
  await import('../lib/adaptive-encryption');

  // Connect to database
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not set. Add it to .env or pass it inline.');
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const filterById = process.env.USER_ID;
    const filterByEmail = process.env.USER_EMAIL;

    const users = filterById
      ? [await prisma.user.findUnique({ where: { id: filterById } })].filter(Boolean)
      : await prisma.user.findMany();

    if (users.length === 0) {
      console.log('No users found.');
      return;
    }

    console.log(`Found ${users.length} user(s).\n`);
    console.log('─'.repeat(60));

    let displayed = 0;

    for (const user of users) {
      if (!user) continue;

      // Personal fields are stored as plaintext; only 2FA codes are encrypted
      const email = user.email;
      const name = user.name || '—';
      const dob = user.dateOfBirth || '—';
      const recoveryEmail = user.recoveryEmail || '—';

      // If filtering by email, skip non-matches
      if (filterByEmail && email !== filterByEmail) continue;

      displayed++;

      console.log(`\n  User #${displayed}`);
      console.log(`  ID:             ${user.id}`);
      console.log(`  Email:          ${email}`);
      console.log(`  Name:           ${name}`);
      console.log(`  Date of Birth:  ${dob}`);
      console.log(`  Recovery Email: ${recoveryEmail}`);
      console.log(`  2FA Enabled:    ${user.twoFactorEnabled ? 'Yes' : 'No'}`);
      console.log(`  Created:        ${user.createdAt.toISOString()}`);
      console.log('─'.repeat(60));
    }

    if (displayed === 0 && filterByEmail) {
      console.log(`\n  No user found with email: ${filterByEmail}`);
    }

    console.log(`\n✅ Displayed ${displayed} user(s).\n`);
  } catch (error) {
    console.error('\n❌ Decryption failed:', error instanceof Error ? error.message : error);
    console.error('   This likely means the master key is wrong.\n');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
    // Clear the key from memory
    process.env.ENCRYPTION_MASTER_KEY = '';
  }
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
