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
    const scrollRef = React.useRef<HTMLDivElement>(null)
    const [scrollState, setScrollState] = React.useState({ top: false, bottom: false })

    const updateScrollState = React.useCallback(() => {
        const node = scrollRef.current
        if (!node) return

        const canScroll = node.scrollHeight - node.clientHeight > 1
        const top = canScroll && node.scrollTop > 1
        const bottom = canScroll && node.scrollTop + node.clientHeight < node.scrollHeight - 1

        setScrollState((current) => (
            current.top === top && current.bottom === bottom
                ? current
                : { top, bottom }
        ))
    }, [])

    React.useEffect(() => {
        const node = scrollRef.current
        if (!node) return

        updateScrollState()

        const resizeObserver = new ResizeObserver(updateScrollState)
        resizeObserver.observe(node)
        if (node.firstElementChild) resizeObserver.observe(node.firstElementChild)

        window.addEventListener("resize", updateScrollState)

        return () => {
            resizeObserver.disconnect()
            window.removeEventListener("resize", updateScrollState)
        }
    }, [children, updateScrollState])

    return (
        <aside
            className={cn(
                "min-w-0 @[900px]/main:flex @[900px]/main:min-h-0 @[900px]/main:flex-col @[900px]/main:overflow-hidden",
                className,
            )}
            data-dashboard-sidebar="support"
            data-dashboard-zone="supporting"
        >
            <div
                className="dashboard-sidebar-scroll-wrap min-w-0 @[900px]/main:min-h-0 @[900px]/main:flex-1 @[900px]/main:overflow-hidden"
                data-scroll-top={scrollState.top ? "true" : undefined}
                data-scroll-bottom={scrollState.bottom ? "true" : undefined}
            >
                <div
                    ref={scrollRef}
                    className="dashboard-sidebar-scroll min-w-0 @[900px]/main:h-full @[900px]/main:min-h-0 @[900px]/main:overflow-y-auto"
                    onScroll={updateScrollState}
                >
                    <div className="grid min-w-0 gap-4 @[760px]/main:grid-cols-2 @[900px]/main:flex @[900px]/main:h-full @[900px]/main:min-h-0 @[900px]/main:flex-col">
                        {children}
                    </div>
                </div>
            </div>
        </aside>
    )
}
