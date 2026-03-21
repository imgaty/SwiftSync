import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, DISPLAY_MODES, METRIC_TYPES, AGGREGATION_KEYS } from './chart-constants'

// ==============================================================================
// CHART TYPES
// ==============================================================================

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

import type { ChartConfig } from '@/components/ui/chart'

export interface ChartContextValue {
    chartConfig: ChartConfig
    labels: Record<string, string>
    locale: string
}
