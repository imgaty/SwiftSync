"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Account } from "@/lib/types"

interface AccountFilterProps {
    accounts: Account[]
    selectedIds: string[]
    onChange: (ids: string[]) => void
    isLoading?: boolean
}

export function AccountFilter({ accounts, selectedIds, onChange, isLoading }: AccountFilterProps) {
    const [open, setOpen] = React.useState(false)

    const allSelected = selectedIds.length === 0 // empty = all
    const selectedCount = selectedIds.length

    function toggle(id: string) {
        if (selectedIds.includes(id)) {
            // Removing — if this was the last one, go back to "all"
            const next = selectedIds.filter((i) => i !== id)
            onChange(next)
        } else {
            onChange([...selectedIds, id])
        }
    }

    function selectAll() {
        onChange([])
    }

    // Label text
    const label = React.useMemo(() => {
        if (allSelected) return "All Accounts"
        if (selectedCount === 1) {
            const acc = accounts.find((a) => a.id === selectedIds[0])
            return acc?.name || "1 Account"
        }
        return `${selectedCount} Accounts`
    }, [allSelected, selectedCount, selectedIds, accounts])

    if (isLoading) {
        return (
            <Button variant="outline" size="sm" disabled className="h-9 gap-2 rounded-xl border-black/10 dark:border-white/10">
                <Building2 className="size-4" />
                <span className="hidden sm:inline">Accounts</span>
            </Button>
        )
    }

    if (accounts.length === 0) return null

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    role="combobox"
                    aria-expanded={open}
                    className={cn(
                        "h-9 gap-2 rounded-xl border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-all duration-200",
                        !allSelected && "border-primary/30 bg-primary/5"
                    )}
                >
                    <Building2 className="size-4 shrink-0" />
                    <span className="hidden sm:inline max-w-[140px] truncate">{label}</span>
                    {!allSelected && (
                        <Badge variant="secondary" className="ml-0.5 h-5 px-1.5 text-[10px] font-semibold">
                            {selectedCount}
                        </Badge>
                    )}
                    <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[260px] p-0" align="end">
                <div className="p-2">
                    <p className="px-2 pb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Filter by Account
                    </p>

                    {/* All accounts option */}
                    <button
                        type="button"
                        onClick={selectAll}
                        className={cn(
                            "flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-sm transition-colors",
                            allSelected
                                ? "bg-primary/10 text-primary font-medium"
                                : "hover:bg-black/5 dark:hover:bg-white/5"
                        )}
                    >
                        <div className={cn(
                            "flex size-4 items-center justify-center rounded border transition-colors",
                            allSelected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-black/15 dark:border-white/15"
                        )}>
                            {allSelected && <Check className="size-3" />}
                        </div>
                        <div className="flex size-5 items-center justify-center rounded-full bg-black/8 dark:bg-white/8">
                            <Building2 className="size-3 text-muted-foreground" />
                        </div>
                        <span>All Accounts</span>
                    </button>

                    <div className="my-1.5 border-t border-black/6 dark:border-white/6" />

                    {/* Individual accounts */}
                    <div className="max-h-60 overflow-y-auto space-y-0.5">
                        {accounts.map((acc) => {
                            const isSelected = selectedIds.includes(acc.id)
                            return (
                                <button
                                    key={acc.id}
                                    type="button"
                                    onClick={() => toggle(acc.id)}
                                    className={cn(
                                        "flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-sm transition-colors",
                                        isSelected
                                            ? "bg-primary/10 font-medium"
                                            : "hover:bg-black/5 dark:hover:bg-white/5"
                                    )}
                                >
                                    <div className={cn(
                                        "flex size-4 items-center justify-center rounded border transition-colors",
                                        isSelected
                                            ? "border-primary bg-primary text-primary-foreground"
                                            : "border-black/15 dark:border-white/15"
                                    )}>
                                        {isSelected && <Check className="size-3" />}
                                    </div>
                                    <div
                                        className="size-5 rounded-full shrink-0"
                                        style={{ backgroundColor: acc.color || "#3B82F6" }}
                                    />
                                    <div className="flex-1 text-left min-w-0">
                                        <div className="truncate">{acc.name}</div>
                                        <div className="text-[11px] text-muted-foreground truncate">
                                            {acc.institution}
                                        </div>
                                    </div>
                                    <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                                        {acc.balance.toLocaleString("pt-PT", { style: "currency", currency: "EUR" })}
                                    </span>
                                </button>
                            )
                        })}
                    </div>

                    {/* Clear filter */}
                    {!allSelected && (
                        <>
                            <div className="my-1.5 border-t border-black/6 dark:border-white/6" />
                            <button
                                type="button"
                                onClick={selectAll}
                                className="w-full rounded-lg px-2 py-1.5 text-xs text-center text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Clear filter
                            </button>
                        </>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    )
}
