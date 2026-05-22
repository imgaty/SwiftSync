"use client"

import Link from "next/link"
import * as React from "react"
import { PageShell, PageHeader, PageSection } from "@/components/page-framework"
import { SectionCards } from "@/components/section-cards"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { TransactionsTable } from "@/components/transactions-table"
import { ExportDialog } from "@/components/export-dialog"
import { CashFlowCard } from "@/components/cash-flow-card"
import { AccountFilter } from "@/components/account-filter"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Download,
    User,
    TrendingUp,
} from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { useFinanceData } from "@/hooks/use-finance-data"
import type { FinanceData } from "@/lib/types"



interface DashboardTranslations {
    common?: {
        personal?: string
    }
    dashboard?: {
        export?: string
        good_morning?: string
        good_afternoon?: string
        good_evening?: string
    }
}

interface ProfileResponse {
    name?: string
    initials?: string
}

export default function Dashboard() {
    const { t, isLoading: isLanguageLoading } = useLanguage()
    const text = t as typeof t & DashboardTranslations
    const { data: financeData, isLoading: isDataLoading } = useFinanceData()
    const personalLabel = text.common?.personal || "Personal"
    const dashboardExportLabel = text.dashboard?.export || "Export"
    const goodMorningLabel = text.dashboard?.good_morning || "Good morning"
    const goodAfternoonLabel = text.dashboard?.good_afternoon || "Good afternoon"
    const goodEveningLabel = text.dashboard?.good_evening || "Good evening"

    const [showExport, setShowExport] = React.useState(false)
    const [showCashFlow, setShowCashFlow] = React.useState(false)
    const [selectedAccountIds, setSelectedAccountIds] = React.useState<string[]>([])
    const [now, setNow] = React.useState(() => new Date())

    const [userProfile, setUserProfile] = React.useState<{ name: string; initials: string } | null>(null)

    const isLoading = isLanguageLoading || isDataLoading

    React.useEffect(() => {
        const timer = window.setInterval(() => setNow(new Date()), 60_000)
        return () => window.clearInterval(timer)
    }, [])

    React.useEffect(() => {
        async function loadProfile() {
            try {
                const profileResponse = await fetch("/api/auth/profile", { credentials: "include" })

                if (profileResponse.ok) {
                    const profile = await profileResponse.json() as ProfileResponse
                    setUserProfile({
                        name: profile.name || "",
                        initials: profile.initials || "",
                    })
                }
            } catch {
                setUserProfile(null)
            }
        }
        loadProfile()
    }, [])

    const greeting = React.useMemo(() => {
        const hour = now.getHours()
        if (hour >= 5 && hour < 12) return goodMorningLabel
        if (hour >= 12 && hour < 18) return goodAfternoonLabel
        return goodEveningLabel
    }, [now, goodMorningLabel, goodAfternoonLabel, goodEveningLabel])

    const formattedDate = React.useMemo(() => {
        return now.toLocaleString(t.config?.locale, {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        })
    }, [now, t.config?.locale])

    const accounts = React.useMemo(() => financeData?.accounts || [], [financeData?.accounts])

    const selectedAccountIdSet = React.useMemo(
        () => (selectedAccountIds.length > 0 ? new Set(selectedAccountIds) : null),
        [selectedAccountIds],
    )

    const filteredTransactions = React.useMemo(() => {
        const allTransactions = financeData?.transactions || []
        if (!selectedAccountIdSet) return allTransactions
        return allTransactions.filter((transaction) => selectedAccountIdSet.has(transaction.accountId))
    }, [financeData?.transactions, selectedAccountIdSet])

    const filteredBills = React.useMemo(() => {
        const allBills = financeData?.bills || []
        if (!selectedAccountIdSet) return allBills
        return allBills.filter((bill) => selectedAccountIdSet.has(bill.accountId))
    }, [financeData?.bills, selectedAccountIdSet])

    const filteredAccounts = React.useMemo(() => {
        if (!selectedAccountIdSet) return accounts
        return accounts.filter((account) => selectedAccountIdSet.has(account.id))
    }, [accounts, selectedAccountIdSet])

    const filteredBudgets = React.useMemo(() => {
        const allBudgets = financeData?.budgets || []
        if (!selectedAccountIdSet) return allBudgets

        const spentByTag = new Map<string, number>()
        for (const transaction of filteredTransactions) {
            if (transaction.type === "out") {
                for (const tag of transaction.tags) {
                    spentByTag.set(tag, (spentByTag.get(tag) || 0) + transaction.amount)
                }
            }
        }

        return allBudgets.map((budget) => ({
            ...budget,
            spentAmount: spentByTag.get(budget.tag) || 0,
        }))
    }, [financeData?.budgets, filteredTransactions, selectedAccountIdSet])

    const filteredFinanceData = React.useMemo((): FinanceData | null => {
        if (!financeData) return null
        return {
            ...financeData,
            accounts: filteredAccounts,
            transactions: filteredTransactions,
            bills: filteredBills,
            budgets: filteredBudgets,
        }
    }, [financeData, filteredAccounts, filteredTransactions, filteredBills, filteredBudgets])

    return (
        <PageShell className="gap-3 p-3 md:p-4 lg:h-full lg:min-h-0 lg:overflow-hidden">
            <PageHeader
                breadcrumbs={[
                    { label: isLoading ? "" : t.sidebar_dashboard, href: "/" },
                ]}
                isLoading={isLoading}
                actions={
                    <>
                        <AccountFilter
                            accounts={accounts}
                            selectedIds={selectedAccountIds}
                            onChange={setSelectedAccountIds}
                            isLoading={isLoading}
                        />
                        <Button
                            onClick={() => setShowExport(true)}
                            title={dashboardExportLabel}
                        >
                            <Download />
                        </Button>
                    </>
                }
            />

            <PageSection stagger={1} className="shrink-0">
                <div className="grid gap-3 xl:grid-cols-[minmax(240px,0.34fr)_minmax(0,1fr)] xl:items-stretch">
                    {isLoading || !userProfile ? (
                        <div className="flex min-h-28 flex-col justify-center space-y-2">
                            <Skeleton className="h-7 w-56" />
                            <Skeleton className="h-4 w-80 max-w-full" />
                        </div>
                    ) : (
                        <div className="flex min-h-28 flex-col justify-center gap-1.5">
                            <div className="flex items-center gap-2.5 flex-wrap">
                                <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">
                                    {greeting}{userProfile.name ? `, ${userProfile.name.split(" ")[0]}` : ""}
                                </h1>
                                <Badge variant="outline" className="shrink-0 text-[11px] font-medium">
                                    <User className="size-3" /> {personalLabel}
                                </Badge>
                            </div>
                            <p className="text-xs text-neutral-400 sm:text-sm">
                                {formattedDate}
                            </p>
                        </div>
                    )}

                    <SectionCards data={filteredFinanceData} isLoading={isLoading} variant="dashboard" />
                </div>
            </PageSection>

            <div className="grid flex-1 min-h-0 gap-3 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:overflow-hidden">
                <PageSection stagger={2} className="flex min-h-0 flex-col overflow-hidden">
                    <div className="flex h-full min-h-0 flex-col gap-2.5">
                        <div className="shrink-0">
                            <h2 className="text-base sm:text-lg font-semibold tracking-tight">
                                <Link href="/Transactions" className="transition-colors hover:text-primary">
                                    {t.finance?.transactions}
                                </Link>
                            </h2>
                        </div>
                        <div className="min-h-0 flex-1">
                            <TransactionsTable
                                data={filteredTransactions}
                                accounts={filteredAccounts}
                                isLoading={isLoading}
                                variant="dashboard"
                                pageSize={4}
                                showSelectColumn={false}
                                showActionsColumn={false}
                            />
                        </div>
                    </div>
                </PageSection>

                <PageSection stagger={3} className="flex min-h-0 flex-col overflow-hidden">
                    <div className="flex h-full min-h-0 flex-col gap-2.5">
                        <div className="flex shrink-0 items-center justify-between gap-3">
                            <div className="min-w-0">
                                <h2 className="text-base sm:text-lg font-semibold tracking-tight">
                                    <Link href="/Calendar" className="transition-colors hover:text-primary">
                                        {t.finance?.analytics}
                                    </Link>
                                </h2>
                            </div>
                            <Button
                                type="button"
                                variant={showCashFlow ? "solid" : "glass"}
                                size="sm"
                                aria-pressed={showCashFlow}
                                onClick={() => setShowCashFlow((value) => !value)}
                            >
                                <TrendingUp className="size-4" />
                                {t.finance?.cash_flow || "Cash Flow"}
                            </Button>
                        </div>

                        <div className={showCashFlow
                            ? "grid min-h-0 flex-1 gap-3 overflow-hidden xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.44fr)]"
                            : "min-h-0 flex-1 overflow-hidden"
                        }>
                            <div className="h-full min-h-0 overflow-hidden">
                                <ChartAreaInteractive accountIds={selectedAccountIds} compact />
                            </div>
                            {showCashFlow && (
                                <div className="h-full min-h-0 overflow-hidden">
                                    <CashFlowCard accountIds={selectedAccountIds} compact />
                                </div>
                            )}
                        </div>
                    </div>
                </PageSection>
            </div>

            <ExportDialog open={showExport} onOpenChange={setShowExport} />
        </PageShell>
    )
}
