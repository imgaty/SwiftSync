//
//  dashboard-analytics-panel.tsx
//  Argent
//
//  Created by hilario on 22 May 2026 at 21:32.
//  Description: Implements the Dashboard analytics panel dashboard module for Argent, shaping financial
//  summary content, supporting states, and interactions used by the dashboard experience.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import Link from "next/link"
import * as React from "react"
import {
    ArrowDownRight,
    ArrowUpRight,
    BarChart3,
    CalendarClock,
    Gauge,
    TrendingUp,
} from "lucide-react"

import { CashFlowCard } from "@/components/cash-flow-card"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import {
    DASHBOARD_ACTION_BUTTON_CLASS,
    DashboardSurface,
} from "@/components/dashboard/dashboard-primitives"
import { Button } from "@/components/ui/button"
import { TabSwitcher, TabSwitcherItem } from "@/components/ui/tab-switcher"
import { UDS } from "@/lib/UDS"
import { cn } from "@/lib/utils"
import type {
    CompactCurrencyFormatter,
    DashboardIcon,
    DashboardLabels,
    MonthlySnapshot,
} from "@/components/dashboard/types"
import type { Transaction } from "@/lib/types"

type AnalyticsInsightTone = "neutral" | "positive" | "negative" | "warning" | "accent"

interface AnalyticsInsight {
    detail: string
    id: string
    icon: DashboardIcon
    label: string
    priority: number
    tone: AnalyticsInsightTone
    value: string
}

const ANALYTICS_CARD_RADIUS_CLASS = "sq-10"
const ANALYTICS_CARD_PADDING_CLASS = "px-3 py-2.5"
const ANALYTICS_ACTION_BUTTON_CLASS = cn(DASHBOARD_ACTION_BUTTON_CLASS, "hover:scale-100 active:scale-100")
const ANALYTICS_ACTION_ICON_CLASS = "size-3.5"
const ANALYTICS_SECTION_GAP_CLASS = "gap-3"
const ANALYTICS_TOGGLE_CLASS = "h-8 min-h-8 gap-0.5 p-0.5"
const ANALYTICS_TOGGLE_ITEM_CLASS = "h-7 min-w-8 px-2.5 text-xs leading-none sm:min-w-[7rem] sm:px-3"

const ANALYTICS_METRIC_TONE_STYLES: Record<AnalyticsInsightTone, { icon: string }> = {
    negative: {
        icon: "text-red-500 dark:text-red-400",
    },
    warning: {
        icon: "text-amber-500 dark:text-amber-400",
    },
    positive: {
        icon: "text-emerald-500 dark:text-emerald-400",
    },
    accent: {
        icon: "text-sky-500 dark:text-sky-400",
    },
    neutral: {
        icon: "text-muted-foreground",
    },
}

function getNetFlowTone(net: number): AnalyticsInsightTone {
    if (net > 0) return "positive"
    if (net < 0) return "negative"
    return "neutral"
}

function getNetFlowPriority(net: number) {
    if (net < 0) return 10
    if (net > 0) return 50
    return 60
}

function getTopOutflowTone(amount: number): AnalyticsInsightTone {
    if (amount > 0) return "accent"
    return "neutral"
}

function getTopOutflowPriority(amount: number) {
    if (amount > 0) return 40
    return 80
}

function getDueSoonTone(amount: number): AnalyticsInsightTone {
    if (amount > 0) return "warning"
    return "positive"
}

function getDueSoonPriority(amount: number) {
    if (amount > 0) return 20
    return 70
}

function getBudgetUseTone(percentUsed: number): AnalyticsInsightTone {
    if (percentUsed >= 100) return "negative"
    if (percentUsed >= 80) return "warning"
    if (percentUsed >= 65) return "accent"
    if (percentUsed > 0) return "positive"
    return "neutral"
}

function getBudgetUsePriority(percentUsed: number) {
    if (percentUsed >= 100) return 0
    if (percentUsed >= 80) return 30
    if (percentUsed >= 65) return 45
    if (percentUsed > 0) return 65
    return 75
}

function getPrioritizedAnalyticsInsights(insights: AnalyticsInsight[]) {
    return [...insights].sort((a, b) => a.priority - b.priority)
}

function AnalyticsInsightStrip({
    ariaLabel,
    insights,
}: {
    ariaLabel: string
    insights: AnalyticsInsight[]
}) {
    const leadInsight = insights[0]

    return (
        <div
            role="list"
            aria-label={ariaLabel}
            data-priority-item={leadInsight?.id}
            data-priority-tone={leadInsight?.tone}
            className={cn(
                "grid shrink-0 grid-cols-4 gap-2.5 overflow-hidden",
            )}
        >
            {insights.map((insight) => {
                const Icon = insight.icon
                const toneStyles = ANALYTICS_METRIC_TONE_STYLES[insight.tone]
                const isLead = insight.id === leadInsight?.id

                return (
                    <div
                        key={insight.id}
                        role="listitem"
                        className={cn(
                            "relative min-w-0 overflow-hidden",
                            UDS.cardSurface,
                            ANALYTICS_CARD_RADIUS_CLASS,
                            ANALYTICS_CARD_PADDING_CLASS,
                            UDS.cardFlatShadow,
                            "transition-colors duration-150",
                            UDS.cardHover,
                            isLead && UDS.cardSelected,
                        )}
                        data-analytics-insight={insight.id}
                        data-lead={isLead ? "true" : undefined}
                    >
                        <div className="flex min-w-0 items-center gap-2">
                            <Icon className={cn("size-4 shrink-0", toneStyles.icon)} />
                            <span className="min-w-0 truncate text-xs font-semibold text-foreground-secondary">
                                {insight.label}
                            </span>
                        </div>
                        <div className="mt-2 grid min-w-0 gap-1">
                            <span className="min-w-0 truncate text-base font-semibold leading-none tabular-nums text-foreground">
                                {insight.value}
                            </span>
                            <span className="min-w-0 truncate text-xs font-medium text-muted-foreground">
                                {insight.detail}
                            </span>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

export function DashboardAnalyticsPanel({
    dashboardLabels,
    formatCompactCurrency,
    monthlySnapshot,
    selectedAccountIds,
    transactions,
}: {
    dashboardLabels: DashboardLabels
    formatCompactCurrency: CompactCurrencyFormatter
    monthlySnapshot: MonthlySnapshot
    selectedAccountIds: string[]
    transactions: Transaction[] | null
}) {
    const [showCashFlow, setShowCashFlow] = React.useState(false)

    const analyticsInsights = React.useMemo<AnalyticsInsight[]>(() => getPrioritizedAnalyticsInsights([
        {
            id: "net-flow",
            icon: TrendingUp,
            label: dashboardLabels.netFlow,
            value: `${monthlySnapshot.net >= 0 ? "+" : ""}${formatCompactCurrency(monthlySnapshot.net)}`,
            detail: dashboardLabels.thisMonth,
            priority: getNetFlowPriority(monthlySnapshot.net),
            tone: getNetFlowTone(monthlySnapshot.net),
        },
        {
            id: "top-outflow",
            icon: ArrowDownRight,
            label: dashboardLabels.topOutflow,
            value: monthlySnapshot.topOutflowLabel,
            detail: monthlySnapshot.topOutflowAmount > 0 ? formatCompactCurrency(monthlySnapshot.topOutflowAmount) : dashboardLabels.thisMonth,
            priority: getTopOutflowPriority(monthlySnapshot.topOutflowAmount),
            tone: getTopOutflowTone(monthlySnapshot.topOutflowAmount),
        },
        {
            id: "due-soon",
            icon: CalendarClock,
            label: dashboardLabels.dueSoon,
            value: formatCompactCurrency(monthlySnapshot.upcomingTotal),
            detail: monthlySnapshot.upcomingTotal > 0 ? dashboardLabels.next30 : dashboardLabels.noBillsDue,
            priority: getDueSoonPriority(monthlySnapshot.upcomingTotal),
            tone: getDueSoonTone(monthlySnapshot.upcomingTotal),
        },
        {
            id: "budget-use",
            icon: Gauge,
            label: dashboardLabels.budgetUse,
            value: monthlySnapshot.highestBudgetUse > 0 ? `${monthlySnapshot.highestBudgetUse}%` : dashboardLabels.healthy,
            detail: monthlySnapshot.highestBudgetUse > 0 ? dashboardLabels.budgetPressure : dashboardLabels.noBudgetPressure,
            priority: getBudgetUsePriority(monthlySnapshot.highestBudgetUse),
            tone: getBudgetUseTone(monthlySnapshot.highestBudgetUse),
        },
    ]), [dashboardLabels, formatCompactCurrency, monthlySnapshot])

    return (
        <DashboardSurface
            title={dashboardLabels.analytics}
            icon={BarChart3}
            className="min-h-0 gap-0"
            tools={
                <div className="flex items-center gap-1.5">
                    <TabSwitcher ariaLabel={dashboardLabels.analytics} className={ANALYTICS_TOGGLE_CLASS}>
                        <TabSwitcherItem
                            isActive={!showCashFlow}
                            aria-label={dashboardLabels.overview}
                            onClick={() => setShowCashFlow(false)}
                            className={ANALYTICS_TOGGLE_ITEM_CLASS}
                        >
                            <BarChart3 className="size-3.5" />
                            <span className="hidden sm:inline">{dashboardLabels.overview}</span>
                        </TabSwitcherItem>
                        <TabSwitcherItem
                            isActive={showCashFlow}
                            aria-label={dashboardLabels.cashFlow}
                            onClick={() => setShowCashFlow(true)}
                            className={ANALYTICS_TOGGLE_ITEM_CLASS}
                        >
                            <TrendingUp className="size-3.5" />
                            <span className="hidden sm:inline">{dashboardLabels.cashFlow}</span>
                        </TabSwitcherItem>
                    </TabSwitcher>
                    <Button asChild variant="glass" size="icon-sm" className={ANALYTICS_ACTION_BUTTON_CLASS}>
                        <Link href="/Calendar" aria-label={dashboardLabels.analytics}>
                            <ArrowUpRight className={ANALYTICS_ACTION_ICON_CLASS} />
                        </Link>
                    </Button>
                </div>
            }
        >
            <div className={cn("flex h-full min-h-0 min-w-0 flex-col overflow-hidden", ANALYTICS_SECTION_GAP_CLASS)}>
                <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
                    {!showCashFlow ? (
                        <ChartAreaInteractive accountIds={selectedAccountIds} compact transactions={transactions} />
                    ) : (
                        <div className="h-full min-h-0 overflow-hidden">
                            <CashFlowCard accountIds={selectedAccountIds} compact />
                        </div>
                    )}
                </div>
                <div aria-hidden className={cn(UDS.separator, "my-0")} />
                <AnalyticsInsightStrip
                    ariaLabel={`${dashboardLabels.analytics} ${dashboardLabels.overview}`}
                    insights={analyticsInsights}
                />
            </div>
        </DashboardSurface>
    )
}
