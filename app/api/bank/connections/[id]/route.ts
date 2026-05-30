//
//  route.ts
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Handles the /api/bank/connections/[id] API endpoint for Argent, keeping request parsing,
//  business operations, and response formatting at the route boundary.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
import { NextRequest, NextResponse } from "next/server"
import { getConnection, removeConnection } from "@/lib/salt-edge"
import { getAuthContext } from "@/lib/auth-helpers"
import { requirePermission, scopeFilter } from "@/lib/data-access"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/bank/connections/[id] — Get a single Salt Edge connection
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getAuthContext()
  if (!ctx) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
  const permissionError = await requirePermission(ctx, "data:read")
  if (permissionError) return permissionError

  const { id: connectionId } = await params

  try {
    // Ownership check against the local DB (cheap, avoids round-tripping Salt Edge).
    const owned = await prisma.saltEdgeConnection.findFirst({
      where: { ...scopeFilter(ctx), connectionId },
      select: { id: true },
    })
    if (!owned) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 })
    }

    const connection = await getConnection(connectionId)

    return NextResponse.json({
      connection: {
        id: connection.id,
        providerCode: connection.provider_code,
        providerName: connection.provider_name,
        status: connection.status,
        countryCode: connection.country_code,
        createdAt: connection.created_at,
        updatedAt: connection.updated_at,
      },
    })
  } catch (error) {
    console.error("Salt Edge get connection error:", error)
    const message = error instanceof Error ? error.message : "Failed to fetch connection"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * DELETE /api/bank/connections/[id] — Disconnect a bank connection via Salt Edge
 * This removes the connection from Salt Edge. Local accounts remain for the user to manage.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getAuthContext()
  if (!ctx) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
  const permissionError = await requirePermission(ctx, "bank:connect")
  if (permissionError) return permissionError

  const { id: connectionId } = await params

  try {
    const owned = await prisma.saltEdgeConnection.findFirst({
      where: { ...scopeFilter(ctx), connectionId },
      select: { id: true },
    })
    if (!owned) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 })
    }

    const result = await removeConnection(connectionId)

    await prisma.$transaction([
      prisma.bankAccount.updateMany({
        where: { ...scopeFilter(ctx), connectionId: owned.id },
        data: { connectionId: null },
      }),
      prisma.saltEdgeConnection.deleteMany({
        where: { ...scopeFilter(ctx), id: owned.id },
      }),
    ])

    return NextResponse.json({
      success: true,
      connectionId: result.id,
      removed: result.removed,
      removedLocal: true,
    })
  } catch (error) {
    console.error("Salt Edge disconnect error:", error)
    const message = error instanceof Error ? error.message : "Failed to disconnect"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
