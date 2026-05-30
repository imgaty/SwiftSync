//
//  route.ts
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Handles the /api/bills API endpoint for Argent, keeping request parsing, business
//  operations, and response formatting at the route boundary.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
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
    include: { account: { select: { cardName: true } } },
    orderBy: { dueDay: "asc" },
  })

  const formatted = bills.map((b) => formatBill(b))

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
  const parsedAmount = Number(amount)
  const parsedDueDay = Number(dueDay)

  if (
    !name ||
    !Number.isFinite(parsedAmount) ||
    parsedAmount <= 0 ||
    !Number.isInteger(parsedDueDay) ||
    parsedDueDay < 1 ||
    parsedDueDay > 31 ||
    !["weekly", "monthly", "yearly"].includes(frequency) ||
    !accountId ||
    !category
  ) {
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
      amount: parsedAmount,
      tags: tags || [],
      dueDay: parsedDueDay,
      frequency,
      accountId,
      category,
      autopay: autopay || false,
    },
  })

  const created = await prisma.bill.findUniqueOrThrow({
    where: { id: bill.id },
    include: { account: { select: { cardName: true } } },
  })

  return NextResponse.json(formatBill(created), { status: 201 })
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function buildDueDate(year: number, month: number, dueDay: number) {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  return new Date(year, month, Math.min(Math.max(dueDay, 1), daysInMonth))
}

function getCurrentCycleDueDate(bill: { dueDay: number; frequency: string }, now = new Date()) {
  if (bill.frequency === "yearly") {
    return buildDueDate(now.getFullYear(), 0, bill.dueDay)
  }
  return buildDueDate(now.getFullYear(), now.getMonth(), bill.dueDay)
}

function isPaidForCurrentCycle(bill: { status: string; frequency: string; updatedAt: Date }, dueDate: Date) {
  if (bill.status !== "paid") return false
  if (bill.frequency === "yearly") return bill.updatedAt.getFullYear() === dueDate.getFullYear()
  return bill.updatedAt.getFullYear() === dueDate.getFullYear() && bill.updatedAt.getMonth() === dueDate.getMonth()
}

function computeBillStatus(bill: { status: string; frequency: string; dueDay: number; updatedAt: Date }) {
  const today = startOfDay(new Date())
  const dueDate = getCurrentCycleDueDate(bill, today)
  const paid = isPaidForCurrentCycle(bill, dueDate)

  if (paid) return { dueDate, status: "paid" }

  const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return { dueDate, status: "overdue" }
  if (diffDays <= 7) return { dueDate, status: "pending" }
  return { dueDate, status: "upcoming" }
}

function formatBill(bill: {
  id: string
  name: string
  amount: unknown
  tags: string[]
  dueDay: number
  frequency: string
  accountId: string
  category: string
  autopay: boolean
  status: string
  updatedAt: Date
  account?: { cardName: string } | null
}) {
  const { dueDate, status } = computeBillStatus(bill)
  return {
    id: bill.id,
    name: bill.name,
    amount: Number(bill.amount),
    tags: bill.tags,
    dueDay: bill.dueDay,
    frequency: bill.frequency,
    accountId: bill.accountId,
    category: bill.category,
    autopay: bill.autopay,
    status,
    dueDate: dueDate.toISOString().slice(0, 10),
    account: bill.account?.cardName || "",
  }
}
