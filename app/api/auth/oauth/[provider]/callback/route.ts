//
//  route.ts
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Handles the /api/auth/oauth/[provider]/callback API endpoint for Argent, keeping request
//  parsing, business operations, and response formatting at the route boundary.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { cookies } from "next/headers"
import { hashPassword } from "@/lib/password"
import { createSessionToken } from "@/lib/session"
import { generateDefaultAvatarDataUrl } from "@/lib/avatar"
import { clientIp } from "@/lib/rate-limit"
import { timingSafeEqual } from "crypto"

const SESSION_MAX_AGE = 7 * 24 * 60 * 60
const VALID_PROVIDERS = ["google", "github", "microsoft"] as const

interface OAuthTokenData {
  access_token: string
  id_token?: string
}

interface OAuthUserInfo {
  id: string
  email: string
  name: string
  emailVerified: boolean
}

function safeEqual(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  if (aBuf.length !== bBuf.length) return false
  return timingSafeEqual(aBuf, bBuf)
}

/**
 * GET /api/auth/oauth/[provider]/callback — Handle OAuth callback
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params
  if (!VALID_PROVIDERS.includes(provider as (typeof VALID_PROVIDERS)[number])) {
    return NextResponse.redirect(new URL("/login?error=invalid_provider", request.url))
  }

  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const state = searchParams.get("state")

  const cookieStore = await cookies()
  const storedState = cookieStore.get(`oauth_state_${provider}`)?.value

  if (!state || !safeEqual(state, storedState)) {
    return NextResponse.redirect(new URL("/login?error=invalid_state", request.url))
  }

  cookieStore.delete(`oauth_state_${provider}`)

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=no_code", request.url))
  }

  try {
    const tokenData = await exchangeCodeForToken(provider, code, request.url)
    if (!tokenData) {
      return NextResponse.redirect(new URL("/login?error=token_exchange_failed", request.url))
    }

    const userInfo = await getUserInfo(provider, tokenData)
    if (!userInfo?.email) {
      return NextResponse.redirect(new URL("/login?error=no_email", request.url))
    }
    if (!userInfo.emailVerified) {
      return NextResponse.redirect(new URL("/login?error=email_not_verified", request.url))
    }

    const normalizedEmail = userInfo.email.trim().toLowerCase()

    const oauthAccount = await prisma.oAuthAccount.findUnique({
      where: {
        provider_providerAccountId: {
          provider,
          providerAccountId: userInfo.id,
        },
      },
      include: { user: true },
    })

    let userId: string

    if (oauthAccount) {
      userId = oauthAccount.userId
    } else {
      const existingUser = await prisma.user.findFirst({
        where: { email: { equals: normalizedEmail, mode: "insensitive" } },
        select: { id: true, emailVerified: true },
      })

      if (existingUser) {
        if (!existingUser.emailVerified) {
          return NextResponse.redirect(new URL("/login?error=oauth_link_requires_verified_email", request.url))
        }
        userId = existingUser.id
      } else {
        const randomPassword = hashPassword(crypto.randomUUID())
        const resolvedName = userInfo.name || normalizedEmail.split("@")[0]

        const newUser = await prisma.user.create({
          data: {
            email: normalizedEmail,
            name: resolvedName,
            avatar: generateDefaultAvatarDataUrl(resolvedName),
            password: randomPassword,
            dateOfBirth: "",
            emailVerified: true,
          },
        })
        userId = newUser.id
      }

      await prisma.oAuthAccount.create({
        data: {
          userId,
          provider,
          providerAccountId: userInfo.id,
        },
      })
    }

    const sessionUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { status: true, sessionVersion: true },
    })
    // Refuse sign-in for suspended/banned/deleted accounts
    if (!sessionUser || sessionUser.status !== "active") {
      return NextResponse.redirect(new URL("/login?error=account_inactive", request.url))
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: clientIp(request),
      },
    })

    const sessionToken = await createSessionToken(userId, SESSION_MAX_AGE, sessionUser.sessionVersion)
    const cookieOpts = {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: SESSION_MAX_AGE,
    }
    cookieStore.set("auth-token", sessionToken, { httpOnly: true, ...cookieOpts })
    cookieStore.delete("user-session")

    return NextResponse.redirect(new URL("/", request.url))
  } catch (error) {
    console.error(`OAuth ${provider} callback error:`, error)
    return NextResponse.redirect(new URL("/login?error=oauth_failed", request.url))
  }
}

async function exchangeCodeForToken(provider: string, code: string, _requestUrl: string): Promise<OAuthTokenData | null> {
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/oauth/${provider}/callback`

  const configs: Record<string, { tokenUrl: string; clientId: string; clientSecret: string }> = {
    google: {
      tokenUrl: "https://oauth2.googleapis.com/token",
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    },
    github: {
      tokenUrl: "https://github.com/login/oauth/access_token",
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    },
    microsoft: {
      tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      clientId: process.env.MICROSOFT_CLIENT_ID || "",
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET || "",
    },
  }

  const config = configs[provider]
  if (!config || !config.clientId || !config.clientSecret) return null

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  })

  if (!response.ok) return null
  const data = (await response.json()) as Partial<OAuthTokenData>
  if (!data.access_token) return null
  return { access_token: data.access_token, id_token: data.id_token }
}

function decodeJwtPayload(token: string | undefined): Record<string, unknown> | null {
  if (!token) return null
  const [, payload] = token.split(".")
  if (!payload) return null
  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/")
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4)
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as Record<string, unknown>
  } catch {
    return null
  }
}

function validMicrosoftClaims(claims: Record<string, unknown> | null): boolean {
  if (!claims) return false
  const expectedClientId = process.env.MICROSOFT_CLIENT_ID
  const exp = typeof claims.exp === "number" ? claims.exp : 0
  const aud = typeof claims.aud === "string" ? claims.aud : ""
  const iss = typeof claims.iss === "string" ? claims.iss : ""
  return (
    !!expectedClientId &&
    aud === expectedClientId &&
    exp > Math.floor(Date.now() / 1000) &&
    iss.startsWith("https://login.microsoftonline.com/")
  )
}

async function getUserInfo(provider: string, tokenData: OAuthTokenData): Promise<OAuthUserInfo | null> {
  const endpoints: Record<string, string> = {
    google: "https://www.googleapis.com/oauth2/v2/userinfo",
    github: "https://api.github.com/user",
    microsoft: "https://graph.microsoft.com/v1.0/me",
  }

  const endpoint = endpoints[provider]
  if (!endpoint) return null

  const response = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  })

  if (!response.ok) return null
  const data = await response.json()

  switch (provider) {
    case "google":
      return {
        id: String(data.id),
        email: String(data.email || ""),
        name: String(data.name || ""),
        emailVerified: data.verified_email === true || data.email_verified === true,
      }
    case "github": {
      const emailRes = await fetch("https://api.github.com/user/emails", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      })
      if (!emailRes.ok) return null

      const emails = (await emailRes.json()) as Array<{
        email?: string
        primary?: boolean
        verified?: boolean
      }>
      const profileEmail = typeof data.email === "string" ? data.email : ""
      const primaryVerified =
        emails.find((e) => e.primary && e.verified && e.email) ??
        emails.find((e) => e.verified && e.email === profileEmail)

      if (!primaryVerified?.email) {
        return { id: String(data.id), email: profileEmail, name: data.name || data.login || "", emailVerified: false }
      }

      return {
        id: String(data.id),
        email: primaryVerified.email,
        name: data.name || data.login || "",
        emailVerified: true,
      }
    }
    case "microsoft": {
      const claims = decodeJwtPayload(tokenData.id_token)
      const email =
        data.mail ||
        data.userPrincipalName ||
        claims?.email ||
        claims?.preferred_username ||
        ""
      return {
        id: String(data.id || claims?.sub || ""),
        email: String(email),
        name: String(data.displayName || claims?.name || ""),
        emailVerified: validMicrosoftClaims(claims) && Boolean(email),
      }
    }
    default:
      return null
  }
}
