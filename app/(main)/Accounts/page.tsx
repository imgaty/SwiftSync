"use client"

import * as React from "react"
import { PageShell, PageHeader, PageTitle, StatCards, PageSection } from "@/components/page-framework"
import { AccountsTable, Account } from "@/components/accounts-table"
import { BankConnections } from "@/components/bank-connections"
import { useLanguage } from "@/components/language-provider"
import { useFinanceData } from "@/hooks/use-finance-data"
import { Wallet, TrendingUp, TrendingDown, CreditCard } from "lucide-react"

export default function AccountsPage() {
    const { t } = useLanguage()
    const f = t.finance || {}
    const { data, isLoading: isStaticLoading } = useFinanceData()
    const staticAccounts = (data?.accounts || []) as Account[]

    // Also fetch accounts from the database API
    const [dbAccounts, setDbAccounts] = React.useState<Account[]>([])
    const [isDbLoading, setIsDbLoading] = React.useState(true)

    React.useEffect(() => {
        async function fetchDbAccounts() {
            try {
                const res = await fetch("/api/accounts")
                if (res.ok) {
                    const accounts = await res.json()
                    setDbAccounts(accounts)
                }
            } catch {
                // API accounts not available — that's fine, show static data
            } finally {
                setIsDbLoading(false)
            }
        }
        fetchDbAccounts()
    }, [])

    // Merge: DB accounts first, then static sample accounts
    const allAccounts = React.useMemo(() => {
        const dbIds = new Set(dbAccounts.map((a) => a.id))
        const filteredStatic = staticAccounts.filter((a) => !dbIds.has(a.id))
        return [...dbAccounts, ...filteredStatic]
    }, [dbAccounts, staticAccounts])

    const isLoading = isStaticLoading || isDbLoading

    // Compute stats from accounts
    const stats = React.useMemo(() => {
        if (isLoading || allAccounts.length === 0) return []
        const totalBalance = allAccounts.reduce((sum, a) => sum + a.balance, 0)
        const totalIn = allAccounts.reduce((sum, a) => sum + a.totalIn, 0)
        const totalOut = allAccounts.reduce((sum, a) => sum + a.totalOut, 0)
        const fmt = (n: number) => `€${n.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}`
        return [
            { label: "Total Balance", value: fmt(totalBalance), icon: <Wallet className="h-4 w-4" /> },
            { label: "Total Income", value: fmt(totalIn), change: "All accounts", trend: "up" as const, icon: <TrendingUp className="h-4 w-4" /> },
            { label: "Total Expenses", value: fmt(totalOut), change: "All accounts", trend: "down" as const, icon: <TrendingDown className="h-4 w-4" /> },
            { label: "Accounts", value: String(allAccounts.length), icon: <CreditCard className="h-4 w-4" /> },
        ]
    }, [allAccounts, isLoading])

    return (
        <PageShell>
            <PageHeader
                breadcrumbs={[
                    { label: t.sidebar_dashboard || "Dashboard", href: "/" },
                    { label: f.accounts || "Accounts", href: "/Accounts" },
                ]}
                isLoading={isLoading}
            />

            <PageTitle
                title={f.pages?.accounts_title || "Accounts"}
                description={f.pages?.accounts_description || "Manage your bank accounts and cards"}
                isLoading={isLoading}
                icon={<Wallet className="h-5 w-5" />}
            />

            <StatCards stats={stats} isLoading={isLoading} />

            <PageSection stagger={2}>
                <BankConnections />
            </PageSection>

            <PageSection stagger={3}>
                <AccountsTable data={allAccounts} isLoading={isLoading} />
            </PageSection>
        </PageShell>
    )
}
