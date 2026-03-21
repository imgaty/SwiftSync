"use client"

/**
 * PAGE FRAMEWORK — SwiftSync Design System
 * 
 * Every page MUST use these components for visual coherence:
 * 
 * 1. <PageShell>        — Root wrapper. Provides consistent padding, gap, animation.
 * 2. <PageHeader>       — Breadcrumb + toolbar row. Always the first child.
 * 3. <PageTitle>        — Title + description + optional action buttons.
 * 4. <StatCards>        — Row of metric cards below the title.
 * 5. <PageSection>      — Content section with optional heading + staggered animation.
 * 
 * RULES:
 * — Every page uses <PageShell> as the root element.
 * — <PageHeader> is always first, with SidebarTrigger + breadcrumbs + toolbar icons.
 * — <PageTitle> always follows, with a title, description, and optional action slot.
 * — Data tables/charts live inside <PageSection>.
 * — All animations use the stagger-N system for sequential reveals.
 */

import * as React from "react"
import Link from "next/link"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { ThemeToggle } from "@/components/theme-toggle"
import { NotificationBell } from "@/components/notification-bell"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

// =============================================================================
// PAGE SHELL — Root wrapper
// =============================================================================

interface PageShellProps {
    children: React.ReactNode
    className?: string
}

export function PageShell({ children, className }: PageShellProps) {
    return (
        <div className={cn(
            "@container/main flex flex-col flex-1 gap-6 p-4 md:p-6",
            className
        )}>
            {children}
        </div>
    )
}

// =============================================================================
// PAGE HEADER — Breadcrumbs + toolbar
// =============================================================================

interface BreadcrumbEntry {
    label: string
    href: string
}

interface PageHeaderProps {
    breadcrumbs: BreadcrumbEntry[]
    isLoading?: boolean
    /** Optional extra toolbar buttons (e.g. Export). Placed before NotificationBell & ThemeToggle. */
    actions?: React.ReactNode
}

export function PageHeader({ breadcrumbs, isLoading = false, actions }: PageHeaderProps) {
    return (
        <header className="animate-fade-in-down" style={{ animationDuration: '0.2s' }}>
            <div className="flex items-center gap-4">
                <SidebarTrigger className="transition-transform duration-200 hover:scale-105 active:scale-95" />
                <Separator orientation="vertical" className="data-[orientation=vertical]:h-4" />

                <Breadcrumb>
                    <BreadcrumbList>
                        {breadcrumbs.map((crumb, i) => (
                            <React.Fragment key={crumb.href}>
                                {i > 0 && <BreadcrumbSeparator className="hidden md:block" />}
                                <BreadcrumbItem className={i === 0 ? "hidden md:block" : ""}>
                                    <BreadcrumbLink href={crumb.href} className="transition-colors hover:text-primary">
                                        {isLoading ? <Skeleton className="h-4 w-20" /> : crumb.label}
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                            </React.Fragment>
                        ))}
                    </BreadcrumbList>
                </Breadcrumb>

                <div className="ml-auto flex items-center gap-2">
                    {actions}
                    <NotificationBell />
                    <ThemeToggle />
                </div>
            </div>
        </header>
    )
}

// =============================================================================
// PAGE TITLE — Title + description + action buttons
// =============================================================================

interface PageTitleProps {
    title: string
    description?: string
    isLoading?: boolean
    /** Buttons that appear on the right side of the title row (e.g. "Add Account") */
    actions?: React.ReactNode
    /** Icon component to display next to the title */
    icon?: React.ReactNode
    className?: string
}

export function PageTitle({ title, description, isLoading = false, actions, icon, className }: PageTitleProps) {
    return (
        <div className={cn("animate-fade-in-up stagger-1", className)}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1.5">
                    {isLoading ? (
                        <>
                            <Skeleton className="h-8 w-48" />
                            <Skeleton className="h-4 w-80" />
                        </>
                    ) : (
                        <>
                            <div className="flex items-center gap-3">
                                {icon && (
                                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary">
                                        {icon}
                                    </div>
                                )}
                                <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
                            </div>
                            {description && (
                                <p className="text-neutral-500 dark:text-neutral-400 text-sm">{description}</p>
                            )}
                        </>
                    )}
                </div>
                {actions && (
                    <div className="flex items-center gap-2 shrink-0">
                        {actions}
                    </div>
                )}
            </div>
        </div>
    )
}

// =============================================================================
// STAT CARDS — Row of metric cards
// =============================================================================

interface StatCardData {
    label: string
    value: string
    /** e.g. "+12.5%" or "-€200" */
    change?: string
    /** "up" = green, "down" = red, "neutral" = muted */
    trend?: "up" | "down" | "neutral"
    icon?: React.ReactNode
}

interface StatCardsProps {
    stats: StatCardData[]
    isLoading?: boolean
    className?: string
}

export function StatCards({ stats, isLoading = false, className }: StatCardsProps) {
    return (
        <div className={cn("grid gap-4 grid-cols-2 lg:grid-cols-4 animate-fade-in-up stagger-2", className)}>
            {isLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i} className="p-4 space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-7 w-32" />
                        <Skeleton className="h-3 w-16" />
                    </Card>
                ))
                : stats.map((stat, i) => (
                    <Card key={i} className="p-4 space-y-1.5 transition-shadow hover:shadow-md">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                                {stat.label}
                            </span>
                            {stat.icon && (
                                <div className="text-neutral-500 dark:text-neutral-400/60">
                                    {stat.icon}
                                </div>
                            )}
                        </div>
                        <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
                        {stat.change && (
                            <p className={cn(
                                "text-xs font-medium",
                                stat.trend === "up" && "text-emerald-600 dark:text-emerald-400",
                                stat.trend === "down" && "text-red-600 dark:text-red-400",
                                stat.trend === "neutral" && "text-neutral-500 dark:text-neutral-400",
                            )}>
                                {stat.change}
                            </p>
                        )}
                    </Card>
                ))
            }
        </div>
    )
}

// =============================================================================
// PAGE SECTION — Animated content block
// =============================================================================

interface PageSectionProps {
    children: React.ReactNode
    /** Which stagger-N class to use (default: 3) */
    stagger?: number
    title?: string
    description?: string
    actions?: React.ReactNode
    icon?: React.ReactNode
    isLoading?: boolean
    /** Wrap children in a glass surface card */
    glass?: boolean
    className?: string
}

export function PageSection({ children, stagger = 3, title, description, actions, icon, isLoading = false, glass = false, className }: PageSectionProps) {
    const content = glass ? (
        <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-black/2 dark:bg-white/3 backdrop-blur-sm p-5 md:p-6">
            {children}
        </div>
    ) : children

    return (
        <div className={cn(`animate-fade-in-up stagger-${stagger}`, className)}>
            {(title || actions || isLoading) && (
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        {isLoading ? (
                            <>
                                <Skeleton className="h-8 w-8 rounded-lg" />
                                <div className="space-y-1.5">
                                    <Skeleton className="h-5 w-28" />
                                    <Skeleton className="h-3.5 w-48" />
                                </div>
                            </>
                        ) : (
                            <>
                                {icon && (
                                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary">
                                        {icon}
                                    </div>
                                )}
                                <div>
                                    {title && <h2 className="text-lg font-semibold tracking-tight">{title}</h2>}
                                    {description && <p className="text-[13px] text-muted-foreground">{description}</p>}
                                </div>
                            </>
                        )}
                    </div>
                    {actions && <div className="flex items-center gap-2">{actions}</div>}
                </div>
            )}
            {content}
        </div>
    )
}
