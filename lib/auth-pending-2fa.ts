//
//  auth-pending-2fa.ts
//  Argent
//
//  Created by hilario on 27 May 2026 at 17:07.
//  Description: Provides shared auth pending 2fa logic for Argent, centralizing domain behavior,
//  helpers, or integration code used by pages, routes, and components.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
export type PendingTwoFactorSession = {
    userId: string
    expiresAt: number
    attempts: number
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
