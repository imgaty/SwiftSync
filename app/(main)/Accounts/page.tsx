//
//  page.tsx
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Renders the /Accounts route in Argent, composing page-level layout, data dependencies,
//  and feature components for that user-facing screen.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import * as React from "react"
import { PageShell, PageHeader, StatCards, PageSection } from "@/components/page-framework"
import { AccountsTable, Account } from "@/components/accounts-table"
import { BankConnections } from "@/components/bank-connections"
import { DashboardSupportSidebar } from "@/components/dashboard/dashboard-support-sidebar"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/language-provider"
import { useCurrency } from "@/components/currency-provider"
import { useFinanceData } from "@/hooks/use-finance-data"
import { getTranslations } from "@/lib/translation-utils"
import { Wallet, TrendingUp, TrendingDown, CreditCard, Plus } from "lucide-react"

export default function AccountsPage() {
    const { t } = useLanguage()
    const { formatCurrency } = useCurrency()
    const f = t.finance || {}
    const statLabels = getTranslations(t, "stat_labels")
    const accountsCopy = getTranslations(t, "accounts_page")
    const bankConnections = getTranslations(t, "bank_connections")
    const { data, isLoading } = useFinanceData()
    const allAccounts = React.useMemo(() => (data?.accounts ?? []) as Account[], [data?.accounts])

    // Compute stats from accounts
    const stats = React.useMemo(() => {
        if (isLoading || allAccounts.length === 0) return []
        let totalBalance = 0, totalIn = 0, totalOut = 0
        for (const a of allAccounts) { totalBalance += a.balance; totalIn += a.totalIn; totalOut += a.totalOut }
        const fmt = (n: number) => formatCurrency(n)
        return [
            { label: statLabels.total_balance || "Total Balance", value: fmt(totalBalance), icon: <Wallet className="size-4" /> },
            { label: statLabels.total_income || "Total Income", value: fmt(totalIn), change: statLabels.all_accounts || "All accounts", trend: "up" as const, icon: <TrendingUp className="size-4" /> },
            { label: statLabels.total_expenses || "Total Expenses", value: fmt(totalOut), change: statLabels.all_accounts || "All accounts", trend: "down" as const, icon: <TrendingDown className="size-4" /> },
            { label: f.accounts || "Accounts", value: String(allAccounts.length), icon: <CreditCard className="size-4" /> },
        ]
    }, [allAccounts, f.accounts, isLoading, formatCurrency, statLabels])

    return (
        <PageShell className="gap-4 p-3 md:p-4">
            <PageHeader
                breadcrumbs={[
                    { label: t.sidebar_dashboard || "Dashboard", href: "/" },
                    { label: f.accounts || "Accounts", href: "/Accounts" },
                ]}
                isLoading={isLoading}
                actions={
                    <Button
                        onClick={() => document.getElementById("bank-connections")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                        title={bankConnections.connect_bank || "Connect bank"}
                    >
                        <Plus />
                    </Button>
                }
            />

            <div className="flex min-h-0 min-w-0 flex-col gap-4 @[900px]/main:flex-1">
                <PageSection stagger={1} className="shrink-0">
                    <StatCards stats={stats} isLoading={isLoading} />
                </PageSection>

                <div
                    className="grid min-w-0 gap-4 @[900px]/main:min-h-0 @[900px]/main:flex-1 @[900px]/main:grid-cols-[minmax(0,1fr)_minmax(280px,320px)] @[1320px]/main:grid-cols-5"
                    data-dashboard-grid
                    data-dashboard-layout="command-center"
                >
                    <section
                        aria-label={f.accounts || "Accounts"}
                        className="flex min-h-[420px] min-w-0 @[900px]/main:min-h-0 @[1320px]/main:col-span-4"
                        data-dashboard-module="accounts"
                        data-dashboard-zone="primary"
                    >
                        <PageSection stagger={2} fill className="flex min-h-0 flex-1 flex-col">
                            <AccountsTable data={allAccounts} isLoading={isLoading} />
                        </PageSection>
                    </section>

                    <DashboardSupportSidebar className="@[1320px]/main:col-span-1">
                        <section
                            id="bank-connections"
                            aria-label={accountsCopy.bank_connections || bankConnections.title || "Bank connections"}
                            className="min-h-[220px] min-w-0 @[900px]/main:flex-1"
                            data-dashboard-module="bank-connections"
                            data-dashboard-zone="supporting"
                        >
                            <PageSection stagger={3} className="flex min-h-0 flex-1 flex-col">
                                <BankConnections />
                            </PageSection>
                        </section>
                    </DashboardSupportSidebar>
                </div>
            </div>
        </PageShell>
    )
}
