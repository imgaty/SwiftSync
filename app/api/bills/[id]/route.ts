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
      ...(body.amount !== undefined && { amount: body.amount }),
      ...(body.tags && { tags: body.tags }),
      ...(body.dueDay !== undefined && { dueDay: body.dueDay }),
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

  const updated = await prisma.bill.findUniqueOrThrow({ where: { id } })

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    amount: Number(updated.amount),
    tags: updated.tags,
    dueDay: updated.dueDay,
    frequency: updated.frequency,
    accountId: updated.accountId,
    category: updated.category,
    autopay: updated.autopay,
    status: updated.status,
  })
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
