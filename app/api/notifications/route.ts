import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUserId } from "@/lib/auth-helpers"

// GET /api/notifications — List notifications for the authenticated user
export async function GET(request: Request) {
  const userId = await getAuthUserId()
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const unreadOnly = searchParams.get("unread") === "true"

  const notifications = await prisma.notification.findMany({
    where: {
      userId,
      ...(unreadOnly && { read: false }),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  return NextResponse.json(notifications)
}

// POST /api/notifications — Create a notification (internal use)
export async function POST(request: Request) {
  const userId = await getAuthUserId()
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const body = await request.json()
  const { title, message, type, actionUrl } = body

  if (!title || !message || !type) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const notification = await prisma.notification.create({
    data: {
      userId,
      title,
      message,
      type,
      actionUrl,
    },
  })

  return NextResponse.json(notification, { status: 201 })
}

// PATCH /api/notifications — Mark all as read
export async function PATCH() {
  const userId = await getAuthUserId()
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  })

  return NextResponse.json({ success: true })
}
