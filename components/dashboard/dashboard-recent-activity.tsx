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
    isPortuguese,
    locale,
    recentTransactions,
    transactionsLabel,
}: {
    accountsById: Map<string, Account>
    dashboardLabels: DashboardLabels
    formatCompactCurrency: CompactCurrencyFormatter
    isLoading: boolean
    isPortuguese: boolean
    locale: string
    recentTransactions: Transaction[]
    transactionsLabel: string
}) {
    return (
        <DashboardSurface
            title={dashboardLabels.recentActivity}
            icon={ReceiptText}
            className="min-h-[260px] lg:min-h-0"
            tools={
                <Button asChild variant="glass" size="icon-sm" className={DASHBOARD_ACTION_BUTTON_CLASS}>
                    <Link href="/Transactions" aria-label={transactionsLabel}>
                        <ArrowUpRight className={DASHBOARD_ACTION_ICON_CLASS} />
                    </Link>
                </Button>
            }
            bodyClassName="overflow-auto pr-1"
        >
            {isLoading ? (
                <DashboardLinesSkeleton rows={4} />
            ) : recentTransactions.length > 0 ? (
                <div className="space-y-1">
                    {recentTransactions.map((transaction) => {
                        const isIncome = transaction.type === "in"
                        const account = accountsById.get(transaction.accountId)
                        const transactionDate = new Date(`${transaction.date}T00:00:00`)
                        const category = transaction.tags[0] || (isPortuguese ? "Sem categoria" : "Uncategorized")

                        return (
                            <Link
                                key={transaction.id}
                                href={`/Transactions/${encodeURIComponent(transaction.id)}`}
                                className={cn(DASHBOARD_ROW_HOVER, "flex min-w-0 items-center gap-3 px-2.5 py-2.5")}
                            >
                                <DashboardIconBadge
                                    icon={isIncome ? ArrowUpRight : ArrowDownRight}
                                    className={cn(isIncome ? "text-emerald-400" : "text-red-400")}
                                />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-[13px] font-semibold text-foreground">
                                        {transaction.description}
                                    </p>
                                    <p className="truncate text-[11px] text-muted-foreground">
                                        {category}
                                        {account ? ` - ${account.name}` : ""}
                                        {" - "}
                                        {transactionDate.toLocaleDateString(locale, { month: "short", day: "numeric" })}
                                    </p>
                                </div>
                                <p className={cn(
                                    "shrink-0 text-right text-[13px] font-semibold tabular-nums",
                                    isIncome ? "text-emerald-400" : "text-red-400"
                                )}>
                                    {isIncome ? "+" : "-"}{formatCompactCurrency(transaction.amount)}
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
