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

import type * as React from "react"
import { Activity, WalletCards } from "lucide-react"

import {
    DashboardMetricCard,
    DashboardMetricCardSkeleton,
} from "@/components/dashboard/dashboard-primitives"
import { SectionCards } from "@/components/section-cards"
import { SmartTooltip } from "@/components/ui/tooltip"
import type {
    DashboardLabels,
    DashboardUserProfile,
} from "@/components/dashboard/types"
import { UDS } from "@/lib/UDS"
import type { FinanceData } from "@/lib/types"
import { cn } from "@/lib/utils"

function DashboardOverviewStatus({
    glyph: Glyph,
    label,
}: {
    glyph: React.ComponentType<{ className?: string }>
    label: string
}) {
    return (
        <SmartTooltip text={label} group="dashboard-overview-status" forceSide="bottom">
            <span
                role="img"
                tabIndex={0}
                aria-label={label}
                className={cn(
                    UDS.inlineSurface,
                    "inline-flex size-8 shrink-0 items-center justify-center text-muted-foreground outline-none transition-colors hover:text-foreground",
                    "focus-visible:ring-2 focus-visible:ring-focus/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                )}
            >
                <Glyph className="size-3.5" />
            </span>
        </SmartTooltip>
    )
}

export function DashboardOverview({
    activitySummary,
    dashboardLabels,
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
    const scopeTooltip = `${dashboardLabels.accounts}: ${scopeSummary}`
    const activityTooltip = `${dashboardLabels.activityPulse}: ${activitySummary}`

    return (
        <div className="@container/overview min-w-0">
            <div className="grid gap-4 @[980px]/overview:grid-cols-[minmax(260px,0.34fr)_minmax(0,1fr)] @[980px]/overview:items-stretch @[1320px]/overview:grid-cols-5">
                {isLoading || isProfileLoading ? (
                    <DashboardMetricCardSkeleton showIcon={false} className="@[1320px]/overview:col-span-1" />
                ) : (
                    <DashboardMetricCard
                        label={formattedDate}
                        value={`${greeting}${userProfile?.name ? `, ${userProfile.name.split(" ")[0]}` : ""}`}
                        className="min-h-[112px] @[1320px]/overview:col-span-1"
                        valueClassName="text-foreground"
                        footer={
                            <div className="flex flex-wrap gap-1.5">
                                <DashboardOverviewStatus glyph={WalletCards} label={scopeTooltip} />
                                <DashboardOverviewStatus glyph={Activity} label={activityTooltip} />
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
