/* Bills collection endpoint.
 *
 * GET lists bills in the caller's scope; POST creates one. The target
 * `accountId` on POST is verified to belong to the same scope.
 *
 * Learn more in `docs/Financial Features.md`
 */

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext } from "@/lib/auth-helpers"
import { scopeFilter, scopeCreateData, requirePermission } from "@/lib/data-access"

// GET /api/bills — List all bills
export async function GET() {
  const ctx = await getAuthContext()
  if (!ctx) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
  const permissionError = await requirePermission(ctx, "data:read")
  if (permissionError) return permissionError

  const bills = await prisma.bill.findMany({
    where: scopeFilter(ctx),
    orderBy: { dueDay: "asc" },
  })

  const formatted = bills.map((b) => ({
    id: b.id,
    name: b.name,
    amount: Number(b.amount),
    tags: b.tags,
    dueDay: b.dueDay,
    frequency: b.frequency,
    accountId: b.accountId,
    category: b.category,
    autopay: b.autopay,
    status: b.status,
  }))

  return NextResponse.json(formatted)
}

// POST /api/bills — Create a new bill
export async function POST(request: Request) {
  const ctx = await getAuthContext()
  if (!ctx) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
  const permissionError = await requirePermission(ctx, "data:write")
  if (permissionError) return permissionError

  const body = await request.json()
  const { name, amount, tags, dueDay, frequency, accountId, category, autopay } = body

  if (!name || !amount || !dueDay || !frequency || !accountId || !category) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  // Verify the target account belongs to the caller's scope before binding to it.
  const ownsAccount = await prisma.bankAccount.findFirst({
    where: { ...scopeFilter(ctx), id: accountId },
    select: { id: true },
  })
  if (!ownsAccount) {
    return NextResponse.json({ error: "Account not found" }, { status: 400 })
  }

  const bill = await prisma.bill.create({
    data: {
      ...scopeCreateData(ctx),
      name,
      amount,
      tags: tags || [],
      dueDay,
      frequency,
      accountId,
      category,
      autopay: autopay || false,
    },
  })

  return NextResponse.json({
    id: bill.id,
    name: bill.name,
    amount: Number(bill.amount),
    tags: bill.tags,
    dueDay: bill.dueDay,
    frequency: bill.frequency,
    accountId: bill.accountId,
    category: bill.category,
    autopay: bill.autopay,
    status: bill.status,
  }, { status: 201 })
}
