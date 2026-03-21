import { AGGREGATION_KEYS, DATE_FORMAT_OPTIONS, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from './chart-constants'
import type { DailyData, MetricType } from './chart-types'

// ==============================================================================
// CHART UTILITY FUNCTIONS
// ==============================================================================

export const generateChartId = () => Math.random().toString(36).substring(2, 9)

export const formatDate = (date: Date, locale: string, options?: Intl.DateTimeFormatOptions) => 
    date.toLocaleDateString(locale, options)

export function capitalizeUtil(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1)
}

function getOrdinalSuffix(n: number): string {
    const s = ['th', 'st', 'nd', 'rd']
    const v = n % 100
    return s[(v - 20) % 10] || s[v] || s[0]
}

export function formatDateWithOrdinalUtil(date: Date, loc: string): string {
    const day = date.getDate()
    const month = capitalizeUtil(date.toLocaleDateString(loc, { month: 'long' }))
    return `${month} ${day}${getOrdinalSuffix(day)}`
}

export const formatPeriodLabel = (periodType: string, offsetDate: Date, locale: string, allTimeLabel: string): string => {
    if (periodType === 'all') return allTimeLabel
    const opts = DATE_FORMAT_OPTIONS[periodType as keyof typeof DATE_FORMAT_OPTIONS]
    return opts ? formatDate(offsetDate, locale, opts) : ''
}

export const getCategoryOptions = (metricType: MetricType) => 
    metricType === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

// Returns the CSS variable for a chart color - always uses var(--color-{key})
export const getConfigColor = (_config: Record<string, { color?: string }>, key: string): string => 
    `var(--color-${key})`

export const createEmptyDailyData = (date: string): DailyData => 
    ({ date, ...Object.fromEntries(AGGREGATION_KEYS.map(k => [k, 0])) }) as DailyData

export const toMonth = (d: Date) => d.toISOString().slice(0, 7)
export const toYear = (d: Date) => d.getFullYear().toString()

export const aggregateData = (data: DailyData[], grouper: (d: Date) => string): DailyData[] => {
    const aggregated = data.reduce((acc, curr) => {
        const key = grouper(new Date(curr.date))
        if (!acc[key]) acc[key] = createEmptyDailyData(key)
        const target = acc[key]
        for (const k of AGGREGATION_KEYS) {
            target[k] += curr[k] as number
        }
        return acc
    }, {} as Record<string, DailyData>)
    return Object.values(aggregated)
}

export const getFilteredPeriodData = (chartData: DailyData[], periodType: string, offsetDate: Date): DailyData[] => {
    if (!chartData.length) return []
    
    const targetMonth = toMonth(offsetDate)
    const targetYear = toYear(offsetDate)
    const targetDay = offsetDate.toDateString()

    const filtered = chartData.filter(item => {
        const d = new Date(item.date)
        if (isNaN(d.getTime())) return false
        if (periodType === "today") return d.toDateString() === targetDay
        if (periodType === "month") return toMonth(d) === targetMonth
        if (periodType === "year") return toYear(d) === targetYear
        return true
    })

    if (periodType === "all") return aggregateData(filtered, toYear)
    if (periodType === "year") return aggregateData(filtered, toMonth)
    return filtered
}

// Filter data by custom date range
export const getFilteredCustomRangeData = (chartData: DailyData[], startDate: string, endDate: string): DailyData[] => {
    if (!chartData.length) return []
    
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    // Set times to start and end of day for inclusive range
    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)
    
    const filtered = chartData.filter(item => {
        const d = new Date(item.date)
        if (isNaN(d.getTime())) return false
        return d >= start && d <= end
    })

    // Determine aggregation based on range length
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysDiff > 365 * 2) {
        // More than 2 years: aggregate by year
        return aggregateData(filtered, toYear)
    } else if (daysDiff > 60) {
        // More than 60 days: aggregate by month  
        return aggregateData(filtered, toMonth)
    }
    // Otherwise return daily data
    return filtered
}

export const getOffsetDate = (periodType: string, timeOffset: number): Date => {
    const date = new Date()
    if (periodType === 'today') date.setDate(date.getDate() + timeOffset)
    else if (periodType === 'month') date.setMonth(date.getMonth() + timeOffset)
    else if (periodType === 'year') date.setFullYear(date.getFullYear() + timeOffset)
    return date
}
