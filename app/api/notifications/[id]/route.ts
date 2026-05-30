//
//  route.ts
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Handles the /api/notifications/[id] API endpoint for Argent, keeping request parsing,
//  business operations, and response formatting at the route boundary.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext } from "@/lib/auth-helpers"
import { scopeRecordFilter } from "@/lib/data-access"

// PATCH /api/notifications/[id] — Mark a single notification as read
export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getAuthContext()
  if (!ctx) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { id } = await params
  const { count } = await prisma.notification.updateMany({
    where: { ...scopeRecordFilter(ctx, id), userId: ctx.userId },
    data: { read: true },
  })
  if (count === 0) {
    return NextResponse.json({ error: "Notification not found" }, { status: 404 })
  }

  const updated = await prisma.notification.findUniqueOrThrow({ where: { id } })

  return NextResponse.json(updated)
}

// DELETE /api/notifications/[id] — Delete a notification
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getAuthContext()
  if (!ctx) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { id } = await params
  const { count } = await prisma.notification.deleteMany({
    where: { ...scopeRecordFilter(ctx, id), userId: ctx.userId },
  })
  if (count === 0) {
    return NextResponse.json({ error: "Notification not found" }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
