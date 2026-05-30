//
//  page.tsx
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Renders the home route in Argent, composing page-level layout, data dependencies, and
//  feature components for that user-facing screen.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import * as React from "react"
import { Download, ListChecks } from "lucide-react"

import { AccountFilter } from "@/components/account-filter"
import { DashboardAnalyticsPanel } from "@/components/dashboard/dashboard-analytics-panel"
import { DashboardFinancialFocus } from "@/components/dashboard/dashboard-financial-focus"
import { DashboardModuleGrid, type DashboardModule } from "@/components/dashboard/dashboard-module-grid"
import { DashboardOverview } from "@/components/dashboard/dashboard-overview"
import {
    DASHBOARD_ACTION_BUTTON_CLASS,
    DASHBOARD_ACTION_ICON_CLASS,
    DASHBOARD_GLASS_SURFACE,
} from "@/components/dashboard/dashboard-primitives"
import { DashboardPriorityBrief } from "@/components/dashboard/dashboard-priority-brief"
import { DashboardRecentActivity } from "@/components/dashboard/dashboard-recent-activity"
import { useDashboardData } from "@/components/dashboard/use-dashboard-data"
import { ExportDialog } from "@/components/export-dialog"
import { PageHeader, PageSection, PageShell } from "@/components/page-framework"
import { Button } from "@/components/ui/button"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

export default function Dashboard() {
    const dashboard = useDashboardData()
    const [showExport, setShowExport] = React.useState(false)
    const [showPriorityBrief, setShowPriorityBrief] = React.useState(false)

    const modules = React.useMemo<DashboardModule[]>(() => [
        {
            id: "analytics",
            title: dashboard.dashboardLabels.analytics,
            node: (
                <PageSection stagger={2} className="flex h-full min-h-0 flex-col overflow-hidden">
                    <DashboardAnalyticsPanel
                        dashboardLabels={dashboard.dashboardLabels}
                        formatCompactCurrency={dashboard.formatCompactCurrency}
                        monthlySnapshot={dashboard.monthlySnapshot}
                        selectedAccountIds={dashboard.selectedAccountIds}
                        transactions={dashboard.isLoading ? null : dashboard.filteredFinanceData?.transactions ?? []}
                    />
                </PageSection>
            ),
        },
        {
            id: "recentActivity",
            title: dashboard.dashboardLabels.recentActivity,
            node: (
                <PageSection stagger={3} className="flex h-full min-h-0 flex-col overflow-hidden">
                    <DashboardRecentActivity
                        accountsById={dashboard.accountsById}
                        dashboardLabels={dashboard.dashboardLabels}
                        formatCompactCurrency={dashboard.formatCompactCurrency}
                        isLoading={dashboard.isLoading}
                        isPortuguese={dashboard.isPortuguese}
                        locale={dashboard.locale}
                        recentTransactions={dashboard.recentTransactions}
                        transactionsLabel={dashboard.transactionsLabel}
                    />
                </PageSection>
            ),
        },
        {
            id: "financialFocus",
            title: dashboard.dashboardLabels.focus,
            node: (
                <PageSection stagger={4} className="flex h-full min-h-0 flex-col overflow-hidden">
                    <DashboardFinancialFocus
                        budgetPressure={dashboard.budgetPressure}
                        dashboardLabels={dashboard.dashboardLabels}
                        formatCompactCurrency={dashboard.formatCompactCurrency}
                        isLoading={dashboard.isLoading}
                        isPortuguese={dashboard.isPortuguese}
                        locale={dashboard.locale}
                        upcomingBills={dashboard.upcomingBills}
                    />
                </PageSection>
            ),
        },
    ], [dashboard])

    const priorityReviewCount = React.useMemo(() => (
        dashboard.priorityItems.filter((item) => item.tone === "negative" || item.tone === "warning").length
    ), [dashboard.priorityItems])
    const priorityStatusLabel = priorityReviewCount > 0
        ? `${priorityReviewCount} ${dashboard.dashboardLabels.needsReview}`
        : dashboard.dashboardLabels.healthy

    return (
        <PageShell
            className="min-h-fit gap-4 overflow-visible p-3 md:h-full md:min-h-0 md:overflow-hidden md:p-4"
        >
            <PageHeader
                breadcrumbs={[
                    { label: dashboard.isLoading ? "" : dashboard.sidebarDashboardLabel, href: "/" },
                ]}
                isLoading={dashboard.isLoading}
                actions={
                    <>
                        <AccountFilter
                            accounts={dashboard.accounts}
                            selectedIds={dashboard.selectedAccountIds}
                            onChange={dashboard.setSelectedAccountIds}
                            isLoading={dashboard.isLoading}
                            className={DASHBOARD_ACTION_BUTTON_CLASS}
                        />
                        <Button
                            type="button"
                            onClick={() => setShowPriorityBrief(true)}
                            aria-label={dashboard.dashboardLabels.priorityBrief}
                            aria-controls="dashboard-priority-sidebar"
                            aria-expanded={showPriorityBrief}
                            title={dashboard.dashboardLabels.priorityBrief}
                            className={cn(
                                DASHBOARD_ACTION_BUTTON_CLASS,
                                showPriorityBrief && "bg-accent text-foreground shadow-[inset_0_0_0_1px_var(--border)]",
                            )}
                        >
                            <ListChecks className={DASHBOARD_ACTION_ICON_CLASS} />
                        </Button>
                        <Button
                            type="button"
                            onClick={() => setShowExport(true)}
                            aria-label={dashboard.dashboardExportLabel}
                            title={dashboard.dashboardExportLabel}
                            className={DASHBOARD_ACTION_BUTTON_CLASS}
                        >
                            <Download className={DASHBOARD_ACTION_ICON_CLASS} />
                        </Button>
                    </>
                }
            />

            <div
                className="flex min-w-0 flex-col gap-4 overflow-visible @[900px]/main:min-h-0 @[900px]/main:flex-1 @[900px]/main:overflow-hidden"
                data-dashboard-priority-layout="drawer"
            >
                <PageSection stagger={1} className="shrink-0">
                    <DashboardOverview
                        activitySummary={dashboard.activitySummary}
                        dashboardLabels={dashboard.dashboardLabels}
                        filteredFinanceData={dashboard.filteredFinanceData}
                        formattedDate={dashboard.formattedDate}
                        greeting={dashboard.greeting}
                        isLoading={dashboard.isLoading}
                        isProfileLoading={dashboard.isProfileLoading}
                        scopeSummary={dashboard.scopeSummary}
                        userProfile={dashboard.userProfile}
                    />
                </PageSection>

                <DashboardModuleGrid modules={modules} />
            </div>

            <Sheet open={showPriorityBrief} onOpenChange={setShowPriorityBrief}>
                <SheetContent
                    id="dashboard-priority-sidebar"
                    side="right"
                    className={cn(
                        DASHBOARD_GLASS_SURFACE,
                        "!fixed gap-0 overflow-hidden p-0 transform-gpu will-change-transform",
                        "w-[min(24rem,calc(100vw-1rem))] sm:max-w-[24rem]",
                        "data-[state=open]:!duration-300 data-[state=closed]:!duration-200",
                    )}
                    data-dashboard-priority-sidebar
                >
                    <SheetHeader className="shrink-0 px-4 pb-3 pt-4">
                        <div className="flex min-w-0 items-start gap-2.5 pr-10">
                            <ListChecks className="mt-0.5 size-4 shrink-0 text-foreground-secondary" />
                            <div className="min-w-0">
                                <SheetTitle className="truncate text-[13px] font-semibold tracking-normal text-foreground">
                                    {dashboard.dashboardLabels.priorityBrief}
                                </SheetTitle>
                                <SheetDescription className="mt-1 truncate text-[11px] leading-4 text-muted-foreground">
                                    {priorityStatusLabel}
                                </SheetDescription>
                            </div>
                        </div>
                        <div aria-hidden className="mt-3 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                    </SheetHeader>

                    <div className="dashboard-sidebar-scroll min-h-0 flex-1 overflow-y-auto px-3 pb-3">
                        <DashboardPriorityBrief
                            dashboardLabels={dashboard.dashboardLabels}
                            isLoading={dashboard.isLoading}
                            priorityItems={dashboard.priorityItems}
                            className="w-full"
                        />
                    </div>
                </SheetContent>
            </Sheet>

            <ExportDialog open={showExport} onOpenChange={setShowExport} />
        </PageShell>
    )
}
