//
//  types.ts
//  Argent
//
//  Created by hilario on 22 May 2026 at 21:30.
//  Description: Implements the Types dashboard module for Argent, shaping financial summary content,
//  supporting states, and interactions used by the dashboard experience.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
import type * as React from "react"
import type { Bill, Budget } from "@/lib/types"

export interface DashboardTranslations {
    dashboard?: {
        export?: string
        good_morning?: string
        good_afternoon?: string
        good_evening?: string
    }
}

export interface ProfileResponse {
    name?: string
    initials?: string
}

export interface DashboardUserProfile {
    name: string
    initials: string
}

export type DashboardIcon = React.ComponentType<{ className?: string }>

export type DashboardPriorityItemId =
    | "cash-flow"
    | "budget-pressure"
    | "bill-exposure"
    | "activity"

export type DashboardPriorityTone = "positive" | "negative" | "warning" | "accent" | "neutral"

export interface DashboardPriorityItem {
    id: DashboardPriorityItemId
    label: string
    value: string
    detail: string
    tone: DashboardPriorityTone
    href: string
    icon: DashboardIcon
}

export interface UpcomingBill extends Bill {
    dueDate: Date
    daysUntilDue: number
}

export interface BudgetPressure extends Budget {
    limitValue: number
    percentUsed: number
    remainingAmount: number
}

export interface MonthlySnapshot {
    income: number
    expenses: number
    net: number
    transactionCount: number
    topOutflowLabel: string
    topOutflowAmount: number
    upcomingTotal: number
    highestBudgetUse: number
}

export interface DashboardLabels {
    activityPulse: string
    analytics: string
    billExposure: string
    overview: string
    cashFlow: string
    cashPosition: string
    done: string
    dropCardHere: string
    dropHere: string
    dueNext30: string
    netFlow: string
    topOutflow: string
    dueSoon: string
    budgetUse: string
    recentActivity: string
    focus: string
    budgetPressure: string
    upcomingBills: string
    healthy: string
    highestPressure: string
    layout: string
    left: string
    leftColumn: string
    movesHere: string
    needsReview: string
    noBillsDue: string
    noBudgetPressure: string
    over: string
    noTransactions: string
    noFocus: string
    priorityBrief: string
    reset: string
    rightColumn: string
    thisMonth: string
    next30: string
    accounts: string
    stack: string
    split: string
    transactions: string
    selected: string
}

export type CompactCurrencyFormatter = (amount: number) => string
