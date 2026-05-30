//
//  route.ts
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Handles the /api/bills/[id] API endpoint for Argent, keeping request parsing, business
//  operations, and response formatting at the route boundary.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
/* Single-bill endpoint (PUT to update, DELETE to remove).
 *
 * Both writes use scope-in-write — the caller's scope filter is merged into
 * `updateMany` / `deleteMany`, so a row outside scope is untouchable.
 *
 * Learn more in `docs/Financial Features.md`
 */

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext } from "@/lib/auth-helpers"
import { scopeFilter, scopeRecordFilter, requirePermission } from "@/lib/data-access"

// PUT /api/bills/[id]
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getAuthContext()
  if (!ctx) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
  const permissionError = await requirePermission(ctx, "data:write")
  if (permissionError) return permissionError

  const { id } = await params
  const body = await request.json()
  const parsedAmount = body.amount !== undefined ? Number(body.amount) : undefined
  const parsedDueDay = body.dueDay !== undefined ? Number(body.dueDay) : undefined

  if (parsedAmount !== undefined && (!Number.isFinite(parsedAmount) || parsedAmount <= 0)) {
    return NextResponse.json({ error: "Amount must be greater than zero" }, { status: 400 })
  }
  if (parsedDueDay !== undefined && (!Number.isInteger(parsedDueDay) || parsedDueDay < 1 || parsedDueDay > 31)) {
    return NextResponse.json({ error: "Due day must be between 1 and 31" }, { status: 400 })
  }
  if (body.frequency && !["weekly", "monthly", "yearly"].includes(body.frequency)) {
    return NextResponse.json({ error: "Invalid frequency" }, { status: 400 })
  }
  if (body.status && !["paid", "pending", "overdue", "upcoming"].includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 })
  }

  // If reassigning to a new account, verify that account is also in the caller's scope.
  if (body.accountId) {
    const ownsAccount = await prisma.bankAccount.findFirst({
      where: { ...scopeFilter(ctx), id: body.accountId },
      select: { id: true },
    })
    if (!ownsAccount) {
      return NextResponse.json({ error: "Account not found" }, { status: 400 })
    }
  }

  const { count } = await prisma.bill.updateMany({
    where: scopeRecordFilter(ctx, id),
    data: {
      ...(body.name && { name: body.name }),
      ...(parsedAmount !== undefined && { amount: parsedAmount }),
      ...(body.tags && { tags: body.tags }),
      ...(parsedDueDay !== undefined && { dueDay: parsedDueDay }),
      ...(body.frequency && { frequency: body.frequency }),
      ...(body.accountId && { accountId: body.accountId }),
      ...(body.category && { category: body.category }),
      ...(body.autopay !== undefined && { autopay: body.autopay }),
      ...(body.status && { status: body.status }),
    },
  })
  if (count === 0) {
    return NextResponse.json({ error: "Bill not found" }, { status: 404 })
  }

  const updated = await prisma.bill.findUniqueOrThrow({
    where: { id },
    include: { account: { select: { cardName: true } } },
  })

  return NextResponse.json(formatBill(updated))
}

// DELETE /api/bills/[id]
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getAuthContext()
  if (!ctx) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
  const permissionError = await requirePermission(ctx, "data:delete")
  if (permissionError) return permissionError

  const { id } = await params
  const { count } = await prisma.bill.deleteMany({ where: scopeRecordFilter(ctx, id) })
  if (count === 0) {
    return NextResponse.json({ error: "Bill not found" }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function buildDueDate(year: number, month: number, dueDay: number) {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  return new Date(year, month, Math.min(Math.max(dueDay, 1), daysInMonth))
}

function getCurrentCycleDueDate(bill: { dueDay: number; frequency: string }, now = new Date()) {
  if (bill.frequency === "yearly") return buildDueDate(now.getFullYear(), 0, bill.dueDay)
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
  if (isPaidForCurrentCycle(bill, dueDate)) return { dueDate, status: "paid" }

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
