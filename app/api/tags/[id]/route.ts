/* Single-tag endpoint: PUT (update) and DELETE (archive).
 *
 * DELETE is a soft-delete (sets isArchived=true) so existing transactions
 * with this slug in their tags[] keep displaying it via the picker; we just
 * stop offering it for new selections.
 */

import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getAuthContext } from "@/lib/auth-helpers"
import { requirePermission, scopeRecordFilter } from "@/lib/data-access"

const tagUpdateSchema = z.object({
    name: z.string().trim().min(1).max(50).optional(),
    color: z
        .string()
        .regex(/^#[0-9a-fA-F]{6}$/, "Color must be a hex code like #6366f1")
        .optional(),
    icon: z.string().trim().min(1).max(40).optional(),
    isArchived: z.boolean().optional(),
})

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
    const body = await request.json().catch(() => null)
    const parsed = tagUpdateSchema.safeParse(body)
    if (!parsed.success) {
        return NextResponse.json(
            { error: "Invalid tag payload", details: parsed.error.issues.slice(0, 5) },
            { status: 400 },
        )
    }

    const { name, color, icon, isArchived } = parsed.data

    // Atomic scope-in-write — same pattern as PACERule.
    const result = await prisma.tag.updateMany({
        where: scopeRecordFilter(ctx, id),
        data: {
            ...(name !== undefined && { name }),
            ...(color !== undefined && { color }),
            ...(icon !== undefined && { icon }),
            ...(isArchived !== undefined && { isArchived }),
        },
    })
    if (result.count === 0) {
        return NextResponse.json({ error: "Tag not found" }, { status: 404 })
    }

    const updated = await prisma.tag.findFirst({ where: scopeRecordFilter(ctx, id) })
    return NextResponse.json(updated)
}

// DELETE = archive. Old transactions still reference the slug; archiving just
// hides it from the picker.
export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const ctx = await getAuthContext()
    if (!ctx) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const permissionError = await requirePermission(ctx, "data:write")
    if (permissionError) return permissionError

    const { id } = await params
    const result = await prisma.tag.updateMany({
        where: scopeRecordFilter(ctx, id),
        data: { isArchived: true },
    })
    if (result.count === 0) {
        return NextResponse.json({ error: "Tag not found" }, { status: 404 })
    }
    return NextResponse.json({ success: true })
}
