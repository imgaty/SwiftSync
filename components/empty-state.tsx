//
//  empty-state.tsx
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Implements the Empty state React component for Argent, encapsulating reusable interface
//  structure, state handling, and presentation logic for feature screens.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import Link from "next/link"
import * as React from "react"
import { cn } from "@/lib/utils"
import {
    ArrowLeftRight,
    Calendar,
    Database,
    Filter,
    Inbox,
    PiggyBank,
    Receipt,
    Search,
    Wallet,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/language-provider"

export type EmptyStateVariant =
    | "nothing"
    | "no-data"
    | "no-results"
    | "empty-inbox"
    | "no-transactions"
    | "no-budgets"
    | "no-bills"
    | "no-accounts"
    | "no-events"
    | "filtered"

export type EmptyStatePlacement = "page" | "section" | "card" | "dialog" | "popover" | "inline"

export interface EmptyStateAction {
    label: string
    onClick?: () => void
    href?: string
    icon?: React.ReactNode
    variant?: "solid" | "solid-destructive" | "glass" | "glass-destructive" | "ghost" | "ghost-destructive"
}

export interface EmptyStateProps {
    variant?: EmptyStateVariant
    title?: React.ReactNode
    description?: React.ReactNode
    icon?: React.ReactNode
    action?: EmptyStateAction
    secondaryAction?: EmptyStateAction
    className?: string
    fullPage?: boolean
    placement?: EmptyStatePlacement
}

const variantConfig: Record<EmptyStateVariant, {
    icon: React.ElementType
    titleKey: string
    descriptionKey: string
    defaultTitle: string
    defaultDescription: string
}> = {
    "nothing": {
        icon: Inbox,
        titleKey: "empty_states.nothing.title",
        descriptionKey: "empty_states.nothing.description",
        defaultTitle: "Nothing to show here yet",
        defaultDescription: "When there is something to show, it will appear here."
    },
    "no-data": {
        icon: Database,
        titleKey: "empty_states.no_data.title",
        descriptionKey: "empty_states.no_data.description",
        defaultTitle: "Nothing to show here yet",
        defaultDescription: "There's no data to display at the moment."
    },
    "no-results": {
        icon: Search,
        titleKey: "empty_states.no_results.title",
        descriptionKey: "empty_states.no_results.description",
        defaultTitle: "No results found",
        defaultDescription: "Try adjusting your search or filter criteria."
    },
    "empty-inbox": {
        icon: Inbox,
        titleKey: "empty_states.empty_inbox.title",
        descriptionKey: "empty_states.empty_inbox.description",
        defaultTitle: "Your inbox is empty",
        defaultDescription: "No messages or notifications yet."
    },
    "no-transactions": {
        icon: ArrowLeftRight,
        titleKey: "empty_states.no_transactions.title",
        descriptionKey: "empty_states.no_transactions.description",
        defaultTitle: "No transactions yet",
        defaultDescription: "Start by adding your first transaction to track your finances."
    },
    "no-budgets": {
        icon: PiggyBank,
        titleKey: "empty_states.no_budgets.title",
        descriptionKey: "empty_states.no_budgets.description",
        defaultTitle: "No budgets created",
        defaultDescription: "Create a budget to start managing your spending."
    },
    "no-bills": {
        icon: Receipt,
        titleKey: "empty_states.no_bills.title",
        descriptionKey: "empty_states.no_bills.description",
        defaultTitle: "No bills recorded",
        defaultDescription: "Add your recurring bills to stay on top of payments."
    },
    "no-accounts": {
        icon: Wallet,
        titleKey: "empty_states.no_accounts.title",
        descriptionKey: "empty_states.no_accounts.description",
        defaultTitle: "No accounts added",
        defaultDescription: "Connect your bank accounts to see all your finances in one place."
    },
    "no-events": {
        icon: Calendar,
        titleKey: "empty_states.no_events.title",
        descriptionKey: "empty_states.no_events.description",
        defaultTitle: "No upcoming events",
        defaultDescription: "Your calendar is clear for now."
    },
    "filtered": {
        icon: Filter,
        titleKey: "empty_states.filtered.title",
        descriptionKey: "empty_states.filtered.description",
        defaultTitle: "No matching items",
        defaultDescription: "No items match your current filters. Try changing or clearing filters."
    }
}

const placementStyles: Record<EmptyStatePlacement, {
    root: string
    content: string
    icon: string
    iconSvg: string
    title: string
    description: string
    actions: string
    actionButton: string
}> = {
    page: {
        root: "min-h-0 flex-1 px-4 py-12",
        content: "max-w-md",
        icon: "mb-4",
        iconSvg: "size-8",
        title: "text-lg",
        description: "text-[13px]",
        actions: "mt-5",
        actionButton: "h-9 rounded-xl px-5 text-[13px]",
    },
    section: {
        root: "min-h-[280px] px-4 py-12",
        content: "max-w-sm",
        icon: "mb-4",
        iconSvg: "size-7",
        title: "text-base",
        description: "text-[13px]",
        actions: "mt-5",
        actionButton: "h-9 rounded-xl px-4 text-[13px]",
    },
    card: {
        root: "min-h-[160px] px-4 py-8",
        content: "max-w-xs",
        icon: "mb-3",
        iconSvg: "size-6",
        title: "text-sm",
        description: "text-xs",
        actions: "mt-4",
        actionButton: "h-8 rounded-lg px-3 text-xs",
    },
    dialog: {
        root: "px-4 py-8",
        content: "max-w-sm",
        icon: "mb-3",
        iconSvg: "size-6",
        title: "text-sm",
        description: "text-xs",
        actions: "mt-4",
        actionButton: "h-8 rounded-lg px-3 text-xs",
    },
    popover: {
        root: "px-3 py-5",
        content: "max-w-[18rem]",
        icon: "mb-3",
        iconSvg: "size-5",
        title: "text-[13px]",
        description: "text-xs",
        actions: "mt-3",
        actionButton: "h-8 rounded-lg px-3 text-xs",
    },
    inline: {
        root: "px-3 py-3",
        content: "max-w-full",
        icon: "",
        iconSvg: "size-5",
        title: "text-sm",
        description: "text-xs",
        actions: "mt-3",
        actionButton: "h-8 rounded-lg px-3 text-xs",
    },
}

function getNestedTranslation(translations: unknown, key: string, fallback: string): string {
    const keys = key.split(".")
    let value: unknown = translations

    for (const k of keys) {
        if (!value || typeof value !== "object") return fallback
        value = (value as Record<string, unknown>)[k]
        if (value === undefined) return fallback
    }

    return typeof value === "string" ? value : fallback
}

export function EmptyState({
    variant = "nothing",
    title,
    description,
    icon,
    action,
    secondaryAction,
    className,
    fullPage = false,
    placement = "section",
}: EmptyStateProps) {
    const { t } = useLanguage()
    const config = variantConfig[variant]
    const Icon = config.icon
    const resolvedPlacement = fullPage ? "page" : placement
    const styles = placementStyles[resolvedPlacement]
    const titleId = React.useId()

    const displayTitle = title ?? getNestedTranslation(t, config.titleKey, config.defaultTitle)
    const displayDescription = description ?? getNestedTranslation(t, config.descriptionKey, config.defaultDescription)
    const hasDescription = displayDescription !== "" && displayDescription !== null && displayDescription !== undefined

    const renderActionButton = (item: EmptyStateAction | undefined, isPrimary = false) => {
        if (!item) return null

        const variant = item.variant || (isPrimary && resolvedPlacement === "page" ? "solid" : "glass")
        const actionClassName = cn(styles.actionButton, "font-medium")

        if (item.href) {
            return (
                <Button asChild variant={variant} className={actionClassName}>
                    <Link href={item.href}>
                        {item.icon}
                        {item.label}
                    </Link>
                </Button>
            )
        }

        return (
            <Button onClick={item.onClick} variant={variant} className={actionClassName}>
                {item.icon}
                {item.label}
            </Button>
        )
    }

    return (
        <div className={cn(
            "flex items-center justify-center animate-fade-in",
            resolvedPlacement === "inline" ? "text-left" : "text-center",
            styles.root,
            className
        )}
            data-empty-state={resolvedPlacement}
            role="status"
            aria-live="polite"
            aria-labelledby={titleId}
        >
            <div className={cn(
                "w-full",
                styles.content,
                resolvedPlacement === "inline"
                    ? "flex items-center justify-center gap-3"
                    : "mx-auto flex flex-col items-center",
            )}>
                <div
                    className={cn(
                        "flex shrink-0 items-center justify-center text-muted-foreground",
                        "animate-fade-in-scale",
                        styles.icon,
                    )}
                    aria-hidden="true"
                >
                    {icon || <Icon className={styles.iconSvg} strokeWidth={1.6} />}
                </div>

                <div className={cn("min-w-0", resolvedPlacement !== "inline" && "w-full")}>
                    {resolvedPlacement === "inline" ? (
                        <p id={titleId} className={cn("font-semibold leading-snug text-foreground animate-fade-in-up stagger-1", styles.title)}>
                            {displayTitle}
                        </p>
                    ) : (
                        <h3 id={titleId} className={cn("mb-1.5 font-semibold leading-snug text-foreground animate-fade-in-up stagger-1", styles.title)}>
                            {displayTitle}
                        </h3>
                    )}
                    {hasDescription && (
                        <p className={cn("mx-auto leading-relaxed text-muted-foreground animate-fade-in-up stagger-2", styles.description)}>
                            {displayDescription}
                        </p>
                    )}
                </div>

                {(action || secondaryAction) && (
                    <div className={cn("flex flex-wrap items-center justify-center gap-2 animate-fade-in-up stagger-3", styles.actions)}>
                        {renderActionButton(action, true)}
                        {renderActionButton(secondaryAction)}
                    </div>
                )}
            </div>
        </div>
    )
}

// Compact version for inline use in tables
export function EmptyStateInline({
    variant = "no-results",
    title,
    description,
    className
}: Omit<EmptyStateProps, "icon" | "action" | "secondaryAction" | "fullPage" | "placement">) {
    return (
        <EmptyState
            variant={variant}
            title={title}
            description={description}
            placement="inline"
            className={className}
        />
    )
}
