import type { SpreadsheetCellData } from "@/lib/types"
import { ck } from "@/lib/spreadsheet-utils"

export interface SpreadsheetClipboardPayload {
    cells: Record<string, SpreadsheetCellData>
    startCol: number
    startRow: number
    endCol: number
    endRow: number
    cut?: boolean
}

export interface ParsedSpreadsheetClipboard {
    cells: Record<string, SpreadsheetCellData>
    rows: number
    cols: number
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
}

function encodeTsvField(value: string): string {
    if (!/[\t\r\n"]/.test(value)) return value
    return `"${value.replace(/"/g, '""')}"`
}

function cellStyle(cell: SpreadsheetCellData): string {
    const styles: string[] = []
    if (cell.b) styles.push("font-weight:700")
    if (cell.i) styles.push("font-style:italic")
    if (cell.u || cell.s) {
        styles.push(`text-decoration:${[cell.u && "underline", cell.s && "line-through"].filter(Boolean).join(" ")}`)
    }
    if (cell.fs) styles.push(`font-size:${cell.fs}px`)
    if (cell.c) styles.push(`color:${cell.c}`)
    if (cell.bg) styles.push(`background-color:${cell.bg}`)
    if (cell.al === "c") styles.push("text-align:center")
    if (cell.al === "r") styles.push("text-align:right")
    return styles.join(";")
}

function parseTsv(text: string): string[][] {
    const rows: string[][] = [[]]
    let value = ""
    let quoted = false

    for (let i = 0; i < text.length; i++) {
        const char = text[i]
        const next = text[i + 1]

        if (quoted) {
            if (char === '"' && next === '"') {
                value += '"'
                i++
            } else if (char === '"') {
                quoted = false
            } else {
                value += char
            }
            continue
        }

        if (char === '"') {
            quoted = true
        } else if (char === "\t") {
            rows[rows.length - 1].push(value)
            value = ""
        } else if (char === "\n") {
            rows[rows.length - 1].push(value)
            rows.push([])
            value = ""
        } else if (char !== "\r") {
            value += char
        }
    }

    rows[rows.length - 1].push(value)

    if (rows.length > 1 && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === "") {
        rows.pop()
    }

    return rows
}

export function cloneSpreadsheetCell(cell: SpreadsheetCellData): SpreadsheetCellData {
    return typeof structuredClone === "function" ? structuredClone(cell) : JSON.parse(JSON.stringify(cell))
}

export function hasSpreadsheetCellContent(cell: SpreadsheetCellData): boolean {
    return !!(cell.v || cell.b || cell.i || cell.u || cell.s || cell.fs || cell.wrap || cell.c || cell.bg || cell.al || cell.bd)
}

export function serializeSpreadsheetClipboardToText(payload: SpreadsheetClipboardPayload): string {
    const width = payload.endCol - payload.startCol + 1
    const height = payload.endRow - payload.startRow + 1
    const rows: string[] = []

    for (let row = 0; row < height; row++) {
        const values: string[] = []
        for (let col = 0; col < width; col++) {
            values.push(encodeTsvField(payload.cells[ck(col, row)]?.v ?? ""))
        }
        rows.push(values.join("\t"))
    }

    return rows.join("\n")
}

export function serializeSpreadsheetClipboardToHtml(payload: SpreadsheetClipboardPayload): string {
    const width = payload.endCol - payload.startCol + 1
    const height = payload.endRow - payload.startRow + 1
    const rows: string[] = []

    for (let row = 0; row < height; row++) {
        const cells: string[] = []
        for (let col = 0; col < width; col++) {
            const cell = payload.cells[ck(col, row)] ?? { v: "" }
            const style = cellStyle(cell)
            const styleAttr = style ? ` style="${escapeHtml(style)}"` : ""
            cells.push(`<td${styleAttr}>${escapeHtml(cell.v ?? "")}</td>`)
        }
        rows.push(`<tr>${cells.join("")}</tr>`)
    }

    return `<table>${rows.join("")}</table>`
}

export async function writeSpreadsheetClipboard(payload: SpreadsheetClipboardPayload): Promise<boolean> {
    if (typeof navigator === "undefined" || !navigator.clipboard) return false

    const text = serializeSpreadsheetClipboardToText(payload)
    const html = serializeSpreadsheetClipboardToHtml(payload)

    try {
        if (typeof ClipboardItem !== "undefined" && typeof navigator.clipboard.write === "function") {
            await navigator.clipboard.write([
                new ClipboardItem({
                    "text/plain": new Blob([text], { type: "text/plain" }),
                    "text/html": new Blob([html], { type: "text/html" }),
                }),
            ])
            return true
        }
        await navigator.clipboard.writeText(text)
        return true
    } catch {
        return false
    }
}

export async function readSpreadsheetClipboardText(): Promise<string | null> {
    if (typeof navigator === "undefined" || !navigator.clipboard?.readText) return null
    try {
        return await navigator.clipboard.readText()
    } catch {
        return null
    }
}

export function parseSpreadsheetClipboardText(text: string): ParsedSpreadsheetClipboard | null {
    if (text.length === 0) return null

    const rows = parseTsv(text)
    const rowCount = rows.length
    const colCount = rows.reduce((max, row) => Math.max(max, row.length), 0)
    const cells: Record<string, SpreadsheetCellData> = {}

    rows.forEach((row, rowIndex) => {
        row.forEach((value, colIndex) => {
            cells[ck(colIndex, rowIndex)] = { v: value }
        })
    })

    return { cells, rows: rowCount, cols: colCount }
}