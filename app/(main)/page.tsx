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
import { Download, Upload } from "lucide-react"

import { AccountFilter } from "@/components/account-filter"
import { DashboardAnalyticsPanel } from "@/components/dashboard/dashboard-analytics-panel"
import { DashboardFinancialFocus } from "@/components/dashboard/dashboard-financial-focus"
import { DashboardModuleGrid, type DashboardModule } from "@/components/dashboard/dashboard-module-grid"
import { DashboardOverview } from "@/components/dashboard/dashboard-overview"
import {
    DASHBOARD_ACTION_BUTTON_CLASS,
    DASHBOARD_ACTION_ICON_CLASS,
} from "@/components/dashboard/dashboard-primitives"
import { DashboardPriorityBriefDropdown } from "@/components/dashboard/dashboard-priority-brief"
import { DashboardRecentActivity } from "@/components/dashboard/dashboard-recent-activity"
import { useDashboardData } from "@/components/dashboard/use-dashboard-data"
import { ExportDialog } from "@/components/export-dialog"
import { ImportDialog } from "@/components/import-dialog"
import { PageHeader, PageSection, PageShell } from "@/components/page-framework"
import { Button } from "@/components/ui/button"
import { SmartTooltip } from "@/components/ui/tooltip"

export default function Dashboard() {
    const dashboard = useDashboardData()
    const [showExport, setShowExport] = React.useState(false)
    const [showImport, setShowImport] = React.useState(false)

    const modules = React.useMemo<DashboardModule[]>(() => [
        {
            id: "analytics",
            title: dashboard.dashboardLabels.analytics,
            node: (
                <PageSection stagger={2} className="flex min-h-0 flex-1 flex-col">
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
                <PageSection stagger={3} className="flex min-h-0 flex-1 flex-col">
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
                <PageSection stagger={4} className="flex min-h-0 flex-1 flex-col">
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

    return (
        <PageShell
            className="gap-4 overflow-x-hidden overflow-y-visible p-3 md:p-4"
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
                        <DashboardPriorityBriefDropdown
                            dashboardLabels={dashboard.dashboardLabels}
                            isLoading={dashboard.isLoading}
                            priorityItems={dashboard.priorityItems}
                            className={DASHBOARD_ACTION_BUTTON_CLASS}
                        />
                        <SmartTooltip text={dashboard.dashboardExportLabel} group="dashboard-header-actions" forceSide="bottom">
                            <Button
                                type="button"
                                onClick={() => setShowExport(true)}
                                aria-label={dashboard.dashboardExportLabel}
                                className={DASHBOARD_ACTION_BUTTON_CLASS}
                            >
                                <Download className={DASHBOARD_ACTION_ICON_CLASS} />
                            </Button>
                        </SmartTooltip>
                        <SmartTooltip text={dashboard.dashboardImportLabel} group="dashboard-header-actions" forceSide="bottom">
                            <Button
                                type="button"
                                onClick={() => setShowImport(true)}
                                aria-label={dashboard.dashboardImportLabel}
                                className={DASHBOARD_ACTION_BUTTON_CLASS}
                            >
                                <Upload className={DASHBOARD_ACTION_ICON_CLASS} />
                            </Button>
                        </SmartTooltip>
                    </>
                }
            />

            <div
                className="flex min-w-0 flex-col gap-4 overflow-visible @[900px]/main:min-h-0 @[900px]/main:flex-1"
                data-dashboard-priority-layout="dropdown"
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

            <ExportDialog open={showExport} onOpenChange={setShowExport} />
            <ImportDialog open={showImport} onOpenChange={setShowImport} />
        </PageShell>
    )
}
