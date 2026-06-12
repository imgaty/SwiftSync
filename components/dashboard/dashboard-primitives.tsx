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
import { UDS } from "@/lib/UDS"
import { cn } from "@/lib/utils"
import type { DashboardIcon } from "@/components/dashboard/types"

export const DASHBOARD_GLASS_SURFACE = cn(
    UDS.cardSurface,
    "relative",
    "text-foreground",
)

export const DASHBOARD_INLINE_SURFACE = cn(
    UDS.cardSurface,
)

export const DASHBOARD_FLAT_SURFACE_SHADOW =
    UDS.cardFlatShadow

export const DASHBOARD_ACTION_SURFACE = cn(
    DASHBOARD_INLINE_SURFACE,
    UDS.cardHover,
    "text-foreground-secondary hover:text-foreground",
)

export const DASHBOARD_ROW_HOVER = cn("sq-12 transition-colors", UDS.itemHover)

export const DASHBOARD_TITLE_CLASS = "truncate text-sm font-medium tracking-tight text-foreground-secondary"

export const DASHBOARD_ACTION_BUTTON_CLASS = "size-7 sq-full text-foreground-secondary hover:text-foreground"

export const DASHBOARD_ACTION_ACTIVE_CLASS = cn(UDS.selectedControl, "text-foreground")

export const DASHBOARD_ACTION_ICON_CLASS = "size-3.5"

export const DASHBOARD_TOOLBAR_CLASS = "flex min-h-7 shrink-0 items-center justify-end gap-1.5 overflow-hidden"

export type DashboardCardTone = "neutral" | "positive" | "negative" | "warning" | "accent"

const DASHBOARD_CARD_TONE_STYLES: Record<DashboardCardTone, { card: string; glow: string; icon: string; value: string; dot: string }> = {
    positive: {
        card: UDS.statCardTone.positive.card,
        glow: UDS.statCardTone.positive.glow,
        icon: UDS.statCardTone.positive.icon,
        value: UDS.statCardTone.positive.value,
        dot: "bg-emerald-500",
    },
    negative: {
        card: UDS.statCardTone.negative.card,
        glow: UDS.statCardTone.negative.glow,
        icon: UDS.statCardTone.negative.icon,
        value: UDS.statCardTone.negative.value,
        dot: "bg-red-500",
    },
    warning: {
        card: UDS.statCardTone.warning.card,
        glow: UDS.statCardTone.warning.glow,
        icon: UDS.statCardTone.warning.icon,
        value: UDS.statCardTone.warning.value,
        dot: "bg-amber-500",
    },
    accent: {
        card: UDS.statCardTone.accent.card,
        glow: UDS.statCardTone.accent.glow,
        icon: UDS.statCardTone.accent.icon,
        value: UDS.statCardTone.accent.value,
        dot: "bg-foreground-secondary",
    },
    neutral: {
        card: UDS.statCardTone.neutral.card,
        glow: UDS.statCardTone.neutral.glow,
        icon: UDS.statCardTone.neutral.icon,
        value: UDS.statCardTone.neutral.value,
        dot: "bg-foreground-secondary",
    },
}

export const DASHBOARD_CARD_SURFACE = cn(
    UDS.cardSurface,
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

export function DashboardCardToolbar({
    ariaLabel,
    children,
    className,
}: {
    ariaLabel?: string
    children?: React.ReactNode
    className?: string
}) {
    const toolItems = React.Children.toArray(children)
    const hasTools = toolItems.length > 0

    return (
        <div
            data-dashboard-card-toolbar
            role={hasTools ? "toolbar" : undefined}
            aria-label={hasTools ? ariaLabel : undefined}
            aria-hidden={hasTools ? undefined : true}
            className={cn(
                DASHBOARD_TOOLBAR_CLASS,
                !hasTools && "invisible pointer-events-none",
                className,
            )}
        >
            {toolItems}
        </div>
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
    toolbarClassName?: string
    toolbarLabel?: string
    tools?: React.ReactNode
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
        toolbarClassName,
        toolbarLabel,
        tools,
        value,
        valueClassName,
        ...props
    }, ref) {
        const toneStyles = getDashboardCardToneStyles(tone)
        const toolbarContent = tools ?? action
        const resolvedToolbarLabel = toolbarLabel ?? (typeof label === "string" ? `${label} tools` : "Card tools")

        return (
            <div
                ref={ref}
                className={cn(DASHBOARD_CARD_SURFACE, toneStyles.card, className)}
                {...props}
            >
                <div aria-hidden className={cn("pointer-events-none absolute inset-0 opacity-80", toneStyles.glow)} />
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
                    <DashboardCardToolbar
                        ariaLabel={resolvedToolbarLabel}
                        className={toolbarClassName}
                    >
                        {toolbarContent}
                    </DashboardCardToolbar>
                </div>

                <div className="min-w-0">
                    <div className={cn("truncate text-xl font-semibold leading-none tabular-nums", toneStyles.value, valueClassName)}>
                        {value}
                    </div>
                    {detail && (
                        <div className={cn("mt-2 flex min-w-0 items-center gap-2 text-xs font-medium text-muted-foreground", detailClassName)}>
                            <span className={cn("size-1.5 shrink-0 sq-full", toneStyles.dot)} />
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
                    {showIcon && <Skeleton className="size-4 sq-md" />}
                    <Skeleton className="h-3.5 w-24 max-w-full" />
                </div>
                <Skeleton className="size-4 sq-md" />
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
    toolbarClassName,
    toolbarLabel,
    tools,
}: {
    title: string
    icon: DashboardIcon
    action?: React.ReactNode
    children: React.ReactNode
    className?: string
    bodyClassName?: string
    toolbarClassName?: string
    toolbarLabel?: string
    tools?: React.ReactNode
}) {
    const toolbarContent = tools ?? action

    return (
        <div
            className={cn(
                DASHBOARD_GLASS_SURFACE,
                "relative flex h-full min-h-0 flex-1 flex-col overflow-hidden p-4",
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
                <DashboardCardToolbar
                    ariaLabel={toolbarLabel ?? `${title} tools`}
                    className={toolbarClassName}
                >
                    {toolbarContent}
                </DashboardCardToolbar>
            </div>
            <div aria-hidden className={cn(UDS.separator, "my-0 mb-3 mt-2 shrink-0")} />
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
                    <Skeleton className="size-8 sq-lg" />
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
