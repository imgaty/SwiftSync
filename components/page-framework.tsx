//
//  page-framework.tsx
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Implements the Page framework React component for Argent, encapsulating reusable
//  interface structure, state handling, and presentation logic for feature screens.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
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
import { Button, buttonVariants } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { NotificationButton } from "@/components/notification-button"
import { openCommandPalette } from "@/components/command-palette"
import { SmartTooltip } from "@/components/ui/tooltip"
import { useLanguage } from "@/components/language-provider"
import { UDS } from "@/lib/UDS"
import { getTranslations } from "@/lib/translation-utils"
import { cn } from "@/lib/utils"
import { ClipboardCopy, Search } from "lucide-react"
import { toast } from "sonner"

const STAT_CARD_SKELETON_KEYS = [0, 1, 2, 3] as const
const STAT_CARD_DEFAULT_TONES = ["info", "positive", "negative", "accent", "warning", "neutral"] as const
type StatCardTone = keyof typeof UDS.statCardTone
const TOPLINE_BUTTON_VARIANT = "ghost" as const
const TOPLINE_BUTTON_SIZE = "icon" as const
const TOPLINE_NATIVE_BUTTON_CLASS = buttonVariants({ variant: TOPLINE_BUTTON_VARIANT, size: TOPLINE_BUTTON_SIZE })

// PAGE SHELL — Root wrapper
interface PageShellProps {
    children: React.ReactNode
    className?: string
}

export function PageShell({ children, className }: PageShellProps) {
    return (
        <div className={cn(
            "@container/main flex h-full min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-x-hidden overflow-y-auto p-4 md:p-6",
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

type ToplineElementProps = Record<string, unknown> & {
    asChild?: boolean
    children?: React.ReactNode
    className?: string
    title?: string
}

/** Recursively normalize every <Button> in the actions tree to the shared icon button API.
 *  Also wraps elements that carry a `title` prop in a SmartTooltip (removes native title). */
function injectToplineStyle(node: React.ReactNode): React.ReactNode {
    const styledChildren = React.Children.map(node, (child) => {
        if (!React.isValidElement(child)) return child

        const el = child as React.ReactElement<ToplineElementProps>

        // Allow callers to keep their own action styling when needed.
        if (el.props["data-no-topline-style"]) return el

        const title = typeof el.props.title === "string" ? el.props.title : undefined
        const hasChildren = el.props.children !== undefined && el.props.children !== null
        const transformedChildren = hasChildren ? injectToplineStyle(el.props.children) : undefined

        const cloneElement = (props: Partial<ToplineElementProps> = {}) => {
            return hasChildren
                ? React.cloneElement(el, props, transformedChildren)
                : React.cloneElement(el, props)
        }

        let styled: React.ReactElement<ToplineElementProps>

        if (el.type === Button) {
            styled = cloneElement({
                variant: TOPLINE_BUTTON_VARIANT,
                size: TOPLINE_BUTTON_SIZE,
                className: el.props.className,
                ...(title ? { title: undefined } : {}),
            })
        } else if (el.type === "button") {
            styled = cloneElement({
                className: cn(TOPLINE_NATIVE_BUTTON_CLASS, el.props.className),
                ...(title ? { title: undefined } : {}),
            })
        } else if (!hasChildren && typeof el.type !== "string") {
            styled = cloneElement({
                variant: TOPLINE_BUTTON_VARIANT,
                size: TOPLINE_BUTTON_SIZE,
                className: el.props.className,
                ...(title ? { title: undefined } : {}),
            })
        } else {
            styled = cloneElement(title ? { title: undefined } : {})
        }

        // Wrap with SmartTooltip if the element has a title
        if (title) {
            return <SmartTooltip text={title} group="header" forceSide="bottom">{styled}</SmartTooltip>
        }

        return styled
    })

    if (styledChildren === null || styledChildren === undefined) {
        return styledChildren
    }

    return React.Children.count(node) === 1 ? styledChildren[0] : styledChildren
}

export function PageHeader({ breadcrumbs, isLoading = false, actions }: PageHeaderProps) {
    return (
        <header className = "animate-fade-in-down" style={{ animationDuration: "0.2s" }}>
            <div className="flex min-w-0 items-center gap-3">
                <SidebarTrigger />

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
                    <button
                        type="button"
                        onClick={openCommandPalette}
                        className={cn(UDS.commandTriggerSurface, "hidden min-w-40 items-center gap-2 px-2.5 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:text-foreground lg:flex")}
                        aria-label="Open command palette"
                    >
                        <Search className="size-3.5 shrink-0" />
                        <span className="min-w-0 flex-1 truncate">Search</span>
                        <kbd className="shrink-0 rounded-[5px] border border-border/70 px-1.5 py-0.5 font-mono text-xs leading-none text-muted-foreground">
                            Ctrl K
                        </kbd>
                    </button>
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
    /** Kept for callers that describe trend semantics; the card shell stays neutral. */
    trend?: "up" | "down" | "neutral"
    tone?: StatCardTone
    icon?: React.ReactNode
}

interface StatCardsProps {
    stats: StatCardData[]
    isLoading?: boolean
    className?: string
}

const STAT_CARD_SURFACE = cn(
    UDS.cardSurface,
    "relative flex h-full min-h-[132px] min-w-0 flex-col justify-between overflow-hidden p-4",
    UDS.cardFlatShadow,
)

const STAT_CARD_GLOW =
    "hidden"

const STAT_CARD_TOP_LINE =
    "hidden"

function getStatCardTone(stat: StatCardData, index: number): StatCardTone {
    if (stat.tone) return stat.tone
    if (stat.trend === "up") return "positive"
    if (stat.trend === "down") return "negative"
    if (stat.trend === "neutral") return "neutral"
    return STAT_CARD_DEFAULT_TONES[index % STAT_CARD_DEFAULT_TONES.length]
}

const StatCardSkeleton = React.memo(function StatCardSkeleton() {
    return (
        <div className={STAT_CARD_SURFACE}>
            <div aria-hidden className={STAT_CARD_GLOW} />
            <div aria-hidden className={STAT_CARD_TOP_LINE} />
            <div className="relative flex min-w-0 items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                    <Skeleton className="size-4 shrink-0 sq-md" />
                    <Skeleton className="h-3.5 w-24 max-w-full" />
                </div>
            </div>
            <div className="relative flex min-w-0 items-end justify-between gap-4">
                <Skeleton className="h-4 w-28 max-w-full" />
                <Skeleton className="h-8 w-20 shrink-0" />
            </div>
        </div>
    )
})

const StatCardItem = React.memo(function StatCardItem({ index, stat }: { index: number; stat: StatCardData }) {
    const toneStyles = UDS.statCardTone[getStatCardTone(stat, index)]
    const { t } = useLanguage()
    const common = getTranslations(t, "common")
    const dataLabels = getTranslations(t, "data_type_labels")

    const handleCopyValue = () => {
        navigator.clipboard.writeText(stat.value)
        toast.success(common.copied || "Copied")
    }

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                <div
                    className={cn(
                        STAT_CARD_SURFACE,
                        toneStyles.card,
                        "outline-none focus-visible:ring-2 focus-visible:ring-focus/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    )}
                >
                    <div aria-hidden className={cn(STAT_CARD_GLOW, toneStyles.glow)} />
                    <div aria-hidden className={cn(STAT_CARD_TOP_LINE, toneStyles.line)} />

                    <div className="relative flex min-w-0 items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2.5">
                            {stat.icon && (
                                <span className={cn("inline-flex shrink-0 items-center justify-center leading-none [&>svg]:size-4 [&>svg]:stroke-[1.9]", toneStyles.icon)}>
                                    {stat.icon}
                                </span>
                            )}
                            <span className="truncate text-sm font-medium leading-5 text-foreground-secondary">
                                {stat.label}
                            </span>
                        </div>
                    </div>

                    <div className="relative flex min-w-0 items-end justify-between gap-2">
                        <div className="min-w-0">
                            {stat.change && (
                                <span className={cn("block truncate text-sm font-medium leading-5", toneStyles.meta)}>
                                    {stat.change}
                                </span>
                            )}
                        </div>
                        <span className={cn("shrink-0 text-right text-2xl font-semibold leading-none tracking-normal tabular-nums", toneStyles.value)}>
                            {stat.value}
                        </span>
                    </div>
                </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
                <ContextMenuItem onClick={handleCopyValue}>
                    <ClipboardCopy />
                    {dataLabels.copy_value || "Copy value"}
                </ContextMenuItem>
                {stat.change && (
                    <ContextMenuItem onClick={() => {
                        navigator.clipboard.writeText(stat.change!)
                        toast.success(common.copied || "Copied")
                    }}>
                        <ClipboardCopy />
                        {dataLabels.copy_change || "Copy change"}
                    </ContextMenuItem>
                )}
            </ContextMenuContent>
        </ContextMenu>
    )
})

export const StatCards = React.memo(function StatCards({ stats, isLoading = false, className }: StatCardsProps) {
    return (
        <div
            className={cn("grid grid-cols-1 gap-4 animate-fade-in-up stagger-2 @[520px]/main:grid-cols-2 @[1120px]/main:grid-cols-4", className)}
        >
            {isLoading
                ? STAT_CARD_SKELETON_KEYS.map((key) => <StatCardSkeleton key={key} />)
                : stats.map((stat, index) => <StatCardItem key={`${stat.label}-${index}`} index={index} stat={stat} />)}
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
     * When true, the section flex-fills the remaining PageShell space. Use this
     * for dense widgets that intentionally own an inner scroll area, while the
     * page itself remains allowed to grow and scroll.
     */
    fill?: boolean
    className?: string
}

export function PageSection({ children, stagger = 3, actions, glass = false, fill = false, className }: PageSectionProps) {
    const content = glass ? (
        <div className={cn(UDS.cardSurface, "p-5 md:p-6")}>
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
