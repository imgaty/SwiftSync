/* Admin-only notification management.
 *
 * GET returns a paginated cross-user listing for moderation; POST broadcasts
 * a notification to one or many users. Both are gated by `requireAdmin()` and
 * every send is recorded in the audit log.
 *
 * Learn more in `docs/Admin System.md`
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { logAdminAction } from "@/lib/admin-audit"
import { parsePositiveInt } from "@/lib/query-utils"

// GET /api/admin/notifications — List all notifications (cross-user)
export async function GET(request: NextRequest) {
    const { error } = await requireAdmin()
    if (error) return error

    const url = request.nextUrl
    const page = parsePositiveInt(url.searchParams.get("page"), 1)
    const limit = Math.min(100, parsePositiveInt(url.searchParams.get("limit"), 25))
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
const MAX_RECIPIENTS = 1000

export async function POST(request: NextRequest) {
    const { admin, error } = await requireAdmin()
    if (error) return error

    const body = await request.json()
    const { userIds, title, message, type = "general", actionUrl } = body

    if (!title || !message || !Array.isArray(userIds) || userIds.length === 0) {
        return NextResponse.json({ error: "title, message, and userIds[] are required" }, { status: 400 })
    }

    if (userIds.length > MAX_RECIPIENTS) {
        return NextResponse.json(
            { error: `Cannot send to more than ${MAX_RECIPIENTS} users in a single request.` },
            { status: 400 },
        )
    }

    // actionUrl, if provided, must be an in-app relative path. Reject anything
    // that could be an external/phishing redirect.
    if (actionUrl !== undefined && actionUrl !== null && actionUrl !== "") {
        if (typeof actionUrl !== "string" || !/^\/[A-Za-z0-9/_\-?&=.%#]*$/.test(actionUrl)) {
            return NextResponse.json(
                { error: "actionUrl must be an in-app relative path starting with /" },
                { status: 400 },
            )
        }
    }

    // Deduplicate and intersect with real users so we don't insert rows for IDs
    // that don't exist (or shouldn't receive notifications anymore).
    const uniqueIds = Array.from(new Set(userIds.filter((id): id is string => typeof id === "string")))
    const validUsers = await prisma.user.findMany({
        where: { id: { in: uniqueIds }, status: "active" },
        select: { id: true },
    })
    const validIds = validUsers.map((u) => u.id)

    if (validIds.length === 0) {
        return NextResponse.json({ error: "No valid recipients found." }, { status: 400 })
    }

    const notifications = await prisma.notification.createMany({
        data: validIds.map((userId) => ({
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
        details: { title, type, recipientCount: validIds.length, requested: uniqueIds.length },
    })

    return NextResponse.json({ sent: notifications.count })
}
