// Small helpers for parsing query-string numbers without NaN surprises.
// Prisma's `skip` / `take` will misbehave when given NaN — always validate.

export function parsePositiveInt(raw: string | null | undefined, fallback: number): number {
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
    const n = Number(raw)
    if (!Number.isFinite(n)) return fallback
    return Math.min(max, Math.max(min, Math.floor(n)))
}
