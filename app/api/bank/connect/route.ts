import { NextRequest, NextResponse } from "next/server"
import { createConnectSession, getOrCreateCustomer, createRefreshSession } from "@/lib/salt-edge"
import { getAuthUserId } from "@/lib/auth-helpers"

/**
 * POST /api/bank/connect — Create a Salt Edge Connect session
 * Body: { returnTo, providerCode? }
 * Returns: { connectUrl, expiresAt }
 */
export async function POST(request: NextRequest) {
  const userId = await getAuthUserId()
  if (!userId) {
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

    // Get or create Salt Edge customer for this user
    const customerId = await getOrCreateCustomer(userId)

    let session

    if (action === "refresh" && connectionId) {
      // Refresh existing connection
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
