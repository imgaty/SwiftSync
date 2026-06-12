//
//  dashboard-recent-activity.tsx
//  Argent
//
//  Created by hilario on 22 May 2026 at 21:33.
//  Description: Implements the Dashboard recent activity dashboard module for Argent, shaping financial
//  summary content, supporting states, and interactions used by the dashboard experience.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import Link from "next/link"
import { ArrowDownRight, ArrowUpRight, ReceiptText } from "lucide-react"

import {
    DASHBOARD_ACTION_BUTTON_CLASS,
    DASHBOARD_ACTION_ICON_CLASS,
    DashboardIconBadge,
    DashboardLinesSkeleton,
    DASHBOARD_ROW_HOVER,
    DashboardSurface,
    EmptyDashboardLine,
} from "@/components/dashboard/dashboard-primitives"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { CompactCurrencyFormatter, DashboardLabels } from "@/components/dashboard/types"
import type { Account, Transaction } from "@/lib/types"

export function DashboardRecentActivity({
    accountsById,
    dashboardLabels,
    formatCompactCurrency,
    isLoading,
    locale,
    recentTransactions,
    transactionsLabel,
}: {
    accountsById: Map<string, Account>
    dashboardLabels: DashboardLabels
    formatCompactCurrency: CompactCurrencyFormatter
    isLoading: boolean
    locale: string
    recentTransactions: Transaction[]
    transactionsLabel: string
}) {
    return (
        <DashboardSurface
            title={dashboardLabels.recentActivity}
            icon={ReceiptText}
            className="@container/activity min-h-[260px] lg:min-h-0"
            tools={
                <Button asChild variant="glass" size="icon-sm" className={DASHBOARD_ACTION_BUTTON_CLASS}>
                    <Link href="/Transactions" aria-label={transactionsLabel}>
                        <ArrowUpRight className={DASHBOARD_ACTION_ICON_CLASS} />
                    </Link>
                </Button>
            }
            bodyClassName="overflow-y-auto overflow-x-hidden pr-1"
        >
            {isLoading ? (
                <DashboardLinesSkeleton rows={4} />
            ) : recentTransactions.length > 0 ? (
                <div className="space-y-1">
                    {recentTransactions.map((transaction) => {
                        const isIncome = transaction.type === "in"
                        const account = accountsById.get(transaction.accountId)
                        const transactionDate = new Date(`${transaction.date}T00:00:00`)
                        const category = transaction.tags[0] || dashboardLabels.uncategorized
                        const amountLabel = `${isIncome ? "+" : "-"}${formatCompactCurrency(transaction.amount)}`

                        return (
                            <Link
                                key={transaction.id}
                                href={`/Transactions/${encodeURIComponent(transaction.id)}`}
                                className={cn(
                                    DASHBOARD_ROW_HOVER,
                                    "grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1 px-2.5 py-2.5 @[380px]/activity:grid-cols-[auto_minmax(0,1fr)_minmax(4.75rem,6.75rem)]"
                                )}
                            >
                                <DashboardIconBadge
                                    icon={isIncome ? ArrowUpRight : ArrowDownRight}
                                    className={cn(
                                        "row-span-2 @[380px]/activity:row-span-1",
                                        isIncome ? "text-emerald-400" : "text-red-400"
                                    )}
                                />
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-foreground">
                                        {transaction.description}
                                    </p>
                                    <p className="truncate text-xs text-muted-foreground">
                                        {category}
                                        {account ? ` - ${account.name}` : ""}
                                        {" - "}
                                        {transactionDate.toLocaleDateString(locale, { month: "short", day: "numeric" })}
                                    </p>
                                </div>
                                <p
                                    className={cn(
                                        "col-start-2 row-start-2 min-w-0 max-w-full truncate text-xs font-semibold tabular-nums @[380px]/activity:col-start-3 @[380px]/activity:row-start-1 @[380px]/activity:text-right @[380px]/activity:text-sm",
                                        isIncome ? "text-emerald-400" : "text-red-400"
                                    )}
                                    title={amountLabel}
                                >
                                    {amountLabel}
                                </p>
                            </Link>
                        )
                    })}
                </div>
            ) : (
                <EmptyDashboardLine label={dashboardLabels.noTransactions} />
            )}
        </DashboardSurface>
    )
}
