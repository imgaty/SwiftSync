//
//  spreadsheet-home.tsx
//  Argent
//
//  Created by hilario on 22 May 2026 at 09:36.
//  Description: Implements the Spreadsheet home React component for Argent, encapsulating reusable
//  interface structure, state handling, and presentation logic for feature screens.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import * as React from "react"
import {
    FileSpreadsheet,
    FilePlus2,
    LayoutTemplate,
    Clock,
    Loader2,
    Trash2,
    Search,
    SquareArrowOutUpRight as ExternalLink,
    History,
} from "lucide-react"

import { useSpreadsheetDocuments } from "@/hooks/use-spreadsheet-documents"
import type { SpreadsheetCellData, SpreadsheetDocument, SpreadsheetSheetTab } from "@/lib/types"
import { getTranslations } from "@/lib/translation-utils"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { ContextMenuPortal, useContextMenu } from "@/components/ui/context-menu-portal"
import { notify } from "@/lib/notify"
import { useLanguage } from "@/components/language-provider"
import { UDS } from "@/lib/UDS"

/* ─── Helpers ──────────────────────────────────────────────────────────── */
function colLabel(i: number): string {
    let s = ""
    let n = i
    while (n >= 0) {
        s = String.fromCharCode(65 + (n % 26)) + s
        n = Math.floor(n / 26) - 1
    }
    return s
}

function ck(c: number, r: number) {
    return `${colLabel(c)}${r + 1}`
}

function timeAgo(dateStr: string): string {
    const now = Date.now()
    const then = new Date(dateStr).getTime()
    const diff = now - then
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "just now"
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 30) return `${days}d ago`
    const months = Math.floor(days / 30)
    return `${months}mo ago`
}

/* ─── Mini preview (renders a tiny representation of the spreadsheet) ── */
const PREVIEW_COLS = 8
const PREVIEW_ROWS = 10
const PREVIEW_CELL_W = 32
const PREVIEW_CELL_H = 12

const SpreadsheetPreview = React.memo(function SpreadsheetPreview({ sheet }: { sheet?: SpreadsheetSheetTab }) {
    if (!sheet) {
        return (
            <div className={`${UDS.subtleFill} flex h-full w-full items-center justify-center sq`}>
                <FileSpreadsheet className="size-8 text-neutral-400/30" />
            </div>
        )
    }

    return (
        <div className={`${UDS.inlineSurface} w-full h-full overflow-hidden`}>
            <svg
                viewBox={`0 0 ${PREVIEW_COLS * PREVIEW_CELL_W} ${PREVIEW_ROWS * PREVIEW_CELL_H}`}
                className="w-full h-full"
                preserveAspectRatio="xMinYMin meet"
            >
                {/* Grid lines */}
                {Array.from({ length: PREVIEW_ROWS + 1 }, (_, r) => (
                    <line
                        key={`hr-${r}`}
                        x1={0}
                        y1={r * PREVIEW_CELL_H}
                        x2={PREVIEW_COLS * PREVIEW_CELL_W}
                        y2={r * PREVIEW_CELL_H}
                        stroke="currentColor"
                        className="text-neutral-400/10"
                        strokeWidth={0.5}
                    />
                ))}
                {Array.from({ length: PREVIEW_COLS + 1 }, (_, c) => (
                    <line
                        key={`vc-${c}`}
                        x1={c * PREVIEW_CELL_W}
                        y1={0}
                        x2={c * PREVIEW_CELL_W}
                        y2={PREVIEW_ROWS * PREVIEW_CELL_H}
                        stroke="currentColor"
                        className="text-neutral-400/10"
                        strokeWidth={0.5}
                    />
                ))}
                {/* Filled cells */}
                {Object.entries(sheet.cells).map(([key, cell]) => {
                    const m = key.match(/^([A-Z]+)(\d+)$/)
                    if (!m) return null
                    let c = 0
                    for (let i = 0; i < m[1].length; i++) c = c * 26 + (m[1].charCodeAt(i) - 64)
                    c -= 1
                    const r = parseInt(m[2], 10) - 1
                    if (c >= PREVIEW_COLS || r >= PREVIEW_ROWS) return null

                    return (
                        <React.Fragment key={key}>
                            {cell.bg && (
                                <rect
                                    x={c * PREVIEW_CELL_W}
                                    y={r * PREVIEW_CELL_H}
                                    width={PREVIEW_CELL_W}
                                    height={PREVIEW_CELL_H}
                                    fill={cell.bg}
                                    opacity={0.6}
                                />
                            )}
                            {cell.v && (
                                <text
                                    x={c * PREVIEW_CELL_W + 2}
                                    y={r * PREVIEW_CELL_H + PREVIEW_CELL_H * 0.75}
                                    fontSize={6}
                                    fill={cell.c || "currentColor"}
                                    className="text-foreground/70"
                                    fontWeight={cell.b ? 700 : 400}
                                    fontStyle={cell.i ? "italic" : "normal"}
                                >
                                    {cell.v.slice(0, 6)}
                                </text>
                            )}
                        </React.Fragment>
                    )
                })}
            </svg>
        </div>
    )
})

/* ─── Template definitions ───────────────────────────────────────────── */
interface Template {
    name: string
    description: string
    icon: React.ReactNode
    build: () => SpreadsheetSheetTab[]
}

const TEMPLATES: Template[] = [
    {
        name: "Monthly Overview",
        description: "Live income & expenses by tag — pulls from your app data",
        icon: <LayoutTemplate className="size-5" />,
        build: () => {
            const cells: Record<string, SpreadsheetCellData> = {}
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

            // Title row
            cells[ck(0, 0)] = { v: "Monthly Overview", b: true, fs: 16 }
            cells[ck(0, 1)] = { v: "Live values from your transactions, budgets & accounts.", i: true, c: "#6b7280" }

            // Header row (row index 3)
            const HEADER_ROW = 3
            const HEADER_BG = "#1f2937"
            const HEADER_FG = "#ffffff"
            cells[ck(0, HEADER_ROW)] = { v: "Category", b: true, bg: HEADER_BG, c: HEADER_FG, al: "l" }
            months.forEach((m, i) => {
                cells[ck(i + 1, HEADER_ROW)] = { v: m, b: true, bg: HEADER_BG, c: HEADER_FG, al: "c" }
            })
            cells[ck(13, HEADER_ROW)] = { v: "Total", b: true, bg: HEADER_BG, c: HEADER_FG, al: "c" }

            const writeRow = (row: number, label: string, opts: { isSection?: boolean; isTotal?: boolean; formulaForMonth?: (m: string, col: number) => string } = {}) => {
                const labelBg = opts.isSection ? "#fde68a" : opts.isTotal ? "#d1fae5" : undefined
                cells[ck(0, row)] = {
                    v: label,
                    b: opts.isSection || opts.isTotal,
                    ...(labelBg ? { bg: labelBg } : {}),
                }
                if (opts.isSection) return // section header rows have no formula columns
                months.forEach((m, i) => {
                    const col = i + 1
                    const formula = opts.formulaForMonth ? opts.formulaForMonth(m, col) : `=TXSUM($A${row + 1},"${m}")`
                    cells[ck(col, row)] = {
                        v: formula,
                        nf: "currency",
                        ...(opts.isTotal ? { b: true, bg: "#d1fae5" } : {}),
                        al: "r",
                    }
                })
                // Total column = SUM of monthly columns on that row
                cells[ck(13, row)] = {
                    v: `=SUM(B${row + 1}:M${row + 1})`,
                    nf: "currency",
                    b: true,
                    bg: opts.isTotal ? "#a7f3d0" : "#f3f4f6",
                    al: "r",
                }
            }

            // INCOME section
            let r = HEADER_ROW + 1
            writeRow(r++, "INCOME", { isSection: true })
            const incomeTags = ["Salary", "Freelance", "Gifts", "Other Income"]
            incomeTags.forEach((tag) => {
                cells[ck(0, r)] = { v: tag }
                writeRow(r, tag)
                r++
            })
            writeRow(r++, "Total Income", { isTotal: true, formulaForMonth: (m) => `=INCOME("${m}")` })

            r++ // spacer

            // EXPENSES section
            writeRow(r++, "EXPENSES", { isSection: true })
            const expenseTags = ["Food", "Rent", "Subscriptions", "Transport", "Utilities", "Other"]
            expenseTags.forEach((tag) => {
                cells[ck(0, r)] = { v: tag }
                writeRow(r, tag)
                r++
            })
            writeRow(r++, "Total Expenses", { isTotal: true, formulaForMonth: (m) => `=EXPENSES("${m}")` })

            r++ // spacer

            // NET row
            writeRow(r, "NET", { isTotal: true, formulaForMonth: (m) => `=NET("${m}")` })

            const colWidths: Record<number, number> = { 0: 160, 13: 110 }
            for (let i = 1; i <= 12; i++) colWidths[i] = 80

            return [{ name: "Overview", cells, colWidths }]
        },
    },
    {
        name: "Account Balances",
        description: "Live balances across all your accounts",
        icon: <LayoutTemplate className="size-5" />,
        build: () => {
            const cells: Record<string, SpreadsheetCellData> = {}
            cells[ck(0, 0)] = { v: "Account Balances", b: true, fs: 16 }
            cells[ck(0, 1)] = { v: "Edit account names in column A to bind cells to live data.", i: true, c: "#6b7280" }
            cells[ck(0, 3)] = { v: "Account", b: true, bg: "#1f2937", c: "#ffffff" }
            cells[ck(1, 3)] = { v: "Balance", b: true, bg: "#1f2937", c: "#ffffff", al: "r" }
            const placeholders = ["Checking", "Savings", "Credit Card"]
            placeholders.forEach((name, i) => {
                cells[ck(0, 4 + i)] = { v: name }
                cells[ck(1, 4 + i)] = { v: `=BALANCE($A${5 + i})`, nf: "currency", al: "r" }
            })
            cells[ck(0, 4 + placeholders.length + 1)] = { v: "Total", b: true, bg: "#d1fae5" }
            cells[ck(1, 4 + placeholders.length + 1)] = { v: `=BALANCE()`, nf: "currency", b: true, bg: "#d1fae5", al: "r" }
            return [{ name: "Balances", cells, colWidths: { 0: 200, 1: 140 } }]
        },
    },
    {
        name: "Monthly Budget",
        description: "Track income and expenses by category",
        icon: <LayoutTemplate className="size-5" />,
        build: () => {
            const cells: Record<string, SpreadsheetCellData> = {}
            const headers = ["Category", "Budget", "Actual", "Difference"]
            headers.forEach((h, c) => {
                cells[ck(c, 0)] = { v: h, b: true, bg: "#e6b8af" }
            })
            const categories = ["Housing", "Food", "Transport", "Utilities", "Entertainment", "Savings", "Other"]
            categories.forEach((cat, r) => {
                cells[ck(0, r + 1)] = { v: cat }
                cells[ck(1, r + 1)] = { v: `=BUDGET($A${r + 2})`, nf: "currency", al: "r" }
                cells[ck(2, r + 1)] = { v: `=BUDGETSPENT($A${r + 2})`, nf: "currency", al: "r" }
                cells[ck(3, r + 1)] = { v: `=B${r + 2}-C${r + 2}`, nf: "currency", al: "r" }
            })
            cells[ck(0, categories.length + 1)] = { v: "Total", b: true }
            cells[ck(1, categories.length + 1)] = { v: `=SUM(B2:B${categories.length + 1})`, nf: "currency", b: true, al: "r" }
            cells[ck(2, categories.length + 1)] = { v: `=SUM(C2:C${categories.length + 1})`, nf: "currency", b: true, al: "r" }
            cells[ck(3, categories.length + 1)] = { v: `=SUM(D2:D${categories.length + 1})`, nf: "currency", b: true, al: "r" }
            return [{ name: "Budget", cells, colWidths: { 0: 140, 1: 100, 2: 100, 3: 100 } }]
        },
    },
    {
        name: "Expense Tracker",
        description: "Log daily expenses with dates and amounts",
        icon: <LayoutTemplate className="size-5" />,
        build: () => {
            const cells: Record<string, SpreadsheetCellData> = {}
            const headers = ["Date", "Description", "Category", "Amount", "Payment Method"]
            headers.forEach((h, c) => {
                cells[ck(c, 0)] = { v: h, b: true, bg: "#c9daf8" }
            })
            return [{ name: "Expenses", cells, colWidths: { 0: 100, 1: 200, 2: 120, 3: 100, 4: 130 } }]
        },
    },
    {
        name: "Savings Goal",
        description: "Plan and track progress toward savings goals",
        icon: <LayoutTemplate className="size-5" />,
        build: () => {
            const cells: Record<string, SpreadsheetCellData> = {}
            const headers = ["Month", "Target", "Deposited", "Running Total", "% Complete"]
            headers.forEach((h, c) => {
                cells[ck(c, 0)] = { v: h, b: true, bg: "#d9ead3" }
            })
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
            months.forEach((m, r) => {
                cells[ck(0, r + 1)] = { v: m }
            })
            return [{ name: "Savings", cells, colWidths: { 0: 80, 1: 100, 2: 100, 3: 120, 4: 100 } }]
        },
    },
    {
        name: "Invoice",
        description: "Create a simple invoice layout",
        icon: <LayoutTemplate className="size-5" />,
        build: () => {
            const cells: Record<string, SpreadsheetCellData> = {}
            cells[ck(0, 0)] = { v: "INVOICE", b: true, al: "l" }
            cells[ck(0, 2)] = { v: "Bill To:", b: true }
            cells[ck(3, 2)] = { v: "Invoice #:", b: true }
            cells[ck(3, 3)] = { v: "Date:", b: true }
            const headers = ["Item", "Qty", "Rate", "Amount"]
            headers.forEach((h, c) => {
                cells[ck(c, 5)] = { v: h, b: true, bg: "#d9d9d9" }
            })
            cells[ck(2, 11)] = { v: "Subtotal:", b: true, al: "r" }
            cells[ck(2, 12)] = { v: "Tax:", b: true, al: "r" }
            cells[ck(2, 13)] = { v: "Total:", b: true, al: "r" }
            return [{ name: "Invoice", cells, colWidths: { 0: 200, 1: 60, 2: 100, 3: 100 } }]
        },
    },
]

/* ─── Infinite scroll helper ─────────────────────────────────────────── */
const ITEMS_PER_PAGE = 12

/* ─── Precomputed template previews (avoids rebuild on every render) ── */
const TEMPLATE_PREVIEWS = TEMPLATES.map((tpl) => tpl.build()[0])

/* ─── Main export ────────────────────────────────────────────────────── */
export function SpreadsheetHome({
    onOpen,
    onNew,
    onNewTemplate,
    onShowLogs,
}: {
    onOpen: (doc: SpreadsheetDocument) => void
    onNew: () => void
    onNewTemplate: (sheets: SpreadsheetSheetTab[], name: string) => void
    onShowLogs: (doc: SpreadsheetDocument) => void
}) {
    const { documents, isLoading, refetch } = useSpreadsheetDocuments()
    const { t } = useLanguage()
    const sp = getTranslations(t, "spreadsheets")
    const common = getTranslations(t, "common")
    const [search, setSearch] = React.useState("")
    const [visibleCount, setVisibleCount] = React.useState(ITEMS_PER_PAGE)
    const [templateOpen, setTemplateOpen] = React.useState(false)
    const sentinelRef = React.useRef<HTMLDivElement>(null)
    const ctxMenu = useContextMenu()
    const [ctxDoc, setCtxDoc] = React.useState<SpreadsheetDocument | null>(null)

    /* Infinite scroll via IntersectionObserver */
    React.useEffect(() => {
        const el = sentinelRef.current
        if (!el) return
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    setVisibleCount((prev) => prev + ITEMS_PER_PAGE)
                }
            },
            { threshold: 0.1 },
        )
        observer.observe(el)
        return () => observer.disconnect()
    }, [])

    const filtered = React.useMemo(() => {
        if (!search.trim()) return documents
        const q = search.toLowerCase()
        return documents.filter((d) => d.name.toLowerCase().includes(q))
    }, [documents, search])

    const visible = filtered.slice(0, visibleCount)
    const hasMore = visibleCount < filtered.length

    const deleteDocument = async (doc: SpreadsheetDocument, e: React.MouseEvent) => {
        e.stopPropagation()
        if (!confirm(`Delete "${doc.name}"?`)) return
        try {
            await fetch(`/api/spreadsheets/${doc.id}`, { method: "DELETE" })
            refetch()
            notify.success({ title: common.deleted || "Deleted", message: doc.name })
        } catch {
            notify.error({ title: sp.delete_failed || "Delete failed", message: doc.name })
        }
    }

    const getFirstSheet = (doc: SpreadsheetDocument): SpreadsheetSheetTab | undefined => {
        const content = doc.content as unknown as { sheets?: SpreadsheetSheetTab[] }
        return content?.sheets?.[0]
    }

    return (
        <div className="flex flex-col items-center w-full min-h-[calc(100vh-220px)] py-10 px-4">
            {/* ═══ Hero / Title ═══════════════════════════════════════════ */}
            <div className="text-center mb-8 max-w-md">
                <div className="inline-flex items-center justify-center size-12 sq-normal bg-primary/10 mb-5">
                    <FileSpreadsheet className="size-6 text-primary" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">{sp.title || "Spreadsheets"}</h1>
                <p className="text-sm text-neutral-400 mt-2 leading-relaxed">
                    {sp.create_or_open || "Create a new spreadsheet or open a recent one"}
                </p>
            </div>

            {/* ═══ Action Buttons ═════════════════════════════════════════ */}
            <div className="flex items-center gap-3 mb-12">
                <Button onClick={onNew} size="sm" className="gap-2">
                    <FilePlus2 className="size-4" />
                    {sp.new_blank || "New Blank"}
                </Button>
                <Button variant="glass" size="sm" onClick={() => setTemplateOpen(true)} className="gap-2">
                    <LayoutTemplate className="size-4" />
                    {sp.start_from_template || "Start from Template"}
                </Button>
            </div>

            {/* ═══ Template picker dialog ═════════════════════════════════ */}
            <Dialog open={templateOpen} onOpenChange={setTemplateOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{sp.choose_template || "Choose a template"}</DialogTitle>
                        <DialogDescription>{sp.choose_template_desc || "Pick a template to get started quickly"}</DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-3 pt-2">
                        {TEMPLATES.map((tpl, i) => (
                            <Button variant="ghost"
                                key={tpl.name}
                                onClick={() => {
                                    setTemplateOpen(false)
                                    onNewTemplate(tpl.build(), tpl.name)
                                }}
                                className={`${UDS.tileSurface} ${UDS.cardHover} group flex cursor-pointer flex-col p-3 text-left`}
                            >
                                <div className="w-full aspect-4/3 sq-lg overflow-hidden mb-2.5">
                                    <SpreadsheetPreview sheet={TEMPLATE_PREVIEWS[i]} />
                                </div>
                                <span className="text-sm font-medium text-foreground">{tpl.name}</span>
                                <span className="text-xs text-neutral-400 mt-0.5">{tpl.description}</span>
                            </Button>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>

            {/* ═══ Recent Spreadsheets ════════════════════════════════════ */}
            <div className="w-full max-w-xl">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400/70 flex items-center gap-2">
                        <Clock className="size-3.5" />
                        {sp.recent || "Recent spreadsheets"}
                    </h2>
                    {documents.length > 0 && (
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-neutral-400/60" />
                            <input
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setVisibleCount(ITEMS_PER_PAGE) }}
                                placeholder={common.search || "Search..."}
                                className={`${UDS.inlineSurface} h-8 w-48 pl-8 pr-3 text-xs text-foreground outline-none transition-all placeholder:text-neutral-400/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/10`}
                            />
                        </div>
                    )}
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="size-5 animate-spin text-neutral-400/50" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
                        <FileSpreadsheet className="size-10 mb-3 opacity-30" />
                        <p className="text-sm">
                            {search ? (sp.no_match || "No spreadsheets match your search") : (sp.no_spreadsheets || "No spreadsheets yet — create one above!")}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="flex flex-col gap-1.5">
                            {visible.map((doc) => (
                                <Button variant="ghost"
                                    key={doc.id}
                                    onClick={() => onOpen(doc)}
                                    onContextMenu={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        setCtxDoc(doc)
                                        ctxMenu.open(e)
                                    }}
                                    className={`${UDS.tileSurface} ${UDS.cardHover} group relative flex cursor-pointer items-center gap-3.5 overflow-hidden px-3.5 py-3`}
                                >
                                    {/* Preview (small, side) */}
                                    <div className={`${UDS.inlineSurface} size-11 shrink-0 overflow-hidden`}>
                                        <SpreadsheetPreview sheet={getFirstSheet(doc)} />
                                    </div>
                                    {/* Info */}
                                    <div className="flex flex-col items-start min-w-0 flex-1">
                                        <span className="text-sm font-medium text-foreground truncate w-full text-left">
                                            {doc.name}
                                        </span>
                                        <span className="text-xs text-neutral-400 mt-0.5">
                                            {timeAgo(doc.updatedAt)}
                                        </span>
                                    </div>
                                    {/* Delete button */}
                                    <div
                                        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                        onClick={(e) => deleteDocument(doc, e)}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => { if (e.key === "Enter") deleteDocument(doc, e as unknown as React.MouseEvent) }}
                                    >
                                        <div className={`${UDS.pillSurface} flex size-7 items-center justify-center hover:bg-destructive/10 hover:border-destructive/30 transition-all duration-200 hover:scale-105 active:scale-95`}>
                                            <Trash2 className="size-3 text-neutral-400 group-hover:text-destructive/70" />
                                        </div>
                                    </div>
                                </Button>
                            ))}
                        </div>

                        {/* Right-click context menu */}
                        {ctxMenu.state && ctxDoc && (
                            <ContextMenuPortal
                                x={ctxMenu.state.x}
                                y={ctxMenu.state.y}
                                onClose={ctxMenu.close}
                                items={[
                                    { label: sp.open || "Open", icon: <ExternalLink className="size-3.5" />, onClick: () => onOpen(ctxDoc) },
                                    { label: sp.view_logs || "View logs", icon: <History className="size-3.5" />, onClick: () => onShowLogs(ctxDoc) },
                                    { label: common.delete || "Delete", icon: <Trash2 className="size-3.5" />, separator: true, variant: "destructive" as const, onClick: () => { if (confirm(`Delete "${ctxDoc.name}"?`)) { fetch(`/api/spreadsheets/${ctxDoc.id}`, { method: "DELETE" }).then(() => { refetch(); notify.success({ title: common.deleted || "Deleted", message: ctxDoc.name }) }).catch(() => notify.error({ title: sp.delete_failed || "Delete failed", message: ctxDoc.name })) } } },
                                ]}
                            />
                        )}

                        {/* Infinite scroll sentinel */}
                        {hasMore && (
                            <div ref={sentinelRef} className="flex items-center justify-center py-8">
                                <Loader2 className="size-4 animate-spin text-neutral-400/40" />
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
