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
        accounts?: string
        activity_pulse?: string
        bill_exposure?: string
        budget_pressure?: string
        budget_use?: string
        cash_position?: string
        due_next_30?: string
        due_soon?: string
        export?: string
        focus?: string
        import?: string
        good_morning?: string
        good_afternoon?: string
        good_evening?: string
        healthy?: string
        highest_pressure?: string
        left?: string
        needs_review?: string
        net_flow?: string
        no_bills_due?: string
        no_budget_pressure?: string
        no_focus?: string
        no_outflow?: string
        no_transactions?: string
        other?: string
        over?: string
        priority_brief?: string
        recent_activity?: string
        selected?: string
        this_month?: string
        today?: string
        tomorrow?: string
        top_outflow?: string
        transactions?: string
        uncategorized?: string
        upcoming_bills?: string
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
    noOutflow: string
    other: string
    priorityBrief: string
    reset: string
    rightColumn: string
    thisMonth: string
    today: string
    tomorrow: string
    inDays: string
    next30: string
    accounts: string
    stack: string
    split: string
    transactions: string
    selected: string
    uncategorized: string
}

export type CompactCurrencyFormatter = (amount: number) => string
