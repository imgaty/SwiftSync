//
//  dashboard-priority-brief.tsx
//  Argent
//
//  Created by hilario on 29 May 2026 at 16:50.
//  Description: Implements the Dashboard priority brief dashboard module for Argent, shaping financial
//  summary content, supporting states, and interactions used by the dashboard experience.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type {
    DashboardLabels,
    DashboardPriorityItem,
    DashboardPriorityTone,
} from "@/components/dashboard/types"

function PriorityBriefSkeleton({ className }: { className?: string }) {
    return (
        <div className={cn("flex min-w-0 flex-col gap-3", className)}>
            <div className="rounded-xl border border-border/60 bg-[color:color-mix(in_srgb,var(--surface-elevated)_54%,transparent)] p-3.5">
                <div className="flex items-center justify-between gap-3">
                    <Skeleton className="h-3 w-24 max-w-full" />
                    <Skeleton className="size-3 rounded-md" />
                </div>
                <div className="mt-4 flex items-end justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-2">
                        <Skeleton className="h-3.5 w-28 max-w-full" />
                        <Skeleton className="h-3 w-36 max-w-full" />
                    </div>
                    <Skeleton className="h-7 w-16 shrink-0" />
                </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-border/60 bg-[color:color-mix(in_srgb,var(--surface-elevated)_42%,transparent)]">
                {[0, 1, 2].map((key) => (
                    <div
                        key={key}
                        className={cn(
                            "flex min-h-[70px] items-center gap-3 px-3 py-2.5",
                            key > 0 && "border-t border-border/55",
                        )}
                    >
                        <Skeleton className="size-8 shrink-0 rounded-full" />
                        <div className="min-w-0 flex-1 space-y-2">
                            <Skeleton className="h-3.5 w-32 max-w-full" />
                            <Skeleton className="h-3 w-40 max-w-full" />
                        </div>
                        <Skeleton className="h-4 w-12 shrink-0" />
                    </div>
                ))}
            </div>
        </div>
    )
}

const PRIORITY_TONE_WEIGHT: Record<DashboardPriorityTone, number> = {
    negative: 0,
    warning: 1,
    positive: 2,
    accent: 3,
    neutral: 4,
}

const PRIORITY_TONE_STYLES: Record<DashboardPriorityTone, {
    icon: string
    rail: string
    summary: string
    value: string
}> = {
    negative: {
        icon: "text-red-500 dark:text-red-400",
        rail: "bg-red-500",
        summary: "border-red-500/20 bg-red-500/[0.04] dark:bg-red-500/[0.075]",
        value: "text-red-500 dark:text-red-400",
    },
    warning: {
        icon: "text-amber-500 dark:text-amber-400",
        rail: "bg-amber-500",
        summary: "border-amber-500/20 bg-amber-500/[0.045] dark:bg-amber-500/[0.08]",
        value: "text-amber-500 dark:text-amber-400",
    },
    positive: {
        icon: "text-emerald-500 dark:text-emerald-400",
        rail: "bg-emerald-500",
        summary: "border-emerald-500/20 bg-emerald-500/[0.035] dark:bg-emerald-500/[0.07]",
        value: "text-emerald-500 dark:text-emerald-400",
    },
    accent: {
        icon: "text-foreground-secondary",
        rail: "bg-foreground-secondary",
        summary: "border-border/70 bg-[color:color-mix(in_srgb,var(--surface-elevated)_58%,transparent)]",
        value: "text-foreground",
    },
    neutral: {
        icon: "text-muted-foreground",
        rail: "bg-muted-foreground",
        summary: "border-border/60 bg-[color:color-mix(in_srgb,var(--surface-elevated)_50%,transparent)]",
        value: "text-foreground",
    },
}

function getPrioritizedItems(priorityItems: DashboardPriorityItem[]) {
    const urgentItems = priorityItems
        .filter((item) => item.tone === "negative" || item.tone === "warning")
        .sort((a, b) => PRIORITY_TONE_WEIGHT[a.tone] - PRIORITY_TONE_WEIGHT[b.tone])

    if (urgentItems.length === 0) return priorityItems

    const urgentIds = new Set(urgentItems.map((item) => item.id))
    return [
        ...urgentItems,
        ...priorityItems.filter((item) => !urgentIds.has(item.id)),
    ]
}

function getPriorityStatus(priorityItems: DashboardPriorityItem[], dashboardLabels: DashboardLabels) {
    const reviewItems = priorityItems.filter((item) => item.tone === "negative" || item.tone === "warning")

    if (reviewItems.length === 0) {
        return {
            label: dashboardLabels.healthy,
            tone: "positive" as DashboardPriorityTone,
        }
    }

    return {
        label: `${reviewItems.length} ${dashboardLabels.needsReview}`,
        tone: reviewItems.some((item) => item.tone === "negative")
            ? ("negative" as DashboardPriorityTone)
            : ("warning" as DashboardPriorityTone),
    }
}

function PriorityBriefSummary({
    item,
    status,
}: {
    item: DashboardPriorityItem
    status: ReturnType<typeof getPriorityStatus>
}) {
    const Icon = item.icon
    const itemStyles = PRIORITY_TONE_STYLES[item.tone]
    const statusStyles = PRIORITY_TONE_STYLES[status.tone]

    return (
        <Link
            href={item.href}
            aria-label={`${status.label}: ${item.label}`}
            className={cn(
                "relative flex min-w-0 flex-col overflow-hidden rounded-xl border p-3.5",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                statusStyles.summary,
            )}
        >
            <div className="flex min-w-0 items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                    <Icon className={cn("size-3.5 shrink-0", itemStyles.icon)} />
                    <span className="truncate text-[12px] font-medium leading-4 text-foreground-secondary">
                        {item.label}
                    </span>
                </div>
                <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground" />
            </div>

            <div className="mt-4 flex min-w-0 items-end justify-between gap-4">
                <div className="min-w-0">
                    <p className="truncate text-[11px] leading-4 text-muted-foreground">
                        {item.detail}
                    </p>
                </div>
                <div className={cn("shrink-0 text-right text-[1.55rem] font-semibold leading-none tabular-nums tracking-normal", itemStyles.value)}>
                    {item.value}
                </div>
            </div>
        </Link>
    )
}

function PriorityBriefRow({
    index,
    item,
}: {
    index: number
    item: DashboardPriorityItem
}) {
    const Icon = item.icon
    const toneStyles = PRIORITY_TONE_STYLES[item.tone]

    return (
        <Link
            href={item.href}
            role="listitem"
            aria-label={item.label}
            className={cn(
                "relative flex min-h-[70px] min-w-0 items-center gap-3 px-3 py-2.5",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus/70",
                index > 0 && "border-t border-border/55",
            )}
        >
            <span className={cn("absolute bottom-3 left-0 top-3 w-0.5 rounded-full", toneStyles.rail)} />
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border/55 bg-[color:color-mix(in_srgb,var(--surface-elevated)_58%,transparent)]">
                <Icon className={cn("size-3.5", toneStyles.icon)} />
            </span>

            <span className="grid min-w-0 flex-1 gap-1">
                <span className="flex min-w-0 items-center justify-between gap-2">
                    <span className="truncate text-[12px] font-medium leading-4 text-foreground-secondary">
                        {item.label}
                    </span>
                    <span className={cn("shrink-0 text-[13px] font-semibold leading-none tabular-nums tracking-normal", toneStyles.value)}>
                        {item.value}
                    </span>
                </span>
                <span className="truncate text-[11px] leading-4 text-muted-foreground">
                    {item.detail}
                </span>
            </span>

            <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground/75" />
        </Link>
    )
}

export function DashboardPriorityBrief({
    dashboardLabels,
    isLoading,
    priorityItems,
    className,
}: {
    dashboardLabels: DashboardLabels
    isLoading: boolean
    priorityItems: DashboardPriorityItem[]
    className?: string
}) {
    if (isLoading) {
        return <PriorityBriefSkeleton className={className} />
    }

    const [leadItem, ...supportingItems] = getPrioritizedItems(priorityItems)
    const status = getPriorityStatus(priorityItems, dashboardLabels)

    return (
        <div className={cn("flex min-w-0 flex-col gap-3", className)}>
            {leadItem && (
                <PriorityBriefSummary item={leadItem} status={status} />
            )}
            <div
                role="list"
                className="overflow-hidden rounded-xl border border-border/60 bg-[color:color-mix(in_srgb,var(--surface-elevated)_42%,transparent)]"
            >
                {supportingItems.map((item, index) => (
                    <PriorityBriefRow key={item.id} item={item} index={index} />
                ))}
            </div>
            <span className="sr-only">{dashboardLabels.needsReview}</span>
        </div>
    )
}
