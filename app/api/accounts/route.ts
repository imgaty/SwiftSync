import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUserId } from "@/lib/auth-helpers"

// GET /api/accounts — List all bank accounts for the user (all sourced from Salt Edge)
export async function GET() {
  const userId = await getAuthUserId()
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const accounts = await prisma.bankAccount.findMany({
    where: { userId },
    include: { bank: true, connection: true },
    orderBy: { createdAt: "desc" },
  })

  // Compute totalIn, totalOut, transactionCount per account from transactions
  const accountIds = accounts.map((a) => a.id)
  const txAggregates = await prisma.transaction.groupBy({
    by: ["accountId", "type"],
    where: { userId, accountId: { in: accountIds } },
    _sum: { amount: true },
    _count: true,
  })

  // Build lookup maps
  const totalIn: Record<string, number> = {}
  const totalOut: Record<string, number> = {}
  const txCount: Record<string, number> = {}

  for (const agg of txAggregates) {
    const aid = agg.accountId
    const amount = Number(agg._sum.amount || 0)
    if (agg.type === "in") {
      totalIn[aid] = (totalIn[aid] || 0) + amount
    } else {
      totalOut[aid] = (totalOut[aid] || 0) + amount
    }
    txCount[aid] = (txCount[aid] || 0) + agg._count
  }

  const formatted = accounts.map((a) => ({
    id: a.id,
    name: a.cardName,
    type: a.accountType,
    institution: a.bank.name,
    balance: Number(a.balance),
    totalIn: totalIn[a.id] || 0,
    totalOut: totalOut[a.id] || 0,
    transactionCount: txCount[a.id] || 0,
    color: a.color,
    isActive: a.isActive,
    monthlyChange: 0,
    iban: a.iban,
    currency: a.currency,
    saltEdgeAccountId: a.saltEdgeAccountId,
    connectionId: a.connectionId,
    providerName: a.connection?.providerName || null,
    bankId: a.bankId,
  }))

  return NextResponse.json(formatted)
}

// POST /api/accounts — Not allowed; accounts are created only via Salt Edge import
export async function POST() {
  return NextResponse.json(
    { error: "Manual account creation is disabled. Connect your bank via Salt Edge to add accounts." },
    { status: 405 }
  )
}
