import { NextRequest, NextResponse } from "next/server"
import { listProviders } from "@/lib/salt-edge"
import { getAuthUserId } from "@/lib/auth-helpers"

/**
 * GET /api/bank/providers — List available bank providers
 * Query params: country_code, include_sandboxes
 */
export async function GET(request: NextRequest) {
  const userId = await getAuthUserId()
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const countryCode = searchParams.get("country_code") || undefined
  const includeSandboxes = searchParams.get("include_sandboxes") !== "false" // default true

  try {
    const providers = await listProviders({
      countryCode,
      includeSandboxes,
      includeAisFields: true,
    })

    return NextResponse.json({
      providers: providers.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        mode: p.mode,
        status: p.status,
        countryCode: p.country_code,
        logoUrl: p.logo_url,
        homeUrl: p.home_url,
        instruction: p.instruction,
        maxConsentDays: p.max_consent_days,
      })),
    })
  } catch (error) {
    console.error("Salt Edge providers error:", error)
    const message = error instanceof Error ? error.message : "Failed to fetch providers"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
