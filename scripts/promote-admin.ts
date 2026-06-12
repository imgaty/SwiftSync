//
//  promote-admin.ts
//  Argent
//
//  Created by hilario on 22 May 2026 at 09:36.
//  Description: Provides the promote admin maintenance script for Argent, automating operational or
//  data-repair work that supports local development and administration.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../lib/generated/prisma/client'
import { hashPassword } from '../lib/password'

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })
const inputEmail = process.argv[2]?.trim().toLowerCase()
const inputPassword = process.argv[3]

async function main() {
  if (!inputEmail || !inputPassword) {
    console.error('Usage: pnpm run admin:promote -- <email> <password>')
    process.exit(1)
  }
  if (inputPassword.length < 12) {
    console.error('Password must be at least 12 characters.')
    process.exit(1)
  }

  const users = await prisma.user.findMany({
    select: { id: true, email: true, role: true, status: true },
    orderBy: { createdAt: 'asc' },
  })

  const existing = users.find((user) => user.email.toLowerCase() === inputEmail)

  const updated = await prisma.user.upsert({
    where: { email: inputEmail },
    update: {
      role: 'admin',
      status: 'active',
      password: hashPassword(inputPassword),
      emailTwoFactorCode: null,
      emailTwoFactorCodeExpiry: null,
    },
    create: {
      email: inputEmail,
      name: inputEmail.split('@')[0],
      password: hashPassword(inputPassword),
      dateOfBirth: '',
      role: 'admin',
      status: 'active',
    },
    select: { id: true, email: true, role: true, status: true },
  })

  if (!existing) {
    console.log('User did not exist in this DB. Created a new admin user.')
  }

  console.log('Updated user:', updated)
}

main()
  .catch((error) => {
    console.error('Failed to promote user:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
