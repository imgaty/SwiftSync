import { NextRequest, NextResponse } from "next/server"
import { getOrCreateCustomer, listConnections } from "@/lib/salt-edge"
import { getAuthUserId } from "@/lib/auth-helpers"

/**
 * GET /api/bank/connections — List all Salt Edge connections for the user
 */
export async function GET(_request: NextRequest) {
  const userId = await getAuthUserId()
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const customerId = await getOrCreateCustomer(userId)
    const connections = await listConnections(customerId)

    return NextResponse.json({
      connections: connections.map((c) => ({
        id: c.id,
        providerCode: c.provider_code,
        providerName: c.provider_name,
        status: c.status,
        countryCode: c.country_code,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      })),
    })
  } catch (error) {
    console.error("Salt Edge connections error:", error)
    const message = error instanceof Error ? error.message : "Failed to fetch connections"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
