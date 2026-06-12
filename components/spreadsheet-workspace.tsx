//
//  spreadsheet-workspace.tsx
//  Argent
//
//  Created by hilario on 22 May 2026 at 09:36.
//  Description: Implements the Spreadsheet workspace React component for Argent, encapsulating reusable
//  interface structure, state handling, and presentation logic for feature screens.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import * as React from "react"
import {
    AArrowDown,
    AArrowUp,
    AlignCenter,
    AlignJustify,
    AlignLeft,
    AlignRight,
    AlignVerticalJustifyCenter,
    AlignVerticalJustifyEnd,
    AlignVerticalJustifyStart,
    ArrowDown,
    ArrowLeft,
    ArrowRight,
    Bold,
    Brush,
    Calculator,
    ChevronDown,
    Columns3,
    Copy,
    ClipboardPaste,
    Download,
    DollarSign,
    Eraser,
    Filter,
    FunctionSquare,
    IndentDecrease,
    IndentIncrease,
    Italic,
    LayoutGrid,
    Loader2,
    PaintBucket,
    Paintbrush,
    Percent,
    Plus,
    Redo2,
    Save,
    Scissors,
    Search,
    Share2,
    SortAsc,
    SortDesc,
    Sigma,
    Sparkles,
    Strikethrough,
    Table as TableIcon,
    TableCellsMerge,
    TableCellsSplit,
    Type,
    Underline,
    Undo2,
    WrapText,
} from "lucide-react"

import type { FinanceData, SpreadsheetDocument, SpreadsheetSheetTab } from "@/lib/types"
import { colLabel, borderCss, FONT_SIZES, ROW_H, HEADER_W, FORMULA_FUNCTIONS, isFormula } from "@/lib/spreadsheet-utils"
import { useSpreadsheet } from "@/hooks/use-spreadsheet"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import {
    Dropdown,
    DropdownTrigger,
    DropdownContent,
    DropdownSectionItem,
} from "@/components/ui/dropdown"
import { ThemeToggle } from "@/components/theme-toggle"
import { NotificationButton } from "@/components/notification-button"
import { SmartTooltip, TooltipProvider } from "@/components/ui/tooltip"
import { ColorPickerPopover } from "@/components/spreadsheet/color-picker"
import { GridContextMenu } from "@/components/spreadsheet/context-menu"
import { BorderDropdown } from "@/components/spreadsheet/border-dropdown"
import { InsertRow, InsertColumn, DeleteRow, DeleteColumn } from "@/components/spreadsheet/icons"
import { FindReplaceDialog } from "@/components/spreadsheet/find-replace-dialog"
import { NUMBER_FORMAT_OPTIONS, parseNumberFormat, buildNumberFormat } from "@/lib/spreadsheet-number-format"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { UDS } from "@/lib/UDS"

const ICON_BTN = "sq-full"
const TOOL_BUTTON = "text-foreground/75 hover:text-foreground"
const GRID_LINE = "border-[color:var(--sheet-grid-line)]"
const GRID_HEADER = "border-[color:var(--sheet-grid-line)] bg-[color:var(--sheet-header-bg)] text-foreground/65"
const GRID_HEADER_ACTIVE = "bg-[color:var(--sheet-header-active-bg)] text-foreground shadow-[inset_0_-1px_0_var(--sheet-selection-border)]"
const SHEET_SURFACE_VARS = [
    "[--selection-cell-background:color-mix(in_srgb,var(--foreground)_10%,transparent)]",
    "[--selection-cell-border:color-mix(in_srgb,var(--foreground)_72%,transparent)]",
    "[--sheet-cell-bg:color-mix(in_srgb,var(--background)_96%,var(--surface)_4%)]",
    "[--sheet-grid-line:color-mix(in_srgb,var(--foreground)_16%,transparent)]",
    "[--sheet-header-active-bg:color-mix(in_srgb,var(--foreground)_13%,var(--background)_87%)]",
    "[--sheet-header-bg:color-mix(in_srgb,var(--surface-elevated)_88%,var(--foreground)_12%)]",
    "[--sheet-selection-border:color-mix(in_srgb,var(--foreground)_72%,transparent)]",
    "dark:[--selection-cell-background:color-mix(in_srgb,var(--foreground)_18%,transparent)]",
    "dark:[--selection-cell-border:color-mix(in_srgb,var(--foreground)_78%,transparent)]",
    "dark:[--sheet-cell-bg:color-mix(in_srgb,var(--background)_92%,var(--foreground)_8%)]",
    "dark:[--sheet-grid-line:color-mix(in_srgb,var(--foreground)_22%,transparent)]",
    "dark:[--sheet-header-active-bg:color-mix(in_srgb,var(--foreground)_21%,var(--background)_79%)]",
    "dark:[--sheet-header-bg:color-mix(in_srgb,var(--surface-elevated)_74%,var(--foreground)_26%)]",
    "dark:[--sheet-selection-border:color-mix(in_srgb,var(--foreground)_78%,transparent)]",
].join(" ")

const FONT_FAMILIES = [
    "Akt",
    "Aptos Narrow",
    "Arial",
    "Calibri",
    "Cambria",
    "Courier New",
    "Georgia",
    "Helvetica",
    "Times New Roman",
    "Verdana",
]

type ToolbarTab = "home" | "insert" | "formulas" | "data" | "view"

const TAB_ITEMS: { id: ToolbarTab; label: string }[] = [
    { id: "home",     label: "Home" },
    { id: "insert",   label: "Insert" },
    { id: "formulas", label: "Formulas" },
    { id: "data",     label: "Data" },
    { id: "view",     label: "View" },
]

/* ─── Toolbar section wrapper ────────────────────────────────────────── */
function ToolbarGroup({ children }: { label?: string; children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-0.5">
            {children}
        </div>
    )
}

function ToolbarDivider() {
    return <div className={cn("mx-2 h-10 w-px shrink-0", UDS.hairline)} />
}

/* ─── Main component ─────────────────────────────────────────────────── */
export function SpreadsheetWorkspace({
    data,
    isLoading: _isLoading = false,
    initialDoc,
    initialTemplateSheets,
    initialTemplateName,
    onBack,
}: {
    data: FinanceData | null
    isLoading?: boolean
    initialDoc?: SpreadsheetDocument
    initialTemplateSheets?: SpreadsheetSheetTab[]
    initialTemplateName?: string
    onBack?: () => void
}) {
    const gridRef = React.useRef<HTMLDivElement>(null)
    const editRef = React.useRef<HTMLInputElement>(null)
    const s = useSpreadsheet({ initialDoc, initialTemplateSheets, initialTemplateName, finance: data, gridRef, editRef })
    const [activeTab, setActiveTab] = React.useState<ToolbarTab>("home")
    const [showFormulaRef, setShowFormulaRef] = React.useState(false)
    const [findOpen, setFindOpen] = React.useState(false)
    const formatStatusNumber = React.useMemo(() => new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }), [])
    const selectedAddress = `${colLabel(s.sel.col)}${s.sel.row + 1}`
    const selectionBounds = s.range
        ? {
            c1: Math.min(s.range.sc, s.range.ec),
            c2: Math.max(s.range.sc, s.range.ec),
            r1: Math.min(s.range.sr, s.range.er),
            r2: Math.max(s.range.sr, s.range.er),
        }
        : { c1: s.sel.col, c2: s.sel.col, r1: s.sel.row, r2: s.sel.row }

    /* ── Cell font family / number format read-out ──────────────────── */
    const activeCell = s.getCell(s.sel.col, s.sel.row)
    const activeFontFamily = activeCell.ff ?? "Akt"
    const activeNfKind = parseNumberFormat(activeCell.nf).kind
    const activeNfLabel = NUMBER_FORMAT_OPTIONS.find((o) => o.value === activeNfKind)?.label ?? "General"

    /* ── Find & Replace shortcut ────────────────────────────────────── */
    React.useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f") {
                e.preventDefault()
                setFindOpen(true)
            }
        }
        window.addEventListener("keydown", handler)
        return () => window.removeEventListener("keydown", handler)
    }, [])

    /* ── Share handler ──────────────────────────────────────────────── */
    const handleShare = React.useCallback(() => {
        if (typeof navigator.share === "function") {
            navigator.share({ title: s.docName, text: `Spreadsheet: ${s.docName}` }).catch(() => {})
        } else {
            navigator.clipboard.writeText(window.location.href)
            toast.success("Link copied to clipboard")
        }
    }, [s.docName])

    return (
        <TooltipProvider>
            {/* ═══ Top bar: sidebar + doc name + file controls ═════════════ */}
            <header className="animate-fade-in-down" style={{ animationDuration: "0.2s" }}>
                <div className="flex min-w-0 items-center gap-1">
                    <SidebarTrigger />
                    <Separator orientation="vertical" className="data-[orientation=vertical]:h-4 ml-2 mr-2" />

                    {onBack && (
                        <SmartTooltip text="Back" forceSide="bottom">
                            <Button variant="ghost" size="icon" className={ICON_BTN} onClick={onBack}>
                                <ArrowLeft className="size-3.5" />
                            </Button>
                        </SmartTooltip>
                    )}
                    <SmartTooltip text="Undo (⌘Z)" forceSide="bottom">
                        <Button variant="ghost" size="icon" className={ICON_BTN} onClick={s.handleUndo}>
                            <Undo2 className="size-3.5" />
                        </Button>
                    </SmartTooltip>
                    <SmartTooltip text="Redo (⌘Y)" forceSide="bottom">
                        <Button variant="ghost" size="icon" className={ICON_BTN} onClick={s.handleRedo}>
                            <Redo2 className="size-3.5" />
                        </Button>
                    </SmartTooltip>

                    <Separator orientation="vertical" className="data-[orientation=vertical]:h-4 ml-2 mr-2" />

                    <input
                        value={s.docName}
                        onChange={(e) => s.setDocName(e.target.value)}
                        className={cn("h-7 w-40 truncate px-2 text-sm font-medium focus:outline-none", UDS.inlineSurface, UDS.inputHover, UDS.inputFocus)}
                        placeholder={s.sp.untitled || "Untitled"}
                    />

                    <div className="ml-auto flex items-center gap-1 shrink-0">
                        <SmartTooltip text="Save (⌘S)" forceSide="bottom">
                            <Button variant="ghost" size="icon" className={ICON_BTN} onClick={s.saveToServer} disabled={s.saving}>
                                {s.saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                            </Button>
                        </SmartTooltip>
                        <SmartTooltip text="Export XLSX" forceSide="bottom">
                            <Button variant="ghost" size="icon" className={ICON_BTN} onClick={s.exportXlsx}>
                                <Download className="size-3.5" />
                            </Button>
                        </SmartTooltip>
                        <SmartTooltip text="Share" forceSide="bottom">
                            <Button variant="ghost" size="icon" className={ICON_BTN} onClick={handleShare}>
                                <Share2 className="size-3.5" />
                            </Button>
                        </SmartTooltip>
                        <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-4" />
                        <NotificationButton />
                        <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-4" />
                        <ThemeToggle />
                    </div>
                </div>
            </header>

            {/* ═══ Ribbon tabs ════════════════════════════════════════════ */}
            <div className={cn("flex shrink-0 flex-col overflow-hidden px-2 py-1 animate-fade-in-up stagger-1", UDS.inlineSurface)}>
                {/* Tab row */}
                <div className="flex items-center gap-0 px-1">
                    {TAB_ITEMS.map((tab) => (
                        <Button variant="ghost"
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "relative h-8 cursor-pointer select-none px-3.5 py-2 text-sm font-semibold transition-colors",
                                activeTab === tab.id
                                    ? "text-primary"
                                    : "text-muted-foreground hover:text-foreground",
                            )}
                        >
                            {tab.label}
                            {activeTab === tab.id && (
                                <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary sq-full" />
                            )}
                        </Button>
                    ))}
                </div>

                {/* Tab content */}
                <div className="flex min-h-14 items-center gap-1 overflow-x-auto px-1 py-2 scrollbar-none">
                    {/* ── HOME TAB ──────────────────────────────────────── */}
                    {activeTab === "home" && (
                        <>
                            {/* Clipboard */}
                            <ToolbarGroup>
                                <SmartTooltip text="Cut (⌘X)" forceSide="bottom">
                                    <Button variant="ghost" size="icon" className={cn(ICON_BTN, TOOL_BUTTON)} onClick={() => s.copySelection(true)}>
                                        <Scissors className="size-3.5" />
                                    </Button>
                                </SmartTooltip>
                                <SmartTooltip text="Copy (⌘C)" forceSide="bottom">
                                    <Button variant="ghost" size="icon" className={cn(ICON_BTN, TOOL_BUTTON)} onClick={() => s.copySelection()}>
                                        <Copy className="size-3.5" />
                                    </Button>
                                </SmartTooltip>
                                <SmartTooltip text="Paste (⌘V)" forceSide="bottom">
                                    <Button variant="ghost" size="icon" className={cn(ICON_BTN, TOOL_BUTTON)} onClick={s.pasteSelection}>
                                        <ClipboardPaste className="size-3.5" />
                                    </Button>
                                </SmartTooltip>
                                <SmartTooltip
                                    text={s.paintFormatArmed
                                        ? "Click a target cell to apply the copied format"
                                        : "Format painter — copies all formatting (font, color, borders, number format) from the active cell, then click a target to apply"}
                                    forceSide="bottom"
                                >
                                    <Button
                                        variant={s.paintFormatArmed ? "glass" : "ghost"}
                                        size="icon"
                                        className={cn(ICON_BTN, TOOL_BUTTON)}
                                        onClick={() => {
                                            if (s.paintFormatArmed) s.applyPaintedFormat()
                                            else s.startFormatPainter()
                                        }}
                                    >
                                        <Paintbrush className="size-3.5" />
                                    </Button>
                                </SmartTooltip>
                            </ToolbarGroup>

                            <ToolbarDivider />

                            {/* Font */}
                            <ToolbarGroup>
                                <Dropdown>
                                    <DropdownTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-7 w-28 justify-between sq-lg px-2 text-xs" title="Font family">
                                            <span className="truncate" style={{ fontFamily: activeFontFamily }}>{activeFontFamily}</span>
                                            <ChevronDown className="size-3 shrink-0 opacity-60" />
                                        </Button>
                                    </DropdownTrigger>
                                    <DropdownContent width={200} align="start" className="max-h-72 overflow-y-auto">
                                        {FONT_FAMILIES.map((f) => (
                                            <DropdownSectionItem key={f} onSelect={() => s.setFontFamily(f)}>
                                                <span style={{ fontFamily: f }}>{f}</span>
                                            </DropdownSectionItem>
                                        ))}
                                    </DropdownContent>
                                </Dropdown>
                                <Dropdown>
                                    <DropdownTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-7 w-12 justify-between sq-lg px-2 text-xs" title="Font size">
                                            <span>{s.activeFormat.fontSize}</span>
                                            <ChevronDown className="size-3 shrink-0 opacity-60" />
                                        </Button>
                                    </DropdownTrigger>
                                    <DropdownContent width={70} align="start" className="max-h-72 overflow-y-auto">
                                        {FONT_SIZES.map((sz) => (
                                            <DropdownSectionItem key={sz} onSelect={() => s.setFontSize(sz)}>{sz}</DropdownSectionItem>
                                        ))}
                                    </DropdownContent>
                                </Dropdown>
                                <SmartTooltip text="Increase font size" forceSide="bottom">
                                    <Button variant="ghost" size="icon" className={cn(ICON_BTN, TOOL_BUTTON)} onClick={() => s.bumpFontSize(1)}>
                                        <AArrowUp className="size-3.5" />
                                    </Button>
                                </SmartTooltip>
                                <SmartTooltip text="Decrease font size" forceSide="bottom">
                                    <Button variant="ghost" size="icon" className={cn(ICON_BTN, TOOL_BUTTON)} onClick={() => s.bumpFontSize(-1)}>
                                        <AArrowDown className="size-3.5" />
                                    </Button>
                                </SmartTooltip>
                                <SmartTooltip text="Bold (⌘B)" forceSide="bottom">
                                    <Button variant={s.activeFormat.bold ? "glass" : "ghost"} size="icon" className={cn(ICON_BTN, TOOL_BUTTON)} onClick={() => s.toggleFormat("b")}>
                                        <Bold className="size-3.5" />
                                    </Button>
                                </SmartTooltip>
                                <SmartTooltip text="Italic (⌘I)" forceSide="bottom">
                                    <Button variant={s.activeFormat.italic ? "glass" : "ghost"} size="icon" className={cn(ICON_BTN, TOOL_BUTTON)} onClick={() => s.toggleFormat("i")}>
                                        <Italic className="size-3.5" />
                                    </Button>
                                </SmartTooltip>
                                <SmartTooltip text="Underline (⌘U)" forceSide="bottom">
                                    <Button variant={s.activeFormat.underline ? "glass" : "ghost"} size="icon" className={cn(ICON_BTN, TOOL_BUTTON)} onClick={() => s.toggleFormat("u")}>
                                        <Underline className="size-3.5" />
                                    </Button>
                                </SmartTooltip>
                                <SmartTooltip text="Strikethrough" forceSide="bottom">
                                    <Button variant={s.activeFormat.strikethrough ? "glass" : "ghost"} size="icon" className={cn(ICON_BTN, TOOL_BUTTON)} onClick={() => s.toggleFormat("s")}>
                                        <Strikethrough className="size-3.5" />
                                    </Button>
                                </SmartTooltip>
                                <BorderDropdown onApply={s.applyBorders} onMerge={s.mergeCells} onUnmerge={s.unmergeCells} />
                                <ColorPickerPopover onSelect={(c) => s.applyFormat({ bg: c || undefined })}>
                                    <Button variant="ghost" size="icon" className={cn(ICON_BTN, TOOL_BUTTON)} title="Fill color">
                                        <PaintBucket className="size-3.5" />
                                    </Button>
                                </ColorPickerPopover>
                                <ColorPickerPopover onSelect={(c) => s.applyFormat({ c: c || undefined })}>
                                    <Button variant="ghost" size="icon" className={cn(ICON_BTN, TOOL_BUTTON)} title="Font color">
                                        <Type className="size-3.5" />
                                    </Button>
                                </ColorPickerPopover>
                                <SmartTooltip text="Clear formatting" forceSide="bottom">
                                    <Button variant="ghost" size="icon" className={cn(ICON_BTN, TOOL_BUTTON)} onClick={s.clearFormats}>
                                        <Eraser className="size-3.5" />
                                    </Button>
                                </SmartTooltip>
                            </ToolbarGroup>

                            <ToolbarDivider />

                            {/* Alignment */}
                            <ToolbarGroup>
                                <Dropdown>
                                    <DropdownTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-7 sq-lg gap-1 px-2 text-xs" title="Alignment">
                                            <AlignLeft className="size-3.5" />
                                            Align
                                            <ChevronDown className="size-3" />
                                        </Button>
                                    </DropdownTrigger>
                                    <DropdownContent width={220} align="start">
                                        <DropdownSectionItem icon={<AlignLeft className="size-3.5" />} onSelect={() => s.setAlignment("l")}>Align left</DropdownSectionItem>
                                        <DropdownSectionItem icon={<AlignCenter className="size-3.5" />} onSelect={() => s.setAlignment("c")}>Align center</DropdownSectionItem>
                                        <DropdownSectionItem icon={<AlignRight className="size-3.5" />} onSelect={() => s.setAlignment("r")}>Align right</DropdownSectionItem>
                                        <DropdownSectionItem icon={<AlignJustify className="size-3.5" />} onSelect={() => s.setAlignment("j")}>Justify</DropdownSectionItem>
                                        <DropdownSectionItem icon={<AlignVerticalJustifyStart className="size-3.5" />} onSelect={() => s.setVerticalAlign("t")}>Align top</DropdownSectionItem>
                                        <DropdownSectionItem icon={<AlignVerticalJustifyCenter className="size-3.5" />} onSelect={() => s.setVerticalAlign("m")}>Align middle</DropdownSectionItem>
                                        <DropdownSectionItem icon={<AlignVerticalJustifyEnd className="size-3.5" />} onSelect={() => s.setVerticalAlign("b")}>Align bottom</DropdownSectionItem>
                                        <DropdownSectionItem icon={<WrapText className="size-3.5" />} onSelect={() => s.toggleFormat("wrap")}>{s.activeFormat.wrap ? "Disable wrap text" : "Wrap text"}</DropdownSectionItem>
                                        <DropdownSectionItem icon={<IndentDecrease className="size-3.5" />} onSelect={() => s.bumpIndent(-1)}>Decrease indent</DropdownSectionItem>
                                        <DropdownSectionItem icon={<IndentIncrease className="size-3.5" />} onSelect={() => s.bumpIndent(1)}>Increase indent</DropdownSectionItem>
                                        <DropdownSectionItem onSelect={() => s.setRotation(0)}>Horizontal (default)</DropdownSectionItem>
                                        <DropdownSectionItem onSelect={() => s.setRotation(45)}>Angle counterclockwise (45°)</DropdownSectionItem>
                                        <DropdownSectionItem onSelect={() => s.setRotation(-45)}>Angle clockwise (−45°)</DropdownSectionItem>
                                        <DropdownSectionItem onSelect={() => s.setRotation(90)}>Rotate text up (90°)</DropdownSectionItem>
                                        <DropdownSectionItem onSelect={() => s.setRotation(-90)}>Rotate text down (−90°)</DropdownSectionItem>
                                        <DropdownSectionItem onSelect={() => {
                                            const v = Number(prompt("Custom rotation in degrees (-90 to 90):", String(s.activeFormat.rotation)))
                                            if (Number.isFinite(v)) s.setRotation(Math.max(-90, Math.min(90, v)))
                                        }}>Custom angle…</DropdownSectionItem>
                                    </DropdownContent>
                                </Dropdown>
                                <SmartTooltip text={s.isSelectionMerged ? "Unmerge cells" : "Merge cells"} forceSide="bottom">
                                    <Button variant={s.isSelectionMerged ? "glass" : "ghost"} size="icon" className={cn(ICON_BTN, TOOL_BUTTON)} onClick={s.toggleMerge}>
                                        <TableCellsMerge className="size-3.5" />
                                    </Button>
                                </SmartTooltip>
                            </ToolbarGroup>

                            <ToolbarDivider />

                            {/* Number */}
                            <ToolbarGroup>
                                <Dropdown>
                                    <DropdownTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-7 w-28 justify-between sq-lg px-2 text-xs" title="Number format">
                                            <span className="truncate">{activeNfLabel}</span>
                                            <ChevronDown className="size-3 shrink-0 opacity-60" />
                                        </Button>
                                    </DropdownTrigger>
                                    <DropdownContent width={240} align="start">
                                        {NUMBER_FORMAT_OPTIONS.map((o) => (
                                            <DropdownSectionItem key={o.value} onSelect={() => s.applyNumberFormat(buildNumberFormat(o.value))}>
                                                <div className="flex w-full items-center justify-between gap-2">
                                                    <span className="text-xs">{o.label}</span>
                                                    <span className="text-xs text-neutral-400">{o.sample}</span>
                                                </div>
                                            </DropdownSectionItem>
                                        ))}
                                    </DropdownContent>
                                </Dropdown>
                                <SmartTooltip text="Currency" forceSide="bottom">
                                    <Button variant="ghost" size="icon" className={cn(ICON_BTN, TOOL_BUTTON)} onClick={() => s.applyNumberFormat(buildNumberFormat("currency"))}>
                                        <DollarSign className="size-3.5" />
                                    </Button>
                                </SmartTooltip>
                                <SmartTooltip text="Percent" forceSide="bottom">
                                    <Button variant="ghost" size="icon" className={cn(ICON_BTN, TOOL_BUTTON)} onClick={() => s.applyNumberFormat(buildNumberFormat("percent"))}>
                                        <Percent className="size-3.5" />
                                    </Button>
                                </SmartTooltip>
                                <SmartTooltip text="Comma style" forceSide="bottom">
                                    <Button variant="ghost" size="sm" className="h-7 sq-lg px-2 text-xs font-semibold" onClick={() => s.applyNumberFormat(buildNumberFormat("comma"))}>
                                        ,
                                    </Button>
                                </SmartTooltip>
                                <SmartTooltip text="Increase decimal" forceSide="bottom">
                                    <Button variant="ghost" size="sm" className="h-7 sq-lg px-1.5 text-xs tracking-tight" onClick={() => s.bumpDecimals(1)}>
                                        ←.0
                                    </Button>
                                </SmartTooltip>
                                <SmartTooltip text="Decrease decimal" forceSide="bottom">
                                    <Button variant="ghost" size="sm" className="h-7 sq-lg px-1.5 text-xs tracking-tight" onClick={() => s.bumpDecimals(-1)}>
                                        .0→
                                    </Button>
                                </SmartTooltip>
                            </ToolbarGroup>

                            <ToolbarDivider />

                            {/* Styles */}
                            <ToolbarGroup>
                                <Dropdown>
                                    <DropdownTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-7 sq-lg gap-1 px-2 text-xs" title="Conditional formatting" aria-label="Conditional formatting">
                                            <Sparkles className="size-3.5" />
                                            <ChevronDown className="size-3" />
                                        </Button>
                                    </DropdownTrigger>
                                    <DropdownContent width={220} align="start">
                                        <DropdownSectionItem onSelect={() => {
                                            const v = Number(prompt("Highlight cells greater than:", "0"))
                                            if (Number.isFinite(v)) s.applyConditionalFormat("gt", { value: v })
                                        }}>Greater than…</DropdownSectionItem>
                                        <DropdownSectionItem onSelect={() => {
                                            const v = Number(prompt("Highlight cells less than:", "0"))
                                            if (Number.isFinite(v)) s.applyConditionalFormat("lt", { value: v })
                                        }}>Less than…</DropdownSectionItem>
                                        <DropdownSectionItem onSelect={() => {
                                            const v1 = Number(prompt("Min:", "0"))
                                            const v2 = Number(prompt("Max:", "100"))
                                            if (Number.isFinite(v1) && Number.isFinite(v2)) s.applyConditionalFormat("between", { value: v1, value2: v2 })
                                        }}>Between…</DropdownSectionItem>
                                        <DropdownSectionItem onSelect={() => s.applyConditionalFormat("top10")}>Top 10%</DropdownSectionItem>
                                        <DropdownSectionItem onSelect={() => s.applyConditionalFormat("colorScale")}>Color scale</DropdownSectionItem>
                                        <DropdownSectionItem onSelect={() => s.applyConditionalFormat("dataBar")}>Data bars</DropdownSectionItem>
                                    </DropdownContent>
                                </Dropdown>
                                <Dropdown>
                                    <DropdownTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-7 sq-lg gap-1 px-2 text-xs" title="Format as table" aria-label="Format as table">
                                            <TableIcon className="size-3.5" />
                                            <ChevronDown className="size-3" />
                                        </Button>
                                    </DropdownTrigger>
                                    <DropdownContent width={200} align="start">
                                        <DropdownSectionItem onSelect={() => s.applyTableStyle("striped")}>Striped rows</DropdownSectionItem>
                                        <DropdownSectionItem onSelect={() => s.applyTableStyle("bordered")}>Bordered</DropdownSectionItem>
                                        <DropdownSectionItem onSelect={() => s.applyTableStyle("minimal")}>Minimal</DropdownSectionItem>
                                    </DropdownContent>
                                </Dropdown>
                                <Dropdown>
                                    <DropdownTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-7 sq-lg gap-1 px-2 text-xs" title="Cell styles" aria-label="Cell styles">
                                            <LayoutGrid className="size-3.5" />
                                            <ChevronDown className="size-3" />
                                        </Button>
                                    </DropdownTrigger>
                                    <DropdownContent width={220} align="start">
                                        <DropdownSectionItem onSelect={() => s.applyCellStyle({ b: true, fs: 16, c: "#1e3a8a" })}>Heading 1</DropdownSectionItem>
                                        <DropdownSectionItem onSelect={() => s.applyCellStyle({ b: true, fs: 14, c: "#1e3a8a" })}>Heading 2</DropdownSectionItem>
                                        <DropdownSectionItem onSelect={() => s.applyCellStyle({ b: true, c: "#1e3a8a" })}>Heading 3</DropdownSectionItem>
                                        <DropdownSectionItem onSelect={() => s.applyCellStyle({ b: true, bg: "#fef3c7", c: "#92400e" })}>Note</DropdownSectionItem>
                                        <DropdownSectionItem onSelect={() => s.applyCellStyle({ bg: "#dcfce7", c: "#166534" })}>Good</DropdownSectionItem>
                                        <DropdownSectionItem onSelect={() => s.applyCellStyle({ bg: "#fee2e2", c: "#991b1b" })}>Bad</DropdownSectionItem>
                                        <DropdownSectionItem onSelect={() => s.applyCellStyle({ bg: "#fef9c3", c: "#854d0e" })}>Neutral</DropdownSectionItem>
                                        <DropdownSectionItem onSelect={() => s.applyCellStyle({ b: true, bg: "#1e3a8a", c: "#ffffff" })}>Accent</DropdownSectionItem>
                                        <DropdownSectionItem onSelect={() => s.applyCellStyle({ nf: buildNumberFormat("currency") })}>Currency style</DropdownSectionItem>
                                        <DropdownSectionItem onSelect={() => s.applyCellStyle({ nf: buildNumberFormat("percent") })}>Percent style</DropdownSectionItem>
                                    </DropdownContent>
                                </Dropdown>
                            </ToolbarGroup>

                            <ToolbarDivider />

                            {/* Cells */}
                            <ToolbarGroup>
                                <Dropdown>
                                    <DropdownTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-7 sq-lg gap-1 px-2 text-xs" title="Insert" aria-label="Insert">
                                            <Plus className="size-3.5" />
                                            <ChevronDown className="size-3" />
                                        </Button>
                                    </DropdownTrigger>
                                    <DropdownContent width={200} align="start">
                                        <DropdownSectionItem icon={<InsertRow className="size-3.5" />} onSelect={() => s.insertRow(s.sel.row)}>Insert row above</DropdownSectionItem>
                                        <DropdownSectionItem icon={<InsertRow className="size-3.5" />} onSelect={() => s.insertRow(s.sel.row + 1)}>Insert row below</DropdownSectionItem>
                                        <DropdownSectionItem icon={<InsertColumn className="size-3.5" />} onSelect={() => s.insertCol(s.sel.col)}>Insert column left</DropdownSectionItem>
                                        <DropdownSectionItem icon={<InsertColumn className="size-3.5" />} onSelect={() => s.insertCol(s.sel.col + 1)}>Insert column right</DropdownSectionItem>
                                        <DropdownSectionItem icon={<Plus className="size-3.5" />} onSelect={s.addSheet}>Insert sheet</DropdownSectionItem>
                                    </DropdownContent>
                                </Dropdown>
                                <Dropdown>
                                    <DropdownTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-7 sq-lg gap-1 px-2 text-xs" title="Delete" aria-label="Delete">
                                            <DeleteRow className="size-3.5" />
                                            <ChevronDown className="size-3" />
                                        </Button>
                                    </DropdownTrigger>
                                    <DropdownContent width={200} align="start">
                                        <DropdownSectionItem icon={<DeleteRow className="size-3.5" />} onSelect={() => s.deleteRow(s.sel.row)}>Delete row</DropdownSectionItem>
                                        <DropdownSectionItem icon={<DeleteColumn className="size-3.5" />} onSelect={() => s.deleteCol(s.sel.col)}>Delete column</DropdownSectionItem>
                                    </DropdownContent>
                                </Dropdown>
                                <Dropdown>
                                    <DropdownTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-7 sq-lg gap-1 px-2 text-xs" title="Format" aria-label="Format">
                                            <Brush className="size-3.5" />
                                            <ChevronDown className="size-3" />
                                        </Button>
                                    </DropdownTrigger>
                                    <DropdownContent width={220} align="start">
                                        <DropdownSectionItem onSelect={() => s.renameSheet(s.wb.activeSheet)}>Rename sheet…</DropdownSectionItem>
                                        <DropdownSectionItem icon={<ArrowDown className="size-3.5" />} onSelect={s.fillDown}>Fill down (⌘D)</DropdownSectionItem>
                                        <DropdownSectionItem icon={<ArrowRight className="size-3.5" />} onSelect={s.fillRight}>Fill right (⌘R)</DropdownSectionItem>
                                    </DropdownContent>
                                </Dropdown>
                            </ToolbarGroup>

                            <ToolbarDivider />

                            {/* Editing */}
                            <ToolbarGroup>
                                <Dropdown>
                                    <DropdownTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-7 sq-lg gap-1 px-2 text-xs" title="AutoSum">
                                            <Sigma className="size-3.5" />
                                            <ChevronDown className="size-3" />
                                        </Button>
                                    </DropdownTrigger>
                                    <DropdownContent width={180} align="start">
                                        <DropdownSectionItem onSelect={() => s.autoSum("SUM")}>Sum</DropdownSectionItem>
                                        <DropdownSectionItem onSelect={() => s.autoSum("AVERAGE")}>Average</DropdownSectionItem>
                                        <DropdownSectionItem onSelect={() => s.autoSum("COUNT")}>Count</DropdownSectionItem>
                                        <DropdownSectionItem onSelect={() => s.autoSum("MAX")}>Max</DropdownSectionItem>
                                        <DropdownSectionItem onSelect={() => s.autoSum("MIN")}>Min</DropdownSectionItem>
                                    </DropdownContent>
                                </Dropdown>
                                <Dropdown>
                                    <DropdownTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-7 sq-lg gap-1 px-2 text-xs" title="Clear">
                                            <Eraser className="size-3.5" />
                                            <ChevronDown className="size-3" />
                                        </Button>
                                    </DropdownTrigger>
                                    <DropdownContent width={200} align="start">
                                        <DropdownSectionItem onSelect={s.clearAll}>Clear all</DropdownSectionItem>
                                        <DropdownSectionItem onSelect={s.clearFormats}>Clear formats</DropdownSectionItem>
                                        <DropdownSectionItem onSelect={s.clearContents}>Clear contents</DropdownSectionItem>
                                    </DropdownContent>
                                </Dropdown>
                                <Dropdown>
                                    <DropdownTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-7 sq-lg gap-1 px-2 text-xs" title="Sort & Filter">
                                            <Filter className="size-3.5" />
                                            <ChevronDown className="size-3" />
                                        </Button>
                                    </DropdownTrigger>
                                    <DropdownContent width={200} align="start">
                                        <DropdownSectionItem icon={<SortAsc className="size-3.5" />} onSelect={() => s.sortColumn(s.sel.col, "asc")}>Sort A → Z</DropdownSectionItem>
                                        <DropdownSectionItem icon={<SortDesc className="size-3.5" />} onSelect={() => s.sortColumn(s.sel.col, "desc")}>Sort Z → A</DropdownSectionItem>
                                    </DropdownContent>
                                </Dropdown>
                                <Dropdown>
                                    <DropdownTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-7 sq-lg gap-1 px-2 text-xs" title="Find & Select (⌘F)">
                                            <Search className="size-3.5" />
                                            <ChevronDown className="size-3" />
                                        </Button>
                                    </DropdownTrigger>
                                    <DropdownContent width={200} align="start">
                                        <DropdownSectionItem onSelect={() => setFindOpen(true)}>Find…</DropdownSectionItem>
                                        <DropdownSectionItem onSelect={() => setFindOpen(true)}>Replace…</DropdownSectionItem>
                                    </DropdownContent>
                                </Dropdown>
                            </ToolbarGroup>
                        </>
                    )}

                    {/* ── INSERT TAB ────────────────────────────────────── */}
                    {activeTab === "insert" && (
                        <>
                            <ToolbarGroup label="Rows">
                                <Dropdown>
                                    <SmartTooltip text="Insert row" forceSide="bottom">
                                        <DropdownTrigger asChild>
                                            <Button variant="ghost" size="icon" className={cn(ICON_BTN, TOOL_BUTTON)}>
                                                <InsertRow className="size-3.5" />
                                            </Button>
                                        </DropdownTrigger>
                                    </SmartTooltip>
                                    <DropdownContent width={180} align="start">
                                        <DropdownSectionItem icon={<InsertRow className="size-3.5" />} onSelect={() => s.insertRow(s.sel.row)}>
                                            Insert row above
                                        </DropdownSectionItem>
                                        <DropdownSectionItem icon={<InsertRow className="size-3.5" />} onSelect={() => s.insertRow(s.sel.row + 1)}>
                                            Insert row below
                                        </DropdownSectionItem>
                                    </DropdownContent>
                                </Dropdown>
                                <SmartTooltip text="Delete row" forceSide="bottom">
                                    <Button variant="ghost" size="icon" className={cn(ICON_BTN, TOOL_BUTTON)} onClick={() => s.deleteRow(s.sel.row)}>
                                        <DeleteRow className="size-3.5" />
                                    </Button>
                                </SmartTooltip>
                            </ToolbarGroup>

                            <ToolbarDivider />

                            <ToolbarGroup label="Columns">
                                <Dropdown>
                                    <SmartTooltip text="Insert column" forceSide="bottom">
                                        <DropdownTrigger asChild>
                                            <Button variant="ghost" size="icon" className={cn(ICON_BTN, TOOL_BUTTON)}>
                                                <InsertColumn className="size-3.5" />
                                            </Button>
                                        </DropdownTrigger>
                                    </SmartTooltip>
                                    <DropdownContent width={180} align="start">
                                        <DropdownSectionItem icon={<InsertColumn className="size-3.5" />} onSelect={() => s.insertCol(s.sel.col)}>
                                            Insert column left
                                        </DropdownSectionItem>
                                        <DropdownSectionItem icon={<InsertColumn className="size-3.5" />} onSelect={() => s.insertCol(s.sel.col + 1)}>
                                            Insert column right
                                        </DropdownSectionItem>
                                    </DropdownContent>
                                </Dropdown>
                                <SmartTooltip text="Delete column" forceSide="bottom">
                                    <Button variant="ghost" size="icon" className={cn(ICON_BTN, TOOL_BUTTON)} onClick={() => s.deleteCol(s.sel.col)}>
                                        <DeleteColumn className="size-3.5" />
                                    </Button>
                                </SmartTooltip>
                            </ToolbarGroup>

                            <ToolbarDivider />

                            <ToolbarGroup label="Cells">
                                <SmartTooltip text="Merge cells" forceSide="bottom">
                                    <Button variant="ghost" size="icon" className={cn(ICON_BTN, TOOL_BUTTON)} onClick={s.mergeCells}>
                                        <TableCellsMerge className="size-3.5" />
                                    </Button>
                                </SmartTooltip>
                                <SmartTooltip text="Unmerge cells" forceSide="bottom">
                                    <Button variant="ghost" size="icon" className={cn(ICON_BTN, TOOL_BUTTON)} onClick={s.unmergeCells}>
                                        <TableCellsSplit className="size-3.5" />
                                    </Button>
                                </SmartTooltip>
                            </ToolbarGroup>

                            <ToolbarDivider />

                            <ToolbarGroup label="Sheet">
                                <SmartTooltip text="Add sheet" forceSide="bottom">
                                    <Button variant="ghost" size="icon" className={cn(ICON_BTN, TOOL_BUTTON)} onClick={s.addSheet}>
                                        <Plus className="size-3.5" />
                                    </Button>
                                </SmartTooltip>
                            </ToolbarGroup>
                        </>
                    )}

                    {/* ── FORMULAS TAB ──────────────────────────────────── */}
                    {activeTab === "formulas" && (
                        <>
                            <ToolbarGroup label="Insert">
                                <Dropdown>
                                    <SmartTooltip text="Insert function" forceSide="bottom">
                                        <DropdownTrigger asChild>
                                            <Button variant="ghost" size="icon" className={cn(ICON_BTN, TOOL_BUTTON)}>
                                                <FunctionSquare className="size-3.5" />
                                            </Button>
                                        </DropdownTrigger>
                                    </SmartTooltip>
                                    <DropdownContent width={220} align="start" className="max-h-64 overflow-y-auto">
                                        {FORMULA_FUNCTIONS.map((fn) => (
                                            <DropdownSectionItem
                                                key={fn.name}
                                                icon={<Calculator className="size-3.5" />}
                                                onSelect={() => {
                                                    const formula = `=${fn.name}()`
                                                    s.startEdit(s.sel.col, s.sel.row, formula)
                                                }}
                                            >
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-medium">{fn.name}</span>
                                                    <span className="text-xs text-neutral-400">{fn.desc}</span>
                                                </div>
                                            </DropdownSectionItem>
                                        ))}
                                    </DropdownContent>
                                </Dropdown>
                            </ToolbarGroup>

                            <ToolbarDivider />

                            <ToolbarGroup label="Quick">
                                <SmartTooltip text="SUM" forceSide="bottom">
                                    <Button variant="ghost" size="sm" className="h-7 sq-lg text-xs text-neutral-700 dark:text-neutral-200" onClick={() => s.startEdit(s.sel.col, s.sel.row, "=SUM()")}>
                                        Σ SUM
                                    </Button>
                                </SmartTooltip>
                                <SmartTooltip text="AVERAGE" forceSide="bottom">
                                    <Button variant="ghost" size="sm" className="h-7 sq-lg text-xs text-neutral-700 dark:text-neutral-200" onClick={() => s.startEdit(s.sel.col, s.sel.row, "=AVERAGE()")}>
                                        x̄ AVG
                                    </Button>
                                </SmartTooltip>
                                <SmartTooltip text="COUNT" forceSide="bottom">
                                    <Button variant="ghost" size="sm" className="h-7 sq-lg text-xs text-neutral-700 dark:text-neutral-200" onClick={() => s.startEdit(s.sel.col, s.sel.row, "=COUNT()")}>
                                        # COUNT
                                    </Button>
                                </SmartTooltip>
                                <SmartTooltip text="MIN" forceSide="bottom">
                                    <Button variant="ghost" size="sm" className="h-7 sq-lg text-xs text-neutral-700 dark:text-neutral-200" onClick={() => s.startEdit(s.sel.col, s.sel.row, "=MIN()")}>
                                        ↓ MIN
                                    </Button>
                                </SmartTooltip>
                                <SmartTooltip text="MAX" forceSide="bottom">
                                    <Button variant="ghost" size="sm" className="h-7 sq-lg text-xs text-neutral-700 dark:text-neutral-200" onClick={() => s.startEdit(s.sel.col, s.sel.row, "=MAX()")}>
                                        ↑ MAX
                                    </Button>
                                </SmartTooltip>
                                <SmartTooltip text="IF" forceSide="bottom">
                                    <Button variant="ghost" size="sm" className="h-7 sq-lg text-xs text-neutral-700 dark:text-neutral-200" onClick={() => s.startEdit(s.sel.col, s.sel.row, "=IF()")}>
                                        ? IF
                                    </Button>
                                </SmartTooltip>
                            </ToolbarGroup>

                            <ToolbarDivider />

                            <ToolbarGroup label="Reference">
                                <SmartTooltip text="Show function reference" forceSide="bottom">
                                    <Button variant={showFormulaRef ? "glass" : "ghost"} size="icon" className={cn(ICON_BTN, TOOL_BUTTON)} onClick={() => setShowFormulaRef(!showFormulaRef)}>
                                        <ChevronDown className="size-3.5" />
                                    </Button>
                                </SmartTooltip>
                            </ToolbarGroup>
                        </>
                    )}

                    {/* ── DATA TAB ──────────────────────────────────────── */}
                    {activeTab === "data" && (
                        <>
                            <ToolbarGroup label="Sort">
                                <Dropdown>
                                    <SmartTooltip text="Sort column" forceSide="bottom">
                                        <DropdownTrigger asChild>
                                            <Button variant="ghost" size="icon" className={cn(ICON_BTN, TOOL_BUTTON)}>
                                                <Columns3 className="size-3.5" />
                                            </Button>
                                        </DropdownTrigger>
                                    </SmartTooltip>
                                    <DropdownContent width={200} align="start">
                                        <DropdownSectionItem icon={<Columns3 className="size-3.5" />} onSelect={() => s.sortColumn(s.sel.col, "asc")}>
                                            Sort A → Z
                                        </DropdownSectionItem>
                                        <DropdownSectionItem icon={<Columns3 className="size-3.5" />} onSelect={() => s.sortColumn(s.sel.col, "desc")}>
                                            Sort Z → A
                                        </DropdownSectionItem>
                                    </DropdownContent>
                                </Dropdown>
                            </ToolbarGroup>

                            <ToolbarDivider />

                            <ToolbarGroup label="Export">
                                <SmartTooltip text="Export as XLSX" forceSide="bottom">
                                    <Button variant="ghost" size="icon" className={cn(ICON_BTN, TOOL_BUTTON)} onClick={s.exportXlsx}>
                                        <Download className="size-3.5" />
                                    </Button>
                                </SmartTooltip>
                            </ToolbarGroup>

                            <ToolbarDivider />

                            <ToolbarGroup label="Clear">
                                <SmartTooltip text="Clear all formatting" forceSide="bottom">
                                    <Button variant="ghost" size="icon" className={cn(ICON_BTN, TOOL_BUTTON)} onClick={() => s.applyFormat({ b: undefined, i: undefined, u: undefined, s: undefined, fs: undefined, wrap: undefined, c: undefined, bg: undefined, al: undefined, bd: undefined })}>
                                        <Eraser className="size-3.5" />
                                    </Button>
                                </SmartTooltip>
                            </ToolbarGroup>
                        </>
                    )}

                    {/* ── VIEW TAB ──────────────────────────────────────── */}
                    {activeTab === "view" && (
                        <>
                            <ToolbarGroup label="Zoom">
                                <span className={`${UDS.inlineSurface} select-none px-2 py-1 text-xs font-medium text-neutral-500 dark:text-neutral-400`}>100%</span>
                            </ToolbarGroup>

                            <ToolbarDivider />

                            <ToolbarGroup label="Layout">
                                <SmartTooltip text="Toggle formula bar hints" forceSide="bottom">
                                    <Button variant={showFormulaRef ? "glass" : "ghost"} size="icon" className={cn(ICON_BTN, TOOL_BUTTON)} onClick={() => setShowFormulaRef(!showFormulaRef)}>
                                        <FunctionSquare className="size-3.5" />
                                    </Button>
                                </SmartTooltip>
                            </ToolbarGroup>
                        </>
                    )}
                </div>
            </div>

            {/* ═══ Formula reference panel (collapsible) ═════════════════ */}
            {showFormulaRef && (
                <div className={`${UDS.inlineSurface} mb-1 max-h-40 overflow-y-auto p-3 animate-fade-in-up`}>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
                        {FORMULA_FUNCTIONS.map((fn) => (
                            <Button variant="ghost"
                                key={fn.name}
                                onClick={() => {
                                    s.startEdit(s.sel.col, s.sel.row, `=${fn.name}()`)
                                    setShowFormulaRef(false)
                                }}
                                className={`${UDS.itemHover} flex cursor-pointer flex-col items-start px-2 py-1.5 text-left transition-colors`}
                            >
                                <span className="text-xs font-semibold text-foreground">{fn.syntax}</span>
                                <span className="text-xs text-neutral-400 leading-tight">{fn.desc}</span>
                            </Button>
                        ))}
                    </div>
                </div>
            )}

            {/* ═══ Spreadsheet card ══════════════════════════════════════ */}
            <div
                className={cn(
                    UDS.largeTileSurface,
                    SHEET_SURFACE_VARS,
                    "flex min-h-0 flex-1 flex-col overflow-hidden bg-[color:var(--sheet-cell-bg)]",
                    "shadow-[0_18px_50px_rgba(8,8,8,0.07)] dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]",
                )}
            >
                {/* Formula bar */}
                <div className={cn("flex min-h-10 shrink-0 items-center gap-2 border-b bg-[color:color-mix(in_srgb,var(--sheet-header-bg)_82%,transparent)] px-3 py-1", UDS.cardDivider)}>
                    <span className={`${UDS.inlineSurface} w-16 select-none px-1.5 py-1 text-center text-xs font-mono font-semibold text-foreground/75`}>
                        {selectedAddress}
                    </span>
                    <div className={cn("h-4", UDS.separatorVertical)} />
                    {isFormula(s.editing ? s.editVal : s.getCell(s.sel.col, s.sel.row).v) && (
                        <FunctionSquare className="size-3.5 text-primary shrink-0" />
                    )}
                    <input
                        value={s.editing ? s.editVal : s.getCell(s.sel.col, s.sel.row).v}
                        onChange={(e) => {
                            if (s.editing) { s.setEditVal(e.target.value) }
                            else { s.startEdit(s.sel.col, s.sel.row, e.target.value) }
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") { s.commitEdit(); gridRef.current?.focus() }
                            if (e.key === "Escape") { s.setEditing(null); gridRef.current?.focus() }
                        }}
                        className="h-8 flex-1 bg-transparent px-1 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                        placeholder="Enter a value or formula (e.g. =SUM(A1:A5))..."
                    />
                </div>

                {/* ═══ Virtualized Grid ══════════════════════════════════ */}
                <div
                    ref={gridRef}
                    className="relative flex-1 overflow-auto bg-[color:var(--sheet-cell-bg)] text-foreground outline-none"
                    tabIndex={0}
                    onKeyDown={s.handleGridKeyDown}
                    onScroll={s.handleScroll}
                >
                    <div style={{ width: s.totalWidth, height: s.totalHeight, position: "relative" }}>
                        {/* Corner */}
                        <div
                            className={cn("absolute border-b border-r", GRID_HEADER)}
                            style={{ position: "absolute", top: 0, left: 0, width: HEADER_W, height: ROW_H, zIndex: 30 }}
                        />

                        {/* Column headers (only visible) */}
                        {s.visibleCols.map((c) => {
                            const isActiveCol = c >= selectionBounds.c1 && c <= selectionBounds.c2

                            return (
                                <div
                                    key={`ch-${c}`}
                                    className={cn(
                                        "absolute top-0 z-20 flex select-none items-center justify-center border-b border-r text-xs font-semibold",
                                        GRID_HEADER,
                                        isActiveCol && GRID_HEADER_ACTIVE,
                                    )}
                                    style={{
                                        position: "absolute",
                                        top: 0,
                                        left: s.colOffsets[c] + HEADER_W,
                                        width: s.colW(c),
                                        height: ROW_H,
                                    }}
                                >
                                    {colLabel(c)}
                                    <div
                                        className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-primary/35 active:bg-primary/55"
                                        onMouseDown={(e) => s.startColResize(c, e)}
                                    />
                                </div>
                            )
                        })}

                        {/* Row headers (only visible) */}
                        {s.visibleRows.map((r) => {
                            const isActiveRow = r >= selectionBounds.r1 && r <= selectionBounds.r2

                            return (
                                <div
                                    key={`rh-${r}`}
                                    className={cn(
                                        "absolute left-0 z-10 flex select-none items-center justify-center border-b border-r text-center text-xs font-medium",
                                        GRID_HEADER,
                                        isActiveRow && GRID_HEADER_ACTIVE,
                                    )}
                                    style={{
                                        position: "absolute",
                                        top: (r + 1) * ROW_H,
                                        left: 0,
                                        width: HEADER_W,
                                        height: ROW_H,
                                    }}
                                >
                                    {r + 1}
                                </div>
                            )
                        })}

                        {/* Cells (only visible) — event delegation via container */}
                        <div
                            onMouseDown={s.handleGridMouseDown}
                            onMouseOver={s.handleGridMouseOver}
                            onDoubleClick={s.handleGridDblClick}
                            onContextMenu={s.handleGridContextMenu}
                        >
                            {s.visibleRows.map((r) =>
                                s.visibleCols.map((c) => {
                                    const merge = s.findMerge(c, r)
                                    if (merge && (c !== merge.sc || r !== merge.sr)) return null

                                    const cell = s.getCell(c, r)
                                    const isSelected = s.sel.col === c && s.sel.row === r
                                    const inRange = s.isInRangeFn(c, r)
                                    const isEditingThis = s.editing?.col === c && s.editing?.row === r
                                    const align = cell.al === "c" ? "center" : cell.al === "r" ? "right" : cell.al === "j" ? "justify" : "left"
                                    const valign = cell.va === "m" ? "center" : cell.va === "b" ? "flex-end" : "flex-start"
                                    const indentPx = (cell.ind ?? 0) * 12
                                    const rotation = cell.rot ?? 0
                                    const fontSize = cell.fs ?? 14
                                    const textDecoration = [cell.u && "underline", cell.s && "line-through"].filter(Boolean).join(" ") || undefined
                                    const cellKey = `${colLabel(c)}${r + 1}`
                                    const isFlashing = s.flashCells.has(cellKey)

                                    let cellW = s.colW(c)
                                    let cellH = ROW_H
                                    if (merge) {
                                        cellW = 0
                                        for (let mc = merge.sc; mc <= merge.ec; mc++) cellW += s.colW(mc)
                                        cellH = (merge.er - merge.sr + 1) * ROW_H
                                    }

                                    return (
                                        <div
                                            key={`${c}-${r}`}
                                            data-col={c}
                                            data-row={r}
                                            className={cn(
                                                "absolute overflow-hidden border-b border-r bg-[color:var(--sheet-cell-bg)] text-foreground",
                                                GRID_LINE,
                                                (inRange || isSelected) && "bg-[color:var(--selection-cell-background)]",
                                            )}
                                            style={{
                                                top: (r + 1) * ROW_H,
                                                left: s.colOffsets[c] + HEADER_W,
                                                width: cellW,
                                                height: cellH,
                                                backgroundColor: !inRange && !isSelected ? (cell.bg || undefined) : undefined,
                                                borderTop: borderCss(cell.bd?.t) || undefined,
                                                borderRight: borderCss(cell.bd?.r) || undefined,
                                                borderBottom: borderCss(cell.bd?.b) || undefined,
                                                borderLeft: borderCss(cell.bd?.l) || undefined,
                                                zIndex: merge ? 5 : isSelected ? 6 : undefined,
                                            }}
                                        >
                                            {isEditingThis ? (
                                                <input
                                                    ref={editRef}
                                                    value={s.editVal}
                                                    onChange={(e) => s.setEditVal(e.target.value)}
                                                    onBlur={s.commitEdit}
                                                    className="absolute inset-0 z-20 h-full w-full border-2 border-primary bg-background px-2 outline-none"
                                                    style={{
                                                        fontSize,
                                                        fontFamily: cell.ff || undefined,
                                                        fontWeight: cell.b ? 700 : 400,
                                                        fontStyle: cell.i ? "italic" : "normal",
                                                        textDecoration,
                                                        textAlign: align,
                                                        color: cell.c || undefined,
                                                    }}
                                                />
                                            ) : (
                                                <>
                                                    <div
                                                        className={cn(
                                                            "flex w-full h-full select-none",
                                                            valign === "flex-start" ? "items-start" : valign === "flex-end" ? "items-end" : "items-center",
                                                            align === "center" ? "justify-center" : align === "right" ? "justify-end" : align === "justify" ? "justify-stretch" : "justify-start",
                                                        )}
                                                    >
                                                        <div
                                                            className={cn(
                                                                cell.wrap ? "whitespace-pre-wrap wrap-break-word overflow-hidden" : "truncate",
                                                                rotation !== 0 ? "" : "w-full",
                                                            )}
                                                            style={{
                                                                fontSize,
                                                                fontFamily: cell.ff || undefined,
                                                                fontWeight: cell.b ? 700 : 400,
                                                                fontStyle: cell.i ? "italic" : "normal",
                                                                textDecoration,
                                                                textAlign: align,
                                                                color: cell.c || undefined,
                                                                paddingLeft: 8 + indentPx,
                                                                paddingRight: 8,
                                                                paddingTop: cell.wrap ? 4 : undefined,
                                                                lineHeight: cell.wrap ? 1.35 : 1.25,
                                                                transform: rotation !== 0 ? `rotate(${-rotation}deg)` : undefined,
                                                                transformOrigin: rotation !== 0 ? "center" : undefined,
                                                                whiteSpace: rotation !== 0 ? "nowrap" : undefined,
                                                            }}
                                                        >
                                                            {s.getDisplayValue(c, r)}
                                                        </div>
                                                    </div>
                                                    {/* Formula flash animation */}
                                                    {isFlashing && (
                                                        <div className="absolute inset-0 pointer-events-none z-10 animate-formula-flash sq-sm" />
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    )
                                }),
                            )}
                        </div>

                        {/* ── Selection outline + fill handle ────────────── */}
                        {(() => {
                            let sc = s.range ? Math.min(s.range.sc, s.range.ec) : s.sel.col
                            let ec = s.range ? Math.max(s.range.sc, s.range.ec) : s.sel.col
                            let sr = s.range ? Math.min(s.range.sr, s.range.er) : s.sel.row
                            let er = s.range ? Math.max(s.range.sr, s.range.er) : s.sel.row
                            // Expand selection bounds to cover any merged cells that overlap
                            const merges = s.getMergedCells()
                            let changed = true
                            while (changed) {
                                changed = false
                                for (const m of merges) {
                                    if (m.sc <= ec && m.ec >= sc && m.sr <= er && m.er >= sr) {
                                        if (m.sc < sc) { sc = m.sc; changed = true }
                                        if (m.ec > ec) { ec = m.ec; changed = true }
                                        if (m.sr < sr) { sr = m.sr; changed = true }
                                        if (m.er > er) { er = m.er; changed = true }
                                    }
                                }
                            }
                            let w = 0
                            for (let c = sc; c <= ec; c++) w += s.colW(c)
                            const h = (er - sr + 1) * ROW_H
                            const left = s.colOffsets[sc] + HEADER_W
                            const top = (sr + 1) * ROW_H
                            const isEditing = !!s.editing

                            const preview = (() => {
                                if (!s.fillDrag) return null
                                let psc = sc
                                let pec = ec
                                let psr = sr
                                let per = er

                                if (s.fillDrag.endRow > er) {
                                    psr = er + 1
                                    per = s.fillDrag.endRow
                                } else if (s.fillDrag.endRow < sr) {
                                    psr = s.fillDrag.endRow
                                    per = sr - 1
                                } else if (s.fillDrag.endCol > ec) {
                                    psc = ec + 1
                                    pec = s.fillDrag.endCol
                                } else if (s.fillDrag.endCol < sc) {
                                    psc = s.fillDrag.endCol
                                    pec = sc - 1
                                } else {
                                    return null
                                }

                                if (psc > pec || psr > per) return null

                                let previewWidth = 0
                                for (let c = psc; c <= pec; c++) previewWidth += s.colW(c)
                                const previewHeight = (per - psr + 1) * ROW_H

                                return {
                                    left: s.colOffsets[psc] + HEADER_W,
                                    top: (psr + 1) * ROW_H,
                                    width: previewWidth,
                                    height: previewHeight,
                                }
                            })()

                            return (
                                <>
                                    {preview && (
                                        <div
                                            className="absolute pointer-events-none"
                                            style={{ left: preview.left, top: preview.top, width: preview.width, height: preview.height, zIndex: 7 }}
                                        >
                                            <div className="absolute inset-0 border border-[color:var(--selection-cell-border)] bg-[color:var(--selection-cell-background)]" />
                                        </div>
                                    )}

                                    <div
                                        className="absolute pointer-events-none overflow-visible"
                                        style={{ left, top, width: w, height: h, zIndex: 8 }}
                                    >
                                        <div className="absolute inset-0 border-2 border-[color:var(--selection-cell-border)]" />
                                        {!isEditing && !s.fillDrag && (
                                            <Button variant="ghost"
                                                type="button"
                                                data-fill-handle="true"
                                                aria-label="Drag to fill"
                                                className="absolute z-30 flex size-3 items-center justify-center sq-full p-0 cursor-crosshair pointer-events-auto bg-transparent outline-none"
                                                style={{ right: 0, bottom: 0, transform: "translate(35%, 35%)" }}
                                                onMouseDown={s.handleFillDragStart}
                                            >
                                                <span className="block h-2 w-2 sq-full border border-background bg-foreground shadow-[0_1px_2px_rgba(0,0,0,0.18)]" />
                                            </Button>
                                        )}
                                    </div>
                                </>
                            )
                        })()}
                    </div>
                </div>

                {/* Context Menu */}
                {s.ctxMenu && (
                    <GridContextMenu
                        x={s.ctxMenu.x}
                        y={s.ctxMenu.y}
                        onClose={() => s.setCtxMenu(null)}
                        actions={s.contextMenuActions}
                    />
                )}

                {/* ═══ Sheet tabs ════════════════════════════════════════ */}
                <div className={cn("flex min-h-11 shrink-0 items-center justify-between gap-3 border-t bg-[color:color-mix(in_srgb,var(--sheet-header-bg)_74%,transparent)] px-3 py-2", UDS.cardDivider)}>
                    <div className="flex min-w-0 items-center gap-1 overflow-x-auto">
                        {s.wb.sheets.map((sh, i) => (
                            <Button variant="ghost"
                                key={i}
                                className={cn(
                                    "h-7 cursor-pointer select-none whitespace-nowrap px-3 py-1.5 text-xs transition-all duration-150 sq-full",
                                    i === s.wb.activeSheet
                                        ? cn(UDS.selectedControl, "font-semibold")
                                        : cn("text-neutral-400 hover:text-foreground", UDS.itemHover)
                                )}
                                onClick={() => s.switchSheet(i)}
                                onDoubleClick={() => s.renameSheet(i)}
                            >
                                {sh.name}
                            </Button>
                        ))}
                        <Button variant="ghost" size="icon-sm" onClick={s.addSheet}>
                            <Plus className="size-3.5" />
                        </Button>
                    </div>
                    <div className="hidden shrink-0 items-center gap-1.5 text-xs text-muted-foreground sm:flex">
                        <span className={`${UDS.pillSurface} px-2 py-1 font-mono font-semibold text-foreground/80`}>{s.selectionSummary.address}</span>
                        <span className="px-1.5 py-1">{formatStatusNumber.format(s.selectionSummary.cellCount)} cells</span>
                        <span className="px-1.5 py-1">Count {formatStatusNumber.format(s.selectionSummary.filledCount)}</span>
                        {s.selectionSummary.numberCount > 0 && (
                            <>
                                <span className="px-1.5 py-1">Sum {formatStatusNumber.format(s.selectionSummary.sum)}</span>
                                <span className="px-1.5 py-1">Avg {formatStatusNumber.format(s.selectionSummary.average)}</span>
                            </>
                        )}
                    </div>
                </div>
            </div>
            <FindReplaceDialog open={findOpen} onOpenChange={setFindOpen} onFind={s.findReplace} />
        </TooltipProvider>
    )
}
