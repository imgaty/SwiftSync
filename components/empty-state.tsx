"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import {
    FileQuestion,
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

interface EmptyStateProps {
    variant?: EmptyStateVariant
    title?: string
    description?: string
    icon?: React.ReactNode
    action?: {
        label: string
        onClick: () => void
    }
    className?: string
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
    className
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

    return (
        <div className={cn(
            "flex flex-col items-center justify-center py-12 px-4 text-center animate-fade-in",
            className
        )}>
            {/* Illustration container with animated icon */}
            <div className="relative mb-6 animate-fade-in-scale">
                {/* Background decoration */}
                <div className="absolute inset-0 rounded-full bg-muted/50 dark:bg-muted/30 blur-xl scale-150" />
                
                {/* Icon container */}
                <div className="relative flex items-center justify-center w-24 h-24 rounded-full bg-muted/80 dark:bg-muted/50 transition-transform duration-300 hover:scale-105">
                    {icon || (
                        <Icon 
                            className="w-12 h-12 text-muted-foreground/70 dark:text-muted-foreground/50" 
                            strokeWidth={1.5}
                        />
                    )}
                </div>

                {/* Decorative dots */}
                <div className="absolute -top-2 -right-2 w-3 h-3 rounded-full bg-primary/20 animate-pulse" />
                <div className="absolute -bottom-1 -left-3 w-2 h-2 rounded-full bg-primary/30 animate-pulse" style={{ animationDelay: '0.5s' }} />
                <div className="absolute top-1/2 -right-4 w-1.5 h-1.5 rounded-full bg-primary/25 animate-pulse" style={{ animationDelay: '1s' }} />
            </div>

            {/* Text content */}
            <h3 className="text-lg font-semibold text-foreground mb-2 animate-fade-in-up stagger-1">
                {displayTitle}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-6 animate-fade-in-up stagger-2">
                {displayDescription}
            </p>

            {/* Action button */}
            {action && (
                <Button
                    variant="outline"
                    onClick={action.onClick}
                    className="gap-2 animate-fade-in-up stagger-3"
                >
                    {action.label}
                </Button>
            )}
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
            "flex items-center justify-center gap-3 py-8 px-4 text-muted-foreground animate-fade-in",
            className
        )}>
            <Icon className="w-5 h-5 shrink-0 animate-pulse" strokeWidth={1.5} />
            <div className="text-left min-w-0">
                <p className="auto-scroll text-sm font-medium">{displayTitle}</p>
                {description !== "" && (
                    <p className="auto-scroll text-xs text-muted-foreground/70">{displayDescription}</p>
                )}
            </div>
        </div>
    )
}
