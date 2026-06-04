//
//  find-replace-dialog.tsx
//  Argent
//
//  Created by hilario on 22 May 2026 at 09:36.
//  Description: Implements the Find replace dialog spreadsheet component for Argent, supporting workbook
//  editing controls, cell-level actions, and spreadsheet workspace interactions.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import * as React from "react"
import { Search, Replace } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { UDS } from "@/lib/UDS"

export function FindReplaceDialog({
    open,
    onOpenChange,
    onFind,
}: {
    open: boolean
    onOpenChange: (v: boolean) => void
    onFind: (
        find: string,
        replace: string,
        opts: { matchCase?: boolean; whole?: boolean; replaceAll?: boolean },
    ) => number
}) {
    const [find, setFind] = React.useState("")
    const [replace, setReplace] = React.useState("")
    const [matchCase, setMatchCase] = React.useState(false)
    const [whole, setWhole] = React.useState(false)

    const inputCls =
        `${UDS.inlineSurface} h-8 w-full px-2 text-xs outline-none transition-colors focus:border-primary/50`

    const checkbox = (label: string, value: boolean, onChange: (v: boolean) => void) => (
        <label className="flex items-center gap-2 text-[11px] text-neutral-600 dark:text-neutral-400">
            <input
                type="checkbox"
                checked={value}
                onChange={(e) => onChange(e.target.checked)}
                className="size-3 cursor-pointer"
            />
            {label}
        </label>
    )

    const handleFindNext = () => {
        const n = onFind(find, replace, { matchCase, whole, replaceAll: false })
        if (!n) toast.info("No matches")
    }
    const handleReplaceAll = () => {
        const n = onFind(find, replace, { matchCase, whole, replaceAll: true })
        toast.success(`${n} replacement${n === 1 ? "" : "s"}`)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-sm">
                        <Search className="size-4" />
                        Find &amp; Replace
                    </DialogTitle>
                    <DialogDescription className="text-[11px]">
                        Search across the active sheet
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-2">
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">Find what</label>
                        <input className={inputCls} value={find} onChange={(e) => setFind(e.target.value)} autoFocus />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">Replace with</label>
                        <input className={inputCls} value={replace} onChange={(e) => setReplace(e.target.value)} />
                    </div>
                    <div className="flex items-center gap-4">
                        {checkbox("Match case", matchCase, setMatchCase)}
                        {checkbox("Whole word", whole, setWhole)}
                    </div>
                </div>
                <DialogFooter className="gap-2">
                    <Button variant="ghost" size="sm" onClick={handleFindNext}>
                        <Search className="size-3.5 mr-1.5" />
                        Find next
                    </Button>
                    <Button variant="solid" size="sm" onClick={handleReplaceAll}>
                        <Replace className="size-3.5 mr-1.5" />
                        Replace all
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
