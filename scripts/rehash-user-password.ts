//
//  rehash-user-password.ts
//  Argent
//
//  Created by hilario on 06 Jun 2026 at __:__.
//
//  Manually resets a user's stored password hash with the active password scheme.
//

import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../lib/generated/prisma/client'
import { hashPassword } from '../lib/password'

const email = process.argv[2]?.trim().toLowerCase()
const newPassword = process.argv[3]

function usage(): never {
  console.error('Usage: pnpm run password:rehash-user -- <email> <newPassword>')
  process.exit(1)
}

if (!email || !newPassword) usage()
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error(`Invalid email: ${email}`)
  process.exit(1)
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })

async function main() {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, password: true },
  })

  if (!user) {
    console.error(`No user found for ${email}`)
    process.exit(1)
  }

  const previousScheme = user.password.split('$').slice(0, 2).join('$') || 'unknown'
  const password = hashPassword(newPassword)

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password,
      sessionVersion: { increment: 1 },
    },
  })

  console.log(`Updated ${user.email}: ${previousScheme} -> scrypt$v2`)
  console.log('Existing sessions were invalidated by incrementing sessionVersion.')
}

main()
  .catch((error) => {
    console.error('Failed to rehash user password:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
