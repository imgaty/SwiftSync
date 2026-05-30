//
//  spreadsheet-utils.ts
//  Argent
//
//  Created by hilario on 22 May 2026 at 09:36.
//  Description: Provides shared spreadsheet utils logic for Argent, centralizing domain behavior,
//  helpers, or integration code used by pages, routes, and components.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
import type { BorderStyle, FinanceData, SpreadsheetCellData, SpreadsheetSheetTab } from "@/lib/types"

/* ─── Finance formula context ──────────────────────────────────────────
 * Optional bundle threaded through formula evaluation so spreadsheet
 * cells can read live values from the app's finance domain via
 * functions like =TXSUM, =BUDGET, =BILL, =BALANCE, =INCOME, =EXPENSES.
 * ───────────────────────────────────────────────────────────────────── */
export type FinanceContext = FinanceData | null | undefined

/* ─── Constants ────────────────────────────────────────────────────────── */
export const DEFAULT_COL_W = 100
export const MIN_COL_W = 40
export const ROW_H = 28
export const HEADER_W = 50
export const BUFFER = 5

/* ─── Helpers ──────────────────────────────────────────────────────────── */
export function colLabel(i: number): string {
    let s = ""
    let n = i
    while (n >= 0) {
        s = String.fromCharCode(65 + (n % 26)) + s
        n = Math.floor(n / 26) - 1
    }
    return s
}

export function ck(c: number, r: number) {
    return `${colLabel(c)}${r + 1}`
}

export function colFromLabel(label: string): number {
    let c = 0
    for (let i = 0; i < label.length; i++) c = c * 26 + (label.charCodeAt(i) - 64)
    return c - 1
}

export function parseKey(key: string): { col: number; row: number } | null {
    const m = key.match(/^([A-Z]+)(\d+)$/)
    if (!m) return null
    return { col: colFromLabel(m[1]), row: parseInt(m[2], 10) - 1 }
}

export function isCellEmpty(cell: Partial<SpreadsheetCellData>): boolean {
    return !cell.v && !cell.b && !cell.i && !cell.c && !cell.bg && !cell.al && !cell.bd
}

export function borderCss(bd?: { style: BorderStyle; color: string }): string {
    if (!bd) return ""
    const w = bd.style === "thick" ? "2px" : bd.style === "medium" ? "1.5px" : "1px"
    const s = bd.style === "dashed" ? "dashed" : bd.style === "dotted" ? "dotted" : "solid"
    return `${w} ${s} ${bd.color}`
}

/* ─── Workbook type ────────────────────────────────────────────────────── */
export interface Workbook {
    sheets: SpreadsheetSheetTab[]
    activeSheet: number
}

export function newWorkbook(): Workbook {
    return {
        sheets: [{ name: "Sheet 1", cells: {}, colWidths: {} }],
        activeSheet: 0,
    }
}

/* ─── Presets ──────────────────────────────────────────────────────────── */
export const COLOR_PRESETS = [
    "#000000", "#434343", "#666666", "#999999", "#b7b7b7", "#cccccc", "#d9d9d9", "#efefef", "#f3f3f3", "#ffffff",
    "#980000", "#ff0000", "#ff9900", "#ffff00", "#00ff00", "#00ffff", "#4a86e8", "#0000ff", "#9900ff", "#ff00ff",
    "#e6b8af", "#f4cccc", "#fce5cd", "#fff2cc", "#d9ead3", "#d0e0e3", "#c9daf8", "#cfe2f3", "#d9d2e9", "#ead1dc",
    "#dd7e6b", "#ea9999", "#f9cb9c", "#ffe599", "#b6d7a8", "#a2c4c9", "#a4c2f4", "#9fc5e8", "#b4a7d6", "#d5a6bd",
    "#cc4125", "#e06666", "#f6b26b", "#ffd966", "#93c47d", "#76a5af", "#6d9eeb", "#6fa8dc", "#8e7cc3", "#c27ba0",
]

export const BORDER_STYLES: { label: string; value: BorderStyle }[] = [
    { label: "Thin", value: "thin" },
    { label: "Medium", value: "medium" },
    { label: "Thick", value: "thick" },
    { label: "Dashed", value: "dashed" },
    { label: "Dotted", value: "dotted" },
]

export const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 36]

/* ─── Formula engine ───────────────────────────────────────────────────── */
export function isFormula(v: string): boolean {
    return typeof v === "string" && v.startsWith("=") && v.length > 1
}

/** Resolve a cell reference like "A1" or "$B$3" to a numeric value from cells */
function resolveRef(ref: string, cells: Record<string, import("@/lib/types").SpreadsheetCellData>, visited: Set<string>, finance?: FinanceContext): number {
    const clean = ref.replace(/\$/g, "").toUpperCase()
    if (visited.has(clean)) return NaN // circular ref
    const cell = cells[clean]
    if (!cell || !cell.v) return 0
    if (isFormula(cell.v)) {
        return evaluateFormula(cell.v, cells, new Set([...visited, clean]), finance)
    }
    const n = Number(cell.v)
    return isNaN(n) ? 0 : n
}

/** Resolve a cell reference to its raw string value (for string args in functions) */
function resolveRefString(ref: string, cells: Record<string, import("@/lib/types").SpreadsheetCellData>): string {
    const clean = ref.replace(/\$/g, "").toUpperCase()
    const cell = cells[clean]
    return cell?.v ?? ""
}

/** Parse a range like "A1:B3" into an array of cell keys */
function expandRange(rangeStr: string): string[] {
    const parts = rangeStr.replace(/\$/g, "").toUpperCase().split(":")
    if (parts.length !== 2) return [rangeStr.replace(/\$/g, "").toUpperCase()]
    const start = parseKey(parts[0])
    const end = parseKey(parts[1])
    if (!start || !end) return []
    const keys: string[] = []
    const c1 = Math.min(start.col, end.col), c2 = Math.max(start.col, end.col)
    const r1 = Math.min(start.row, end.row), r2 = Math.max(start.row, end.row)
    for (let r = r1; r <= r2; r++) {
        for (let c = c1; c <= c2; c++) keys.push(ck(c, r))
    }
    return keys
}

/** Collect numeric values from a range argument (supports "A1:B3" or "A1,B2,3") */
function collectValues(arg: string, cells: Record<string, import("@/lib/types").SpreadsheetCellData>, visited: Set<string>, finance?: FinanceContext): number[] {
    const vals: number[] = []
    // Split by comma for multi-arg ranges
    const parts = arg.split(",").map((s) => s.trim())
    for (const part of parts) {
        if (part.includes(":")) {
            const keys = expandRange(part)
            for (const k of keys) vals.push(resolveRef(k, cells, visited, finance))
        } else if (/^[A-Z]+\d+$/i.test(part.replace(/\$/g, ""))) {
            vals.push(resolveRef(part, cells, visited, finance))
        } else {
            const n = Number(part)
            if (!isNaN(n)) vals.push(n)
        }
    }
    return vals
}

/** Tokenize an expression into numbers, cell refs, operators, parens, and function calls */
function tokenize(expr: string): string[] {
    const tokens: string[] = []
    let i = 0
    while (i < expr.length) {
        if (/\s/.test(expr[i])) { i++; continue }
        // Function name (letters followed by open paren)
        if (/[A-Z]/i.test(expr[i])) {
            let name = ""
            while (i < expr.length && /[A-Z0-9_$]/i.test(expr[i])) { name += expr[i]; i++ }
            // Check if it's a function call
            if (i < expr.length && expr[i] === "(") {
                tokens.push(name.toUpperCase() + "(")
                i++ // skip (
            } else {
                // Cell ref or range like A1:B3
                if (i < expr.length && /\d/.test(expr[i])) {
                    while (i < expr.length && /\d/.test(expr[i])) { name += expr[i]; i++ }
                }
                // Check for range ":"
                if (i < expr.length && expr[i] === ":") {
                    name += ":"
                    i++
                    while (i < expr.length && /[A-Z0-9$]/i.test(expr[i])) { name += expr[i]; i++ }
                }
                tokens.push(name.toUpperCase())
            }
            continue
        }
        // Numbers
        if (/[\d.]/.test(expr[i])) {
            let num = ""
            while (i < expr.length && /[\d.]/.test(expr[i])) { num += expr[i]; i++ }
            tokens.push(num)
            continue
        }
        // Operators and parens
        if ("+-*/%^(),<>=!&".includes(expr[i])) {
            // Multi-char operators
            if (i + 1 < expr.length) {
                const two = expr[i] + expr[i + 1]
                if ([">=", "<=", "<>", "!=", "=="].includes(two)) {
                    tokens.push(two); i += 2; continue
                }
            }
            tokens.push(expr[i]); i++; continue
        }
        // String literal
        if (expr[i] === '"') {
            let str = '"'
            i++
            while (i < expr.length && expr[i] !== '"') { str += expr[i]; i++ }
            if (i < expr.length) { str += '"'; i++ }
            tokens.push(str)
            continue
        }
        i++ // skip unknown
    }
    return tokens
}

/** Evaluate a simple arithmetic expression with cell references */
function evalExpression(expr: string, cells: Record<string, import("@/lib/types").SpreadsheetCellData>, visited: Set<string>, finance?: FinanceContext): number {
    const tokens = tokenize(expr)
    let pos = 0

    function peek(): string | undefined { return tokens[pos] }
    function consume(): string { return tokens[pos++] }

    function parseAtom(): number {
        const tok = peek()
        if (!tok) return 0

        // Unary minus
        if (tok === "-") {
            consume()
            return -parseAtom()
        }
        if (tok === "+") {
            consume()
            return parseAtom()
        }

        // Parenthesized expression
        if (tok === "(") {
            consume()
            const val = parseAddSub()
            if (peek() === ")") consume()
            return val
        }

        // Function call
        if (tok.endsWith("(")) {
            const fnName = consume().slice(0, -1)
            // Collect arguments (handle nested parens)
            let depth = 1
            let argStr = ""
            while (pos < tokens.length && depth > 0) {
                const t = consume()
                if (t === "(" || t.endsWith("(")) depth++
                else if (t === ")") { depth--; if (depth === 0) break }
                argStr += t
            }
            return evalFunction(fnName, argStr, cells, visited, finance)
        }

        // Cell reference (e.g. A1, $B$3)
        if (/^\$?[A-Z]+\$?\d+$/i.test(tok.replace(/:/g, ""))) {
            // Check for range
            const ref = consume()
            if (ref.includes(":")) {
                const vals = collectValues(ref, cells, visited, finance)
                return vals.reduce((a, b) => a + b, 0) // sum by default for bare ranges
            }
            return resolveRef(ref, cells, visited, finance)
        }

        // Number
        const n = Number(consume())
        return isNaN(n) ? 0 : n
    }

    function parsePower(): number {
        let val = parseAtom()
        while (peek() === "^") { consume(); val = Math.pow(val, parseAtom()) }
        return val
    }

    function parseMulDiv(): number {
        let val = parsePower()
        while (peek() === "*" || peek() === "/" || peek() === "%") {
            const op = consume()
            const right = parsePower()
            if (op === "*") val *= right
            else if (op === "/") val = right !== 0 ? val / right : NaN
            else val = right !== 0 ? val % right : NaN
        }
        return val
    }

    function parseAddSub(): number {
        let val = parseMulDiv()
        while (peek() === "+" || peek() === "-") {
            const op = consume()
            const right = parseMulDiv()
            val = op === "+" ? val + right : val - right
        }
        return val
    }

    return parseAddSub()
}

/** Evaluate known functions */
function evalFunction(name: string, argStr: string, cells: Record<string, import("@/lib/types").SpreadsheetCellData>, visited: Set<string>, finance?: FinanceContext): number {
    // Finance functions are dispatched first — they parse args as strings, not numbers.
    if (FINANCE_FN_NAMES.has(name)) {
        return evalFinanceFunction(name, argStr, cells, finance)
    }

    const vals = collectValues(argStr, cells, visited, finance)

    switch (name) {
        case "SUM": return vals.reduce((a, b) => a + b, 0)
        case "AVERAGE":
        case "AVG": return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
        case "MIN": return vals.length ? Math.min(...vals) : 0
        case "MAX": return vals.length ? Math.max(...vals) : 0
        case "COUNT": return vals.filter((v) => !isNaN(v)).length
        case "COUNTA": return vals.filter((v) => v !== 0).length
        case "ABS": return vals.length ? Math.abs(vals[0]) : 0
        case "ROUND": {
            const num = vals[0] ?? 0
            const dec = vals[1] ?? 0
            const factor = Math.pow(10, dec)
            return Math.round(num * factor) / factor
        }
        case "ROUNDUP":
        case "CEILING": {
            const num = vals[0] ?? 0
            const dec = vals[1] ?? 0
            const factor = Math.pow(10, dec)
            return Math.ceil(num * factor) / factor
        }
        case "ROUNDDOWN":
        case "FLOOR": {
            const num = vals[0] ?? 0
            const dec = vals[1] ?? 0
            const factor = Math.pow(10, dec)
            return Math.floor(num * factor) / factor
        }
        case "SQRT": return Math.sqrt(vals[0] ?? 0)
        case "POWER":
        case "POW": return Math.pow(vals[0] ?? 0, vals[1] ?? 1)
        case "LOG": return vals.length >= 2 ? Math.log(vals[0]) / Math.log(vals[1]) : Math.log10(vals[0] ?? 1)
        case "LOG10": return Math.log10(vals[0] ?? 1)
        case "LN": return Math.log(vals[0] ?? 1)
        case "EXP": return Math.exp(vals[0] ?? 0)
        case "PI": return Math.PI
        case "MEDIAN": {
            const sorted = [...vals].sort((a, b) => a - b)
            const mid = Math.floor(sorted.length / 2)
            return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
        }
        case "PRODUCT": return vals.reduce((a, b) => a * b, 1)
        case "MOD": return vals.length >= 2 ? (vals[1] !== 0 ? vals[0] % vals[1] : NaN) : 0
        case "INT": return Math.trunc(vals[0] ?? 0)
        case "SIGN": return vals.length ? Math.sign(vals[0]) : 0
        case "IF": {
            // IF needs special parsing: IF(condition, trueVal, falseVal)
            const parts = argStr.split(",").map((s) => s.trim())
            if (parts.length < 2) return 0
            const cond = evalExpression(parts[0], cells, visited, finance)
            const trueVal = evalExpression(parts[1], cells, visited, finance)
            const falseVal = parts.length >= 3 ? evalExpression(parts[2], cells, visited, finance) : 0
            return cond ? trueVal : falseVal
        }
        case "SUMIF": {
            // Simplified: SUMIF(range, criteria, sum_range)
            // Not fully implemented — fall back to SUM
            return vals.reduce((a, b) => a + b, 0)
        }
        case "COUNTIF": return vals.filter((v) => v !== 0).length
        case "STDEV": {
            if (vals.length < 2) return 0
            const mean = vals.reduce((a, b) => a + b, 0) / vals.length
            const sqDiffs = vals.map((v) => Math.pow(v - mean, 2))
            return Math.sqrt(sqDiffs.reduce((a, b) => a + b, 0) / (vals.length - 1))
        }
        case "VAR":
        case "VARIANCE": {
            if (vals.length < 2) return 0
            const mean = vals.reduce((a, b) => a + b, 0) / vals.length
            const sqDiffs = vals.map((v) => Math.pow(v - mean, 2))
            return sqDiffs.reduce((a, b) => a + b, 0) / (vals.length - 1)
        }
        default: return NaN
    }
}

/** Main entry: evaluate a formula string like "=SUM(A1:A5)" */
export function evaluateFormula(
    formula: string,
    cells: Record<string, import("@/lib/types").SpreadsheetCellData>,
    visited: Set<string> = new Set(),
    finance?: FinanceContext,
): number {
    if (!isFormula(formula)) return NaN
    const expr = formula.slice(1).trim()
    try {
        return evalExpression(expr, cells, visited, finance)
    } catch {
        return NaN
    }
}

/** Format a formula result for display */
export function getFormulaDisplay(
    formula: string,
    cells: Record<string, import("@/lib/types").SpreadsheetCellData>,
    finance?: FinanceContext,
): string {
    const result = evaluateFormula(formula, cells, undefined, finance)
    if (isNaN(result)) return "#ERROR"
    // Show integers without decimals, others with up to 10 significant digits
    if (Number.isInteger(result)) return String(result)
    return String(parseFloat(result.toPrecision(10)))
}

/** All supported function names for autocomplete / reference */
export const FORMULA_FUNCTIONS = [
    { name: "SUM", syntax: "SUM(range)", desc: "Adds all numbers in a range" },
    { name: "AVERAGE", syntax: "AVERAGE(range)", desc: "Average of a range" },
    { name: "MIN", syntax: "MIN(range)", desc: "Smallest value in a range" },
    { name: "MAX", syntax: "MAX(range)", desc: "Largest value in a range" },
    { name: "COUNT", syntax: "COUNT(range)", desc: "Count numeric values" },
    { name: "COUNTA", syntax: "COUNTA(range)", desc: "Count non-empty values" },
    { name: "IF", syntax: "IF(cond, true, false)", desc: "Conditional value" },
    { name: "ABS", syntax: "ABS(number)", desc: "Absolute value" },
    { name: "ROUND", syntax: "ROUND(number, decimals)", desc: "Round to decimals" },
    { name: "ROUNDUP", syntax: "ROUNDUP(number, decimals)", desc: "Round up" },
    { name: "ROUNDDOWN", syntax: "ROUNDDOWN(number, decimals)", desc: "Round down" },
    { name: "CEILING", syntax: "CEILING(number, decimals)", desc: "Round up to nearest" },
    { name: "FLOOR", syntax: "FLOOR(number, decimals)", desc: "Round down to nearest" },
    { name: "SQRT", syntax: "SQRT(number)", desc: "Square root" },
    { name: "POWER", syntax: "POWER(base, exp)", desc: "Raise to power" },
    { name: "LOG", syntax: "LOG(number, base)", desc: "Logarithm" },
    { name: "LOG10", syntax: "LOG10(number)", desc: "Base-10 logarithm" },
    { name: "LN", syntax: "LN(number)", desc: "Natural logarithm" },
    { name: "EXP", syntax: "EXP(number)", desc: "e raised to power" },
    { name: "PI", syntax: "PI()", desc: "Value of π" },
    { name: "MEDIAN", syntax: "MEDIAN(range)", desc: "Middle value" },
    { name: "PRODUCT", syntax: "PRODUCT(range)", desc: "Multiply all values" },
    { name: "MOD", syntax: "MOD(number, divisor)", desc: "Remainder of division" },
    { name: "INT", syntax: "INT(number)", desc: "Truncate to integer" },
    { name: "SIGN", syntax: "SIGN(number)", desc: "Sign (-1, 0, 1)" },
    { name: "STDEV", syntax: "STDEV(range)", desc: "Standard deviation" },
    { name: "VAR", syntax: "VAR(range)", desc: "Variance" },
    /* ── Finance functions (read live from app data) ─────────────── */
    { name: "TXSUM", syntax: 'TXSUM(tag, month, year)', desc: "Sum of transactions matching tag in a month" },
    { name: "TXCOUNT", syntax: 'TXCOUNT(tag, month, year)', desc: "Count of transactions matching tag in a month" },
    { name: "INCOME", syntax: 'INCOME(month, year)', desc: "Total income for a month (or all-time)" },
    { name: "EXPENSES", syntax: 'EXPENSES(month, year)', desc: "Total expenses for a month (or all-time)" },
    { name: "NET", syntax: 'NET(month, year)', desc: "Income minus expenses for a month" },
    { name: "BUDGET", syntax: 'BUDGET(tag)', desc: "Budget limit configured for a tag/category" },
    { name: "BUDGETSPENT", syntax: 'BUDGETSPENT(tag)', desc: "Amount already spent against a budget" },
    { name: "BILL", syntax: 'BILL(name)', desc: "Amount of a recurring bill by name" },
    { name: "BALANCE", syntax: 'BALANCE(account)', desc: "Current balance of an account (omit for total)" },
]

/* ─── Finance formula implementations ──────────────────────────────────
 * These read from the FinanceData passed into the formula engine and
 * let cells like  =TXSUM("Food", "Apr")  return live numbers.
 * ───────────────────────────────────────────────────────────────────── */
const FINANCE_FN_NAMES = new Set([
    "TXSUM", "TXCOUNT", "INCOME", "EXPENSES", "NET",
    "BUDGET", "BUDGETSPENT", "BILL", "BALANCE",
])

const MONTH_NAMES = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
]

/** Split a top-level argument list, respecting quotes and nested parens. */
function splitFinanceArgs(argStr: string): string[] {
    const out: string[] = []
    let cur = ""
    let depth = 0
    let inQuote = false
    for (let i = 0; i < argStr.length; i++) {
        const ch = argStr[i]
        if (ch === '"') { inQuote = !inQuote; cur += ch; continue }
        if (!inQuote) {
            if (ch === "(") depth++
            else if (ch === ")") depth--
            else if (ch === "," && depth === 0) { out.push(cur.trim()); cur = ""; continue }
        }
        cur += ch
    }
    if (cur.trim().length > 0) out.push(cur.trim())
    return out
}

/** Resolve a finance arg to a string. Quoted → strip quotes; cell ref → raw value; else literal. */
function financeArgString(arg: string, cells: Record<string, SpreadsheetCellData>): string {
    if (!arg) return ""
    if (arg.startsWith('"') && arg.endsWith('"')) return arg.slice(1, -1)
    const refMatch = arg.replace(/\$/g, "").toUpperCase()
    if (/^[A-Z]+\d+$/.test(refMatch)) return resolveRefString(refMatch, cells)
    return arg
}

/** Resolve a finance arg to a 0-based month index (0-11), or -1 if unspecified/invalid. */
function financeArgMonth(arg: string, cells: Record<string, SpreadsheetCellData>): number {
    const s = financeArgString(arg, cells).trim().toLowerCase()
    if (!s) return -1
    // YYYY-MM
    const ym = s.match(/^(\d{4})-(\d{1,2})$/)
    if (ym) return Math.max(0, Math.min(11, parseInt(ym[2], 10) - 1))
    // numeric 1-12
    const n = Number(s)
    if (Number.isFinite(n) && n >= 1 && n <= 12) return n - 1
    // "jan", "january"
    const idx = MONTH_NAMES.findIndex((m) => m.startsWith(s))
    return idx
}

/** Resolve a finance arg to a year, or -1 if unspecified. */
function financeArgYear(arg: string, cells: Record<string, SpreadsheetCellData>): number {
    const s = financeArgString(arg, cells).trim()
    if (!s) return -1
    const n = Number(s)
    return Number.isFinite(n) && n >= 1900 && n <= 9999 ? n : -1
}

function txMatchesPeriod(dateStr: string, monthIdx: number, year: number): boolean {
    if (monthIdx < 0 && year < 0) return true
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return false
    if (monthIdx >= 0 && d.getMonth() !== monthIdx) return false
    if (year >= 0 && d.getFullYear() !== year) return false
    return true
}

function txMatchesTag(tx: { tags?: string[]; description?: string }, needle: string): boolean {
    if (!needle) return true
    const n = needle.toLowerCase()
    if (tx.tags?.some((t) => t.toLowerCase() === n)) return true
    return false
}

function evalFinanceFunction(
    name: string,
    argStr: string,
    cells: Record<string, SpreadsheetCellData>,
    finance: FinanceContext,
): number {
    if (!finance) return 0
    const args = splitFinanceArgs(argStr)
    const arg0 = args[0] ?? ""
    const arg1 = args[1] ?? ""
    const arg2 = args[2] ?? ""

    switch (name) {
        case "TXSUM":
        case "TXCOUNT": {
            const tag = financeArgString(arg0, cells)
            const month = financeArgMonth(arg1, cells)
            const year = financeArgYear(arg2, cells)
            const matches = (finance.transactions ?? []).filter(
                (tx) => txMatchesTag(tx, tag) && txMatchesPeriod(tx.date, month, year),
            )
            if (name === "TXCOUNT") return matches.length
            return matches.reduce((acc, tx) => acc + (tx.type === "in" ? tx.amount : -tx.amount), 0)
        }
        case "INCOME":
        case "EXPENSES":
        case "NET": {
            const month = financeArgMonth(arg0, cells)
            const year = financeArgYear(arg1, cells)
            const matches = (finance.transactions ?? []).filter(
                (tx) => txMatchesPeriod(tx.date, month, year),
            )
            const income = matches.filter((tx) => tx.type === "in").reduce((a, tx) => a + tx.amount, 0)
            const expenses = matches.filter((tx) => tx.type === "out").reduce((a, tx) => a + tx.amount, 0)
            if (name === "INCOME") return income
            if (name === "EXPENSES") return expenses
            return income - expenses
        }
        case "BUDGET": {
            const tag = financeArgString(arg0, cells).toLowerCase()
            const b = (finance.budgets ?? []).find(
                (bd) => bd.tag.toLowerCase() === tag || bd.category.toLowerCase() === tag,
            )
            return b?.budgetAmount ?? b?.limit ?? 0
        }
        case "BUDGETSPENT": {
            const tag = financeArgString(arg0, cells).toLowerCase()
            const b = (finance.budgets ?? []).find(
                (bd) => bd.tag.toLowerCase() === tag || bd.category.toLowerCase() === tag,
            )
            return b?.spentAmount ?? 0
        }
        case "BILL": {
            const name = financeArgString(arg0, cells).toLowerCase()
            const bill = (finance.bills ?? []).find((b) => b.name.toLowerCase() === name)
            return bill?.amount ?? 0
        }
        case "BALANCE": {
            const accountName = financeArgString(arg0, cells).toLowerCase()
            const accounts = finance.accounts ?? []
            if (!accountName) return accounts.reduce((a, acc) => a + acc.balance, 0)
            const acc = accounts.find(
                (a) => a.name.toLowerCase() === accountName || a.id.toLowerCase() === accountName,
            )
            return acc?.balance ?? 0
        }
        default:
            return NaN
    }
}
