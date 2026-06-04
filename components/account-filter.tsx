//
//  account-filter.tsx
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Implements the Account filter React component for Argent, encapsulating reusable
//  interface structure, state handling, and presentation logic for feature screens.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import * as React from "react"
import { SlidersHorizontal, Wallet, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { UDS } from "@/lib/UDS"
import type { Account } from "@/lib/types"
import { useLanguage } from "@/components/language-provider"
import { useCurrency } from "@/components/currency-provider"
import { getTranslations } from "@/lib/translation-utils"

interface AccountFilterProps {
    accounts: Account[]
    selectedIds: string[]
    onChange: (ids: string[]) => void
    isLoading?: boolean
    variant?: React.ComponentProps<typeof Button>["variant"]
    size?: React.ComponentProps<typeof Button>["size"]
    className?: string
}

export function AccountFilter({
    accounts,
    selectedIds,
    onChange,
    isLoading,
    variant = "glass",
    size = "icon",
    className,
}: AccountFilterProps) {
    const [open, setOpen] = React.useState(false)
    const { t } = useLanguage()
    const { formatCurrency } = useCurrency()
    const af = getTranslations(t, "account_filter")

    const allSelected = selectedIds.length === 0 // empty = all
    const selectedCount = selectedIds.length

    const toggle = React.useCallback((id: string) => {
        if (selectedIds.includes(id)) {
            onChange(selectedIds.filter((i) => i !== id))
        } else {
            onChange([...selectedIds, id])
        }
    }, [selectedIds, onChange])

    const selectAll = React.useCallback(() => {
        onChange([])
    }, [onChange])

    if (isLoading) {
        return null
    }

    if (accounts.length === 0) return null

    return (
        <Tooltip>
        <Popover open={open} onOpenChange={setOpen}>
            <TooltipTrigger asChild>
            <PopoverTrigger asChild>
                <Button
                    variant={variant}
                    size={size}
                    role="combobox"
                    aria-expanded={open}
                    className={cn("relative sq-overflow-visible", className)}
                >
                    <SlidersHorizontal />
                    {!allSelected && (
                        <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center sq-full bg-primary text-primary-foreground text-[10px] font-medium">
                            {selectedCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">
                {af.filter_by_account || "Filter by Account"}
            </TooltipContent>
            <PopoverContent align="end">
                {/* All accounts option */}
                <Button variant="ghost"
                    type="button"
                    data-glide-item="account-filter-all"
                    data-active={allSelected ? "true" : undefined}
                    onClick={selectAll}
                    className={cn(UDS.item, UDS.glideItem, UDS.itemIcon, "w-full")}
                >
                    <div className="flex size-4 items-center justify-center shrink-0">
                        <Wallet className="size-4" />
                    </div>
                    <span className="auto-scroll flex-1 min-w-0">{af.all_accounts || "All Accounts"}</span>
                </Button>

                <div className={UDS.separator} />

                {/* Individual accounts */}
                <div className="max-h-60 overflow-y-auto">
                    {accounts.map((acc) => {
                        const isSelected = selectedIds.includes(acc.id)
                        return (
                            <Button variant="ghost"
                                key={acc.id}
                                type="button"
                                data-glide-item={`account-filter-${acc.id}`}
                                data-active={isSelected ? "true" : undefined}
                                onClick={() => toggle(acc.id)}
                                className={cn(UDS.item, UDS.glideItem, UDS.itemIcon, "w-full")}
                            >
                                <div
                                    className="size-4 sq-full shrink-0 transition-opacity duration-150"
                                    style={{ backgroundColor: acc.color || "#3B82F6", opacity: isSelected ? 1 : 0.5 }}
                                />
                                <span className="auto-scroll flex-1 min-w-0 text-left">{acc.name}</span>
                                <span className={cn("text-xs tabular-nums shrink-0", UDS.muted)}>
                                    {formatCurrency(acc.balance)}
                                </span>
                            </Button>
                        )
                    })}
                </div>

                {/* Clear filter */}
                <div
                    className="grid transition-[grid-template-rows] duration-200 ease-out"
                    style={{ gridTemplateRows: allSelected ? "0fr" : "1fr" }}
                >
                    <div className="overflow-hidden min-h-0">
                        <div className={UDS.separator} />
                        <Button variant="ghost"
                            type="button"
                            data-glide-item="account-filter-clear"
                            onClick={selectAll}
                            className={cn(UDS.item, UDS.glideItem, UDS.itemIcon, "w-full")}
                        >
                            <X className="size-4 shrink-0 text-neutral-400" />
                            <span className="text-neutral-400 text-[13px]">{af.clear_filter || "Clear filter"}</span>
                        </Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
        </Tooltip>
    )
}
