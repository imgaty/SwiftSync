/* Salt Edge connect-flow entrypoint.
 *
 * Mints a server-side one-shot URL that the user is redirected to in order to
 * link a new bank (`action: "connect"`) or refresh an existing connection
 * (`action: "refresh"`). Salt Edge credentials never reach the browser.
 *
 * Learn more in `docs/Bank Synchronization.md`
 */

import { NextRequest, NextResponse } from "next/server"
import { createConnectSession, getOrCreateCustomerForScope, createRefreshSession } from "@/lib/salt-edge"
import { getAuthContext } from "@/lib/auth-helpers"
import { scopeFilter } from "@/lib/data-access"
import { prisma } from "@/lib/prisma"

/**
 * POST /api/bank/connect — Create a Salt Edge Connect session.
 * Body: { returnTo, providerCode?, action?, connectionId? }
 * Returns: { connectUrl, expiresAt, customerId }
 */
function isAllowedReturnTo(returnTo: string, request: NextRequest): boolean {
  try {
    const url = new URL(returnTo)
    const allowedOrigins = new Set([request.nextUrl.origin])
    const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL
    if (configuredAppUrl) {
      allowedOrigins.add(new URL(configuredAppUrl).origin)
    }
    return allowedOrigins.has(url.origin)
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  const ctx = await getAuthContext()
  if (!ctx) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const {
      returnTo,
      providerCode,
      connectionId,
      action = "connect",
    } = body as {
      returnTo: string
      providerCode?: string
      connectionId?: string
      action?: "connect" | "refresh"
    }

    if (!returnTo) {
      return NextResponse.json({ error: "returnTo URL is required" }, { status: 400 })
    }
    if (!isAllowedReturnTo(returnTo, request)) {
      return NextResponse.json({ error: "returnTo must use this application's origin" }, { status: 400 })
    }

    // Get or create Salt Edge customer for this user
    const customerId = await getOrCreateCustomerForScope(ctx)

    let session

    if (action === "refresh" && connectionId) {
      // Refresh existing connection — verify the caller owns it before minting a session URL.
      const owned = await prisma.saltEdgeConnection.findFirst({
        where: { ...scopeFilter(ctx), connectionId },
        select: { id: true },
      })
      if (!owned) {
        return NextResponse.json({ error: "Connection not found" }, { status: 404 })
      }

      session = await createRefreshSession({
        connectionId,
        returnTo,
      })
    } else {
      // Create new connection
      session = await createConnectSession({
        customerId,
        returnTo,
        providerCode,
        includeFakeProviders: true,
        dailyRefresh: false,
      })
    }

    return NextResponse.json({
      connectUrl: session.connect_url,
      expiresAt: session.expires_at,
      customerId,
    })
  } catch (error) {
    console.error("Salt Edge connect error:", error)
    const message = error instanceof Error ? error.message : "Failed to create connect session"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
