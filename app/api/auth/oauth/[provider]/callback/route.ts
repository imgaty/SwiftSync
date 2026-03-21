import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { cookies } from "next/headers"
import { encrypt, hashPassword } from "@/lib/adaptive-encryption"

/**
 * GET /api/auth/oauth/[provider]/callback — Handle OAuth callback
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const state = searchParams.get("state")

  const cookieStore = await cookies()
  const storedState = cookieStore.get(`oauth_state_${provider}`)?.value

  // Verify state for CSRF protection
  if (!state || state !== storedState) {
    return NextResponse.redirect(new URL("/login?error=invalid_state", request.url))
  }

  // Clean up state cookie
  cookieStore.delete(`oauth_state_${provider}`)

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=no_code", request.url))
  }

  try {
    // Exchange code for tokens (provider-specific)
    const tokenData = await exchangeCodeForToken(provider, code, request.url)
    if (!tokenData) {
      return NextResponse.redirect(new URL("/login?error=token_exchange_failed", request.url))
    }

    // Get user info from provider
    const userInfo = await getUserInfo(provider, tokenData.access_token)
    if (!userInfo || !userInfo.email) {
      return NextResponse.redirect(new URL("/login?error=no_email", request.url))
    }

    // Check if OAuth account already linked
    let oauthAccount = await prisma.oAuthAccount.findUnique({
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
      // Existing OAuth link — log in
      userId = oauthAccount.userId
    } else {
      // Check if email already registered
      const users = await prisma.user.findMany()
      let existingUser = null
      
      // Note: In production, emails are encrypted, so we'd need to decrypt each.
      // For simplification, we try to find by encrypted email match.
      for (const user of users) {
        try {
          const { decrypt: dec } = await import("@/lib/adaptive-encryption")
          const decryptedEmail = dec(user.email)
          if (decryptedEmail === userInfo.email) {
            existingUser = user
            break
          }
        } catch {
          continue
        }
      }

      if (existingUser) {
        // Link OAuth to existing account
        userId = existingUser.id
      } else {
        // Create new user
        const encryptedEmail = encrypt(userInfo.email)
        const encryptedName = userInfo.name ? encrypt(userInfo.name) : ""
        // Generate a random password for OAuth users (they won't use it)
        const randomPassword = hashPassword(crypto.randomUUID())

        const newUser = await prisma.user.create({
          data: {
            email: encryptedEmail,
            name: userInfo.name || userInfo.email.split("@")[0],
            password: randomPassword,
            dateOfBirth: '',
          },
        })
        userId = newUser.id
      }

      // Create OAuth account link
      await prisma.oAuthAccount.create({
        data: {
          userId,
          provider,
          providerAccountId: userInfo.id,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiresAt: tokenData.expires_in
            ? new Date(Date.now() + tokenData.expires_in * 1000)
            : null,
        },
      })
    }

    // Set auth cookies
    cookieStore.set("auth-token", userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    })
    cookieStore.set("user-session", JSON.stringify({ id: userId }), {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    })

    return NextResponse.redirect(new URL("/", request.url))
  } catch (error) {
    console.error(`OAuth ${provider} callback error:`, error)
    return NextResponse.redirect(new URL("/login?error=oauth_failed", request.url))
  }
}

// Exchange authorization code for access token
async function exchangeCodeForToken(provider: string, code: string, requestUrl: string) {
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
  if (!config) return null

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
  return response.json()
}

// Get user info from OAuth provider
async function getUserInfo(provider: string, accessToken: string) {
  const endpoints: Record<string, string> = {
    google: "https://www.googleapis.com/oauth2/v2/userinfo",
    github: "https://api.github.com/user",
    microsoft: "https://graph.microsoft.com/v1.0/me",
  }

  const endpoint = endpoints[provider]
  if (!endpoint) return null

  const response = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) return null
  const data = await response.json()

  // Normalize response
  switch (provider) {
    case "google":
      return { id: data.id, email: data.email, name: data.name }
    case "github": {
      // GitHub may not return email in profile, need separate call
      let email = data.email
      if (!email) {
        const emailRes = await fetch("https://api.github.com/user/emails", {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        const emails = await emailRes.json()
        const primary = emails.find((e: { primary: boolean }) => e.primary)
        email = primary?.email
      }
      return { id: String(data.id), email, name: data.name || data.login }
    }
    case "microsoft":
      return { id: data.id, email: data.mail || data.userPrincipalName, name: data.displayName }
    default:
      return null
  }
}
