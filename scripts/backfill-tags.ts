//
//  backfill-tags.ts
//  Argent
//
//  Created by hilario on 22 May 2026 at 09:36.
//  Description: Provides the backfill tags maintenance script for Argent, automating operational or
//  data-repair work that supports local development and administration.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
/**
 * Backfill the Tag table from existing Transaction.tags[] arrays.
 *
 * For every distinct tag slug found in any user's transactions,
 * creates a Tag row with default name (titlecased), a deterministic color, and
 * a default icon — but only if no Tag already exists for that user and slug.
 *
 * Idempotent. Safe to re-run.
 *
 * Run: pnpm run backfill:tags
 */

import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../lib/generated/prisma/client';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// 12-step palette — feels intentional rather than random while still giving
// clearly distinct colors. Keep in sync with the picker UI when it lands.
const PALETTE = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#eab308', // yellow
  '#84cc16', // lime
  '#10b981', // emerald
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#a855f7', // purple
  '#ec4899', // pink
];

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function colorFor(slug: string): string {
  return PALETTE[hashCode(slug) % PALETTE.length];
}

function titleCase(slug: string): string {
  return slug
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

// Loose mapping of common slugs to lucide icon names. Anything unmapped falls
// back to the default 'tag' icon. Add to this list as new slugs show up.
const ICON_MAP: Record<string, string> = {
  groceries: 'shopping-cart',
  food: 'utensils',
  food_and_drinks: 'utensils',
  food_delivery: 'pizza',
  transport: 'car',
  fuel: 'fuel',
  utilities: 'plug',
  housing: 'home',
  rent: 'home',
  salary: 'wallet',
  freelance: 'briefcase',
  transfer: 'arrow-left-right',
  cashback: 'percent',
  investment: 'trending-up',
  rental: 'building-2',
  tax_refund: 'receipt',
  subscriptions: 'repeat',
  health: 'heart-pulse',
  shopping: 'shopping-bag',
  travel: 'plane',
  other: 'circle-help',
  uncategorized: 'circle-help',
};

function iconFor(slug: string): string {
  return ICON_MAP[slug] ?? 'tag';
}

function pad(s: string | number, width: number): string {
  return String(s).padEnd(width);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // Pull just what we need to compute (user, slug) pairs.
  const txs = await prisma.transaction.findMany({
    select: { userId: true, tags: true },
  });

  // Map<userId, slugs>
  const byScope = new Map<
    string,
    { userId: string; slugs: Set<string> }
  >();

  for (const tx of txs) {
    if (!tx.tags || tx.tags.length === 0) continue;
    const key = `user:${tx.userId}`;
    let bucket = byScope.get(key);
    if (!bucket) {
      bucket = {
        userId: tx.userId,
        slugs: new Set<string>(),
      };
      byScope.set(key, bucket);
    }
    for (const slug of tx.tags) {
      const trimmed = (slug || '').trim().toLowerCase();
      if (trimmed) bucket.slugs.add(trimmed);
    }
  }

  if (byScope.size === 0) {
    console.log('No tagged transactions found. Nothing to backfill.');
    return;
  }

  // ---- Backfill ----------------------------------------------------------
  let created = 0;
  let skipped = 0;
  const perScope: { scope: string; created: number; skipped: number }[] = [];

  for (const [key, { userId, slugs }] of byScope) {
    let sCreated = 0;
    let sSkipped = 0;

    for (const slug of slugs) {
      const existing = await prisma.tag.findFirst({
        where: { userId, slug },
        select: { id: true },
      });

      if (existing) {
        sSkipped++;
        skipped++;
        continue;
      }

      await prisma.tag.create({
        data: {
          userId,
          slug,
          name: titleCase(slug) || slug,
          color: colorFor(slug),
          icon: iconFor(slug),
          isSystem: false,
        },
      });
      sCreated++;
      created++;
    }

    perScope.push({ scope: key, created: sCreated, skipped: sSkipped });
  }

  // ---- Summary -----------------------------------------------------------
  console.log('');
  console.log('─'.repeat(64));
  console.log(`Backfill summary`);
  console.log('─'.repeat(64));
  console.log(`Scopes processed:   ${byScope.size}`);
  console.log(`Tag rows created:   ${created}`);
  console.log(`Tag rows skipped:   ${skipped}  (already existed)`);
  console.log('');
  console.log(`${pad('Scope', 28)} ${pad('Created', 10)} ${pad('Skipped', 10)}`);
  for (const row of perScope) {
    console.log(
      `${pad(row.scope, 28)} ${pad(row.created, 10)} ${pad(row.skipped, 10)}`
    );
  }
  console.log('');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
