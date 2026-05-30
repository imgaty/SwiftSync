//
//  chart-constants.ts
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Provides shared chart constants logic for Argent, centralizing domain behavior, helpers,
//  or integration code used by pages, routes, and components.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
import {
    AreaChart as AreaIcon,
    ChartColumn as BarIcon,
    PieChart as PieIcon,
    type LucideIcon,
} from "lucide-react"

// ==============================================================================
// CHART CONSTANTS
// ==============================================================================

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
