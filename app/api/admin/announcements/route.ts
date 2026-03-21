import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { logAdminAction, ADMIN_ACTIONS } from "@/lib/admin-audit"
import { prisma } from "@/lib/prisma"

// GET /api/admin/announcements — List all announcements
export async function GET(request: NextRequest) {
    const { admin, error } = await requireAdmin()
    if (error) return error

    const url = request.nextUrl
    const activeOnly = url.searchParams.get("active") === "true"

    const where: Record<string, unknown> = {}
    if (activeOnly) {
        where.isActive = true
    }

    const announcements = await prisma.systemAnnouncement.findMany({
        where,
        orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ announcements })
}

// POST /api/admin/announcements — Create a new announcement
export async function POST(request: NextRequest) {
    const { admin, error } = await requireAdmin()
    if (error) return error

    const body = await request.json()
    const { title, message, type, startsAt, expiresAt } = body as {
        title: string; message: string; type?: string
        startsAt?: string; expiresAt?: string
    }

    if (!title?.trim() || !message?.trim()) {
        return NextResponse.json({ error: "Title and message are required" }, { status: 400 })
    }

    const announcement = await prisma.systemAnnouncement.create({
        data: {
            title: title.trim(),
            message: message.trim(),
            type: type || "info",
            startsAt: startsAt ? new Date(startsAt) : new Date(),
            expiresAt: expiresAt ? new Date(expiresAt) : null,
            createdBy: admin!.id,
        },
    })

    await logAdminAction({
        performerId: admin!.id,
        action: ADMIN_ACTIONS.ANNOUNCEMENT_CREATE,
        entity: "announcement",
        entityId: announcement.id,
        details: { title: announcement.title, type: announcement.type },
    })

    return NextResponse.json({ announcement }, { status: 201 })
}
