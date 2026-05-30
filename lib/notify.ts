//
//  notify.ts
//  Argent
//
//  Created by hilario on 22 May 2026 at 09:36.
//  Description: Provides shared notify logic for Argent, centralizing domain behavior, helpers, or
//  integration code used by pages, routes, and components.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

// Unified notification helper. Replaces direct `toast.*` calls so every UI
// event both:
//   1. shows the ephemeral sonner toast (immediate feedback), and
//   2. persists into the user's notification dropdown (review later).
//
// The persistence is fire-and-forget — a failed POST doesn't block the user
// or surface a second toast. If the network is down, the toast still fired,
// which is the part the user sees.
//
// Type mapping to the dropdown's color signal:
//   info   → "general"      (blue dot)
//   success → "user_action"  (blue dot, marked as user-initiated)
//   warning → "user_warning" (amber dot in the dropdown's typeColors map)
//   error   → "user_error"   (red dot)

import { toast } from "sonner"

type NotifyType = "info" | "success" | "warning" | "error"

const TOAST_FN: Record<NotifyType, (title: string, opts?: { description?: string }) => void> = {
    info: (t, o) => toast.info(t, o),
    success: (t, o) => toast.success(t, o),
    warning: (t, o) => toast.warning(t, o),
    error: (t, o) => toast.error(t, o),
}

const PERSIST_TYPE: Record<NotifyType, string> = {
    info: "general",
    success: "user_action",
    warning: "user_warning",
    error: "user_error",
}

interface NotifyOptions {
    /** Short subject line (≤ 120 chars). Required. */
    title: string
    /** Optional body / detail (≤ 500 chars). */
    message?: string
    /** Optional click-through link displayed in the dropdown. */
    actionUrl?: string
    /** Skip persisting to the dropdown — pure ephemeral toast. */
    transient?: boolean
}

function persistInBackground(type: NotifyType, opts: NotifyOptions) {
    if (opts.transient) return
    if (typeof window === "undefined") return

    fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            type: PERSIST_TYPE[type],
            title: opts.title,
            message: opts.message ?? opts.title,
            ...(opts.actionUrl && { actionUrl: opts.actionUrl }),
        }),
    })
        .then(() => {
            // Tell any open notification dropdown to refresh. Notification button
            // listens for this event and re-fetches so newly-toasted entries
            // appear without waiting for the 5-min polling cycle.
            window.dispatchEvent(new CustomEvent("notifications:changed"))
        })
        .catch(() => {
            // Don't surface — toast already fired, persistence is a nice-to-have.
        })
}

function makeNotify(type: NotifyType) {
    return (titleOrOpts: string | NotifyOptions, message?: string) => {
        const opts: NotifyOptions =
            typeof titleOrOpts === "string"
                ? { title: titleOrOpts, message }
                : titleOrOpts
        TOAST_FN[type](opts.title, opts.message ? { description: opts.message } : undefined)
        persistInBackground(type, opts)
    }
}

/**
 * `notify.info("Saved")` / `notify.success("Done", "Updated 12 rows")` /
 * `notify.error({ title: "Failed", message: "Reason", transient: true })`
 *
 * Call sites: replace `toast.info`/`toast.success`/`toast.warning`/`toast.error`.
 */
export const notify = {
    info: makeNotify("info"),
    success: makeNotify("success"),
    warning: makeNotify("warning"),
    error: makeNotify("error"),
}
