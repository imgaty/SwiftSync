//
//  route.ts
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Handles the /api/budgets/[id] API endpoint for Argent, keeping request parsing, business
//  operations, and response formatting at the route boundary.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext } from "@/lib/auth-helpers"
import { scopeRecordFilter, requirePermission } from "@/lib/data-access"

// PUT /api/budgets/[id]
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
  const parsedLimit = body.limit !== undefined ? Number(body.limit) : undefined

  if (parsedLimit !== undefined && (!Number.isFinite(parsedLimit) || parsedLimit <= 0)) {
    return NextResponse.json({ error: "Limit must be greater than zero" }, { status: 400 })
  }

  const { count } = await prisma.budget.updateMany({
    where: scopeRecordFilter(ctx, id),
    data: {
      ...(body.tag && { tag: body.tag }),
      ...(body.category && { category: body.category }),
      ...(parsedLimit !== undefined && { limit: parsedLimit }),
      ...(body.color && { color: body.color }),
    },
  })
  if (count === 0) {
    return NextResponse.json({ error: "Budget not found" }, { status: 404 })
  }

  const updated = await prisma.budget.findUniqueOrThrow({ where: { id } })
  const now = new Date()
  const monthLabel = now.toLocaleString("en-US", { month: "long" })

  return NextResponse.json({
    id: updated.id,
    tag: updated.tag,
    category: updated.category,
    limit: Number(updated.limit),
    budgetAmount: Number(updated.limit),
    spentAmount: 0,
    remainingAmount: Number(updated.limit),
    percentUsed: 0,
    status: "on_track",
    color: updated.color,
    month: monthLabel,
    year: now.getFullYear(),
  })
}

// DELETE /api/budgets/[id]
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
  const { count } = await prisma.budget.deleteMany({ where: scopeRecordFilter(ctx, id) })
  if (count === 0) {
    return NextResponse.json({ error: "Budget not found" }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
