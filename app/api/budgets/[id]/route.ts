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

  const { count } = await prisma.budget.updateMany({
    where: scopeRecordFilter(ctx, id),
    data: {
      ...(body.tag && { tag: body.tag }),
      ...(body.category && { category: body.category }),
      ...(body.limit !== undefined && { limit: body.limit }),
      ...(body.color && { color: body.color }),
    },
  })
  if (count === 0) {
    return NextResponse.json({ error: "Budget not found" }, { status: 404 })
  }

  const updated = await prisma.budget.findUniqueOrThrow({ where: { id } })

  return NextResponse.json({
    id: updated.id,
    tag: updated.tag,
    category: updated.category,
    limit: Number(updated.limit),
    budgetAmount: Number(updated.limit),
    color: updated.color,
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
