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

const ICON_BTN = "rounded-full"
const TOOL_BUTTON = ""

const FONT_FAMILIES = [
    "Inter",
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
    return <div className="mx-2 h-10 w-px bg-border/50 shrink-0" />
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
    const s = useSpreadsheet({ initialDoc, initialTemplateSheets, initialTemplateName, finance: data })
    const [activeTab, setActiveTab] = React.useState<ToolbarTab>("home")
    const [showFormulaRef, setShowFormulaRef] = React.useState(false)
    const [findOpen, setFindOpen] = React.useState(false)
    const formatStatusNumber = React.useMemo(() => new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }), [])
    const selectedAddress = `${colLabel(s.sel.col)}${s.sel.row + 1}`

    /* ── Cell font family / number format read-out ──────────────────── */
    const activeCell = s.getCell(s.sel.col, s.sel.row)
    const activeFontFamily = activeCell.ff ?? "Inter"
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
                                <ArrowLeft className="h-3.5 w-3.5" />
                            </Button>
                        </SmartTooltip>
                    )}
                    <SmartTooltip text="Undo (⌘Z)" forceSide="bottom">
                        <Button variant="ghost" size="icon" className={ICON_BTN} onClick={s.handleUndo}>
                            <Undo2 className="h-3.5 w-3.5" />
                        </Button>
                    </SmartTooltip>
                    <SmartTooltip text="Redo (⌘Y)" forceSide="bottom">
                        <Button variant="ghost" size="icon" className={ICON_BTN} onClick={s.handleRedo}>
                            <Redo2 className="h-3.5 w-3.5" />
                        </Button>
                    </SmartTooltip>

                    <Separator orientation="vertical" className="data-[orientation=vertical]:h-4 ml-2 mr-2" />

                    <input
                        value={s.docName}
                        onChange={(e) => s.setDocName(e.target.value)}
                        className="h-7 w-40 rounded border border-transparent px-2 text-sm font-medium bg-transparent hover:border-black/10 focus:bg-background/90 focus:border-primary focus:outline-none dark:hover:border-white/10 dark:focus:bg-neutral-900/80 truncate"
                        placeholder={s.sp.untitled || "Untitled"}
                    />

                    <div className="ml-auto flex items-center gap-1 shrink-0">
                        <SmartTooltip text="Save (⌘S)" forceSide="bottom">
                            <Button variant="ghost" size="icon" className={ICON_BTN} onClick={s.saveToServer} disabled={s.saving}>
                                {s.saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                            </Button>
                        </SmartTooltip>
                        <SmartTooltip text="Export XLSX" forceSide="bottom">
                            <Button variant="ghost" size="icon" className={ICON_BTN} onClick={s.exportXlsx}>
                                <Download className="h-3.5 w-3.5" />
                            </Button>
                        </SmartTooltip>
                        <SmartTooltip text="Share" forceSide="bottom">
                            <Button variant="ghost" size="icon" className={ICON_BTN} onClick={handleShare}>
                                <Share2 className="h-3.5 w-3.5" />
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
            <div className="flex flex-col overflow-hidden animate-fade-in-up stagger-1">
                {/* Tab row */}
                <div className="flex items-center gap-0 px-1">
                    {TAB_ITEMS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "px-3.5 py-2 text-sm font-medium cursor-pointer select-none transition-colors relative",
                                activeTab === tab.id
                                    ? "text-primary"
                                    : "text-neutral-400 hover:text-foreground",
                            )}
                        >
                            {tab.label}
                            {activeTab === tab.id && (
                                <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />
                            )}
                        </button>
                    ))}
                </div>

                {/* Tab content */}
                <div className="flex items-center gap-1 px-1 py-2 min-h-14 overflow-x-auto scrollbar-none">
                    {/* ── HOME TAB ──────────────────────────────────────── */}
                    {activeTab === "home" && (
                        <>
                            {/* Clipboard */}
                            <ToolbarGroup>
                                <SmartTooltip text="Cut (⌘X)" forceSide="bottom">
                                    <Button variant="ghost" size="icon" className={cn(ICON_BTN, TOOL_BUTTON)} onClick={() => s.copySelection(true)}>
                                        <Scissors className="h-3.5 w-3.5" />
                                    </Button>
                                </SmartTooltip>
                                <SmartTooltip text="Copy (⌘C)" forceSide="bottom">
                                    <Button variant="ghost" size="icon" className={cn(ICON_BTN, TOOL_BUTTON)} onClick={() => s.copySelection()}>
                                        <Copy className="h-3.5 w-3.5" />
                                    </Button>
                                </SmartTooltip>
                                <SmartTooltip text="Paste (⌘V)" forceSide="bottom">
                                    <Button variant="ghost" size="icon" className={cn(ICON_BTN, TOOL_BUTTON)} onClick={s.pasteSelection}>
                                        <ClipboardPaste className="h-3.5 w-3.5" />
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
                                        <Paintbrush className="h-3.5 w-3.5" />
                                    </Button>
                                </SmartTooltip>
                            </ToolbarGroup>

                            <ToolbarDivider />

                            {/* Font */}
                            <ToolbarGroup>
                                <Dropdown>
                                    <DropdownTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-7 w-28 justify-between rounded-lg px-2 text-[11px]" title="Font family">
                                            <span className="truncate" style={{ fontFamily: activeFontFamily }}>{activeFontFamily}</span>
                                            <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
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
                                        <Button variant="ghost" size="sm" className="h-7 w-12 justify-between rounded-lg px-2 text-[11px]" title="Font size">
                                            <span>{s.activeFormat.fontSize}</span>
                                            <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
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
                                        <AArrowUp className="h-3.5 w-3.5" />
                                    </Button>
                                </SmartTooltip>
                                <SmartTooltip text="Decrease font size" forceSide="bottom">
                                    <Button variant="ghost" size="icon" className={cn(ICON_BTN, TOOL_BUTTON)} onClick={() => s.bumpFontSize(-1)}>
                                        <AArrowDown className="h-3.5 w-3.5" />
                                    </Button>
                                </SmartTooltip>
                                <SmartTooltip text="Bold (⌘B)" forceSide="bottom">
                                    <Button variant={s.activeFormat.bold ? "glass" : "ghost"} size="icon" className={cn(ICON_BTN, TOOL_BUTTON)} onClick={() => s.toggleFormat("b")}>
                                        <Bold className="h-3.5 w-3.5" />
                                    </Button>
                                </SmartTooltip>
                                <SmartTooltip text="Italic (⌘I)" forceSide="bottom">
                                    <Button variant={s.activeFormat.italic ? "glass" : "ghost"} size="icon" className={cn(ICON_BTN, TOOL_BUTTON)} onClick={() => s.toggleFormat("i")}>
                                        <Italic className="h-3.5 w-3.5" />
                                    </Button>
                                </SmartTooltip>
                                <SmartTooltip text="Underline (⌘U)" forceSide="bottom">
                                    <Button variant={s.activeFormat.underline ? "glass" : "ghost"} size="icon" className={cn(ICON_BTN, TOOL_BUTTON)} onClick={() => s.toggleFormat("u")}>
                                        <Underline className="h-3.5 w-3.5" />
                                    </Button>
                                </SmartTooltip>
                                <SmartTooltip text="Strikethrough" forceSide="bottom">
                                    <Button variant={s.activeFormat.strikethrough ? "glass" : "ghost"} size="icon" className={cn(ICON_BTN, TOOL_BUTTON)} onClick={() => s.toggleFormat("s")}>
                                        <Strikethrough className="h-3.5 w-3.5" />
                                    </Button>
                                </SmartTooltip>
                                <BorderDropdown onApply={s.applyBorders} onMerge={s.mergeCells} onUnmerge={s.unmergeCells} />
                                <ColorPickerPopover onSelect={(c) => s.applyFormat({ bg: c || undefined })}>
                                    <Button variant="ghost" size="icon" className={cn(ICON_BTN, TOOL_BUTTON)} title="Fill color">
                                        <PaintBucket className="h-3.5 w-3.5" />
                                    </Button>
                                </ColorPickerPopover>
                                <ColorPickerPopover onSelect={(c) => s.applyFormat({ c: c || undefined })}>
                                    <Button variant="ghost" size="icon" className={cn(ICON_BTN, TOOL_BUTTON)} title="Font color">
                                        <Type className="h-3.5 w-3.5" />
                                    </Button>
                                </ColorPickerPopover>
                                <SmartTooltip text="Clear formatting" forceSide="bottom">
                                    <Button variant="ghost" size="icon" className={cn(ICON_BTN, TOOL_BUTTON)} onClick={s.clearFormats}>
                                        <Eraser className="h-3.5 w-3.5" />
                                    </Button>
                                </SmartTooltip>
                            </ToolbarGroup>

                            <ToolbarDivider />

                            {/* Alignment */}
                            <ToolbarGroup>
                                <Dropdown>
                                    <DropdownTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-7 rounded-lg gap-1 px-2 text-[11px]" title="Alignment">
                                            <AlignLeft className="h-3.5 w-3.5" />
                                            Align
                                            <ChevronDown className="h-3 w-3" />
                                        </Button>
                                    </DropdownTrigger>
                                    <DropdownContent width={220} align="start">
                                        <DropdownSectionItem icon={<AlignLeft className="h-3.5 w-3.5" />} onSelect={() => s.setAlignment("l")}>Align left</DropdownSectionItem>
                                        <DropdownSectionItem icon={<AlignCenter className="h-3.5 w-3.5" />} onSelect={() => s.setAlignment("c")}>Align center</DropdownSectionItem>
                                        <DropdownSectionItem icon={<AlignRight className="h-3.5 w-3.5" />} onSelect={() => s.setAlignment("r")}>Align right</DropdownSectionItem>
                                        <DropdownSectionItem icon={<AlignJustify className="h-3.5 w-3.5" />} onSelect={() => s.setAlignment("j")}>Justify</DropdownSectionItem>
                                        <DropdownSectionItem icon={<AlignVerticalJustifyStart className="h-3.5 w-3.5" />} onSelect={() => s.setVerticalAlign("t")}>Align top</DropdownSectionItem>
                                        <DropdownSectionItem icon={<AlignVerticalJustifyCenter className="h-3.5 w-3.5" />} onSelect={() => s.setVerticalAlign("m")}>Align middle</DropdownSectionItem>
                                        <DropdownSectionItem icon={<AlignVerticalJustifyEnd className="h-3.5 w-3.5" />} onSelect={() => s.setVerticalAlign("b")}>Align bottom</DropdownSectionItem>
                                        <DropdownSectionItem icon={<WrapText className="h-3.5 w-3.5" />} onSelect={() => s.toggleFormat("wrap")}>{s.activeFormat.wrap ? "Disable wrap text" : "Wrap text"}</DropdownSectionItem>
                                        <DropdownSectionItem icon={<IndentDecrease className="h-3.5 w-3.5" />} onSelect={() => s.bumpIndent(-1)}>Decrease indent</DropdownSectionItem>
                                        <DropdownSectionItem icon={<IndentIncrease className="h-3.5 w-3.5" />} onSelect={() => s.bumpIndent(1)}>Increase indent</DropdownSectionItem>
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
                                        <TableCellsMerge className="h-3.5 w-3.5" />
                                    </Button>
                                </SmartTooltip>
                            </ToolbarGroup>

                            <ToolbarDivider />

                            {/* Number */}
                            <ToolbarGroup>
                                <Dropdown>
                                    <DropdownTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-7 w-28 justify-between rounded-lg px-2 text-[11px]" title="Number format">
                                            <span className="truncate">{activeNfLabel}</span>
                                            <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
                                        </Button>
                                    </DropdownTrigger>
                                    <DropdownContent width={240} align="start">
                                        {NUMBER_FORMAT_OPTIONS.map((o) => (
                                            <DropdownSectionItem key={o.value} onSelect={() => s.applyNumberFormat(buildNumberFormat(o.value))}>
                                                <div className="flex w-full items-center justify-between gap-2">
                                                    <span className="text-[12px]">{o.label}</span>
                                                    <span className="text-[10px] text-neutral-400">{o.sample}</span>
                                                </div>
                                            </DropdownSectionItem>
                                        ))}
                                    </DropdownContent>
                                </Dropdown>
                                <SmartTooltip text="Currency" forceSide="bottom">
                                    <Button variant="ghost" size="icon" className={cn(ICON_BTN, TOOL_BUTTON)} onClick={() => s.applyNumberFormat(buildNumberFormat("currency"))}>
                                        <DollarSign className="h-3.5 w-3.5" />
                                    </Button>
                                </SmartTooltip>
                                <SmartTooltip text="Percent" forceSide="bottom">
                                    <Button variant="ghost" size="icon" className={cn(ICON_BTN, TOOL_BUTTON)} onClick={() => s.applyNumberFormat(buildNumberFormat("percent"))}>
                                        <Percent className="h-3.5 w-3.5" />
                                    </Button>
                                </SmartTooltip>
                                <SmartTooltip text="Comma style" forceSide="bottom">
                                    <Button variant="ghost" size="sm" className="h-7 rounded-lg px-2 text-[11px] font-semibold" onClick={() => s.applyNumberFormat(buildNumberFormat("comma"))}>
                                        ,
                                    </Button>
                                </SmartTooltip>
                                <SmartTooltip text="Increase decimal" forceSide="bottom">
                                    <Button variant="ghost" size="sm" className="h-7 rounded-lg px-1.5 text-[10px] tracking-tight" onClick={() => s.bumpDecimals(1)}>
                                        ←.0
                                    </Button>
                                </SmartTooltip>
                                <SmartTooltip text="Decrease decimal" forceSide="bottom">
                                    <Button variant="ghost" size="sm" className="h-7 rounded-lg px-1.5 text-[10px] tracking-tight" onClick={() => s.bumpDecimals(-1)}>
                                        .0→
                                    </Button>
                                </SmartTooltip>
                            </ToolbarGroup>

                            <ToolbarDivider />

                            {/* Styles */}
                            <ToolbarGroup>
                                <Dropdown>
                                    <DropdownTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-7 rounded-lg gap-1 px-2 text-[11px]" title="Conditional formatting">
                                            <Sparkles className="h-3.5 w-3.5" />
                                            Conditional
                                            <ChevronDown className="h-3 w-3" />
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
                                        <Button variant="ghost" size="sm" className="h-7 rounded-lg gap-1 px-2 text-[11px]" title="Format as table">
                                            <TableIcon className="h-3.5 w-3.5" />
                                            Table
                                            <ChevronDown className="h-3 w-3" />
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
                                        <Button variant="ghost" size="sm" className="h-7 rounded-lg gap-1 px-2 text-[11px]" title="Cell styles">
                                            <LayoutGrid className="h-3.5 w-3.5" />
                                            Styles
                                            <ChevronDown className="h-3 w-3" />
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
                                        <Button variant="ghost" size="sm" className="h-7 rounded-lg gap-1 px-2 text-[11px]" title="Insert">
                                            <Plus className="h-3.5 w-3.5" />
                                            Insert
                                            <ChevronDown className="h-3 w-3" />
                                        </Button>
                                    </DropdownTrigger>
                                    <DropdownContent width={200} align="start">
                                        <DropdownSectionItem icon={<InsertRow className="h-3.5 w-3.5" />} onSelect={() => s.insertRow(s.sel.row)}>Insert row above</DropdownSectionItem>
                                        <DropdownSectionItem icon={<InsertRow className="h-3.5 w-3.5" />} onSelect={() => s.insertRow(s.sel.row + 1)}>Insert row below</DropdownSectionItem>
                                        <DropdownSectionItem icon={<InsertColumn className="h-3.5 w-3.5" />} onSelect={() => s.insertCol(s.sel.col)}>Insert column left</DropdownSectionItem>
                                        <DropdownSectionItem icon={<InsertColumn className="h-3.5 w-3.5" />} onSelect={() => s.insertCol(s.sel.col + 1)}>Insert column right</DropdownSectionItem>
                                        <DropdownSectionItem icon={<Plus className="h-3.5 w-3.5" />} onSelect={s.addSheet}>Insert sheet</DropdownSectionItem>
                                    </DropdownContent>
                                </Dropdown>
                                <Dropdown>
                                    <DropdownTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-7 rounded-lg gap-1 px-2 text-[11px]" title="Delete">
                                            <DeleteRow className="h-3.5 w-3.5" />
                                            Delete
                                            <ChevronDown className="h-3 w-3" />
                                        </Button>
                                    </DropdownTrigger>
                                    <DropdownContent width={200} align="start">
                                        <DropdownSectionItem icon={<DeleteRow className="h-3.5 w-3.5" />} onSelect={() => s.deleteRow(s.sel.row)}>Delete row</DropdownSectionItem>
                                        <DropdownSectionItem icon={<DeleteColumn className="h-3.5 w-3.5" />} onSelect={() => s.deleteCol(s.sel.col)}>Delete column</DropdownSectionItem>
                                    </DropdownContent>
                                </Dropdown>
                                <Dropdown>
                                    <DropdownTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-7 rounded-lg gap-1 px-2 text-[11px]" title="Format">
                                            <Brush className="h-3.5 w-3.5" />
                                            Format
                                            <ChevronDown className="h-3 w-3" />
                                        </Button>
                                    </DropdownTrigger>
                                    <DropdownContent width={220} align="start">
                                        <DropdownSectionItem onSelect={() => s.renameSheet(s.wb.activeSheet)}>Rename sheet…</DropdownSectionItem>
                                        <DropdownSectionItem icon={<ArrowDown className="h-3.5 w-3.5" />} onSelect={s.fillDown}>Fill down (⌘D)</DropdownSectionItem>
                                        <DropdownSectionItem icon={<ArrowRight className="h-3.5 w-3.5" />} onSelect={s.fillRight}>Fill right (⌘R)</DropdownSectionItem>
                                    </DropdownContent>
                                </Dropdown>
                            </ToolbarGroup>

                            <ToolbarDivider />

                            {/* Editing */}
                            <ToolbarGroup>
                                <Dropdown>
                                    <DropdownTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-7 rounded-lg gap-1 px-2 text-[11px]" title="AutoSum">
                                            <Sigma className="h-3.5 w-3.5" />
                                            <ChevronDown className="h-3 w-3" />
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
                                        <Button variant="ghost" size="sm" className="h-7 rounded-lg gap-1 px-2 text-[11px]" title="Clear">
                                            <Eraser className="h-3.5 w-3.5" />
                                            <ChevronDown className="h-3 w-3" />
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
                                        <Button variant="ghost" size="sm" className="h-7 rounded-lg gap-1 px-2 text-[11px]" title="Sort & Filter">
                                            <Filter className="h-3.5 w-3.5" />
                                            <ChevronDown className="h-3 w-3" />
                                        </Button>
                                    </DropdownTrigger>
                                    <DropdownContent width={200} align="start">
                                        <DropdownSectionItem icon={<SortAsc className="h-3.5 w-3.5" />} onSelect={() => s.sortColumn(s.sel.col, "asc")}>Sort A → Z</DropdownSectionItem>
                                        <DropdownSectionItem icon={<SortDesc className="h-3.5 w-3.5" />} onSelect={() => s.sortColumn(s.sel.col, "desc")}>Sort Z → A</DropdownSectionItem>
                                    </DropdownContent>
                                </Dropdown>
                                <Dropdown>
                                    <DropdownTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-7 rounded-lg gap-1 px-2 text-[11px]" title="Find & Select (⌘F)">
                                            <Search className="h-3.5 w-3.5" />
                                            <ChevronDown className="h-3 w-3" />
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
                                                <InsertRow className="h-3.5 w-3.5" />
                                            </Button>
                                        </DropdownTrigger>
                                    </SmartTooltip>
                                    <DropdownContent width={180} align="start">
                                        <DropdownSectionItem icon={<InsertRow className="h-3.5 w-3.5" />} onSelect={() => s.insertRow(s.sel.row)}>
                                            Insert row above
                                        </DropdownSectionItem>
                                        <DropdownSectionItem icon={<InsertRow className="h-3.5 w-3.5" />} onSelect={() => s.insertRow(s.sel.row + 1)}>
                                            Insert row below
                                        </DropdownSectionItem>
                                    </DropdownContent>
                                </Dropdown>
                                <SmartTooltip text="Delete row" forceSide="bottom">
                                    <Button variant="ghost" size="icon" className={cn(ICON_BTN, TOOL_BUTTON)} onClick={() => s.deleteRow(s.sel.row)}>
                                        <DeleteRow className="h-3.5 w-3.5" />
                                    </Button>
                                </SmartTooltip>
                            </ToolbarGroup>

                            <ToolbarDivider />

                            <ToolbarGroup label="Columns">
                                <Dropdown>
                                    <SmartTooltip text="Insert column" forceSide="bottom">
                                        <DropdownTrigger asChild>
                                            <Button variant="ghost" size="icon" className={cn(ICON_BTN, TOOL_BUTTON)}>
                                                <InsertColumn className="h-3.5 w-3.5" />
                                            </Button>
                                        </DropdownTrigger>
                                    </SmartTooltip>
                                    <DropdownContent width={180} align="start">
                                        <DropdownSectionItem icon={<InsertColumn className="h-3.5 w-3.5" />} onSelect={() => s.insertCol(s.sel.col)}>
                                            Insert column left
                                        </DropdownSectionItem>
                                        <DropdownSectionItem icon={<InsertColumn className="h-3.5 w-3.5" />} onSelect={() => s.insertCol(s.sel.col + 1)}>
                                            Insert column right
                                        </DropdownSectionItem>
                                    </DropdownContent>
                                </Dropdown>
                                <SmartTooltip text="Delete column" forceSide="bottom">
                                    <Button variant="ghost" size="icon" className={cn(ICON_BTN, TOOL_BUTTON)} onClick={() => s.deleteCol(s.sel.col)}>
                                        <DeleteColumn className="h-3.5 w-3.5" />
                                    </Button>
                                </SmartTooltip>
                            </ToolbarGroup>

                            <ToolbarDivider />

                            <ToolbarGroup label="Cells">
                                <SmartTooltip text="Merge cells" forceSide="bottom">
                                    <Button variant="ghost" size="icon" className={cn(ICON_BTN, TOOL_BUTTON)} onClick={s.mergeCells}>
                                        <TableCellsMerge className="h-3.5 w-3.5" />
                                    </Button>
                                </SmartTooltip>
                                <SmartTooltip text="Unmerge cells" forceSide="bottom">
                                    <Button variant="ghost" size="icon" className={cn(ICON_BTN, TOOL_BUTTON)} onClick={s.unmergeCells}>
                                        <TableCellsSplit className="h-3.5 w-3.5" />
                                    </Button>
                                </SmartTooltip>
                            </ToolbarGroup>

                            <ToolbarDivider />

                            <ToolbarGroup label="Sheet">
                                <SmartTooltip text="Add sheet" forceSide="bottom">
                                    <Button variant="ghost" size="icon" className={cn(ICON_BTN, TOOL_BUTTON)} onClick={s.addSheet}>
                                        <Plus className="h-3.5 w-3.5" />
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
                                                <FunctionSquare className="h-3.5 w-3.5" />
                                            </Button>
                                        </DropdownTrigger>
                                    </SmartTooltip>
                                    <DropdownContent width={220} align="start" className="max-h-64 overflow-y-auto">
                                        {FORMULA_FUNCTIONS.map((fn) => (
                                            <DropdownSectionItem
                                                key={fn.name}
                                                icon={<Calculator className="h-3.5 w-3.5" />}
                                                onSelect={() => {
                                                    const formula = `=${fn.name}()`
                                                    s.startEdit(s.sel.col, s.sel.row, formula)
                                                }}
                                            >
                                                <div className="flex flex-col">
                                                    <span className="text-[12px] font-medium">{fn.name}</span>
                                                    <span className="text-[10px] text-neutral-400">{fn.desc}</span>
                                                </div>
                                            </DropdownSectionItem>
                                        ))}
                                    </DropdownContent>
                                </Dropdown>
                            </ToolbarGroup>

                            <ToolbarDivider />

                            <ToolbarGroup label="Quick">
                                <SmartTooltip text="SUM" forceSide="bottom">
                                    <Button variant="ghost" size="sm" className="h-7 rounded-lg text-[11px] text-neutral-700 dark:text-neutral-200" onClick={() => s.startEdit(s.sel.col, s.sel.row, "=SUM()")}> 
                                        Σ SUM
                                    </Button>
                                </SmartTooltip>
                                <SmartTooltip text="AVERAGE" forceSide="bottom">
                                    <Button variant="ghost" size="sm" className="h-7 rounded-lg text-[11px] text-neutral-700 dark:text-neutral-200" onClick={() => s.startEdit(s.sel.col, s.sel.row, "=AVERAGE()")}> 
                                        x̄ AVG
                                    </Button>
                                </SmartTooltip>
                                <SmartTooltip text="COUNT" forceSide="bottom">
                                    <Button variant="ghost" size="sm" className="h-7 rounded-lg text-[11px] text-neutral-700 dark:text-neutral-200" onClick={() => s.startEdit(s.sel.col, s.sel.row, "=COUNT()")}> 
                                        # COUNT
                                    </Button>
                                </SmartTooltip>
                                <SmartTooltip text="MIN" forceSide="bottom">
                                    <Button variant="ghost" size="sm" className="h-7 rounded-lg text-[11px] text-neutral-700 dark:text-neutral-200" onClick={() => s.startEdit(s.sel.col, s.sel.row, "=MIN()")}> 
                                        ↓ MIN
                                    </Button>
                                </SmartTooltip>
                                <SmartTooltip text="MAX" forceSide="bottom">
                                    <Button variant="ghost" size="sm" className="h-7 rounded-lg text-[11px] text-neutral-700 dark:text-neutral-200" onClick={() => s.startEdit(s.sel.col, s.sel.row, "=MAX()")}> 
                                        ↑ MAX
                                    </Button>
                                </SmartTooltip>
                                <SmartTooltip text="IF" forceSide="bottom">
                                    <Button variant="ghost" size="sm" className="h-7 rounded-lg text-[11px] text-neutral-700 dark:text-neutral-200" onClick={() => s.startEdit(s.sel.col, s.sel.row, "=IF()")}> 
                                        ? IF
                                    </Button>
                                </SmartTooltip>
                            </ToolbarGroup>

                            <ToolbarDivider />

                            <ToolbarGroup label="Reference">
                                <SmartTooltip text="Show function reference" forceSide="bottom">
                                    <Button variant={showFormulaRef ? "glass" : "ghost"} size="icon" className={cn(ICON_BTN, TOOL_BUTTON)} onClick={() => setShowFormulaRef(!showFormulaRef)}>
                                        <ChevronDown className="h-3.5 w-3.5" />
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
                                                <Columns3 className="h-3.5 w-3.5" />
                                            </Button>
                                        </DropdownTrigger>
                                    </SmartTooltip>
                                    <DropdownContent width={200} align="start">
                                        <DropdownSectionItem icon={<Columns3 className="h-3.5 w-3.5" />} onSelect={() => s.sortColumn(s.sel.col, "asc")}>
                                            Sort A → Z
                                        </DropdownSectionItem>
                                        <DropdownSectionItem icon={<Columns3 className="h-3.5 w-3.5" />} onSelect={() => s.sortColumn(s.sel.col, "desc")}>
                                            Sort Z → A
                                        </DropdownSectionItem>
                                    </DropdownContent>
                                </Dropdown>
                            </ToolbarGroup>

                            <ToolbarDivider />

                            <ToolbarGroup label="Export">
                                <SmartTooltip text="Export as XLSX" forceSide="bottom">
                                    <Button variant="ghost" size="icon" className={cn(ICON_BTN, TOOL_BUTTON)} onClick={s.exportXlsx}>
                                        <Download className="h-3.5 w-3.5" />
                                    </Button>
                                </SmartTooltip>
                            </ToolbarGroup>

                            <ToolbarDivider />

                            <ToolbarGroup label="Clear">
                                <SmartTooltip text="Clear all formatting" forceSide="bottom">
                                    <Button variant="ghost" size="icon" className={cn(ICON_BTN, TOOL_BUTTON)} onClick={() => s.applyFormat({ b: undefined, i: undefined, u: undefined, s: undefined, fs: undefined, wrap: undefined, c: undefined, bg: undefined, al: undefined, bd: undefined })}>
                                        <Eraser className="h-3.5 w-3.5" />
                                    </Button>
                                </SmartTooltip>
                            </ToolbarGroup>
                        </>
                    )}

                    {/* ── VIEW TAB ──────────────────────────────────────── */}
                    {activeTab === "view" && (
                        <>
                            <ToolbarGroup label="Zoom">
                                <span className="rounded-lg border border-black/8 bg-black/2.5 px-2 py-1 text-[11px] font-medium text-neutral-500 select-none dark:border-white/8 dark:bg-white/3.5 dark:text-neutral-400">100%</span>
                            </ToolbarGroup>

                            <ToolbarDivider />

                            <ToolbarGroup label="Layout">
                                <SmartTooltip text="Toggle formula bar hints" forceSide="bottom">
                                    <Button variant={showFormulaRef ? "glass" : "ghost"} size="icon" className={cn(ICON_BTN, TOOL_BUTTON)} onClick={() => setShowFormulaRef(!showFormulaRef)}>
                                        <FunctionSquare className="h-3.5 w-3.5" />
                                    </Button>
                                </SmartTooltip>
                            </ToolbarGroup>
                        </>
                    )}
                </div>
            </div>

            {/* ═══ Formula reference panel (collapsible) ═════════════════ */}
            {showFormulaRef && (
                <div className="border border-border/50 bg-card/30 p-3 rounded-lg mb-1 max-h-40 overflow-y-auto animate-fade-in-up">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
                        {FORMULA_FUNCTIONS.map((fn) => (
                            <button
                                key={fn.name}
                                onClick={() => {
                                    s.startEdit(s.sel.col, s.sel.row, `=${fn.name}()`)
                                    setShowFormulaRef(false)
                                }}
                                className="flex flex-col items-start rounded-lg px-2 py-1.5 text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                            >
                                <span className="text-[11px] font-semibold text-foreground">{fn.syntax}</span>
                                <span className="text-[10px] text-neutral-400 leading-tight">{fn.desc}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ═══ Spreadsheet card ══════════════════════════════════════ */}
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden border border-border/50 bg-card shadow-sm rounded-2xl">
                {/* Formula bar */}
                <div className="flex items-center gap-2 border-b border-black/8 dark:border-white/8 px-3 py-0.5 shrink-0">
                    <span className="w-14 text-center text-xs font-mono font-medium text-neutral-400 select-none border border-black/10 dark:border-white/10 rounded px-1 py-0.5">
                        {selectedAddress}
                    </span>
                    <div className="h-4 w-px bg-black/10 dark:bg-white/10" />
                    {isFormula(s.editing ? s.editVal : s.getCell(s.sel.col, s.sel.row).v) && (
                        <FunctionSquare className="h-3.5 w-3.5 text-primary shrink-0" />
                    )}
                    <input
                        value={s.editing ? s.editVal : s.getCell(s.sel.col, s.sel.row).v}
                        onChange={(e) => {
                            if (s.editing) { s.setEditVal(e.target.value) }
                            else { s.startEdit(s.sel.col, s.sel.row, e.target.value) }
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") { s.commitEdit(); s.gridRef.current?.focus() }
                            if (e.key === "Escape") { s.setEditing(null); s.gridRef.current?.focus() }
                        }}
                        className="flex-1 h-6 bg-transparent text-sm outline-none px-1"
                        placeholder="Enter a value or formula (e.g. =SUM(A1:A5))..."
                    />
                </div>

                {/* ═══ Virtualized Grid ══════════════════════════════════ */}
                <div
                    ref={s.gridRef}
                    className="flex-1 overflow-auto relative outline-none"
                    tabIndex={0}
                    onKeyDown={s.handleGridKeyDown}
                    onScroll={s.handleScroll}
                >
                    <div style={{ width: s.totalWidth, height: s.totalHeight, position: "relative" }}>
                        {/* Corner */}
                        <div
                            className="absolute border-b border-r border-black/10 dark:border-white/10 bg-neutral-100 dark:bg-neutral-800"
                            style={{ position: "absolute", top: 0, left: 0, width: HEADER_W, height: ROW_H, zIndex: 30 }}
                        />

                        {/* Column headers (only visible) */}
                        {s.visibleCols.map((c) => (
                            <div
                                key={`ch-${c}`}
                                className="absolute top-0 z-20 border-b border-r border-black/10 dark:border-white/10 bg-neutral-100 dark:bg-neutral-800 text-[11px] font-medium text-neutral-400 select-none flex items-center justify-center"
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
                                    className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-primary/40 active:bg-primary/60"
                                    onMouseDown={(e) => s.startColResize(c, e)}
                                />
                            </div>
                        ))}

                        {/* Row headers (only visible) */}
                        {s.visibleRows.map((r) => (
                            <div
                                key={`rh-${r}`}
                                className="absolute left-0 z-10 border-b border-r border-black/10 dark:border-white/10 bg-neutral-100 dark:bg-neutral-800 text-center text-[11px] text-neutral-400 select-none flex items-center justify-center"
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
                        ))}

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
                                    const fontSize = cell.fs ?? 13
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
                                            className={`absolute overflow-visible border-b border-r border-black/6 dark:border-white/6 ${inRange && !isSelected ? "bg-primary/10" : ""}`}
                                            style={{
                                                top: (r + 1) * ROW_H,
                                                left: s.colOffsets[c] + HEADER_W,
                                                width: cellW,
                                                height: cellH,
                                                backgroundColor: !inRange ? (cell.bg || undefined) : undefined,
                                                borderTop: borderCss(cell.bd?.t) || undefined,
                                                borderRight: borderCss(cell.bd?.r) || undefined,
                                                borderBottom: borderCss(cell.bd?.b) || undefined,
                                                borderLeft: borderCss(cell.bd?.l) || undefined,
                                                zIndex: merge ? 5 : isSelected ? 6 : undefined,
                                            }}
                                        >
                                            {isEditingThis ? (
                                                <input
                                                    ref={s.editRef}
                                                    value={s.editVal}
                                                    onChange={(e) => s.setEditVal(e.target.value)}
                                                    onBlur={s.commitEdit}
                                                    className="absolute inset-0 z-20 w-full h-full px-1.5 outline-none border-2 border-primary bg-white dark:bg-neutral-950"
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
                                                                paddingLeft: 6 + indentPx,
                                                                paddingRight: 6,
                                                                paddingTop: cell.wrap ? 4 : undefined,
                                                                lineHeight: cell.wrap ? 1.3 : undefined,
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
                                                        <div className="absolute inset-0 pointer-events-none z-10 animate-formula-flash rounded-sm" />
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
                                            <div className="absolute inset-0 border border-primary/35 bg-primary/8 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]" />
                                        </div>
                                    )}

                                    <div
                                        className="absolute pointer-events-none overflow-visible"
                                        style={{ left, top, width: w, height: h, zIndex: 8 }}
                                    >
                                        <div className="absolute inset-0 border-2 border-primary" />
                                        {!isEditing && !s.fillDrag && (
                                            <button
                                                type="button"
                                                data-fill-handle="true"
                                                aria-label="Drag to fill"
                                                className="absolute z-30 flex h-3 w-3 items-center justify-center rounded-full p-0 cursor-crosshair pointer-events-auto bg-transparent outline-none"
                                                style={{ right: 0, bottom: 0, transform: "translate(35%, 35%)" }}
                                                onMouseDown={s.handleFillDragStart}
                                            >
                                                <span className="block h-2 w-2 rounded-full border border-background bg-primary shadow-[0_1px_2px_rgba(0,0,0,0.18)]" />
                                            </button>
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
                <div className="flex items-center justify-between gap-3 border-t border-border/40 px-3 py-2 shrink-0">
                    <div className="flex min-w-0 items-center gap-1 overflow-x-auto">
                        {s.wb.sheets.map((sh, i) => (
                            <button
                                key={i}
                                className={`px-3 py-1.5 text-xs rounded-lg cursor-pointer select-none whitespace-nowrap transition-all duration-150 ${i === s.wb.activeSheet
                                    ? "bg-primary/10 text-primary font-semibold shadow-sm"
                                    : "text-neutral-400 hover:bg-muted/50 hover:text-foreground"
                                    }`}
                                onClick={() => s.switchSheet(i)}
                                onDoubleClick={() => s.renameSheet(i)}
                            >
                                {sh.name}
                            </button>
                        ))}
                        <Button variant="ghost" size="icon-sm" onClick={s.addSheet}>
                            <Plus className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                    <div className="hidden shrink-0 items-center gap-3 text-[11px] text-muted-foreground sm:flex">
                        <span className="font-medium text-foreground/80">{s.selectionSummary.address}</span>
                        <span>{formatStatusNumber.format(s.selectionSummary.cellCount)} cells</span>
                        <span>Count {formatStatusNumber.format(s.selectionSummary.filledCount)}</span>
                        {s.selectionSummary.numberCount > 0 && (
                            <>
                                <span>Sum {formatStatusNumber.format(s.selectionSummary.sum)}</span>
                                <span>Avg {formatStatusNumber.format(s.selectionSummary.average)}</span>
                            </>
                        )}
                    </div>
                </div>
            </div>
            <FindReplaceDialog open={findOpen} onOpenChange={setFindOpen} onFind={s.findReplace} />
        </TooltipProvider>
    )
}
