//
//  route.ts
//  Argent
//
//  Created by hilario on 22 May 2026 at 09:36.
//  Description: Handles the /api/transactions/recategorize API endpoint for Argent, keeping request
//  parsing, business operations, and response formatting at the route boundary.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
/* POST /api/transactions/recategorize
 *
 * Idempotent batch: finds transactions in the caller's scope whose tag list
 * is empty or contains only non-meaningful slugs ("uncategorized", "other",
 * etc.), runs each through the categorization pipeline, and updates rows
 * whose tags would change.
 *
 * Designed to be safe to call repeatedly — the auto-recategorize hook on the
 * client fires once per session, and this endpoint is the worker. The
 * counterparty cache means each merchant only ever costs one embedding call,
 * so subsequent runs are fast.
 *
 * Returns:
 *   { checked: number, updated: number, durationMs: number }
 */

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext } from "@/lib/auth-helpers"
import { requirePermission, scopeFilter, scopeRecordFilter } from "@/lib/data-access"
import { isMeaningfulCategory } from "@/lib/PACE"
import {
    loadAvailableTags,
    loadEnabledRules,
    recategorizeStoredTransaction,
} from "@/lib/PACE.server"

export async function POST() {
    const ctx = await getAuthContext()
    if (!ctx) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }
    const permissionError = await requirePermission(ctx, "data:write")
    if (permissionError) return permissionError

    const startedAt = Date.now()

    // Pull only the columns we'll need for evaluation. `amount` is a Decimal
    // in the DB; coerce to number when evaluating.
    const all = await prisma.transaction.findMany({
        where: scopeFilter(ctx),
        select: {
            id: true,
            description: true,
            amount: true,
            type: true,
            counterpartyId: true,
            tags: true,
        },
    })

    // Candidates: empty tags, or every existing tag is non-meaningful.
    const candidates = all.filter((t) => {
        if (!t.tags || t.tags.length === 0) return true
        return t.tags.every((s) => !isMeaningfulCategory(s))
    })

    if (candidates.length === 0) {
        return NextResponse.json({
            checked: all.length,
            updated: 0,
            durationMs: Date.now() - startedAt,
        })
    }

    // Pre-load shared resources once for the whole batch.
    const [rules, availableTags] = await Promise.all([
        loadEnabledRules(ctx),
        loadAvailableTags(ctx),
    ])

    let updated = 0

    for (const tx of candidates) {
        try {
            const newTags = await recategorizeStoredTransaction(
                ctx,
                {
                    id: tx.id,
                    description: tx.description,
                    amount: Number(tx.amount),
                    type: tx.type,
                    counterpartyId: tx.counterpartyId,
                    tags: tx.tags,
                },
                { rules, availableTags }
            )

            // Compare sorted to avoid order-only false-diffs.
            const oldSorted = [...tx.tags].sort()
            const newSorted = [...newTags].sort()
            const same =
                oldSorted.length === newSorted.length &&
                oldSorted.every((t, i) => t === newSorted[i])

            if (same) continue

            await prisma.transaction.updateMany({
                where: scopeRecordFilter(ctx, tx.id),
                data: { tags: newTags },
            })
            updated++
        } catch (err) {
            // Don't let a single bad row blow up the whole batch.
            console.warn(
                `Recategorize failed for tx ${tx.id}:`,
                err instanceof Error ? err.message : err,
            )
        }
    }

    return NextResponse.json({
        checked: all.length,
        updated,
        durationMs: Date.now() - startedAt,
    })
}
