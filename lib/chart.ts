//
//  chart.ts
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Provides shared chart constants, types, and utility functions for Argent.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
import {
    AreaChart as AreaIcon,
    ChartColumn as BarIcon,
    PieChart as PieIcon,
    type LucideIcon,
} from "lucide-react"
import type { ChartConfig } from "@/components/ui/chart"

export const DATA_FILE = 'data.json'
export const MAX_CHARTS = 4
export const BORDER_TIMEOUT = 3000
export const HOVER_DELAY = 400

export const EXPENSE_CATEGORIES = ['food', 'transport', 'housing', 'utilities', 'subscriptions', 'entertainment', 'shopping', 'health', 'insurance', 'services', 'other'] as const

export const INCOME_CATEGORIES = ['salary', 'freelance', 'investment', 'other'] as const

export const DISPLAY_MODES = ['area', 'bar', 'pie'] as const

export const METRIC_TYPES = ['income', 'expenses'] as const

export const AGGREGATION_KEYS = ['income', 'expenses', 'salary', 'freelance', 'investment', 'food', 'transport', 'housing', 'utilities', 'subscriptions', 'entertainment', 'shopping', 'health', 'insurance', 'services', 'other'] as const

export const DISPLAY_MODE_ICONS: Record<typeof DISPLAY_MODES[number], LucideIcon> = {
    area: AreaIcon,
    bar: BarIcon,
    pie: PieIcon
}

export const DATE_FORMAT_OPTIONS = {
    SHORT: { day: 'numeric', month: 'short', year: 'numeric' } as const,
    SHORT_NO_YEAR: { day: 'numeric', month: 'short' } as const,
    MONTH_YEAR: { month: 'short', year: 'numeric' } as const,
    YEAR_ONLY: { year: 'numeric' } as const,
    MONTH_LONG: { month: 'long' } as const,
    DAY_ORDINAL: { day: 'numeric', month: 'long' } as const,
    WEEKDAY_SHORT: { weekday: 'short' } as const,
    // Legacy keys for backwards compatibility
    today: { day: 'numeric', month: 'long', year: 'numeric' } as const,
    month: { month: 'long', year: 'numeric' } as const,
    year: { year: 'numeric' } as const
}

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number]
export type IncomeCategory = typeof INCOME_CATEGORIES[number]
export type DisplayMode = typeof DISPLAY_MODES[number]
export type MetricType = typeof METRIC_TYPES[number]

export interface Transaction {
    id: string
    date: string
    type: 'in' | 'out'
    amount: number
    tags: string[]
    description: string
    accountId: string
}

export interface DataFile {
    meta: {
        generatedAt: string
        currency: string
        locale: string
        dateRange: { start: string; end: string }
        totalTransactions: number
    }
    accounts: unknown[]
    transactions: Transaction[]
}

export type DailyData = { date: string; [key: string]: string | number } & Record<typeof AGGREGATION_KEYS[number], number>

export interface CustomDateRange {
    startDate: string | null  // ISO date string
    endDate: string | null    // ISO date string
}

export interface ChartInstance {
    id: string
    metricType: MetricType
    displayMode: DisplayMode
    selectedCategories: string[]
    showTotal: boolean
    periodType: string
    timeOffset: number
    customDateRange?: CustomDateRange
}

export interface ChartContextValue {
    chartConfig: ChartConfig
    labels: Record<string, string>
    locale: string
    currency: string
}

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
