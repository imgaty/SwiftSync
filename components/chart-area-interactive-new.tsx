"use client"

import * as React from "react"
import {
    CalendarRange,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Filter,
    Minus,
    Plus,
    Settings,
} from "lucide-react"

import { useIsMobile } from "@/hooks/use-mobile"
import { useChartManager } from "@/hooks/use-chart-manager"
import { useChartData } from "@/hooks/use-chart-data"
import { ChartProvider } from "@/components/chart-context"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { ChartConfig } from "@/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { useLanguage } from "@/components/language-provider"
import { ErrorState } from "@/components/error-state"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"

import { DATA_FILE, CHART_COLOR_VARS, CHART_COLORS, DISPLAY_MODE_ICONS, DISPLAY_MODES, METRIC_TYPES, MAX_CHARTS, DATE_FORMAT_OPTIONS } from "@/lib/chart-constants"
import type { MetricType, DisplayMode } from "@/lib/chart-types"
import { formatPeriodLabel, getConfigColor, getOffsetDate, getFilteredPeriodData, getFilteredCustomRangeData, capitalizeUtil, formatDateWithOrdinalUtil } from "@/lib/chart-utils"
import { useColorBlind } from "@/components/colorblind-provider"

// Import extracted components
import { DateRangePicker } from "@/components/date-range-picker"
import { ChartDisplay } from "@/components/chart-display"
import { AddChartDivider } from "@/components/add-chart-divider"

// ==============================================================================
// HOOKS
// ==============================================================================

// Hook to get chart colors - uses original colors normally, CSS variables only for colorblind modes
function useChartColors() {
    const { mode } = useColorBlind()
    const [colors, setColors] = React.useState<Record<string, string>>(CHART_COLORS)

    React.useEffect(() => {
        if (mode === "none") {
            setColors(CHART_COLORS)
            return
        }
        
        const root = document.documentElement
        const computedStyle = getComputedStyle(root)
        const resolvedColors: Record<string, string> = {}
        
        for (const [key, varName] of Object.entries(CHART_COLOR_VARS)) {
            const value = computedStyle.getPropertyValue(varName).trim()
            resolvedColors[key] = value || CHART_COLORS[key]
        }
        
        setColors(resolvedColors)
    }, [mode])

    return colors
}

// ==============================================================================
// MAIN COMPONENT
// ==============================================================================

export function ChartAreaInteractive() {
    const isMobile = useIsMobile(1280)
    const { t: Lang } = useLanguage()
    const { data: chartData, isLoading, errorInfo, minDate } = useChartData()

    const manager = useChartManager(isMobile)
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
    
    // Dynamic layout detection
    const headerRef = React.useRef<HTMLDivElement>(null)
    const controlsRef = React.useRef<HTMLDivElement>(null)
    const amountRef = React.useRef<HTMLDivElement>(null)
    const [shouldStack, setShouldStack] = React.useState(false)
    const shouldStackRef = React.useRef(false)
    
    React.useEffect(() => {
        const header = headerRef.current
        const controls = controlsRef.current
        const amount = amountRef.current
        if (!header || !controls || !amount) return
        
        const checkLayout = () => {
            const originalHeaderClass = header.className
            const originalControlsClass = controls.className
            const originalAmountClass = amount.className
            
            header.className = 'flex flex-row gap-6 items-start'
            controls.className = 'flex items-center gap-3 shrink-0'
            amount.className = 'flex flex-col gap-2 shrink-0'
            
            void header.offsetWidth
            
            const availableWidth = header.offsetWidth
            const controlsWidth = controls.offsetWidth
            const amountWidth = amount.offsetWidth
            const gap = 24
            
            header.className = originalHeaderClass
            controls.className = originalControlsClass
            amount.className = originalAmountClass
            
            const totalNeeded = controlsWidth + amountWidth + gap
            const hysteresis = 40
            
            if (shouldStackRef.current) {
                if (totalNeeded + hysteresis < availableWidth) {
                    shouldStackRef.current = false
                    setShouldStack(false)
                }
            } else {
                if (totalNeeded > availableWidth) {
                    shouldStackRef.current = true
                    setShouldStack(true)
                }
            }
        }
        
        requestAnimationFrame(checkLayout)
        
        const resizeObserver = new ResizeObserver(() => {
            requestAnimationFrame(checkLayout)
        })
        resizeObserver.observe(header)
        
        return () => resizeObserver.disconnect()
    }, [])

    const labels = Lang.data_type_labels ?? {}
    const langConfig = Lang.config ?? { locale: 'pt-PT' }
    const timeRange = Lang.time_range ?? {}
    const loadingText = Lang.loading ?? "Loading..."

    const chartColors = useChartColors()

    const chartConfig = React.useMemo(() => {
        const config: ChartConfig = { visitors: { label: labels.total ?? "Total" } }
        for (const [key, color] of Object.entries(chartColors)) {
            config[key] = { label: labels[key] ?? key.charAt(0).toUpperCase() + key.slice(1), color }
        }
        return config
    }, [labels, chartColors])

    const contextValue = React.useMemo(() => ({
        chartConfig,
        labels,
        locale: langConfig.locale || 'pt-PT'
    }), [chartConfig, labels, langConfig.locale])

    const offsetDate = React.useMemo(() => getOffsetDate(periodType, timeOffset), [periodType, timeOffset])
    
    const periodData = React.useMemo(() => {
        if (customDateRange?.startDate && customDateRange?.endDate) {
            return getFilteredCustomRangeData(chartData, customDateRange.startDate, customDateRange.endDate)
        }
        return getFilteredPeriodData(chartData, periodType, offsetDate)
    }, [chartData, periodType, offsetDate, customDateRange])

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
            ? [selectedChart.metricType] 
            : selectedChart.selectedCategories
        let total = 0
        for (const item of periodData) {
            for (const key of keys) {
                total += (item[key] as number) || 0
            }
        }
        return total
    }, [periodData, selectedChart.showTotal, selectedChart.selectedCategories, selectedChart.metricType])

    if (errorInfo) return <ErrorState type={errorInfo.type} details={errorInfo.details} fileName={DATA_FILE} className="h-[300px]" />

    const locale = langConfig.locale || 'pt-PT'
    const metricColor = React.useMemo(() => getConfigColor(chartConfig, selectedChart.metricType), [chartConfig, selectedChart.metricType])
    
    const periodLabel = React.useMemo(() => {
        if (customDateRange?.startDate && customDateRange?.endDate) {
            const start = new Date(customDateRange.startDate)
            const end = new Date(customDateRange.endDate)
            return `${start.toLocaleDateString(locale, DATE_FORMAT_OPTIONS.SHORT_NO_YEAR)} - ${end.toLocaleDateString(locale, DATE_FORMAT_OPTIONS.SHORT)}`
        }
        return formatPeriodLabel(periodType, offsetDate, locale, labels.all_time ?? "All time")
    }, [periodType, offsetDate, locale, labels.all_time, customDateRange])

    const prevPeriodLabel = React.useMemo(() => {
        if (periodType === 'all') return labels.previous ?? "Previous"
        const prevDate = new Date(offsetDate)
        const prefix = labels.previous ?? "Previous"
        if (periodType === 'today') {
            prevDate.setDate(prevDate.getDate() - 1)
            return `${prefix} (${formatDateWithOrdinalUtil(prevDate, locale)})`
        }
        if (periodType === 'month') {
            prevDate.setMonth(prevDate.getMonth() - 1)
            const month = capitalizeUtil(prevDate.toLocaleDateString(locale, DATE_FORMAT_OPTIONS.MONTH_LONG))
            return `${prefix} (${month} ${prevDate.getFullYear()})`
        }
        if (periodType === 'year') {
            prevDate.setFullYear(prevDate.getFullYear() - 1)
            return `${prefix} (${prevDate.getFullYear()})`
        }
        return prefix
    }, [periodType, offsetDate, locale, labels.previous])

    const nextPeriodLabel = React.useMemo(() => {
        if (periodType === 'all') return labels.next ?? "Next"
        const nextDate = new Date(offsetDate)
        const prefix = labels.next ?? "Next"
        if (periodType === 'today') {
            nextDate.setDate(nextDate.getDate() + 1)
            return `${prefix} (${formatDateWithOrdinalUtil(nextDate, locale)})`
        }
        if (periodType === 'month') {
            nextDate.setMonth(nextDate.getMonth() + 1)
            const month = capitalizeUtil(nextDate.toLocaleDateString(locale, DATE_FORMAT_OPTIONS.MONTH_LONG))
            return `${prefix} (${month} ${nextDate.getFullYear()})`
        }
        if (periodType === 'year') {
            nextDate.setFullYear(nextDate.getFullYear() + 1)
            return `${prefix} (${nextDate.getFullYear()})`
        }
        return prefix
    }, [periodType, offsetDate, locale, labels.next])

    const handlePrevPeriod = React.useCallback(() => setTimeOffset(p => p - 1), [setTimeOffset])
    const handleNextPeriod = React.useCallback(() => setTimeOffset(p => p + 1), [setTimeOffset])
    const isPrevDisabled = periodType === 'all' || isBackDisabled
    const isNextDisabled = periodType === 'all' || timeOffset === 0
    const handleMetricTypeChange = React.useCallback((v: string) => { if (v) updateSelectedChart({ metricType: v as MetricType, selectedCategories: [], showTotal: true }) }, [updateSelectedChart])
    const handleDisplayModeChange = React.useCallback((v: string) => { if (v) updateSelectedChart({ displayMode: v as DisplayMode }) }, [updateSelectedChart])

    return (
        <ChartProvider value={contextValue}>
            <TooltipProvider>
                <Card className="gap-8 | p-8 | overflow-hidden">
                    <CardHeader ref={headerRef} className={`flex gap-6 ${shouldStack ? 'flex-col' : 'flex-row justify-between items-start'}`}>
                        {/* Controls */}
                        <div ref={controlsRef} className={`flex items-center gap-3 ${shouldStack ? 'w-full justify-between flex-wrap' : 'order-2 shrink-0 justify-end'}`}>
                            {/* Left group: Metric toggle + Filter */}
                            <div className={`flex items-center gap-3 ${shouldStack ? 'max-[535px]:flex-1' : ''}`}>
                                <div className="max-[535px]:flex-1 inline-flex items-center | h-8 | border border-border/50 rounded-md | overflow-hidden | divide-x divide-border/50">
                                    {METRIC_TYPES.map(type => (
                                        <Tooltip key={type}>
                                            <TooltipTrigger asChild>
                                                <button
                                                    onClick={() => handleMetricTypeChange(type)}
                                                    className={`max-[535px]:flex-1 h-full | px-4 | text-sm font-medium cursor-pointer | transition-colors ${selectedChart.metricType === type ? 'bg-muted' : 'bg-transparent hover:bg-muted/50'}`}
                                                >
                                                    {labels[type] ?? type.charAt(0).toUpperCase() + type.slice(1)}
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom"><p>{labels[type] ?? type.charAt(0).toUpperCase() + type.slice(1)}</p></TooltipContent>
                                        </Tooltip>
                                    ))}
                                </div>

                                <div className="inline-flex items-center | h-8 | border border-border/50 rounded-md | overflow-hidden | divide-x divide-border/50">
                                    <DropdownMenu>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <DropdownMenuTrigger asChild>
                                                    <button className="flex items-center gap-1 | px-2 | h-full | cursor-pointer | transition-colors | hover:bg-muted/50">
                                                        <Filter className="w-4 h-4" />
                                                        {!selectedChart.showTotal && selectedChart.selectedCategories.length > 0 && (
                                                            <span className="flex items-center justify-center | w-4 h-4 | bg-primary | text-xs text-primary-foreground rounded-full">
                                                                {selectedChart.selectedCategories.length}
                                                            </span>
                                                        )}
                                                    </button>
                                                </DropdownMenuTrigger>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom"><p>{labels.filter_categories ?? "Filter categories"}</p></TooltipContent>
                                        </Tooltip>
                                        
                                        <DropdownMenuContent align="center" className="w-56 | rounded-xl" onCloseAutoFocus={(e) => e.preventDefault()}>
                                            <DropdownMenuLabel className="flex justify-between items-center">
                                                <span>{labels.filter}</span>
                                                <div className="flex gap-2">
                                                    <button onClick={handleSelectAll} className="px-2 py-0.5 | rounded | text-xs text-primary | transition-colors hover:bg-primary/10">{labels.select_all ?? "All"}</button>
                                                    <button onClick={handleClearAll} className="px-2 py-0.5 | rounded | text-xs text-muted-foreground | transition-colors hover:bg-muted">{labels.clear ?? "Clear"}</button>
                                                </div>
                                            </DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuCheckboxItem checked={selectedChart.showTotal} onCheckedChange={handleTotalToggle} onSelect={(e) => e.preventDefault()}>
                                                <span className="flex items-center gap-2">
                                                    <span className="w-2.5 h-2.5 | rounded-full" style={{ backgroundColor: metricColor }} />
                                                    {labels.total ?? "Total"}
                                                </span>
                                            </DropdownMenuCheckboxItem>
                                            <DropdownMenuSeparator />
                                            {categoryOptions.map(cat => (
                                                <DropdownMenuCheckboxItem key={cat} checked={selectedChart.selectedCategories.includes(cat)} onCheckedChange={() => handleCategoryToggle(cat)} onSelect={(e) => e.preventDefault()}>
                                                    <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: getConfigColor(chartConfig, cat) }} />{chartConfig[cat as keyof typeof chartConfig]?.label ?? cat}</span>
                                                </DropdownMenuCheckboxItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>

                            <Separator orientation="vertical" className={shouldStack ? 'hidden' : 'block'} />

                            {/* Right group: Time controls + Custom date range */}
                            <div className="flex items-center gap-2 max-[535px]:flex-1">
                                {shouldStack ? (
                                    <div className="max-[535px]:flex-1 inline-flex items-center rounded-md | border border-border/50 | h-8 | divide-x divide-border/50">
                                        <div className="flex items-center justify-center h-full px-1">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <button onClick={handlePrevPeriod} disabled={isPrevDisabled || !!customDateRange} className="inline-flex items-center justify-center | h-5 w-5 | bg-transparent hover:bg-muted rounded | disabled:opacity-50 disabled:cursor-not-allowed">
                                                        <ChevronLeft className="w-4 h-4" />
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent side="bottom" disabled={isPrevDisabled || !!customDateRange}><p>{prevPeriodLabel}</p></TooltipContent>
                                            </Tooltip>
                                        </div>
                                        <div className="max-[535px]:flex-1 flex items-center">
                                            <Select value={periodType} onValueChange={setPeriodType} disabled={!!customDateRange}>
                                                <SelectTrigger className="w-full h-full border-0 rounded-none shadow-none cursor-pointer focus:ring-0 disabled:opacity-50" size="sm"><SelectValue /></SelectTrigger>
                                                <SelectContent className="rounded-xl">
                                                    {Object.entries(timeRange).map(([key, label]) => (
                                                        <SelectItem key={key} value={key}>{label as string}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="flex items-center justify-center h-full px-1">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <button onClick={handleNextPeriod} disabled={isNextDisabled || !!customDateRange} className="inline-flex items-center justify-center | h-5 w-5 | bg-transparent hover:bg-muted rounded | disabled:opacity-50 disabled:cursor-not-allowed">
                                                        <ChevronRight className="w-4 h-4" />
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent side="bottom" disabled={isNextDisabled || !!customDateRange}><p>{nextPeriodLabel}</p></TooltipContent>
                                            </Tooltip>
                                        </div>
                                    </div>
                                ) : (
                                    <div className={`inline-flex items-center rounded-md | border border-border/50 | h-8 | divide-x divide-border/50 ${customDateRange ? 'opacity-50' : ''}`}>
                                        <div className="flex items-center justify-center h-full px-1">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <button onClick={handlePrevPeriod} disabled={isPrevDisabled || !!customDateRange} className="inline-flex items-center justify-center | h-5 w-5 | bg-transparent hover:bg-muted rounded | disabled:opacity-50 disabled:cursor-not-allowed">
                                                        <ChevronLeft className="w-4 h-4" />
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent side="bottom" disabled={isPrevDisabled || !!customDateRange}><p>{prevPeriodLabel}</p></TooltipContent>
                                            </Tooltip>
                                        </div>
                                        {Object.entries(timeRange).map(([key, label]) => (
                                            <Tooltip key={key}>
                                                <TooltipTrigger asChild>
                                                    <button onClick={() => setPeriodType(key)} disabled={!!customDateRange} className={`h-full px-3 | text-sm font-medium cursor-pointer | transition-colors disabled:cursor-not-allowed ${periodType === key && !customDateRange ? 'bg-muted' : 'bg-transparent hover:bg-muted/50 disabled:hover:bg-transparent'}`}>{label as string}</button>
                                                </TooltipTrigger>
                                                <TooltipContent side="bottom"><p>{label as string}</p></TooltipContent>
                                            </Tooltip>
                                        ))}
                                        <div className="flex items-center justify-center h-full px-1">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <button onClick={handleNextPeriod} disabled={isNextDisabled || !!customDateRange} className="inline-flex items-center justify-center | h-5 w-5 | bg-transparent hover:bg-muted rounded | disabled:opacity-50 disabled:cursor-not-allowed">
                                                        <ChevronRight className="w-4 h-4" />
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent side="bottom" disabled={isNextDisabled || !!customDateRange}><p>{nextPeriodLabel}</p></TooltipContent>
                                            </Tooltip>
                                        </div>
                                    </div>
                                )}

                                {/* Custom date range picker */}
                                <Popover open={dateRangeOpen} onOpenChange={setDateRangeOpen}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <PopoverTrigger asChild>
                                                <button className={`inline-flex items-center justify-center gap-2 | h-8 px-3 | border rounded-md | text-sm font-medium | transition-colors ${customDateRange ? 'border-primary bg-primary/10 text-primary' : 'border-border/50 hover:bg-muted/50'}`}>
                                                    <CalendarRange className="w-4 h-4" />
                                                    {customDateRange && (
                                                        <span className="hidden sm:inline text-xs">
                                                            {customDateRange.startDate && customDateRange.endDate 
                                                                ? `${new Date(customDateRange.startDate).toLocaleDateString(locale, DATE_FORMAT_OPTIONS.SHORT_NO_YEAR)} - ${new Date(customDateRange.endDate).toLocaleDateString(locale, DATE_FORMAT_OPTIONS.SHORT)}`
                                                                : labels.custom_range ?? 'Custom'
                                                            }
                                                        </span>
                                                    )}
                                                </button>
                                            </PopoverTrigger>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom"><p>{labels.custom_date_range ?? "Custom date range"}</p></TooltipContent>
                                    </Tooltip>
                                    <PopoverContent className="w-auto p-0" align="end" side="top" sideOffset={8}>
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

                        {/* Amount display */}
                        <div ref={amountRef} className={`flex flex-col gap-2 | w-auto ${shouldStack ? '' : 'order-1'}`}>
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
                                    <div className="flex items-center gap-4 | text-sm text-muted-foreground text-nowrap">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 | rounded-full" style={{ backgroundColor: metricColor }} />
                                            <span className="font-medium">{chartConfig[selectedChart.metricType]?.label}</span>
                                        </div>
                                        <span className="text-muted-foreground/80">•</span>
                                        <span className="text-muted-foreground/80">{periodLabel}</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </CardHeader>

                    <CardContent>
                        <div ref={chartAreaRef} className="flex flex-col xl:flex-row xl:flex-wrap items-stretch xl:gap-0">
                            {/* Mobile divider - top */}
                            <div className="xl:hidden"><AddChartDivider onAdd={addChart} index={0} isEdge vertical disabled={charts.length >= MAX_CHARTS} tooltipLabel={labels.add_chart} /></div>
                            {/* Desktop divider - left */}
                            <div className="hidden xl:flex self-stretch"><AddChartDivider onAdd={addChart} index={0} isEdge disabled={charts.length >= MAX_CHARTS} tooltipLabel={labels.add_chart} /></div>
                            
                            {charts.map((chart, index) => {
                                const isLast = index === charts.length - 1
                                return (
                                    <React.Fragment key={chart.id}>
                                        <ChartDisplay
                                            instance={chart} index={index} totalCharts={charts.length} chartData={chartData}
                                            isLoading={isLoading} loadingText={loadingText}
                                            showBorder={chart.id === showBorder}
                                            isHorizontal={!isMobile}
                                            onSelect={() => setSelectedChartId(chart.id)} onShowBorder={() => triggerBorder(chart.id)}
                                            onDelete={() => deleteChart(chart.id)} onMoveLeft={() => moveChart(chart.id, 'left')} onMoveRight={() => moveChart(chart.id, 'right')}
                                            onOpenSettings={() => { setSelectedChartId(chart.id); triggerBorder(chart.id); setSettingsOpen(true) }}
                                        />
                                        {/* Mobile divider */}
                                        <div className="xl:hidden"><AddChartDivider onAdd={addChart} index={index + 1} isEdge={isLast} vertical disabled={charts.length >= MAX_CHARTS} tooltipLabel={labels.add_chart} /></div>
                                        {/* Desktop divider */}
                                        <div className="hidden xl:flex self-stretch"><AddChartDivider onAdd={addChart} index={index + 1} isEdge={isLast} disabled={charts.length >= MAX_CHARTS} tooltipLabel={labels.add_chart} /></div>
                                    </React.Fragment>
                                )
                            })}
                        </div>

                        <div className="flex justify-end items-center gap-2 pt-4">
                            <div className="flex items-center gap-2">
                                {isMobile ? (
                                    <DropdownMenu>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="outline" size="sm" className="gap-2">
                                                        {React.createElement(DISPLAY_MODE_ICONS[selectedChart.displayMode], { className: "w-4 h-4" })}
                                                        <ChevronDown className="w-3 h-3" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                            </TooltipTrigger>
                                            <TooltipContent side="top"><p>{labels.chart_style ?? "Chart style"}</p></TooltipContent>
                                        </Tooltip>
                                        <DropdownMenuContent align="end" className="rounded-xl">
                                            {DISPLAY_MODES.map(mode => {
                                                const Icon = DISPLAY_MODE_ICONS[mode]
                                                return (
                                                    <DropdownMenuCheckboxItem key={mode} checked={selectedChart.displayMode === mode} onCheckedChange={() => updateSelectedChart({ displayMode: mode })}>
                                                        <span className="flex items-center gap-2">
                                                            <Icon className="w-4 h-4" />
                                                            {labels[`${mode}_chart`] ?? mode.charAt(0).toUpperCase() + mode.slice(1)}
                                                        </span>
                                                    </DropdownMenuCheckboxItem>
                                                )
                                            })}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                ) : (
                                    <div className="inline-flex items-center rounded-md | border border-border/50 | h-8 | divide-x divide-border/50">
                                        {DISPLAY_MODES.map(mode => {
                                            const Icon = DISPLAY_MODE_ICONS[mode]
                                            const modeLabel = labels[mode] ?? mode.charAt(0).toUpperCase() + mode.slice(1)
                                            return (
                                                <Tooltip key={mode}>
                                                    <TooltipTrigger asChild>
                                                        <button onClick={() => handleDisplayModeChange(mode)} className={`h-full px-3 | cursor-pointer | transition-colors ${selectedChart.displayMode === mode ? 'bg-muted' : 'bg-transparent hover:bg-muted/50'}`}>
                                                            <Icon className="w-4 h-4" />
                                                        </button>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top"><p>{modeLabel}</p></TooltipContent>
                                                </Tooltip>
                                            )
                                        })}
                                    </div>
                                )}
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
                            <SheetDescription className="text-sm text-muted-foreground">{labels.customize_chart_desc ?? "Configure the display options for this chart."}</SheetDescription>
                        </SheetHeader>
                        <div className="flex-1 overflow-y-auto px-6 pb-6">
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{labels.metric_type ?? "Data Type"}</Label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {METRIC_TYPES.map(type => {
                                            const isSelected = selectedChart.metricType === type
                                            const isIncome = type === "income"
                                            return (
                                                <button 
                                                    key={type}
                                                    onClick={() => updateSelectedChart({ metricType: type, selectedCategories: [], showTotal: true })}
                                                    className={`flex items-center justify-center gap-2.5 p-4 rounded-xl border-2 transition-all duration-200 ${isSelected 
                                                        ? isIncome 
                                                            ? 'border-positive bg-positive-subtle text-positive shadow-sm' 
                                                            : 'border-negative bg-negative-subtle text-negative shadow-sm'
                                                        : isIncome
                                                            ? 'border-border/60 hover:border-positive/40 hover:bg-positive-subtle/50'
                                                            : 'border-border/60 hover:border-negative/40 hover:bg-negative-subtle/50'
                                                    }`}
                                                >
                                                    <span className={`w-2.5 h-2.5 rounded-full ${isIncome ? 'bg-positive' : 'bg-negative'}`} />
                                                    <span className="font-medium">{labels[type] ?? type.charAt(0).toUpperCase() + type.slice(1)}</span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{labels.chart_type ?? "Chart Style"}</Label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {DISPLAY_MODES.map(mode => {
                                            const Icon = DISPLAY_MODE_ICONS[mode]
                                            const isSelected = selectedChart.displayMode === mode
                                            return (
                                                <button 
                                                    key={mode} 
                                                    onClick={() => updateSelectedChart({ displayMode: mode })}
                                                    className={`flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 transition-all duration-200 ${isSelected ? 'border-primary bg-primary/10 shadow-sm' : 'border-border/60 hover:border-primary/40 hover:bg-primary/5'}`}
                                                >
                                                    <Icon className="w-6 h-6" />
                                                    <span className="text-xs font-medium">{labels[mode] ?? mode.charAt(0).toUpperCase() + mode.slice(1)}</span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{labels.filter ?? "Categories"}</Label>
                                        <div className="flex gap-2">
                                            <button onClick={handleSelectAll} className="text-xs px-2.5 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 font-medium transition-colors">{labels.select_all ?? "All"}</button>
                                            <button onClick={handleClearAll} className="text-xs px-2.5 py-1 rounded-md bg-muted hover:bg-muted/80 text-muted-foreground font-medium transition-colors">{labels.clear ?? "Clear"}</button>
                                        </div>
                                    </div>
                                    <div className="rounded-xl border border-border/60 overflow-hidden">
                                        <label className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors border-b border-border/40 ${selectedChart.showTotal ? 'bg-primary/5' : 'hover:bg-muted/50'}`}>
                                            <input type="checkbox" checked={selectedChart.showTotal} onChange={handleTotalToggle} className="w-4 h-4 rounded border-2 accent-primary" />
                                            <span className="w-3 h-3 rounded-full shrink-0 ring-2 ring-offset-2 ring-offset-background" style={{ backgroundColor: metricColor }} />
                                            <span className="font-medium flex-1">{labels.total ?? "Total"}</span>
                                            <span className="text-xs text-muted-foreground">{labels[selectedChart.metricType]}</span>
                                        </label>
                                        <div className="max-h-60 overflow-y-auto divide-y divide-border/30">
                                            {categoryOptions.map(cat => (
                                                <label key={cat} className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${selectedChart.selectedCategories.includes(cat) ? 'bg-primary/5' : 'hover:bg-muted/50'}`}>
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
            </TooltipProvider>
        </ChartProvider>
    )
}
