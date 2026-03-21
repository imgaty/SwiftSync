#!/usr/bin/env node

import 'dotenv/config'
import pg from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../lib/generated/prisma/client.js'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, role: true, status: true },
    orderBy: { createdAt: 'asc' },
  })

  if (users.length === 0) {
    console.error('No users found in database.')
    process.exit(1)
  }

  if (users.length > 1) {
    console.log(`Found ${users.length} users. Promoting the first one only.`)
  }

  const target = users[0]

  await prisma.user.update({
    where: { id: target.id },
    data: { role: 'admin' },
  })

  const updated = await prisma.user.findUnique({
    where: { id: target.id },
    select: { id: true, email: true, role: true, status: true },
  })

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
