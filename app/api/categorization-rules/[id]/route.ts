import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUserId } from "@/lib/auth-helpers"

// PUT /api/categorization-rules/[id]
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId()
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()

  const existing = await prisma.categorizationRule.findFirst({ where: { id, userId } })
  if (!existing) {
    return NextResponse.json({ error: "Rule not found" }, { status: 404 })
  }

  const updated = await prisma.categorizationRule.update({
    where: { id },
    data: {
      ...(body.pattern && { pattern: body.pattern }),
      ...(body.matchField && { matchField: body.matchField }),
      ...(body.tag && { tag: body.tag }),

    },
  })

  return NextResponse.json(updated)
}

// DELETE /api/categorization-rules/[id]
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId()
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { id } = await params
  const existing = await prisma.categorizationRule.findFirst({ where: { id, userId } })
  if (!existing) {
    return NextResponse.json({ error: "Rule not found" }, { status: 404 })
  }

  await prisma.categorizationRule.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
