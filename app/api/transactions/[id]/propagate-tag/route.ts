/* Propagate a tag change from one transaction to all "similar" transactions
 * (same counterparty, similar amount, same description — selectable per call).
 *
 * POST body:
 *   {
 *     addTagSlugs:    string[]              // tags to add to matches
 *     removeTagSlugs?: string[]             // tags to remove from matches
 *     dimensions: {                         // which axes define "similar"
 *       counterparty?:  boolean
 *       similarAmount?: boolean
 *       similarName?:   boolean
 *       type?:          boolean
 *     }
 *     preview?: boolean                     // count only, no writes / no rule
 *   }
 *
 * Side effects on success (preview=false):
 *   - All matching transactions' tags are updated.
 *   - A Rule row is created that reproduces the same match for future syncs,
 *     so the propagation is durable: new transactions matching the criteria
 *     will be auto-tagged by the categorization pipeline.
 */

import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getAuthContext } from "@/lib/auth-helpers"
import { requirePermission, scopeFilter, scopeRecordFilter, scopeCreateData } from "@/lib/data-access"
import type { RuleFilter } from "@/lib/PACE"
import type { Prisma } from "@/lib/generated/prisma/client"

// Tolerance for "similar amount". 15% on either side feels right for typical
// recurring expenses (rent fluctuates by utilities, groceries vary, etc.) and
// is tight enough not to swallow unrelated transactions.
const AMOUNT_TOLERANCE = 0.15

const tagSlugSchema = z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9_-]+$/i, "Tag slug may only contain letters, digits, _ and -")

const requestSchema = z.object({
    addTagSlugs: z.array(tagSlugSchema).max(20).default([]),
    removeTagSlugs: z.array(tagSlugSchema).max(20).optional(),
    dimensions: z
        .object({
            counterparty: z.boolean().optional(),
            similarAmount: z.boolean().optional(),
            similarName: z.boolean().optional(),
            type: z.boolean().optional(),
        })
        .default({}),
    preview: z.boolean().optional(),
})

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const ctx = await getAuthContext()
    if (!ctx) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const permissionError = await requirePermission(ctx, "data:write")
    if (permissionError) return permissionError

    const { id } = await params
    const body = await request.json().catch(() => null)
    const parsed = requestSchema.safeParse(body)
    if (!parsed.success) {
        return NextResponse.json(
            { error: "Invalid payload", details: parsed.error.issues.slice(0, 5) },
            { status: 400 },
        )
    }

    const { addTagSlugs, removeTagSlugs, dimensions, preview } = parsed.data

    if (addTagSlugs.length === 0 && (!removeTagSlugs || removeTagSlugs.length === 0)) {
        return NextResponse.json(
            { error: "addTagSlugs or removeTagSlugs must be non-empty" },
            { status: 400 },
        )
    }

    const noDimensions =
        !dimensions.counterparty &&
        !dimensions.similarAmount &&
        !dimensions.similarName &&
        !dimensions.type
    if (noDimensions) {
        return NextResponse.json(
            { error: "At least one dimension must be selected" },
            { status: 400 },
        )
    }

    // Fetch the source transaction (scope-checked).
    const source = await prisma.transaction.findFirst({
        where: scopeRecordFilter(ctx, id),
        include: { counterparty: true },
    })
    if (!source) {
        return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
    }

    // Build the "matching" where-clause from the chosen dimensions.
    // Each enabled dimension narrows the result set. Source itself is always
    // included so its tags get the same treatment as the rest.
    const where: Prisma.TransactionWhereInput = {
        ...scopeFilter(ctx),
    }

    if (dimensions.counterparty) {
        if (!source.counterpartyId) {
            return NextResponse.json(
                { error: "Source has no counterparty; cannot match by counterparty" },
                { status: 400 },
            )
        }
        where.counterpartyId = source.counterpartyId
    }
    if (dimensions.similarAmount) {
        const amt = Number(source.amount)
        if (!Number.isFinite(amt) || amt === 0) {
            return NextResponse.json(
                { error: "Source amount is zero; cannot match by similar amount" },
                { status: 400 },
            )
        }
        const lo = +(amt * (1 - AMOUNT_TOLERANCE)).toFixed(2)
        const hi = +(amt * (1 + AMOUNT_TOLERANCE)).toFixed(2)
        where.amount = { gte: lo, lte: hi }
    }
    if (dimensions.similarName) {
        where.description = { equals: source.description, mode: "insensitive" }
    }
    if (dimensions.type) {
        where.type = source.type
    }

    // ---- Preview path: count only ----------------------------------------
    if (preview) {
        const matchCount = await prisma.transaction.count({ where })
        return NextResponse.json({ matchCount })
    }

    // ---- Apply path: update matches, create durable Rule -----------------
    const matches = await prisma.transaction.findMany({
        where,
        select: { id: true, tags: true },
    })

    let updatedCount = 0
    for (const t of matches) {
        const removeSet = new Set(removeTagSlugs ?? [])
        const next = [
            ...new Set([
                ...t.tags.filter((s) => !removeSet.has(s)),
                ...addTagSlugs,
            ]),
        ]
        // Skip rows that are already exactly correct.
        if (next.length === t.tags.length && next.every((x) => t.tags.includes(x))) {
            continue
        }
        await prisma.transaction.update({
            where: { id: t.id },
            data: { tags: next },
        })
        updatedCount++
    }

    // Build a Rule that reproduces the same match for future transactions.
    // We only create one when there's at least one tag being added — pure
    // "remove" propagations don't have anything useful to encode as a rule.
    let ruleId: string | null = null
    if (addTagSlugs.length > 0) {
        const filters: RuleFilter[] = []
        if (dimensions.counterparty && source.counterparty) {
            filters.push({
                field: "counterparty",
                op: "eq",
                value: source.counterparty.normalizedKey,
            })
        }
        if (dimensions.similarAmount) {
            const amt = Number(source.amount)
            const lo = +(amt * (1 - AMOUNT_TOLERANCE)).toFixed(2)
            const hi = +(amt * (1 + AMOUNT_TOLERANCE)).toFixed(2)
            filters.push({ field: "amount", op: "between", value: [lo, hi] })
        }
        if (dimensions.similarName) {
            filters.push({
                field: "description",
                op: "eq",
                value: source.description,
            })
        }
        if (dimensions.type) {
            filters.push({
                field: "type",
                op: "eq",
                value: source.type,
            })
        }

        // Friendly default name. The user can rename later in Settings → Rules.
        const namePrefix =
            dimensions.counterparty && source.counterparty
                ? source.counterparty.displayName
                : dimensions.similarName
                    ? source.description
                    : "Auto"
        const ruleName = `${namePrefix} → ${addTagSlugs.join(", ")}`.slice(0, 100)

        if (filters.length > 0) {
            const created = await prisma.rule.create({
                data: {
                    ...scopeCreateData(ctx),
                    name: ruleName,
                    enabled: true,
                    filters: filters as object[],
                    addTagSlugs,
                },
                select: { id: true },
            })
            ruleId = created.id
        }
    }

    return NextResponse.json({
        updatedCount,
        ruleCreated: ruleId,
    })
}
