//
//  dashboard-financial-focus.tsx
//  Argent
//
//  Created by hilario on 22 May 2026 at 21:33.
//  Description: Implements the Dashboard financial focus dashboard module for Argent, shaping financial
//  summary content, supporting states, and interactions used by the dashboard experience.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import Link from "next/link"
import { CalendarClock, Gauge, WalletCards } from "lucide-react"

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
import { formatDaysUntil } from "@/components/dashboard/utils"
import { PRISM } from "@/lib/PRISM"
import { cn } from "@/lib/utils"
import type {
    BudgetPressure,
    CompactCurrencyFormatter,
    DashboardLabels,
    UpcomingBill,
} from "@/components/dashboard/types"

export function DashboardFinancialFocus({
    budgetPressure,
    dashboardLabels,
    formatCompactCurrency,
    isLoading,
    isPortuguese,
    locale,
    upcomingBills,
}: {
    budgetPressure: BudgetPressure[]
    dashboardLabels: DashboardLabels
    formatCompactCurrency: CompactCurrencyFormatter
    isLoading: boolean
    isPortuguese: boolean
    locale: string
    upcomingBills: UpcomingBill[]
}) {
    return (
        <DashboardSurface
            title={dashboardLabels.focus}
            icon={WalletCards}
            className="min-h-[300px] lg:min-h-0"
            bodyClassName="overflow-auto pr-1"
            action={
                <div className="flex items-center gap-1">
                    <Button asChild variant="glass" size="icon-sm" className={DASHBOARD_ACTION_BUTTON_CLASS}>
                        <Link href="/Budgets" aria-label={dashboardLabels.budgetPressure}>
                            <Gauge className={DASHBOARD_ACTION_ICON_CLASS} />
                        </Link>
                    </Button>
                    <Button asChild variant="glass" size="icon-sm" className={DASHBOARD_ACTION_BUTTON_CLASS}>
                        <Link href="/Bills" aria-label={dashboardLabels.upcomingBills}>
                            <CalendarClock className={DASHBOARD_ACTION_ICON_CLASS} />
                        </Link>
                    </Button>
                </div>
            }
        >
            {isLoading ? (
                <DashboardLinesSkeleton rows={4} />
            ) : budgetPressure.length > 0 || upcomingBills.length > 0 ? (
                <div className="space-y-4">
                    {budgetPressure.length > 0 && (
                        <section className="space-y-2.5">
                            <div className="flex items-center justify-between gap-3 px-1">
                                <h3 className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
                                    <span className="size-1.5 rounded-full bg-amber-500" />
                                    {dashboardLabels.budgetPressure}
                                </h3>
                                <span className="text-[11px] font-semibold text-muted-foreground">
                                    {budgetPressure[0]?.percentUsed ?? 0}%
                                </span>
                            </div>
                            <div className="space-y-2">
                                {budgetPressure.map((budget) => {
                                    const isOver = budget.remainingAmount < 0
                                    const progressTone = budget.percentUsed >= 100
                                        ? "bg-red-500"
                                        : budget.percentUsed >= 80
                                            ? "bg-amber-500"
                                            : "bg-emerald-500"

                                    return (
                                        <Link
                                            key={`${budget.category}-${budget.tag}`}
                                            href="/Budgets"
                                            className={cn(DASHBOARD_ROW_HOVER, "block px-2.5 py-2.5")}
                                        >
                                            <div className="mb-2 flex min-w-0 items-center justify-between gap-3">
                                                <div className="flex min-w-0 items-center gap-2">
                                                    <span
                                                        className="size-2.5 shrink-0 rounded-full"
                                                        style={{ backgroundColor: budget.color || "var(--primary)" }}
                                                    />
                                                    <p className="truncate text-[13px] font-semibold">
                                                        {budget.category || budget.tag}
                                                    </p>
                                                </div>
                                                <span className={cn(
                                                    "shrink-0 text-[12px] font-semibold tabular-nums",
                                                    isOver ? "text-red-400" : "text-muted-foreground"
                                                )}>
                                                    {formatCompactCurrency(Math.abs(budget.remainingAmount))} {isOver ? dashboardLabels.over : dashboardLabels.left}
                                                </span>
                                            </div>
                                            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                                                <div
                                                    className={cn("h-full rounded-full transition-all", progressTone)}
                                                    style={{ width: `${Math.min(100, Math.max(0, budget.percentUsed))}%` }}
                                                />
                                            </div>
                                        </Link>
                                    )
                                })}
                            </div>
                        </section>
                    )}

                    {budgetPressure.length > 0 && upcomingBills.length > 0 && (
                        <div aria-hidden className={cn(PRISM.separator, "my-0")} />
                    )}

                    {upcomingBills.length > 0 && (
                        <section className="space-y-2.5">
                            <div className="flex items-center justify-between gap-3 px-1">
                                <h3 className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
                                    <span className="size-1.5 rounded-full bg-muted-foreground" />
                                    {dashboardLabels.upcomingBills}
                                </h3>
                                <span className="text-[11px] font-semibold text-muted-foreground">
                                    {upcomingBills.length}
                                </span>
                            </div>
                            <div className="space-y-1">
                                {upcomingBills.map((bill) => (
                                    <Link
                                        key={bill.id}
                                        href="/Bills"
                                        className={cn(DASHBOARD_ROW_HOVER, "flex min-w-0 items-center gap-3 px-2.5 py-2.5")}
                                    >
                                        <DashboardIconBadge icon={CalendarClock} />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-[13px] font-semibold">
                                                {bill.name}
                                            </p>
                                            <p className="truncate text-[11px] text-muted-foreground">
                                                {bill.dueDate.toLocaleDateString(locale, { month: "short", day: "numeric" })}
                                                {" - "}
                                                {formatDaysUntil(bill.daysUntilDue, isPortuguese)}
                                            </p>
                                        </div>
                                        <span className="shrink-0 text-[13px] font-semibold tabular-nums">
                                            {formatCompactCurrency(bill.amount)}
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            ) : (
                <EmptyDashboardLine label={dashboardLabels.noFocus} />
            )}
        </DashboardSurface>
    )
}
