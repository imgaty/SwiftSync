# Transaction Categorization System

## Purpose
This document defines a practical categorization strategy for SwiftSync transactions, with a focus on ambiguous payments such as MB WAY transfers, offshore descriptors, and small local purchases.

It is designed to work with the current rule engine in [lib/auto-categorize.ts](../lib/auto-categorize.ts) and provide a clear upgrade path to confidence-based auto-categorization.

## Current Engine (Already Implemented)
The current engine:
- Takes a transaction description and a list of user rules.
- Tries to compile each rule pattern as regex.
- Falls back to simple keyword matching if regex compilation fails.
- Returns all matching tags, deduplicated.

Current matching behavior:
1. Normalize input: lowercase description.
2. For each rule:
   - Try `new RegExp(rule.pattern, "i")`.
   - If regex matches, add `rule.tag`.
   - If regex is invalid, split pattern by `|` and use includes matching.
3. Return unique tags.

## Important Gaps in Current Behavior
- `matchField` exists in schema/API but the engine currently matches description only.
- `priority` exists in schema but the engine does not sort/evaluate by priority yet.
- No confidence scoring or explicit low-confidence fallback.
- No recurrence-based disambiguation.

## Recommended Categorization Architecture
Use a 3-layer decision flow.

### Layer 1: Deterministic Rules (High Trust)
- User rules and known-merchant rules.
- Regex/keyword matches.
- Explicit override capability.

Examples:
- `continente|pingo doce|lidl` -> `groceries`
- `uber eats|glovo|bolt food` -> `food_delivery`
- `mbway\s+joao` -> `transfer_personal`

### Layer 2: Heuristic Scoring (Medium Trust)
When deterministic rules are weak or conflicting, compute a confidence score using:
- Merchant normalization and fuzzy similarity.
- Recurrence patterns (same amount/date window monthly).
- Channel signal (card, transfer, MB WAY, direct debit).
- Direction signal (money in/out).
- Time/amount patterns (for example, small morning transactions as coffee/snack).

### Layer 3: Human Confirmation (Low Trust)
If confidence is below threshold:
- Keep transaction in `uncategorized` (or a neutral fallback category).
- Show 1-3 suggested categories.
- Save user correction as future rule or learning signal.

## Confidence Thresholds
Recommended defaults:
- `>= 0.85`: auto-apply category silently.
- `0.60 to 0.84`: suggest category and allow one-click confirm.
- `< 0.60`: do not auto-apply, ask user.

## Ambiguous Case Handling

### MB WAY / P2P Transfers
Problem: A transfer to a person can represent split bills, reimbursement, gift, or purchase.

Approach:
1. If recipient was previously labeled by user, reuse that label.
2. If descriptor includes known merchant token, prioritize merchant category.
3. If still ambiguous, classify as `transfer_personal` with low confidence and request confirmation.

### Offshore or Generic Company Names
Problem: Descriptor may contain only legal entity text (for example, `ABC LTD`).

Approach:
1. Check recurrence and amount stability.
2. Use currency/country and historical user labels.
3. If no strong signal, classify as `uncategorized` and ask user.

### Small Cafes and Local POS Strings
Problem: Noisy terminal strings make exact matching hard.

Approach:
1. Normalize descriptor by removing terminal IDs/noise tokens.
2. Apply fuzzy merchant matching.
3. Use amount/time patterns as secondary signal.
4. Learn from user corrections over time.

## Data Quality Rules
- Always store original description unchanged.
- Store normalized description separately for matching.
- Keep category decision metadata:
  - matched rules,
  - confidence score,
  - reason codes,
  - whether user confirmed/overrode.

## Testing Assets Included
Use these files:
- [docs/fake-categorization-rules.json](./fake-categorization-rules.json)
- [docs/fake-transactions-categorization-test.json](./fake-transactions-categorization-test.json)

The fake transactions include:
- Clear deterministic matches.
- Ambiguous MB WAY payments.
- Offshore/generic descriptors.
- Small local cafe/retail purchases.
- Recurring subscription-like patterns.

## Practical Test Procedure
1. Load rules from `docs/fake-categorization-rules.json`.
2. For each fake transaction, run current `autoCategorize(description, rules)`.
3. Compare returned tags against `expectedCurrentEngineTags`.
4. For ambiguous rows, use `expectedEnhancedSystem` fields to validate future confidence-based behavior.

## Success Criteria
- Deterministic cases categorize correctly with no user prompts.
- Ambiguous cases are not over-confidently auto-categorized.
- User corrections can be converted into durable rules.
