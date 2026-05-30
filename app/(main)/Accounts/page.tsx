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
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/language-provider"
import { useCurrency } from "@/components/currency-provider"
import { useFinanceData } from "@/hooks/use-finance-data"
import { Wallet, TrendingUp, TrendingDown, CreditCard, Plus } from "lucide-react"

export default function AccountsPage() {
    const { t } = useLanguage()
    const { formatCurrency } = useCurrency()
    const f = t.finance || {}
    const isPt = (t.config?.locale || "en-US").startsWith("pt")
    const { data, isLoading } = useFinanceData()
    const allAccounts = React.useMemo(() => (data?.accounts ?? []) as Account[], [data?.accounts])

    // Compute stats from accounts
    const stats = React.useMemo(() => {
        if (isLoading || allAccounts.length === 0) return []
        let totalBalance = 0, totalIn = 0, totalOut = 0
        for (const a of allAccounts) { totalBalance += a.balance; totalIn += a.totalIn; totalOut += a.totalOut }
        const fmt = (n: number) => formatCurrency(n)
        return [
            { label: "Total Balance", value: fmt(totalBalance), icon: <Wallet className="h-4 w-4" /> },
            { label: "Total Income", value: fmt(totalIn), change: "All accounts", trend: "up" as const, icon: <TrendingUp className="h-4 w-4" /> },
            { label: "Total Expenses", value: fmt(totalOut), change: "All accounts", trend: "down" as const, icon: <TrendingDown className="h-4 w-4" /> },
            { label: "Accounts", value: String(allAccounts.length), icon: <CreditCard className="h-4 w-4" /> },
        ]
    }, [allAccounts, isLoading, formatCurrency])

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
                        title={isPt ? "Ligar banco" : "Connect bank"}
                    >
                        <Plus />
                    </Button>
                }
            />


            <StatCards stats={stats} isLoading={isLoading} />

            <div className="grid min-h-0 gap-4 xl:grid-cols-[minmax(280px,0.36fr)_minmax(0,1fr)] xl:items-start">
                <PageSection stagger={2} className="xl:sticky xl:top-4">
                    <div id="bank-connections">
                        <BankConnections />
                    </div>
                </PageSection>

                <PageSection stagger={3} fill>
                    <AccountsTable data={allAccounts} isLoading={isLoading} />
                </PageSection>
            </div>
        </PageShell>
    )
}
