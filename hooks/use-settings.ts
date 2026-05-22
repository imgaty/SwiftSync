"use client"

import { useCallback, useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { SETTINGS_PAGES, type SettingsPage } from "@/components/settings-dialog"

const LEGACY_TO_CURRENT: Record<string, SettingsPage> = {
    general: "customization",
    appearance: "customization",
    sidebar: "customization",
}

// Track whether the settings param was set by in-app navigation (not a reload)
let settingsOpenedByApp = false

export function useSettings() {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const didMount = useRef(false)

    const settingsParam = searchParams.get("settings")

    // On first mount, if ?settings is in the URL it came from a reload — strip it
    const [suppressedOnLoad, setSuppressedOnLoad] = useState(
        () => Boolean(searchParams.get("settings")) && !settingsOpenedByApp
    )
    useEffect(() => {
        if (!didMount.current) {
            didMount.current = true
            if (suppressedOnLoad) {
                const params = new URLSearchParams(searchParams.toString())
                params.delete("settings")
                const qs = params.toString()
                router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
            }
        }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    const isOpen = !!settingsParam && !suppressedOnLoad
    const normalizedParam = settingsParam ? (LEGACY_TO_CURRENT[settingsParam] ?? settingsParam) : null
    const activePage: SettingsPage = SETTINGS_PAGES.includes(normalizedParam as SettingsPage)
        ? (normalizedParam as SettingsPage)
        : "account"

    const open = useCallback((page: SettingsPage = "account") => {
        settingsOpenedByApp = true
        setSuppressedOnLoad(false)
        const params = new URLSearchParams(searchParams.toString())
        params.set("settings", page)
        router.push(`${pathname}?${params.toString()}`, { scroll: false })
    }, [router, pathname, searchParams, setSuppressedOnLoad])

    const close = useCallback(() => {
        settingsOpenedByApp = false
        const params = new URLSearchParams(searchParams.toString())
        params.delete("settings")
        const qs = params.toString()
        router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    }, [router, pathname, searchParams])

    const setPage = useCallback((page: SettingsPage) => {
        settingsOpenedByApp = true
        const params = new URLSearchParams(searchParams.toString())
        params.set("settings", page)
        router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    }, [router, pathname, searchParams])

    const onOpenChange = useCallback((open: boolean) => {
        if (!open) close()
    }, [close])

    return { isOpen, activePage, open, close, setPage, onOpenChange }
}
