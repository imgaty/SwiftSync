import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { logAdminAction, ADMIN_ACTIONS } from "@/lib/admin-audit"
import { prisma } from "@/lib/prisma"

interface RouteParams {
    params: Promise<{ id: string }>
}

// PATCH /api/admin/announcements/[id] — Update an announcement
export async function PATCH(request: NextRequest, { params }: RouteParams) {
    const { admin, error } = await requireAdmin()
    if (error) return error

    const { id } = await params
    const body = await request.json()
    const { title, message, type, isActive, startsAt, expiresAt } = body as {
        title?: string; message?: string; type?: string
        isActive?: boolean; startsAt?: string; expiresAt?: string | null
    }

    const existing = await prisma.systemAnnouncement.findUnique({ where: { id } })
    if (!existing) {
        return NextResponse.json({ error: "Announcement not found" }, { status: 404 })
    }

    const data: Record<string, unknown> = {}
    if (title !== undefined) data.title = title.trim()
    if (message !== undefined) data.message = message.trim()
    if (type !== undefined) data.type = type
    if (isActive !== undefined) data.isActive = isActive
    if (startsAt !== undefined) data.startsAt = new Date(startsAt)
    if (expiresAt !== undefined) data.expiresAt = expiresAt ? new Date(expiresAt) : null

    const updated = await prisma.systemAnnouncement.update({
        where: { id },
        data,
    })

    await logAdminAction({
        performerId: admin!.id,
        action: ADMIN_ACTIONS.ANNOUNCEMENT_UPDATE,
        entity: "announcement",
        entityId: id,
        details: { changes: Object.keys(data) },
    })

    return NextResponse.json({ announcement: updated })
}

// DELETE /api/admin/announcements/[id] — Delete an announcement
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
    const { admin, error } = await requireAdmin()
    if (error) return error

    const { id } = await params

    const existing = await prisma.systemAnnouncement.findUnique({ where: { id } })
    if (!existing) {
        return NextResponse.json({ error: "Announcement not found" }, { status: 404 })
    }

    await prisma.systemAnnouncement.delete({ where: { id } })

    await logAdminAction({
        performerId: admin!.id,
        action: ADMIN_ACTIONS.ANNOUNCEMENT_DELETE,
        entity: "announcement",
        entityId: id,
        details: { title: existing.title },
    })

    return NextResponse.json({ success: true })
}
