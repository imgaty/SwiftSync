//
//  auth-2fa.ts
//  Argent
//
//  Created by hilario on 27 May 2026 at 17:07.
//  Description: Provides shared 2FA backup code and pending-session helpers for Argent.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
import { timingSafeEqual } from "node:crypto"

export type PendingTwoFactorSession = {
    userId: string
    expiresAt: number
    attempts: number
}

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

export function deletePendingTwoFactorSessionsForUser(
    pending: Map<string, PendingTwoFactorSession>,
    userId: string,
) {
    for (const [key, value] of pending) {
        if (value.userId === userId) pending.delete(key)
    }
}

export function replacePendingTwoFactorSession(
    pending: Map<string, PendingTwoFactorSession>,
    token: string,
    options: PendingTwoFactorSession & { maxPending: number },
) {
    deletePendingTwoFactorSessionsForUser(pending, options.userId)

    if (pending.size >= options.maxPending) {
        const oldestKey = pending.keys().next().value
        if (oldestKey) pending.delete(oldestKey)
    }

    pending.set(token, {
        attempts: options.attempts,
        expiresAt: options.expiresAt,
        userId: options.userId,
    })
}
