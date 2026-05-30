//
//  use-sidebar-page-preferences.ts
//  Argent
//
//  Created by hilario on 22 May 2026 at 09:36.
//  Description: Provides the use sidebar page preferences React hook for Argent, encapsulating reusable
//  state, effects, or data-access behavior for consuming components.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import * as React from "react"
import type { SidebarPageId } from "@/lib/sidebar-pages"

const STORAGE_KEY = "argent-sidebar-pages-v1"
const UPDATE_EVENT = "argent:sidebar-pages-updated"

type SidebarPagePrefs = {
    order: SidebarPageId[]
    hidden: SidebarPageId[]
}

const emptyPrefs: SidebarPagePrefs = {
    order: [],
    hidden: [],
}

function normalizePrefs(allIds: SidebarPageId[], raw: SidebarPagePrefs): SidebarPagePrefs {
    const known = new Set(allIds)

    const orderedKnown = raw.order.filter((id) => known.has(id))
    const remaining = allIds.filter((id) => !orderedKnown.includes(id))

    return {
        order: [...orderedKnown, ...remaining],
        hidden: raw.hidden.filter((id) => known.has(id)),
    }
}

function parsePrefs(value: string | null): SidebarPagePrefs {
    if (!value) return emptyPrefs

    try {
        const parsed = JSON.parse(value) as Partial<SidebarPagePrefs>
        return {
            order: Array.isArray(parsed.order) ? (parsed.order as SidebarPageId[]) : [],
            hidden: Array.isArray(parsed.hidden) ? (parsed.hidden as SidebarPageId[]) : [],
        }
    } catch {
        return emptyPrefs
    }
}

function readStoredPrefs(allIds: SidebarPageId[]): SidebarPagePrefs {
    if (typeof window === "undefined") {
        return {
            order: allIds,
            hidden: [],
        }
    }

    let parsed = emptyPrefs
    try {
        parsed = parsePrefs(window.localStorage.getItem(STORAGE_KEY))
    } catch {
        parsed = emptyPrefs
    }

    return normalizePrefs(allIds, parsed)
}

function persistPrefs(prefs: SidebarPagePrefs) {
    if (typeof window === "undefined") return

    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
    } catch {
        // Ignore storage failures and keep in-memory state.
    }

    window.dispatchEvent(new Event(UPDATE_EVENT))
}

export function useSidebarPagePreferences(allIds: SidebarPageId[]) {
    const [prefs, setPrefs] = React.useState<SidebarPagePrefs>(() => ({
        order: allIds,
        hidden: [],
    }))

    React.useEffect(() => {
        setPrefs(readStoredPrefs(allIds))
    }, [allIds])

    React.useEffect(() => {
        const syncFromStorage = () => {
            setPrefs(readStoredPrefs(allIds))
        }

        const onStorage = (event: StorageEvent) => {
            if (event.key && event.key !== STORAGE_KEY) return
            syncFromStorage()
        }

        window.addEventListener("storage", onStorage)
        window.addEventListener(UPDATE_EVENT, syncFromStorage)
        return () => {
            window.removeEventListener("storage", onStorage)
            window.removeEventListener(UPDATE_EVENT, syncFromStorage)
        }
    }, [allIds])

    const updatePrefs = React.useCallback((updater: (current: SidebarPagePrefs) => SidebarPagePrefs) => {
        setPrefs((current) => {
            const next = normalizePrefs(allIds, updater(current))
            persistPrefs(next)
            return next
        })
    }, [allIds])

    const movePage = React.useCallback((id: SidebarPageId, direction: "up" | "down") => {
        updatePrefs((current) => {
            const index = current.order.indexOf(id)
            if (index < 0) return current

            const targetIndex = direction === "up" ? index - 1 : index + 1
            if (targetIndex < 0 || targetIndex >= current.order.length) return current

            const nextOrder = [...current.order]
            const [moved] = nextOrder.splice(index, 1)
            nextOrder.splice(targetIndex, 0, moved)

            return {
                ...current,
                order: nextOrder,
            }
        })
    }, [updatePrefs])

    const reorderPages = React.useCallback((nextOrder: SidebarPageId[]) => {
        updatePrefs((current) => ({
            ...current,
            order: nextOrder,
        }))
    }, [updatePrefs])

    const setHidden = React.useCallback((id: SidebarPageId, hidden: boolean) => {
        updatePrefs((current) => {
            const hiddenSet = new Set(current.hidden)
            if (hidden) {
                hiddenSet.add(id)
            } else {
                hiddenSet.delete(id)
            }

            return {
                ...current,
                hidden: Array.from(hiddenSet),
            }
        })
    }, [updatePrefs])

    const reset = React.useCallback(() => {
        updatePrefs(() => ({
            order: allIds,
            hidden: [],
        }))
    }, [allIds, updatePrefs])

    const hiddenSet = React.useMemo(() => new Set(prefs.hidden), [prefs.hidden])
    const orderedIds = prefs.order

    return {
        orderedIds,
        hiddenSet,
        hiddenIds: prefs.hidden,
        movePage,
        reorderPages,
        setHidden,
        reset,
    }
}
