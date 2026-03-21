import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUserId } from "@/lib/auth-helpers"

// PATCH /api/notifications/[id] — Mark a single notification as read
export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId()
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { id } = await params
  const existing = await prisma.notification.findFirst({ where: { id, userId } })
  if (!existing) {
    return NextResponse.json({ error: "Notification not found" }, { status: 404 })
  }

  const updated = await prisma.notification.update({
    where: { id },
    data: { read: true },
  })

  return NextResponse.json(updated)
}

// DELETE /api/notifications/[id] — Delete a notification
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId()
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { id } = await params
  const existing = await prisma.notification.findFirst({ where: { id, userId } })
  if (!existing) {
    return NextResponse.json({ error: "Notification not found" }, { status: 404 })
  }

  await prisma.notification.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
