//
//  dashboard-priority.test.mjs
//  Argent
//
//  Created by hilario on 25 May 2026 at 18:42.
//  Description: Covers dashboard priority behavior in Argent, asserting dashboard expectations that
//  protect the overview experience from regressions.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
import assert from "node:assert/strict"

import { buildDashboardPriorityItems } from "./dashboard-priority.ts"

const labels = {
    accounts: "accounts",
    activityPulse: "Activity pulse",
    analytics: "Analytics",
    billExposure: "Bill exposure",
    budgetPressure: "Budgets",
    budgetUse: "Pressure",
    cashFlow: "Cash Flow",
    cashPosition: "Cash position",
    done: "Done",
    dropCardHere: "Drop a card here",
    dropHere: "Drop here",
    dueNext30: "due next 30d",
    dueSoon: "Due soon",
    focus: "Financial focus",
    healthy: "Healthy",
    highestPressure: "highest pressure",
    layout: "Layout",
    left: "left",
    leftColumn: "Left",
    movesHere: "Moves here",
    needsReview: "Needs review",
    netFlow: "Net flow",
    noBillsDue: "No bills due next 30d",
    noBudgetPressure: "No budget pressure",
    noFocus: "No budgets or bills in this scope.",
    noTransactions: "No transactions in this scope.",
    over: "over",
    overview: "Overview",
    priorityBrief: "Priority brief",
    recentActivity: "Recent activity",
    reset: "Reset",
    rightColumn: "Right",
    selected: "selected",
    split: "Split",
    stack: "Stack",
    thisMonth: "this month",
    topOutflow: "Top outflow",
    transactions: "transactions",
    upcomingBills: "Bills",
}

const monthlySnapshot = {
    expenses: 680,
    highestBudgetUse: 92,
    income: 800,
    net: 120,
    topOutflowAmount: 340,
    topOutflowLabel: "Food",
    transactionCount: 8,
    upcomingTotal: 210,
}

const budgetPressure = [
    {
        budgetAmount: 500,
        category: "Food",
        color: "#f59e0b",
        limit: 500,
        limitValue: 500,
        percentUsed: 92,
        remainingAmount: 40,
        spentAmount: 460,
        tag: "food",
    },
]

const upcomingBills = [
    {
        accountId: "checking",
        amount: 120,
        category: "Utilities",
        daysUntilDue: 4,
        dueDate: new Date("2026-05-29T00:00:00"),
        dueDay: 29,
        frequency: "monthly",
        id: "bill-1",
        name: "Electricity",
        tags: ["utilities"],
    },
    {
        accountId: "checking",
        amount: 90,
        category: "Subscriptions",
        daysUntilDue: 12,
        dueDate: new Date("2026-06-06T00:00:00"),
        dueDay: 6,
        frequency: "monthly",
        id: "bill-2",
        name: "Internet",
        tags: ["subscriptions"],
    },
]

const items = buildDashboardPriorityItems({
    budgetPressure,
    dashboardLabels: labels,
    formatCompactCurrency: (amount) => `€${Math.abs(amount)}`,
    monthlySnapshot,
    upcomingBills,
})

assert.equal(items.length, 4)
assert.deepEqual(items.map((item) => item.id), ["cash-flow", "budget-pressure", "bill-exposure", "activity"])
assert.equal(items[0].value, "+€120")
assert.equal(items[0].tone, "positive")
assert.equal(items[1].value, "92%")
assert.equal(items[1].detail, "Food - €40 left")
assert.equal(items[1].tone, "warning")
assert.equal(items[2].value, "€210")
assert.equal(items[2].detail, "2 due next 30d")
assert.equal(items[2].tone, "warning")
assert.equal(items[3].value, "8")
assert.equal(items[3].detail, "transactions this month")

console.log("dashboard-priority tests passed")
