//
//  PACE.server.ts
//  Argent
//
//  Created by hilario on 22 May 2026 at 09:36.
//  Description: Provides shared PACE logic for Argent, centralizing domain behavior, helpers, or
//  integration code used by pages, routes, and components.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
import type { SaltEdgeTransaction } from "./salt-edge"
import type { AuthContext } from "./auth-helpers"
import {
    evaluateRules,
    extractCounterpartyFromSaltEdge,
    isMeaningfulCategory,
    tagsFromSaltEdgeCategory,
    type AvailableTag,
    type EvaluableRule,
    type RuleFilter,
    type RuleEvaluationInput,
} from "./PACE"

// =============================================================================
// SERVER-ONLY RULE/TAG LOADERS
// =============================================================================

export async function upsertCounterpartyForScope(
    ctx: AuthContext,
    parts: { normalizedKey: string; displayName: string }
): Promise<string> {
    const { prisma } = await import("./prisma")

    const existing = await prisma.counterparty.findFirst({
        where: { userId: ctx.userId, normalizedKey: parts.normalizedKey },
        select: { id: true, displayName: true },
    })

    if (existing) {
        if (existing.displayName !== parts.displayName) {
            await prisma.counterparty.update({
                where: { id: existing.id },
                data: { displayName: parts.displayName },
            })
        }
        return existing.id
    }

    const created = await prisma.counterparty.create({
        data: {
            userId: ctx.userId,
            normalizedKey: parts.normalizedKey,
            displayName: parts.displayName,
        },
        select: { id: true },
    })
    return created.id
}

export async function loadEnabledRules(ctx: AuthContext): Promise<EvaluableRule[]> {
    const { prisma } = await import("./prisma")

    const rows = await prisma.rule.findMany({
        where: { userId: ctx.userId, enabled: true },
        orderBy: { priority: "desc" },
    })
    return rows.map((r) => ({
        id: r.id,
        filters: (r.filters as unknown as RuleFilter[]) ?? [],
        addTagSlugs: r.addTagSlugs,
        enabled: r.enabled,
        priority: r.priority,
    }))
}

export async function loadAvailableTags(ctx: AuthContext): Promise<AvailableTag[]> {
    const { prisma } = await import("./prisma")

    const rows = await prisma.tag.findMany({
        where: { userId: ctx.userId, isArchived: false },
        select: { slug: true, name: true },
    })
    return rows.map((r) => ({ slug: r.slug, name: r.name }))
}

export async function runUserRules(
    ctx: AuthContext,
    input: RuleEvaluationInput,
    options?: { rules?: EvaluableRule[] }
): Promise<string[]> {
    const rules = options?.rules ?? (await loadEnabledRules(ctx))
    if (rules.length === 0) return []
    return evaluateRules(input, rules)
}

// =============================================================================
// EMBEDDING FALLBACK
// =============================================================================

const MODEL_NAME = "Xenova/paraphrase-multilingual-MiniLM-L12-v2"
const SIMILARITY_THRESHOLD = 0.3

type Extractor = (
    text: string,
    options?: { pooling?: "mean"; normalize?: boolean }
) => Promise<{ data: Float32Array | number[] }>

let extractorPromise: Promise<Extractor> | null = null

async function getExtractor(): Promise<Extractor> {
    if (!extractorPromise) {
        extractorPromise = (async () => {
            const { pipeline } = await import("@huggingface/transformers")
            const ext = await pipeline("feature-extraction", MODEL_NAME, { dtype: "q8" })
            return ext as unknown as Extractor
        })()
    }
    return extractorPromise
}

let tagEmbeddingCache: { key: string; vectors: { slug: string; vec: number[] }[] } | null = null

function tagSetKey(tags: AvailableTag[]): string {
    return tags
        .map((t) => `${t.slug}=${t.name}`)
        .sort()
        .join("|")
}

function tagToEmbeddingText(tag: AvailableTag): string {
    return `${tag.name} - ${tag.slug.replace(/[_-]/g, " ")}`
}

async function getTagEmbeddings(tags: AvailableTag[]): Promise<{ slug: string; vec: number[] }[]> {
    const key = tagSetKey(tags)
    if (tagEmbeddingCache?.key === key) return tagEmbeddingCache.vectors

    const extractor = await getExtractor()
    const vectors: { slug: string; vec: number[] }[] = []
    for (const t of tags) {
        const out = await extractor(tagToEmbeddingText(t), { pooling: "mean", normalize: true })
        vectors.push({ slug: t.slug, vec: Array.from(out.data) })
    }
    tagEmbeddingCache = { key, vectors }
    return vectors
}

function cosine(a: number[], b: number[]): number {
    let s = 0
    for (let i = 0; i < a.length; i++) s += a[i] * b[i]
    return s
}

interface EmbeddingCategorizationInput {
    description: string
    counterpartyDisplay: string | null
}

interface EmbeddingCategorizationResult {
    slug: string
    similarity: number
    source: "embedding"
}

export async function categorizeWithEmbedding(
    input: EmbeddingCategorizationInput,
    availableTags: AvailableTag[]
): Promise<EmbeddingCategorizationResult | null> {
    if (availableTags.length === 0) return null

    try {
        const extractor = await getExtractor()
        const tagVectors = await getTagEmbeddings(availableTags)

        const text = input.counterpartyDisplay
            ? `${input.counterpartyDisplay}. ${input.description}`
            : input.description

        const out = await extractor(text, { pooling: "mean", normalize: true })
        const vec = Array.from(out.data) as number[]

        let best = { slug: "", sim: -Infinity }
        for (const t of tagVectors) {
            const sim = cosine(t.vec, vec)
            if (sim > best.sim) best = { slug: t.slug, sim }
        }

        if (best.sim < SIMILARITY_THRESHOLD) return null
        return { slug: best.slug, similarity: best.sim, source: "embedding" }
    } catch (err) {
        console.warn("Embedding categorization failed:", err instanceof Error ? err.message : err)
        return null
    }
}

// =============================================================================
// PIPELINE ORCHESTRATORS
// =============================================================================

export async function buildSaltEdgeCategorization(
    ctx: AuthContext,
    tx: SaltEdgeTransaction,
    options?: { rules?: EvaluableRule[]; availableTags?: AvailableTag[] }
): Promise<{
    tags: string[]
    counterpartyId: string | null
    counterpartyRaw: string | null
}> {
    const cp = extractCounterpartyFromSaltEdge(tx)

    let counterpartyId: string | null = null
    if (cp) {
        counterpartyId = await upsertCounterpartyForScope(ctx, {
            normalizedKey: cp.normalizedKey,
            displayName: cp.displayName,
        })
    }

    const seTags = tagsFromSaltEdgeCategory(tx.category)

    const ruleTags = await runUserRules(
        ctx,
        {
            counterpartyKey: cp?.normalizedKey ?? null,
            counterpartyDisplay: cp?.displayName ?? null,
            description: tx.description ?? "",
            amount: Math.abs(tx.amount),
            type: tx.amount >= 0 ? "in" : "out",
        },
        { rules: options?.rules }
    )

    const tags = [...new Set([...seTags, ...ruleTags])]

    if (tags.length === 0 && counterpartyId) {
        const { prisma } = await import("./prisma")
        const cached = await prisma.counterparty.findUnique({
            where: { id: counterpartyId },
            select: { cachedTagSlug: true },
        })
        if (cached?.cachedTagSlug) {
            tags.push(cached.cachedTagSlug)
        } else {
            const availableTags = options?.availableTags ?? (await loadAvailableTags(ctx))
            const embResult = await categorizeWithEmbedding(
                {
                    description: tx.description ?? "",
                    counterpartyDisplay: cp?.displayName ?? null,
                },
                availableTags
            )
            if (embResult) {
                await prisma.counterparty.update({
                    where: { id: counterpartyId },
                    data: {
                        cachedTagSlug: embResult.slug,
                        cachedSource: embResult.source,
                        cachedAt: new Date(),
                    },
                })
                tags.push(embResult.slug)
            }
        }
    }

    return {
        tags,
        counterpartyId,
        counterpartyRaw: cp?.raw ?? null,
    }
}

export interface StoredTransactionForRecategorize {
    id: string
    description: string
    amount: number
    type: string
    counterpartyId: string | null
    tags: string[]
}

export async function recategorizeStoredTransaction(
    ctx: AuthContext,
    tx: StoredTransactionForRecategorize,
    options?: { rules?: EvaluableRule[]; availableTags?: AvailableTag[] }
): Promise<string[]> {
    const { prisma } = await import("./prisma")

    let counterpartyKey: string | null = null
    let counterpartyDisplay: string | null = null
    if (tx.counterpartyId) {
        const cp = await prisma.counterparty.findUnique({
            where: { id: tx.counterpartyId },
            select: { normalizedKey: true, displayName: true },
        })
        counterpartyKey = cp?.normalizedKey ?? null
        counterpartyDisplay = cp?.displayName ?? null
    }

    const meaningfulExisting = (tx.tags ?? []).filter((s) => isMeaningfulCategory(s))

    const ruleTags = await runUserRules(
        ctx,
        {
            counterpartyKey,
            counterpartyDisplay,
            description: tx.description ?? "",
            amount: Math.abs(Number(tx.amount)),
            type: tx.type === "in" ? "in" : "out",
        },
        { rules: options?.rules }
    )

    const tags = [...new Set([...meaningfulExisting, ...ruleTags])]

    if (tags.length === 0) {
        if (tx.counterpartyId) {
            const cached = await prisma.counterparty.findUnique({
                where: { id: tx.counterpartyId },
                select: { cachedTagSlug: true },
            })
            if (cached?.cachedTagSlug) {
                tags.push(cached.cachedTagSlug)
            }
        }

        if (tags.length === 0) {
            const availableTags = options?.availableTags ?? (await loadAvailableTags(ctx))
            if (availableTags.length > 0) {
                const embResult = await categorizeWithEmbedding(
                    {
                        description: tx.description ?? "",
                        counterpartyDisplay,
                    },
                    availableTags
                )
                if (embResult) {
                    if (tx.counterpartyId) {
                        await prisma.counterparty.update({
                            where: { id: tx.counterpartyId },
                            data: {
                                cachedTagSlug: embResult.slug,
                                cachedSource: embResult.source,
                                cachedAt: new Date(),
                            },
                        })
                    }
                    tags.push(embResult.slug)
                }
            }
        }
    }

    return tags.length > 0 ? tags : ["other"]
}
