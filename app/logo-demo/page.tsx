//
//  page.tsx
//  Argent
//
//  Created by Hilario Ferreira on 31 May 2026 at 00:00.
//  Description: Provides an isolated dashboard skeleton page for logo presentation screenshots.
//
import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import * as React from "react"

import { CanvasBackground } from "@/components/canvas-background"
import { Skeleton } from "@/components/ui/skeleton"
import {
    CollapsedTooltip,
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarHeader,
    SidebarInset,
    SidebarMenu,
    SidebarMenuItem,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar"
import { UDS } from "@/lib/UDS"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
    title: "Logo Demo | Argent",
}

const DASHBOARD_CARD_SURFACE = cn(
    UDS.cardSurface,
    UDS.cardFlatShadow,
    "relative flex min-w-0 flex-col justify-between gap-4 overflow-hidden p-4 text-foreground",
)

const DASHBOARD_GLASS_SURFACE = cn(
    UDS.cardSurface,
    "relative text-foreground",
)

function DemoSkeleton({ className, style, ...props }: React.ComponentProps<typeof Skeleton>) {
    return (
        <Skeleton
            aria-hidden
            className={cn("bg-foreground/[0.055] dark:bg-foreground/[0.08]", className)}
            style={{ ...style, animation: "none" }}
            {...props}
        />
    )
}

function SidebarNavSkeleton() {
    return (
        <SidebarGroup className="px-2 pt-1 pb-2">
            <SidebarMenu>
                {Array.from({ length: 8 }).map((_, index) => (
                    <SidebarMenuItem key={index}>
                        <CollapsedTooltip asChild>
                            <div>
                                <DemoSkeleton className="size-4 shrink-0 sq-md" />
                                <DemoSkeleton className={cn("h-4 group-data-[collapsible=icon]:hidden", index % 3 === 0 ? "w-28" : index % 3 === 1 ? "w-20" : "w-24")} />
                            </div>
                        </CollapsedTooltip>
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarGroup>
    )
}

function DemoSidebar() {
    return (
        <Sidebar variant="inset" collapsible="icon">
            <SidebarHeader className="px-2 pt-2 pb-1">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <CollapsedTooltip asChild size="lg" tooltip="Argent" className="group-data-[collapsible=icon]:p-1!">
                            <Link href="/logo-demo" aria-label="Argent">
                                <span className="flex min-w-0 flex-1 items-center justify-start text-sidebar-foreground group-data-[collapsible=icon]:hidden">
                                    <Image
                                        src="/full-icon-black.svg"
                                        alt=""
                                        width={369}
                                        height={104}
                                        priority
                                        aria-hidden
                                        draggable={false}
                                        className="h-8 w-[114px] max-w-full shrink-0 object-contain dark:hidden"
                                    />
                                    <Image
                                        src="/full-icon-white.svg"
                                        alt=""
                                        width={369}
                                        height={104}
                                        priority
                                        aria-hidden
                                        draggable={false}
                                        className="hidden h-8 w-[114px] max-w-full shrink-0 object-contain dark:block"
                                    />
                                </span>
                                <span className="hidden shrink-0 items-center justify-start text-sidebar-foreground group-data-[collapsible=icon]:flex">
                                    <Image
                                        src="/icon-black.svg"
                                        alt=""
                                        width={84}
                                        height={78}
                                        priority
                                        aria-hidden
                                        draggable={false}
                                        className="block size-6 shrink-0 object-contain dark:hidden"
                                    />
                                    <Image
                                        src="/icon-white.svg"
                                        alt=""
                                        width={84}
                                        height={78}
                                        priority
                                        aria-hidden
                                        draggable={false}
                                        className="hidden size-6 shrink-0 object-contain dark:block"
                                    />
                                </span>
                            </Link>
                        </CollapsedTooltip>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent className="pt-1">
                <SidebarNavSkeleton />
            </SidebarContent>

            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <CollapsedTooltip size="lg">
                            <DemoSkeleton className="size-8 shrink-0 sq-lg" />
                            <div className="grid min-w-0 flex-1 gap-1 text-left group-data-[collapsible=icon]:hidden">
                                <DemoSkeleton className="h-3.5 w-24 max-w-full" />
                                <DemoSkeleton className="h-3 w-32 max-w-full" />
                            </div>
                            <DemoSkeleton className="ml-auto size-4 shrink-0 sq-md group-data-[collapsible=icon]:hidden" />
                        </CollapsedTooltip>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    )
}

function HeaderSkeleton() {
    return (
        <header className="shrink-0">
            <div className="flex min-w-0 items-center gap-3">
                <SidebarTrigger />
                <div aria-hidden className={cn(UDS.separatorVertical, "mx-1 h-4")} />
                <DemoSkeleton className="hidden h-4 w-20 md:block" />

                <div className="ml-auto flex items-center gap-2">
                    <DemoSkeleton className="h-7 w-24 sq-full" />
                    <DemoSkeleton className="size-7 sq-full" />
                    <DemoSkeleton className="size-7 sq-full" />
                    <div aria-hidden className={cn(UDS.separatorVertical, "mx-1 h-4")} />
                    <DemoSkeleton className="size-8 sq-full" />
                    <div aria-hidden className={cn(UDS.separatorVertical, "mx-1 h-4")} />
                    <DemoSkeleton className="size-8 sq-full" />
                </div>
            </div>
        </header>
    )
}

function MetricCardSkeleton({
    className,
    showIcon = true,
}: {
    className?: string
    showIcon?: boolean
}) {
    return (
        <div className={cn(DASHBOARD_CARD_SURFACE, "min-h-[112px]", className)}>
            <div className="flex min-w-0 items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                    {showIcon && <DemoSkeleton className="size-4 sq-md" />}
                    <DemoSkeleton className="h-3.5 w-24 max-w-full" />
                </div>
                <DemoSkeleton className="size-4 sq-md" />
            </div>
            <div className="space-y-2">
                <DemoSkeleton className="h-6 w-28 max-w-full" />
                <DemoSkeleton className="h-3 w-32 max-w-full" />
            </div>
        </div>
    )
}

function DashboardStatCardSkeleton() {
    return (
        <div
            className={cn(
                UDS.cardSurface,
                "relative flex h-full min-h-[132px] flex-col justify-between overflow-hidden p-4",
            )}
        >
            <div className="flex min-w-0 items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                    <DemoSkeleton className="size-5 shrink-0 sq-md" />
                    <DemoSkeleton className="h-4 w-24 max-w-full" />
                </div>
                <DemoSkeleton className="size-4 shrink-0 sq-md" />
            </div>
            <div className="flex min-w-0 items-end justify-between gap-4">
                <DemoSkeleton className="h-4 w-28 max-w-full" />
                <DemoSkeleton className="h-8 w-20 shrink-0" />
            </div>
        </div>
    )
}

function OverviewSkeleton() {
    return (
        <div className="@container/overview min-w-0">
            <div className="grid gap-4 @[980px]/overview:grid-cols-[minmax(260px,0.34fr)_minmax(0,1fr)] @[980px]/overview:items-stretch @[1320px]/overview:grid-cols-5">
                <MetricCardSkeleton showIcon={false} className="@[1320px]/overview:col-span-1" />
                <div className="grid h-full grid-cols-2 gap-4 @[1120px]/overview:grid-cols-4 @[1320px]/overview:col-span-4">
                    <DashboardStatCardSkeleton />
                    <DashboardStatCardSkeleton />
                    <DashboardStatCardSkeleton />
                    <DashboardStatCardSkeleton />
                </div>
            </div>
        </div>
    )
}

function SurfaceShell({
    children,
    className,
    tools = 1,
}: {
    children: React.ReactNode
    className?: string
    tools?: number
}) {
    return (
        <div className={cn(DASHBOARD_GLASS_SURFACE, "relative flex h-full min-h-0 flex-col overflow-hidden p-4", className)}>
            <div className="flex shrink-0 items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                    <DemoSkeleton className="size-4 shrink-0 sq-md" />
                    <DemoSkeleton className="h-3.5 w-32 max-w-full" />
                </div>
                <div className="flex min-h-7 shrink-0 items-center justify-end gap-1.5 overflow-hidden">
                    {Array.from({ length: tools }).map((_, index) => (
                        <DemoSkeleton key={index} className={index === 0 && tools > 1 ? "h-8 w-28 sq-full" : "size-7 sq-full"} />
                    ))}
                </div>
            </div>
            <div aria-hidden className={cn(UDS.separator, "mb-3 mt-2 shrink-0")} />
            <div className="min-h-0 flex-1 overflow-hidden">
                {children}
            </div>
        </div>
    )
}

function ChartSkeleton() {
    const bars = [58, 76, 48, 69, 84, 62, 92, 56, 73, 51, 79, 66]

    return (
        <div className="flex h-full min-h-[280px] w-full min-w-0 flex-col overflow-hidden">
            <div className={cn("flex shrink-0 flex-row items-center border-b px-0 pb-2.5", UDS.cardDivider)}>
                <div className="flex w-full flex-wrap items-center justify-between gap-2">
                    <div className="flex shrink-0 items-center gap-2">
                        <DemoSkeleton className="h-8 w-44 sq-full" />
                        <DemoSkeleton className="h-8 w-10 sq-full" />
                    </div>
                    <div aria-hidden className={cn(UDS.separatorVertical, "hidden h-6 sm:block")} />
                    <div className="flex shrink-0 items-center gap-2">
                        <DemoSkeleton className="h-8 w-36 sq-full" />
                        <DemoSkeleton className="h-8 w-10 sq-full" />
                    </div>
                </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col px-0 pt-3">
                <div className="flex min-h-0 flex-1 flex-wrap items-stretch gap-y-4">
                    <div className="flex min-h-0 grow shrink basis-[280px] items-stretch">
                        <div className={cn("relative flex min-h-0 w-full overflow-hidden", UDS.cardSurface, "sq-10 p-4")}>
                            <div className="grid min-h-0 w-full grid-cols-[2rem_minmax(0,1fr)] grid-rows-[1fr_1.25rem] gap-3">
                                <div className="flex flex-col justify-between py-1">
                                    {Array.from({ length: 5 }).map((_, index) => (
                                        <DemoSkeleton key={index} className="h-2 w-5" />
                                    ))}
                                </div>
                                <div className="relative overflow-hidden">
                                    <div className="absolute inset-x-0 top-1/4 border-t border-dashed border-border/40" />
                                    <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-border/40" />
                                    <div className="absolute inset-x-0 top-3/4 border-t border-dashed border-border/40" />
                                    <div className="absolute inset-x-2 bottom-1 top-3 flex items-end gap-2">
                                        {bars.map((height, index) => (
                                            <DemoSkeleton
                                                key={index}
                                                className="w-full min-w-2 sq-md"
                                                style={{ height: `${height}%` }}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <div />
                                <div className="grid grid-cols-6 gap-3">
                                    {Array.from({ length: 6 }).map((_, index) => (
                                        <DemoSkeleton key={index} className="h-2 w-full" />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function AnalyticsInsightStripSkeleton() {
    return (
        <div className="grid shrink-0 grid-cols-4 gap-2.5 overflow-hidden">
            {Array.from({ length: 4 }).map((_, index) => (
                <div
                    key={index}
                    className={cn(
                        UDS.cardSurface,
                        UDS.cardFlatShadow,
                        "relative min-w-0 overflow-hidden sq-10 px-3 py-2.5",
                    )}
                >
                    <div className="flex min-w-0 items-center gap-2">
                        <DemoSkeleton className="size-4 shrink-0 sq-md" />
                        <DemoSkeleton className="h-3 w-20 max-w-full" />
                    </div>
                    <div className="mt-2 grid min-w-0 gap-1">
                        <DemoSkeleton className="h-4 w-24 max-w-full" />
                        <DemoSkeleton className="h-3 w-20 max-w-full" />
                    </div>
                </div>
            ))}
        </div>
    )
}

function AnalyticsSkeleton() {
    return (
        <SurfaceShell className="min-h-0 gap-0" tools={2}>
            <div className="flex h-full min-h-0 min-w-0 flex-col gap-3 overflow-hidden">
                <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
                    <ChartSkeleton />
                </div>
                <div aria-hidden className={cn(UDS.separator, "my-0")} />
                <AnalyticsInsightStripSkeleton />
            </div>
        </SurfaceShell>
    )
}

function LinesSkeleton({ rows = 4 }: { rows?: number }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: rows }).map((_, index) => (
                <div key={index} className="flex items-center gap-3 px-1 py-1.5">
                    <DemoSkeleton className="size-8 sq-lg" />
                    <div className="min-w-0 flex-1 space-y-1.5">
                        <DemoSkeleton className="h-3.5 w-36 max-w-full" />
                        <DemoSkeleton className="h-3 w-28 max-w-full" />
                    </div>
                    <DemoSkeleton className="h-4 w-16" />
                </div>
            ))}
        </div>
    )
}

function FocusSkeleton() {
    return (
        <div className="space-y-4">
            <section className="space-y-2.5">
                <div className="flex items-center justify-between gap-3 px-1">
                    <DemoSkeleton className="h-3 w-28" />
                    <DemoSkeleton className="h-3 w-8" />
                </div>
                <div className="space-y-2">
                    {Array.from({ length: 2 }).map((_, index) => (
                        <div key={index} className="block px-2.5 py-2.5">
                            <div className="mb-2 flex min-w-0 items-center justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-2">
                                    <DemoSkeleton className="size-2.5 shrink-0 sq-full" />
                                    <DemoSkeleton className="h-3.5 w-24" />
                                </div>
                                <DemoSkeleton className="h-3.5 w-20" />
                            </div>
                            <div className={cn("h-1.5 overflow-hidden sq-full", UDS.subtleFill)}>
                                <DemoSkeleton className={cn("h-full sq-full", index === 0 ? "w-4/5" : "w-2/3")} />
                            </div>
                        </div>
                    ))}
                </div>
            </section>
            <div aria-hidden className={cn(UDS.separator, "my-0")} />
            <LinesSkeleton rows={2} />
        </div>
    )
}

function ModuleGridSkeleton() {
    return (
        <div
            className="grid min-w-0 gap-4 overflow-visible @[900px]/main:min-h-0 @[900px]/main:flex-1 @[900px]/main:overflow-hidden @[900px]/main:grid-cols-[minmax(0,1fr)_minmax(280px,320px)] @[1320px]/main:grid-cols-5"
            data-dashboard-grid
            data-dashboard-layout="command-center"
        >
            <section className="min-h-[420px] min-w-0 overflow-visible @[900px]/main:h-full @[900px]/main:min-h-0 @[1320px]/main:col-span-4">
                <div className="flex h-full min-h-0 flex-col overflow-hidden">
                    <AnalyticsSkeleton />
                </div>
            </section>

            <aside className="min-w-0 @[900px]/main:flex @[900px]/main:min-h-0 @[900px]/main:flex-col @[900px]/main:overflow-hidden @[1320px]/main:col-span-1">
                <div className="min-w-0 @[900px]/main:min-h-0 @[900px]/main:flex-1 @[900px]/main:overflow-hidden">
                    <div className="min-w-0 @[900px]/main:h-full @[900px]/main:min-h-0 @[900px]/main:overflow-y-auto">
                        <div className="grid min-w-0 gap-4 @[760px]/main:grid-cols-2 @[900px]/main:flex @[900px]/main:h-full @[900px]/main:min-h-0 @[900px]/main:flex-col">
                            <section className="min-h-[220px] min-w-0 overflow-visible @[900px]/main:flex-1">
                                <div className="flex h-full min-h-0 flex-col overflow-hidden">
                                    <SurfaceShell className="min-h-[260px] lg:min-h-0" tools={1}>
                                        <div className="overflow-auto pr-1">
                                            <LinesSkeleton rows={4} />
                                        </div>
                                    </SurfaceShell>
                                </div>
                            </section>
                            <section className="min-h-[220px] min-w-0 overflow-visible @[900px]/main:flex-1">
                                <div className="flex h-full min-h-0 flex-col overflow-hidden">
                                    <SurfaceShell className="min-h-[300px] lg:min-h-0" tools={2}>
                                        <div className="overflow-auto pr-1">
                                            <FocusSkeleton />
                                        </div>
                                    </SurfaceShell>
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            </aside>
        </div>
    )
}

export default function LogoDemoPage() {
    return (
        <SidebarProvider defaultOpen defaultSide="left" defaultWidth={240} showRail>
            <DemoSidebar />

            <SidebarInset>
                <CanvasBackground inset />
                <div className="relative z-1 flex min-h-0 min-w-0 flex-1 flex-col">
                    <div className="@container/main flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-visible p-3 md:h-full md:overflow-hidden md:p-4">
                        <HeaderSkeleton />

                        <div
                            className="flex min-w-0 flex-col gap-4 overflow-visible @[900px]/main:min-h-0 @[900px]/main:flex-1 @[900px]/main:overflow-hidden"
                            data-dashboard-priority-layout="drawer"
                        >
                            <div className="shrink-0">
                                <OverviewSkeleton />
                            </div>

                            <ModuleGridSkeleton />
                        </div>
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}
