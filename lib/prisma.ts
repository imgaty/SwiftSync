import { PrismaClient } from "@/lib/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
  // In dev, only surface warnings/errors by default to avoid drowning the
  // terminal in per-query logs. Set PRISMA_LOG_QUERIES=1 to opt in.
  const log = process.env.PRISMA_LOG_QUERIES === "1"
    ? (["query", "info", "warn", "error"] as const)
    : (["warn", "error"] as const)
  return new PrismaClient({ adapter, log: [...log] })
}

export const prisma = globalForPrisma.prisma || createPrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
