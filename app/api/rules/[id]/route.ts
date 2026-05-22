import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext } from "@/lib/auth-helpers"
import { requirePermission, scopeRecordFilter } from "@/lib/data-access"
import { ruleUpdateSchema } from "@/lib/PACE"

// PUT /api/rules/[id]
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
    const parsed = ruleUpdateSchema.safeParse(body)
    if (!parsed.success) {
        return NextResponse.json(
            { error: "Invalid rule payload", details: parsed.error.issues.slice(0, 5) },
            { status: 400 },
        )
    }

    const { name, enabled, filters, addTagSlugs, priority } = parsed.data

    // Atomic scope-in-write: only update if the record matches the caller's scope.
    const result = await prisma.rule.updateMany({
        where: scopeRecordFilter(ctx, id),
        data: {
            ...(name !== undefined && { name }),
            ...(enabled !== undefined && { enabled }),
            ...(filters !== undefined && { filters: filters as object[] }),
            ...(addTagSlugs !== undefined && { addTagSlugs }),
            ...(priority !== undefined && { priority }),
        },
    })

    if (result.count === 0) {
        return NextResponse.json({ error: "Rule not found" }, { status: 404 })
    }

    const updated = await prisma.rule.findFirst({ where: scopeRecordFilter(ctx, id) })
    return NextResponse.json(updated)
}

// DELETE /api/rules/[id]
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
    const result = await prisma.rule.deleteMany({
        where: scopeRecordFilter(ctx, id),
    })

    if (result.count === 0) {
        return NextResponse.json({ error: "Rule not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
}
