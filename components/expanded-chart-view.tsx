"use client"

import * as React from "react"
import { X, Calendar, ChevronLeft, ChevronRight, Filter, CalendarRange, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ChartConfig, AreaChartComponent, BarChartComponent, PieChartComponent } from "@/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dropdown, DropdownShell, DropdownTrigger, DropdownCheckboxItem, DropdownSeparator, DropdownLabel } from "@/components/ui/app-dropdown"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { DISPLAY_MODE_ICONS, DATE_FORMAT_OPTIONS, DISPLAY_MODES, METRIC_TYPES } from "@/lib/chart-constants"
import { getOffsetDate, getFilteredPeriodData, getFilteredCustomRangeData, getCategoryOptions, getConfigColor, formatPeriodLabel } from "@/lib/chart-utils"
import type { ChartInstance, DailyData, MetricType, DisplayMode, CustomDateRange } from "@/lib/chart-types"
import { DateRangePicker } from "@/components/date-range-picker"

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
    const [hoverIndex, setHoverIndex] = React.useState<number | null>(null)
    const [dateRangeOpen, setDateRangeOpen] = React.useState(false)
    
    const { metricType, displayMode, selectedCategories, showTotal, periodType, timeOffset, customDateRange } = chart
    const categoryOptions = React.useMemo(() => getCategoryOptions(metricType), [metricType])
    const offsetDate = React.useMemo(() => getOffsetDate(periodType, timeOffset), [periodType, timeOffset])
    
    // Consolidated data computation
    const { periodData, chartKeys, pieData, total } = React.useMemo(() => {
        const data = customDateRange?.startDate && customDateRange?.endDate
            ? getFilteredCustomRangeData(chartData, customDateRange.startDate, customDateRange.endDate)
            : getFilteredPeriodData(chartData, periodType, offsetDate)
        
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
    }, [chartData, periodType, offsetDate, customDateRange, showTotal, selectedCategories, metricType, categoryOptions])

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

    // ESC key handler
    React.useEffect(() => {
        const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [onClose])

    return (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm animate-in fade-in-0 duration-150">
            <div className="absolute inset-4 md:inset-6 lg:inset-8 flex flex-col bg-white dark:bg-neutral-950 rounded-2xl border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
                {/* Header */}
                <div className="flex flex-col gap-4 px-6 py-4 border-b bg-white dark:bg-neutral-950/50">
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col min-w-0 flex-1 mr-4">
                            <span className="auto-scroll text-3xl font-bold">{total.toLocaleString(locale, { style: 'currency', currency: 'EUR' })}</span>
                            <div className="flex items-center gap-3 text-sm text-neutral-500 dark:text-neutral-400">
                                <span className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: metricColor }} />
                                    <span className="auto-scroll font-medium">{chartConfig[metricType]?.label}</span>
                                </span>
                                <span className="text-neutral-500 dark:text-neutral-400/40 shrink-0">•</span>
                                <span className="auto-scroll">{filterLabel}</span>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full shrink-0"><X className="w-5 h-5" /></Button>
                    </div>

                    {/* Controls */}
                    <div className="flex flex-wrap items-center gap-3">
                        <Select value={metricType} onValueChange={handleMetricChange}>
                            <SelectTrigger className="w-auto min-w-[140px] h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {METRIC_TYPES.map(type => (
                                    <SelectItem key={type} value={type}>
                                        <span className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getConfigColor(chartConfig, type) }} />
                                            {chartConfig[type]?.label ?? type}
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <ToggleGroup type="single" value={displayMode} onValueChange={handleDisplayChange} className="bg-black/3 dark:bg-white/3 rounded-md p-0.5">
                            {DISPLAY_MODES.map(mode => (
                                <Tooltip key={mode}>
                                    <TooltipTrigger asChild>
                                        <ToggleGroupItem value={mode} size="sm" className="px-2.5 data-[state=on]:bg-background">
                                            {React.createElement(DISPLAY_MODE_ICONS[mode], { className: "w-4 h-4" })}
                                        </ToggleGroupItem>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom"><p>{labels[mode] ?? mode}</p></TooltipContent>
                                </Tooltip>
                            ))}
                        </ToggleGroup>

                        <div className="w-px h-6 bg-border" />

                        <Select value={customDateRange ? 'custom' : periodType} onValueChange={handlePeriodChange}>
                            <SelectTrigger className="w-auto min-w-[130px] h-9">
                                <Calendar className="w-4 h-4 mr-2 text-neutral-500 dark:text-neutral-400" />
                                <SelectValue>{customDateRange ? (labels.custom_range ?? 'Custom') : periodLabel}</SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                {TIME_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{labels[opt.key] ?? opt.value}</SelectItem>)}
                            </SelectContent>
                        </Select>

                        {periodType !== 'all' && !customDateRange && (
                            <div className="flex items-center gap-1">
                                <Button variant="outline" size="icon" className="h-9 w-9" onClick={handlePrev} disabled={!canGoPrev}><ChevronLeft className="w-4 h-4" /></Button>
                                <Button variant="outline" size="icon" className="h-9 w-9" onClick={handleNext} disabled={!canGoNext}><ChevronRight className="w-4 h-4" /></Button>
                            </div>
                        )}

                        <Popover open={dateRangeOpen} onOpenChange={setDateRangeOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="h-9 gap-2">
                                    <CalendarRange className="w-4 h-4" />
                                    <span className="hidden sm:inline">{labels.custom_date_range ?? 'Custom Range'}</span>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <DateRangePicker customDateRange={customDateRange ?? null} onRangeChange={onSetCustomDateRange} onClear={onClearCustomDateRange} onClose={handleDateRangeClose} locale={locale} labels={labels} />
                            </PopoverContent>
                        </Popover>

                        <div className="w-px h-6 bg-border" />

                        <Dropdown>
                            <DropdownTrigger asChild>
                                <Button variant="outline" size="sm" className="h-9 gap-2">
                                    <Filter className="w-4 h-4" /><span>{filterLabel}</span><ChevronDown className="w-3 h-3 opacity-50" />
                                </Button>
                            </DropdownTrigger>
                            <DropdownShell align="start" className="w-56">
                                <DropdownLabel>{labels.filter_categories ?? 'Filter categories'}</DropdownLabel>
                                <DropdownSeparator />
                                <DropdownCheckboxItem checked={showTotal} onCheckedChange={onTotalToggle}>{labels.total ?? 'Total'}</DropdownCheckboxItem>
                                <DropdownSeparator />
                                <div className="flex items-center justify-between px-2 py-1.5">
                                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onSelectAll}>{labels.select_all ?? 'All'}</Button>
                                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onClearAll}>{labels.clear ?? 'Clear'}</Button>
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
                            </DropdownShell>
                        </Dropdown>
                    </div>
                </div>

                {/* Chart */}
                <div className="flex-1 p-6 md:p-8 lg:p-10 min-h-0">
                    <div className="w-full h-full">
                        {isLoading ? (
                            <div className="flex justify-center items-center h-full text-neutral-500 dark:text-neutral-400 text-sm">{loadingText}</div>
                        ) : displayMode === "area" ? (
                            <AreaChartComponent data={periodData} config={chartConfig} chartKeys={chartKeys} periodType={periodType} locale={locale} />
                        ) : displayMode === "bar" ? (
                            <BarChartComponent data={periodData} config={chartConfig} chartKeys={chartKeys} periodType={periodType} locale={locale} />
                        ) : (
                            <PieChartComponent pieData={pieData} config={chartConfig} hoverIndex={hoverIndex} setHoverIndex={setHoverIndex} categoryKey={metricType} setCategoryKey={() => {}} locale={locale} isSelected />
                        )}
                    </div>
                </div>

                <div className="flex justify-center py-3 border-t bg-black/5 dark:bg-white/5/30 text-xs text-neutral-500 dark:text-neutral-400">{labels.press_esc_to_close ?? "Press ESC or click × to close"}</div>
            </div>
        </div>
    )
})

// Default export for lazy loading
export default ExpandedChartView
