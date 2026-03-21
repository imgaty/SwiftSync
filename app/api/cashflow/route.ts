import { NextResponse } from "next/server"
import { getAuthUserId } from "@/lib/auth-helpers"
import { analyzeCashFlow } from "@/lib/cash-flow"
import { prisma } from "@/lib/prisma"

// GET /api/cashflow — Get cash flow projection
export async function GET(request: Request) {
  const userId = await getAuthUserId()
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const months = parseInt(searchParams.get("months") || "6")
  const accountIdsParam = searchParams.get("accountIds") // comma-separated

  try {
    // Build account filter condition
    const accountFilter = accountIdsParam
      ? { id: { in: accountIdsParam.split(",") } }
      : {}

    // Fetch accounts, transactions, and bills from database
    const [accounts, transactions, bills] = await Promise.all([
      prisma.bankAccount.findMany({
        where: { userId, ...accountFilter },
      }),
      prisma.transaction.findMany({
        where: {
          userId,
          ...(accountIdsParam ? { accountId: { in: accountIdsParam.split(",") } } : {}),
        },
      }),
      prisma.bill.findMany({
        where: {
          userId,
          ...(accountIdsParam ? { accountId: { in: accountIdsParam.split(",") } } : {}),
        },
      }),
    ])

    // Calculate current total balance
    const currentBalance = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0)

    // Run cash flow analysis
    const analysis = analyzeCashFlow(
      currentBalance,
      transactions.map((t) => ({
        date: t.date.toISOString().slice(0, 10),
        type: t.type,
        amount: Number(t.amount),
      })),
      bills.map((b) => ({
        amount: Number(b.amount),
        frequency: b.frequency,
      })),
      months
    )

    return NextResponse.json({
      currentBalance,
      ...analysis,
    })
  } catch (error) {
    console.error("Cash flow analysis error:", error)
    return NextResponse.json({ error: "Failed to analyze cash flow" }, { status: 500 })
  }
}
