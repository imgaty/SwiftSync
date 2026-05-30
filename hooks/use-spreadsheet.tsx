//
//  use-spreadsheet.tsx
//  Argent
//
//  Created by hilario on 22 May 2026 at 09:36.
//  Description: Provides the use spreadsheet React hook for Argent, encapsulating reusable state,
//  effects, or data-access behavior for consuming components.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import * as React from "react"
import {
    Copy,
    ClipboardPaste,
    Grid3x3,
    Minus,
    PanelBottom,
    PanelLeft,
    PanelRight,
    PanelTop,
    Plus,
    Scissors,
    Square,
    SquareDashed,
    TableCellsMerge,
    TableCellsSplit,
    Trash2,
} from "lucide-react"
import { toast } from "sonner"
import { useSpreadsheetDocuments } from "@/hooks/use-spreadsheet-documents"
import { useLanguage } from "@/components/language-provider"
import type {
    BorderStyle,
    CellBorders,
    FinanceData,
    MergedRange,
    SpreadsheetCellData,
    SpreadsheetDocument,
    SpreadsheetSheetTab,
} from "@/lib/types"
import {
    ck,
    colFromLabel,
    colLabel,
    parseKey,
    isCellEmpty,
    isFormula,
    getFormulaDisplay,
    newWorkbook,
    DEFAULT_COL_W,
    MIN_COL_W,
    ROW_H,
    HEADER_W,
    BUFFER,
    type Workbook,
} from "@/lib/spreadsheet-utils"
import {
    applyNumberFormatToDisplay,
    bumpFormatDecimals,
} from "@/lib/spreadsheet-number-format"
import {
    cloneSpreadsheetCell,
    hasSpreadsheetCellContent,
    parseSpreadsheetClipboardText,
    readSpreadsheetClipboardText,
    serializeSpreadsheetClipboardToText,
    writeSpreadsheetClipboard,
    type SpreadsheetClipboardPayload,
} from "@/lib/spreadsheet-clipboard"

interface UseSpreadsheetOptions {
    initialDoc?: SpreadsheetDocument
    initialTemplateSheets?: SpreadsheetSheetTab[]
    initialTemplateName?: string
    finance?: FinanceData | null
    gridRef?: React.RefObject<HTMLDivElement | null>
    editRef?: React.RefObject<HTMLInputElement | null>
}

function sanitizeCellForSave(cell: SpreadsheetCellData): SpreadsheetCellData {
    const nextCell: SpreadsheetCellData = { v: typeof cell.v === "string" ? cell.v : String(cell.v ?? "") }

    if (cell.b) nextCell.b = true
    if (cell.i) nextCell.i = true
    if (cell.u) nextCell.u = true
    if (cell.s) nextCell.s = true
    if (typeof cell.fs === "number" && Number.isFinite(cell.fs)) nextCell.fs = cell.fs
    if (cell.wrap) nextCell.wrap = true
    if (typeof cell.c === "string") nextCell.c = cell.c
    if (typeof cell.bg === "string") nextCell.bg = cell.bg
    if (cell.al === "l" || cell.al === "c" || cell.al === "r") nextCell.al = cell.al
    if (cell.bd) nextCell.bd = cell.bd

    return nextCell
}

function serializeWorkbookForSave(workbook: Workbook): { sheets: SpreadsheetSheetTab[]; activeSheet: number } {
    return {
        activeSheet: Math.max(0, Math.min(workbook.activeSheet, Math.max(0, workbook.sheets.length - 1))),
        sheets: workbook.sheets.map((sheetItem, sheetIndex) => {
            const cells: Record<string, SpreadsheetCellData> = {}
            for (const [cellKey, cell] of Object.entries(sheetItem.cells ?? {})) {
                if (!cell || typeof cell !== "object") continue
                const savedCell = sanitizeCellForSave(cell)
                if (hasSpreadsheetCellContent(savedCell)) cells[cellKey] = savedCell
            }

            const colWidths = Object.fromEntries(
                Object.entries(sheetItem.colWidths ?? {})
                    .map(([columnIndex, width]) => [columnIndex, Number(width)] as const)
                    .filter(([, width]) => Number.isFinite(width) && width > 0),
            )

            return {
                name: typeof sheetItem.name === "string" && sheetItem.name.trim() ? sheetItem.name : `Sheet ${sheetIndex + 1}`,
                cells,
                ...(Object.keys(colWidths).length > 0 && { colWidths }),
                ...(sheetItem.mergedCells?.length && { mergedCells: sheetItem.mergedCells }),
            }
        }),
    }
}

export function useSpreadsheet({ initialDoc, initialTemplateSheets, initialTemplateName, finance, gridRef: externalGridRef, editRef: externalEditRef }: UseSpreadsheetOptions) {
    const { refetch } = useSpreadsheetDocuments()
    const { t } = useLanguage()
    const sp = ((t as Record<string, unknown>).spreadsheets || {}) as Record<string, string>
    const spRef = React.useRef(sp)
    spRef.current = sp
    const refetchRef = React.useRef(refetch)
    refetchRef.current = refetch

    /* Workbook state */
    const [wb, setWb] = React.useState<Workbook>(() => {
        if (initialDoc) {
            const content = initialDoc.content as unknown as { sheets?: SpreadsheetSheetTab[]; activeSheet?: number }
            if (content?.sheets) return { sheets: content.sheets, activeSheet: content.activeSheet ?? 0 }
        }
        if (initialTemplateSheets) return { sheets: initialTemplateSheets, activeSheet: 0 }
        return newWorkbook()
    })
    const sheet = wb.sheets[wb.activeSheet]

    /* Grid dimensions */
    const [gridSize, setGridSize] = React.useState({ cols: 52, rows: 200 })

    /* Selection */
    const [sel, setSel] = React.useState({ col: 0, row: 0 })
    const [range, setRange] = React.useState<{ sc: number; sr: number; ec: number; er: number } | null>(null)
    const [editing, setEditing] = React.useState<{ col: number; row: number } | null>(null)
    const [editVal, setEditVal] = React.useState("")

    /* Document management */
    const [docId, setDocId] = React.useState<string | null>(initialDoc?.id ?? null)
    const [docName, setDocName] = React.useState(initialDoc?.name ?? initialTemplateName ?? "Untitled spreadsheet")
    const [saving, setSaving] = React.useState(false)
    const [autoSave, setAutoSave] = React.useState(true)
    const autoSaveDirtyRef = React.useRef(false)
    const autoSaveReadyRef = React.useRef(false)
    const autoSaveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
    const savingRef = React.useRef(false)
    const docIdRef = React.useRef(docId)
    const docNameRef = React.useRef(docName)
    const saveToServerRef = React.useRef<(() => Promise<void>) | null>(null)
    React.useEffect(() => { docIdRef.current = docId }, [docId])
    React.useEffect(() => { docNameRef.current = docName }, [docName])

    /* Context menu */
    const [ctxMenu, setCtxMenu] = React.useState<{ x: number; y: number; col: number; row: number } | null>(null)

    /* Clipboard (internal) */
    const clipboardRef = React.useRef<SpreadsheetClipboardPayload | null>(null)
    const lastClipboardTextRef = React.useRef("")

    /* Undo / Redo */
    const historyRef = React.useRef<string[]>([])
    const futureRef = React.useRef<string[]>([])

    const internalGridRef = React.useRef<HTMLDivElement>(null)
    const internalEditRef = React.useRef<HTMLInputElement>(null)
    const gridRef = externalGridRef ?? internalGridRef
    const editRef = externalEditRef ?? internalEditRef
    const isSelecting = React.useRef(false)

    /* ── Virtualization state ────────────────────────────────────────── */
    const scrollPosRef = React.useRef({ top: 0, left: 0 })
    const viewportRef = React.useRef({ w: 1200, h: 600 })
    const [visibleRange, setVisibleRange] = React.useState({ startCol: 0, endCol: 30, startRow: 0, endRow: 30 })

    /* ── Derived ─────────────────────────────────────────────────────── */
    const getCell = React.useCallback(
        (c: number, r: number): SpreadsheetCellData => sheet.cells[ck(c, r)] ?? { v: "" },
        [sheet.cells],
    )

    /** Returns the display value for a cell — evaluates formulas and applies number format */
    const getDisplayValue = React.useCallback(
        (c: number, r: number): string => {
            const cell = sheet.cells[ck(c, r)]
            if (!cell || !cell.v) return ""
            const raw = isFormula(cell.v) ? getFormulaDisplay(cell.v, sheet.cells, finance) : cell.v
            return applyNumberFormatToDisplay(raw, cell.nf)
        },
        [sheet.cells, finance],
    )

    const colW = React.useCallback(
        (c: number): number => (sheet.colWidths?.[c] ?? DEFAULT_COL_W),
        [sheet.colWidths],
    )

    const activeFormat = React.useMemo(() => {
        const cell = getCell(sel.col, sel.row)
        return {
            bold: !!cell.b,
            italic: !!cell.i,
            underline: !!cell.u,
            strikethrough: !!cell.s,
            wrap: !!cell.wrap,
            fontSize: cell.fs ?? 13,
            align: (cell.al ?? "l") as "l" | "c" | "r" | "j",
            valign: (cell.va ?? "t") as "t" | "m" | "b",
            indent: cell.ind ?? 0,
            rotation: cell.rot ?? 0,
        }
    }, [sel, getCell])

    const selectionSummary = React.useMemo(() => {
        const bounds = range
            ? {
                r1: Math.min(range.sr, range.er),
                r2: Math.max(range.sr, range.er),
                c1: Math.min(range.sc, range.ec),
                c2: Math.max(range.sc, range.ec),
            }
            : { r1: sel.row, r2: sel.row, c1: sel.col, c2: sel.col }
        const cellCount = (bounds.r2 - bounds.r1 + 1) * (bounds.c2 - bounds.c1 + 1)
        let filledCount = 0
        let sum = 0
        let min = Number.POSITIVE_INFINITY
        let max = Number.NEGATIVE_INFINITY
        const numbers: number[] = []

        for (let row = bounds.r1; row <= bounds.r2; row++) {
            for (let col = bounds.c1; col <= bounds.c2; col++) {
                const displayValue = getDisplayValue(col, row)
                if (displayValue !== "") filledCount++
                const numericValue = Number(displayValue)
                if (displayValue !== "" && !Number.isNaN(numericValue)) {
                    numbers.push(numericValue)
                    sum += numericValue
                    min = Math.min(min, numericValue)
                    max = Math.max(max, numericValue)
                }
            }
        }

        return {
            address: bounds.c1 === bounds.c2 && bounds.r1 === bounds.r2
                ? `${colLabel(bounds.c1)}${bounds.r1 + 1}`
                : `${colLabel(bounds.c1)}${bounds.r1 + 1}:${colLabel(bounds.c2)}${bounds.r2 + 1}`,
            cellCount,
            filledCount,
            numberCount: numbers.length,
            sum,
            average: numbers.length ? sum / numbers.length : 0,
            min: numbers.length ? min : 0,
            max: numbers.length ? max : 0,
        }
    }, [range, sel, getDisplayValue])

    const colOffsetsRef = React.useRef<number[]>([0])
    const colOffsets = React.useMemo(() => {
        const offsets: number[] = [0]
        for (let c = 0; c < gridSize.cols; c++) {
            offsets.push(offsets[c] + colW(c))
        }
        colOffsetsRef.current = offsets
        return offsets
    }, [gridSize.cols, colW])

    const totalWidth = colOffsets[gridSize.cols] + HEADER_W
    const totalHeight = gridSize.rows * ROW_H + ROW_H

    const computeVisibleRange = React.useCallback(() => {
        const scrollLeft = scrollPosRef.current.left
        const scrollTop = scrollPosRef.current.top
        const vw = viewportRef.current.w
        const vh = viewportRef.current.h
        const offsets = colOffsetsRef.current
        const cols = gridSize.cols
        const rows = gridSize.rows

        let startCol = 0
        for (let c = 0; c < cols; c++) {
            if (offsets[c + 1] + HEADER_W > scrollLeft) { startCol = c; break }
        }
        let endCol = startCol
        for (let c = startCol; c < cols; c++) {
            endCol = c
            if (offsets[c] + HEADER_W > scrollLeft + vw) break
        }

        const startRow = Math.floor(scrollTop / ROW_H)
        const endRow = Math.min(rows - 1, Math.ceil((scrollTop + vh) / ROW_H))

        return {
            startCol: Math.max(0, startCol - BUFFER),
            endCol: Math.min(cols - 1, endCol + BUFFER),
            startRow: Math.max(0, startRow - BUFFER),
            endRow: Math.min(rows - 1, endRow + BUFFER),
        }
    }, [gridSize])

    /* Auto-expand grid when cursor nears edge */
    React.useEffect(() => {
        let changed = false
        let { cols, rows } = gridSize
        if (sel.col >= cols - 5) { cols = sel.col + 30; changed = true }
        if (sel.row >= rows - 10) { rows = sel.row + 50; changed = true }
        if (changed) setGridSize({ cols, rows })
    }, [sel, gridSize])

    React.useEffect(() => {
        if (editing && editRef.current) editRef.current.focus()
    }, [editing, editRef])

    React.useEffect(() => {
        const up = () => { isSelecting.current = false }
        window.addEventListener("mouseup", up)
        return () => window.removeEventListener("mouseup", up)
    }, [])

    const scrollRaf = React.useRef(0)
    const prevRangeRef = React.useRef(visibleRange)

    const updateVisibleRangeIfChanged = React.useCallback(() => {
        const next = computeVisibleRange()
        const prev = prevRangeRef.current
        if (
            next.startCol !== prev.startCol ||
            next.endCol !== prev.endCol ||
            next.startRow !== prev.startRow ||
            next.endRow !== prev.endRow
        ) {
            prevRangeRef.current = next
            setVisibleRange(next)
        }
    }, [computeVisibleRange])

    const handleScroll = React.useCallback((e: React.UIEvent<HTMLDivElement>) => {
        const el = e.currentTarget
        cancelAnimationFrame(scrollRaf.current)
        scrollRaf.current = requestAnimationFrame(() => {
            scrollPosRef.current = { top: el.scrollTop, left: el.scrollLeft }
            updateVisibleRangeIfChanged()
        })
    }, [updateVisibleRangeIfChanged])

    React.useEffect(() => {
        const el = gridRef.current
        if (!el) return
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                viewportRef.current = { w: entry.contentRect.width, h: entry.contentRect.height }
                updateVisibleRangeIfChanged()
            }
        })
        observer.observe(el)
        viewportRef.current = { w: el.clientWidth, h: el.clientHeight }
        return () => observer.disconnect()
    }, [updateVisibleRangeIfChanged, gridRef])

    /* ── Undo helper ─────────────────────────────────────────────────── */
    const wbRef = React.useRef(wb)
    wbRef.current = wb
    const undoTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
    const pushUndo = React.useCallback(() => {
        if (undoTimerRef.current) return
        const snapshot = JSON.stringify(wbRef.current)
        historyRef.current = [...historyRef.current.slice(-50), snapshot]
        futureRef.current = []
        undoTimerRef.current = setTimeout(() => { undoTimerRef.current = null }, 400)
    }, [])

    /* ── Sheet-level helper ──────────────────────────────────────────── */
    const updateActiveSheet = React.useCallback(
        (updater: (sheet: SpreadsheetSheetTab) => SpreadsheetSheetTab) => {
            setWb((prev) => {
                const idx = prev.activeSheet
                const updated = updater(prev.sheets[idx])
                if (updated === prev.sheets[idx]) return prev
                const newSheets = [...prev.sheets]
                newSheets[idx] = updated
                return { ...prev, sheets: newSheets }
            })
        },
        [],
    )

    /* ── Cell mutations ──────────────────────────────────────────────── */
    const updateCell = React.useCallback(
        (c: number, r: number, patch: Partial<SpreadsheetCellData>) => {
            updateActiveSheet((s) => {
                const key = ck(c, r)
                const old = s.cells[key] ?? { v: "" }
                const merged = { ...old, ...patch }
                const newCells = { ...s.cells }
                if (isCellEmpty(merged)) delete newCells[key]; else newCells[key] = merged
                return { ...s, cells: newCells }
            })
        },
        [updateActiveSheet],
    )

    const updateCells = React.useCallback(
        (patches: Array<[col: number, row: number, patch: Partial<SpreadsheetCellData>]>) => {
            updateActiveSheet((s) => {
                const newCells = { ...s.cells }
                for (const [c, r, patch] of patches) {
                    const key = ck(c, r)
                    const old = newCells[key] ?? { v: "" }
                    const merged = { ...old, ...patch }
                    if (isCellEmpty(merged)) delete newCells[key]; else newCells[key] = merged
                }
                return { ...s, cells: newCells }
            })
        },
        [updateActiveSheet],
    )

    const commitEdit = React.useCallback(() => {
        if (!editing) return
        pushUndo()
        updateCell(editing.col, editing.row, { v: editVal })
        setEditing(null)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editing, editVal, updateCell])

    const startEdit = React.useCallback(
        (c: number, r: number, prefill?: string) => {
            const cell = getCell(c, r)
            setEditing({ col: c, row: r })
            setEditVal(prefill ?? cell.v)
            setSel({ col: c, row: r })
        },
        [getCell],
    )

    /* ── Format helpers ──────────────────────────────────────────────── */
    const getSelectionBounds = React.useCallback(() => {
        if (range) {
            return {
                r1: Math.min(range.sr, range.er),
                r2: Math.max(range.sr, range.er),
                c1: Math.min(range.sc, range.ec),
                c2: Math.max(range.sc, range.ec),
            }
        }
        return { r1: sel.row, r2: sel.row, c1: sel.col, c2: sel.col }
    }, [range, sel])

    const applyFormat = React.useCallback(
        (patch: Partial<SpreadsheetCellData>) => {
            pushUndo()
            const { r1, r2, c1, c2 } = getSelectionBounds()
            const patches: Array<[number, number, Partial<SpreadsheetCellData>]> = []
            for (let r = r1; r <= r2; r++) {
                for (let c = c1; c <= c2; c++) patches.push([c, r, patch])
            }
            updateCells(patches)
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [getSelectionBounds, updateCells],
    )

    const toggleFormat = React.useCallback(
        (key: 'b' | 'i' | 'u' | 's' | 'wrap') => {
            const cell = getCell(sel.col, sel.row)
            applyFormat({ [key]: !cell[key] || undefined })
        },
        [sel, getCell, applyFormat],
    )

    const setAlignment = React.useCallback(
        (al: "l" | "c" | "r" | "j") => applyFormat({ al: al === "l" ? undefined : al }),
        [applyFormat],
    )

    const setVerticalAlign = React.useCallback(
        (va: "t" | "m" | "b") => applyFormat({ va: va === "t" ? undefined : va }),
        [applyFormat],
    )

    const bumpIndent = React.useCallback((delta: number) => {
        pushUndo()
        const { r1, r2, c1, c2 } = getSelectionBounds()
        const patches: Array<[number, number, Partial<SpreadsheetCellData>]> = []
        for (let r = r1; r <= r2; r++) {
            for (let c = c1; c <= c2; c++) {
                const cur = getCell(c, r).ind ?? 0
                const next = Math.max(0, Math.min(15, cur + delta))
                patches.push([c, r, { ind: next === 0 ? undefined : next }])
            }
        }
        updateCells(patches)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getSelectionBounds, getCell, updateCells])

    const setRotation = React.useCallback((rot: number | undefined) => {
        applyFormat({ rot: rot && rot !== 0 ? rot : undefined })
    }, [applyFormat])

    const setFontSize = React.useCallback(
        (fs: number) => applyFormat({ fs: fs === 13 ? undefined : fs }),
        [applyFormat],
    )

    /* ── Excel-style font / number-format helpers ────────────────────── */
    const setFontFamily = React.useCallback(
        (ff: string) => applyFormat({ ff: ff || undefined }),
        [applyFormat],
    )

    const bumpFontSize = React.useCallback((delta: number) => {
        const cur = getCell(sel.col, sel.row).fs ?? 13
        const next = Math.max(6, Math.min(96, cur + delta))
        applyFormat({ fs: next === 13 ? undefined : next })
    }, [sel, getCell, applyFormat])

    const applyNumberFormat = React.useCallback((nf: string | undefined) => {
        applyFormat({ nf: nf && nf !== "general" ? nf : undefined })
    }, [applyFormat])

    const bumpDecimals = React.useCallback((delta: number) => {
        pushUndo()
        const { r1, r2, c1, c2 } = getSelectionBounds()
        const patches: Array<[number, number, Partial<SpreadsheetCellData>]> = []
        for (let r = r1; r <= r2; r++) {
            for (let c = c1; c <= c2; c++) {
                const cur = getCell(c, r).nf
                const next = bumpFormatDecimals(cur, delta)
                patches.push([c, r, { nf: next }])
            }
        }
        updateCells(patches)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getSelectionBounds, getCell, updateCells])

    /* ── Format painter ──────────────────────────────────────────────── */
    const [paintFormat, setPaintFormat] = React.useState<Partial<SpreadsheetCellData> | null>(null)

    const startFormatPainter = React.useCallback(() => {
        const c = getCell(sel.col, sel.row)
        const { v: _v, ...fmt } = c
        void _v
        setPaintFormat(fmt)
        toast.info("Format painter armed — select cells to paint")
    }, [sel, getCell])

    const applyPaintedFormat = React.useCallback(() => {
        if (!paintFormat) return false
        applyFormat(paintFormat)
        setPaintFormat(null)
        return true
    }, [paintFormat, applyFormat])

    /* ── Clear actions ───────────────────────────────────────────────── */
    const FMT_CLEAR_PATCH: Partial<SpreadsheetCellData> = {
        b: undefined, i: undefined, u: undefined, s: undefined,
        fs: undefined, ff: undefined, wrap: undefined,
        c: undefined, bg: undefined, al: undefined, bd: undefined, nf: undefined,
        va: undefined, ind: undefined, rot: undefined,
    }

    const clearFormats = React.useCallback(() => {
        applyFormat(FMT_CLEAR_PATCH)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [applyFormat])

    const clearContents = React.useCallback(() => {
        pushUndo()
        const { r1, r2, c1, c2 } = getSelectionBounds()
        const patches: Array<[number, number, Partial<SpreadsheetCellData>]> = []
        for (let r = r1; r <= r2; r++) {
            for (let c = c1; c <= c2; c++) patches.push([c, r, { v: "" }])
        }
        updateCells(patches)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getSelectionBounds, updateCells])

    const clearAll = React.useCallback(() => {
        pushUndo()
        const { r1, r2, c1, c2 } = getSelectionBounds()
        const patches: Array<[number, number, Partial<SpreadsheetCellData>]> = []
        for (let r = r1; r <= r2; r++) {
            for (let c = c1; c <= c2; c++) patches.push([c, r, { v: "", ...FMT_CLEAR_PATCH }])
        }
        updateCells(patches)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getSelectionBounds, updateCells])

    /* ── Cell styles & table styles ──────────────────────────────────── */
    const applyCellStyle = React.useCallback((style: Partial<SpreadsheetCellData>) => {
        applyFormat(style)
    }, [applyFormat])

    const applyTableStyle = React.useCallback((variant: "striped" | "bordered" | "minimal" = "striped") => {
        pushUndo()
        const { r1, r2, c1, c2 } = getSelectionBounds()
        const patches: Array<[number, number, Partial<SpreadsheetCellData>]> = []
        const headerBg = "#1e3a8a"
        const headerColor = "#ffffff"
        const stripeBg = "#f1f5f9"
        const border = { style: "thin" as BorderStyle, color: "#cbd5e1" }
        for (let r = r1; r <= r2; r++) {
            for (let c = c1; c <= c2; c++) {
                const isHeader = r === r1
                const stripe = (r - r1) % 2 === 0
                const patch: Partial<SpreadsheetCellData> = {}
                if (isHeader) {
                    patch.b = true
                    patch.bg = headerBg
                    patch.c = headerColor
                } else if (variant === "striped") {
                    patch.bg = stripe ? undefined : stripeBg
                    patch.c = undefined
                }
                if (variant !== "minimal") {
                    patch.bd = { t: border, b: border, l: border, r: border }
                }
                patches.push([c, r, patch])
            }
        }
        updateCells(patches)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getSelectionBounds, updateCells])

    /* ── Conditional formatting (one-shot apply) ─────────────────────── */
    const applyConditionalFormat = React.useCallback((
        rule: "gt" | "lt" | "eq" | "between" | "top10" | "colorScale" | "dataBar",
        opts: { value?: number; value2?: number; color?: string; bg?: string } = {},
    ) => {
        pushUndo()
        const { r1, r2, c1, c2 } = getSelectionBounds()
        const cells: Array<{ c: number; r: number; n: number }> = []
        for (let r = r1; r <= r2; r++) {
            for (let c = c1; c <= c2; c++) {
                const raw = getCell(c, r).v
                const n = Number(raw)
                if (Number.isFinite(n) && raw !== "") cells.push({ c, r, n })
            }
        }
        if (!cells.length) { toast.info("No numeric values in selection"); return }
        const patches: Array<[number, number, Partial<SpreadsheetCellData>]> = []
        const bg = opts.bg ?? "#fde68a"
        const c = opts.color ?? "#7c2d12"

        if (rule === "colorScale") {
            const min = Math.min(...cells.map((x) => x.n))
            const max = Math.max(...cells.map((x) => x.n))
            const span = max - min || 1
            for (const x of cells) {
                const t = (x.n - min) / span
                // green → yellow → red
                const r = Math.round(255 * Math.min(1, t * 2))
                const g = Math.round(255 * Math.min(1, (1 - t) * 2))
                const hex = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}80`
                patches.push([x.c, x.r, { bg: hex }])
            }
        } else if (rule === "dataBar") {
            const max = Math.max(...cells.map((x) => Math.abs(x.n))) || 1
            for (const x of cells) {
                const pct = Math.round((Math.abs(x.n) / max) * 100)
                patches.push([x.c, x.r, { bg: `linear-gradient(to right, #93c5fd ${pct}%, transparent ${pct}%)` }])
            }
        } else if (rule === "top10") {
            const sorted = [...cells].sort((a, b) => b.n - a.n)
            const cutoff = Math.max(1, Math.ceil(cells.length * 0.1))
            const top = new Set(sorted.slice(0, cutoff).map((x) => `${x.c}:${x.r}`))
            for (const x of cells) {
                if (top.has(`${x.c}:${x.r}`)) patches.push([x.c, x.r, { bg, c }])
            }
        } else {
            const v1 = opts.value ?? 0
            const v2 = opts.value2 ?? 0
            for (const x of cells) {
                const match =
                    rule === "gt" ? x.n > v1 :
                    rule === "lt" ? x.n < v1 :
                    rule === "eq" ? x.n === v1 :
                    /* between */ x.n >= Math.min(v1, v2) && x.n <= Math.max(v1, v2)
                if (match) patches.push([x.c, x.r, { bg, c }])
            }
        }

        if (patches.length) updateCells(patches)
        else toast.info("No cells matched the condition")
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getSelectionBounds, getCell, updateCells])

    /* ── Find & Replace ──────────────────────────────────────────────── */
    const findReplace = React.useCallback((
        find: string,
        replace: string,
        opts: { matchCase?: boolean; whole?: boolean; replaceAll?: boolean } = {},
    ): number => {
        if (!find) return 0
        pushUndo()
        const flags = opts.matchCase ? "g" : "gi"
        const escaped = find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        const pattern = opts.whole ? `\\b${escaped}\\b` : escaped
        const re = new RegExp(pattern, flags)
        const patches: Array<[number, number, Partial<SpreadsheetCellData>]> = []
        let count = 0
        for (const [key, cell] of Object.entries(sheet.cells)) {
            if (!cell.v) continue
            if (re.test(cell.v)) {
                re.lastIndex = 0
                const next = cell.v.replace(re, replace)
                if (next !== cell.v) {
                    const parsed = ck(0, 0).match(/\D+/)
                    void parsed
                    const m = key.match(/^([A-Z]+)(\d+)$/)
                    if (!m) continue
                    let colNum = 0
                    for (const ch of m[1]) colNum = colNum * 26 + (ch.charCodeAt(0) - 64)
                    patches.push([colNum - 1, parseInt(m[2], 10) - 1, { v: next }])
                    count++
                    if (!opts.replaceAll) break
                }
            }
        }
        if (patches.length) updateCells(patches)
        return count
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sheet.cells, updateCells])

    /* ── AutoSum & Filter ────────────────────────────────────────────── */
    const autoSum = React.useCallback((fn: "SUM" | "AVERAGE" | "COUNT" | "MAX" | "MIN" = "SUM") => {
        const { r1, r2, c1, c2 } = getSelectionBounds()
        const targetRow = r2 + 1
        const startA1 = `${String.fromCharCode(65 + c1)}${r1 + 1}`
        const endA1 = `${String.fromCharCode(65 + c2)}${r2 + 1}`
        // Apply to each column in the selection
        pushUndo()
        const patches: Array<[number, number, Partial<SpreadsheetCellData>]> = []
        for (let c = c1; c <= c2; c++) {
            const colA1 = String.fromCharCode(65 + c)
            const formula = `=${fn}(${colA1}${r1 + 1}:${colA1}${r2 + 1})`
            patches.push([c, targetRow, { v: formula, b: true }])
        }
        updateCells(patches)
        toast.success(`${fn} applied`)
        void startA1; void endA1
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getSelectionBounds, updateCells])


    /* ── Merge helpers ───────────────────────────────────────────────── */
    const getMergedCells = React.useCallback((): MergedRange[] => sheet.mergedCells ?? [], [sheet.mergedCells])

    const findMerge = React.useCallback((c: number, r: number): MergedRange | undefined => {
        return getMergedCells().find((m) => c >= m.sc && c <= m.ec && r >= m.sr && r <= m.er)
    }, [getMergedCells])

    const mergeCells = React.useCallback(() => {
        const { r1, r2, c1, c2 } = getSelectionBounds()
        if (r1 === r2 && c1 === c2) { toast.info("Select multiple cells to merge"); return }
        pushUndo()
        updateActiveSheet((s) => {
            const existing = (s.mergedCells ?? []).filter((m) =>
                !(m.sc <= c2 && m.ec >= c1 && m.sr <= r2 && m.er >= r1)
            )
            return { ...s, mergedCells: [...existing, { sc: c1, sr: r1, ec: c2, er: r2 }] }
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getSelectionBounds, updateActiveSheet])

    const unmergeCells = React.useCallback(() => {
        const { r1, r2, c1, c2 } = getSelectionBounds()
        pushUndo()
        updateActiveSheet((s) => {
            const filtered = (s.mergedCells ?? []).filter((m) =>
                !(m.sc <= c2 && m.ec >= c1 && m.sr <= r2 && m.er >= r1)
            )
            return { ...s, mergedCells: filtered.length ? filtered : undefined }
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getSelectionBounds, updateActiveSheet])

    const isSelectionMerged = React.useMemo(() => {
        const { r1, r2, c1, c2 } = getSelectionBounds()
        return getMergedCells().some((m) => m.sc <= c2 && m.ec >= c1 && m.sr <= r2 && m.er >= r1)
    }, [getSelectionBounds, getMergedCells])

    const toggleMerge = React.useCallback(() => {
        if (isSelectionMerged) unmergeCells()
        else mergeCells()
    }, [isSelectionMerged, mergeCells, unmergeCells])

    /* ── Border helpers ──────────────────────────────────────────────── */
    const applyBorders = React.useCallback(
        (type: "all" | "outer" | "none" | "top" | "bottom" | "left" | "right", style: BorderStyle = "thin", color: string = "#000000") => {
            pushUndo()
            const { r1, r2, c1, c2 } = getSelectionBounds()
            const patches: Array<[number, number, Partial<SpreadsheetCellData>]> = []

            if (type === "none") {
                for (let r = r1; r <= r2; r++) {
                    for (let c = c1; c <= c2; c++) patches.push([c, r, { bd: undefined }])
                }
                updateCells(patches)
                return
            }

            const bd = { style, color }
            for (let r = r1; r <= r2; r++) {
                for (let c = c1; c <= c2; c++) {
                    const existing = getCell(c, r).bd ?? {}
                    const next: CellBorders = { ...existing }

                    if (type === "all") {
                        next.t = bd; next.r = bd; next.b = bd; next.l = bd
                    } else if (type === "outer") {
                        if (r === r1) next.t = bd
                        if (r === r2) next.b = bd
                        if (c === c1) next.l = bd
                        if (c === c2) next.r = bd
                    } else if (type === "top") {
                        if (r === r1) next.t = bd
                    } else if (type === "bottom") {
                        if (r === r2) next.b = bd
                    } else if (type === "left") {
                        if (c === c1) next.l = bd
                    } else if (type === "right") {
                        if (c === c2) next.r = bd
                    }

                    patches.push([c, r, { bd: Object.keys(next).length ? next : undefined }])
                }
            }
            updateCells(patches)
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [getSelectionBounds, getCell, updateCells],
    )

    /* ── Clipboard actions ───────────────────────────────────────────── */
    const copySelection = React.useCallback((cut = false) => {
        const { r1, r2, c1, c2 } = getSelectionBounds()
        const cells: Record<string, SpreadsheetCellData> = {}
        for (let r = r1; r <= r2; r++) {
            for (let c = c1; c <= c2; c++) {
                const cell = getCell(c, r)
                if (hasSpreadsheetCellContent(cell)) {
                    cells[ck(c - c1, r - r1)] = cloneSpreadsheetCell(cell)
                }
            }
        }
        const payload = { cells, startCol: c1, startRow: r1, endCol: c2, endRow: r2, cut }
        clipboardRef.current = payload
        lastClipboardTextRef.current = serializeSpreadsheetClipboardToText(payload)
        void writeSpreadsheetClipboard(payload)
        if (cut) {
            pushUndo()
            const patches: Array<[number, number, Partial<SpreadsheetCellData>]> = []
            const clear = { v: "", b: undefined, i: undefined, u: undefined, s: undefined, fs: undefined, wrap: undefined, c: undefined, bg: undefined, al: undefined, bd: undefined }
            for (let r = r1; r <= r2; r++) {
                for (let c = c1; c <= c2; c++) patches.push([c, r, clear])
            }
            updateCells(patches)
        }
        toast.success(cut ? (sp.cells_cut || "Cells cut") : (sp.cells_copied || "Cells copied"))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getSelectionBounds, getCell, updateCells])

    const pasteSelection = React.useCallback(async () => {
        const clip = clipboardRef.current
        const systemText = await readSpreadsheetClipboardText()
        const externalPaste = systemText !== null && systemText !== "" && (!clip || systemText !== lastClipboardTextRef.current)
        const parsed = externalPaste ? parseSpreadsheetClipboardText(systemText) : null

        if (!clip && !parsed) { toast.info(sp.nothing_to_paste || "Nothing to paste"); return }
        pushUndo()
        const patches: Array<[number, number, Partial<SpreadsheetCellData>]> = []
        if (parsed) {
            for (const [key, cell] of Object.entries(parsed.cells)) {
                const coords = parseKey(key)
                if (!coords) continue
                patches.push([sel.col + coords.col, sel.row + coords.row, cloneSpreadsheetCell(cell)])
            }
        } else if (clip) {
            const width = clip.endCol - clip.startCol + 1
            const height = clip.endRow - clip.startRow + 1
            for (let row = 0; row < height; row++) {
                for (let col = 0; col < width; col++) {
                    patches.push([sel.col + col, sel.row + row, cloneSpreadsheetCell(clip.cells[ck(col, row)] ?? { v: "" })])
                }
            }
        }
        updateCells(patches)
        toast.success(sp.pasted || "Pasted")
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sel, updateCells])

    /* ── Insert / Delete rows & cols ─────────────────────────────────── */
    const insertRow = React.useCallback((at: number, count = 1) => {
        pushUndo()
        updateActiveSheet((s) => {
            const newCells: Record<string, SpreadsheetCellData> = {}
            for (const [key, cell] of Object.entries(s.cells)) {
                const p = parseKey(key)
                if (!p) continue
                if (p.row >= at) newCells[ck(p.col, p.row + count)] = cell
                else newCells[key] = cell
            }
            const newMerged = s.mergedCells?.map((m) => ({
                ...m,
                sr: m.sr >= at ? m.sr + count : m.sr,
                er: m.er >= at ? m.er + count : m.er,
            }))
            return { ...s, cells: newCells, mergedCells: newMerged }
        })
        setGridSize((prev) => ({ ...prev, rows: prev.rows + count }))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [updateActiveSheet])

    const deleteRow = React.useCallback((at: number, count = 1) => {
        pushUndo()
        updateActiveSheet((s) => {
            const newCells: Record<string, SpreadsheetCellData> = {}
            for (const [key, cell] of Object.entries(s.cells)) {
                const p = parseKey(key)
                if (!p) continue
                if (p.row >= at && p.row < at + count) continue
                if (p.row >= at + count) newCells[ck(p.col, p.row - count)] = cell
                else newCells[key] = cell
            }
            const newMerged = s.mergedCells
                ?.map((m) => ({
                    ...m,
                    sr: m.sr >= at + count ? m.sr - count : m.sr >= at ? at : m.sr,
                    er: m.er >= at + count ? m.er - count : m.er >= at ? at - 1 : m.er,
                }))
                .filter((m) => m.sr <= m.er)
            return { ...s, cells: newCells, mergedCells: newMerged?.length ? newMerged : undefined }
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [updateActiveSheet])

    const insertCol = React.useCallback((at: number, count = 1) => {
        pushUndo()
        updateActiveSheet((s) => {
            const newCells: Record<string, SpreadsheetCellData> = {}
            for (const [key, cell] of Object.entries(s.cells)) {
                const p = parseKey(key)
                if (!p) continue
                if (p.col >= at) newCells[ck(p.col + count, p.row)] = cell
                else newCells[key] = cell
            }
            const newWidths = s.colWidths ? Object.fromEntries(
                Object.entries(s.colWidths).map(([k, v]) => {
                    const c = Number(k)
                    return [c >= at ? c + count : c, v]
                })
            ) : undefined
            const newMerged = s.mergedCells?.map((m) => ({
                ...m,
                sc: m.sc >= at ? m.sc + count : m.sc,
                ec: m.ec >= at ? m.ec + count : m.ec,
            }))
            return { ...s, cells: newCells, colWidths: newWidths, mergedCells: newMerged }
        })
        setGridSize((prev) => ({ ...prev, cols: prev.cols + count }))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [updateActiveSheet])

    const deleteCol = React.useCallback((at: number, count = 1) => {
        pushUndo()
        updateActiveSheet((s) => {
            const newCells: Record<string, SpreadsheetCellData> = {}
            for (const [key, cell] of Object.entries(s.cells)) {
                const p = parseKey(key)
                if (!p) continue
                if (p.col >= at && p.col < at + count) continue
                if (p.col >= at + count) newCells[ck(p.col - count, p.row)] = cell
                else newCells[key] = cell
            }
            const newWidths = s.colWidths ? Object.fromEntries(
                Object.entries(s.colWidths)
                    .filter(([k]) => { const c = Number(k); return c < at || c >= at + count })
                    .map(([k, v]) => { const c = Number(k); return [c >= at + count ? c - count : c, v] })
            ) : undefined
            const newMerged = s.mergedCells
                ?.map((m) => ({
                    ...m,
                    sc: m.sc >= at + count ? m.sc - count : m.sc >= at ? at : m.sc,
                    ec: m.ec >= at + count ? m.ec - count : m.ec >= at ? at - 1 : m.ec,
                }))
                .filter((m) => m.sc <= m.ec)
            return { ...s, cells: newCells, colWidths: newWidths, mergedCells: newMerged?.length ? newMerged : undefined }
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [updateActiveSheet])

    const moveSelection = React.useCallback((next: { col: number; row: number }, extend = false) => {
        const bounded = {
            col: Math.max(0, Math.min(gridSize.cols - 1, next.col)),
            row: Math.max(0, Math.min(gridSize.rows - 1, next.row)),
        }
        const merge = findMerge(bounded.col, bounded.row)
        const adjusted = merge ? { col: merge.sc, row: merge.sr } : bounded

        if (extend) {
            const anchor = range ? { col: range.sc, row: range.sr } : sel
            setRange({ sc: anchor.col, sr: anchor.row, ec: adjusted.col, er: adjusted.row })
        } else {
            setRange(null)
        }
        setSel(adjusted)
    }, [findMerge, gridSize, range, sel])

    const findDataEdge = React.useCallback((key: string) => {
        const maxCol = gridSize.cols - 1
        const maxRow = gridSize.rows - 1
        const horizontal = key === "ArrowLeft" || key === "ArrowRight"
        const direction = key === "ArrowLeft" || key === "ArrowUp" ? -1 : 1
        const currentIndex = horizontal ? sel.col : sel.row
        const maxIndex = horizontal ? maxCol : maxRow
        const edge = direction === 1 ? maxIndex : 0
        const inBounds = (index: number) => index >= 0 && index <= maxIndex
        const hasValue = (index: number) => {
            const col = horizontal ? index : sel.col
            const row = horizontal ? sel.row : index
            return getCell(col, row).v !== ""
        }

        let index = currentIndex + direction
        if (!inBounds(index)) return sel

        if (hasValue(currentIndex) && hasValue(index)) {
            while (inBounds(index + direction) && hasValue(index + direction)) {
                index += direction
            }
        } else {
            while (inBounds(index + direction) && !hasValue(index)) {
                index += direction
            }
            if (!hasValue(index)) index = edge
        }

        return horizontal ? { col: index, row: sel.row } : { col: sel.col, row: index }
    }, [getCell, gridSize, sel])

    const moveByKey = React.useCallback((key: string, extend = false, jump = false) => {
        if (jump) {
            moveSelection(findDataEdge(key), extend)
            return
        }

        if (key === "ArrowUp") moveSelection({ col: sel.col, row: sel.row - 1 }, extend)
        else if (key === "ArrowDown") {
            const currentMerge = findMerge(sel.col, sel.row)
            moveSelection({ col: sel.col, row: currentMerge ? currentMerge.er + 1 : sel.row + 1 }, extend)
        }
        else if (key === "ArrowLeft") moveSelection({ col: sel.col - 1, row: sel.row }, extend)
        else if (key === "ArrowRight") {
            const currentMerge = findMerge(sel.col, sel.row)
            moveSelection({ col: currentMerge ? currentMerge.ec + 1 : sel.col + 1, row: sel.row }, extend)
        }
    }, [findDataEdge, findMerge, moveSelection, sel])

    const clearSelectionValues = React.useCallback(() => {
        pushUndo()
        const { r1, r2, c1, c2 } = getSelectionBounds()
        const patches: Array<[number, number, Partial<SpreadsheetCellData>]> = []
        for (let r = r1; r <= r2; r++) {
            for (let c = c1; c <= c2; c++) patches.push([c, r, { v: "" }])
        }
        updateCells(patches)
    }, [getSelectionBounds, pushUndo, updateCells])

    const fillSelection = React.useCallback((direction: "down" | "right") => {
        const { r1, r2, c1, c2 } = getSelectionBounds()
        if ((direction === "down" && r1 === r2) || (direction === "right" && c1 === c2)) {
            toast.info(direction === "down" ? "Select cells below the source row first" : "Select cells to the right of the source column first")
            return
        }

        pushUndo()
        const patches: Array<[number, number, Partial<SpreadsheetCellData>]> = []
        if (direction === "down") {
            for (let c = c1; c <= c2; c++) {
                const source = cloneSpreadsheetCell(getCell(c, r1))
                for (let r = r1 + 1; r <= r2; r++) patches.push([c, r, source])
            }
        } else {
            for (let r = r1; r <= r2; r++) {
                const source = cloneSpreadsheetCell(getCell(c1, r))
                for (let c = c1 + 1; c <= c2; c++) patches.push([c, r, source])
            }
        }
        updateCells(patches)
    }, [getSelectionBounds, getCell, pushUndo, updateCells])

    const fillDown = React.useCallback(() => fillSelection("down"), [fillSelection])
    const fillRight = React.useCallback(() => fillSelection("right"), [fillSelection])

    /* ── Keyboard navigation ─────────────────────────────────────────── */
    const handleGridKeyDown = React.useCallback(
        (e: React.KeyboardEvent) => {
            if (ctxMenu) return

            if (editing) {
                if (e.key === "Escape") { setEditing(null); return }
                if (e.key === "Enter") {
                    e.preventDefault()
                    commitEdit()
                    setRange(null)
                    setSel((p) => ({ ...p, row: Math.max(0, p.row + (e.shiftKey ? -1 : 1)) }))
                    return
                }
                if (e.key === "Tab") {
                    e.preventDefault()
                    commitEdit()
                    setRange(null)
                    setSel((p) => ({ ...p, col: e.shiftKey ? Math.max(0, p.col - 1) : p.col + 1 }))
                    return
                }
                return
            }

            const shortcut = e.metaKey || e.ctrlKey
            const lowerKey = e.key.toLowerCase()

            if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
                e.preventDefault()
                moveByKey(e.key, e.shiftKey, shortcut)
            } else if (e.key === "Tab") {
                e.preventDefault()
                moveSelection({ col: sel.col + (e.shiftKey ? -1 : 1), row: sel.row })
            } else if (e.key === "Enter") {
                e.preventDefault()
                moveSelection({ col: sel.col, row: sel.row + (e.shiftKey ? -1 : 1) })
            } else if (e.key === "F2") {
                e.preventDefault()
                startEdit(sel.col, sel.row)
            } else if (e.key === "Home") {
                e.preventDefault()
                moveSelection(shortcut ? { col: 0, row: 0 } : { col: 0, row: sel.row }, e.shiftKey)
            } else if (e.key === "End") {
                e.preventDefault()
                moveSelection(shortcut ? { col: gridSize.cols - 1, row: gridSize.rows - 1 } : { col: gridSize.cols - 1, row: sel.row }, e.shiftKey)
            } else if (e.key === "PageUp" || e.key === "PageDown") {
                e.preventDefault()
                const pageRows = Math.max(1, Math.floor((viewportRef.current.h - ROW_H) / ROW_H))
                moveSelection({ col: sel.col, row: sel.row + (e.key === "PageUp" ? -pageRows : pageRows) }, e.shiftKey)
            } else if (e.key === "Delete" || e.key === "Backspace") {
                clearSelectionValues()
            } else if (shortcut && lowerKey === "z") {
                e.preventDefault()
                if (e.shiftKey) {
                    if (futureRef.current.length > 0) { historyRef.current.push(JSON.stringify(wbRef.current)); setWb(JSON.parse(futureRef.current.pop()!)) }
                } else {
                    if (historyRef.current.length > 0) { futureRef.current.push(JSON.stringify(wbRef.current)); setWb(JSON.parse(historyRef.current.pop()!)) }
                }
            } else if (shortcut && lowerKey === "y") {
                e.preventDefault()
                if (futureRef.current.length > 0) { historyRef.current.push(JSON.stringify(wbRef.current)); setWb(JSON.parse(futureRef.current.pop()!)) }
            } else if (shortcut && lowerKey === "s") {
                e.preventDefault()
                void saveToServerRef.current?.()
            } else if (shortcut && lowerKey === "a") {
                e.preventDefault()
                setRange({ sc: 0, sr: 0, ec: gridSize.cols - 1, er: gridSize.rows - 1 })
                setSel({ col: 0, row: 0 })
            } else if (shortcut && lowerKey === "d") {
                e.preventDefault()
                fillSelection("down")
            } else if (shortcut && lowerKey === "r") {
                e.preventDefault()
                fillSelection("right")
            } else if (shortcut && lowerKey === "b") {
                e.preventDefault()
                toggleFormat("b")
            } else if (shortcut && lowerKey === "i") {
                e.preventDefault()
                toggleFormat("i")
            } else if (shortcut && lowerKey === "u") {
                e.preventDefault()
                toggleFormat("u")
            } else if (shortcut && lowerKey === "c") {
                e.preventDefault()
                copySelection()
            } else if (shortcut && lowerKey === "x") {
                e.preventDefault()
                copySelection(true)
            } else if (shortcut && lowerKey === "v") {
                e.preventDefault()
                void pasteSelection()
            } else if (e.key.length === 1 && !shortcut) {
                startEdit(sel.col, sel.row, e.key)
            }
        },
        [editing, commitEdit, startEdit, sel, toggleFormat, ctxMenu, copySelection, pasteSelection, moveByKey, moveSelection, clearSelectionValues, fillSelection, gridSize],
    )

    /* ── Mouse selection ─────────────────────────────────────────────── */
    const handleCellMouseDown = React.useCallback(
        (c: number, r: number, e: React.MouseEvent) => {
            if (e.button === 2) return
            if (editing) commitEdit()
            const merge = findMerge(c, r)
            if (e.shiftKey) {
                const ec = merge ? merge.ec : c
                const er = merge ? merge.er : r
                setRange({ sc: sel.col, sr: sel.row, ec, er })
            } else {
                const sc = merge ? merge.sc : c
                const sr = merge ? merge.sr : r
                setSel({ col: sc, row: sr })
                if (merge) {
                    setRange({ sc: merge.sc, sr: merge.sr, ec: merge.ec, er: merge.er })
                } else {
                    setRange(null)
                }
                isSelecting.current = true
            }
        },
        [editing, commitEdit, sel, findMerge],
    )

    const handleCellMouseEnter = React.useCallback(
        (c: number, r: number) => {
            if (isSelecting.current) {
                const merge = findMerge(c, r)
                const ec = merge ? merge.ec : c
                const er = merge ? merge.er : r
                setRange({ sc: sel.col, sr: sel.row, ec, er })
            }
        },
        [sel, findMerge],
    )

    const handleContextMenu = React.useCallback((c: number, r: number, e: React.MouseEvent) => {
        e.preventDefault()
        if (!range || !isInRangeFn(c, r)) {
            setSel({ col: c, row: r })
            setRange(null)
        }
        setCtxMenu({ x: e.clientX, y: e.clientY, col: c, row: r })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [range, sel])

    /* ── Range check ─────────────────────────────────────────────────── */
    const isInRangeFn = React.useCallback(
        (c: number, r: number) => {
            if (!range) return false
            const r1 = Math.min(range.sr, range.er)
            const r2 = Math.max(range.sr, range.er)
            const c1 = Math.min(range.sc, range.ec)
            const c2 = Math.max(range.sc, range.ec)
            return r >= r1 && r <= r2 && c >= c1 && c <= c2
        },
        [range],
    )

    /* ── Column resize ───────────────────────────────────────────────── */
    const startColResize = React.useCallback(
        (colIndex: number, e: React.MouseEvent) => {
            e.preventDefault()
            e.stopPropagation()
            const startX = e.clientX
            const startW = colW(colIndex)
            let raf = 0

            const onMove = (ev: MouseEvent) => {
                cancelAnimationFrame(raf)
                raf = requestAnimationFrame(() => {
                    const w = Math.max(MIN_COL_W, startW + ev.clientX - startX)
                    updateActiveSheet((s) => ({ ...s, colWidths: { ...s.colWidths, [colIndex]: w } }))
                })
            }

            const onUp = () => {
                cancelAnimationFrame(raf)
                window.removeEventListener("mousemove", onMove)
                window.removeEventListener("mouseup", onUp)
            }
            window.addEventListener("mousemove", onMove)
            window.addEventListener("mouseup", onUp)
        },
        [colW, updateActiveSheet],
    )

    /* Scroll selected cell into view */
    React.useEffect(() => {
        const el = gridRef.current
        if (!el) return
        const cellLeft = colOffsets[sel.col] + HEADER_W
        const cellRight = cellLeft + colW(sel.col)
        const cellTop = sel.row * ROW_H + ROW_H
        const cellBottom = cellTop + ROW_H

        if (cellLeft < el.scrollLeft + HEADER_W) el.scrollLeft = cellLeft - HEADER_W
        else if (cellRight > el.scrollLeft + el.clientWidth) el.scrollLeft = cellRight - el.clientWidth + 4

        if (cellTop < el.scrollTop + ROW_H) el.scrollTop = cellTop - ROW_H
        else if (cellBottom > el.scrollTop + el.clientHeight) el.scrollTop = cellBottom - el.clientHeight + 4
    }, [sel, colOffsets, colW, gridRef])

    /* ── Save / Load / Export ────────────────────────────────────────── */
    const saveToServer = React.useCallback(async () => {
        const currentName = docNameRef.current
        const currentId = docIdRef.current
        const currentWb = wbRef.current
        const content = serializeWorkbookForSave(currentWb)
        if (!currentName.trim()) { toast.error(spRef.current.enter_name_first || "Enter a name first"); return }
        if (savingRef.current) return
        setSaving(true)
        savingRef.current = true
        try {
            const endpoint = currentId ? `/api/spreadsheets/${currentId}` : "/api/spreadsheets"
            const method = currentId ? "PATCH" : "POST"
            const res = await fetch(endpoint, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: currentName.trim(),
                    sheetType: "grid",
                    content,
                }),
            })
            const payload = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(payload.error || "Save failed")
            setDocId(payload.id)
            docIdRef.current = payload.id
            refetchRef.current()
        } catch (err) {
            console.error("[spreadsheet save]", err)
            toast.error(err instanceof Error ? err.message : "Save failed")
        } finally {
            setSaving(false)
            savingRef.current = false
        }
    }, [])

    React.useEffect(() => {
        saveToServerRef.current = saveToServer
    }, [saveToServer])

    const exportXlsx = async () => {
        const ExcelJS = (await import("exceljs")).default
        const workbook = new ExcelJS.Workbook()
        for (const s of wb.sheets) {
            let maxR = 0, maxC = 0
            for (const key of Object.keys(s.cells)) {
                const p = parseKey(key)
                if (!p) continue
                maxR = Math.max(maxR, p.row)
                maxC = Math.max(maxC, p.col)
            }
            const aoa: string[][] = []
            for (let r = 0; r <= maxR; r++) {
                const row: string[] = []
                for (let c = 0; c <= maxC; c++) row.push(s.cells[ck(c, r)]?.v ?? "")
                aoa.push(row)
            }
            const sheet = workbook.addWorksheet(s.name)
            sheet.addRows(aoa.length ? aoa : [[""]])
        }
        const buffer = await workbook.xlsx.writeBuffer()
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${docName.trim() || "spreadsheet"}.xlsx`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast.success(sp.exported_xlsx || "Exported as XLSX")
    }

    /* ── Autosave (debounced – 2s after last change) ─────────────────── */
    const scheduleAutoSave = React.useCallback(() => {
        if (!autoSave) return
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
        autoSaveTimerRef.current = setTimeout(() => {
            if (!savingRef.current && docNameRef.current.trim()) {
                autoSaveDirtyRef.current = false
                saveToServer()
            }
        }, 2_000)
    }, [autoSave, saveToServer])

    React.useEffect(() => {
        if (!autoSaveReadyRef.current) {
            autoSaveReadyRef.current = true
            return
        }
        autoSaveDirtyRef.current = true
        scheduleAutoSave()
    }, [wb, scheduleAutoSave])

    const prevDocName = React.useRef(docName)
    React.useEffect(() => {
        if (prevDocName.current !== docName) {
            prevDocName.current = docName
            autoSaveDirtyRef.current = true
            scheduleAutoSave()
        }
    }, [docName, scheduleAutoSave])

    React.useEffect(() => {
        return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current) }
    }, [])

    /* ── Sheet tabs ──────────────────────────────────────────────────── */
    const addSheet = () => {
        pushUndo()
        setWb((prev) => {
            const newSheet = { name: `Sheet ${prev.sheets.length + 1}`, cells: {}, colWidths: {} }
            const newSheets = [...prev.sheets, newSheet]
            return { ...prev, sheets: newSheets, activeSheet: newSheets.length - 1 }
        })
        setSel({ col: 0, row: 0 })
        setRange(null)
        setEditing(null)
    }

    const switchSheet = (index: number) => {
        if (editing) commitEdit()
        setWb((prev) => ({ ...prev, activeSheet: index }))
        setSel({ col: 0, row: 0 })
        setRange(null)
        setEditing(null)
    }

    const renameSheet = (index: number) => {
        const name = prompt("Sheet name:", wb.sheets[index].name)
        if (!name?.trim()) return
        setWb((prev) => {
            const newSheet = { ...prev.sheets[index], name: name.trim() }
            const newSheets = prev.sheets.map((sh, i) => i === index ? newSheet : sh)
            return { ...prev, sheets: newSheets }
        })
    }

    /* ── Context menu actions ────────────────────────────────────────── */
    const contextMenuActions = React.useMemo(() => {
        if (!ctxMenu) return []
        const { col, row } = ctxMenu
        return [
            { label: "Cut", icon: <Scissors className="h-3.5 w-3.5" />, shortcut: "⌘X", onClick: () => copySelection(true) },
            { label: "Copy", icon: <Copy className="h-3.5 w-3.5" />, shortcut: "⌘C", onClick: () => copySelection() },
            { label: "Paste", icon: <ClipboardPaste className="h-3.5 w-3.5" />, shortcut: "⌘V", onClick: () => pasteSelection() },
            { label: "Insert row above", icon: <Plus className="h-3.5 w-3.5" />, onClick: () => insertRow(row), separator: true },
            { label: "Insert row below", icon: <Plus className="h-3.5 w-3.5" />, onClick: () => insertRow(row + 1) },
            { label: "Delete row", icon: <Minus className="h-3.5 w-3.5" />, onClick: () => deleteRow(row) },
            { label: "Insert column left", icon: <Plus className="h-3.5 w-3.5" />, onClick: () => insertCol(col), separator: true },
            { label: "Insert column right", icon: <Plus className="h-3.5 w-3.5" />, onClick: () => insertCol(col + 1) },
            { label: "Delete column", icon: <Minus className="h-3.5 w-3.5" />, onClick: () => deleteCol(col) },
            {
                label: "Borders", icon: <Grid3x3 className="h-3.5 w-3.5" />, separator: true,
                sub: [
                    { label: "All borders", icon: <Grid3x3 className="h-3.5 w-3.5" />, onClick: () => applyBorders("all") },
                    { label: "Outer borders", icon: <Square className="h-3.5 w-3.5" />, onClick: () => applyBorders("outer") },
                    { label: "Top border", icon: <PanelTop className="h-3.5 w-3.5" />, onClick: () => applyBorders("top") },
                    { label: "Bottom border", icon: <PanelBottom className="h-3.5 w-3.5" />, onClick: () => applyBorders("bottom") },
                    { label: "Left border", icon: <PanelLeft className="h-3.5 w-3.5" />, onClick: () => applyBorders("left") },
                    { label: "Right border", icon: <PanelRight className="h-3.5 w-3.5" />, onClick: () => applyBorders("right") },
                    { label: "No borders", icon: <SquareDashed className="h-3.5 w-3.5" />, onClick: () => applyBorders("none") },
                    { label: "Thin", icon: <Minus className="h-3.5 w-3.5" />, onClick: () => applyBorders("all", "thin"), separator: true },
                    { label: "Medium", icon: <Minus className="h-3.5 w-3.5 stroke-[2.5]" />, onClick: () => applyBorders("all", "medium") },
                    { label: "Thick", icon: <Minus className="h-3.5 w-3.5 stroke-[3.5]" />, onClick: () => applyBorders("all", "thick") },
                    { label: "Dashed", icon: <Minus className="h-3.5 w-3.5 [stroke-dasharray:4_3]" />, onClick: () => applyBorders("all", "dashed") },
                    { label: "Dotted", icon: <Minus className="h-3.5 w-3.5 [stroke-dasharray:1.5_2]" />, onClick: () => applyBorders("all", "dotted") },
                ],
                onClick: () => { },
            },
            { label: "Merge cells", icon: <TableCellsMerge className="h-3.5 w-3.5" />, separator: true, onClick: () => mergeCells() },
            { label: "Unmerge cells", icon: <TableCellsSplit className="h-3.5 w-3.5" />, onClick: () => unmergeCells() },
            { label: "Clear formatting", icon: <Trash2 className="h-3.5 w-3.5" />, separator: true, onClick: () => applyFormat({ b: undefined, i: undefined, u: undefined, s: undefined, fs: undefined, wrap: undefined, c: undefined, bg: undefined, al: undefined, bd: undefined }) },
        ]
    }, [ctxMenu, copySelection, pasteSelection, insertRow, deleteRow, insertCol, deleteCol, applyBorders, applyFormat, mergeCells, unmergeCells])

    /* ── Visible cols/rows arrays ─────────────────────────────────────── */
    const visibleCols = React.useMemo(() => {
        const arr: number[] = []
        for (let c = visibleRange.startCol; c <= visibleRange.endCol; c++) arr.push(c)
        return arr
    }, [visibleRange])

    const visibleRows = React.useMemo(() => {
        const arr: number[] = []
        for (let r = visibleRange.startRow; r <= visibleRange.endRow; r++) arr.push(r)
        return arr
    }, [visibleRange])

    /* ── Event delegation handlers for grid cells ─────────────────────── */
    const parseCellCoords = React.useCallback((target: EventTarget | null): { col: number; row: number } | null => {
        let el = target as HTMLElement | null
        while (el) {
            const c = el.dataset.col
            const r = el.dataset.row
            if (c !== undefined && r !== undefined) return { col: parseInt(c, 10), row: parseInt(r, 10) }
            el = el.parentElement
        }
        return null
    }, [])

    const handleGridMouseDown = React.useCallback((e: React.MouseEvent) => {
        // Ignore clicks on the fill handle — it has its own handler
        const target = e.target as HTMLElement
        if (target.dataset.fillHandle || target.closest("[data-fill-handle]")) return
        const coords = parseCellCoords(e.target)
        if (!coords) return
        handleCellMouseDown(coords.col, coords.row, e)
    }, [parseCellCoords, handleCellMouseDown])

    const handleGridMouseOver = React.useCallback((e: React.MouseEvent) => {
        if (!isSelecting.current) return
        const coords = parseCellCoords(e.target)
        if (!coords) return
        handleCellMouseEnter(coords.col, coords.row)
    }, [parseCellCoords, handleCellMouseEnter])

    const handleGridDblClick = React.useCallback((e: React.MouseEvent) => {
        const coords = parseCellCoords(e.target)
        if (!coords) return
        startEdit(coords.col, coords.row)
    }, [parseCellCoords, startEdit])

    const handleGridContextMenu = React.useCallback((e: React.MouseEvent) => {
        const coords = parseCellCoords(e.target)
        if (!coords) return
        handleContextMenu(coords.col, coords.row, e)
    }, [parseCellCoords, handleContextMenu])

    const handleUndo = React.useCallback(() => {
        if (historyRef.current.length > 0) {
            futureRef.current.push(JSON.stringify(wbRef.current))
            setWb(JSON.parse(historyRef.current.pop()!))
        }
    }, [])

    const handleRedo = React.useCallback(() => {
        if (futureRef.current.length > 0) {
            historyRef.current.push(JSON.stringify(wbRef.current))
            setWb(JSON.parse(futureRef.current.pop()!))
        }
    }, [])

    /* ── Formula flash animation ─────────────────────────────────────── */
    const [flashCells, setFlashCells] = React.useState<Set<string>>(new Set())
    const flashTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

    const triggerFlash = React.useCallback((keys: string[]) => {
        if (keys.length === 0) return
        setFlashCells(new Set(keys))
        if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
        flashTimerRef.current = setTimeout(() => setFlashCells(new Set()), 600)
    }, [])

    /* Override commitEdit to trigger flash on formula commits */
    const commitEditWithFlash = React.useCallback(() => {
        if (!editing) return
        const val = editVal
        pushUndo()
        updateCell(editing.col, editing.row, { v: val })
        if (isFormula(val)) {
            triggerFlash([ck(editing.col, editing.row)])
        }
        setEditing(null)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editing, editVal, updateCell, triggerFlash])

    /* ── Auto-fill (generative fill) ─────────────────────────────────── */
    const [fillDrag, setFillDrag] = React.useState<{
        startCol: number; startRow: number
        endCol: number; endRow: number
    } | null>(null)

    const detectPattern = React.useCallback((values: string[], count: number, direction: 1 | -1 = 1): { values: string[]; isPattern: boolean } => {
        if (values.length === 0 || count === 0) return { values: [], isPattern: false }

        /* ── Month / day name sequences ────────────────────────────── */
        const MONTHS_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
        const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        const DAYS_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

        const trySequence = (list: string[]): { values: string[]; isPattern: boolean } | null => {
            const lower = values.map((v) => v.toLowerCase())
            const listLower = list.map((v) => v.toLowerCase())
            const idx = listLower.indexOf(lower[lower.length - 1])
            if (idx === -1) return null
            // For multi-value source, verify consecutive
            if (values.length >= 2) {
                for (let i = 0; i < lower.length - 1; i++) {
                    const expected = direction === 1
                        ? listLower[(listLower.indexOf(lower[i]) + 1) % list.length]
                        : listLower[(listLower.indexOf(lower[i]) - 1 + list.length) % list.length]
                    if (lower[i + 1] !== expected) return null
                }
            }
            const result: string[] = []
            for (let i = 0; i < count; i++) {
                const nextIdx = (idx + (i + 1) * direction % list.length + list.length * count) % list.length
                // Preserve the casing of the original value
                const original = values[values.length - 1]
                const entry = list[nextIdx]
                const out = original === original.toUpperCase() ? entry.toUpperCase() : original === original.toLowerCase() ? entry.toLowerCase() : entry
                result.push(out)
            }
            return { values: result, isPattern: true }
        }

        const seqResult = trySequence(MONTHS_FULL) ?? trySequence(MONTHS_SHORT) ?? trySequence(DAYS_FULL) ?? trySequence(DAYS_SHORT)
        if (seqResult) return seqResult

        /* ── Alphanumeric suffix (e.g. "Item 1", "Q1", "Week 3") ───── */
        const suffixMatch = values.map((v) => v.match(/^(.*?)(\d+)$/))
        if (suffixMatch.every((m) => m !== null)) {
            const prefix = suffixMatch[0]![1]
            const allSamePrefix = suffixMatch.every((m) => m![1] === prefix)
            if (allSamePrefix) {
                const nums = suffixMatch.map((m) => parseInt(m![2]))
                if (nums.length >= 2) {
                    const diffs: number[] = []
                    for (let i = 1; i < nums.length; i++) diffs.push(nums[i] - nums[i - 1])
                    const constantDiff = diffs.every((d) => d === diffs[0])
                    if (constantDiff) {
                        const diff = diffs[0] * direction
                        const last = direction === 1 ? nums[nums.length - 1] : nums[0]
                        const result: string[] = []
                        for (let i = 0; i < count; i++) result.push(`${prefix}${last + diff * (i + 1)}`)
                        return { values: result, isPattern: true }
                    }
                } else {
                    const result: string[] = []
                    const last = nums[0]
                    for (let i = 0; i < count; i++) result.push(`${prefix}${last + direction * (i + 1)}`)
                    return { values: result, isPattern: true }
                }
            }
        }

        /* ── Numeric sequences ─────────────────────────────────────── */
        const nums = values.map(Number)
        const allNumbers = values.every((v) => v !== "" && !isNaN(Number(v)))

        if (allNumbers && values.length >= 2) {
            const diffs: number[] = []
            for (let i = 1; i < nums.length; i++) diffs.push(nums[i] - nums[i - 1])
            const constantDiff = diffs.every((d) => d === diffs[0])
            if (constantDiff) {
                const diff = diffs[0] * direction
                const anchor = direction === 1 ? nums[nums.length - 1] : nums[0]
                const result: string[] = []
                for (let i = 0; i < count; i++) result.push(String(anchor + diff * (i + 1)))
                return { values: result, isPattern: true }
            }
        }
        if (allNumbers && values.length === 1) {
            const result: string[] = []
            for (let i = 0; i < count; i++) result.push(String(nums[0] + direction * (i + 1)))
            return { values: result, isPattern: true }
        }
        // Repeat pattern — cycle source values
        const result: string[] = []
        for (let i = 0; i < count; i++) result.push(values[i % values.length])
        return { values: result, isPattern: false }
    }, [])

    const adjustFormulaRefs = React.useCallback((formula: string, rowOffset: number, colOffset: number): string => {
        return formula.replace(/(\$?)([A-Z]+)(\$?)(\d+)/gi, (_, colLock, colStr, rowLock, rowStr) => {
            const col = colLock === "$" ? colStr : colLabel(colFromLabel(colStr.toUpperCase()) + colOffset)
            const row = rowLock === "$" ? rowStr : String(parseInt(rowStr) + rowOffset)
            return `${colLock}${col}${rowLock}${row}`
        })
    }, [])

    const performFill = React.useCallback((
        sourceStart: { col: number; row: number },
        sourceEnd: { col: number; row: number },
        fillEnd: { col: number; row: number },
    ) => {
        pushUndo()
        const sc1 = Math.min(sourceStart.col, sourceEnd.col)
        const sc2 = Math.max(sourceStart.col, sourceEnd.col)
        const sr1 = Math.min(sourceStart.row, sourceEnd.row)
        const sr2 = Math.max(sourceStart.row, sourceEnd.row)
        const srcCols = sc2 - sc1 + 1
        const srcRows = sr2 - sr1 + 1

        const patches: Array<[number, number, Partial<SpreadsheetCellData>]> = []
        const flashKeys: string[] = []

        // Determine fill direction
        const fillDown = fillEnd.row > sr2
        const fillUp = fillEnd.row < sr1
        const fillRight = fillEnd.col > sc2
        const fillLeft = fillEnd.col < sc1

        if (fillDown || fillUp) {
            for (let c = sc1; c <= sc2; c++) {
                // Gather source values for this column
                const srcVals: string[] = []
                const srcCells: SpreadsheetCellData[] = []
                for (let r = sr1; r <= sr2; r++) {
                    const cell = getCell(c, r)
                    srcVals.push(cell.v)
                    srcCells.push(cell)
                }

                const targetStart = fillDown ? sr2 + 1 : fillEnd.row
                const targetEnd = fillDown ? fillEnd.row : sr1 - 1
                const count = Math.abs(targetEnd - targetStart) + 1
                const hasFormula = srcVals.some((v) => isFormula(v))
                const dir = fillDown ? 1 : -1
                const pattern = hasFormula ? null : detectPattern(srcVals, count, dir as 1 | -1)

                for (let i = 0; i < count; i++) {
                    const targetRow = fillDown ? targetStart + i : targetEnd - i
                    const srcIdx = i % srcRows
                    const srcCell = srcCells[srcIdx]
                    let value: string

                    if (isFormula(srcCell.v)) {
                        const rowOff = fillDown ? i + 1 + srcIdx : -(i + 1) + srcIdx
                        value = adjustFormulaRefs(srcCell.v, rowOff - srcIdx, 0)
                    } else if (pattern?.isPattern) {
                        value = pattern.values[i]
                    } else {
                        value = pattern ? pattern.values[i] : srcVals[srcIdx]
                    }

                    const patch: Partial<SpreadsheetCellData> = {
                        v: value,
                        ...(srcCell.b && { b: srcCell.b }),
                        ...(srcCell.i && { i: srcCell.i }),
                        ...(srcCell.fs && { fs: srcCell.fs }),
                        ...(srcCell.c && { c: srcCell.c }),
                        ...(srcCell.bg && { bg: srcCell.bg }),
                        ...(srcCell.al && { al: srcCell.al }),
                    }
                    patches.push([c, targetRow, patch])
                    flashKeys.push(ck(c, targetRow))
                }
            }
        }

        if (fillRight || fillLeft) {
            for (let r = sr1; r <= sr2; r++) {
                const srcVals: string[] = []
                const srcCells: SpreadsheetCellData[] = []
                for (let c = sc1; c <= sc2; c++) {
                    const cell = getCell(c, r)
                    srcVals.push(cell.v)
                    srcCells.push(cell)
                }

                const targetStart = fillRight ? sc2 + 1 : fillEnd.col
                const targetEnd = fillRight ? fillEnd.col : sc1 - 1
                const count = Math.abs(targetEnd - targetStart) + 1
                const hasFormula = srcVals.some((v) => isFormula(v))
                const dir = fillRight ? 1 : -1
                const pattern = hasFormula ? null : detectPattern(srcVals, count, dir as 1 | -1)

                for (let i = 0; i < count; i++) {
                    const targetCol = fillRight ? targetStart + i : targetEnd - i
                    const srcIdx = i % srcCols
                    const srcCell = srcCells[srcIdx]
                    let value: string

                    if (isFormula(srcCell.v)) {
                        const colOff = fillRight ? i + 1 + srcIdx : -(i + 1) + srcIdx
                        value = adjustFormulaRefs(srcCell.v, 0, colOff - srcIdx)
                    } else if (pattern?.isPattern) {
                        value = pattern.values[i]
                    } else {
                        value = pattern ? pattern.values[i] : srcVals[srcIdx]
                    }

                    const patch: Partial<SpreadsheetCellData> = {
                        v: value,
                        ...(srcCell.b && { b: srcCell.b }),
                        ...(srcCell.i && { i: srcCell.i }),
                        ...(srcCell.fs && { fs: srcCell.fs }),
                        ...(srcCell.c && { c: srcCell.c }),
                        ...(srcCell.bg && { bg: srcCell.bg }),
                        ...(srcCell.al && { al: srcCell.al }),
                    }
                    patches.push([targetCol, r, patch])
                    flashKeys.push(ck(targetCol, r))
                }
            }
        }

        if (patches.length > 0) {
            updateCells(patches)
            triggerFlash(flashKeys)
        }
    }, [getCell, detectPattern, adjustFormulaRefs, updateCells, pushUndo, triggerFlash])

    const handleFillDragStart = React.useCallback((e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()

        const startCol = range ? Math.min(range.sc, range.ec) : sel.col
        const startRow = range ? Math.min(range.sr, range.er) : sel.row
        const endCol = range ? Math.max(range.sc, range.ec) : sel.col
        const endRow = range ? Math.max(range.sr, range.er) : sel.row

        setFillDrag({ startCol, startRow, endCol, endRow })

        const onMove = (ev: MouseEvent) => {
            const el = gridRef.current
            if (!el) return
            const rect = el.getBoundingClientRect()
            const scrollLeft = el.scrollLeft
            const scrollTop = el.scrollTop
            const x = ev.clientX - rect.left + scrollLeft - HEADER_W
            const y = ev.clientY - rect.top + scrollTop - ROW_H

            let col = 0
            const offsets = colOffsetsRef.current
            for (let c = 0; c < offsets.length - 1; c++) {
                if (x >= offsets[c] && x < offsets[c + 1]) { col = c; break }
                if (c === offsets.length - 2) col = c
            }
            const row = Math.max(0, Math.floor(y / ROW_H))

            setFillDrag((prev) => prev ? { ...prev, endCol: col, endRow: row } : null)
        }

        const onUp = () => {
            window.removeEventListener("mousemove", onMove)
            window.removeEventListener("mouseup", onUp)
            setFillDrag((prev) => {
                if (prev) {
                    const sCol = range ? Math.min(range.sc, range.ec) : sel.col
                    const sRow = range ? Math.min(range.sr, range.er) : sel.row
                    const eCol = range ? Math.max(range.sc, range.ec) : sel.col
                    const eRow = range ? Math.max(range.sr, range.er) : sel.row
                    // Only fill if dragged beyond the source range
                    if (prev.endRow !== eRow || prev.endCol !== eCol) {
                        setTimeout(() => {
                            performFill(
                                { col: sCol, row: sRow },
                                { col: eCol, row: eRow },
                                { col: prev.endCol, row: prev.endRow },
                            )
                        }, 0)
                    }
                }
                return null
            })
        }
        window.addEventListener("mousemove", onMove)
        window.addEventListener("mouseup", onUp)
    }, [sel, range, performFill, gridRef])

    /* ── Sort column ─────────────────────────────────────────────────── */
    const sortColumn = React.useCallback((col: number, order: "asc" | "desc") => {
        pushUndo()
        updateActiveSheet((s) => {
            // Gather all rows with data in this column
            const entries: { row: number; cell: SpreadsheetCellData }[] = []
            let minRow = Infinity, maxRow = -1
            for (const [key, cell] of Object.entries(s.cells)) {
                const p = parseKey(key)
                if (!p || p.col !== col) continue
                if (cell.v) {
                    entries.push({ row: p.row, cell })
                    minRow = Math.min(minRow, p.row)
                    maxRow = Math.max(maxRow, p.row)
                }
            }
            if (entries.length < 2) return s

            entries.sort((a, b) => {
                const na = Number(a.cell.v), nb = Number(b.cell.v)
                const bothNum = !isNaN(na) && a.cell.v !== "" && !isNaN(nb) && b.cell.v !== ""
                if (bothNum) return order === "asc" ? na - nb : nb - na
                return order === "asc" ? a.cell.v.localeCompare(b.cell.v) : b.cell.v.localeCompare(a.cell.v)
            })

            const newCells = { ...s.cells }
            // Clear existing column entries
            for (const e of entries) delete newCells[ck(col, e.row)]
            // Re-assign sorted
            entries.forEach((e, i) => {
                newCells[ck(col, minRow + i)] = e.cell
            })
            return { ...s, cells: newCells }
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [updateActiveSheet])

    return {
        // State
        wb,
        sheet,
        sel,
        range,
        editing,
        setEditing,
        editVal,
        setEditVal,
        docName,
        setDocName,
        saving,
        autoSave,
        setAutoSave,
        ctxMenu,
        setCtxMenu,
        visibleRange,

        // Derived
        getCell,
        getDisplayValue,
        colW,
        activeFormat,
        selectionSummary,
        colOffsets,
        totalWidth,
        totalHeight,
        findMerge,
        getMergedCells,
        isSelectionMerged,
        isInRangeFn,
        visibleCols,
        visibleRows,
        contextMenuActions,

        // Actions
        commitEdit: commitEditWithFlash,
        startEdit,
        applyFormat,
        toggleFormat,
        setAlignment,
        setFontSize,
        applyBorders,
        mergeCells,
        unmergeCells,
        toggleMerge,
        copySelection,
        pasteSelection,
        insertRow,
        insertCol,
        deleteRow,
        deleteCol,
        startColResize,
        saveToServer,
        exportXlsx,
        addSheet,
        switchSheet,
        renameSheet,
        handleUndo,
        handleRedo,
        fillDown,
        fillRight,
        sortColumn,

        // Excel ribbon extensions
        setFontFamily,
        bumpFontSize,
        setVerticalAlign,
        bumpIndent,
        setRotation,
        applyNumberFormat,
        bumpDecimals,
        startFormatPainter,
        applyPaintedFormat,
        paintFormatArmed: !!paintFormat,
        clearFormats,
        clearContents,
        clearAll,
        applyCellStyle,
        applyTableStyle,
        applyConditionalFormat,
        findReplace,
        autoSum,

        // Fill handle
        fillDrag,
        handleFillDragStart,
        flashCells,

        // Event handlers
        handleScroll,
        handleGridKeyDown,
        handleGridMouseDown,
        handleGridMouseOver,
        handleGridDblClick,
        handleGridContextMenu,

        // i18n
        sp,
    }
}
