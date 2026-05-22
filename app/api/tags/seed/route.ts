/* POST /api/tags/seed
 *
 * One-shot bootstrapper: if the caller's scope has fewer than 2 meaningful
 * tags (i.e. nothing besides the legacy "uncategorized" placeholder), seed
 * a curated starter set so the embedding categorizer has actual targets to
 * match transactions against.
 *
 * Idempotent — checks for the slug before inserting each entry. Safe to call
 * repeatedly. The auto-recategorize hook on the client calls this once per
 * session before the recategorize sweep, which is what gets brand-new users
 * out of the "everything is uncategorized" trap without manual setup.
 *
 * Returns:
 *   { seeded: number, total: number }
 */

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext } from "@/lib/auth-helpers"
import { scopeFilter, scopeCreateData } from "@/lib/data-access"
import { isMeaningfulCategory } from "@/lib/PACE"

// Curated starter set. Keep it short and broadly applicable — these are the
// categories every personal-finance user touches in their first month. Users
// add domain-specific tags via the picker.
const STARTER_TAGS: { slug: string; name: string; color: string; icon: string }[] = [
    { slug: "groceries",     name: "Groceries",     color: "#10b981", icon: "shopping-cart" },
    { slug: "food",          name: "Food & Dining", color: "#f97316", icon: "utensils" },
    { slug: "transport",     name: "Transport",     color: "#3b82f6", icon: "car" },
    { slug: "shopping",      name: "Shopping",      color: "#ec4899", icon: "shopping-bag" },
    { slug: "subscriptions", name: "Subscriptions", color: "#a855f7", icon: "repeat" },
    { slug: "utilities",     name: "Utilities",     color: "#eab308", icon: "plug" },
    { slug: "housing",       name: "Housing",       color: "#ef4444", icon: "home" },
    { slug: "health",        name: "Health",        color: "#06b6d4", icon: "heart-pulse" },
    { slug: "income",        name: "Income",        color: "#84cc16", icon: "wallet" },
    { slug: "transfer",      name: "Transfer",      color: "#6366f1", icon: "arrow-left-right" },
]

export async function POST() {
    const ctx = await getAuthContext()
    if (!ctx) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Bail if the user already has meaningful tags — don't second-guess them.
    const existing = await prisma.tag.findMany({
        where: { ...scopeFilter(ctx), isArchived: false },
        select: { slug: true },
    })
    const meaningfulCount = existing.filter((t) => isMeaningfulCategory(t.slug)).length
    if (meaningfulCount >= 2) {
        return NextResponse.json({ seeded: 0, total: existing.length })
    }

    const existingSlugs = new Set(existing.map((t) => t.slug))
    let seeded = 0

    for (const tag of STARTER_TAGS) {
        if (existingSlugs.has(tag.slug)) continue
        await prisma.tag.create({
            data: {
                ...scopeCreateData(ctx),
                slug: tag.slug,
                name: tag.name,
                color: tag.color,
                icon: tag.icon,
                isSystem: true,
            },
        })
        seeded++
    }

    const total = await prisma.tag.count({
        where: { ...scopeFilter(ctx), isArchived: false },
    })

    return NextResponse.json({ seeded, total })
}
