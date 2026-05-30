//
//  dashboard-overview.tsx
//  Argent
//
//  Created by hilario on 22 May 2026 at 21:32.
//  Description: Implements the Dashboard overview dashboard module for Argent, shaping financial summary
//  content, supporting states, and interactions used by the dashboard experience.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import {
    DashboardMetricCard,
    DashboardMetricCardSkeleton,
} from "@/components/dashboard/dashboard-primitives"
import { SectionCards } from "@/components/section-cards"
import type {
    DashboardLabels,
    DashboardUserProfile,
} from "@/components/dashboard/types"
import type { FinanceData } from "@/lib/types"

export function DashboardOverview({
    activitySummary,
    dashboardLabels: _dashboardLabels,
    filteredFinanceData,
    formattedDate,
    greeting,
    isLoading,
    isProfileLoading,
    scopeSummary,
    userProfile,
}: {
    activitySummary: string
    dashboardLabels: DashboardLabels
    filteredFinanceData: FinanceData | null
    formattedDate: string
    greeting: string
    isLoading: boolean
    isProfileLoading: boolean
    scopeSummary: string
    userProfile: DashboardUserProfile | null
}) {
    return (
        <div className="@container/overview min-w-0">
            <div className="grid gap-4 @[980px]/overview:grid-cols-[minmax(260px,0.34fr)_minmax(0,1fr)] @[980px]/overview:items-stretch @[1320px]/overview:grid-cols-5">
                {isLoading || isProfileLoading ? (
                    <DashboardMetricCardSkeleton showIcon={false} className="@[1320px]/overview:col-span-1" />
                ) : (
                    <DashboardMetricCard
                        label={formattedDate}
                        value={`${greeting}${userProfile?.name ? `, ${userProfile.name.split(" ")[0]}` : ""}`}
                        tone="accent"
                        className="min-h-[112px] @[1320px]/overview:col-span-1"
                        valueClassName="text-foreground"
                        footer={
                            <div className="flex flex-wrap gap-1.5">
                                <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-black/2 px-3 py-1.5 text-[11px] font-medium text-muted-foreground dark:bg-white/3">
                                    <span className="size-1.5 rounded-full bg-foreground-secondary" />
                                    <span className="truncate">{scopeSummary}</span>
                                </div>
                                <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-black/2 px-3 py-1.5 text-[11px] font-medium text-muted-foreground dark:bg-white/3">
                                    <span className="size-1.5 rounded-full bg-muted-foreground" />
                                    <span className="truncate">{activitySummary}</span>
                                </div>
                            </div>
                        }
                    />
                )}

                <SectionCards
                    data={filteredFinanceData}
                    isLoading={isLoading}
                    variant="dashboard"
                    className="h-full @[1320px]/overview:col-span-4"
                />
            </div>
        </div>
    )
}
