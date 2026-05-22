"use client"

import * as React from "react"
import { CalendarRange, ChevronLeft, ChevronRight, ClipboardCopy, Filter, Maximize2, Minus, Plus, Settings2 } from "lucide-react"

import { useChartManager } from "@/hooks/use-chart-manager"
import { useChartData } from "@/hooks/use-chart-data"
import { ChartProvider } from "@/components/chart-context"

import { CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig } from "@/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dropdown, DropdownContent, DropdownTrigger } from "@/components/ui/dropdown"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import { PRISM } from "@/lib/PRISM"
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
import { DISPLAY_MODE_ICONS, DISPLAY_MODES, METRIC_TYPES, MAX_CHARTS, DATE_FORMAT_OPTIONS, AGGREGATION_KEYS } from "@/lib/chart-constants"
import type { MetricType, DisplayMode } from "@/lib/chart-types"
import { formatPeriodLabel, getConfigColor, getOffsetDate, getFilteredPeriodData, getFilteredCustomRangeData, capitalizeUtil, formatDateWithOrdinalUtil } from "@/lib/chart-utils"

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
}

export function ChartAreaInteractive({ accountIds, compact = false }: ChartAreaInteractiveProps = {}) {
    const { t: lang } = useLanguage()
    const { currency, formatCurrency } = useCurrency()
    const { data: chartData, isLoading, errorInfo, minDate } = useChartData(accountIds)
    
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
            
            // Measure or use stored values
            const left = isExpanded ? leftGroup.scrollWidth : (stored?.left ?? leftGroup.scrollWidth)
            const amnt = isExpanded ? amount.scrollWidth : (stored?.amount ?? amount.scrollWidth)
            
            // Measure current toggle width and store appropriately
            let rightExp = stored?.rightExpanded ?? 200 + 12 + DATE_PICKER_WIDTH
            let rightCol = stored?.rightCollapsed ?? 180
            
            if (toggleEl) {
                if (isExpanded) {
                    // Currently showing expanded view - measure it
                    rightExp = toggleEl.scrollWidth + 12 + DATE_PICKER_WIDTH
                } else if (collapsed && !wrapped) {
                    // Currently showing collapsed view - measure it
                    rightCol = toggleEl.scrollWidth + 12 + DATE_PICKER_WIDTH
                }
            }
            
            // Store measurements
            if (isExpanded) naturalWidthsRef.current = { left, rightExpanded: rightExp, rightCollapsed: rightCol, amount: amnt }
            else if (stored) naturalWidthsRef.current = { ...stored, rightCollapsed: rightCol }
            else naturalWidthsRef.current = { left, rightExpanded: rightExp, rightCollapsed: rightCol, amount: amnt }
            
            // Calculate thresholds (NO hysteresis - same in both directions)
            const expNeeded = left + 12 + rightExp
            const colNeeded = left + 12 + rightCol
            const horizNeeded = amnt + 16 + expNeeded
            
            // Update states only when changed
            if ((horizNeeded <= w) !== horiz) setHorizontalLayout(horizNeeded <= w)
            if ((expNeeded > w) !== collapsed) setTimeToggleCollapsed(expNeeded > w)
            if ((colNeeded > w) !== wrapped) setControlsWrapped(colNeeded > w)
        }
        
        check()
        const observer = new ResizeObserver(() => { cancelAnimationFrame(rafId); rafId = requestAnimationFrame(check) })
        observer.observe(header)
        observer.observe(controls)
        
        return () => { cancelAnimationFrame(rafId); observer.disconnect() }
    }, [])

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

    const prismControlSurface = "border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 backdrop-blur-xl backdrop-saturate-150 shadow-[0_2px_8px_rgba(0,0,0,0.04),inset_0_0.5px_0_rgba(255,255,255,0.08)]"
    const prismControlHover = "hover:bg-black/10 dark:hover:bg-white/10"

    const visibleCharts = charts

    if (errorInfo) return <ErrorState type={errorInfo.type} details={errorInfo.details} className="h-[300px]" />

    return (
        <ChartProvider value = {contextValue}>
            <TooltipProvider>
                <div className={compact ? "flex h-full min-h-0 w-full flex-col overflow-hidden" : "w-full overflow-hidden"}>
                    {/* 
                        Responsive layout - all controlled by JS collision detection:
                        - horizontalLayout: amount left, controls right (when space allows)
                        - timeToggleCollapsed: dropdown vs buttons (when space allows)
                        - controlsWrapped: wrap to 2 rows (when collapsed toggle still collides)
                    */}
                    {/*
                      In compact (dashboard) mode the surrounding PageSection
                      already provides a heading + description, so the chart
                      drops its internal title/amount block and the separator
                      below the controls. On the dedicated Analytics page
                      (compact = false) the full chrome is preserved.
                    */}
                    <CardHeader ref = {headerRef} className = {`flex gap-4 px-0 py-0 ${compact ? 'pb-2.5' : 'pb-4'} border-b border-black/8 dark:border-white/10 ${horizontalLayout ? 'flex-row justify-between items-start' : 'flex-col'}`}>
                        {/* Controls - order-2 in horizontal to appear on right */}
                        <div ref={controlsRef} className={`flex items-center gap-3 min-w-0 justify-between ${horizontalLayout ? 'order-2 shrink-0' : 'w-full'} ${controlsWrapped ? 'flex-wrap gap-y-3' : ''}`}>
                            {/* Left group: Metric toggle + Filter */}
                            <div ref={leftGroupRef} className={`flex items-center gap-3 min-w-0 ${controlsWrapped ? 'w-full' : 'shrink-0'}`}>
                                <div className={`inline-flex items-center h-8 rounded-md overflow-hidden divide-x divide-border/50 ${prismControlSurface} ${controlsWrapped ? 'flex-1' : ''}`}>
                                    {METRIC_TYPES.map(type => {
                                        const typeLabel = getLabelWithFallback(labels, type)
                                        return (
                                            <Tooltip key={type}>
                                                <TooltipTrigger asChild>
                                                    <button
                                                        onClick={() => handleMetricTypeChange(type)}
                                                        className={`h-full px-4 text-sm font-medium cursor-pointer transition-colors ${controlsWrapped ? 'flex-1' : ''} ${selectedChart.metricType === type ? 'bg-black/12 dark:bg-white/12' : `bg-transparent ${prismControlHover}`}`}
                                                    >
                                                        {typeLabel}
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent side="bottom"><p>{typeLabel}</p></TooltipContent>
                                            </Tooltip>
                                        )
                                    })}
                                </div>

                                <div className={`inline-flex items-center h-8 rounded-md overflow-hidden divide-x divide-border/50 ${prismControlSurface}`}>
                                    <Dropdown>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <DropdownTrigger asChild>
                                                    <button className={`flex items-center gap-1 px-2 h-full cursor-pointer transition-colors ${prismControlHover}`}>
                                                        <Filter className="w-4 h-4" />
                                                        {!selectedChart.showTotal && selectedChart.selectedCategories.length > 0 && (
                                                            <span className="flex items-center justify-center | w-4 h-4 | bg-primary | text-xs text-white dark:text-black rounded-full">
                                                                {selectedChart.selectedCategories.length}
                                                            </span>
                                                        )}
                                                    </button>
                                                </DropdownTrigger>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom"><p>{labels.filter_categories ?? "Filter categories"}</p></TooltipContent>
                                        </Tooltip>
                                        
                                        <DropdownContent align="center" onCloseAutoFocus={(e) => e.preventDefault()} width={200}>
                                            <div className="p-2 flex flex-col gap-1.5">
                                                {/* Total chip */}
                                                <button
                                                    onClick={() => handleTotalToggle()}
                                                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${selectedChart.showTotal ? 'bg-primary/10 text-foreground ring-1 ring-inset ring-primary/20' : 'bg-black/5 dark:bg-white/5 text-muted-foreground hover:bg-black/10 dark:hover:bg-white/10'}`}
                                                >
                                                    <span className="w-2 h-2 rounded-full shrink-0" style={metricColorStyle} />
                                                    {labels.total ?? "Total"}
                                                </button>
                                                <div className="h-px bg-border/50" />
                                                {/* Category chips */}
                                                <div className="flex flex-wrap gap-1">
                                                    {categoryOptions.map(cat => {
                                                        const isChecked = selectedChart.selectedCategories.includes(cat)
                                                        const color = getConfigColor(chartConfig, cat)
                                                        return (
                                                            <button
                                                                key={cat}
                                                                onClick={() => handleCategoryToggle(cat)}
                                                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-all ${isChecked ? '' : 'bg-black/5 dark:bg-white/5 text-neutral-400 hover:bg-black/10 dark:hover:bg-white/10'}`}
                                                                style={isChecked ? { backgroundColor: `${color}22`, color, boxShadow: `inset 0 0 0 1px ${color}44` } : undefined}
                                                            >
                                                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color, opacity: isChecked ? 1 : 0.5 }} />
                                                                {chartConfig[cat as keyof typeof chartConfig]?.label ?? cat}
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                                <div className="h-px bg-border/50" />
                                                {/* Actions */}
                                                <div className="flex gap-1">
                                                    <button onClick={handleSelectAll} className="flex-1 px-2 py-1 rounded text-[11px] text-primary transition-colors hover:bg-primary/10">{labels.select_all ?? "All"}</button>
                                                    <button onClick={handleClearAll} className="flex-1 px-2 py-1 rounded text-[11px] text-muted-foreground transition-colors hover:bg-black/5 dark:hover:bg-white/5">{labels.clear ?? "Clear"}</button>
                                                </div>
                                            </div>
                                        </DropdownContent>
                                    </Dropdown>
                                </div>
                            </div>

                            <Separator orientation="vertical" className={`h-6 ${horizontalLayout ? 'block' : 'hidden'}`} />

                            {/* Right group: Time controls + Custom date range */}
                            <div ref={rightGroupRef} className={`flex items-center gap-2 min-w-0 ${controlsWrapped ? 'w-full' : 'shrink-0'}`}>
                                {/* Time toggle - adapts between dropdown (collapsed) and buttons (expanded) */}
                                <div ref={timeToggleRef} className={`inline-flex items-center rounded-md h-8 divide-x divide-border/50 ${prismControlSurface} ${timeToggleCollapsed ? (controlsWrapped ? 'flex-1' : '') : 'shrink-0'} ${hasCustomDateRange ? 'opacity-50' : ''}`}>
                                    <div className="flex items-center justify-center h-full px-1 shrink-0">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <button onClick={handlePrevPeriod} disabled={prevDisabled} className={`inline-flex items-center justify-center h-5 w-5 bg-transparent rounded disabled:opacity-50 disabled:cursor-not-allowed ${prismControlHover}`}>
                                                    <ChevronLeft className="w-4 h-4" />
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom" disabled={prevDisabled}><p>{prevPeriodLabel}</p></TooltipContent>
                                        </Tooltip>
                                    </div>
                                    
                                    {timeToggleCollapsed ? (
                                        <div className="flex items-center min-w-0 flex-1">
                                            <Select value={periodType} onValueChange={setPeriodType} disabled={hasCustomDateRange}>
                                                <SelectTrigger className="w-full h-full border-0 rounded-none shadow-none cursor-pointer focus:ring-0 disabled:opacity-50" size="sm"><SelectValue /></SelectTrigger>
                                                <SelectContent className="rounded-xl">
                                                    {timeRangeEntries.map(([key, label]) => <SelectItem key={key} value={key}>{label as string}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    ) : (
                                        timeRangeEntries.map(([key, label]) => (
                                            <Tooltip key={key}>
                                                <TooltipTrigger asChild>
                                                    <button onClick={handlePeriodTypeClick(key)} disabled={hasCustomDateRange} className={`h-full px-3 text-sm font-medium cursor-pointer transition-colors disabled:cursor-not-allowed ${periodType === key && !hasCustomDateRange ? 'bg-black/12 dark:bg-white/12' : `bg-transparent ${prismControlHover} disabled:hover:bg-transparent`}`}>{label as string}</button>
                                                </TooltipTrigger>
                                                <TooltipContent side="bottom"><p>{label as string}</p></TooltipContent>
                                            </Tooltip>
                                        ))
                                    )}
                                    
                                    <div className="flex items-center justify-center h-full px-1 shrink-0">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <button onClick={handleNextPeriod} disabled={nextDisabled} className={`inline-flex items-center justify-center h-5 w-5 bg-transparent rounded disabled:opacity-50 disabled:cursor-not-allowed ${prismControlHover}`}>
                                                    <ChevronRight className="w-4 h-4" />
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom" disabled={nextDisabled}><p>{nextPeriodLabel}</p></TooltipContent>
                                        </Tooltip>
                                    </div>
                                </div>

                                {/* Custom date range picker */}
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
                                                    <button className={`inline-flex items-center justify-center gap-2 h-8 px-2 rounded-md text-sm font-medium transition-colors ${hasCustomDateRange ? 'border border-primary bg-primary/10 text-primary' : `${prismControlSurface} ${prismControlHover}`}`}>
                                                        <CalendarRange className="w-4 h-4" />
                                                        {customDateRange && (
                                                            <span className="hidden sm:inline text-xs">
                                                                {customDateRange.startDate && customDateRange.endDate
                                                                    ? `${new Date(customDateRange.startDate).toLocaleDateString(locale, DATE_FORMAT_OPTIONS.SHORT)} - ${new Date(customDateRange.endDate).toLocaleDateString(locale, DATE_FORMAT_OPTIONS.SHORT)}`
                                                                    : labels.custom_range ?? 'Custom'
                                                                }
                                                            </span>
                                                        )}
                                                    </button>
                                                }
                                            />
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom"><p>{labels.custom_date_range ?? "Custom date range"}</p></TooltipContent>
                                </Tooltip>
                            </div>
                        </div>

                        {/* Amount display */}
                        <div ref={amountRef} className={`flex flex-col gap-2 shrink-0 ${horizontalLayout ? 'order-1 w-auto' : 'w-full'}`}>
                                {!compact && (
                                    <CardTitle className="text-sm font-medium text-neutral-400">{labels.chart_title ?? "Overview"}</CardTitle>
                                )}
                                {isLoading ? (
                                    <>
                                        <Skeleton className="h-10 w-44" />
                                        <Skeleton className="h-4 w-32" />
                                    </>
                                ) : (
                                    <>
                                        <span className={compact ? "text-2xl font-bold" : "text-4xl font-bold"}>
                                            {formatCurrency(selectedTotal, { locale })}
                                        </span>
                                        <div className="flex items-center gap-4 | text-sm text-neutral-400 text-nowrap">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2.5 h-2.5 | rounded-full shrink-0" style={metricColorStyle} />
                                                <span className="auto-scroll font-medium">{chartConfig[selectedChart.metricType]?.label}</span>
                                            </div>
                                            <span className="text-neutral-400/80">•</span>
                                            <span className="auto-scroll text-neutral-400/80">{periodLabel}</span>
                                        </div>
                                    </>
                                )}
                        </div>
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
                                        {isFirst && (
                                            <AddChartDivider onAdd={addChart} index={0} isEdge disabled={charts.length >= MAX_CHARTS} tooltipLabel={labels.add_chart} />
                                        )}
                                        
                                        {/* Chart container */}
                                        <div 
                                            className={cn("flex items-stretch grow shrink", compact && "min-h-0")}
                                            style={{ minWidth: '280px', flexBasis: '280px' }}
                                        >
                                            <ChartDisplay
                                                instance={chart} index={index} totalCharts={charts.length} chartData={chartData}
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
                                        <AddChartDivider onAdd={addChart} index={index + 1} isEdge={isLast} disabled={charts.length >= MAX_CHARTS} tooltipLabel={labels.add_chart} />
                                    </React.Fragment>
                                )
                            })}
                        </div>

                        <div className={compact ? "flex shrink-0 justify-end items-center gap-2 pt-3" : "flex justify-end items-center gap-2 pt-4"}>
                            <div className="flex items-center gap-2">
                                <div className={`inline-flex items-center rounded-md h-8 divide-x divide-border/50 ${prismControlSurface}`}>
                                    {DISPLAY_MODES.map(mode => {
                                        const Icon = DISPLAY_MODE_ICONS[mode]
                                        const modeLabel = getLabelWithFallback(labels, mode)
                                        return (
                                            <Tooltip key={mode}>
                                                <TooltipTrigger asChild>
                                                    <button onClick={() => handleDisplayModeChange(mode)} className={`h-full px-3 cursor-pointer transition-colors ${selectedChart.displayMode === mode ? 'bg-black/12 dark:bg-white/12' : `bg-transparent ${prismControlHover}`}`}>
                                                        <Icon className="w-4 h-4" />
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent side="top"><p>{modeLabel}</p></TooltipContent>
                                            </Tooltip>
                                        )
                                    })}
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-px h-6 bg-border" />
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button onClick={() => deleteChart(selectedChartId)} variant="glass" size="sm" className="px-2" disabled={charts.length <= 1}><Minus className="w-4 h-4" /></Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" disabled={charts.length <= 1}><p>{labels.remove_chart ?? "Remove chart"}</p></TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button onClick={() => addChart()} variant="glass" size="sm" className="px-2" disabled={charts.length >= MAX_CHARTS}><Plus className="w-4 h-4" /></Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" disabled={charts.length >= MAX_CHARTS}><p>{labels.add_chart ?? "Add chart"}</p></TooltipContent>
                                    </Tooltip>
                                </div>
                            </div>
                        </div>
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
                            <ContextMenuItem onClick={handleOpenSettings}>
                                <Settings2 />
                                {locale.startsWith("pt") ? "Personalizar" : "Customize"}
                            </ContextMenuItem>
                        </ContextMenuContent>
                    </ContextMenu>
                </div>

                <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
                    <SheetContent className="sm:max-w-md p-0 flex flex-col">
                        <SheetHeader className="px-6 pt-6 pb-4 border-b border-black/6 dark:border-white/8">
                            <SheetTitle className="text-[15px] font-semibold tracking-tight">{labels.customize_chart ?? "Customize Chart"}</SheetTitle>
                            <SheetDescription className={cn("text-[13px]", PRISM.muted)}>{labels.customize_chart_desc ?? "Configure the display options for this chart."}</SheetDescription>
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
                                                <button
                                                    key={type}
                                                    onClick={() => updateSelectedChart({ metricType: type, selectedCategories: [], showTotal: true })}
                                                    className={cn(
                                                        PRISM.cardSurface,
                                                        "flex items-center justify-center gap-2 px-3 py-3 text-[13px] font-medium transition-all duration-150",
                                                        isSelected ? PRISM.cardSelected : PRISM.cardHover,
                                                    )}
                                                >
                                                    <span className={cn("w-2 h-2 rounded-full shrink-0", isIncome ? "bg-positive" : "bg-negative")} />
                                                    <span>{typeLabel}</span>
                                                </button>
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
                                                <button
                                                    key={mode}
                                                    onClick={() => updateSelectedChart({ displayMode: mode })}
                                                    className={cn(
                                                        PRISM.cardSurface,
                                                        "flex flex-col items-center gap-2 px-2 py-3 text-[12px] font-medium transition-all duration-150",
                                                        isSelected ? PRISM.cardSelected : PRISM.cardHover,
                                                    )}
                                                >
                                                    <Icon className="w-5 h-5" />
                                                    <span>{modeLabel}</span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                                <div className="space-y-2.5">
                                    <div className="flex justify-between items-center">
                                        <Label className="text-[12px] font-semibold tracking-wide text-neutral-400">{labels.filter ?? "Categories"}</Label>
                                        <div className="flex gap-1.5">
                                            <button onClick={handleSelectAll} className="text-[12px] px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 font-medium transition-colors">{labels.select_all ?? "All"}</button>
                                            <button onClick={handleClearAll} className={cn("text-[12px] px-2 py-1 rounded-md font-medium transition-colors", PRISM.cardSurface, PRISM.cardHover, PRISM.muted)}>{labels.clear ?? "Clear"}</button>
                                        </div>
                                    </div>
                                    <div className={cn(PRISM.cardSurface, "overflow-hidden p-0")}>
                                        <label className={cn(
                                            "flex items-center gap-3 px-3 py-3 cursor-pointer transition-colors border-b",
                                            "border-black/6 dark:border-white/8",
                                            selectedChart.showTotal ? "bg-primary/6 dark:bg-primary/8" : "hover:bg-black/4 dark:hover:bg-white/6",
                                        )}>
                                            <input type="checkbox" checked={selectedChart.showTotal} onChange={handleTotalToggle} className="w-4 h-4 rounded accent-primary" />
                                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={metricColorStyle} />
                                            <span className="font-medium flex-1 text-[13px]">{labels.total ?? "Total"}</span>
                                            <span className={cn("text-[12px]", PRISM.muted)}>{labels[selectedChart.metricType]}</span>
                                        </label>
                                        <div className="max-h-60 overflow-y-auto divide-y divide-black/5 dark:divide-white/6">
                                            {categoryOptions.map(cat => {
                                                const checked = selectedChart.selectedCategories.includes(cat)
                                                return (
                                                    <label key={cat} className={cn(
                                                        "flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors",
                                                        checked ? "bg-primary/6 dark:bg-primary/8" : "hover:bg-black/4 dark:hover:bg-white/6",
                                                    )}>
                                                        <input type="checkbox" checked={checked} onChange={() => handleCategoryToggle(cat)} className="w-4 h-4 rounded accent-primary" />
                                                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: getConfigColor(chartConfig, cat) }} />
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
