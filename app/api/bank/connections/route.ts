//
//  route.ts
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Handles the /api/bank/connections API endpoint for Argent, keeping request parsing,
//  business operations, and response formatting at the route boundary.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
import { NextResponse } from "next/server"
import { getAuthContext } from "@/lib/auth-helpers"
import { requirePermission, scopeFilter } from "@/lib/data-access"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/bank/connections — List all bank connections for the user.
 * Serves local records only; live Salt Edge syncing belongs to the explicit
 * connect/callback and refresh flows so a page load cannot start seconds of
 * network/API/import work in the background.
 */
export async function GET() {
  const ctx = await getAuthContext()
  if (!ctx) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
  const permissionError = await requirePermission(ctx, "data:read")
  if (permissionError) return permissionError

  // Serve scoped local records only so another user's Salt Edge connections
  // cannot leak into this account.
  const dbConnections = await prisma.saltEdgeConnection.findMany({
    where: scopeFilter(ctx),
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({
    connections: dbConnections.map((c) => ({
      id: c.connectionId,
      providerCode: c.providerCode,
      providerName: c.providerName,
      status: c.status,
      countryCode: c.countryCode,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    })),
  })
}
