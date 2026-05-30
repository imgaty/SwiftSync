//
//  route.ts
//  Argent
//
//  Created by hilario on 22 May 2026 at 09:36.
//  Description: Handles the /api/PACE-rules/[id] API endpoint for Argent, keeping request parsing,
//  business operations, and response formatting at the route boundary.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext } from "@/lib/auth-helpers"
import { requirePermission, scopeRecordFilter } from "@/lib/data-access"
import { paceRuleUpdateSchema } from "@/lib/PACE"

// PUT /api/PACE-rules/[id]
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getAuthContext()
  if (!ctx) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const permissionError = await requirePermission(ctx, "pace:manage")
  if (permissionError) return permissionError

  const { id } = await params
  const body = await request.json().catch(() => null)
  const parsed = paceRuleUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid PACE rule payload", details: parsed.error.issues.slice(0, 5) },
      { status: 400 },
    )
  }

  const { pattern, matchField, tag, priority } = parsed.data

  // Atomic scope-in-write: only update if the record matches the caller's scope.
  const result = await prisma.pACERule.updateMany({
    where: scopeRecordFilter(ctx, id),
    data: {
      ...(pattern !== undefined && { pattern }),
      ...(matchField !== undefined && { matchField }),
      ...(tag !== undefined && { tag }),
      ...(priority !== undefined && { priority }),
    },
  })

  if (result.count === 0) {
    return NextResponse.json({ error: "Rule not found" }, { status: 404 })
  }

  const updated = await prisma.pACERule.findFirst({ where: scopeRecordFilter(ctx, id) })
  return NextResponse.json(updated)
}

// DELETE /api/PACE-rules/[id]
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getAuthContext()
  if (!ctx) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const permissionError = await requirePermission(ctx, "pace:manage")
  if (permissionError) return permissionError

  const { id } = await params
  const result = await prisma.pACERule.deleteMany({
    where: scopeRecordFilter(ctx, id),
  })

  if (result.count === 0) {
    return NextResponse.json({ error: "Rule not found" }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
