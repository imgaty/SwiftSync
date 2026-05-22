"use client"

import * as React from "react"
import { Search } from "lucide-react"

import { cn } from "@/lib/utils"

// Topbar "find on page" input. Sits in PageHeader between page-actions and
// the notification button. Detects platform to render the right shortcut
// hint (⌘F on macOS, Ctrl F elsewhere) and expands to a wider field on focus
// so long queries don't truncate.
export function PageSearchControl({ className }: { className?: string }) {
    const [query, setQuery] = React.useState("")
    const [focused, setFocused] = React.useState(false)
    const [isMac, setIsMac] = React.useState(false)

    React.useEffect(() => {
        if (typeof navigator === "undefined") return
        setIsMac(/Mac|iPhone|iPad|iPod/i.test(navigator.platform))
    }, [])

    const runFind = React.useCallback((backward = false) => {
        if (typeof window === "undefined") return
        if (!query.trim()) return
        const findFn = (window as Window & { find?: (...args: unknown[]) => boolean }).find
        if (typeof findFn !== "function") return

        findFn(query, false, backward, true, false, false, false)
    }, [query])

    React.useEffect(() => {
        if (typeof window === "undefined") return

        const onKeyDown = (event: KeyboardEvent) => {
            const isFindShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "f"
            if (!isFindShortcut) return

            const target = event.target as HTMLElement | null
            const isTypingTarget = !!target?.closest("input, textarea, [contenteditable=true], [role=textbox]")
            if (isTypingTarget) return

            event.preventDefault()
            const input = document.getElementById("page-search-control") as HTMLInputElement | null
            input?.focus()
            input?.select()
        }

        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
    }, [])

    const showShortcut = !focused && !query
    const shortcut = isMac ? "⌘F" : "Ctrl F"

    return (
        <div className={cn("relative hidden sm:inline-flex items-center", className)}>
            <Search
                className={cn(
                    "pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2",
                    "transition-colors duration-150",
                    focused
                        ? "text-neutral-700 dark:text-neutral-200"
                        : "text-neutral-400",
                )}
            />
            <input
                id="page-search-control"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onKeyDown={(e) => {
                    if (e.key === "Enter") {
                        e.preventDefault()
                        runFind(e.shiftKey)
                    }
                    if (e.key === "Escape") {
                        e.preventDefault()
                        ;(e.target as HTMLInputElement).blur()
                    }
                }}
                placeholder="Search this page"
                aria-label="Find on page"
                className={cn(
                    "h-8 rounded-full pl-9 text-[13px] leading-none",
                    "border bg-black/4 dark:bg-white/5",
                    "border-black/8 dark:border-white/10",
                    "text-foreground placeholder:text-neutral-400/80",
                    "outline-none transition-[width,background-color,border-color,box-shadow] duration-200 ease-out",
                    showShortcut ? "pr-14" : "pr-3",
                    focused
                        ? "w-72 bg-white dark:bg-white/8 border-black/15 dark:border-white/15 shadow-[0_0_0_3px_rgba(0,0,0,0.04)] dark:shadow-[0_0_0_3px_rgba(255,255,255,0.04)]"
                        : "w-48 hover:bg-black/6 dark:hover:bg-white/7",
                )}
            />
            {showShortcut && (
                <kbd
                    className={cn(
                        "pointer-events-none absolute right-2 top-1/2 -translate-y-1/2",
                        "inline-flex items-center justify-center px-1.5 h-5 min-w-6",
                        "rounded-md border border-black/8 dark:border-white/10",
                        "bg-white/60 dark:bg-white/5",
                        "text-[10.5px] font-medium text-neutral-500 dark:text-neutral-400",
                        "tabular-nums select-none",
                    )}
                >
                    {shortcut}
                </kbd>
            )}
        </div>
    )
}
