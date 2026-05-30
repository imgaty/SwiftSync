//
//  query-utils.ts
//  Argent
//
//  Created by hilario on 22 May 2026 at 09:36.
//  Description: Provides shared query utils logic for Argent, centralizing domain behavior, helpers, or
//  integration code used by pages, routes, and components.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
export function parsePositiveInt(raw: string | null | undefined, fallback: number): number {
    if (raw === null || raw === undefined || raw.trim() === "") return fallback
    const n = Number(raw)
    if (!Number.isFinite(n) || n < 1) return fallback
    return Math.floor(n)
}

export function parseIntInRange(
    raw: string | null | undefined,
    fallback: number,
    min: number,
    max: number,
): number {
    if (raw === null || raw === undefined || raw.trim() === "") return fallback
    const n = Number(raw)
    if (!Number.isFinite(n)) return fallback
    return Math.min(max, Math.max(min, Math.floor(n)))
}
