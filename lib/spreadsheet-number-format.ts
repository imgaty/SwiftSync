/* ─── Number format presets ──────────────────────────────────────────── */
// Format codes use the syntax "<kind>:<decimals>" so we can store decimal
// precision per-cell while keeping the type system compact.

export type NumberFormatKind =
    | "general"
    | "number"
    | "currency"
    | "accounting"
    | "percent"
    | "comma"
    | "scientific"
    | "date"
    | "longDate"
    | "time"
    | "fraction"
    | "text"

export interface ParsedFormat {
    kind: NumberFormatKind
    decimals: number
}

export function parseNumberFormat(nf?: string): ParsedFormat {
    if (!nf) return { kind: "general", decimals: 2 }
    const [k, d] = nf.split(":")
    return {
        kind: (k as NumberFormatKind) || "general",
        decimals: d ? Math.max(0, Math.min(20, parseInt(d, 10) || 0)) : defaultDecimals(k as NumberFormatKind),
    }
}

export function buildNumberFormat(kind: NumberFormatKind, decimals?: number): string {
    if (kind === "general" || kind === "text" || kind === "date" || kind === "longDate" || kind === "time" || kind === "fraction") {
        return kind
    }
    const d = decimals ?? defaultDecimals(kind)
    return `${kind}:${d}`
}

function defaultDecimals(kind: NumberFormatKind): number {
    switch (kind) {
        case "number": return 2
        case "currency": return 2
        case "accounting": return 2
        case "percent": return 0
        case "comma": return 2
        case "scientific": return 2
        default: return 0
    }
}

export const NUMBER_FORMAT_OPTIONS: { value: NumberFormatKind; label: string; sample: string }[] = [
    { value: "general", label: "General", sample: "1234.5" },
    { value: "number", label: "Number", sample: "1,234.50" },
    { value: "currency", label: "Currency", sample: "$1,234.50" },
    { value: "accounting", label: "Accounting", sample: "$ 1,234.50" },
    { value: "date", label: "Short Date", sample: "1/1/2026" },
    { value: "longDate", label: "Long Date", sample: "Jan 1, 2026" },
    { value: "time", label: "Time", sample: "12:00 PM" },
    { value: "percent", label: "Percentage", sample: "12.34%" },
    { value: "fraction", label: "Fraction", sample: "1 1/2" },
    { value: "scientific", label: "Scientific", sample: "1.23E+03" },
    { value: "text", label: "Text", sample: "Plain text" },
]

/* ─── Formatter ──────────────────────────────────────────────────────── */
function fmtThousands(n: number, decimals: number): string {
    return n.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    })
}

function tryDate(v: string): Date | null {
    const n = Number(v)
    if (Number.isFinite(n) && n > 25569 && n < 80000) {
        // Excel serial date (days since 1899-12-30)
        const ms = (n - 25569) * 86400 * 1000
        const d = new Date(ms)
        return isNaN(d.getTime()) ? null : d
    }
    const d = new Date(v)
    return isNaN(d.getTime()) ? null : d
}

function toFraction(n: number): string {
    if (!Number.isFinite(n)) return String(n)
    const sign = n < 0 ? "-" : ""
    const abs = Math.abs(n)
    const whole = Math.floor(abs)
    const frac = abs - whole
    if (frac < 1e-9) return `${sign}${whole}`
    // Find best fraction with denominator <= 16
    let bestNum = 1, bestDen = 1, bestErr = Infinity
    for (let den = 1; den <= 16; den++) {
        const num = Math.round(frac * den)
        const err = Math.abs(frac - num / den)
        if (err < bestErr && num > 0) { bestErr = err; bestNum = num; bestDen = den }
    }
    if (bestNum === bestDen) return `${sign}${whole + 1}`
    return whole > 0 ? `${sign}${whole} ${bestNum}/${bestDen}` : `${sign}${bestNum}/${bestDen}`
}

/** Apply a number format to a raw display string. Returns the display value. */
export function applyNumberFormatToDisplay(raw: string, nf?: string): string {
    if (!nf || nf === "general") return raw
    if (raw === "" || raw == null) return raw

    const { kind, decimals } = parseNumberFormat(nf)

    if (kind === "text") return raw

    if (kind === "date" || kind === "longDate" || kind === "time") {
        const d = tryDate(raw)
        if (!d) return raw
        if (kind === "date") return d.toLocaleDateString("en-US")
        if (kind === "longDate") return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
        return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    }

    const n = Number(raw)
    if (!Number.isFinite(n)) return raw

    switch (kind) {
        case "number":
            return fmtThousands(n, decimals)
        case "comma":
            return fmtThousands(n, decimals)
        case "currency":
            return n < 0
                ? `-$${fmtThousands(Math.abs(n), decimals)}`
                : `$${fmtThousands(n, decimals)}`
        case "accounting":
            return n < 0
                ? `$ (${fmtThousands(Math.abs(n), decimals)})`
                : n === 0 ? "$ -" : `$ ${fmtThousands(n, decimals)}`
        case "percent":
            return `${(n * 100).toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}%`
        case "scientific":
            return n.toExponential(decimals).toUpperCase().replace("E", "E+").replace("E+-", "E-")
        case "fraction":
            return toFraction(n)
        default:
            return raw
    }
}

/** Adjust the decimals of a format code. Returns new code or undefined to clear. */
export function bumpFormatDecimals(nf: string | undefined, delta: number): string | undefined {
    const parsed = parseNumberFormat(nf)
    // Promote "general" to "number" when bumping decimals from a plain cell
    const kind: NumberFormatKind = parsed.kind === "general" ? "number" : parsed.kind
    const next = Math.max(0, Math.min(20, parsed.decimals + delta))
    return buildNumberFormat(kind, next)
}
