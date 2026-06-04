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

import * as React from "react"
import Link from "next/link"
import { ArrowUpRight, ListChecks } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { DASHBOARD_ACTION_ACTIVE_CLASS } from "@/components/dashboard/dashboard-primitives"
import { UDS } from "@/lib/UDS"
import { cn } from "@/lib/utils"
import type {
    DashboardLabels,
    DashboardPriorityItem,
    DashboardPriorityTone,
} from "@/components/dashboard/types"

type PriorityBriefVariant = "cards" | "dropdown"

function PriorityBriefSkeleton({
    className,
    variant = "cards",
}: {
    className?: string
    variant?: PriorityBriefVariant
}) {
    if (variant === "dropdown") {
        return (
            <div className={cn("flex min-w-0 flex-col", className)}>
                {[0, 1, 2, 3].map((key) => (
                    <React.Fragment key={key}>
                        <div className="flex min-w-0 items-center gap-2.5 px-3 py-2.5">
                            <Skeleton className="size-4 shrink-0 sq-md" />
                            <div className="min-w-0 flex-1 space-y-1.5">
                                <Skeleton className="h-3.5 w-28 max-w-full" />
                                <Skeleton className="h-3 w-36 max-w-full" />
                            </div>
                            <Skeleton className="h-5 w-10 shrink-0" />
                        </div>
                        {key < 3 && <div aria-hidden className={cn(UDS.separator, "my-1")} />}
                    </React.Fragment>
                ))}
            </div>
        )
    }

    return (
        <div className={cn("flex min-w-0 flex-col", className)}>
            {[0, 1, 2, 3].map((key) => (
                <div key={key}>
                    <div className={cn(UDS.cardSurface, "relative flex min-h-[132px] flex-col justify-between p-4")}>
                        <div className="flex min-w-0 items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-2.5">
                                <Skeleton className="size-4 shrink-0 sq-md" />
                                <Skeleton className="h-3.5 w-28 max-w-full" />
                            </div>
                            <Skeleton className="size-4 shrink-0 sq-md" />
                        </div>
                        <div className="flex min-w-0 items-end justify-between gap-2">
                            <div className="min-w-0 space-y-1.5">
                                <Skeleton className="h-3.5 w-24 max-w-full" />
                                <Skeleton className="h-3 w-20 max-w-full" />
                            </div>
                            <Skeleton className="h-8 w-16 shrink-0" />
                        </div>
                    </div>
                    {key < 3 && <div aria-hidden className={cn(UDS.separator, "my-3")} />}
                </div>
            ))}
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
    card: string
    glow: string
    icon: string
    meta: string
    value: string
}> = {
    negative: {
        ...UDS.statCardTone.negative,
    },
    warning: {
        ...UDS.statCardTone.warning,
    },
    positive: {
        ...UDS.statCardTone.positive,
    },
    accent: {
        ...UDS.statCardTone.accent,
    },
    neutral: {
        ...UDS.statCardTone.neutral,
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

function PriorityBriefCard({
    item,
    status,
    onSelect,
}: {
    item: DashboardPriorityItem
    status: ReturnType<typeof getPriorityStatus>
    onSelect?: () => void
}) {
    const Icon = item.icon
    const itemStyles = PRIORITY_TONE_STYLES[item.tone]

    return (
        <Link
            href={item.href}
            role="listitem"
            aria-label={`${status.label}: ${item.label}`}
            onClick={onSelect}
            className={cn(
                UDS.cardSurface,
                "group relative flex min-h-[132px] min-w-0 flex-col justify-between overflow-hidden p-4",
                "text-foreground outline-none",
                "focus-visible:ring-2 focus-visible:ring-focus/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                itemStyles.card,
            )}
        >
            <span aria-hidden className={cn("pointer-events-none absolute inset-0 opacity-80", itemStyles.glow)} />
            <span className="relative flex min-w-0 items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2.5">
                    <Icon className={cn("size-5 shrink-0 stroke-[1.9]", itemStyles.icon)} />
                    <span className="truncate text-[15px] font-medium leading-5 text-foreground-secondary sm:text-[16px]">
                        {item.label}
                    </span>
                </span>
                <ArrowUpRight className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
            </span>

            <span className="relative flex min-w-0 items-end justify-between gap-2">
                <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium leading-5 text-muted-foreground">
                        {item.detail}
                    </span>
                    <span className={cn("mt-1 block truncate text-[11px] font-semibold leading-4 tabular-nums", itemStyles.meta)}>
                        {status.label}
                    </span>
                </span>
                <span className={cn("shrink-0 text-right text-[1.6rem] font-semibold leading-none tracking-normal tabular-nums sm:text-[1.7rem]", itemStyles.value)}>
                    {item.value}
                </span>
            </span>
        </Link>
    )
}

function PriorityBriefDropdownRow({
    item,
    status,
    onSelect,
}: {
    item: DashboardPriorityItem
    status: ReturnType<typeof getPriorityStatus>
    onSelect?: () => void
}) {
    const Icon = item.icon
    const itemStyles = PRIORITY_TONE_STYLES[item.tone]

    return (
        <Link
            href={item.href}
            role="listitem"
            aria-label={`${status.label}: ${item.label}`}
            data-glide-item={`priority-brief-${item.id}`}
            onClick={onSelect}
            className={cn(
                UDS.item,
                UDS.glideItem,
                UDS.itemIcon,
                "w-full min-w-0 items-start gap-2.5 px-3 py-2.5 text-foreground",
            )}
        >
            <Icon className={cn("mt-0.5 size-4 shrink-0 stroke-[1.9]", itemStyles.icon)} />
            <span className="min-w-0 flex-1">
                <span className="flex min-w-0 items-baseline justify-between gap-2">
                    <span className="truncate text-[13px] font-medium leading-4 text-foreground-secondary">
                        {item.label}
                    </span>
                    <span className={cn("shrink-0 text-[12px] font-semibold leading-4 tabular-nums", itemStyles.value)}>
                        {item.value}
                    </span>
                </span>
                <span className="mt-0.5 flex min-w-0 items-center justify-between gap-2">
                    <span className="truncate text-[11px] leading-4 text-muted-foreground">
                        {item.detail}
                    </span>
                    <span className={cn("shrink-0 text-[10.5px] font-semibold leading-4 tabular-nums", itemStyles.meta)}>
                        {status.label}
                    </span>
                </span>
            </span>
            <ArrowUpRight className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
        </Link>
    )
}

export function DashboardPriorityBrief({
    dashboardLabels,
    isLoading,
    priorityItems,
    className,
    onSelect,
    variant = "cards",
}: {
    dashboardLabels: DashboardLabels
    isLoading: boolean
    priorityItems: DashboardPriorityItem[]
    className?: string
    onSelect?: () => void
    variant?: PriorityBriefVariant
}) {
    if (isLoading) {
        return <PriorityBriefSkeleton className={className} variant={variant} />
    }

    const priorityStatus = getPriorityStatus(priorityItems, dashboardLabels)
    const prioritizedItems = getPrioritizedItems(priorityItems)

    if (variant === "dropdown") {
        return (
            <div role="list" className={cn("flex min-w-0 flex-col", className)}>
                {prioritizedItems.map((item, index) => (
                    <React.Fragment key={item.id}>
                        <PriorityBriefDropdownRow item={item} status={priorityStatus} onSelect={onSelect} />
                        {index < prioritizedItems.length - 1 && (
                            <div aria-hidden className={cn(UDS.separator, "my-1")} />
                        )}
                    </React.Fragment>
                ))}
                <span className="sr-only">{dashboardLabels.needsReview}</span>
            </div>
        )
    }

    return (
        <div role="list" className={cn("flex min-w-0 flex-col", className)}>
            {prioritizedItems.map((item, index) => (
                <div key={item.id}>
                    <PriorityBriefCard item={item} status={priorityStatus} onSelect={onSelect} />
                    {index < prioritizedItems.length - 1 && (
                        <div aria-hidden className={cn(UDS.separator, "my-3")} />
                    )}
                </div>
            ))}
            <span className="sr-only">{dashboardLabels.needsReview}</span>
        </div>
    )
}

export function DashboardPriorityBriefDropdown({
    dashboardLabels,
    isLoading,
    priorityItems,
    className,
    variant = "glass",
    size = "icon",
}: {
    dashboardLabels: DashboardLabels
    isLoading: boolean
    priorityItems: DashboardPriorityItem[]
    className?: string
    variant?: React.ComponentProps<typeof Button>["variant"]
    size?: React.ComponentProps<typeof Button>["size"]
}) {
    const [open, setOpen] = React.useState(false)
    const priorityReviewCount = React.useMemo(() => (
        priorityItems.filter((item) => item.tone === "negative" || item.tone === "warning").length
    ), [priorityItems])
    const priorityStatus = React.useMemo(
        () => getPriorityStatus(priorityItems, dashboardLabels),
        [dashboardLabels, priorityItems],
    )

    return (
        <Tooltip>
        <Popover open={open} onOpenChange={setOpen}>
            <TooltipTrigger asChild>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant={variant}
                    size={size}
                    aria-label={dashboardLabels.priorityBrief}
                    aria-controls="dashboard-priority-dropdown"
                    aria-expanded={open}
                    className={cn("relative", className, open && DASHBOARD_ACTION_ACTIVE_CLASS)}
                >
                    <ListChecks />
                    {priorityReviewCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center sq-full bg-destructive text-destructive-foreground text-[10px] font-medium">
                            {priorityReviewCount > 9 ? "9+" : priorityReviewCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">
                {dashboardLabels.priorityBrief}
            </TooltipContent>
            <PopoverContent
                id="dashboard-priority-dropdown"
                align="end"
                className="w-[min(20rem,calc(100vw-1rem))] max-w-[20rem]"
                data-dashboard-priority-dropdown
            >
                <div className="flex min-w-0 items-start gap-2.5 px-3 pb-2 pt-2.5">
                    <ListChecks className="mt-0.5 size-4 shrink-0 text-foreground-secondary" />
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold leading-4 text-foreground">
                            {dashboardLabels.priorityBrief}
                        </p>
                        <p className="mt-1 truncate text-[11px] leading-4 text-muted-foreground">
                            {priorityStatus.label}
                        </p>
                    </div>
                </div>
                <div aria-hidden className={cn(UDS.separator, "my-1")} />
                <div className="max-h-[300px] overflow-y-auto">
                    <DashboardPriorityBrief
                        dashboardLabels={dashboardLabels}
                        isLoading={isLoading}
                        priorityItems={priorityItems}
                        onSelect={() => setOpen(false)}
                        variant="dropdown"
                    />
                </div>
            </PopoverContent>
        </Popover>
        </Tooltip>
    )
}
