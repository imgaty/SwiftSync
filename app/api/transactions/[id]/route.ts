//
//  route.ts
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Handles the /api/transactions/[id] API endpoint for Argent, keeping request parsing,
//  business operations, and response formatting at the route boundary.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
/* Single-transaction endpoint (PUT to update, DELETE to remove).
 *
 * Both writes use scope-in-write — the caller's scope filter is merged into
 * the where clause of `updateMany` / `deleteMany`, so a row outside the
 * caller's scope is invisible and untouchable in the same statement.
 *
 * Learn more in `docs/Financial Features.md`
 */

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext } from "@/lib/auth-helpers"
import { scopeFilter, scopeRecordFilter, requirePermission } from "@/lib/data-access"

// PUT /api/transactions/[id] — Update a transaction
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
  const { date, type, amount, description, tags, accountId } = body

  // If the caller is reassigning the transaction to a different account, verify
  // that target account is also in their scope — otherwise an attacker could
  // repoint their own transaction at another scoped bank account.
  if (accountId) {
    const ownsAccount = await prisma.bankAccount.findFirst({
      where: { ...scopeFilter(ctx), id: accountId },
      select: { id: true },
    })
    if (!ownsAccount) {
      return NextResponse.json({ error: "Account not found" }, { status: 400 })
    }
  }

  const { count } = await prisma.transaction.updateMany({
    where: scopeRecordFilter(ctx, id),
    data: {
      ...(date && { date: new Date(date) }),
      ...(type && { type }),
      ...(amount !== undefined && { amount }),
      ...(description && { description }),
      ...(tags && { tags }),
      ...(accountId && { accountId }),
    },
  })
  if (count === 0) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
  }

  const updated = await prisma.transaction.findUniqueOrThrow({ where: { id } })

  return NextResponse.json({
    id: updated.id,
    date: updated.date.toISOString().slice(0, 10),
    type: updated.type,
    amount: Number(updated.amount),
    description: updated.description,
    tags: updated.tags,
    accountId: updated.accountId,
  })
}

// DELETE /api/transactions/[id] — Delete a transaction
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
  const { count } = await prisma.transaction.deleteMany({
    where: scopeRecordFilter(ctx, id),
  })
  if (count === 0) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
