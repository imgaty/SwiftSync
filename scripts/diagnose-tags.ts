/**
 * Read-only diagnostic: where do current transactions come from, and how are
 * they tagged? Prints distribution to help decide what the categorization
 * pipeline should look like before any schema changes.
 *
 * Run: npx tsx scripts/diagnose-tags.ts
 */

import 'dotenv/config';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../lib/generated/prisma/client';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pct(part: number, whole: number): string {
  if (whole === 0) return '0.0%';
  return `${((part / whole) * 100).toFixed(1)}%`;
}

function pad(s: string | number, width: number): string {
  return String(s).padEnd(width);
}

function rpad(s: string | number, width: number): string {
  return String(s).padStart(width);
}

function section(title: string) {
  console.log('');
  console.log('─'.repeat(72));
  console.log(title);
  console.log('─'.repeat(72));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const total = await prisma.transaction.count();
  if (total === 0) {
    console.log('No transactions in the database.');
    return;
  }

  // Pull just the columns we need. tags is a Postgres array of strings.
  const txs = await prisma.transaction.findMany({
    select: {
      id: true,
      tags: true,
      description: true,
      saltEdgeId: true,
      createdAt: true,
    },
  });

  // ---- High-level counts -----------------------------------------------
  const empty = txs.filter((t) => !t.tags || t.tags.length === 0);
  const tagged = txs.filter((t) => t.tags && t.tags.length > 0);
  const onlyOther = txs.filter(
    (t) => t.tags && t.tags.length === 1 && t.tags[0] === 'other'
  );
  const fromSaltEdge = txs.filter((t) => t.saltEdgeId !== null);
  const manual = txs.filter((t) => t.saltEdgeId === null);

  section('Transaction totals');
  console.log(`Total transactions: ${total}`);
  console.log(
    `  Tagged (≥1 tag):  ${pad(tagged.length, 6)} (${pct(tagged.length, total)})`
  );
  console.log(
    `  Empty tags:       ${pad(empty.length, 6)} (${pct(empty.length, total)})`
  );
  console.log(
    `  Only 'other':     ${pad(onlyOther.length, 6)} (${pct(onlyOther.length, total)})`
  );
  console.log('');
  console.log(
    `  From Salt Edge:   ${pad(fromSaltEdge.length, 6)} (${pct(fromSaltEdge.length, total)})  ` +
      `[saltEdgeId set]`
  );
  console.log(
    `  Manual / seeded:  ${pad(manual.length, 6)} (${pct(manual.length, total)})  ` +
      `[no saltEdgeId]`
  );

  // ---- Cross-tab: source × tag state ----------------------------------
  const cross = (filter: (t: (typeof txs)[number]) => boolean) => {
    const sub = txs.filter(filter);
    const subEmpty = sub.filter((t) => !t.tags || t.tags.length === 0).length;
    const subOther = sub.filter(
      (t) => t.tags && t.tags.length === 1 && t.tags[0] === 'other'
    ).length;
    const subTagged = sub.filter((t) => t.tags && t.tags.length > 0).length;
    return { total: sub.length, subEmpty, subOther, subTagged };
  };

  const seCross = cross((t) => t.saltEdgeId !== null);
  const manCross = cross((t) => t.saltEdgeId === null);

  section('Tag state by source');
  console.log(
    `${pad('Source', 18)} ${rpad('Total', 8)} ${rpad('Tagged', 8)} ${rpad('Empty', 8)} ${rpad("'other'", 10)}`
  );
  console.log(
    `${pad('Salt Edge', 18)} ${rpad(seCross.total, 8)} ${rpad(seCross.subTagged, 8)} ${rpad(seCross.subEmpty, 8)} ${rpad(seCross.subOther, 10)}`
  );
  console.log(
    `${pad('Manual / seeded', 18)} ${rpad(manCross.total, 8)} ${rpad(manCross.subTagged, 8)} ${rpad(manCross.subEmpty, 8)} ${rpad(manCross.subOther, 10)}`
  );

  // ---- Top tags --------------------------------------------------------
  const tagCounts = new Map<string, number>();
  for (const t of txs) {
    for (const tag of t.tags || []) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }
  const sortedTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]);

  section(`Top tags  (${tagCounts.size} distinct)`);
  for (const [tag, count] of sortedTags.slice(0, 30)) {
    console.log(`  ${pad(tag, 36)} ${rpad(count, 6)}  ${pct(count, total)}`);
  }
  if (sortedTags.length > 30) {
    console.log(`  … and ${sortedTags.length - 30} more`);
  }

  // ---- Sample empty-tag transactions ----------------------------------
  if (empty.length > 0) {
    section('Sample empty-tag transactions (first 10)');
    for (const t of empty.slice(0, 10)) {
      const src = t.saltEdgeId ? '[salt-edge]' : '[manual   ]';
      const desc = (t.description || '').slice(0, 50).padEnd(50);
      console.log(`  ${src} ${desc}  ${t.createdAt.toISOString().slice(0, 10)}`);
    }
  }

  // ---- PACE rules counts ----------------------------------------------
  const ruleCount = await prisma.pACERule.count();

  section('PACE rules in DB');
  console.log(`Total rules: ${ruleCount}`);
  if (ruleCount === 0) {
    console.log('');
    console.log('  ⚠  No rules exist. Manual transactions with no tag input');
    console.log('     fall through PACE and get tagged "other".');
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
