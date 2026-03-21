import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { cookies } from "next/headers"

/**
 * GET /api/auth/oauth/[provider] — Redirect to OAuth provider
 * In a production environment, these would redirect to the actual OAuth URLs.
 * For now, this implements a simulated OAuth flow structure.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params
  const validProviders = ["google", "apple", "github", "microsoft"]

  if (!validProviders.includes(provider)) {
    return NextResponse.json({ error: "Invalid OAuth provider" }, { status: 400 })
  }

  // OAuth configuration (requires environment variables)
  const config: Record<string, { authUrl: string; clientIdEnv: string }> = {
    google: {
      authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      clientIdEnv: "GOOGLE_CLIENT_ID",
    },
    apple: {
      authUrl: "https://appleid.apple.com/auth/authorize",
      clientIdEnv: "APPLE_CLIENT_ID",
    },
    github: {
      authUrl: "https://github.com/login/oauth/authorize",
      clientIdEnv: "GITHUB_CLIENT_ID",
    },
    microsoft: {
      authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
      clientIdEnv: "MICROSOFT_CLIENT_ID",
    },
  }

  const providerConfig = config[provider]
  const clientId = process.env[providerConfig.clientIdEnv]

  if (!clientId) {
    return NextResponse.json(
      { error: `OAuth ${provider} not configured. Set ${providerConfig.clientIdEnv} environment variable.` },
      { status: 501 }
    )
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/oauth/${provider}/callback`
  const state = crypto.randomUUID() // CSRF protection

  // Store state in cookie for verification
  const cookieStore = await cookies()
  cookieStore.set(`oauth_state_${provider}`, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
  })

  let authUrl: string
  switch (provider) {
    case "google":
      authUrl = `${providerConfig.authUrl}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid%20email%20profile&state=${state}`
      break
    case "github":
      authUrl = `${providerConfig.authUrl}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email&state=${state}`
      break
    case "microsoft":
      authUrl = `${providerConfig.authUrl}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid%20email%20profile&state=${state}`
      break
    case "apple":
      authUrl = `${providerConfig.authUrl}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=name%20email&state=${state}&response_mode=form_post`
      break
    default:
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 })
  }

  return NextResponse.redirect(authUrl)
}
