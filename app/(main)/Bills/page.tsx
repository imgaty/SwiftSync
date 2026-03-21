"use client"

import * as React from "react"
import { PageShell, PageHeader, PageTitle, StatCards, PageSection } from "@/components/page-framework"
import { BillsTable, Bill } from "@/components/bills-table"
import { useLanguage } from "@/components/language-provider"
import { useFinanceData } from "@/hooks/use-finance-data"
import { Receipt, CalendarClock, AlertTriangle, CheckCircle2 } from "lucide-react"

export default function BillsPage() {
    const { t } = useLanguage()
    const f = t.finance || {}
    const { data, isLoading } = useFinanceData()
    const billsData = (data?.bills || []) as Bill[]

    // Compute stats from bills
    const stats = React.useMemo(() => {
        if (isLoading || billsData.length === 0) return []
        const totalMonthly = billsData
            .filter(b => b.frequency === "monthly")
            .reduce((sum, b) => sum + b.amount, 0)
        const totalYearly = billsData
            .filter(b => b.frequency === "yearly")
            .reduce((sum, b) => sum + b.amount, 0)
        const overdue = billsData.filter(b => b.status === "overdue").length
        const paid = billsData.filter(b => b.status === "paid").length
        const fmt = (n: number) => `€${n.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}`
        return [
            { label: "Monthly Total", value: fmt(totalMonthly), change: `${billsData.filter(b => b.frequency === "monthly").length} bills`, trend: "neutral" as const, icon: <Receipt className="h-4 w-4" /> },
            { label: "Yearly Total", value: fmt(totalYearly), change: `${billsData.filter(b => b.frequency === "yearly").length} bills`, trend: "neutral" as const, icon: <CalendarClock className="h-4 w-4" /> },
            { label: "Overdue", value: String(overdue), change: overdue > 0 ? "Needs attention" : "All good", trend: overdue > 0 ? "down" as const : "up" as const, icon: <AlertTriangle className="h-4 w-4" /> },
            { label: "Paid", value: String(paid), change: `of ${billsData.length} total`, trend: "up" as const, icon: <CheckCircle2 className="h-4 w-4" /> },
        ]
    }, [billsData, isLoading])

    return (
        <PageShell>
            <PageHeader
                breadcrumbs={[
                    { label: t.sidebar_dashboard || "Dashboard", href: "/" },
                    { label: f.bills || "Bills", href: "/Bills" },
                ]}
                isLoading={isLoading}
            />

            <PageTitle
                title={f.pages?.bills_title || "Bills"}
                description={f.pages?.bills_description || "Track your recurring bills and payments"}
                isLoading={isLoading}
                icon={<Receipt className="h-5 w-5" />}
            />

            <StatCards stats={stats} isLoading={isLoading} />

            <PageSection stagger={3}>
                <BillsTable data={billsData} isLoading={isLoading} />
            </PageSection>
        </PageShell>
    )
}
