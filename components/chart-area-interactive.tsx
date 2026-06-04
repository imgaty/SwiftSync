//
//  chart-area-interactive.tsx
//  Argent
//
//  Created by Hilario Ferreira on 08 December 2025 at 19:38.
//  Description: Implements the Chart area interactive React component for Argent, encapsulating reusable
//  interface structure, state handling, and presentation logic for feature screens.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import * as React from "react"
import { CalendarRange, ChevronLeft, ChevronRight, ClipboardCopy, Filter, Maximize2, Minus, Plus, Settings2 } from "lucide-react"

import { useChartManager } from "@/hooks/use-chart-manager"
import { useChartData, type APITransaction } from "@/hooks/use-chart-data"
import { ChartProvider } from "@/components/chart-context"

import { CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig } from "@/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dropdown, DropdownContent, DropdownTrigger } from "@/components/ui/dropdown"
import { Button } from "@/components/ui/button"
import { TabSwitcher, TabSwitcherIconButton, TabSwitcherItem } from "@/components/ui/tab-switcher"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import { UDS } from "@/lib/UDS"
import { cn } from "@/lib/utils"
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { useLanguage } from "@/components/language-provider"
import { useCurrency } from "@/components/currency-provider"
import { ErrorState } from "@/components/error-state"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import {
    AGGREGATION_KEYS,
    capitalizeUtil,
    DATE_FORMAT_OPTIONS,
    DISPLAY_MODE_ICONS,
    DISPLAY_MODES,
    formatDateWithOrdinalUtil,
    formatPeriodLabel,
    getConfigColor,
    getFilteredCustomRangeData,
    getFilteredPeriodData,
    getOffsetDate,
    MAX_CHARTS,
    METRIC_TYPES,
} from "@/lib/chart"
import type { DisplayMode, MetricType } from "@/lib/chart"

import { DatePicker } from "@/components/date-picker"
import { ChartDisplay } from "@/components/chart-display"
import { AddChartDivider } from "@/components/add-chart-divider"
import { toast } from "sonner"

const ExpandedChartView = React.lazy(() => import("@/components/expanded-chart-view"))



// ==============================================================================
// CONSTANTS
// ==============================================================================

const getLabelWithFallback = (labels: Record<string, string>, key: string): string =>
    labels[key] ?? key.charAt(0).toUpperCase() + key.slice(1)



// ==============================================================================
// MAIN COMPONENT
// ==============================================================================

interface ChartAreaInteractiveProps {
    accountIds?: string[]
    compact?: boolean
    transactions?: APITransaction[] | null
}

export function ChartAreaInteractive({ accountIds, compact = false, transactions }: ChartAreaInteractiveProps = {}) {
    const { t: lang } = useLanguage()
    const { currency, formatCurrency } = useCurrency()
    const { data: chartData, isLoading, errorInfo, minDate } = useChartData(accountIds, transactions)

    // Selected chart for controls (click/tap selection) - visual indicator only - visual indicator only
    const [selectedChartIdForControls, setSelectedChartIdForControls] = React.useState<string | null>(null)
    const selectionTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)
    const SELECTION_TIMEOUT = 2000 // Auto-hide after 2 seconds

    const manager = useChartManager()
    const {
        charts,
        selectedChartId,
        selectedChart,
        categoryOptions,
        settingsOpen,
        chartAreaRef,
        addChart,
        deleteChart,
        moveChart,
        updateSelectedChart,
        setSelectedChartId,
        setSettingsOpen,
        setPeriodType,
        setTimeOffset,
        setCustomDateRange,
        clearCustomDateRange,
        handleCategoryToggle,
        handleTotalToggle,
        handleSelectAll,
        handleClearAll,
    } = manager

    const { periodType, timeOffset, customDateRange } = selectedChart
    const [dateRangeOpen, setDateRangeOpen] = React.useState(false)
    const [expandedChartId, setExpandedChartId] = React.useState<string | null>(null)

    // Responsive layout states - all based on collision detection
    const [controlsWrapped, setControlsWrapped] = React.useState(false)
    const [timeToggleCollapsed, setTimeToggleCollapsed] = React.useState(false)
    const [horizontalLayout, setHorizontalLayout] = React.useState(true)

    // Refs for collision detection
    const headerRef = React.useRef<HTMLDivElement>(null)
    const controlsRef = React.useRef<HTMLDivElement>(null)
    const leftGroupRef = React.useRef<HTMLDivElement>(null)
    const rightGroupRef = React.useRef<HTMLDivElement>(null)
    const timeToggleRef = React.useRef<HTMLDivElement>(null)
    const amountRef = React.useRef<HTMLDivElement>(null)

    // Natural widths storage & layout state ref to avoid effect loops
    const naturalWidthsRef = React.useRef<{ left: number; rightExpanded: number; rightCollapsed: number; amount: number } | null>(null)
    const layoutStateRef = React.useRef({ controlsWrapped, timeToggleCollapsed, horizontalLayout })

    React.useEffect(() => {
        layoutStateRef.current = { controlsWrapped, timeToggleCollapsed, horizontalLayout }
    }, [controlsWrapped, timeToggleCollapsed, horizontalLayout])

    // Collision detection for responsive layout
    React.useEffect(() => {
        if (compact) return

        const header = headerRef.current, controls = controlsRef.current
        const leftGroup = leftGroupRef.current, rightGroup = rightGroupRef.current
        const toggleEl = timeToggleRef.current
        const amount = amountRef.current

        if (!header || !controls || !leftGroup || !rightGroup || !amount) return

        let rafId: number
        const DATE_PICKER_WIDTH = 40

        const check = () => {
            const { controlsWrapped: wrapped, timeToggleCollapsed: collapsed, horizontalLayout: horiz } = layoutStateRef.current
            const w = header.offsetWidth
            const stored = naturalWidthsRef.current
            const isExpanded = horiz && !collapsed && !wrapped

            const left = isExpanded ? leftGroup.scrollWidth : (stored?.left ?? leftGroup.scrollWidth)
            const amnt = isExpanded ? amount.scrollWidth : (stored?.amount ?? amount.scrollWidth)

            let rightExp = stored?.rightExpanded ?? 200 + 12 + DATE_PICKER_WIDTH
            let rightCol = stored?.rightCollapsed ?? 180

            if (toggleEl) {
                if (isExpanded) {
                    rightExp = toggleEl.scrollWidth + 12 + DATE_PICKER_WIDTH
                } else if (collapsed && !wrapped) {
                    rightCol = toggleEl.scrollWidth + 12 + DATE_PICKER_WIDTH
                }
            }

            if (isExpanded) naturalWidthsRef.current = { left, rightExpanded: rightExp, rightCollapsed: rightCol, amount: amnt }
            else if (stored) naturalWidthsRef.current = { ...stored, rightCollapsed: rightCol }
            else naturalWidthsRef.current = { left, rightExpanded: rightExp, rightCollapsed: rightCol, amount: amnt }

            const expNeeded = left + 12 + rightExp
            const colNeeded = left + 12 + rightCol
            const horizNeeded = amnt + 16 + expNeeded

            if ((horizNeeded <= w) !== horiz) setHorizontalLayout(horizNeeded <= w)
            if ((expNeeded > w) !== collapsed) setTimeToggleCollapsed(expNeeded > w)
            if ((colNeeded > w) !== wrapped) setControlsWrapped(colNeeded > w)
        }

        check()
        const observer = new ResizeObserver(() => { cancelAnimationFrame(rafId); rafId = requestAnimationFrame(check) })
        observer.observe(header)
        observer.observe(controls)

        return () => { cancelAnimationFrame(rafId); observer.disconnect() }
    }, [compact])

    const labels = React.useMemo(() => lang.data_type_labels ?? {}, [lang.data_type_labels])
    const locale = lang.config?.locale || 'pt-PT'
    const timeRange = React.useMemo(() => lang.time_range ?? {}, [lang.time_range])
    const loadingText = lang.loading ?? "Loading..."
    const timeRangeEntries = React.useMemo(() => Object.entries(timeRange), [timeRange])

    const chartConfig = React.useMemo(() => {
        const config: ChartConfig = { visitors: { label: labels.total ?? "Total" } }
        AGGREGATION_KEYS.forEach(key => { config[key] = { label: getLabelWithFallback(labels, key) } })
        return config
    }, [labels])

    const contextValue = React.useMemo(() => ({ chartConfig, labels, locale, currency }), [chartConfig, labels, locale, currency])
    const offsetDate = React.useMemo(() => getOffsetDate(periodType, timeOffset), [periodType, timeOffset])

    const periodData = React.useMemo(() =>
        customDateRange?.startDate && customDateRange?.endDate
            ? getFilteredCustomRangeData(chartData, customDateRange.startDate, customDateRange.endDate)
            : getFilteredPeriodData(chartData, periodType, offsetDate)
    , [chartData, periodType, offsetDate, customDateRange])

    const isBackDisabled = React.useMemo(() => {
        if (periodType === 'all' || !minDate) return false
        const prev = new Date(offsetDate)
        if (periodType === 'today') prev.setDate(prev.getDate() - 1)
        else if (periodType === 'month') prev.setMonth(prev.getMonth() - 1)
        else if (periodType === 'year') prev.setFullYear(prev.getFullYear() - 1)
        return prev < minDate
    }, [periodType, minDate, offsetDate])

    const selectedTotal = React.useMemo(() => {
        const keys = selectedChart.showTotal || selectedChart.selectedCategories.length === 0
            ? [selectedChart.metricType] : selectedChart.selectedCategories
        return periodData.reduce((sum, item) => sum + keys.reduce((s, k) => s + ((item[k] as number) || 0), 0), 0)
    }, [periodData, selectedChart.showTotal, selectedChart.selectedCategories, selectedChart.metricType])

    const metricColor = getConfigColor(chartConfig, selectedChart.metricType)
    const metricColorStyle = React.useMemo(() => ({ backgroundColor: metricColor }), [metricColor])

    const periodLabel = React.useMemo(() =>
        customDateRange?.startDate && customDateRange?.endDate
            ? `${new Date(customDateRange.startDate).toLocaleDateString(locale, DATE_FORMAT_OPTIONS.SHORT)} - ${new Date(customDateRange.endDate).toLocaleDateString(locale, DATE_FORMAT_OPTIONS.SHORT)}`
            : formatPeriodLabel(periodType, offsetDate, locale, labels.all_time ?? "All time")
    , [periodType, offsetDate, locale, labels.all_time, customDateRange])

    const { prevPeriodLabel, nextPeriodLabel } = React.useMemo(() => {
        const fmt = (prefix: string, delta: number) => {
            if (periodType === 'all') return prefix
            const d = new Date(offsetDate)
            if (periodType === 'today') { d.setDate(d.getDate() + delta); return `${prefix} (${formatDateWithOrdinalUtil(d, locale)})` }
            if (periodType === 'month') { d.setMonth(d.getMonth() + delta); return `${prefix} (${capitalizeUtil(d.toLocaleDateString(locale, DATE_FORMAT_OPTIONS.MONTH_LONG))} ${d.getFullYear()})` }
            if (periodType === 'year') { d.setFullYear(d.getFullYear() + delta); return `${prefix} (${d.getFullYear()})` }
            return prefix
        }
        return { prevPeriodLabel: fmt(labels.previous ?? "Previous", -1), nextPeriodLabel: fmt(labels.next ?? "Next", 1) }
    }, [periodType, offsetDate, locale, labels.previous, labels.next])

    const handlePrevPeriod = React.useCallback(() => setTimeOffset(p => p - 1), [setTimeOffset])
    const handleNextPeriod = React.useCallback(() => setTimeOffset(p => p + 1), [setTimeOffset])
    const handleMetricTypeChange = React.useCallback((v: string) => v && updateSelectedChart({ metricType: v as MetricType, selectedCategories: [], showTotal: true }), [updateSelectedChart])
    const handleDisplayModeChange = React.useCallback((v: string) => v && updateSelectedChart({ displayMode: v as DisplayMode }), [updateSelectedChart])
    const handlePeriodTypeClick = React.useCallback((key: string) => () => setPeriodType(key), [setPeriodType])

    // Chart selection handler (click/tap) with auto-hide timeout
    const handleChartSelect = React.useCallback((chartId: string) => {
        // Clear existing timeout
        if (selectionTimeoutRef.current) clearTimeout(selectionTimeoutRef.current)
        setSelectedChartIdForControls(chartId)
        // Also update the manager's selectedChartId so controls apply to the correct chart
        setSelectedChartId(chartId)
        // Set timeout to auto-hide visual indicator
        selectionTimeoutRef.current = setTimeout(() => setSelectedChartIdForControls(null), SELECTION_TIMEOUT)
    }, [setSelectedChartId])

    // Cleanup timeout on unmount
    React.useEffect(() => {
        return () => { if (selectionTimeoutRef.current) clearTimeout(selectionTimeoutRef.current) }
    }, [])

    // Click/tap outside chart area to deselect
    React.useEffect(() => {
        const handleClickOutside = (e: MouseEvent | TouchEvent) => {
            if (!selectedChartIdForControls) return
            const target = e.target as Node
            const chartDisplays = document.querySelectorAll('[data-chart-display]')
            let clickedInside = false
            chartDisplays.forEach(el => {
                if (el.contains(target)) clickedInside = true
            })
            if (!clickedInside) setSelectedChartIdForControls(null)
        }
        document.addEventListener('mousedown', handleClickOutside)
        document.addEventListener('touchstart', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('touchstart', handleClickOutside)
        }
    }, [selectedChartIdForControls])

    const hasCustomDateRange = !!customDateRange
    const prevDisabled = periodType === 'all' || isBackDisabled || hasCustomDateRange
    const nextDisabled = periodType === 'all' || timeOffset === 0 || hasCustomDateRange

    const handleCopyTotal = React.useCallback(() => {
        navigator.clipboard.writeText(formatCurrency(selectedTotal, { locale }))
        toast.success(locale.startsWith("pt") ? "Valor copiado" : "Value copied")
    }, [selectedTotal, formatCurrency, locale])

    const handleExpandFirstChart = React.useCallback(() => {
        if (charts.length > 0) {
            setSelectedChartId(charts[0].id)
            setExpandedChartId(charts[0].id)
        }
    }, [charts, setSelectedChartId])

    const handleOpenSettings = React.useCallback(() => {
        setSettingsOpen(true)
    }, [setSettingsOpen])

    const visibleCharts = compact ? charts.slice(0, 1) : charts
    const allowChartEditing = !compact

    if (errorInfo) return <ErrorState type={errorInfo.type} details={errorInfo.details} className="h-[300px]" />

    return (
        <ChartProvider value = {contextValue}>
            <TooltipProvider>
                <div className={compact
                    ? "flex h-full min-h-[280px] w-full min-w-0 flex-col overflow-hidden"
                    : "w-full overflow-hidden"
                }>
                    <CardHeader
                        ref={headerRef}
                        className={cn(
                            "flex gap-4 border-b px-0 py-0",
                            UDS.cardDivider,
                            compact
                                ? "shrink-0 flex-row items-center pb-2.5"
                                : `pb-4 ${horizontalLayout ? 'flex-row justify-between items-start' : 'flex-col'}`,
                        )}
                    >
                        <div
                            ref={controlsRef}
                            className={cn(
                                "flex min-w-0 items-center justify-between",
                                compact
                                    ? "w-full flex-wrap gap-2"
                                    : `gap-3 ${horizontalLayout ? 'order-2 shrink-0' : 'w-full'} ${controlsWrapped ? 'flex-wrap gap-y-3' : ''}`,
                            )}
                        >
                            <div
                                ref={leftGroupRef}
                                className={cn(
                                    "flex min-w-0 items-center",
                                    compact
                                        ? "shrink-0 gap-2"
                                        : `gap-3 ${controlsWrapped ? 'w-full' : 'shrink-0'}`,
                                )}
                            >
                                <TabSwitcher
                                    ariaLabel={labels.metric_type ?? "Metric type"}
                                    className={cn(compact && "h-8 min-h-8 gap-0.5 p-0.5", controlsWrapped && "flex-1")}
                                >
                                    {METRIC_TYPES.map(type => {
                                        const typeLabel = getLabelWithFallback(labels, type)
                                        return (
                                            <Tooltip key={type}>
                                                <TooltipTrigger asChild>
                                                    <TabSwitcherItem
                                                        isActive={selectedChart.metricType === type}
                                                        onClick={() => handleMetricTypeChange(type)}
                                                        className={cn(
                                                            compact ? "h-7 px-3 text-[12px]" : "px-4 text-[13px]",
                                                            controlsWrapped && "flex-1",
                                                        )}
                                                    >
                                                        {typeLabel}
                                                    </TabSwitcherItem>
                                                </TooltipTrigger>
                                                <TooltipContent side="bottom"><p>{typeLabel}</p></TooltipContent>
                                            </Tooltip>
                                        )
                                    })}
                                </TabSwitcher>

                                <TabSwitcher
                                    ariaLabel={labels.filter_categories ?? "Filter categories"}
                                    className={cn(compact && "h-8 min-h-8 gap-0.5 p-0.5")}
                                >
                                    <Dropdown>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <DropdownTrigger asChild>
                                                    <TabSwitcherIconButton
                                                        aria-label={labels.filter_categories ?? "Filter categories"}
                                                        className="w-auto px-2"
                                                    >
                                                        <Filter className="w-4 h-4" />
                                                        {!selectedChart.showTotal && selectedChart.selectedCategories.length > 0 && (
                                                            <span className="flex items-center justify-center | w-4 h-4 | bg-primary | text-xs text-white dark:text-black sq-full">
                                                                {selectedChart.selectedCategories.length}
                                                            </span>
                                                        )}
                                                    </TabSwitcherIconButton>
                                                </DropdownTrigger>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom"><p>{labels.filter_categories ?? "Filter categories"}</p></TooltipContent>
                                        </Tooltip>

                                        <DropdownContent align="center" onCloseAutoFocus={(e) => e.preventDefault()} width={200}>
                                            <div className="p-2 flex flex-col gap-1.5">
                                                {/* Total chip */}
                                                <Button variant="ghost"
                                                    onClick={() => handleTotalToggle()}
                                                    data-active={selectedChart.showTotal ? "true" : undefined}
                                                    className={cn(
                                                        "w-full flex items-center gap-2 px-2.5 py-1.5 sq-full text-xs font-medium transition-all",
                                                        selectedChart.showTotal
                                                            ? UDS.selectedControl
                                                            : cn("text-muted-foreground", UDS.itemHover),
                                                    )}
                                                >
                                                    <span className="w-2 h-2 sq-full shrink-0" style={metricColorStyle} />
                                                    {labels.total ?? "Total"}
                                                </Button>
                                                <div className={cn("h-px", UDS.hairline)} />
                                                {/* Category chips */}
                                                <div className="flex flex-wrap gap-1">
                                                    {categoryOptions.map(cat => {
                                                        const isChecked = selectedChart.selectedCategories.includes(cat)
                                                        const color = getConfigColor(chartConfig, cat)
                                                        return (
                                                            <Button variant="ghost"
                                                                key={cat}
                                                                onClick={() => handleCategoryToggle(cat)}
                                                                data-active={isChecked ? "true" : undefined}
                                                                className={cn(
                                                                    "inline-flex items-center gap-1 px-2 py-0.5 sq-full text-[11px] font-medium transition-all",
                                                                    isChecked
                                                                        ? UDS.selectedControl
                                                                        : cn("text-neutral-600 dark:text-neutral-400", UDS.itemHover),
                                                                )}
                                                            >
                                                                <span className="w-1.5 h-1.5 sq-full shrink-0" style={{ backgroundColor: color, opacity: isChecked ? 1 : 0.5 }} />
                                                                {chartConfig[cat as keyof typeof chartConfig]?.label ?? cat}
                                                            </Button>
                                                        )
                                                    })}
                                                </div>
                                                <div className={cn("h-px", UDS.hairline)} />
                                                {/* Actions */}
                                                <div className="flex gap-1">
                                                    <Button variant="ghost" onClick={handleSelectAll} className="flex-1 px-2 py-1 sq text-[11px] text-primary transition-colors hover:bg-primary/10">{labels.select_all ?? "All"}</Button>
                                                    <Button variant="ghost" onClick={handleClearAll} className={cn("flex-1 px-2 py-1 sq text-[11px] text-muted-foreground transition-colors", UDS.itemHover)}>{labels.clear ?? "Clear"}</Button>
                                                </div>
                                            </div>
                                        </DropdownContent>
                                    </Dropdown>
                                </TabSwitcher>
                            </div>

                            <Separator orientation="vertical" className={cn("h-6", compact ? "block" : horizontalLayout ? "block" : "hidden")} />

                            <div
                                ref={rightGroupRef}
                                className={cn(
                                    "flex min-w-0 items-center gap-2",
                                    compact ? "shrink-0" : controlsWrapped ? "w-full" : "shrink-0",
                                )}
                            >
                                <TabSwitcher
                                    ref={timeToggleRef}
                                    ariaLabel={labels.time_range ?? "Time range"}
                                    className={cn(
                                        compact && "h-8 min-h-8 gap-0.5 p-0.5",
                                        timeToggleCollapsed ? (controlsWrapped ? "flex-1" : "") : "shrink-0",
                                        hasCustomDateRange && "opacity-50",
                                    )}
                                >
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <TabSwitcherIconButton
                                                onClick={handlePrevPeriod}
                                                disabled={prevDisabled}
                                                aria-label={prevPeriodLabel}
                                            >
                                                <ChevronLeft className="w-4 h-4" />
                                            </TabSwitcherIconButton>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom" disabled={prevDisabled}><p>{prevPeriodLabel}</p></TooltipContent>
                                    </Tooltip>

                                    {compact || timeToggleCollapsed ? (
                                        <div className="flex items-center min-w-0 flex-1">
                                            <Select value={periodType} onValueChange={setPeriodType} disabled={hasCustomDateRange}>
                                                <SelectTrigger
                                                    className={cn("w-full min-w-[92px] sq-full border-transparent sq-border-muted bg-transparent px-2 text-[12px] font-semibold text-foreground-secondary hover:text-foreground focus:ring-0 data-[size=sm]:h-7", UDS.itemHover)}
                                                    size="sm"
                                                >
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="sq-xl">
                                                    {timeRangeEntries.map(([key, label]) => <SelectItem key={key} value={key}>{label as string}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    ) : (
                                        timeRangeEntries.map(([key, label]) => (
                                            <Tooltip key={key}>
                                                <TooltipTrigger asChild>
                                                    <TabSwitcherItem
                                                        isActive={periodType === key && !hasCustomDateRange}
                                                        onClick={handlePeriodTypeClick(key)}
                                                        disabled={hasCustomDateRange}
                                                        className="px-3 text-[13px]"
                                                    >
                                                        {label as string}
                                                    </TabSwitcherItem>
                                                </TooltipTrigger>
                                                <TooltipContent side="bottom"><p>{label as string}</p></TooltipContent>
                                            </Tooltip>
                                        ))
                                    )}

                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <TabSwitcherIconButton
                                                onClick={handleNextPeriod}
                                                disabled={nextDisabled}
                                                aria-label={nextPeriodLabel}
                                            >
                                                <ChevronRight className="w-4 h-4" />
                                            </TabSwitcherIconButton>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom" disabled={nextDisabled}><p>{nextPeriodLabel}</p></TooltipContent>
                                    </Tooltip>
                                </TabSwitcher>

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div>
                                            <DatePicker
                                                range={{
                                                    value: customDateRange ?? null,
                                                    onRangeChange: setCustomDateRange,
                                                    onClear: clearCustomDateRange,
                                                    labels,
                                                }}
                                                locale={locale}
                                                open={dateRangeOpen}
                                                onOpenChange={setDateRangeOpen}
                                                trigger={
                                                    <TabSwitcher
                                                        ariaLabel={labels.custom_date_range ?? "Custom date range"}
                                                        className={cn(
                                                            compact && "h-8 min-h-8 gap-0.5 p-0.5",
                                                            hasCustomDateRange && UDS.selectedControl,
                                                        )}
                                                    >
                                                        <TabSwitcherIconButton
                                                            isActive={hasCustomDateRange}
                                                            aria-label={labels.custom_date_range ?? "Custom date range"}
                                                            className={cn("w-auto px-2", hasCustomDateRange && "text-foreground")}
                                                        >
                                                            <CalendarRange className="w-4 h-4" />
                                                            {customDateRange && (
                                                                <span className="hidden sm:inline text-xs">
                                                                    {customDateRange.startDate && customDateRange.endDate
                                                                        ? `${new Date(customDateRange.startDate).toLocaleDateString(locale, DATE_FORMAT_OPTIONS.SHORT)} - ${new Date(customDateRange.endDate).toLocaleDateString(locale, DATE_FORMAT_OPTIONS.SHORT)}`
                                                                        : labels.custom_range ?? 'Custom'
                                                                    }
                                                                </span>
                                                            )}
                                                        </TabSwitcherIconButton>
                                                    </TabSwitcher>
                                                }
                                            />
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom"><p>{labels.custom_date_range ?? "Custom date range"}</p></TooltipContent>
                                </Tooltip>
                            </div>
                        </div>

                        {!compact && (
                            <div ref={amountRef} className={`flex flex-col gap-2 shrink-0 ${horizontalLayout ? 'order-1 w-auto' : 'w-full'}`}>
                                <CardTitle className="text-sm font-medium text-neutral-600 dark:text-neutral-400">{labels.chart_title ?? "Overview"}</CardTitle>
                                {isLoading ? (
                                    <>
                                        <Skeleton className="h-10 w-44" />
                                        <Skeleton className="h-4 w-32" />
                                    </>
                                ) : (
                                    <>
                                        <span className="text-4xl font-bold tabular-nums">
                                            {formatCurrency(selectedTotal, { locale })}
                                        </span>
                                        <div className="flex items-center gap-4 | text-sm text-neutral-600 dark:text-neutral-400 text-nowrap">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2.5 h-2.5 | sq-full shrink-0" style={metricColorStyle} />
                                                <span className="auto-scroll font-medium">{chartConfig[selectedChart.metricType]?.label}</span>
                                            </div>
                                            <span className="text-neutral-600/80 dark:text-neutral-400/80">•</span>
                                            <span className="auto-scroll text-neutral-600/80 dark:text-neutral-400/80">{periodLabel}</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </CardHeader>

                    <ContextMenu>
                        <ContextMenuTrigger asChild>
                            <CardContent className={compact ? "flex min-h-0 flex-1 flex-col px-0 pt-3" : "px-0 pt-4"}>
                                <div ref={chartAreaRef} className={cn("flex flex-wrap items-stretch gap-y-4", compact && "min-h-0 flex-1")}>
                            {visibleCharts.map((chart, index) => {
                                const isFirst = index === 0
                                const isLast = index === visibleCharts.length - 1
                                return (
                                    <React.Fragment key={chart.id}>
                                        {/* Left edge divider - only before first chart */}
                                        {allowChartEditing && isFirst && (
                                            <AddChartDivider onAdd={addChart} index={0} isEdge disabled={charts.length >= MAX_CHARTS} tooltipLabel={labels.add_chart} />
                                        )}

                                        {/* Chart container */}
                                        <div
                                            className={cn("flex items-stretch grow shrink", compact && "min-h-0")}
                                            style={{ minWidth: '280px', flexBasis: '280px' }}
                                        >
                                            <ChartDisplay
                                                instance={chart} index={index} totalCharts={visibleCharts.length} chartData={chartData}
                                                isLoading={isLoading} loadingText={loadingText}
                                                isHorizontal={true}
                                                isSelected={selectedChartIdForControls === chart.id}
                                                onSelect={() => handleChartSelect(chart.id)}
                                                onDelete={() => deleteChart(chart.id)} onMoveLeft={() => moveChart(chart.id, 'left')} onMoveRight={() => moveChart(chart.id, 'right')}
                                                onOpenSettings={() => { setSelectedChartId(chart.id); setSettingsOpen(true) }}
                                                onExpand={() => { setSelectedChartId(chart.id); setExpandedChartId(chart.id) }}
                                                compact={compact}
                                            />
                                        </div>

                                        {/* Right divider - between charts or edge after last */}
                                        {allowChartEditing && (
                                            <AddChartDivider onAdd={addChart} index={index + 1} isEdge={isLast} disabled={charts.length >= MAX_CHARTS} tooltipLabel={labels.add_chart} />
                                        )}
                                    </React.Fragment>
                                )
                            })}
                        </div>

                        {!compact && (
                        <div className="flex justify-end items-center gap-2 pt-4">
                            <div className="flex items-center gap-2">
                                <TabSwitcher ariaLabel={labels.chart_type ?? "Chart style"}>
                                    {DISPLAY_MODES.map(mode => {
                                        const Icon = DISPLAY_MODE_ICONS[mode]
                                        const modeLabel = getLabelWithFallback(labels, mode)
                                        return (
                                            <Tooltip key={mode}>
                                                <TooltipTrigger asChild>
                                                    <TabSwitcherIconButton
                                                        isActive={selectedChart.displayMode === mode}
                                                        onClick={() => handleDisplayModeChange(mode)}
                                                        aria-label={modeLabel}
                                                    >
                                                        <Icon className="w-4 h-4" />
                                                    </TabSwitcherIconButton>
                                                </TooltipTrigger>
                                                <TooltipContent side="top"><p>{modeLabel}</p></TooltipContent>
                                            </Tooltip>
                                        )
                                    })}
                                </TabSwitcher>
                                <div className="flex items-center gap-2">
                                    <div className={cn("h-6 w-px", UDS.hairlineStrong)} />
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button onClick={() => deleteChart(selectedChartId)} variant="glass" size="sm" className="sq-full px-2" disabled={charts.length <= 1}><Minus className="w-4 h-4" /></Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" disabled={charts.length <= 1}><p>{labels.remove_chart ?? "Remove chart"}</p></TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button onClick={() => addChart()} variant="glass" size="sm" className="sq-full px-2" disabled={charts.length >= MAX_CHARTS}><Plus className="w-4 h-4" /></Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" disabled={charts.length >= MAX_CHARTS}><p>{labels.add_chart ?? "Add chart"}</p></TooltipContent>
                                    </Tooltip>
                                </div>
                            </div>
                        </div>
                        )}
                    </CardContent>
                        </ContextMenuTrigger>
                        <ContextMenuContent>

                            <ContextMenuItem onClick={handleCopyTotal}>
                                <ClipboardCopy />
                                {locale.startsWith("pt") ? "Copiar total" : "Copy total"}
                            </ContextMenuItem>
                            <ContextMenuSeparator />
                            <ContextMenuItem onClick={handleExpandFirstChart}>
                                <Maximize2 />
                                {locale.startsWith("pt") ? "Expandir gráfico" : "Expand chart"}
                            </ContextMenuItem>
                            {!compact && (
                                <ContextMenuItem onClick={handleOpenSettings}>
                                    <Settings2 />
                                    {locale.startsWith("pt") ? "Personalizar" : "Customize"}
                                </ContextMenuItem>
                            )}
                        </ContextMenuContent>
                    </ContextMenu>
                </div>

                {!compact && (
                <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
                    <SheetContent className="sm:max-w-md p-0 flex flex-col">
                        <SheetHeader className={cn("border-b px-6 pb-4 pt-6", UDS.cardDivider)}>
                            <SheetTitle className="text-[15px] font-semibold tracking-tight">{labels.customize_chart ?? "Customize Chart"}</SheetTitle>
                            <SheetDescription className={cn("text-[13px]", UDS.muted)}>{labels.customize_chart_desc ?? "Configure the display options for this chart."}</SheetDescription>
                        </SheetHeader>
                        <div className="flex-1 overflow-y-auto px-6 py-5">
                            <div className="space-y-6">
                                <div className="space-y-2.5">
                                    <Label className="text-[12px] font-semibold tracking-wide text-neutral-400">{labels.metric_type ?? "Data Type"}</Label>
                                    <div className="grid grid-cols-2 gap-2.5">
                                        {METRIC_TYPES.map(type => {
                                            const isSelected = selectedChart.metricType === type
                                            const isIncome = type === "income"
                                            const typeLabel = getLabelWithFallback(labels, type)
                                            return (
                                                <Button variant="ghost"
                                                    key={type}
                                                    onClick={() => updateSelectedChart({ metricType: type, selectedCategories: [], showTotal: true })}
                                                    className={cn(
                                                        UDS.cardSurface,
                                                        "flex items-center justify-center gap-2 px-3 py-3 text-[13px] font-medium transition-all duration-150",
                                                        isSelected ? UDS.cardSelected : UDS.cardHover,
                                                    )}
                                                >
                                                    <span className={cn("w-2 h-2 sq-full shrink-0", isIncome ? "bg-positive" : "bg-negative")} />
                                                    <span>{typeLabel}</span>
                                                </Button>
                                            )
                                        })}
                                    </div>
                                </div>
                                <div className="space-y-2.5">
                                    <Label className="text-[12px] font-semibold tracking-wide text-neutral-400">{labels.chart_type ?? "Chart Style"}</Label>
                                    <div className="grid grid-cols-3 gap-2.5">
                                        {DISPLAY_MODES.map(mode => {
                                            const Icon = DISPLAY_MODE_ICONS[mode]
                                            const isSelected = selectedChart.displayMode === mode
                                            const modeLabel = getLabelWithFallback(labels, mode)
                                            return (
                                                <Button variant="ghost"
                                                    key={mode}
                                                    onClick={() => updateSelectedChart({ displayMode: mode })}
                                                    className={cn(
                                                        UDS.cardSurface,
                                                        "flex flex-col items-center gap-2 px-2 py-3 text-[12px] font-medium transition-all duration-150",
                                                        isSelected ? UDS.cardSelected : UDS.cardHover,
                                                    )}
                                                >
                                                    <Icon className="w-5 h-5" />
                                                    <span>{modeLabel}</span>
                                                </Button>
                                            )
                                        })}
                                    </div>
                                </div>
                                <div className="space-y-2.5">
                                    <div className="flex justify-between items-center">
                                        <Label className="text-[12px] font-semibold tracking-wide text-neutral-400">{labels.filter ?? "Categories"}</Label>
                                        <div className="flex gap-1.5">
                                            <Button variant="ghost" onClick={handleSelectAll} className={cn("text-[12px] px-2 py-1 sq-md text-primary font-medium transition-colors", UDS.pillSurface, UDS.itemHover)}>{labels.select_all ?? "All"}</Button>
                                            <Button variant="ghost" onClick={handleClearAll} className={cn("text-[12px] px-2 py-1 sq-md font-medium transition-colors", UDS.cardSurface, UDS.cardHover, UDS.muted)}>{labels.clear ?? "Clear"}</Button>
                                        </div>
                                    </div>
                                    <div className={cn(UDS.cardSurface, "overflow-hidden p-0")}>
                                        <label className={cn(
                                            "flex items-center gap-3 px-3 py-3 cursor-pointer transition-colors border-b",
                                            UDS.cardDivider,
                                            selectedChart.showTotal
                                                ? UDS.selectedControl
                                                : UDS.itemHover,
                                        )}>
                                            <input type="checkbox" checked={selectedChart.showTotal} onChange={handleTotalToggle} className="w-4 h-4 sq accent-primary" />
                                            <span className="w-2.5 h-2.5 sq-full shrink-0" style={metricColorStyle} />
                                            <span className="font-medium flex-1 text-[13px]">{labels.total ?? "Total"}</span>
                                            <span className={cn("text-[12px]", UDS.muted)}>{labels[selectedChart.metricType]}</span>
                                        </label>
                                        <div className="max-h-60 overflow-y-auto divide-y divide-border">
                                            {categoryOptions.map(cat => {
                                                const checked = selectedChart.selectedCategories.includes(cat)
                                                return (
                                                    <label key={cat} className={cn(
                                                        "flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors",
                                                        checked
                                                            ? UDS.selectedControl
                                                            : UDS.itemHover,
                                                    )}>
                                                        <input type="checkbox" checked={checked} onChange={() => handleCategoryToggle(cat)} className="w-4 h-4 sq accent-primary" />
                                                        <span className="w-2.5 h-2.5 sq-full shrink-0" style={{ backgroundColor: getConfigColor(chartConfig, cat) }} />
                                                        <span className="flex-1 text-[13px]">{chartConfig[cat as keyof typeof chartConfig]?.label ?? cat}</span>
                                                    </label>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </SheetContent>
                </Sheet>
                )}

                {/* Expanded Chart View - lazy loaded */}
                {expandedChartId && (
                    <React.Suspense fallback={null}>
                        <ExpandedChartView
                            chart={charts.find(c => c.id === expandedChartId)!}
                            chartData={chartData}
                            chartConfig={chartConfig}
                            labels={labels}
                            locale={locale}
                            isLoading={isLoading}
                            loadingText={loadingText}
                            onClose={() => setExpandedChartId(null)}
                            onUpdateChart={updateSelectedChart}
                            onSetPeriodType={setPeriodType}
                            onSetTimeOffset={setTimeOffset}
                            onSetCustomDateRange={setCustomDateRange}
                            onClearCustomDateRange={clearCustomDateRange}
                            onCategoryToggle={handleCategoryToggle}
                            onTotalToggle={handleTotalToggle}
                            onSelectAll={handleSelectAll}
                            onClearAll={handleClearAll}
                        />
                    </React.Suspense>
                )}
            </TooltipProvider>
        </ChartProvider>
    )
}
