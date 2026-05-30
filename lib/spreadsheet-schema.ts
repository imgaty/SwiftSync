//
//  spreadsheet-schema.ts
//  Argent
//
//  Created by hilario on 22 May 2026 at 09:36.
//  Description: Provides shared spreadsheet schema logic for Argent, centralizing domain behavior,
//  helpers, or integration code used by pages, routes, and components.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
import { z } from "zod"

// Cell-level caps
const MAX_CELL_VALUE_LEN = 10_000          // per-cell string length
const MAX_COLS_PER_ROW = 200
const MAX_ROWS_PER_SHEET = 20_000
const MAX_SHEETS = 50

// Size cap on the serialized JSON payload (defense-in-depth)
export const MAX_SPREADSHEET_JSON_BYTES = 5 * 1024 * 1024 // 5 MB

const primitiveCell = z.union([
    z.string().max(MAX_CELL_VALUE_LEN),
    z.number(),
    z.boolean(),
    z.null(),
])

// A cell can be a primitive or a small object (e.g., { value, formula, style }).
// We still bound the object's serialized size via the outer byte cap.
const cellValue = z.union([
    primitiveCell,
    z.record(z.string().max(64), z.unknown()),
])

const gridRow = z.array(cellValue).max(MAX_COLS_PER_ROW)

const legacyRow = z.object({}).catchall(z.unknown())

// Legacy row-based content: { rows: [...] }
const legacyContent = z.object({
    rows: z.array(legacyRow).max(MAX_ROWS_PER_SHEET),
}).catchall(z.unknown())

// Grid/sheet-based content: { sheets: [{ name, rows: [[cell...]] }], activeSheet }
const sheet = z.object({
    name: z.string().max(128).nullable().optional(),
    id: z.string().max(128).optional(),
    rows: z.array(gridRow).max(MAX_ROWS_PER_SHEET).optional(),
    cells: z.unknown().optional(),
    colWidths: z.record(z.string().max(16), z.number().finite().positive()).optional(),
    mergedCells: z.array(z.object({
        sc: z.number().int().nonnegative(),
        sr: z.number().int().nonnegative(),
        ec: z.number().int().nonnegative(),
        er: z.number().int().nonnegative(),
    })).max(MAX_ROWS_PER_SHEET).optional(),
}).catchall(z.unknown())

const gridContent = z.object({
    sheets: z.array(sheet).max(MAX_SHEETS),
    activeSheet: z.number().int().nonnegative().optional(),
}).catchall(z.unknown())

export const spreadsheetContentSchema = z.union([legacyContent, gridContent])

export const SHEET_TYPES = ["manual", "linked", "grid"] as const
export const LINKED_ENTITIES = ["transactions", "budgets", "bills", "accounts"] as const

export const spreadsheetCreateSchema = z.object({
    name: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2_000).nullable().optional(),
    sheetType: z.enum(SHEET_TYPES).optional(),
    linkedEntity: z.enum(LINKED_ENTITIES).nullable().optional(),
    content: spreadsheetContentSchema,
})

export const spreadsheetUpdateSchema = z.object({
    name: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(2_000).nullable().optional(),
    sheetType: z.enum(SHEET_TYPES).optional(),
    linkedEntity: z.enum(LINKED_ENTITIES).nullable().optional(),
    content: spreadsheetContentSchema.optional(),
    logAction: z.string().max(64).optional(),
    logSummary: z.string().max(500).optional(),
})

// Enforce a hard byte cap on the serialized content before schema validation.
export function assertContentSize(content: unknown): { ok: true } | { ok: false; error: string } {
    try {
        const bytes = Buffer.byteLength(JSON.stringify(content ?? null), "utf8")
        if (bytes > MAX_SPREADSHEET_JSON_BYTES) {
            return { ok: false, error: `Spreadsheet content exceeds ${MAX_SPREADSHEET_JSON_BYTES} bytes` }
        }
        return { ok: true }
    } catch {
        return { ok: false, error: "Spreadsheet content is not serializable" }
    }
}
