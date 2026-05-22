"use client"

import * as React from "react"
import { X, ChevronLeft, ChevronRight, Filter, CalendarRange } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ChartConfig, AreaChartComponent, BarChartComponent, PieChartComponent } from "@/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dropdown, DropdownContent, DropdownTrigger, DropdownCheckboxItem, DropdownSeparator } from "@/components/ui/dropdown"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"
import { DISPLAY_MODE_ICONS, DATE_FORMAT_OPTIONS, DISPLAY_MODES, METRIC_TYPES } from "@/lib/chart-constants"
import { getOffsetDate, getFilteredPeriodData, getFilteredCustomRangeData, getCategoryOptions, getConfigColor, formatPeriodLabel } from "@/lib/chart-utils"
import type { ChartInstance, DailyData, MetricType, DisplayMode, CustomDateRange } from "@/lib/chart-types"
import { DatePicker } from "@/components/date-picker"
import { useCurrency } from "@/components/currency-provider"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { PRISM } from "@/lib/PRISM"
import { cn } from "@/lib/utils"

interface ExpandedChartViewProps {
    chart: ChartInstance
    chartData: DailyData[]
    chartConfig: ChartConfig
    labels: Record<string, string>
    locale: string
    isLoading: boolean
    loadingText: string
    onClose: () => void
    onUpdateChart: (updates: Partial<ChartInstance>) => void
    onSetPeriodType: (periodType: string) => void
    onSetTimeOffset: (updater: number | ((prev: number) => number)) => void
    onSetCustomDateRange: (range: CustomDateRange) => void
    onClearCustomDateRange: () => void
    onCategoryToggle: (category: string) => void
    onTotalToggle: () => void
    onSelectAll: () => void
    onClearAll: () => void
}

const TIME_OPTIONS = [
    { value: 'today', key: 'today' },
    { value: 'month', key: 'month' },
    { value: 'year', key: 'year' },
    { value: 'all', key: 'all_time' },
] as const

export const ExpandedChartView = React.memo(function ExpandedChartView({
    chart, chartData, chartConfig, labels, locale, isLoading, loadingText,
    onClose, onUpdateChart, onSetPeriodType, onSetTimeOffset, onSetCustomDateRange, onClearCustomDateRange,
    onCategoryToggle, onTotalToggle, onSelectAll, onClearAll
}: ExpandedChartViewProps) {
    const { convertAmount, formatCurrency, currency } = useCurrency()
    const [hoverIndex, setHoverIndex] = React.useState<number | null>(null)
    const [dateRangeOpen, setDateRangeOpen] = React.useState(false)
    
    const { metricType, displayMode, selectedCategories, showTotal, periodType, timeOffset, customDateRange } = chart
    const categoryOptions = React.useMemo(() => getCategoryOptions(metricType), [metricType])
    const offsetDate = React.useMemo(() => getOffsetDate(periodType, timeOffset), [periodType, timeOffset])
    
    // Consolidated data computation
    const { periodData, chartKeys, pieData, total } = React.useMemo(() => {
        const baseData = customDateRange?.startDate && customDateRange?.endDate
            ? getFilteredCustomRangeData(chartData, customDateRange.startDate, customDateRange.endDate)
            : getFilteredPeriodData(chartData, periodType, offsetDate)

        const data = baseData.map((item) => {
            const converted = { ...item } as DailyData
            for (const [key, value] of Object.entries(item)) {
                if (key !== "date" && typeof value === "number") {
                    converted[key as keyof DailyData] = convertAmount(value) as never
                }
            }
            return converted
        })
        
        const keys = showTotal ? [metricType] : (selectedCategories.length > 0 ? selectedCategories : [metricType])
        
        let pie
        if (showTotal) {
            const t = data.reduce((acc, c) => acc + (c[metricType] as number), 0)
            pie = [{ name: metricType, value: t, fill: `var(--color-${metricType})` }]
        } else {
            const cats = selectedCategories.length > 0 ? selectedCategories : [...categoryOptions]
            pie = cats.map(cat => ({
                name: cat,
                value: data.reduce((acc, c) => acc + (c[cat] as number || 0), 0),
                fill: `var(--color-${cat})`
            })).filter(d => d.value > 0)
        }
        
        const sumKeys = showTotal || selectedCategories.length === 0 ? [metricType] : selectedCategories
        let sum = 0
        for (const item of data) for (const key of sumKeys) sum += (item[key] as number) || 0
        
        return { periodData: data, chartKeys: keys, pieData: pie, total: sum }
    }, [chartData, periodType, offsetDate, customDateRange, showTotal, selectedCategories, metricType, categoryOptions, convertAmount])

    const periodLabel = React.useMemo(() => 
        customDateRange?.startDate && customDateRange?.endDate
            ? `${new Date(customDateRange.startDate).toLocaleDateString(locale, DATE_FORMAT_OPTIONS.SHORT)} - ${new Date(customDateRange.endDate).toLocaleDateString(locale, DATE_FORMAT_OPTIONS.SHORT)}`
            : formatPeriodLabel(periodType, offsetDate, locale, labels.all_time ?? "All time")
    , [periodType, offsetDate, locale, labels.all_time, customDateRange])

    const filterLabel = React.useMemo(() => {
        if (showTotal || selectedCategories.length === 0) return labels.total ?? "Total"
        if (selectedCategories.length === 1) return chartConfig[selectedCategories[0] as keyof typeof chartConfig]?.label ?? selectedCategories[0]
        return `${selectedCategories.length} ${labels.categories ?? "categories"}`
    }, [showTotal, selectedCategories, labels, chartConfig])

    const metricColor = React.useMemo(() => getConfigColor(chartConfig, metricType), [chartConfig, metricType])
    const canGoPrev = periodType !== 'all'
    const canGoNext = periodType !== 'all' && timeOffset > 0

    const handlePrev = React.useCallback(() => canGoPrev && onSetTimeOffset(p => p + 1), [canGoPrev, onSetTimeOffset])
    const handleNext = React.useCallback(() => canGoNext && onSetTimeOffset(p => Math.max(0, p - 1)), [canGoNext, onSetTimeOffset])
    const handleMetricChange = React.useCallback((v: string) => onUpdateChart({ metricType: v as MetricType, selectedCategories: [], showTotal: true }), [onUpdateChart])
    const handleDisplayChange = React.useCallback((v: string) => v && onUpdateChart({ displayMode: v as DisplayMode }), [onUpdateChart])
    const handlePeriodChange = React.useCallback((v: string) => {
        if (v !== 'custom') { onClearCustomDateRange(); onSetPeriodType(v); onSetTimeOffset(0) }
    }, [onClearCustomDateRange, onSetPeriodType, onSetTimeOffset])
    const handleDateRangeClose = React.useCallback(() => setDateRangeOpen(false), [])

    // Match the segmented-pill toolbar style used in the non-expanded chart header.
    const prismControlSurface = "border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 backdrop-blur-xl backdrop-saturate-150 shadow-[0_2px_8px_rgba(0,0,0,0.04),inset_0_0.5px_0_rgba(255,255,255,0.08)]"
    const prismControlHover = "hover:bg-black/10 dark:hover:bg-white/10"

    return (
        <Dialog open={true} onOpenChange={(open) => { if (!open) onClose() }}>
            <DialogContent
                showCloseButton={false}
                style={{ width: 900, height: 600, maxWidth: "calc(100vw - 2rem)", maxHeight: "calc(100vh - 2rem)" }}
                className="max-w-none max-h-none p-0 gap-0 overflow-hidden"
                aria-describedby="expanded-chart-description"
            >
                <DialogTitle className="sr-only">{labels.expand ?? "Expanded chart"}</DialogTitle>
                <DialogDescription id="expanded-chart-description" className="sr-only">
                    {labels.customize_chart_desc ?? "Expanded chart view with customization options"}
                </DialogDescription>
                {/* Header */}
                <div className="flex shrink-0 flex-col gap-4 px-6 pt-5 pb-4 border-b border-black/6 dark:border-white/8">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 flex-1 flex-col gap-2">
                            <span className="auto-scroll text-3xl font-semibold tracking-tight leading-none text-black dark:text-white">{formatCurrency(total, { locale })}</span>
                            <div className={cn("flex items-center gap-2 text-[13px]", PRISM.muted)}>
                                <span className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: metricColor }} />
                                    <span className="auto-scroll font-medium text-black/80 dark:text-white/80">{chartConfig[metricType]?.label}</span>
                                </span>
                                <span className="text-neutral-400/50 shrink-0">•</span>
                                <span className="auto-scroll">{filterLabel}</span>
                            </div>
                        </div>
                        <button type="button" onClick={onClose} className={cn(PRISM.closeButton, "shrink-0")} aria-label={labels.close ?? "Close"}><X className="w-4 h-4" /></button>
                    </div>

                    {/* Controls — matches the non-expanded chart toolbar style */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Metric segmented toggle */}
                        <div className={cn(prismControlSurface, "inline-flex items-center h-8 rounded-md overflow-hidden divide-x divide-border/50 shrink-0")}>
                            {METRIC_TYPES.map(type => {
                                const typeLabel = chartConfig[type]?.label ?? type
                                const isActive = metricType === type
                                return (
                                    <Tooltip key={type}>
                                        <TooltipTrigger asChild>
                                            <button
                                                onClick={() => handleMetricChange(type)}
                                                className={cn(
                                                    "h-full px-4 text-sm font-medium cursor-pointer transition-colors",
                                                    isActive ? "bg-black/12 dark:bg-white/12" : cn("bg-transparent", prismControlHover),
                                                )}
                                            >
                                                {typeLabel}
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom"><p>{typeLabel}</p></TooltipContent>
                                    </Tooltip>
                                )
                            })}
                        </div>

                        {/* Filter dropdown */}
                        <div className={cn(prismControlSurface, "inline-flex items-center h-8 rounded-md overflow-hidden shrink-0")}>
                            <Dropdown>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <DropdownTrigger asChild>
                                            <button className={cn("flex items-center gap-1 px-2 h-full cursor-pointer transition-colors", prismControlHover)}>
                                                <Filter className="w-4 h-4" />
                                                {!showTotal && selectedCategories.length > 0 && (
                                                    <span className="flex items-center justify-center w-4 h-4 bg-primary text-xs text-white dark:text-black rounded-full">
                                                        {selectedCategories.length}
                                                    </span>
                                                )}
                                            </button>
                                        </DropdownTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom"><p>{labels.filter_categories ?? "Filter categories"}</p></TooltipContent>
                                </Tooltip>
                                <DropdownContent align="start" className="w-56">
                                    <DropdownCheckboxItem checked={showTotal} onCheckedChange={onTotalToggle}>{labels.total ?? 'Total'}</DropdownCheckboxItem>
                                    <DropdownSeparator />
                                    <div className="flex items-center justify-between px-2 py-1.5">
                                        <Button variant="ghost" size="sm" onClick={onSelectAll}>{labels.select_all ?? 'All'}</Button>
                                        <Button variant="ghost" size="sm" onClick={onClearAll}>{labels.clear ?? 'Clear'}</Button>
                                    </div>
                                    <DropdownSeparator />
                                    {categoryOptions.map(cat => (
                                        <DropdownCheckboxItem key={cat} checked={selectedCategories.includes(cat)} onCheckedChange={() => onCategoryToggle(cat)} disabled={showTotal}>
                                            <span className="flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getConfigColor(chartConfig, cat) }} />
                                                {chartConfig[cat]?.label ?? cat}
                                            </span>
                                        </DropdownCheckboxItem>
                                    ))}
                                </DropdownContent>
                            </Dropdown>
                        </div>

                        <Separator orientation="vertical" className="h-6 hidden md:block" />

                        {/* Time range segmented toggle with prev/next chevrons */}
                        <div className={cn(prismControlSurface, "inline-flex items-center h-8 rounded-md divide-x divide-border/50 shrink-0", customDateRange && "opacity-50")}>
                            <div className="flex items-center justify-center h-full px-1 shrink-0">
                                <button onClick={handlePrev} disabled={!canGoPrev || !!customDateRange} className={cn("inline-flex items-center justify-center h-5 w-5 bg-transparent rounded disabled:opacity-50 disabled:cursor-not-allowed", prismControlHover)}>
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                            </div>
                            {/* Hide period buttons on small viewports, fall back to Select */}
                            <div className="hidden sm:flex items-center divide-x divide-border/50">
                                {TIME_OPTIONS.map(opt => {
                                    const isActive = !customDateRange && periodType === opt.value
                                    const lbl = labels[opt.key] ?? opt.value
                                    return (
                                        <button
                                            key={opt.value}
                                            onClick={() => handlePeriodChange(opt.value)}
                                            disabled={!!customDateRange}
                                            className={cn(
                                                "h-full px-3 text-sm font-medium cursor-pointer transition-colors disabled:cursor-not-allowed",
                                                isActive ? "bg-black/12 dark:bg-white/12" : cn("bg-transparent disabled:hover:bg-transparent", prismControlHover),
                                            )}
                                        >
                                            {lbl}
                                        </button>
                                    )
                                })}
                            </div>
                            <div className="sm:hidden flex items-center min-w-0">
                                <Select value={customDateRange ? 'custom' : periodType} onValueChange={handlePeriodChange} disabled={!!customDateRange}>
                                    <SelectTrigger className="h-full border-0 rounded-none shadow-none cursor-pointer focus:ring-0 px-3" size="sm"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {TIME_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{labels[opt.key] ?? opt.value}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center justify-center h-full px-1 shrink-0">
                                <button onClick={handleNext} disabled={!canGoNext || !!customDateRange} className={cn("inline-flex items-center justify-center h-5 w-5 bg-transparent rounded disabled:opacity-50 disabled:cursor-not-allowed", prismControlHover)}>
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Custom date range */}
                        <DatePicker
                            range={{
                                value: customDateRange ?? null,
                                onRangeChange: onSetCustomDateRange,
                                onClear: onClearCustomDateRange,
                                labels,
                            }}
                            locale={locale}
                            open={dateRangeOpen}
                            onOpenChange={(v) => { setDateRangeOpen(v); if (!v) handleDateRangeClose() }}
                            trigger={
                                <button className={cn(
                                    "inline-flex items-center justify-center gap-2 h-8 px-2 rounded-md text-sm font-medium transition-colors shrink-0",
                                    customDateRange ? "border border-primary bg-primary/10 text-primary" : cn(prismControlSurface, prismControlHover),
                                )}>
                                    <CalendarRange className="w-4 h-4" />
                                    {customDateRange?.startDate && customDateRange?.endDate && (
                                        <span className="hidden sm:inline text-xs">
                                            {`${new Date(customDateRange.startDate).toLocaleDateString(locale, DATE_FORMAT_OPTIONS.SHORT)} - ${new Date(customDateRange.endDate).toLocaleDateString(locale, DATE_FORMAT_OPTIONS.SHORT)}`}
                                        </span>
                                    )}
                                </button>
                            }
                        />

                        {/* Display mode segmented toggle */}
                        <div className={cn(prismControlSurface, "ml-auto inline-flex items-center h-8 rounded-md overflow-hidden divide-x divide-border/50 shrink-0")}>
                            {DISPLAY_MODES.map(mode => {
                                const Icon = DISPLAY_MODE_ICONS[mode]
                                const isActive = displayMode === mode
                                return (
                                    <Tooltip key={mode}>
                                        <TooltipTrigger asChild>
                                            <button
                                                onClick={() => handleDisplayChange(mode)}
                                                className={cn(
                                                    "h-full px-3 cursor-pointer transition-colors",
                                                    isActive ? "bg-black/12 dark:bg-white/12" : cn("bg-transparent", prismControlHover),
                                                )}
                                            >
                                                <Icon className="w-4 h-4" />
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom"><p>{labels[mode] ?? mode}</p></TooltipContent>
                                    </Tooltip>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* Chart */}
                <div className="flex-1 p-6 md:p-8 lg:p-10 min-h-0">
                    <div className="w-full h-full min-w-0 min-h-[220px]">
                        {isLoading ? (
                            <div className="flex justify-center items-center h-full text-neutral-400 text-sm">{loadingText}</div>
                        ) : displayMode === "area" ? (
                            <AreaChartComponent data={periodData} config={chartConfig} chartKeys={chartKeys} periodType={periodType} locale={locale} currencyCode={currency} />
                        ) : displayMode === "bar" ? (
                            <BarChartComponent data={periodData} config={chartConfig} chartKeys={chartKeys} periodType={periodType} locale={locale} currencyCode={currency} />
                        ) : (
                            <PieChartComponent pieData={pieData} config={chartConfig} hoverIndex={hoverIndex} setHoverIndex={setHoverIndex} categoryKey={metricType} setCategoryKey={() => {}} locale={locale} currencyCode={currency} isSelected />
                        )}
                    </div>
                </div>

                <div className={cn("flex justify-center py-2.5 border-t border-black/6 dark:border-white/8 text-[12px]", PRISM.muted)}>{labels.press_esc_to_close ?? "Press ESC or click × to close"}</div>
            </DialogContent>
        </Dialog>
    )
})

// Default export for lazy loading
export default ExpandedChartView
