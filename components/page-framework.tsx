"use client"

/**
 * 2. <PageHeader>       — Breadcrumb + toolbar row. Always the first child.
 * 3. <PageTitle>        — Title + description.
 * 4. <StatCards>        — Row of metric cards below the title.
 * 5. <PageSection>      — Content wrapper with optional section actions.
 * 
 * RULES:
 * — Every page uses <PageShell> as the root element.
 * — <PageHeader> is always first, with SidebarTrigger + breadcrumbs + top-right action buttons.
 * — Page-level actions belong in <PageHeader actions={...}> next to notifications and theme toggle.
 * — <PageTitle> follows with a title and description only.
 * — Data tables/charts live inside <PageSection>.
 * — All animations use the stagger-N system for sequential reveals.
 */

import * as React from "react"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { ThemeToggle } from "@/components/theme-toggle"
import { NotificationButton } from "@/components/notification-button"
import { SmartTooltip } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { ClipboardCopy } from "lucide-react"
import { toast } from "sonner"

const STAT_CARD_SKELETON_KEYS = [0, 1, 2, 3] as const

// PAGE SHELL — Root wrapper
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

// PAGE HEADER — Breadcrumbs + toolbar
interface BreadcrumbEntry {             // Defines the shape of each breadcrumb item
    label: string
    href: string
}

interface PageHeaderProps {
    breadcrumbs: BreadcrumbEntry[]
    isLoading?: boolean
    actions?: React.ReactNode           // Extra toolbar options
}

function deriveBreadcrumbLabelFromHref(href: string): string {
    const clean = href.split("?")[0].split("#")[0]
    if (!clean || clean === "/") return "Dashboard"
    const segment = clean.split("/").filter(Boolean).pop() || ""
    if (!segment) return "Dashboard"
    return segment
        .replace(/[-_]+/g, " ")
        .replace(/\b\w/g, (match) => match.toUpperCase())
}

function normalizeBreadcrumbLabel(label: string, href: string): string {
    const text = (label || "").trim()
    if (!text || /^page$/i.test(text)) {
        return deriveBreadcrumbLabelFromHref(href)
    }
    return text
}

// Shared topline button styling — same as NotificationButton / ThemeToggle / SidebarTrigger
const TOPLINE_BTN = "rounded-full"

/** Recursively inject topline button styling onto every <Button> in the actions tree.
 *  Also wraps elements that carry a `title` prop in a SmartTooltip (removes native title). */
function injectToplineStyle(node: React.ReactNode): React.ReactNode {
    return React.Children.map(node, (child) => {
        if (!React.isValidElement(child)) return child

        // If the child renders a Button (data-slot="button"), clone with forced props
        const el = child as React.ReactElement<Record<string, unknown>>

        // Allow callers to keep their own action styling when needed.
        if (el.props["data-no-topline-style"]) return el

        // Recurse into fragments / wrappers that have children
        if (el.props.children && (el.type === React.Fragment || typeof el.type === "string")) {
            return React.cloneElement(el, {}, injectToplineStyle(el.props.children as React.ReactNode))
        }

        // For components that accept asChild (PopoverTrigger, etc.), recurse into their children
        if (el.props.asChild && el.props.children) {
            return React.cloneElement(el, {}, injectToplineStyle(el.props.children as React.ReactNode))
        }

        // Extract title for tooltip before removing it from the element
        const title = el.props.title as string | undefined

        // Direct Button or any component — inject variant/size/className
        const styled = React.cloneElement(el, {
            variant: "ghost",
            size: "icon",
            className: cn(TOPLINE_BTN, el.props.className as string | undefined),
            ...(title ? { title: undefined } : {}),
        })

        // Wrap with SmartTooltip if the element has a title
        if (title) {
            return <SmartTooltip text={title} group="header" forceSide="bottom">{styled}</SmartTooltip>
        }

        return styled
    })
}

export function PageHeader({ breadcrumbs, isLoading = false, actions }: PageHeaderProps) {
    return (
        <header className = "animate-fade-in-down" style={{ animationDuration: "0.2s" }}>
            <div className="flex min-w-0 items-center gap-3">
                <SidebarTrigger className={TOPLINE_BTN} />

                <Separator orientation="vertical" className="data-[orientation=vertical]:h-4 mx-1" />

                <Breadcrumb>
                    <BreadcrumbList>
                        {breadcrumbs.map((crumb, i) => {
                            const isLast = i === breadcrumbs.length - 1
                            const normalizedLabel = normalizeBreadcrumbLabel(crumb.label, crumb.href)
                            const canLink = Boolean(crumb.href && crumb.href !== "#")
                            return (
                                <React.Fragment key={crumb.href}>
                                    {i > 0 && <BreadcrumbSeparator className="hidden md:block" />}
                                    <BreadcrumbItem className={i === 0 ? "hidden md:block" : ""}>
                                        {isLast && !canLink ? (
                                            <BreadcrumbPage>
                                                {isLoading ? <Skeleton className="h-4 w-20" /> : normalizedLabel}
                                            </BreadcrumbPage>
                                        ) : (
                                            <BreadcrumbLink href={crumb.href} className="transition-colors hover:text-primary">
                                                {isLoading ? <Skeleton className="h-4 w-20" /> : normalizedLabel}
                                            </BreadcrumbLink>
                                        )}
                                    </BreadcrumbItem>
                                </React.Fragment>
                            )
                        })}
                    </BreadcrumbList>
                </Breadcrumb>

                <div className="ml-auto flex items-center gap-2">
                    {actions && (
                        <>
                            {injectToplineStyle(actions)}
                            <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-4" />
                        </>
                    )}
                    <NotificationButton />
                    <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-4" />
                    <ThemeToggle />
                </div>
            </div>
        </header>
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

const TREND_STYLES: Record<NonNullable<StatCardData["trend"]>, { badge: string; dot: string }> = {
    up: {
        badge: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        dot: "bg-emerald-500",
    },
    down: {
        badge: "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300",
        dot: "bg-rose-500",
    },
    neutral: {
        badge: "border-border/60 bg-muted/60 text-neutral-400",
        dot: "bg-muted-foreground/60",
    },
}

const StatCardSkeleton = React.memo(function StatCardSkeleton() {
    return (
        <div className="relative min-h-[148px] overflow-hidden rounded-3xl border border-border/50 bg-card/70 p-5 shadow-sm backdrop-blur-sm">
            <div className="pointer-events-none absolute -right-10 top-[-18px] h-20 w-40 rotate-18 bg-white/8 blur-2xl dark:bg-white/10" />
            <div className="pointer-events-none absolute inset-0 rounded-3xl bg-linear-to-br from-muted/35 via-transparent to-transparent" />
            <div className="relative z-10 flex items-start justify-between gap-3">
                <div className="space-y-2">
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-8 w-28" />
                </div>
                <Skeleton className="h-10 w-10 rounded-2xl" />
            </div>
            <Skeleton className="relative z-10 mt-6 h-6 w-24 rounded-full" />
        </div>
    )
})

const StatCardItem = React.memo(function StatCardItem({ stat }: { stat: StatCardData }) {
    const trend = stat.trend ?? "neutral"
    const trendStyles = TREND_STYLES[trend]

    const handleCopyValue = () => {
        navigator.clipboard.writeText(stat.value)
        toast.success("Copied")
    }

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                <div
                    className={cn(
                        "relative min-h-[148px] overflow-hidden rounded-3xl border border-border/50 bg-card/70 p-5 shadow-sm backdrop-blur-sm",
                        "group transition-all duration-200 hover:border-primary/15 hover:bg-card/80 hover:shadow-md"
                    )}
                >
                    <div className="pointer-events-none absolute -right-10 top-[-18px] h-20 w-40 rotate-18 bg-white/8 blur-2xl dark:bg-white/10" />
                    <div className="pointer-events-none absolute inset-0 rounded-3xl bg-linear-to-br from-muted/35 via-transparent to-transparent" />

                    <div className="relative z-10 flex items-start justify-between gap-3">
                        <div className="space-y-2">
                            <span className="inline-flex items-center rounded-full bg-muted/70 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-neutral-400">
                                {stat.label}
                            </span>
                            <p className="text-[1.85rem] font-semibold leading-none tracking-tight text-foreground tabular-nums">
                                {stat.value}
                            </p>
                        </div>
                        {stat.icon && (
                            <div className="flex size-10 items-center justify-center rounded-2xl border border-border/50 bg-background/80 text-neutral-400/80 transition-colors group-hover:text-foreground [&>svg]:size-5">
                                {stat.icon}
                            </div>
                        )}
                    </div>

                    {stat.change && (
                        <div className={cn("relative z-10 mt-6 inline-flex w-fit items-center gap-2 rounded-full border px-2.5 py-1 text-[12px] font-medium", trendStyles.badge)}>
                            <span className={cn("size-1.5 rounded-full", trendStyles.dot)} />
                            {stat.change}
                        </div>
                    )}
                </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
                <ContextMenuItem onClick={handleCopyValue}>
                    <ClipboardCopy />
                    Copy value
                </ContextMenuItem>
                {stat.change && (
                    <ContextMenuItem onClick={() => {
                        navigator.clipboard.writeText(stat.change!)
                        toast.success("Copied")
                    }}>
                        <ClipboardCopy />
                        Copy change
                    </ContextMenuItem>
                )}
            </ContextMenuContent>
        </ContextMenu>
    )
})

export const StatCards = React.memo(function StatCards({ stats, isLoading = false, className }: StatCardsProps) {
    return (
        <div
            className={cn("grid gap-4 xl:gap-5 animate-fade-in-up stagger-2", className)}
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))" }}
        >
            {isLoading
                ? STAT_CARD_SKELETON_KEYS.map((key) => <StatCardSkeleton key={key} />)
                : stats.map((stat, index) => <StatCardItem key={`${stat.label}-${index}`} stat={stat} />)}
        </div>
    )
})

// =============================================================================
// PAGE SECTION — Animated content block
// =============================================================================

interface PageSectionProps {
    children: React.ReactNode
    /** Which stagger-N class to use (default: 3) */
    stagger?: number
    actions?: React.ReactNode
    /** Wrap children in a glass surface card */
    glass?: boolean
    /**
     * When true, the section flex-fills the remaining viewport height inside
     * PageShell. Use this on table-heavy pages so the table scrolls in place
     * instead of the whole page scrolling.
     */
    fill?: boolean
    className?: string
}

export function PageSection({ children, stagger = 3, actions, glass = false, fill = false, className }: PageSectionProps) {
    const content = glass ? (
        <div className="rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm p-5 shadow-sm md:p-6">
            {children}
        </div>
    ) : children

    return (
        <div
            className={cn(
                `animate-fade-in-up stagger-${stagger}`,
                fill && "flex flex-col flex-1 min-h-0",
                className,
            )}
        >
            {actions && <div className="mb-5 flex flex-wrap items-center justify-end gap-2">{actions}</div>}
            {fill ? (
                <div className="flex flex-col flex-1 min-h-0">{content}</div>
            ) : (
                content
            )}
        </div>
    )
}
