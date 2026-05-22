/**
 * Reset the database to a single admin user using the new password hashing.
 *
 * Usage:
 *   pnpm tsx scripts/reset-to-admin.ts <adminEmail> <newPassword>
 *   npx  tsx scripts/reset-to-admin.ts <adminEmail> <newPassword>
 *
 * What it does (transactionally):
 *   1. Upserts the admin user (role=admin, status=active) with a fresh scrypt hash
 *      produced by the new lib/password.ts module.
 *   2. Clears any stale auth state on that admin: 2FA, trusted devices, reset tokens,
 *      2FA pending codes.
 *   3. Deletes every OTHER user. Cascading deletes will remove their transactions,
 *      bills, budgets, goals, accounts, connections, PACE rules, notifications, etc.
 *
 * This is destructive. There is no confirmation prompt — run it only when you mean to.
 */

import 'dotenv/config'
import pg from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../lib/generated/prisma/client'
import { hashPassword } from '../lib/password'

function usage(): never {
  console.error('Usage: pnpm tsx scripts/reset-to-admin.ts <adminEmail> <newPassword>')
  console.error('   or: npx  tsx scripts/reset-to-admin.ts <adminEmail> <newPassword>')
  process.exit(1)
}

const rawEmail = process.argv[2]?.trim().toLowerCase()
const newPassword = process.argv[3]

if (!rawEmail || !newPassword) usage()
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
  console.error(`Invalid email: ${rawEmail}`)
  process.exit(1)
}
if (newPassword.length < 8) {
  console.error('Password must be at least 8 characters.')
  process.exit(1)
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

async function main() {
  const hash = hashPassword(newPassword)

  const result = await prisma.$transaction(async (tx) => {
    const admin = await tx.user.upsert({
      where: { email: rawEmail },
      update: {
        role: 'admin',
        status: 'active',
        password: hash,
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorCode: null,
        twoFactorCodeExpiry: null,
        twoFactorBackupCodes: null,
        resetToken: null,
        resetTokenExpiry: null,
      },
      create: {
        email: rawEmail,
        name: rawEmail.split('@')[0],
        password: hash,
        dateOfBirth: '',
        role: 'admin',
        status: 'active',
      },
      select: { id: true, email: true, role: true, status: true },
    })

    await tx.trustedDevice.deleteMany({ where: { userId: admin.id } })

    const deleted = await tx.user.deleteMany({
      where: { id: { not: admin.id } },
    })

    return { admin, deletedCount: deleted.count }
  })

  console.log(`\n✅ Admin ready: ${result.admin.email} (role=${result.admin.role}, status=${result.admin.status})`)
  console.log(`🗑️  Deleted ${result.deletedCount} other user(s) and their data.`)
  console.log('\nThe admin password has been re-hashed with the new scrypt scheme.')
  console.log('2FA is disabled, all trusted devices and reset tokens cleared.')
}

main()
  .catch((err) => {
    console.error('❌ Reset failed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
