import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { logAdminAction, ADMIN_ACTIONS } from "@/lib/admin-audit"

// GET /api/admin/notifications — List all notifications (cross-user)
export async function GET(request: NextRequest) {
    const { error } = await requireAdmin()
    if (error) return error

    const url = request.nextUrl
    const page = parseInt(url.searchParams.get("page") || "1")
    const limit = parseInt(url.searchParams.get("limit") || "25")
    const search = url.searchParams.get("search") || ""
    const type = url.searchParams.get("type") || ""
    const read = url.searchParams.get("read") || ""

    const where: Record<string, unknown> = {}

    if (search) {
        where.OR = [
            { title: { contains: search, mode: "insensitive" } },
            { message: { contains: search, mode: "insensitive" } },
            { user: { name: { contains: search, mode: "insensitive" } } },
            { user: { email: { contains: search, mode: "insensitive" } } },
        ]
    }
    if (type) where.type = type
    if (read === "true") where.read = true
    if (read === "false") where.read = false

    const [notifications, total] = await Promise.all([
        prisma.notification.findMany({
            where,
            include: { user: { select: { id: true, name: true, email: true } } },
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.notification.count({ where }),
    ])

    return NextResponse.json({
        notifications,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
}

// POST /api/admin/notifications — Send a notification to user(s)
export async function POST(request: NextRequest) {
    const { admin, error } = await requireAdmin()
    if (error) return error

    const body = await request.json()
    const { userIds, title, message, type = "general", actionUrl } = body

    if (!title || !message || !userIds?.length) {
        return NextResponse.json({ error: "title, message, and userIds[] are required" }, { status: 400 })
    }

    const notifications = await prisma.notification.createMany({
        data: userIds.map((userId: string) => ({
            userId,
            title,
            message,
            type,
            actionUrl: actionUrl || null,
        })),
    })

    await logAdminAction({
        performerId: admin!.id,
        action: "send_notification",
        entity: "notification",
        details: { title, type, recipientCount: userIds.length },
    })

    return NextResponse.json({ sent: notifications.count })
}
