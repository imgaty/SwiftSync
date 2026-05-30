//
//  propagate-modal.tsx
//  Argent
//
//  Created by hilario on 22 May 2026 at 09:36.
//  Description: Implements the Propagate modal transaction component for Argent, supporting transaction
//  review, tagging, editing, and related money-management workflows.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

// "Apply tag to similar transactions?" modal.
//
// Triggered after a successful in-row tag change when the user added at
// least one tag. Lets the user pick which dimensions ("similar" by what?)
// and previews the match count live as toggles change. On confirm calls
// POST /api/transactions/[id]/propagate-tag, which both retroactively
// updates matches and creates a Rule for future syncs.

import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import { X } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { PRISM } from "@/lib/PRISM"
import { Button } from "@/components/ui/button"
import { AnimatedToggle } from "@/components/ui/animated-toggle"
import {
    Dialog,
    DialogTitle,
    DialogDescription,
    DialogPortal,
    DialogOverlay,
} from "@/components/ui/dialog"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { queryKeys } from "@/lib/query-keys"

interface Dimensions {
    counterparty: boolean
    similarAmount: boolean
    similarName: boolean
    type: boolean
}

interface PropagateTagModalProps {
    transactionId: string
    addedSlugs: string[]
    onClose: () => void
}

export function PropagateTagModal({
    transactionId,
    addedSlugs,
    onClose,
}: PropagateTagModalProps) {
    const qc = useQueryClient()
    const [open, setOpen] = React.useState(true)
    const [dims, setDims] = React.useState<Dimensions>({
        counterparty: true,
        similarAmount: true,
        similarName: false,
        type: false,
    })
    const [matchCount, setMatchCount] = React.useState<number | null>(null)
    const [previewError, setPreviewError] = React.useState<string | null>(null)
    const [submitting, setSubmitting] = React.useState(false)

    const noDims = !dims.counterparty && !dims.similarAmount && !dims.similarName && !dims.type

    // Live preview: ask the server how many transactions would match. Debounced
    // a touch so rapid toggle clicks don't spam the endpoint.
    React.useEffect(() => {
        if (noDims) {
            setMatchCount(0)
            setPreviewError(null)
            return
        }
        let cancelled = false
        const timer = setTimeout(() => {
            fetch(`/api/transactions/${transactionId}/propagate-tag`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    addTagSlugs: addedSlugs,
                    dimensions: dims,
                    preview: true,
                }),
            })
                .then(async (r) => {
                    if (!r.ok) {
                        const err = await r.json().catch(() => ({}))
                        throw new Error(err?.error || `Preview failed (${r.status})`)
                    }
                    return r.json()
                })
                .then((data: { matchCount: number }) => {
                    if (cancelled) return
                    setMatchCount(data.matchCount)
                    setPreviewError(null)
                })
                .catch((e) => {
                    if (cancelled) return
                    setMatchCount(null)
                    setPreviewError(e instanceof Error ? e.message : "Preview failed")
                })
        }, 150)
        return () => {
            cancelled = true
            clearTimeout(timer)
        }
    }, [transactionId, addedSlugs, dims, noDims])

    const handleClose = (next: boolean) => {
        setOpen(next)
        if (!next) onClose()
    }

    const handleApply = async () => {
        if (noDims) return
        setSubmitting(true)
        try {
            const res = await fetch(`/api/transactions/${transactionId}/propagate-tag`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    addTagSlugs: addedSlugs,
                    dimensions: dims,
                }),
            })
            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error(err?.error || `Failed (${res.status})`)
            }
            const data = (await res.json()) as { updatedCount: number; ruleCreated: string | null }
            qc.invalidateQueries({ queryKey: queryKeys.financeData })
            toast.success(
                `Updated ${data.updatedCount} transaction${data.updatedCount === 1 ? "" : "s"}` +
                    (data.ruleCreated ? " · rule created" : ""),
            )
            handleClose(false)
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed to apply")
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogPortal>
                <DialogOverlay className={PRISM.overlay} />
                <DialogPrimitive.Content
                    className={cn(
                        "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50",
                        "w-[calc(100vw-2rem)] max-w-[480px]",
                        PRISM.container,
                        "p-6",
                        "data-[state=open]:animate-in data-[state=closed]:animate-out",
                        "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
                        "data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 duration-200",
                    )}
                >
                    <DialogTitle className={PRISM.title}>
                        Apply to similar transactions?
                    </DialogTitle>
                    <DialogDescription className={cn(PRISM.description, "mt-1")}>
                        Add{" "}
                        {addedSlugs.map((s, i) => (
                            <React.Fragment key={s}>
                                {i > 0 && ", "}
                                <code className="px-1 py-0.5 rounded bg-black/8 dark:bg-white/8 text-[12px]">
                                    {s}
                                </code>
                            </React.Fragment>
                        ))}{" "}
                        to all matching transactions and create a rule so future ones get the same tag.
                    </DialogDescription>

                    <div className="mt-5 space-y-3">
                        <DimensionRow
                            label="Same counterparty"
                            description="Other transactions from the same merchant or person."
                            checked={dims.counterparty}
                            onChange={(v) => setDims((p) => ({ ...p, counterparty: v }))}
                        />
                        <DimensionRow
                            label="Similar amount (±15%)"
                            description="Transactions within 15% of this amount."
                            checked={dims.similarAmount}
                            onChange={(v) => setDims((p) => ({ ...p, similarAmount: v }))}
                        />
                        <DimensionRow
                            label="Same description"
                            description="Transactions with the exact same description text."
                            checked={dims.similarName}
                            onChange={(v) => setDims((p) => ({ ...p, similarName: v }))}
                        />
                        <DimensionRow
                            label="Same type"
                            description="Income or expense — match the source's direction."
                            checked={dims.type}
                            onChange={(v) => setDims((p) => ({ ...p, type: v }))}
                        />
                    </div>

                    <div className="mt-5 px-3 py-2.5 rounded-lg bg-black/4 dark:bg-white/4 text-[13px]">
                        {noDims ? (
                            <span className="text-neutral-400">Select at least one dimension.</span>
                        ) : previewError ? (
                            <span className="text-red-400">{previewError}</span>
                        ) : matchCount === null ? (
                            <span className="text-neutral-400">Counting matches…</span>
                        ) : (
                            <span>
                                <strong>{matchCount}</strong>{" "}
                                {matchCount === 1 ? "transaction matches" : "transactions match"}
                            </span>
                        )}
                    </div>

                    <div className="mt-5 flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => handleClose(false)} disabled={submitting}>
                            Just this one
                        </Button>
                        <Button
                            onClick={handleApply}
                            disabled={submitting || noDims || matchCount === null}
                        >
                            {submitting ? "Applying…" : "Apply"}
                        </Button>
                    </div>

                    <DialogPrimitive.Close
                        className={cn("absolute right-4 top-4", PRISM.closeButton)}
                    >
                        <X className="size-4" />
                        <span className="sr-only">Close</span>
                    </DialogPrimitive.Close>
                </DialogPrimitive.Content>
            </DialogPortal>
        </Dialog>
    )
}

function DimensionRow({
    label,
    description,
    checked,
    onChange,
}: {
    label: string
    description: string
    checked: boolean
    onChange: (v: boolean) => void
}) {
    return (
        <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-0.5">
                <p className="text-[13px] font-medium leading-tight">{label}</p>
                <p className="text-xs text-neutral-400 leading-snug">{description}</p>
            </div>
            <AnimatedToggle checked={checked} onCheckedChange={onChange} />
        </div>
    )
}
