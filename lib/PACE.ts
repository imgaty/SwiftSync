//
//  PACE.ts
//  Argent
//
//  Created by hilario on 22 May 2026 at 09:36.
//  Description: Provides shared PACE logic for Argent, centralizing domain behavior, helpers, or
//  integration code used by pages, routes, and components.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
import type { SaltEdgeTransaction } from "./salt-edge"
import { z } from "zod"

// =============================================================================
// SECTION 1 — TYPES (structured Rule)
// =============================================================================

export type RuleField = "counterparty" | "description" | "amount" | "type"

export type RuleOp =
    | "eq"
    | "neq"
    | "contains"
    | "notContains"
    | "in"
    | "gt"
    | "gte"
    | "lt"
    | "lte"
    | "between"

export interface RuleFilter {
    field: RuleField
    op: RuleOp
    // Value type depends on (field, op): string | string[] | number | [number, number].
    // Permissive here; the evaluator runtime-guards each case.
    value: unknown
}

export interface RuleEvaluationInput {
    counterpartyKey: string | null      // normalized (Counterparty.normalizedKey)
    counterpartyDisplay: string | null  // user-facing form
    description: string
    amount: number                      // absolute, matches Transaction.amount semantics
    type: "in" | "out"
}

export interface EvaluableRule {
    id: string
    filters: RuleFilter[]
    addTagSlugs: string[]
    enabled?: boolean
    priority?: number
}

export interface AvailableTag {
    slug: string
    name: string
}

// Allowed ops per field. Single source of truth for both the evaluator and the
// UI's cascading selects — keep in sync with the schemas below.
export const OPS_BY_FIELD: Record<RuleField, RuleOp[]> = {
    counterparty: ["eq", "neq", "contains", "notContains", "in"],
    description: ["contains", "notContains", "eq", "neq"],
    amount: ["eq", "neq", "gt", "gte", "lt", "lte", "between"],
    type: ["eq", "neq"],
}

// =============================================================================
// SECTION 2 — STRING NORMALIZATION & TYPE GUARDS
// =============================================================================

/**
 * Normalize a counterparty key for cache lookups.
 * "Continente, Lda.", "Continênte LDA", and "continente lda" all collapse to
 * the same key. Lowercase, strip diacritics, drop punctuation, collapse whitespace.
 */
export function normalizeCounterpartyKey(raw: string): string {
    return raw
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")        // combining diacritics range U+0300–U+036F
        .replace(/[^a-z0-9 ]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
}

function asString(v: unknown): string | null {
    return typeof v === "string" ? v : null
}
function asNumber(v: unknown): number | null {
    return typeof v === "number" && Number.isFinite(v) ? v : null
}
function asStringArray(v: unknown): string[] | null {
    if (!Array.isArray(v)) return null
    if (!v.every((x) => typeof x === "string")) return null
    return v as string[]
}
function asNumberPair(v: unknown): [number, number] | null {
    if (!Array.isArray(v) || v.length !== 2) return null
    const a = asNumber(v[0])
    const b = asNumber(v[1])
    if (a === null || b === null) return null
    return [a, b]
}
function eqStr(a: string, b: string): boolean {
    return a.toLowerCase() === b.toLowerCase()
}
function containsStr(haystack: string, needle: string): boolean {
    return haystack.toLowerCase().includes(needle.toLowerCase())
}
function normalizeTagSlug(slug: string): string {
    return slug.trim().toLowerCase()
}

// =============================================================================
// SECTION 3 — COUNTERPARTY EXTRACTION (Salt Edge → Counterparty)
// =============================================================================

/**
 * Pull a counterparty out of a Salt Edge transaction. Prefers payee
 * (outgoing), then payer (incoming), then merchant_id (POS / card). Returns
 * null if none are present — we don't infer from description here.
 */
export function extractCounterpartyFromSaltEdge(
    tx: SaltEdgeTransaction
): { normalizedKey: string; displayName: string; raw: string } | null {
    const raw =
        (typeof tx.extra?.payee === "string" && tx.extra.payee) ||
        (typeof tx.extra?.payer === "string" && tx.extra.payer) ||
        (typeof tx.extra?.merchant_id === "string" && tx.extra.merchant_id) ||
        null
    if (!raw) return null
    const trimmed = raw.trim()
    if (!trimmed) return null
    const normalizedKey = normalizeCounterpartyKey(trimmed)
    if (!normalizedKey) return null
    return { normalizedKey, displayName: trimmed, raw: trimmed }
}


// =============================================================================
// SECTION 4 — SALT EDGE CATEGORY MEANINGFULNESS
// =============================================================================

// Categories Salt Edge sometimes returns that carry no information. Treat as
// misses so the rule + cache + embedding fallbacks can take over.
const NON_MEANINGFUL_CATEGORIES = new Set([
    "",
    "uncategorized",
    "other",
    "unknown",
    "miscellaneous",
])

export function isMeaningfulCategory(category: string | undefined | null): boolean {
    if (!category || typeof category !== "string") return false
    return !NON_MEANINGFUL_CATEGORIES.has(category.trim().toLowerCase())
}

export function cleanTagList(tags: readonly string[] | null | undefined): string[] {
    if (!Array.isArray(tags)) return []
    const cleaned = tags
        .map((tag) => (typeof tag === "string" ? tag.trim().toLowerCase() : ""))
        .filter(Boolean)
    return [...new Set(cleaned)]
}

export function hasMeaningfulTags(tags: readonly string[] | null | undefined): boolean {
    return cleanTagList(tags).some((tag) => isMeaningfulCategory(tag))
}

export function resolveImportedTransactionTags(
    existingTags: readonly string[] | null | undefined,
    inferredTags: readonly string[] | null | undefined
): string[] {
    const existing = cleanTagList(existingTags)
    if (existing.some((tag) => isMeaningfulCategory(tag))) return existing

    const inferred = cleanTagList(inferredTags)
    return inferred.length > 0 ? inferred : ["other"]
}

export function tagsFromSaltEdgeCategory(category: string | undefined | null): string[] {
    if (!isMeaningfulCategory(category)) return []
    return [category!.trim().toLowerCase()]
}

// =============================================================================
// SECTION 5 — STRUCTURED RULE EVALUATOR
// =============================================================================

export function evaluateFilter(input: RuleEvaluationInput, filter: RuleFilter): boolean {
    switch (filter.field) {
        case "counterparty": {
            const key = input.counterpartyKey
            if (!key) return false
            if (filter.op === "in") {
                const vs = asStringArray(filter.value)
                if (!vs) return false
                const normalizedValues = vs.map(normalizeCounterpartyKey).filter(Boolean)
                return normalizedValues.some((v) => key === v)
            }
            const v = asString(filter.value)
            if (v === null) return false
            const normalizedValue = normalizeCounterpartyKey(v)
            if (!normalizedValue) return false
            switch (filter.op) {
                case "eq":          return key === normalizedValue
                case "neq":         return key !== normalizedValue
                case "contains":    return key.includes(normalizedValue)
                case "notContains": return !key.includes(normalizedValue)
                default:            return false
            }
        }
        case "description": {
            const desc = input.description
            const v = asString(filter.value)
            if (v === null) return false
            switch (filter.op) {
                case "eq":          return eqStr(desc, v)
                case "neq":         return !eqStr(desc, v)
                case "contains":    return containsStr(desc, v)
                case "notContains": return !containsStr(desc, v)
                default:            return false
            }
        }
        case "amount": {
            const amt = input.amount
            if (filter.op === "between") {
                const pair = asNumberPair(filter.value)
                if (!pair) return false
                const [lo, hi] = pair
                return amt >= lo && amt <= hi
            }
            const v = asNumber(filter.value)
            if (v === null) return false
            switch (filter.op) {
                case "eq":  return amt === v
                case "neq": return amt !== v
                case "gt":  return amt > v
                case "gte": return amt >= v
                case "lt":  return amt < v
                case "lte": return amt <= v
                default:    return false
            }
        }
        case "type": {
            const v = asString(filter.value)
            if (v !== "in" && v !== "out") return false
            switch (filter.op) {
                case "eq":  return input.type === v
                case "neq": return input.type !== v
                default:    return false
            }
        }
    }
}

/**
 * A rule matches when it's enabled (default true) AND every filter passes.
 * A rule with zero filters is treated as a no-op — we don't want a "match
 * everything" rule to slip in by accident.
 */
export function evaluateRule(input: RuleEvaluationInput, rule: EvaluableRule): boolean {
    if (rule.enabled === false) return false
    if (!Array.isArray(rule.filters) || rule.filters.length === 0) return false
    return rule.filters.every((f) => evaluateFilter(input, f))
}

/**
 * Evaluate every rule against the input and return the deduped union of
 * tag slugs from all matching rules.
 */
export function evaluateRules(input: RuleEvaluationInput, rules: EvaluableRule[]): string[] {
    const matched = new Set<string>()
    for (const r of rules) {
        if (!evaluateRule(input, r)) continue
        for (const slug of r.addTagSlugs) {
            const trimmed = slug.trim().toLowerCase()
            if (trimmed) matched.add(trimmed)
        }
    }
    return [...matched]
}

// =============================================================================
// SECTION 9 — LEGACY REGEX/KEYWORD ENGINE (PACERule)
// =============================================================================
//
// Pre-existing rule engine. Kept as-is for back-compat with /api/PACE-rules
// and /api/transactions (which still uses runPACE alongside the new structured
// evaluator). Both engines run additively; their tags get deduped at the call site.

export interface PACERule {
    id: string
    pattern: string
    matchField: string
    tag: string
}

// Hard cap on pattern length — short-circuits catastrophic-backtracking
// classes (e.g. /^(a+)+$/) by refusing long / suspicious patterns outright.
export const PACE_PATTERN_MAX_LEN = 200

// Conservative REDOS heuristic — not a formal check.
const SUSPICIOUS_NESTED_QUANTIFIER = /\([^)]*[+*]\)[+*?]/

export function isSafePACEPattern(pattern: string): boolean {
    if (typeof pattern !== "string") return false
    if (pattern.length === 0 || pattern.length > PACE_PATTERN_MAX_LEN) return false
    if (SUSPICIOUS_NESTED_QUANTIFIER.test(pattern)) return false
    try {
        new RegExp(pattern, "i")
        return true
    } catch {
        return false
    }
}

export const PACE_DEFAULT_RULES: Omit<PACERule, "id">[] = []

export function mergePACERules(
    personalRules: { pattern: string; matchField: string; tag: string; priority?: number }[],
    defaultRules: Omit<PACERule, "id">[]
): Omit<PACERule, "id">[] {
    // Priority order: personal > default. Note: the engine evaluates ALL
    // rules and accumulates ALL matching tags — order only matters if a caller
    // picks a single winner (none currently do).
    return [...personalRules, ...defaultRules]
}

export function runPACE(
    description: string,
    rules: Omit<PACERule, "id">[]
): string[] {
    const lowerDesc = description.toLowerCase()
    const tags: string[] = []

    for (const rule of rules) {
        // Defense-in-depth: refuse to compile patterns that fail the safety
        // check at runtime. Stored rules are validated at the API layer, but
        // bank-sync callers iterate over cached rules — never pass an
        // attacker-controlled pattern straight into RegExp.
        if (!isSafePACEPattern(rule.pattern)) {
            const patterns = rule.pattern.split("|")
            for (const p of patterns) {
                if (lowerDesc.includes(p.trim().toLowerCase())) {
                    const tag = normalizeTagSlug(rule.tag)
                    if (tag) tags.push(tag)
                    break
                }
            }
            continue
        }

        try {
            const regex = new RegExp(rule.pattern, "i")
            if (regex.test(lowerDesc)) {
                const tag = normalizeTagSlug(rule.tag)
                if (tag) tags.push(tag)
            }
        } catch {
            // Safe-pattern check passed but compile threw — fall back to keywords.
            const patterns = rule.pattern.split("|")
            for (const p of patterns) {
                if (lowerDesc.includes(p.trim().toLowerCase())) {
                    const tag = normalizeTagSlug(rule.tag)
                    if (tag) tags.push(tag)
                    break
                }
            }
        }
    }

    return [...new Set(tags)]
}

// =============================================================================
// SECTION 10 — ZOD SCHEMAS (legacy PACE + structured Rule)
// =============================================================================

const patternField = z
    .string()
    .trim()
    .min(1, "Pattern is required")
    .max(PACE_PATTERN_MAX_LEN, `Pattern must be at most ${PACE_PATTERN_MAX_LEN} characters`)
    .refine(isSafePACEPattern, "Pattern is invalid or may cause catastrophic backtracking")

export const paceRuleCreateSchema = z.object({
    pattern: patternField,
    matchField: z.enum(["description", "name"]).optional(),
    tag: z.string().trim().min(1).max(64),
    priority: z.number().int().min(0).max(1_000_000).optional(),
})

export const paceRuleUpdateSchema = z.object({
    pattern: patternField.optional(),
    matchField: z.enum(["description", "name"]).optional(),
    tag: z.string().trim().min(1).max(64).optional(),
    priority: z.number().int().min(0).max(1_000_000).optional(),
})

const ruleFieldSchema = z.enum(["counterparty", "description", "amount", "type"])
const ruleOpSchema = z.enum([
    "eq", "neq", "contains", "notContains", "in",
    "gt", "gte", "lt", "lte", "between",
])

const ruleFilterValueSchema = z.union([
    z.string().max(200),
    z.number(),                              // Zod v4 rejects NaN/Infinity by default
    z.array(z.string().max(200)).max(50),
    z.array(z.number()).length(2),
])

const ruleFilterSchema = z
    .object({
        field: ruleFieldSchema,
        op: ruleOpSchema,
        value: ruleFilterValueSchema,
    })
    .superRefine((filter, ctx) => {
        if (!OPS_BY_FIELD[filter.field].includes(filter.op)) {
            ctx.addIssue({
                code: "custom",
                path: ["op"],
                message: `Operator ${filter.op} is not valid for ${filter.field}`,
            })
            return
        }

        if (filter.field === "amount") {
            if (filter.op === "between") {
                if (!asNumberPair(filter.value)) {
                    ctx.addIssue({
                        code: "custom",
                        path: ["value"],
                        message: "Amount between filters require exactly two numbers",
                    })
                }
                return
            }
            if (asNumber(filter.value) === null) {
                ctx.addIssue({
                    code: "custom",
                    path: ["value"],
                    message: "Amount filters require a number",
                })
            }
            return
        }

        if (filter.field === "type") {
            if (filter.value !== "in" && filter.value !== "out") {
                ctx.addIssue({
                    code: "custom",
                    path: ["value"],
                    message: "Type filters require in or out",
                })
            }
            return
        }

        if (filter.op === "in") {
            if (!asStringArray(filter.value)) {
                ctx.addIssue({
                    code: "custom",
                    path: ["value"],
                    message: "In filters require a list of text values",
                })
            }
            return
        }

        if (asString(filter.value) === null) {
            ctx.addIssue({
                code: "custom",
                path: ["value"],
                message: "Text filters require a text value",
            })
        }
    })

const tagSlugSchema = z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9_-]+$/i, "Tag slug may only contain letters, digits, _ and -")

export const ruleCreateSchema = z.object({
    name: z.string().trim().min(1).max(100),
    enabled: z.boolean().optional(),
    filters: z.array(ruleFilterSchema).min(1).max(20),
    addTagSlugs: z.array(tagSlugSchema).min(1).max(20),
    priority: z.number().int().min(0).max(1_000_000).optional(),
})

export const ruleUpdateSchema = z.object({
    name: z.string().trim().min(1).max(100).optional(),
    enabled: z.boolean().optional(),
    filters: z.array(ruleFilterSchema).min(1).max(20).optional(),
    addTagSlugs: z.array(tagSlugSchema).min(1).max(20).optional(),
    priority: z.number().int().min(0).max(1_000_000).optional(),
})

export type RuleCreateInput = z.infer<typeof ruleCreateSchema>
export type RuleUpdateInput = z.infer<typeof ruleUpdateSchema>
