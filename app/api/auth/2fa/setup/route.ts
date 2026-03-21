import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUserId } from "@/lib/auth-helpers"
import * as OTPAuth from "otpauth"
import * as QRCode from "qrcode"
import { encrypt, decrypt } from "@/lib/adaptive-encryption"

// POST /api/auth/2fa/setup — Generate TOTP secret and QR code
export async function POST() {
  const userId = await getAuthUserId()
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  if (user.twoFactorEnabled) {
    return NextResponse.json({ error: "2FA is already enabled" }, { status: 400 })
  }

  // Generate new TOTP secret
  const secret = new OTPAuth.Secret({ size: 20 })
  const totp = new OTPAuth.TOTP({
    issuer: "SwiftSync",
    label: user.name || user.email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret,
  })

  // Generate backup codes (8 codes, 8 chars each)
  const backupCodes: string[] = []
  for (let i = 0; i < 8; i++) {
    const code = Array.from(crypto.getRandomValues(new Uint8Array(4)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
    backupCodes.push(code)
  }

  // Store encrypted secret (but don't enable yet — need verification)
  const encryptedSecret = encrypt(secret.base32)
  const encryptedBackupCodes = encrypt(JSON.stringify(backupCodes))

  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorSecret: encryptedSecret,
      twoFactorBackupCodes: encryptedBackupCodes,
    },
  })

  // Generate QR code data URL
  const otpauthUrl = totp.toString()
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl)

  return NextResponse.json({
    secret: secret.base32,
    qrCode: qrCodeDataUrl,
    backupCodes,
    otpauthUrl,
  })
}
