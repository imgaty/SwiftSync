//
//  auto-recategorize.tsx
//  Argent
//
//  Created by hilario on 22 May 2026 at 09:36.
//  Description: Implements the Auto recategorize React component for Argent, encapsulating reusable
//  interface structure, state handling, and presentation logic for feature screens.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

// Fires once per browser session: asks the server to re-run the
// categorization pipeline against any uncategorized transactions.
//
// The endpoint is idempotent and self-debouncing — it queries for empty/
// non-meaningful tags and returns 0 immediately when nothing's pending. The
// counterparty cache ensures each merchant only ever costs one embedding
// call total.
//
// We use sessionStorage to throttle to one call per browser session.
// Replaces "manually run a recategorize script" with "happens automatically
// after login / first dashboard load."

import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"

const SESSION_KEY = "argent.autoRecategorize"

export function AutoRecategorize() {
    const qc = useQueryClient()

    React.useEffect(() => {
        if (typeof window === "undefined") return
        if (sessionStorage.getItem(SESSION_KEY)) return
        sessionStorage.setItem(SESSION_KEY, "1")

        // Two-step: seed starter tags first (no-op if user already has tags),
        // then run the recategorize sweep. Without tags the embedding has
        // nothing to match against, so this ordering is what makes the
        // pipeline actually do useful work for fresh users.
        const run = async () => {
            try {
                await fetch("/api/tags/seed", { method: "POST" })
            } catch {
                /* ignore — recategorize will still try with whatever tags exist */
            }

            try {
                const res = await fetch("/api/transactions/recategorize", { method: "POST" })
                if (!res.ok) return
                const data = (await res.json()) as {
                    checked: number
                    updated: number
                    durationMs: number
                }
                if (data.updated > 0) {
                    qc.invalidateQueries({ queryKey: queryKeys.financeData })
                }
            } catch {
                // Don't surface — background nicety, not core functionality.
            }
        }

        run()
    }, [qc])

    return null
}
