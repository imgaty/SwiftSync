"use client"

import * as React from "react"
import { CalendarRange, ChevronLeft, ChevronRight, Filter, Minus, Plus } from "lucide-react"

import { useChartManager } from "@/hooks/use-chart-manager"
import { useChartData } from "@/hooks/use-chart-data"
import { ChartProvider } from "@/components/chart-context"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig } from "@/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dropdown, DropdownShell, DropdownTrigger, DropdownCheckboxItem, DropdownSeparator, DropdownLabel } from "@/components/ui/app-dropdown"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { useLanguage } from "@/components/language-provider"
import { ErrorState } from "@/components/error-state"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { DISPLAY_MODE_ICONS, DISPLAY_MODES, METRIC_TYPES, MAX_CHARTS, DATE_FORMAT_OPTIONS, AGGREGATION_KEYS } from "@/lib/chart-constants"
import type { MetricType, DisplayMode } from "@/lib/chart-types"
import { formatPeriodLabel, getConfigColor, getOffsetDate, getFilteredPeriodData, getFilteredCustomRangeData, capitalizeUtil, formatDateWithOrdinalUtil } from "@/lib/chart-utils"

import { DateRangePicker } from "@/components/date-range-picker"
import { ChartDisplay } from "@/components/chart-display"
import { AddChartDivider } from "@/components/add-chart-divider"

const ExpandedChartView = React.lazy(() => import("@/components/expanded-chart-view"))



// ==============================================================================
// CONSTANTS
// ==============================================================================

const CHART_MIN_WIDTH = 280
const DIVIDER_WIDTH = 24

const getLabelWithFallback = (labels: Record<string, string>, key: string): string => 
    labels[key] ?? key.charAt(0).toUpperCase() + key.slice(1)



// ==============================================================================
// MAIN COMPONENT
// ==============================================================================

interface ChartAreaInteractiveProps {
    accountIds?: string[]
}

export function ChartAreaInteractive({ accountIds }: ChartAreaInteractiveProps = {}) {
    const { t: lang } = useLanguage()
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
        showBorder,
        settingsOpen,
        chartAreaRef,
        addChart,
        deleteChart,
        moveChart,
        updateSelectedChart,
        setSelectedChartId,
        setShowBorder,
        setSettingsOpen,
        triggerBorder,
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
    const [displayModeCollapsed, setDisplayModeCollapsed] = React.useState(false)
    
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
    layoutStateRef.current = { controlsWrapped, timeToggleCollapsed, horizontalLayout }
    
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

    const labels = lang.data_type_labels ?? {}
    const locale = lang.config?.locale || 'pt-PT'
    const timeRange = lang.time_range ?? {}
    const loadingText = lang.loading ?? "Loading..."
    const timeRangeEntries = React.useMemo(() => Object.entries(timeRange), [timeRange])

    const chartConfig = React.useMemo(() => {
        const config: ChartConfig = { visitors: { label: labels.total ?? "Total" } }
        AGGREGATION_KEYS.forEach(key => { config[key] = { label: getLabelWithFallback(labels, key) } })
        return config
    }, [labels])

    const contextValue = React.useMemo(() => ({ chartConfig, labels, locale }), [chartConfig, labels, locale])
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

    if (errorInfo) return <ErrorState type={errorInfo.type} details={errorInfo.details} className="h-[300px]" />

    return (
        <ChartProvider value = {contextValue}>
            <TooltipProvider>
                <Card className = "w-full overflow-hidden rounded-xl border bg-card shadow-sm">
                    {/* 
                        Responsive layout - all controlled by JS collision detection:
                        - horizontalLayout: amount left, controls right (when space allows)
                        - timeToggleCollapsed: dropdown vs buttons (when space allows)
                        - controlsWrapped: wrap to 2 rows (when collapsed toggle still collides)
                    */}
                    <CardHeader ref = {headerRef} className = {`flex gap-4 p-4 border-b ${horizontalLayout ? 'flex-row justify-between items-start' : 'flex-col'}`}>
                        {/* Controls - order-2 in horizontal to appear on right */}
                        <div ref={controlsRef} className={`flex items-center gap-3 min-w-0 justify-between ${horizontalLayout ? 'order-2 shrink-0' : 'w-full'} ${controlsWrapped ? 'flex-wrap gap-y-3' : ''}`}>
                            {/* Left group: Metric toggle + Filter */}
                            <div ref={leftGroupRef} className={`flex items-center gap-3 min-w-0 ${controlsWrapped ? 'w-full' : 'shrink-0'}`}>
                                <div className={`inline-flex items-center h-8 border border-black/10 dark:border-white/10 rounded-md overflow-hidden divide-x divide-border/50 ${controlsWrapped ? 'flex-1' : ''}`}>
                                    {METRIC_TYPES.map(type => {
                                        const typeLabel = getLabelWithFallback(labels, type)
                                        return (
                                            <Tooltip key={type}>
                                                <TooltipTrigger asChild>
                                                    <button
                                                        onClick={() => handleMetricTypeChange(type)}
                                                        className={`h-full px-4 text-sm font-medium cursor-pointer transition-colors ${controlsWrapped ? 'flex-1' : ''} ${selectedChart.metricType === type ? 'bg-black/5 dark:bg-white/5' : 'bg-transparent hover:bg-black/3 dark:hover:bg-white/3'}`}
                                                    >
                                                        {typeLabel}
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent side="bottom"><p>{typeLabel}</p></TooltipContent>
                                            </Tooltip>
                                        )
                                    })}
                                </div>

                                <div className="inline-flex items-center | h-8 | border border-black/10 dark:border-white/10 rounded-md | overflow-hidden | divide-x divide-border/50">
                                    <Dropdown>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <DropdownTrigger asChild>
                                                    <button className="flex items-center gap-1 | px-2 | h-full | cursor-pointer | transition-colors | hover:bg-black/3 dark:hover:bg-white/3">
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
                                        
                                        <DropdownShell align="center" className="w-56 | rounded-xl" onCloseAutoFocus={(e) => e.preventDefault()}>
                                            <DropdownLabel className="flex justify-between items-center">
                                                <span>{labels.filter}</span>
                                                <div className="flex gap-2">
                                                    <button onClick={handleSelectAll} className="px-2 py-0.5 | rounded | text-xs text-primary | transition-colors hover:bg-primary/10">{labels.select_all ?? "All"}</button>
                                                    <button onClick={handleClearAll} className="px-2 py-0.5 | rounded | text-xs text-neutral-500 dark:text-neutral-400 | transition-colors hover:bg-black/5 dark:hover:bg-white/5">{labels.clear ?? "Clear"}</button>
                                                </div>
                                            </DropdownLabel>
                                            <DropdownSeparator />
                                            <DropdownCheckboxItem checked={selectedChart.showTotal} onCheckedChange={handleTotalToggle} onSelect={(e) => e.preventDefault()}>
                                                <span className="flex items-center gap-2">
                                                    <span className="w-2.5 h-2.5 | rounded-full" style={metricColorStyle} />
                                                    {labels.total ?? "Total"}
                                                </span>
                                            </DropdownCheckboxItem>
                                            <DropdownSeparator />
                                            {categoryOptions.map(cat => (
                                                <DropdownCheckboxItem key={cat} checked={selectedChart.selectedCategories.includes(cat)} onCheckedChange={() => handleCategoryToggle(cat)} onSelect={(e) => e.preventDefault()}>
                                                    <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: getConfigColor(chartConfig, cat) }} />{chartConfig[cat as keyof typeof chartConfig]?.label ?? cat}</span>
                                                </DropdownCheckboxItem>
                                            ))}
                                        </DropdownShell>
                                    </Dropdown>
                                </div>
                            </div>

                            <Separator orientation="vertical" className={`h-6 ${horizontalLayout ? 'block' : 'hidden'}`} />

                            {/* Right group: Time controls + Custom date range */}
                            <div ref={rightGroupRef} className={`flex items-center gap-2 min-w-0 ${controlsWrapped ? 'w-full' : 'shrink-0'}`}>
                                {/* Time toggle - adapts between dropdown (collapsed) and buttons (expanded) */}
                                <div ref={timeToggleRef} className={`inline-flex items-center rounded-md border border-black/10 dark:border-white/10 h-8 divide-x divide-border/50 ${timeToggleCollapsed ? (controlsWrapped ? 'flex-1' : '') : 'shrink-0'} ${hasCustomDateRange ? 'opacity-50' : ''}`}>
                                    <div className="flex items-center justify-center h-full px-1 shrink-0">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <button onClick={handlePrevPeriod} disabled={prevDisabled} className="inline-flex items-center justify-center h-5 w-5 bg-transparent hover:bg-black/5 dark:hover:bg-white/5 rounded disabled:opacity-50 disabled:cursor-not-allowed">
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
                                                    <button onClick={handlePeriodTypeClick(key)} disabled={hasCustomDateRange} className={`h-full px-3 text-sm font-medium cursor-pointer transition-colors disabled:cursor-not-allowed ${periodType === key && !hasCustomDateRange ? 'bg-black/5 dark:bg-white/5' : 'bg-transparent hover:bg-black/3 dark:hover:bg-white/3 disabled:hover:bg-transparent'}`}>{label as string}</button>
                                                </TooltipTrigger>
                                                <TooltipContent side="bottom"><p>{label as string}</p></TooltipContent>
                                            </Tooltip>
                                        ))
                                    )}
                                    
                                    <div className="flex items-center justify-center h-full px-1 shrink-0">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <button onClick={handleNextPeriod} disabled={nextDisabled} className="inline-flex items-center justify-center h-5 w-5 bg-transparent hover:bg-black/5 dark:hover:bg-white/5 rounded disabled:opacity-50 disabled:cursor-not-allowed">
                                                    <ChevronRight className="w-4 h-4" />
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom" disabled={nextDisabled}><p>{nextPeriodLabel}</p></TooltipContent>
                                        </Tooltip>
                                    </div>
                                </div>

                                {/* Custom date range picker */}
                                <Popover open={dateRangeOpen} onOpenChange={setDateRangeOpen}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <PopoverTrigger asChild>
                                                <button className={`inline-flex items-center justify-center gap-2 | h-8 px-2 | border rounded-md | text-sm font-medium | transition-colors ${hasCustomDateRange ? 'border-primary bg-primary/10 text-primary' : 'border-black/10 dark:border-white/10 hover:bg-black/3 dark:hover:bg-white/3'}`}>
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
                                            </PopoverTrigger>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom"><p>{labels.custom_date_range ?? "Custom date range"}</p></TooltipContent>
                                    </Tooltip>
                                    <PopoverContent className="w-auto p-0" align="end" side="bottom" sideOffset={8}>
                                        <DateRangePicker 
                                            customDateRange={customDateRange ?? null}
                                            onRangeChange={setCustomDateRange}
                                            onClear={clearCustomDateRange}
                                            onClose={() => setDateRangeOpen(false)}
                                            locale={locale}
                                            labels={labels}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>

                        {/* Amount display - order-1 keeps it on left when horizontal */}
                        <div ref={amountRef} className={`flex flex-col gap-2 shrink-0 ${horizontalLayout ? 'order-1 w-auto' : 'w-full'}`}>
                            <CardTitle className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{labels.chart_title ?? "Overview"}</CardTitle>
                            {isLoading ? (
                                <>
                                    <Skeleton className="h-10 w-44" />
                                    <Skeleton className="h-4 w-32" />
                                </>
                            ) : (
                                <>
                                    <span className="text-4xl font-bold">
                                        {selectedTotal.toLocaleString(locale, { style: 'currency', currency: 'EUR' })}
                                    </span>
                                    <div className="flex items-center gap-4 | text-sm text-neutral-500 dark:text-neutral-400 text-nowrap">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 | rounded-full shrink-0" style={metricColorStyle} />
                                            <span className="auto-scroll font-medium">{chartConfig[selectedChart.metricType]?.label}</span>
                                        </div>
                                        <span className="text-neutral-500 dark:text-neutral-400/80">•</span>
                                        <span className="auto-scroll text-neutral-500 dark:text-neutral-400/80">{periodLabel}</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </CardHeader>

                    <CardContent className="p-4">
                        <div ref={chartAreaRef} className="flex flex-wrap items-stretch gap-y-4">
                            {charts.map((chart, index) => {
                                const isFirst = index === 0
                                const isLast = index === charts.length - 1
                                return (
                                    <React.Fragment key={chart.id}>
                                        {/* Left edge divider - only before first chart */}
                                        {isFirst && (
                                            <AddChartDivider onAdd={addChart} index={0} isEdge disabled={charts.length >= MAX_CHARTS} tooltipLabel={labels.add_chart} />
                                        )}
                                        
                                        {/* Chart container */}
                                        <div 
                                            className="flex items-stretch grow shrink"
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
                                            />
                                        </div>
                                        
                                        {/* Right divider - between charts or edge after last */}
                                        <AddChartDivider onAdd={addChart} index={index + 1} isEdge={isLast} disabled={charts.length >= MAX_CHARTS} tooltipLabel={labels.add_chart} />
                                    </React.Fragment>
                                )
                            })}
                        </div>

                        <div className="flex justify-end items-center gap-2 pt-4">
                            <div className="flex items-center gap-2">
                                <div className="inline-flex items-center rounded-md | border border-black/10 dark:border-white/10 | h-8 | divide-x divide-border/50">
                                    {DISPLAY_MODES.map(mode => {
                                        const Icon = DISPLAY_MODE_ICONS[mode]
                                        const modeLabel = getLabelWithFallback(labels, mode)
                                        return (
                                            <Tooltip key={mode}>
                                                <TooltipTrigger asChild>
                                                    <button onClick={() => handleDisplayModeChange(mode)} className={`h-full px-3 | cursor-pointer | transition-colors ${selectedChart.displayMode === mode ? 'bg-black/5 dark:bg-white/5' : 'bg-transparent hover:bg-black/3 dark:hover:bg-white/3'}`}>
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
                                            <Button onClick={() => deleteChart(selectedChartId)} variant="outline" size="sm" className="px-2" disabled={charts.length <= 1}><Minus className="w-4 h-4" /></Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" disabled={charts.length <= 1}><p>{labels.remove_chart ?? "Remove chart"}</p></TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button onClick={() => addChart()} variant="outline" size="sm" className="px-2" disabled={charts.length >= MAX_CHARTS}><Plus className="w-4 h-4" /></Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" disabled={charts.length >= MAX_CHARTS}><p>{labels.add_chart ?? "Add chart"}</p></TooltipContent>
                                    </Tooltip>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
                    <SheetContent className="sm:max-w-md p-0 flex flex-col">
                        <SheetHeader className="px-6 pt-6 pb-4">
                            <SheetTitle className="text-xl font-semibold">{labels.customize_chart ?? "Customize Chart"}</SheetTitle>
                            <SheetDescription className="text-sm text-neutral-500 dark:text-neutral-400">{labels.customize_chart_desc ?? "Configure the display options for this chart."}</SheetDescription>
                        </SheetHeader>
                        <div className="flex-1 overflow-y-auto px-6 pb-6">
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{labels.metric_type ?? "Data Type"}</Label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {METRIC_TYPES.map(type => {
                                            const isSelected = selectedChart.metricType === type
                                            const isIncome = type === "income"
                                            const typeLabel = getLabelWithFallback(labels, type)
                                            return (
                                                <button 
                                                    key={type}
                                                    onClick={() => updateSelectedChart({ metricType: type, selectedCategories: [], showTotal: true })}
                                                    className={`flex items-center justify-center gap-2.5 p-4 rounded-xl border-2 transition-all duration-200 ${isSelected 
                                                        ? isIncome 
                                                            ? 'border-positive bg-positive-subtle text-positive shadow-sm' 
                                                            : 'border-negative bg-negative-subtle text-negative shadow-sm'
                                                        : isIncome
                                                            ? 'border-black/10 dark:border-white/10/60 hover:border-positive/40 hover:bg-positive-subtle/50'
                                                            : 'border-black/10 dark:border-white/10/60 hover:border-negative/40 hover:bg-negative-subtle/50'
                                                    }`}
                                                >
                                                    <span className={`w-2.5 h-2.5 rounded-full ${isIncome ? 'bg-positive' : 'bg-negative'}`} />
                                                    <span className="font-medium">{typeLabel}</span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{labels.chart_type ?? "Chart Style"}</Label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {DISPLAY_MODES.map(mode => {
                                            const Icon = DISPLAY_MODE_ICONS[mode]
                                            const isSelected = selectedChart.displayMode === mode
                                            const modeLabel = getLabelWithFallback(labels, mode)
                                            return (
                                                <button 
                                                    key={mode} 
                                                    onClick={() => updateSelectedChart({ displayMode: mode })}
                                                    className={`flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 transition-all duration-200 ${isSelected ? 'border-primary bg-primary/10 shadow-sm' : 'border-black/10 dark:border-white/10/60 hover:border-primary/40 hover:bg-primary/5'}`}
                                                >
                                                    <Icon className="w-6 h-6" />
                                                    <span className="text-xs font-medium">{modeLabel}</span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <Label className="text-sm font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{labels.filter ?? "Categories"}</Label>
                                        <div className="flex gap-2">
                                            <button onClick={handleSelectAll} className="text-xs px-2.5 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 font-medium transition-colors">{labels.select_all ?? "All"}</button>
                                            <button onClick={handleClearAll} className="text-xs px-2.5 py-1 rounded-md bg-black/5 dark:bg-white/5 hover:bg-black/5 dark:hover:bg-white/5/80 text-neutral-500 dark:text-neutral-400 font-medium transition-colors">{labels.clear ?? "Clear"}</button>
                                        </div>
                                    </div>
                                    <div className="rounded-xl border border-black/10 dark:border-white/10/60 overflow-hidden">
                                        <label className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors border-b border-black/10 dark:border-white/10/40 ${selectedChart.showTotal ? 'bg-primary/5' : 'hover:bg-black/3 dark:hover:bg-white/3'}`}>
                                            <input type="checkbox" checked={selectedChart.showTotal} onChange={handleTotalToggle} className="w-4 h-4 rounded border-2 accent-primary" />
                                            <span className="w-3 h-3 rounded-full shrink-0 ring-2 ring-offset-2 ring-offset-background" style={metricColorStyle} />
                                            <span className="font-medium flex-1">{labels.total ?? "Total"}</span>
                                            <span className="text-xs text-neutral-500 dark:text-neutral-400">{labels[selectedChart.metricType]}</span>
                                        </label>
                                        <div className="max-h-60 overflow-y-auto divide-y divide-border/30">
                                            {categoryOptions.map(cat => (
                                                <label key={cat} className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${selectedChart.selectedCategories.includes(cat) ? 'bg-primary/5' : 'hover:bg-black/3 dark:hover:bg-white/3'}`}>
                                                    <input type="checkbox" checked={selectedChart.selectedCategories.includes(cat)} onChange={() => handleCategoryToggle(cat)} className="w-4 h-4 rounded border-2 accent-primary" />
                                                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: getConfigColor(chartConfig, cat) }} />
                                                    <span className="flex-1">{chartConfig[cat as keyof typeof chartConfig]?.label ?? cat}</span>
                                                </label>
                                            ))}
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
