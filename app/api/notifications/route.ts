//
//  route.ts
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Handles the /api/notifications API endpoint for Argent, keeping request parsing,
//  business operations, and response formatting at the route boundary.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
/* User-facing notifications endpoint.
 *
 * GET lists the caller's notifications; PATCH marks all of them read.
 * POST persists a UI event (toast) so it also shows up in the dropdown
 * — accepts only the "general" / "user_action" types so server-generated
 * categories (bill_due, budget_exceeded, goal_reached) stay reserved for
 * actual system events.
 *
 * Learn more in `docs/Financial Features.md`
 */

import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getAuthContext, type AuthContext } from "@/lib/auth-helpers"
import { scopeFilter, scopeCreateData } from "@/lib/data-access"

function notificationScope(ctx: AuthContext) {
  return { ...scopeFilter(ctx), userId: ctx.userId }
}

// GET /api/notifications — List notifications for the authenticated user
export async function GET(request: Request) {
  const ctx = await getAuthContext()
  if (!ctx) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const unreadOnly = searchParams.get("unread") === "true"
  const pageParam = searchParams.get("page")
  const limitParam = searchParams.get("limit")
  const search = searchParams.get("search")?.trim() || ""
  const type = searchParams.get("type") || "all"
  const readParam = searchParams.get("read")

  const where = {
    ...notificationScope(ctx),
    ...(unreadOnly && { read: false }),
    ...(type !== "all" && { type }),
    ...(readParam === "true" ? { read: true } : {}),
    ...(readParam === "false" ? { read: false } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" as const } },
            { message: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  }

  const wantsPagination = pageParam !== null || limitParam !== null

  if (wantsPagination) {
    const page = Math.max(Number(pageParam || "1") || 1, 1)
    const limit = Math.min(Math.max(Number(limitParam || "25") || 25, 1), 100)

    const [total, notifications] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])

    return NextResponse.json({
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    })
  }

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  return NextResponse.json(notifications)
}

// User-allowed notification types. Reserves system categories so that the
// dropdown's coloring (typeColors map in notification-button.tsx) keeps a
// reliable signal: orange = bill_due, red = budget_exceeded, etc.
const USER_NOTIFICATION_TYPES = [
  "general",          // info / neutral
  "user_action",      // success acknowledgements
  "user_warning",     // warning toasts the user might revisit
  "user_error",       // errors worth reviewing
] as const

const notificationCreateSchema = z.object({
  title: z.string().trim().min(1).max(120),
  message: z.string().trim().min(1).max(500),
  type: z.enum(USER_NOTIFICATION_TYPES).default("general"),
  actionUrl: z
    .string()
    .trim()
    .max(500)
    .regex(/^\/[A-Za-z0-9/_\-?&=.%#]*$/, "actionUrl must be an in-app relative path")
    .optional(),
})

// POST /api/notifications — Persist a UI event so it shows up in the dropdown.
// Returns the created row. Frontend `notify()` helper calls this fire-and-forget.
export async function POST(request: Request) {
  const ctx = await getAuthContext()
  if (!ctx) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = notificationCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid notification payload", details: parsed.error.issues.slice(0, 5) },
      { status: 400 },
    )
  }

  const created = await prisma.notification.create({
    data: {
      ...scopeCreateData(ctx),
      title: parsed.data.title,
      message: parsed.data.message,
      type: parsed.data.type,
      ...(parsed.data.actionUrl && { actionUrl: parsed.data.actionUrl }),
    },
  })

  return NextResponse.json(created, { status: 201 })
}

// PATCH /api/notifications — Mark all as read
export async function PATCH() {
  const ctx = await getAuthContext()
  if (!ctx) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  await prisma.notification.updateMany({
    where: { ...notificationScope(ctx), read: false },
    data: { read: true },
  })

  return NextResponse.json({ success: true })
}
