import 'dotenv/config'
import pg from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../lib/generated/prisma/client'
import { hashPassword } from '../lib/adaptive-encryption'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })
const inputEmail = process.argv[2]?.trim().toLowerCase()
const inputPassword = process.argv[3] || 'password'

async function main() {
  if (!inputEmail) {
    console.error('Usage: npx tsx scripts/promote-admin.ts <email>')
    process.exit(1)
  }

  const users = await prisma.user.findMany({
    select: { id: true, email: true, role: true, status: true },
    orderBy: { createdAt: 'asc' },
  })

  const existing = users.find((user) => user.email.toLowerCase() === inputEmail)

  const updated = await prisma.user.upsert({
    where: { email: inputEmail },
    update: { role: 'admin', status: 'active', password: hashPassword(inputPassword) },
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
    await pool.end()
  })
