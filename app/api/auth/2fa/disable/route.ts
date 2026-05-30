//
//  route.ts
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Handles the /api/auth/2fa/disable API endpoint for Argent, keeping request parsing,
//  business operations, and response formatting at the route boundary.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
/* Disable 2FA on the caller's account.
 *
 * Requires either the current password OR a valid TOTP code as proof — a
 * hijacked session alone can't turn 2FA off. Rate-limited per user.
 *
 * Learn more in `docs/Authentication & Security.md`
 */

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUserId } from "@/lib/auth-helpers"
import { verifyPassword } from "@/lib/password"
import { decrypt } from "@/lib/encryption-v2"
import { rateLimit } from "@/lib/rate-limit"
import * as OTPAuth from "otpauth"

// POST /api/auth/2fa/disable
export async function POST(request: Request) {
  const userId = await getAuthUserId()
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const rl = rateLimit({
    scope: "2fa-disable",
    identifier: userId,
    max: 10,
    windowMs: 10 * 60 * 1000,
  })
  if (!rl.ok) {
    const res = NextResponse.json(
      { error: `Too many attempts. Try again in ${rl.retryAfter} seconds.` },
      { status: 429 },
    )
    res.headers.set("Retry-After", String(rl.retryAfter))
    return res
  }

  const body = (await request.json().catch(() => ({}))) as {
    password?: string
    code?: string
  }
  const { password, code } = body

  if (!password && !code) {
    return NextResponse.json(
      { error: "Current password or 2FA code is required to disable 2FA." },
      { status: 400 },
    )
  }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  let proven = false

  if (password && verifyPassword(password, user.password)) {
    proven = true
  } else if (code && user.twoFactorSecret) {
    const secret = decrypt(user.twoFactorSecret)
    const totp = new OTPAuth.TOTP({
      issuer: "Argent",
      label: user.name || user.email,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    })
    if (totp.validate({ token: code, window: 1 }) !== null) {
      proven = true
    }
  }

  if (!proven) {
    return NextResponse.json(
      { error: "Incorrect password or 2FA code." },
      { status: 403 },
    )
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorBackupCodes: null,
    },
  })

  return NextResponse.json({ success: true, message: "2FA disabled" })
}
