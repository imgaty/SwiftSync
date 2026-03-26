// Auto-Categorization Engine

// Matches transaction descriptions against user-defined rules (regex/keyword).
// Salt Edge provides its own global categories; these rules let users override or refine them with custom patterns. E.g.: "Continente" → "Groceries".

// Rules are created/managed in Settings → Categorization Rules.



export interface CategorizationRule {
    id: string
    pattern: string
    matchField: string
    tag: string
}

export const DEFAULT_RULES: Omit<CategorizationRule, "id">[] = []

export function mergeRules(
    userRules: { pattern: string; matchField: string; tag: string; priority?: number }[],
    defaultRules: Omit<CategorizationRule, "id">[]
): Omit<CategorizationRule, "id">[] {
    // User rules take priority, followed by default rules
    return [...userRules, ...defaultRules]
}

export function autoCategorize(
    description: string,
    rules: Omit<CategorizationRule, "id">[]

): string[] {
    const lowerDesc = description.toLowerCase()
    const tags: string[] = []

    for (const rule of rules) {
        try {
            const regex = new RegExp(rule.pattern, "i")

            if (regex.test(lowerDesc)) {
                tags.push(rule.tag)
            }

        } catch {
            // If regex fails, try simple includes
            const patterns = rule.pattern.split("|")

            for (const p of patterns) {
                if (lowerDesc.includes(p.trim().toLowerCase())) {
                    tags.push(rule.tag)
                    break
                }
            }
        }
    }

    return [...new Set(tags)]
}
