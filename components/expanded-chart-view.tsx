//
//  expanded-chart-view.tsx
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Implements the Expanded chart view React component for Argent, encapsulating reusable
//  interface structure, state handling, and presentation logic for feature screens.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import * as React from "react"
import { X, ChevronLeft, ChevronRight, Filter, CalendarRange } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ChartConfig, AreaChartComponent, BarChartComponent, PieChartComponent } from "@/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dropdown, DropdownContent, DropdownTrigger, DropdownCheckboxItem, DropdownSeparator } from "@/components/ui/dropdown"
import { TabSwitcher, TabSwitcherIconButton, TabSwitcherItem } from "@/components/ui/tab-switcher"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"
import {
    DATE_FORMAT_OPTIONS,
    DISPLAY_MODE_ICONS,
    DISPLAY_MODES,
    getCategoryOptions,
    getConfigColor,
    getFilteredCustomRangeData,
    getFilteredPeriodData,
    getOffsetDate,
    METRIC_TYPES,
} from "@/lib/chart"
import type { ChartInstance, CustomDateRange, DailyData, DisplayMode, MetricType } from "@/lib/chart"
import { DatePicker } from "@/components/date-picker"
import { useCurrency } from "@/components/currency-provider"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { UDS } from "@/lib/UDS"
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
                <div className={cn("flex shrink-0 flex-col gap-4 border-b px-6 pb-4 pt-5", UDS.cardDivider)}>
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 flex-1 flex-col gap-2">
                            <span className="auto-scroll text-3xl font-semibold tracking-tight leading-none text-black dark:text-white tabular-nums">{formatCurrency(total, { locale })}</span>
                            <div className={cn("flex items-center gap-2 text-sm", UDS.muted)}>
                                <span className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 sq-full shrink-0" style={{ backgroundColor: metricColor }} />
                                    <span className="auto-scroll font-medium text-black/80 dark:text-white/80">{chartConfig[metricType]?.label}</span>
                                </span>
                                <span className="text-neutral-400/50 shrink-0">•</span>
                                <span className="auto-scroll">{filterLabel}</span>
                            </div>
                        </div>
                        <Button variant="ghost" type="button" onClick={onClose} className={cn(UDS.closeButton, "shrink-0")} aria-label={labels.close ?? "Close"}><X className="w-4 h-4" /></Button>
                    </div>

                    {/* Controls — matches the non-expanded chart toolbar style */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Metric segmented toggle */}
                        <TabSwitcher ariaLabel={labels.metric_type ?? "Metric type"} className="shrink-0">
                            {METRIC_TYPES.map(type => {
                                const typeLabel = chartConfig[type]?.label ?? type
                                const isActive = metricType === type
                                return (
                                    <Tooltip key={type}>
                                        <TooltipTrigger asChild>
                                            <TabSwitcherItem
                                                isActive={isActive}
                                                onClick={() => handleMetricChange(type)}
                                                className="px-4 text-sm"
                                            >
                                                {typeLabel}
                                            </TabSwitcherItem>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom"><p>{typeLabel}</p></TooltipContent>
                                    </Tooltip>
                                )
                            })}
                        </TabSwitcher>

                        {/* Filter dropdown */}
                        <TabSwitcher ariaLabel={labels.filter_categories ?? "Filter categories"} className="shrink-0">
                            <Dropdown>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <DropdownTrigger asChild>
                                            <TabSwitcherIconButton
                                                aria-label={labels.filter_categories ?? "Filter categories"}
                                                className="w-auto px-2"
                                            >
                                                <Filter className="w-4 h-4" />
                                                {!showTotal && selectedCategories.length > 0 && (
                                                    <span className="flex items-center justify-center w-4 h-4 bg-primary text-xs text-white dark:text-black sq-full">
                                                        {selectedCategories.length}
                                                    </span>
                                                )}
                                            </TabSwitcherIconButton>
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
                                                <span className="w-2 h-2 sq-full" style={{ backgroundColor: getConfigColor(chartConfig, cat) }} />
                                                {chartConfig[cat]?.label ?? cat}
                                            </span>
                                        </DropdownCheckboxItem>
                                    ))}
                                </DropdownContent>
                            </Dropdown>
                        </TabSwitcher>

                        <Separator orientation="vertical" className="h-6 hidden md:block" />

                        {/* Time range segmented toggle with prev/next chevrons */}
                        <TabSwitcher
                            ariaLabel={labels.time_range ?? "Time range"}
                            className={cn("shrink-0", customDateRange && "opacity-50")}
                        >
                            <TabSwitcherIconButton
                                onClick={handlePrev}
                                disabled={!canGoPrev || !!customDateRange}
                                aria-label={labels.previous ?? "Previous"}
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </TabSwitcherIconButton>
                            {/* Hide period buttons on small viewports, fall back to Select */}
                            <div className="hidden items-center gap-0.5 sm:flex">
                                {TIME_OPTIONS.map(opt => {
                                    const isActive = !customDateRange && periodType === opt.value
                                    const lbl = labels[opt.key] ?? opt.value
                                    return (
                                        <TabSwitcherItem
                                            key={opt.value}
                                            isActive={isActive}
                                            onClick={() => handlePeriodChange(opt.value)}
                                            disabled={!!customDateRange}
                                            className="px-3 text-sm"
                                        >
                                            {lbl}
                                        </TabSwitcherItem>
                                    )
                                })}
                            </div>
                            <div className="sm:hidden flex items-center min-w-0">
                                <Select value={customDateRange ? 'custom' : periodType} onValueChange={handlePeriodChange} disabled={!!customDateRange}>
                                    <SelectTrigger
                                        className={cn("min-w-[92px] sq-full border-transparent sq-border-muted bg-transparent px-2 text-xs font-semibold text-foreground-secondary hover:text-foreground focus:ring-0 data-[size=sm]:h-7", UDS.itemHover)}
                                        size="sm"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {TIME_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{labels[opt.key] ?? opt.value}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <TabSwitcherIconButton
                                onClick={handleNext}
                                disabled={!canGoNext || !!customDateRange}
                                aria-label={labels.next ?? "Next"}
                            >
                                <ChevronRight className="w-4 h-4" />
                            </TabSwitcherIconButton>
                        </TabSwitcher>

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
                                <TabSwitcher
                                    ariaLabel={labels.custom_date_range ?? "Custom date range"}
                                    className={cn("shrink-0", customDateRange && UDS.selectedControl)}
                                >
                                    <TabSwitcherIconButton
                                        isActive={!!customDateRange}
                                        aria-label={labels.custom_date_range ?? "Custom date range"}
                                        className={cn("w-auto px-2", customDateRange && "text-foreground")}
                                    >
                                        <CalendarRange className="w-4 h-4" />
                                        {customDateRange?.startDate && customDateRange?.endDate && (
                                            <span className="hidden sm:inline text-xs">
                                                {`${new Date(customDateRange.startDate).toLocaleDateString(locale, DATE_FORMAT_OPTIONS.SHORT)} - ${new Date(customDateRange.endDate).toLocaleDateString(locale, DATE_FORMAT_OPTIONS.SHORT)}`}
                                            </span>
                                        )}
                                    </TabSwitcherIconButton>
                                </TabSwitcher>
                            }
                        />

                        {/* Display mode segmented toggle */}
                        <TabSwitcher ariaLabel={labels.chart_type ?? "Chart style"} className="ml-auto shrink-0">
                            {DISPLAY_MODES.map(mode => {
                                const Icon = DISPLAY_MODE_ICONS[mode]
                                const isActive = displayMode === mode
                                return (
                                    <Tooltip key={mode}>
                                        <TooltipTrigger asChild>
                                            <TabSwitcherIconButton
                                                isActive={isActive}
                                                onClick={() => handleDisplayChange(mode)}
                                                aria-label={labels[mode] ?? mode}
                                            >
                                                <Icon className="w-4 h-4" />
                                            </TabSwitcherIconButton>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom"><p>{labels[mode] ?? mode}</p></TooltipContent>
                                    </Tooltip>
                                )
                            })}
                        </TabSwitcher>
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

                <div className={cn("flex justify-center border-t py-2.5 text-xs", UDS.cardDivider, UDS.muted)}>{labels.press_esc_to_close ?? "Press ESC or click × to close"}</div>
            </DialogContent>
        </Dialog>
    )
})

// Default export for lazy loading
export default ExpandedChartView
