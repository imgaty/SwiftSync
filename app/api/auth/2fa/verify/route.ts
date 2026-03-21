import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUserId } from "@/lib/auth-helpers"
import * as OTPAuth from "otpauth"
import { decrypt } from "@/lib/adaptive-encryption"

// POST /api/auth/2fa/verify — Verify TOTP code and enable 2FA
export async function POST(request: Request) {
  const userId = await getAuthUserId()
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { code } = await request.json()
  if (!code) {
    return NextResponse.json({ error: "Code is required" }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || !user.twoFactorSecret) {
    return NextResponse.json({ error: "2FA setup not found. Please set up 2FA first." }, { status: 400 })
  }

  // Decrypt the secret
  const secret = decrypt(user.twoFactorSecret)

  const totp = new OTPAuth.TOTP({
    issuer: "SwiftSync",
    label: user.name || user.email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  })

  // Verify the code (with 1 period window)
  const delta = totp.validate({ token: code, window: 1 })

  if (delta === null) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 })
  }

  // Enable 2FA
  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorEnabled: true },
  })

  return NextResponse.json({ success: true, message: "2FA enabled successfully" })
}
