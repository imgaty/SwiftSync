//
//  dashboard-support-sidebar.tsx
//  Argent
//
//  Created by hilario on 29 May 2026 at 19:34.
//  Description: Implements the Dashboard support sidebar dashboard module for Argent, shaping financial
//  summary content, supporting states, and interactions used by the dashboard experience.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

export function DashboardSupportSidebar({
    children,
    className,
}: {
    children: React.ReactNode
    className?: string
}) {
    return (
        <aside
            className={cn(
                "min-w-0 @[900px]/main:flex @[900px]/main:min-h-0 @[900px]/main:flex-col",
                className,
            )}
            data-dashboard-sidebar="support"
            data-dashboard-zone="supporting"
        >
            <div className="grid min-w-0 gap-4 @[760px]/main:grid-cols-2 @[900px]/main:flex @[900px]/main:min-h-0 @[900px]/main:flex-1 @[900px]/main:flex-col">
                {children}
            </div>
        </aside>
    )
}
