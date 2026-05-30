//
//  auth-backup-codes.ts
//  Argent
//
//  Created by hilario on 27 May 2026 at 17:07.
//  Description: Provides shared auth backup codes logic for Argent, centralizing domain behavior,
//  helpers, or integration code used by pages, routes, and components.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
import { timingSafeEqual } from "node:crypto"

export function normalizeBackupCode(code: string) {
    return String(code || "").trim().replace(/[\s-]/g, "").toLowerCase()
}

function safeStringEqual(a: string, b: string) {
    const left = Buffer.from(a)
    const right = Buffer.from(b)

    return left.length === right.length && timingSafeEqual(left, right)
}

export function consumeBackupCode(codes: string[], submittedCode: string) {
    const normalizedSubmitted = normalizeBackupCode(submittedCode)
    if (!normalizedSubmitted) return null

    const index = codes.findIndex((stored) => safeStringEqual(normalizeBackupCode(stored), normalizedSubmitted))
    if (index === -1) return null

    return codes.filter((_, i) => i !== index)
}

export function consumeEncryptedBackupCode(
    encryptedCodes: string | null,
    submittedCode: string,
    decryptValue: (value: string) => string,
) {
    if (!encryptedCodes) return null

    try {
        const parsed = JSON.parse(decryptValue(encryptedCodes)) as unknown
        if (!Array.isArray(parsed)) return null

        const codes = parsed.filter((item): item is string => typeof item === "string")
        return consumeBackupCode(codes, submittedCode)
    } catch {
        return null
    }
}
