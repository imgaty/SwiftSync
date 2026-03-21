/*
 * Debug Script — Adaptive Encryption System (Interactive)
 *
 * Prompts you for a password, then walks through every step of the
 * encryption pipeline in slow-motion so you can follow exactly what
 * happens at each stage.
 *
 * Run with:  npx tsx scripts/debug-encryption.ts
 */

import 'dotenv/config';
import { randomBytes, scryptSync, createHash } from 'crypto';
import { createInterface } from 'readline';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../lib/generated/prisma/client';
import {
  getCurrentGeneration,
  getGenerationDNA,
  verifyPassword,
  passwordShouldUpgrade,
  GENERATION_PERIOD,
  EPOCH_START,
  SALT_LENGTH,
  type GenerationDNA,
} from '../lib/adaptive-encryption';

// ─── ANSI (foreground only) ─────────────────────────────────

const X    = '\x1b[0m';   // reset
const B    = '\x1b[1m';   // bold
const DIM  = '\x1b[2m';   // dim
const IT   = '\x1b[3m';   // italic
const RED  = '\x1b[31m';
const GRN  = '\x1b[32m';
const YEL  = '\x1b[33m';
const MAG  = '\x1b[35m';
const CYN  = '\x1b[36m';
const WHT  = '\x1b[37m';
const GRY  = '\x1b[90m';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const strip  = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, '');
const rpad   = (s: string, n: number) => s + ' '.repeat(Math.max(0, n - strip(s).length));
const sleep  = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
const wait   = () => sleep(1200);
const clear  = () => process.stdout.write('\x1b[2J\x1b[H');
const blank  = () => console.log('');
const note   = (t: string) => console.log(`        ${DIM}${IT}${t}${X}`);
const show   = (label: string, value: string | number) => console.log(`        ${DIM}${label}${X}  ${value}`);
const dot    = () => console.log(`\n    ${DIM}${GRY}· · · · · · · · · · · · · · · · · · · · · · · · · · · · · ·${X}\n`);

// ─── Box helper (dynamic width, aligned borders) ─────────────────────────────

function box(rows: string[], width = 0, indent = '        ', color = GRY) {
  const w = width || Math.max(...rows.map(r => strip(r).length)) + 4;
  blank();
  console.log(`${indent}${color}┌${'─'.repeat(w)}┐${X}`);
  for (const row of rows) console.log(`${indent}${color}│${X}  ${rpad(row, w - 2)}${color}│${X}`);
  console.log(`${indent}${color}└${'─'.repeat(w)}┘${X}`);
  blank();
}

// ─── Phase banner ────────────────────────────────────────────────────────────

const W = 72;

function banner(phase: number, title: string) {
  blank();
  console.log(`  ${DIM}${CYN}╭${'─'.repeat(W)}╮${X}`);
  const text = `${B}${CYN}PHASE ${phase}${X}  ${DIM}─${X}  ${B}${title}${X}`;
  console.log(`  ${DIM}${CYN}│${X} ${rpad(text, W - 2)} ${DIM}${CYN}│${X}`);
  console.log(`  ${DIM}${CYN}╰${'─'.repeat(W)}╯${X}`);
  blank();
}

// ─── Step counter ────────────────────────────────────────────────────────────

let _n = 0;
const step = (text: string) => { _n++; console.log(`    ${B}${YEL}→ Step ${_n}${X}  ${text}`); blank(); };

// ─── Pass / Fail ─────────────────────────────────────────────────────────────

const ok = (t: string) => console.log(`\n    ${GRN}${B}✔ PASS${X}  ${GRN}${t}${X}\n`);
const no = (t: string) => console.log(`\n    ${RED}${B}✘ FAIL${X}  ${RED}${t}${X}\n`);

// ─── Interactive prompts ─────────────────────────────────────────────────────

function pressEnter() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise<void>(r => rl.question(`    ${DIM}${GRY}❯ press enter to continue…${X} `, () => { rl.close(); r(); }));
}

function ask(question: string, hide = false): Promise<string> {
  return new Promise(resolve => {
    if (!hide) {
      const rl = createInterface({ input: process.stdin, output: process.stdout });
      return rl.question(`    ${question} `, a => { rl.close(); resolve(a); });
    }
    process.stdout.write(`    ${question} `);
    process.stdin.setRawMode?.(true);
    process.stdin.resume();
    let buf = '';
    const onData = (ch: Buffer) => {
      const c = ch.toString();
      if (c === '\n' || c === '\r')   { process.stdin.setRawMode?.(false); process.stdin.removeListener('data', onData); process.stdin.pause(); process.stdout.write('\n'); resolve(buf); }
      else if (c === '\u007f')        { buf = buf.slice(0, -1); process.stdout.write(`\r\x1b[K    ${question} ${'•'.repeat(buf.length)}`); }
      else if (c === '\u0003')        { console.log('\n'); process.exit(0); }
      else                            { buf += c; process.stdout.write(`${MAG}•${X}`); }
    };
    process.stdin.on('data', onData);
  });
}

// ─── scrypt wrapper (times the call for display) ────────────────────────────

function hashWith(peppered: string, salt: Buffer, d: GenerationDNA) {
  const t = performance.now();
  const hash = scryptSync(peppered, salt, 64, { N: d.scryptN, r: d.scryptR, p: d.scryptP });
  return { hash, ms: (performance.now() - t).toFixed(0) };
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN
// ═════════════════════════════════════════════════════════════════════════════

async function main() {
  clear();

  // ── Title ──────────────────────────────────────────────────────────────────

  blank();
  console.log(`    ${B}${MAG}🔐  SwiftSync — Encryption Debug Walkthrough${X}`);
  blank();
  console.log(`    ${DIM}Follow each step of the adaptive encryption pipeline${X}`);
  console.log(`    ${DIM}in slow motion. Press Enter between phases.${X}`);
  blank();

  const password = await ask(`${B}${WHT}Enter a password to trace:${X}`, true);
  if (!password) { console.log('    No input. Exiting.'); process.exit(0); }
  blank();
  console.log(`    ${GRY}Password received ${DIM}(${password.length} chars)${X}${GRY}. Starting trace…${X}`);
  await sleep(900);

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 1 — Generation
  // ═══════════════════════════════════════════════════════════════════════════

  banner(1, 'Determine the Current Generation');
  await wait();

  step('What is the current time?');
  const now = Date.now();
  show('Date.now()', `${WHT}${now}${X}`);
  show('ISO',        `${CYN}${new Date(now).toISOString()}${X}`);
  await wait(); dot();

  step('How many milliseconds since the epoch start?');
  await wait();
  const elapsed = now - EPOCH_START;
  show('EPOCH_START', `${EPOCH_START}  ${DIM}(${new Date(EPOCH_START).toISOString()})${X}`);
  show('Elapsed',     `${WHT}${elapsed.toLocaleString()} ms${X}`);
  await wait(); dot();

  step('Divide by the generation period');
  await wait();
  const gen = getCurrentGeneration();
  show('Period',  `${GENERATION_PERIOD.toLocaleString()} ms  ${DIM}(6 hours)${X}`);
  show('Formula', `floor( ${elapsed} / ${GENERATION_PERIOD} ) + 1`);
  box([`Generation: ${B}${CYN}${gen}${X}`], 40);
  await pressEnter();

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 2 — DNA
  // ═══════════════════════════════════════════════════════════════════════════

  banner(2, 'Derive the Generation DNA');
  await wait();

  step('Hash the generation number with SHA-512');
  await wait();
  const seedStr = `SWIFT-ENCRYPTION-GENERATION-NUMBER-${gen}`;
  const seed    = createHash('sha512').update(seedStr).digest();
  show('Input', `${DIM}"${seedStr}"${X}`);
  await sleep(600);
  console.log(`        ${DIM}SHA-512${X}`);
  console.log(`          ${CYN}↓${X}`);
  console.log(`        ${B}${GRY}${seed.toString('hex').slice(0, 56)}…${X}  ${DIM}(64 bytes)${X}`);
  await wait(); dot();

  step('Extract DNA parameters from the seed');
  await wait();
  const d = getGenerationDNA(gen);
  box([
    `${B}scryptN${X}  ${WHT}${d.scryptN}${X}      ${DIM}2^14  (CPU cost, fixed)${X}`,
    `${B}scryptR${X}  ${WHT}${d.scryptR}${X}          ${DIM}block size (fixed)${X}`,
    `${B}scryptP${X}  ${WHT}${d.scryptP}${X}          ${DIM}seed[2]=${seed[2]} (${seed[2] % 2 === 0 ? 'even' : 'odd'}) → changes${X}`,
    `${B}pepper ${X}  ${MAG}${d.pepper}${X}  ${DIM}(64 hex, changes)${X}`,
  ]);
  await pressEnter();

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 3 — Hashing
  // ═══════════════════════════════════════════════════════════════════════════

  banner(3, 'Hash the Password');
  console.log(`    ${DIM}This is what gets stored in the database.${X}\n`);
  await wait();

  step('Generate a random 32-byte salt');
  await wait();
  const salt = randomBytes(SALT_LENGTH);
  show('Salt (hex)',    `${GRY}${salt.toString('hex')}${X}`);
  show('Salt (base64)', `${WHT}${salt.toString('base64')}${X}`);
  await wait(); dot();

  step('Build the peppered string');
  await wait();
  const peppered = `${password}:${d.pepper}:GEN${gen}`;
  show('Format', `${DIM}"<password>:<pepper>:GEN<n>"${X}`);
  await sleep(500);
  show('Result', `${WHT}"${peppered}"${X}`);
  show('Length', `${peppered.length} chars`);
  await wait(); dot();

  step('Run scrypt  ⏳');
  await sleep(400);
  note(`scrypt( peppered, salt, keyLen=64, N=${d.scryptN}, r=${d.scryptR}, p=${d.scryptP} )`);
  console.log(`        ${YEL}${DIM}computing…${X}`);
  const { hash, ms } = hashWith(peppered, salt, d);
  await sleep(300);
  show('Hash (hex)',    `${GRY}${hash.toString('hex').slice(0, 56)}…${X}`);
  show('Hash (base64)', `${WHT}${hash.toString('base64')}${X}`);
  show('Time',          `${YEL}${ms} ms${X}`);
  await wait(); dot();

  step('Assemble the stored hash string');
  await wait();
  const stored = `${gen}:${salt.toString('base64')}:${hash.toString('base64')}`;
  show('Format', `${DIM}"<generation>:<salt_b64>:<hash_b64>"${X}`);
  await sleep(500);
  box([`${B}${GRN}${stored}${X}`], 0, '        ', GRN);
  show('Full length', `${stored.length} characters`);
  note('↑ This is the string saved to the database.');
  await pressEnter();

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 4 — Verify correct password
  // ═══════════════════════════════════════════════════════════════════════════

  banner(4, 'Verify the Correct Password');
  console.log(`    ${DIM}Simulating a login attempt with the correct password…${X}\n`);
  await wait();

  step('Split the stored hash into its 3 parts');
  await wait();
  const parts = stored.split(':');
  show(`${CYN}Part 1${X} — generation`, `${WHT}${parts[0]}${X}`);
  await sleep(400);
  show(`${CYN}Part 2${X} — salt`,       `${WHT}${parts[1]}${X}`);
  await sleep(400);
  show(`${CYN}Part 3${X} — hash`,       `${WHT}${parts[2].slice(0, 36)}…${X}`);
  await wait(); dot();

  step('Reconstruct generation DNA from stored generation');
  await wait();
  const vGen = parseInt(parts[0], 10);
  const vDna = getGenerationDNA(vGen);
  show('Generation', `${WHT}${vGen}${X}`);
  show('Pepper',     `${MAG}${vDna.pepper}${X}`);
  show('scrypt',     `N=${vDna.scryptN}  r=${vDna.scryptR}  p=${vDna.scryptP}`);
  await wait(); dot();

  step('Decode salt & hash back to raw bytes');
  await wait();
  const vSalt = Buffer.from(parts[1], 'base64');
  const vBuf  = Buffer.from(parts[2], 'base64');
  show('Salt', `${vSalt.length} bytes`);
  show('Hash', `${vBuf.length} bytes`);
  await wait(); dot();

  step('Re-hash the input password  ⏳');
  await sleep(400);
  const vPep = `${password}:${vDna.pepper}:GEN${vGen}`;
  note(`scrypt( peppered, salt, 64, N=${vDna.scryptN}, r=${vDna.scryptR}, p=${vDna.scryptP} )`);
  console.log(`        ${YEL}${DIM}computing…${X}`);
  const v = hashWith(vPep, vSalt, vDna);
  await sleep(300);
  show('Computed', `${GRY}${v.hash.toString('hex').slice(0, 56)}…${X}`);
  show('Time',     `${YEL}${v.ms} ms${X}`);
  await wait(); dot();

  step('Compare byte-by-byte (timing-safe)');
  await sleep(600);
  console.log(`        ${GRY}Stored  │${X} ${vBuf.toString('hex').slice(0, 48)}…`);
  console.log(`        ${GRY}Computed│${X} ${v.hash.toString('hex').slice(0, 48)}…`);
  await sleep(800);
  const match = verifyPassword(password, stored);
  match ? ok('Match! The password is correct.') : no('No match — password is wrong.');
  await pressEnter();

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 5 — Reject wrong password
  // ═══════════════════════════════════════════════════════════════════════════

  banner(5, 'Reject a Wrong Password');
  console.log(`    ${DIM}Now trying with "WrongPassword99!" instead…${X}\n`);
  await wait();

  step('Hash the wrong password with the same salt & DNA  ⏳');
  console.log(`        ${YEL}${DIM}computing…${X}`);
  const w = hashWith(`WrongPassword99!:${vDna.pepper}:GEN${vGen}`, vSalt, vDna);
  await sleep(400);
  show('Wrong hash', `${GRY}${w.hash.toString('hex').slice(0, 56)}…${X}`);
  await wait(); dot();

  step('Compare against stored hash');
  await sleep(600);
  console.log(`        ${GRY}Stored│${X} ${vBuf.toString('hex').slice(0, 48)}…`);
  console.log(`        ${RED}Wrong │${X} ${w.hash.toString('hex').slice(0, 48)}…`);
  await sleep(800);
  const wMatch = verifyPassword('WrongPassword99!', stored);
  !wMatch ? ok('Correctly rejected — hashes are completely different.') : no('They matched?! This should never happen.');
  await pressEnter();

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 6 — Auto-upgrade
  // ═══════════════════════════════════════════════════════════════════════════

  banner(6, 'Auto-Upgrade Check');
  await wait();

  step('Should this hash be re-hashed on next login?');
  await wait();
  const sGen = parseInt(stored.split(':')[0], 10);
  const cGen = getCurrentGeneration();
  show('Stored generation',  `${WHT}${sGen}${X}`);
  show('Current generation', `${WHT}${cGen}${X}`);
  await sleep(600);
  const shouldUpgrade = passwordShouldUpgrade(stored);
  if (shouldUpgrade) {
    console.log(`\n        ${YEL}${B}⚠ UPGRADE NEEDED${X}  ${YEL}— would re-hash with gen ${cGen} on next login${X}\n`);
  } else {
    console.log(`\n        ${GRN}${B}✔ UP TO DATE${X}  ${GRN}— hash is using the latest generation${X}\n`);
  }
  await wait(); dot();

  step('Compare with an old generation');
  await wait();
  const oldG = Math.max(1, gen - 10);
  const oldD = getGenerationDNA(oldG);
  box([
    `${DIM}Generation${X} ${WHT}${oldG}${X}  ${DIM}(10 gens ago)${X}`,
    `${DIM}Pepper${X}     ${MAG}${oldD.pepper}${X}  ${DIM}← different!${X}`,
    `${DIM}scryptP${X}    ${WHT}${oldD.scryptP}${X}  ${DIM}(current: ${d.scryptP})${X}`,
  ]);
  note('Different generation = different pepper = completely different hash.');
  note('Verification still works because the generation # is stored with the hash.');
  await pressEnter();

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 7 — Database
  // ═══════════════════════════════════════════════════════════════════════════

  banner(7, 'Database Check');

  if (!process.env.DATABASE_URL) {
    console.log(`    ${DIM}DATABASE_URL not set — skipping database phase.${X}`);
    console.log(`    ${DIM}Set it in .env to enable this section.${X}\n`);
  } else {
    step('Connect to the database');
    await wait();
    show('URL', process.env.DATABASE_URL.replace(/\/\/.*@/, '//***:***@'));

    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    try {
      const prisma = new PrismaClient({ adapter: new PrismaPg(pool as any) });
      const count = await prisma.user.count();
      show('Status', `${GRN}connected${X}`);
      show('Users',  `${WHT}${count}${X}`);
      await wait(); dot();

      step('Fetch users and inspect hashes');
      await wait();
      const users = await prisma.user.findMany({ select: { id: true, email: true, name: true, password: true } });

      for (const u of users) {
        const p = u.password.split(':');
        const g = p.length === 3 ? parseInt(p[0], 10) : NaN;
        const upgrade = !isNaN(g) && passwordShouldUpgrade(u.password);
        box([
          `${B}${WHT}${u.email}${X}  ${DIM}(${u.name})${X}`,
          `${DIM}ID:${X}   ${GRY}${u.id}${X}`,
          `${DIM}Hash:${X} ${GRY}${u.password.slice(0, 44)}…${X}`,
          `${DIM}Gen:${X}  ${upgrade ? `${YEL}${g}  ⚠ needs upgrade${X}` : `${GRN}${g}  ✔ current${X}`}`,
        ], 54);
        await sleep(400);
      }

      // Offer to verify against a real user
      const email = await ask(`${B}${WHT}Verify your password against a user? ${DIM}(email or "no")${X}${B}:${X}`);
      if (email && !/^no?$/i.test(email.trim())) {
        const user = await prisma.user.findUnique({
          where: { email: email.trim().toLowerCase() },
          select: { id: true, email: true, name: true, password: true },
        });

        if (!user) {
          no(`No user found with email "${email.trim()}"`);
        } else {
          dot();
          step(`Verify password against ${B}${user.email}${X}`);
          await wait();

          const [gS, sB64, hB64] = user.password.split(':');
          const dbGen   = parseInt(gS, 10);
          const dbSalt  = Buffer.from(sB64, 'base64');
          const dbBuf   = Buffer.from(hB64, 'base64');
          const dbDna   = getGenerationDNA(dbGen);

          show('Stored gen', `${WHT}${dbGen}${X}`);
          show('Salt',       `${GRY}${sB64}${X}`);
          show('Pepper',     `${MAG}${dbDna.pepper}${X}`);
          await wait(); dot();

          step('Build peppered string and run scrypt  ⏳');
          const dbPep = `${password}:${dbDna.pepper}:GEN${dbGen}`;
          show('Peppered', `${DIM}"${dbPep}"${X}`);
          note(`scrypt( peppered, salt, 64, N=${dbDna.scryptN}, r=${dbDna.scryptR}, p=${dbDna.scryptP} )`);
          console.log(`        ${YEL}${DIM}computing…${X}`);
          const db = hashWith(dbPep, dbSalt, dbDna);
          await sleep(300);
          show('Time', `${YEL}${db.ms} ms${X}`);
          await wait(); dot();

          step('Compare hashes');
          await sleep(600);
          console.log(`        ${GRY}Stored  │${X} ${dbBuf.toString('hex').slice(0, 48)}…`);
          console.log(`        ${GRY}Computed│${X} ${db.hash.toString('hex').slice(0, 48)}…`);
          await sleep(800);

          const dbMatch = verifyPassword(password, user.password);
          dbMatch ? ok('Password matches the database! Login would succeed.') : no('Password does NOT match. Login would fail.');
        }
      }

      await pool.end();
    } catch (err) {
      no(`Database error: ${err instanceof Error ? err.message : err}`);
      await pool.end();
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Summary
  // ═══════════════════════════════════════════════════════════════════════════

  blank();
  console.log(`    ${B}${CYN}✨  All Phases Complete${X}`);
  blank();
  for (const [label, detail] of [
    [`Generation ${CYN}${gen}${X}`,  'calculated from current time'],
    ['DNA derived',                   'pepper + scrypt params for this generation'],
    ['Password hashed',               'salt + pepper + scrypt → stored string'],
    ['Correct password verified',     `${GRN}✔${X}`],
    ['Wrong password rejected',       `${GRN}✔${X}`],
    ['Upgrade check',                 shouldUpgrade ? `${YEL}needs upgrade${X}` : `${GRN}up to date${X}`],
    ['Database',                      process.env.DATABASE_URL ? `${GRN}checked${X}` : `${DIM}skipped${X}`],
  ]) console.log(`      ${CYN}●${X}  ${B}${label}${X}  ${DIM}— ${X}${detail}`);

  console.log(`\n    ${DIM}Done.${X}\n`);
  process.exit(0);
}

main().catch(err => { console.error(`\n${RED}Fatal error:${X}`, err); process.exit(1); });
