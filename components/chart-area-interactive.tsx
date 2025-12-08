"use client"

import * as React from "react"
import {
    AreaChart as AreaIcon,
    ChartColumn as BarIcon,
    PieChart as PieIcon,
    List as ListIcon,
    ArrowLeft,
    ArrowRight
} from "lucide-react"

import { useIsMobile } from "@/hooks/use-mobile"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
    ChartConfig,
    AreaChartComponent,
    BarChartComponent,
    PieChartComponent,
    ListChartComponent
} from "@/components/ui/chart"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

import { useLanguage } from "@/components/language-provider"
import { ErrorState, AppErrors } from "@/components/error-state"
import { Skeleton } from "@/components/ui/skeleton"

// ==============================================================================
// 1. CONFIG & TYPES
// ==============================================================================

const DATA_FILE = 'data.json'

interface DailyData {
    date: string
    date_pt: string
    date_en: string
    billed: number
    received: number
    predicted: number
    taxes: number
    others: number
    [key: string]: string | number
}

// ==============================================================================
// 2. HELPER FUNCTIONS
// ==============================================================================

const formatDate = (date: Date, locale: string, options?: Intl.DateTimeFormatOptions) => {
    return date.toLocaleDateString(locale, options)
}

// ==============================================================================
// 3. CUSTOM HOOK
// ==============================================================================

function useChartData() {
    const [data, setData] = React.useState<DailyData[]>([])
    const [isLoading, setIsLoading] = React.useState(true)
    const [errorInfo, setErrorInfo] = React.useState<{ type: keyof typeof AppErrors, details?: string } | null>(null)
    const [minDate, setMinDate] = React.useState<Date | null>(null)

    React.useEffect(() => {
        async function load() {
            setIsLoading(true)
            setErrorInfo(null)

            try {
                const res = await fetch(`/${DATA_FILE}`)
                if (!res.ok) {
                    setErrorInfo({ type: 'FILE_NOT_FOUND', details: `${DATA_FILE} (${res.status} ${res.statusText})` })
                    return
                }
                
                const rawData: DailyData[] = await res.json()

                if (!rawData || rawData.length === 0) {
                    setErrorInfo({ type: 'EMPTY_DATA' })
                    return
                }
                
                // Process data once here
                const processed = rawData.map(item => {
                    let standardDate = item.date
                    if (item.date_pt) {
                        const [day, month, year] = item.date_pt.split('-')
                        standardDate = `${year}-${month}-${day}`
                    }

                    return {
                        ...item,
                        date: standardDate,
                        date_pt: item.date_pt || '',
                        date_en: item.date_en || '',
                        billed: Number(item.billed),
                        received: Number(item.received),
                        predicted: Number(item.predicted),
                        taxes: Number(item.taxes),
                        others: Number(item.others),
                    }
                })

                setData(processed)

                if (processed.length > 0) {
                    const timestamps = processed
                        .map(d => new Date(d.date).getTime())
                        .filter(t => !isNaN(t))
                    if (timestamps.length) setMinDate(new Date(Math.min(...timestamps)))
                }

            } catch (e) {
                console.error(e)
                setErrorInfo({ 
                    type: 'UNKNOWN', 
                    details: `${DATA_FILE}: ${e instanceof Error ? e.message : String(e)}` 
                })

            } finally {
                setIsLoading(false)
            }
        }
        load()
    }, [])

    return { data, isLoading, errorInfo, minDate }
}

// ==============================================================================
// 4. MAIN COMPONENT
// ==============================================================================

export function ChartAreaInteractive() {
    const isMobile = useIsMobile()
    const { t: Lang } = useLanguage()
    const { data: chartData, isLoading, errorInfo, minDate } = useChartData()

    const [periodType, setPeriodType] = React.useState("month")
    const [categoryKey, setCategoryKey] = React.useState<string>("billed")
    const [displayMode, setDisplayMode] = React.useState("area")
    const [timeOffset, setTimeOffset] = React.useState(0)
    const [hoverIndex, setHoverIndex] = React.useState<number | null>(null)

    // Define chartConfig inside component using Lang
    const chartConfig = React.useMemo(() => ({
        visitors: { label: Lang.data_type_labels.total },
        billed: { label: Lang.data_type_labels.billed, color: "#81C6FF" },
        received: { label: Lang.data_type_labels.received, color: "#0085FF" },
        predicted: { label: Lang.data_type_labels.predicted, color: "#FF4040" },
        taxes: { label: Lang.data_type_labels.taxes, color: "#FFB669" },
        others: { label: Lang.data_type_labels.others, color: "#FFDEA0" }
    } satisfies ChartConfig), [Lang])

    // Helper function inside component to access Lang and chartConfig
    const generateDescription = React.useCallback((
        periodType: string,
        offsetDate: Date,
        categoryKey: keyof typeof chartConfig,
        timeOffset: number,
        chartData: DailyData[]

    ) => {
        if (chartData.length === 0) return Lang.descriptions.no_data.label

        const categoryLabel = chartConfig[categoryKey]?.label || "Valor"
        const isCurrent = timeOffset === 0
        const locale = Lang.config.locale || 'pt-PT'
        
        if (periodType === "all") {
            const years = chartData.map(d => new Date(d.date).getFullYear()).filter(y => !isNaN(y))
            if (years.length === 0) return Lang.descriptions.no_data.label
            
            const minYear = Math.min(...years)
            const maxYear = Math.max(...years)
            const config = minYear === maxYear ? Lang.descriptions.all_single : Lang.descriptions.all_range
            
            let str = config.label.replace('%category', categoryLabel)
            str = str.replace('%date', formatDate(new Date(minYear, 0, 1), locale, config.format as Intl.DateTimeFormatOptions))
            
            if (minYear !== maxYear) {
                str = str.replace('%date', formatDate(new Date(maxYear, 0, 1), locale, config.format as Intl.DateTimeFormatOptions))
            }
            return str
        }

        const keyMap = {
            today: isCurrent ? "today_current" : "today_offset",
            month: isCurrent ? "month_current" : "month_offset",
            year: isCurrent ? "year_current" : "year_offset"
        }
        
        const configKey = keyMap[periodType as keyof typeof keyMap] as keyof typeof Lang.descriptions
        const config = Lang.descriptions[configKey] as { label: string, format?: any }
        
        return config.label
            .replace('%category', categoryLabel)
            .replace('%date', config.format ? formatDate(offsetDate, locale, config.format as Intl.DateTimeFormatOptions) : "")
    }, [Lang, chartConfig])

    // Reset state on changes
    React.useEffect(() => { if (isMobile) setPeriodType("month") }, [isMobile])
    React.useEffect(() => { setTimeOffset(0) }, [periodType])

    // Calculate current date view
    const offsetDate = React.useMemo(() => {
        const date = new Date()
        if (periodType === 'today') date.setDate(date.getDate() + timeOffset)
        else if (periodType === 'month') date.setMonth(date.getMonth() + timeOffset)
        else if (periodType === 'year') date.setFullYear(date.getFullYear() + timeOffset)
        return date
    }, [periodType, timeOffset])

    // Filter and Aggregate Data
    const periodData = React.useMemo(() => {
        if (!chartData.length) return []

        const toMonth = (d: Date) => d.toISOString().slice(0, 7)
        const toYear = (d: Date) => d.getFullYear().toString()
        const targetMonth = toMonth(offsetDate)
        const targetYear = toYear(offsetDate)
        const targetDay = offsetDate.toDateString()

        const filtered = chartData.filter(item => {
            const d = new Date(item.date)
            if (isNaN(d.getTime())) return false
            if (periodType === "today") return d.toDateString() === targetDay
            if (periodType === "month") return toMonth(d) === targetMonth
            if (periodType === "year") return toYear(d) === targetYear
            return true // 'all'
        })

        if (periodType === "all" || periodType === "year") {
            // Aggregate by year (for 'all') or month (for 'year')
            const grouper = periodType === 'all' ? toYear : toMonth
            
            const aggregated = filtered.reduce((acc, curr) => {
                const key = grouper(new Date(curr.date))
                if (!acc[key]) {
                    acc[key] = { ...curr, date: key, billed: 0, received: 0, predicted: 0, taxes: 0, others: 0 }
                }
                acc[key].billed += curr.billed
                acc[key].received += curr.received
                acc[key].predicted += curr.predicted
                acc[key].taxes += curr.taxes
                acc[key].others += curr.others
                return acc
            }, {} as Record<string, DailyData>)
            
            return Object.values(aggregated)
        }

        return filtered
    }, [chartData, periodType, offsetDate])

    // Derived values
    const chartKeys = categoryKey === 'billed' ? ['billed', 'received'] : [categoryKey]
    
    const pieData = React.useMemo(() => {
        const totals = periodData.reduce((acc, c) => ({
            billed: acc.billed + c.billed,
            received: acc.received + c.received,
            predicted: acc.predicted + c.predicted,
            taxes: acc.taxes + c.taxes,
            others: acc.others + c.others,
        }), { billed: 0, received: 0, predicted: 0, taxes: 0, others: 0 })

        return Object.entries(totals).map(([key, value]) => ({
            name: key,
            value,
            fill: `var(--color-${key})`
        }))
    }, [periodData])

    const isBackDisabled = React.useMemo(() => {
        if (periodType === 'all' || !minDate) return false
        
        const prev = new Date(offsetDate)
        
        if (periodType === 'today') prev.setDate(prev.getDate() - 1)
        else if (periodType === 'month') prev.setMonth(prev.getMonth() - 1)
        else if (periodType === 'year') prev.setFullYear(prev.getFullYear() - 1)
        return prev < minDate
    }, [periodType, minDate, offsetDate])

    if (errorInfo) return <ErrorState type={errorInfo.type} details={errorInfo.details} fileName={DATA_FILE} className="h-[300px]" />

    return (
        <Card className = "@container/card gap-6">
            <CardHeader className = "gap-12">
                <div className = "flex justify-between items-start flex-row | w-full | order-first">

                    {/* Section Switcher */}
                    <div className = "flex flex-col gap-2">
                        {isLoading ? (
                            <Skeleton className = "h-10 w-88" />
                        ) : (
                            <>
                                <Select value = {categoryKey} onValueChange = {(v) => setCategoryKey(v)}>
                                    <SelectTrigger className = "flex @[767px]/card:hidden | cursor-pointer" size = "sm">
                                        <SelectValue placeholder = {chartConfig[categoryKey as keyof typeof chartConfig]?.label} />
                                    </SelectTrigger>

                                    <SelectContent className = "rounded-xl | cursor-pointer">
                                        {Object.entries(chartConfig).filter(([k]) => k !== 'visitors' && k !== 'received').map(([key, conf]) => (
                                            <SelectItem key = {key} value = {key}>{conf.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <ToggleGroup type = "single" value = {categoryKey} onValueChange = {(v) => v && setCategoryKey(v)} variant = "outline" className = "hidden @[767px]/card:flex">
                                    {Object.entries(chartConfig).filter(([k]) => k !== 'visitors' && k !== 'received').map(([key, conf]) => (
                                        <ToggleGroupItem key = {key} value = {key} className = "px-4! | cursor-pointer">{conf.label}</ToggleGroupItem>
                                    ))}
                                </ToggleGroup>
                            </>
                        )}
                    </div>

                    {/* Time Switcher */}
                    <div className = "flex items-center gap-4">
                        {isLoading ? (
                            <Skeleton className = "h-10 w-md" />
                        ) : (
                            <>
                                {periodType !== 'all' && (
                                    <button onClick={() => setTimeOffset(p => p - 1)} disabled={isBackDisabled} className = "p-1 | rounded-full hover:bg-muted | disabled:opacity-50 | disabled:cursor-not-allowed">
                                        <ArrowLeft className = "w-4 h-4 | text-muted-foreground" />
                                    </button>
                                )}

                                <Select value = {periodType} onValueChange = {setPeriodType}>
                                    <SelectTrigger className = "flex @[767px]/card:hidden | w-40 | cursor-pointer" size = "sm">
                                        <SelectValue />
                                    </SelectTrigger>

                                    <SelectContent className = "rounded-xl | cursor-pointer">
                                        {Object.entries(Lang.time_range).map(([key, label]) => (
                                            <SelectItem key = {key} value = {key}>{label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <ToggleGroup type = "single" value = {periodType} onValueChange = {(v) => v && setPeriodType(v)} variant = "outline" className = "hidden @[767px]/card:flex">
                                    {Object.entries(Lang.time_range).map(([key, label]) => (
                                        <ToggleGroupItem key = {key} value = {key} className = "px-4! | cursor-pointer">{label}</ToggleGroupItem>
                                    ))}
                                </ToggleGroup>

                                {periodType !== 'all' && (
                                    <button onClick = {() => setTimeOffset(p => p + 1)} disabled = {timeOffset === 0} className = "p-1 | rounded-full | hover:bg-muted | disabled:opacity-50 | disabled:cursor-not-allowed">
                                        <ArrowRight className = "w-4 h-4 | text-muted-foreground" />
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Stats Display */}
                <div className = "flex gap-10 w-full">
                    {isLoading ? (
                        <>
                            <div className="flex flex-col gap-2">
                                <Skeleton className = "h-9 w-32" />
                                <Skeleton className = "h-4 w-48" />
                            </div>
                            <div className="flex flex-col gap-2">
                                <Skeleton className = "h-9 w-32" />
                                <Skeleton className = "h-4 w-48" />
                            </div>
                        </>
                    ) : (
                        chartKeys.map((key) => {
                            const total = periodData.reduce((acc, curr) => acc + (curr[key as keyof DailyData] as number), 0)
                            const config = chartConfig[key as keyof typeof chartConfig]
                            const color = config && 'color' in config ? config.color : 'transparent'
                            
                            return (
                                <div key = {key} className = "flex flex-col gap-2">
                                    <span className = "text-3xl font-bold">
                                        {total.toLocaleString(Lang.config.locale || 'pt-PT', { style: 'currency', currency: 'EUR' })}
                                    </span>
                                    <div className = "flex items-center gap-2 | text-sm text-muted-foreground">
                                        <span className = "w-3 h-3 rounded-[2px]" style = {{ backgroundColor: color }} />
                                        <span>{generateDescription(periodType, offsetDate, key as keyof typeof chartConfig, timeOffset, chartData)}</span>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </CardHeader>

            <CardContent>
                <div className = "w-full h-[250px]">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-full text-muted-foreground">
                            {Lang.loading}
                        </div>
                    ) : (
                        <>
                            {displayMode === "area" && <AreaChartComponent data = {periodData} config = {chartConfig} chartKeys = {chartKeys} periodType = {periodType} locale = {Lang.config.locale || 'pt-PT'} />}
                            {displayMode === "bar" && <BarChartComponent data = {periodData} config = {chartConfig} chartKeys = {chartKeys} periodType = {periodType} locale = {Lang.config.locale || 'pt-PT'} />}
                            {displayMode === "pie" && <PieChartComponent pieData = {pieData} config = {chartConfig} hoverIndex = {hoverIndex} setHoverIndex = {setHoverIndex} categoryKey = {categoryKey} setCategoryKey = {(k) => setCategoryKey(k)} />}
                            {displayMode === "list" && <ListChartComponent data = {periodData} config = {chartConfig} chartKeys = {chartKeys} periodType = {periodType} locale = {Lang.config.locale || 'pt-PT'} />}
                        </>
                    )}
                </div>

                {/* Chart Switcher */}
                <div className = "flex justify-end | mt-4">
                    {isLoading ? (
                        <Skeleton className="h-8 w-32" />
                    ) : (
                        <>
                            <Select value = {displayMode} onValueChange = {setDisplayMode}>
                                <SelectTrigger className = "flex @[767px]/card:hidden | w-auto | cursor-pointer" size = "sm">
                                    <SelectValue placeholder = {<AreaIcon className = "w-4 h-4" />} />
                                </SelectTrigger>

                                <SelectContent className = "rounded-xl cursor-pointer">
                                    <SelectItem value = "area"><AreaIcon className = "w-4 h-4 | inline" />{Lang.chart_names.area}</SelectItem>
                                    <SelectItem value = "bar"><BarIcon className = "w-4 h-4 | inline" />{Lang.chart_names.bar}</SelectItem>
                                    <SelectItem value = "pie"><PieIcon className = "w-4 h-4 | inline" />{Lang.chart_names.pie}</SelectItem>
                                    <SelectItem value = "list"><ListIcon className = "w-4 h-4 | inline" />{Lang.chart_names.list}</SelectItem>
                                </SelectContent>
                            </Select>

                            <ToggleGroup type = "single" value = {displayMode} onValueChange = {(v) => v && setDisplayMode(v)} variant = "outline" className = "hidden @[767px]/card:flex">
                                <ToggleGroupItem value = "area"><AreaIcon className = "w-4 h-4" /></ToggleGroupItem>
                                <ToggleGroupItem value = "bar"><BarIcon className = "w-4 h-4" /></ToggleGroupItem>
                                <ToggleGroupItem value = "pie"><PieIcon className = "w-4 h-4" /></ToggleGroupItem>
                                <ToggleGroupItem value = "list"><ListIcon className = "w-4 h-4" /></ToggleGroupItem>
                            </ToggleGroup>
                        </>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
