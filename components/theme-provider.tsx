//
//  theme-provider.tsx
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Implements the Theme provider React component for Argent, encapsulating reusable
//  interface structure, state handling, and presentation logic for feature screens.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import * as React from "react"

type Theme = "light" | "dark" | "system"
type ResolvedTheme = "light" | "dark"
type ThemeAttribute = "class" | `data-${string}`

type ThemeProviderProps = {
    children: React.ReactNode
    attribute?: ThemeAttribute | ThemeAttribute[]
    defaultTheme?: Theme
    enableSystem?: boolean
    enableColorScheme?: boolean
    storageKey?: string
    disableTransitionOnChange?: boolean
    forcedTheme?: Theme
    themes?: Theme[]
}

type ThemeContextValue = {
    theme?: Theme
    setTheme: (theme: string) => void
    forcedTheme?: Theme
    resolvedTheme?: ResolvedTheme
    systemTheme?: ResolvedTheme
    themes: Theme[]
}

const THEME_OPTIONS: Theme[] = ["light", "dark", "system"]
const RESOLVED_THEMES: ResolvedTheme[] = ["light", "dark"]
const BROWSER_THEME_COLORS: Record<ResolvedTheme, string> = {
    light: "#ffffff",
    dark: "#000000",
}
const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined)

function isTheme(value: string | null | undefined): value is Theme {
    return value === "light" || value === "dark" || value === "system"
}

function getSystemTheme(): ResolvedTheme {
    if (typeof window === "undefined") return "light"

    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function getStoredTheme(storageKey: string, defaultTheme: Theme): Theme {
    if (typeof window === "undefined") return defaultTheme

    try {
        const storedTheme = window.localStorage.getItem(storageKey)
        return isTheme(storedTheme) ? storedTheme : defaultTheme
    } catch {
        return defaultTheme
    }
}

function persistThemeCookie(storageKey: string, theme: Theme) {
    document.cookie = `${storageKey}=${theme}; Path=/; Max-Age=31536000; SameSite=Lax`
}

function withoutTransition() {
    const style = document.createElement("style")
    style.appendChild(document.createTextNode("*{-webkit-transition:none!important;transition:none!important}"))
    document.head.appendChild(style)

    return () => {
        window.getComputedStyle(document.body)
        requestAnimationFrame(() => {
            document.head.removeChild(style)
        })
    }
}

function applyThemeAttribute(attribute: ThemeAttribute | ThemeAttribute[], resolvedTheme: ResolvedTheme) {
    const attributes = Array.isArray(attribute) ? attribute : [attribute]

    for (const item of attributes) {
        if (item === "class") {
            document.documentElement.classList.remove(...RESOLVED_THEMES)
            document.documentElement.classList.add(resolvedTheme)
        } else {
            document.documentElement.setAttribute(item, resolvedTheme)
        }
    }
}

function upsertMeta(name: string, dataAttribute: string) {
    const selector = `meta[name="${name}"][${dataAttribute}="true"]`
    const existing = document.head.querySelector<HTMLMetaElement>(selector)

    if (existing) return existing

    const meta = document.createElement("meta")
    meta.name = name
    meta.setAttribute(dataAttribute, "true")
    document.head.appendChild(meta)
    return meta
}

function syncBrowserThemeChrome(resolvedTheme: ResolvedTheme) {
    const color = BROWSER_THEME_COLORS[resolvedTheme]
    const themeColor = upsertMeta("theme-color", "data-dynamic-theme-color")
    const appleStatusBar = upsertMeta("apple-mobile-web-app-status-bar-style", "data-dynamic-status-bar-style")
    const themeColorMetas = document.head.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')

    for (const meta of themeColorMetas) {
        meta.content = color
    }

    themeColor.content = color
    appleStatusBar.content = resolvedTheme === "dark" ? "black-translucent" : "default"
    document.documentElement.style.backgroundColor = color
    document.body.style.backgroundColor = color
}

export function ThemeProvider({
    children,
    attribute = "data-theme",
    defaultTheme = "system",
    enableSystem = true,
    enableColorScheme = true,
    storageKey = "theme",
    disableTransitionOnChange = false,
    forcedTheme,
    themes = THEME_OPTIONS,
}: ThemeProviderProps) {
    const [theme, setThemeState] = React.useState<Theme>(() => getStoredTheme(storageKey, defaultTheme))
    const [systemTheme, setSystemTheme] = React.useState<ResolvedTheme>(() => getSystemTheme())
    const activeTheme = forcedTheme ?? theme
    const resolvedTheme = activeTheme === "system" && enableSystem ? systemTheme : activeTheme === "dark" ? "dark" : "light"

    React.useEffect(() => {
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
        const handleChange = () => setSystemTheme(getSystemTheme())

        mediaQuery.addEventListener("change", handleChange)
        return () => mediaQuery.removeEventListener("change", handleChange)
    }, [])

    React.useEffect(() => {
        const handleStorage = (event: StorageEvent) => {
            if (event.key !== storageKey) return
            setThemeState(isTheme(event.newValue) ? event.newValue : defaultTheme)
        }

        window.addEventListener("storage", handleStorage)
        return () => window.removeEventListener("storage", handleStorage)
    }, [defaultTheme, storageKey])

    React.useEffect(() => {
        try {
            persistThemeCookie(storageKey, theme)
        } catch {
            // Ignore blocked cookie writes.
        }
    }, [storageKey, theme])

    React.useEffect(() => {
        const restoreTransition = disableTransitionOnChange ? withoutTransition() : undefined

        applyThemeAttribute(attribute, resolvedTheme)

        if (enableColorScheme) {
            document.documentElement.style.colorScheme = resolvedTheme
        }

        syncBrowserThemeChrome(resolvedTheme)

        restoreTransition?.()
    }, [attribute, disableTransitionOnChange, enableColorScheme, resolvedTheme])

    const setTheme = React.useCallback((value: string) => {
        const nextTheme = isTheme(value) ? value : defaultTheme
        setThemeState(nextTheme)

        try {
            window.localStorage.setItem(storageKey, nextTheme)
        } catch {
            // Ignore private browsing and blocked storage modes.
        }
    }, [defaultTheme, storageKey])

    const value = React.useMemo<ThemeContextValue>(() => ({
        theme,
        setTheme,
        forcedTheme,
        resolvedTheme,
        systemTheme,
        themes,
    }), [forcedTheme, resolvedTheme, setTheme, systemTheme, theme, themes])

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
    return React.useContext(ThemeContext) ?? {
        theme: undefined,
        setTheme: () => {},
        forcedTheme: undefined,
        resolvedTheme: undefined,
        systemTheme: undefined,
        themes: THEME_OPTIONS,
    }
}
