//
//  route.ts
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Handles the /api/cashflow API endpoint for Argent, keeping request parsing, business
//  operations, and response formatting at the route boundary.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
import { NextResponse } from "next/server"
import { getAuthContext } from "@/lib/auth-helpers"
import { requirePermission, scopeFilter } from "@/lib/data-access"
import { analyzeCashFlow } from "@/lib/cash-flow"
import { prisma } from "@/lib/prisma"
import { parseIntInRange } from "@/lib/query-utils"

// GET /api/cashflow — Get cash flow projection
export async function GET(request: Request) {
  const ctx = await getAuthContext()
  if (!ctx) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
  const permissionError = await requirePermission(ctx, "data:read")
  if (permissionError) return permissionError

  const { searchParams } = new URL(request.url)
  const months = parseIntInRange(searchParams.get("months"), 6, 1, 60)
  const accountIdsParam = searchParams.get("accountIds") // comma-separated

  try {
    // Build account filter condition
    const accountFilter = accountIdsParam
      ? { id: { in: accountIdsParam.split(",") } }
      : {}

    const baseFilter = scopeFilter(ctx)

    // Fetch accounts, transactions, and bills from database
    const [accounts, transactions, bills] = await Promise.all([
      prisma.bankAccount.findMany({
        where: { ...baseFilter, ...accountFilter },
      }),
      prisma.transaction.findMany({
        where: {
          ...baseFilter,
          ...(accountIdsParam ? { accountId: { in: accountIdsParam.split(",") } } : {}),
        },
      }),
      prisma.bill.findMany({
        where: {
          ...baseFilter,
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
