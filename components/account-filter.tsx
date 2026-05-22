"use client"

import * as React from "react"
import { Check, SlidersHorizontal, Wallet, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { PRISM } from "@/lib/PRISM"
import type { Account } from "@/lib/types"
import { useLanguage } from "@/components/language-provider"
import { useCurrency } from "@/components/currency-provider"

interface AccountFilterProps {
    accounts: Account[]
    selectedIds: string[]
    onChange: (ids: string[]) => void
    isLoading?: boolean
}

export function AccountFilter({ accounts, selectedIds, onChange, isLoading }: AccountFilterProps) {
    const [open, setOpen] = React.useState(false)
    const { t } = useLanguage()
    const { formatCurrency } = useCurrency()
    const af = (t as any).account_filter || {} as Record<string, string>

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
                    variant="ghost"
                    size="icon"
                    role="combobox"
                    aria-expanded={open}
                    className="relative"
                >
                    <SlidersHorizontal />
                    {!allSelected && (
                        <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-medium">
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
                <button
                    type="button"
                    onClick={selectAll}
                    className={cn(PRISM.item, PRISM.itemHover, "w-full")}
                >
                    <div className="flex size-4 items-center justify-center shrink-0">
                        <Wallet className="size-4" />
                    </div>
                    <span className="auto-scroll flex-1 min-w-0">{af.all_accounts || "All Accounts"}</span>
                    <span className="flex size-4 shrink-0 items-center justify-center">
                        {allSelected && <Check className="size-4 text-black dark:text-white" />}
                    </span>
                </button>

                <div className={PRISM.separator} />

                {/* Individual accounts */}
                <div className="max-h-60 overflow-y-auto">
                    {accounts.map((acc) => {
                        const isSelected = selectedIds.includes(acc.id)
                        return (
                            <button
                                key={acc.id}
                                type="button"
                                onClick={() => toggle(acc.id)}
                                className={cn(PRISM.item, PRISM.itemHover, "w-full")}
                            >
                                <div
                                    className="size-4 rounded-full shrink-0 transition-opacity duration-150"
                                    style={{ backgroundColor: acc.color || "#3B82F6", opacity: isSelected ? 1 : 0.5 }}
                                />
                                <span className="auto-scroll flex-1 min-w-0 text-left">{acc.name}</span>
                                <span className={cn("text-xs tabular-nums shrink-0", PRISM.muted)}>
                                    {formatCurrency(acc.balance)}
                                </span>
                                <span className="flex size-4 shrink-0 items-center justify-center">
                                    {isSelected && <Check className="size-4 text-black dark:text-white" />}
                                </span>
                            </button>
                        )
                    })}
                </div>

                {/* Clear filter */}
                <div
                    className="grid transition-[grid-template-rows] duration-200 ease-out"
                    style={{ gridTemplateRows: allSelected ? "0fr" : "1fr" }}
                >
                    <div className="overflow-hidden min-h-0">
                        <div className={PRISM.separator} />
                        <button
                            type="button"
                            onClick={selectAll}
                            className={cn(PRISM.item, PRISM.itemHover, "w-full")}
                        >
                            <X className="size-4 shrink-0 text-neutral-400" />
                            <span className="text-neutral-400 text-[13px]">{af.clear_filter || "Clear filter"}</span>
                        </button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
        </Tooltip>
    )
}
