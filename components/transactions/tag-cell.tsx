"use client"

// In-row tag editor for the transactions table.
//
// Wraps TagPicker with the PUT call to /api/transactions/[id] and triggers
// the "apply to similar?" propagate modal when the user adds a new tag.
//
// Optimistic update: the cell shows the new value immediately and rolls
// back if the server rejects.

import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { TagPicker } from "@/components/tag-picker"
import { queryKeys } from "@/lib/query-keys"
import { PropagateTagModal } from "./propagate-modal"

interface TagCellProps {
    transactionId: string
    tags: string[]
}

export function TagCell({ transactionId, tags }: TagCellProps) {
    const qc = useQueryClient()
    const [localTags, setLocalTags] = React.useState<string[]>(tags)
    const [propagatePrompt, setPropagatePrompt] = React.useState<{
        addedSlugs: string[]
    } | null>(null)

    // Keep local state in sync if the parent data refreshes.
    React.useEffect(() => {
        setLocalTags(tags)
    }, [tags])

    const handleChange = async (next: string[]) => {
        const prev = localTags
        const added = next.filter((s) => !prev.includes(s))
        setLocalTags(next) // optimistic
        try {
            const res = await fetch(`/api/transactions/${transactionId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tags: next }),
            })
            if (!res.ok) throw new Error(`Failed (${res.status})`)
            qc.invalidateQueries({ queryKey: queryKeys.financeData })
            // Only prompt to propagate when the user added something. Pure
            // removals don't warrant a "apply this everywhere" modal.
            if (added.length > 0) {
                setPropagatePrompt({ addedSlugs: added })
            }
        } catch (e) {
            setLocalTags(prev)
            toast.error(e instanceof Error ? e.message : "Failed to update tags")
        }
    }

    return (
        <>
            <TagPicker value={localTags} onChange={handleChange} />
            {propagatePrompt && (
                <PropagateTagModal
                    transactionId={transactionId}
                    addedSlugs={propagatePrompt.addedSlugs}
                    onClose={() => setPropagatePrompt(null)}
                />
            )}
        </>
    )
}
