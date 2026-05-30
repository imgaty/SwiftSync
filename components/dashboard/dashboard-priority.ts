//
//  dashboard-priority.ts
//  Argent
//
//  Created by hilario on 25 May 2026 at 18:42.
//  Description: Implements the Dashboard priority dashboard module for Argent, shaping financial summary
//  content, supporting states, and interactions used by the dashboard experience.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import { Activity, CalendarClock, Gauge, TrendingUp } from "lucide-react"

import type {
    BudgetPressure,
    CompactCurrencyFormatter,
    DashboardLabels,
    DashboardPriorityItem,
    DashboardPriorityTone,
    MonthlySnapshot,
    UpcomingBill,
} from "@/components/dashboard/types"

interface BuildDashboardPriorityItemsInput {
    budgetPressure: BudgetPressure[]
    dashboardLabels: DashboardLabels
    formatCompactCurrency: CompactCurrencyFormatter
    monthlySnapshot: MonthlySnapshot
    upcomingBills: UpcomingBill[]
}

function formatSignedCurrency(amount: number, formatCompactCurrency: CompactCurrencyFormatter) {
    if (amount > 0) return `+${formatCompactCurrency(Math.abs(amount))}`
    if (amount < 0) return `-${formatCompactCurrency(Math.abs(amount))}`
    return formatCompactCurrency(0)
}

function getBudgetTone(percentUsed: number | null): DashboardPriorityTone {
    if (percentUsed === null) return "positive"
    if (percentUsed >= 100) return "negative"
    if (percentUsed >= 80) return "warning"
    return "neutral"
}

function formatBillCount(count: number, labels: DashboardLabels) {
    if (count <= 0) return labels.noBillsDue
    return `${count} ${labels.dueNext30}`
}

export function buildDashboardPriorityItems({
    budgetPressure,
    dashboardLabels,
    formatCompactCurrency,
    monthlySnapshot,
    upcomingBills,
}: BuildDashboardPriorityItemsInput): DashboardPriorityItem[] {
    const topBudget = budgetPressure[0] ?? null
    const budgetName = topBudget?.category || topBudget?.tag || dashboardLabels.budgetPressure
    const budgetRemainder = topBudget
        ? `${formatCompactCurrency(Math.abs(topBudget.remainingAmount))} ${topBudget.remainingAmount < 0 ? dashboardLabels.over : dashboardLabels.left}`
        : dashboardLabels.noBudgetPressure
    const billsDueCount = upcomingBills.filter((bill) => bill.daysUntilDue <= 30).length

    return [
        {
            id: "cash-flow",
            label: dashboardLabels.cashPosition,
            value: formatSignedCurrency(monthlySnapshot.net, formatCompactCurrency),
            detail: dashboardLabels.thisMonth,
            tone: monthlySnapshot.net > 0 ? "positive" : monthlySnapshot.net < 0 ? "negative" : "neutral",
            href: "/Calendar",
            icon: TrendingUp,
        },
        {
            id: "budget-pressure",
            label: dashboardLabels.highestPressure,
            value: topBudget ? `${topBudget.percentUsed}%` : dashboardLabels.healthy,
            detail: topBudget ? `${budgetName} - ${budgetRemainder}` : dashboardLabels.noBudgetPressure,
            tone: getBudgetTone(topBudget?.percentUsed ?? null),
            href: "/Budgets",
            icon: Gauge,
        },
        {
            id: "bill-exposure",
            label: dashboardLabels.billExposure,
            value: formatCompactCurrency(monthlySnapshot.upcomingTotal),
            detail: formatBillCount(billsDueCount, dashboardLabels),
            tone: monthlySnapshot.upcomingTotal > 0 ? "warning" : "positive",
            href: "/Bills",
            icon: CalendarClock,
        },
        {
            id: "activity",
            label: dashboardLabels.activityPulse,
            value: String(monthlySnapshot.transactionCount),
            detail: `${dashboardLabels.transactions} ${dashboardLabels.thisMonth}`,
            tone: monthlySnapshot.transactionCount > 0 ? "accent" : "neutral",
            href: "/Transactions",
            icon: Activity,
        },
    ]
}
