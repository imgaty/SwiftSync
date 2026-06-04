//
//  dashboard-module-grid.tsx
//  Argent
//
//  Created by hilario on 27 May 2026 at 17:53.
//  Description: Implements the Dashboard module grid dashboard module for Argent, shaping financial
//  summary content, supporting states, and interactions used by the dashboard experience.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import * as React from "react"

import { DashboardSupportSidebar } from "@/components/dashboard/dashboard-support-sidebar"
import { cn } from "@/lib/utils"

export type DashboardModuleId = "analytics" | "recentActivity" | "financialFocus"

export interface DashboardModule {
    id: DashboardModuleId
    title: string
    node: React.ReactNode
}

const PRIMARY_MODULE_ID: DashboardModuleId = "analytics"
const SUPPORTING_MODULE_IDS: DashboardModuleId[] = ["recentActivity", "financialFocus"]

function DashboardModuleSlot({
    className,
    dashboardModule,
    zone,
}: {
    dashboardModule: DashboardModule
    className?: string
    zone: "primary" | "supporting"
}) {
    return (
        <section
            aria-label={dashboardModule.title}
            className={cn(
                "flex min-h-0 min-w-0 overflow-visible",
                className,
            )}
            data-dashboard-module={dashboardModule.id}
            data-dashboard-zone={zone}
        >
            {dashboardModule.node}
        </section>
    )
}

function getCuratedModules(modules: DashboardModule[]) {
    const modulesById = new Map(modules.map((dashboardModule) => [dashboardModule.id, dashboardModule]))
    const primaryModule = modulesById.get(PRIMARY_MODULE_ID) ?? modules[0] ?? null
    const usedIds = new Set<DashboardModuleId>(primaryModule ? [primaryModule.id] : [])
    const supportingModules: DashboardModule[] = []

    for (const moduleId of SUPPORTING_MODULE_IDS) {
        const dashboardModule = modulesById.get(moduleId)
        if (!dashboardModule || usedIds.has(dashboardModule.id)) continue
        supportingModules.push(dashboardModule)
        usedIds.add(dashboardModule.id)
    }

    for (const dashboardModule of modules) {
        if (usedIds.has(dashboardModule.id)) continue
        supportingModules.push(dashboardModule)
        usedIds.add(dashboardModule.id)
    }

    return {
        primaryModule,
        supportingModules,
    }
}

export function DashboardModuleGrid({
    modules,
}: {
    modules: DashboardModule[]
}) {
    const { primaryModule, supportingModules } = React.useMemo(() => getCuratedModules(modules), [modules])

    return (
        <div
            className="grid min-w-0 items-stretch gap-4 overflow-visible @[900px]/main:min-h-0 @[900px]/main:flex-1 @[900px]/main:grid-cols-[minmax(0,1fr)_minmax(280px,320px)] @[1320px]/main:grid-cols-5"
            data-dashboard-grid
            data-dashboard-layout="command-center"
        >
            {primaryModule && (
                <DashboardModuleSlot
                    dashboardModule={primaryModule}
                    zone="primary"
                    className="min-h-[420px] @[900px]/main:min-h-0 @[1320px]/main:col-span-4"
                />
            )}

            {supportingModules.length > 0 && (
                <DashboardSupportSidebar className="@[1320px]/main:col-span-1">
                    {supportingModules.map((dashboardModule) => (
                        <DashboardModuleSlot
                            key={dashboardModule.id}
                            dashboardModule={dashboardModule}
                            zone="supporting"
                            className="min-h-[220px] @[900px]/main:flex-1"
                        />
                    ))}
                </DashboardSupportSidebar>
            )}
        </div>
    )
}
