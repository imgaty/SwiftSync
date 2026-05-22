"use client"

import Link from "next/link"
import * as React from "react"
import { cn } from "@/lib/utils"
import {
    Search,
    Inbox,
    Database,
    Filter,
    ArrowLeftRight,
    PiggyBank,
    Receipt,
    Wallet,
    Calendar,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/language-provider"

type EmptyStateVariant = 
    | "no-data"
    | "no-results"
    | "empty-inbox"
    | "no-transactions"
    | "no-budgets"
    | "no-bills"
    | "no-accounts"
    | "no-events"
    | "filtered"

interface EmptyStateAction {
    label: string
    onClick?: () => void
    href?: string
    icon?: React.ReactNode
    variant?: "solid" | "solid-destructive" | "glass" | "glass-destructive" | "ghost" | "ghost-destructive"
}

interface EmptyStateProps {
    variant?: EmptyStateVariant
    title?: string
    description?: string
    icon?: React.ReactNode
    action?: EmptyStateAction
    secondaryAction?: EmptyStateAction
    className?: string
    fullPage?: boolean
}

const variantConfig: Record<EmptyStateVariant, {
    icon: React.ElementType
    titleKey: string
    descriptionKey: string
    defaultTitle: string
    defaultDescription: string
}> = {
    "no-data": {
        icon: Database,
        titleKey: "empty_states.no_data.title",
        descriptionKey: "empty_states.no_data.description",
        defaultTitle: "No data available",
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

export function EmptyState({
    variant = "no-data",
    title,
    description,
    icon,
    action,
    secondaryAction,
    className,
    fullPage = false,
}: EmptyStateProps) {
    const { t } = useLanguage()
    const config = variantConfig[variant]
    const Icon = config.icon

    // Helper to get nested translation values
    const getNestedTranslation = (key: string, fallback: string): string => {
        const keys = key.split(".")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let value: any = t
        for (const k of keys) {
            value = value?.[k]
            if (value === undefined) return fallback
        }
        return typeof value === "string" ? value : fallback
    }

    const displayTitle = title || getNestedTranslation(config.titleKey, config.defaultTitle)
    const displayDescription = description || getNestedTranslation(config.descriptionKey, config.defaultDescription)

    const renderActionButton = (item: EmptyStateAction | undefined, isPrimary = false) => {
        if (!item) return null

        const variant = item.variant || (isPrimary && fullPage ? "solid" : "glass")
        const className = isPrimary
            ? "rounded-xl px-5 h-9 text-[13px] font-medium"
            : "rounded-xl px-5 h-9 text-[13px] font-medium"

        if (item.href) {
            return (
                <Button asChild variant={variant} className={className}>
                    <Link href={item.href}>
                        {item.icon}
                        {item.label}
                    </Link>
                </Button>
            )
        }

        return (
            <Button onClick={item.onClick} variant={variant} className={className}>
                {item.icon}
                {item.label}
            </Button>
        )
    }

    return (
        <div className={cn(
            "flex flex-col items-center justify-center text-center animate-fade-in px-4",
            fullPage ? "min-h-[56vh]" : "py-16",
            className
        )}>
            <div className="w-full max-w-md">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-neutral-400 animate-fade-in-scale">
                    {icon || <Icon className="h-7 w-7" strokeWidth={1.5} />}
                </div>

                <h3 className="text-lg font-semibold text-foreground mb-1.5 animate-fade-in-up stagger-1">
                    {displayTitle}
                </h3>
                <p className="mx-auto max-w-sm text-[13px] leading-relaxed text-neutral-400 animate-fade-in-up stagger-2">
                    {displayDescription}
                </p>

                {(action || secondaryAction) && (
                    <div className="mt-5 flex flex-wrap items-center justify-center gap-2 animate-fade-in-up stagger-3">
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
}: Omit<EmptyStateProps, "icon" | "action">) {
    const { t } = useLanguage()
    const config = variantConfig[variant]
    const Icon = config.icon

    const getNestedTranslation = (key: string, fallback: string): string => {
        const keys = key.split(".")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let value: any = t
        for (const k of keys) {
            value = value?.[k]
            if (value === undefined) return fallback
        }
        return typeof value === "string" ? value : fallback
    }

    const displayTitle = title || getNestedTranslation(config.titleKey, config.defaultTitle)
    const displayDescription = description || getNestedTranslation(config.descriptionKey, config.defaultDescription)

    return (
        <div className={cn(
            "flex items-center justify-center gap-3 rounded-2xl border border-dashed border-border/70 bg-muted/20 py-8 px-4 text-neutral-400 animate-fade-in",
            className
        )}>
            <Icon className="w-5 h-5 shrink-0" strokeWidth={1.5} />
            <div className="text-left min-w-0">
                <p className="auto-scroll text-sm font-medium">{displayTitle}</p>
                {description !== "" && (
                    <p className="auto-scroll text-xs text-neutral-400/70">{displayDescription}</p>
                )}
            </div>
        </div>
    )
}
