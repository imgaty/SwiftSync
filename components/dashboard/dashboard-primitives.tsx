//
//  dashboard-primitives.tsx
//  Argent
//
//  Created by hilario on 22 May 2026 at 21:31.
//  Description: Implements the Dashboard primitives dashboard module for Argent, shaping financial
//  summary content, supporting states, and interactions used by the dashboard experience.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import * as React from "react"
import { EmptyState } from "@/components/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { TabSwitcher, TabSwitcherItem } from "@/components/ui/tab-switcher"
import { PRISM } from "@/lib/PRISM"
import { cn } from "@/lib/utils"
import type { DashboardIcon } from "@/components/dashboard/types"

export const DASHBOARD_GLASS_SURFACE = cn(
    PRISM.cardSurface,
    "spotlight-surface relative",
    "text-foreground",
)

export const DASHBOARD_INLINE_SURFACE = cn(
    PRISM.cardSurface,
)

export const DASHBOARD_FLAT_SURFACE_SHADOW =
    PRISM.cardFlatShadow

export const DASHBOARD_ACTION_SURFACE = cn(
    DASHBOARD_INLINE_SURFACE,
    PRISM.cardHover,
    "text-foreground-secondary transition-colors hover:text-foreground",
)

export const DASHBOARD_ROW_HOVER = "rounded-[12px] transition-colors hover:bg-white/40 dark:hover:bg-white/[0.045]"

export const DASHBOARD_TITLE_CLASS = "truncate text-[13px] font-medium tracking-tight text-foreground-secondary sm:text-[14px]"

export const DASHBOARD_ACTION_BUTTON_CLASS = "size-7 rounded-full text-foreground-secondary hover:text-foreground"

export const DASHBOARD_ACTION_ICON_CLASS = "size-3.5"

export type DashboardCardTone = "neutral" | "positive" | "negative" | "warning" | "accent"

const DASHBOARD_CARD_TONE_STYLES: Record<DashboardCardTone, { icon: string; value: string; dot: string }> = {
    positive: {
        icon: "text-emerald-400",
        value: "text-emerald-400",
        dot: "bg-emerald-500",
    },
    negative: {
        icon: "text-red-400",
        value: "text-red-400",
        dot: "bg-red-500",
    },
    warning: {
        icon: "text-amber-400",
        value: "text-amber-400",
        dot: "bg-amber-500",
    },
    accent: {
        icon: "text-foreground-secondary",
        value: "text-foreground",
        dot: "bg-foreground-secondary",
    },
    neutral: {
        icon: "text-foreground-secondary",
        value: "text-foreground",
        dot: "bg-muted-foreground",
    },
}

export const DASHBOARD_CARD_SURFACE = cn(
    PRISM.cardSurface,
    DASHBOARD_FLAT_SURFACE_SHADOW,
    "relative flex min-w-0 flex-col justify-between gap-4 overflow-hidden p-4 text-foreground",
)

export const DASHBOARD_CARD_ICON_BADGE = "inline-flex shrink-0 items-center justify-center leading-none text-foreground-secondary"

export function getDashboardCardToneStyles(tone: DashboardCardTone = "neutral") {
    return DASHBOARD_CARD_TONE_STYLES[tone]
}

export function DashboardIconBadge({
    className,
    icon: Icon,
    iconClassName,
}: {
    className?: string
    icon: DashboardIcon
    iconClassName?: string
}) {
    return (
        <span className={cn(DASHBOARD_CARD_ICON_BADGE, className)}>
            <Icon className={cn("size-4 text-current", iconClassName)} />
        </span>
    )
}

export interface DashboardMetricCardProps extends React.HTMLAttributes<HTMLDivElement> {
    action?: React.ReactNode
    detail?: React.ReactNode
    detailClassName?: string
    footer?: React.ReactNode
    icon?: DashboardIcon
    iconBadgeClassName?: string
    iconClassName?: string
    label: React.ReactNode
    labelClassName?: string
    tone?: DashboardCardTone
    value: React.ReactNode
    valueClassName?: string
}

export const DashboardMetricCard = React.forwardRef<HTMLDivElement, DashboardMetricCardProps>(
    function DashboardMetricCard({
        action,
        children,
        className,
        detail,
        detailClassName,
        footer,
        icon,
        iconBadgeClassName,
        iconClassName,
        label,
        labelClassName,
        tone = "neutral",
        value,
        valueClassName,
        ...props
    }, ref) {
        const toneStyles = getDashboardCardToneStyles(tone)

        return (
            <div
                ref={ref}
                className={cn(DASHBOARD_CARD_SURFACE, className)}
                {...props}
            >
                <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                        {icon && (
                            <DashboardIconBadge
                                icon={icon}
                                iconClassName={iconClassName}
                                className={cn(toneStyles.icon, iconBadgeClassName)}
                            />
                        )}
                        <div className={cn("min-w-0", DASHBOARD_TITLE_CLASS, labelClassName)}>
                            {label}
                        </div>
                    </div>
                    {action && (
                        <div className="shrink-0 text-muted-foreground">
                            {action}
                        </div>
                    )}
                </div>

                <div className="min-w-0">
                    <div className={cn("truncate text-xl font-semibold leading-none tabular-nums", toneStyles.value, valueClassName)}>
                        {value}
                    </div>
                    {detail && (
                        <div className={cn("mt-2 flex min-w-0 items-center gap-2 text-[11px] font-medium text-muted-foreground", detailClassName)}>
                            <span className={cn("size-1.5 shrink-0 rounded-full", toneStyles.dot)} />
                            <div className="min-w-0 truncate">
                                {detail}
                            </div>
                        </div>
                    )}
                    {children}
                </div>

                {footer && (
                    <div className="min-w-0">
                        {footer}
                    </div>
                )}
            </div>
        )
    },
)

export function DashboardMetricCardSkeleton({ className, showIcon = true }: { className?: string; showIcon?: boolean }) {
    return (
        <div className={cn(DASHBOARD_CARD_SURFACE, "min-h-[112px]", className)}>
            <div className="flex min-w-0 items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                    {showIcon && <Skeleton className="size-4 rounded-md" />}
                    <Skeleton className="h-3.5 w-24 max-w-full" />
                </div>
                <Skeleton className="size-4 rounded-md" />
            </div>
            <div className="space-y-2">
                <Skeleton className="h-6 w-28 max-w-full" />
                <Skeleton className="h-3 w-32 max-w-full" />
            </div>
        </div>
    )
}

export function DashboardSurface({
    title,
    icon: Icon,
    action,
    children,
    className,
    bodyClassName,
}: {
    title: string
    icon: DashboardIcon
    action?: React.ReactNode
    children: React.ReactNode
    className?: string
    bodyClassName?: string
}) {
    return (
        <div
            className={cn(
                DASHBOARD_GLASS_SURFACE,
                "relative flex h-full min-h-0 flex-col overflow-hidden p-4",
                className,
            )}
        >
            <div className="flex shrink-0 items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                    <DashboardIconBadge icon={Icon} />
                    <h2 className={DASHBOARD_TITLE_CLASS}>
                        {title}
                    </h2>
                </div>
                {action}
            </div>
            <div aria-hidden className={cn(PRISM.separator, "my-0 mb-3 mt-2 shrink-0")} />
            <div className={cn("min-h-0 flex-1 overflow-hidden", bodyClassName)}>
                {children}
            </div>
        </div>
    )
}

export function DashboardSegmentedControl({
    ariaLabel,
    children,
    className,
}: {
    ariaLabel: string
    children: React.ReactNode
    className?: string
}) {
    return (
        <TabSwitcher ariaLabel={ariaLabel} className={className}>
            {children}
        </TabSwitcher>
    )
}

export function DashboardSegmentedButton({
    children,
    className,
    isActive,
    type = "button",
    ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    isActive: boolean
}) {
    return (
        <TabSwitcherItem
            type={type}
            isActive={isActive}
            className={cn("px-2", className)}
            {...props}
        >
            {children}
        </TabSwitcherItem>
    )
}

export function InsightStat({
    icon: Icon,
    label,
    value,
    detail,
    tone = "neutral",
    className,
}: {
    icon: DashboardIcon
    label: string
    value: string
    detail?: string
    tone?: "neutral" | "positive" | "negative" | "accent"
    className?: string
}) {
    return (
        <DashboardMetricCard
            icon={Icon}
            label={label}
            value={value}
            detail={detail}
            tone={tone}
            className={cn("min-h-[112px]", className)}
        />
    )
}

export function DashboardLinesSkeleton({ rows = 4 }: { rows?: number }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: rows }).map((_, index) => (
                <div key={index} className="flex items-center gap-3 px-1 py-1.5">
                    <Skeleton className="size-8 rounded-lg" />
                    <div className="min-w-0 flex-1 space-y-1.5">
                        <Skeleton className="h-3.5 w-36 max-w-full" />
                        <Skeleton className="h-3 w-28 max-w-full" />
                    </div>
                    <Skeleton className="h-4 w-16" />
                </div>
            ))}
        </div>
    )
}

export function EmptyDashboardLine({ label }: { label: string }) {
    return (
        <EmptyState
            variant="nothing"
            placement="card"
            title={label}
            description=""
            className="h-full min-h-[120px] px-3 py-6"
        />
    )
}
