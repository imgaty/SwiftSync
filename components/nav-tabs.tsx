"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import {
    LayoutDashboard,
    ArrowLeftRight,
    PiggyBank,
    Receipt,
    Wallet,
    Calendar,
    Target,
    Plus,
    X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/components/language-provider"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

// ─── Page registry ──────────────────────────────────────────────────────────
interface PageDef {
    id: string
    label: string
    href: string
    icon: React.ElementType
}

const STORAGE_KEY = "swiftsync-nav-tabs"

function usePageRegistry() {
    const { t } = useLanguage()
    const f = t.finance || {}

    return React.useMemo<PageDef[]>(() => [
        { id: "dashboard", label: t.sidebar_dashboard || "Dashboard", href: "/", icon: LayoutDashboard },
        { id: "transactions", label: f.transactions || "Transactions", href: "/Transactions", icon: ArrowLeftRight },
        { id: "budgets", label: f.budgets || "Budgets", href: "/Budgets", icon: PiggyBank },
        { id: "bills", label: f.bills || "Bills", href: "/Bills", icon: Receipt },
        { id: "accounts", label: f.accounts || "Accounts", href: "/Accounts", icon: Wallet },
        { id: "calendar", label: t.sidebar_calendar || "Calendar", href: "/Calendar", icon: Calendar },
        { id: "goals", label: t.sidebar_goals || "Goals", href: "/Goals", icon: Target },
    ], [t, f])
}

// ─── Persistence ────────────────────────────────────────────────────────────
function loadTabs(): string[] | null {
    if (typeof window === "undefined") return null
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return null
        const parsed = JSON.parse(raw)
        if (!Array.isArray(parsed) || parsed.length === 0) return null
        if (!parsed.includes("dashboard")) return ["dashboard", ...parsed]
        return parsed
    } catch { return null }
}

function saveTabs(ids: string[]) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ids)) } catch { }
}

// ─── Individual Tab (no framer-motion) ──────────────────────────────────────
const TabItem = React.memo(function TabItem({
    tab,
    active,
    canClose,
    onClose,
    onNavigate,
    onAuxClick,
    tabRef,
}: {
    tab: PageDef
    active: boolean
    canClose: boolean
    onClose: (id: string) => void
    onNavigate: (href: string) => void
    onAuxClick: (id: string, e: React.MouseEvent) => void
    tabRef: (el: HTMLDivElement | null) => void
}) {
    const Icon = tab.icon

    return (
        <div
            ref={tabRef}
            data-tab-id={tab.id}
            onClick={() => onNavigate(tab.href)}
            onAuxClick={(e) => onAuxClick(tab.id, e)}
            className={cn(
                "group/tab relative flex items-center gap-2 h-9 px-3.5 rounded-xl text-[13px] font-medium whitespace-nowrap select-none cursor-pointer shrink-0",
                "transition-colors duration-100",
                active
                    ? "text-foreground"
                    : "text-muted-foreground/50 hover:text-foreground/70",
            )}
        >
            <Icon className={cn(
                "size-[15px] shrink-0 transition-opacity duration-100",
                active ? "opacity-80" : "opacity-40 group-hover/tab:opacity-60"
            )} />
            <span className="truncate max-w-[120px]">
                {tab.label}
            </span>
            {canClose && (
                <button
                    onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        onClose(tab.id)
                    }}
                    className={cn(
                        "flex items-center justify-center size-5 rounded-md -mr-1 transition-all duration-100",
                        active
                            ? "opacity-40 hover:opacity-80 hover:bg-foreground/10"
                            : "opacity-0 group-hover/tab:opacity-40 hover:opacity-80! hover:bg-foreground/10"
                    )}
                    aria-label={`Close ${tab.label}`}
                >
                    <X className="size-3" />
                </button>
            )}
        </div>
    )
})

// ─── Main Component ─────────────────────────────────────────────────────────
export function NavTabs() {
    const pathname = usePathname()
    const router = useRouter()
    const { isLoading } = useLanguage()
    const pages = usePageRegistry()
    const [openTabIds, setOpenTabIds] = React.useState<string[]>(() => loadTabs() || ["dashboard"])
    const [pickerOpen, setPickerOpen] = React.useState(false)

    // Prefetch all open tab routes so navigating is instant
    React.useEffect(() => {
        for (const id of openTabIds) {
            const page = pages.find(p => p.id === id)
            if (page) router.prefetch(page.href)
        }
    }, [openTabIds, pages, router])

    // Refs for DOM-driven indicator (no React state)
    const containerRef = React.useRef<HTMLDivElement>(null)
    const indicatorRef = React.useRef<HTMLDivElement>(null)
    const tabRefs = React.useRef<Map<string, HTMLDivElement>>(new Map())
    const hasMeasuredOnce = React.useRef(false)

    // Persist whenever tabs change
    React.useEffect(() => { saveTabs(openTabIds) }, [openTabIds])

    // Auto-open a tab for the current route
    React.useEffect(() => {
        const match = pages.find(p => p.href === "/" ? pathname === "/" : pathname.startsWith(p.href))
        if (match && !openTabIds.includes(match.id)) {
            setOpenTabIds(prev => [...prev, match.id])
        }
    }, [pathname, pages]) // eslint-disable-line react-hooks/exhaustive-deps

    const openTabs = React.useMemo(
        () => openTabIds.map(id => pages.find(p => p.id === id)).filter(Boolean) as PageDef[],
        [openTabIds, pages]
    )

    const availablePages = React.useMemo(
        () => pages.filter(p => !openTabIds.includes(p.id)),
        [pages, openTabIds]
    )

    const isActive = React.useCallback((href: string) => {
        if (href === "/") return pathname === "/"
        return pathname.startsWith(href)
    }, [pathname])

    // Find the active tab ID
    const activeTabId = React.useMemo(() => {
        const active = openTabs.find(t => isActive(t.href))
        return active?.id ?? null
    }, [openTabs, isActive])

    // ─── DOM-driven indicator (no state, no re-render) ──────────────────
    const moveIndicator = React.useCallback((targetId?: string) => {
        const id = targetId ?? activeTabId
        if (!id || !containerRef.current || !indicatorRef.current) return
        const tabEl = tabRefs.current.get(id)
        if (!tabEl) return
        const containerRect = containerRef.current.getBoundingClientRect()
        const tabRect = tabEl.getBoundingClientRect()
        const el = indicatorRef.current

        // On first measurement, position instantly (no transition)
        if (!hasMeasuredOnce.current) {
            el.style.transition = "none"
            hasMeasuredOnce.current = true
        } else {
            el.style.transition = "transform 200ms cubic-bezier(0.4,0,0.2,1), width 200ms cubic-bezier(0.4,0,0.2,1)"
        }

        const left = tabRect.left - containerRect.left
        el.style.transform = `translateX(${left}px)`
        el.style.width = `${tabRect.width}px`
        el.style.opacity = "1"
    }, [activeTabId])

    // Move indicator when active tab or tab list changes
    React.useEffect(() => {
        const raf = requestAnimationFrame(() => moveIndicator())
        return () => cancelAnimationFrame(raf)
    }, [activeTabId, openTabIds, moveIndicator])

    // Re-measure on window resize
    React.useEffect(() => {
        const handler = () => moveIndicator()
        window.addEventListener("resize", handler)
        return () => window.removeEventListener("resize", handler)
    }, [moveIndicator])

    const addTab = React.useCallback((id: string) => {
        if (!openTabIds.includes(id)) {
            setOpenTabIds(prev => [...prev, id])
        }
        const page = pages.find(p => p.id === id)
        if (page) router.push(page.href)
        setPickerOpen(false)
    }, [openTabIds, pages, router])

    const closeTab = React.useCallback((id: string) => {
        if (id === "dashboard" || openTabIds.length <= 1) return
        const idx = openTabIds.indexOf(id)
        const next = openTabIds.filter(t => t !== id)
        setOpenTabIds(next)
        tabRefs.current.delete(id)

        const closedPage = pages.find(p => p.id === id)
        if (closedPage && isActive(closedPage.href)) {
            const newActiveId = next[Math.min(idx, next.length - 1)]
            const newPage = pages.find(p => p.id === newActiveId)
            if (newPage) router.push(newPage.href)
        }
    }, [openTabIds, pages, isActive, router])

    const handleAuxClick = React.useCallback((id: string, e: React.MouseEvent) => {
        if (e.button === 1) {
            e.preventDefault()
            closeTab(id)
        }
    }, [closeTab])

    const handleNavigate = React.useCallback((href: string) => {
        // Find which tab this href belongs to and slide indicator immediately
        const targetTab = pages.find(p => p.href === href)
        if (targetTab) {
            moveIndicator(targetTab.id)
        }
        // Route in a transition so React doesn't block the indicator animation
        React.startTransition(() => {
            router.push(href)
        })
    }, [router, pages, moveIndicator])

    return (
        <nav className="sticky top-0 z-10 px-4 pt-2.5 pb-2 md:px-6 md:pt-3 md:pb-2.5 pointer-events-none">
            <div
                ref={containerRef}
                className="glass-tabs-container relative flex items-center h-11 p-1 overflow-x-auto scrollbar-none pointer-events-auto"
            >
                {/* ── Sliding indicator pill ── */}
                {!isLoading && (
                    <div
                        ref={indicatorRef}
                        className="glass-tab-indicator absolute top-1 bottom-1 pointer-events-none will-change-transform"
                        style={{ opacity: 0, width: 0, transform: "translateX(0px)" }}
                    />
                )}

                {isLoading ? (
                    <div className="flex items-center gap-1.5 w-full py-1">
                        <Skeleton className="h-9 w-28 rounded-lg" />
                        <Skeleton className="h-9 w-28 rounded-lg" />
                        <Skeleton className="h-9 w-28 rounded-lg" />
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-0.5 z-1">
                            {openTabs.map((tab) => {
                                const active = isActive(tab.href)
                                const canClose = tab.id !== "dashboard" && openTabIds.length > 1
                                return (
                                    <TabItem
                                        key={tab.id}
                                        tab={tab}
                                        active={active}
                                        canClose={canClose}
                                        onClose={closeTab}
                                        onNavigate={handleNavigate}
                                        onAuxClick={handleAuxClick}
                                        tabRef={(el) => {
                                            if (el) tabRefs.current.set(tab.id, el)
                                            else tabRefs.current.delete(tab.id)
                                        }}
                                    />
                                )
                            })}
                        </div>

                        {/* Add tab picker */}
                        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                            <PopoverTrigger asChild>
                                <button
                                    className={cn(
                                        "glass-tab-add flex items-center justify-center size-8 shrink-0 ml-0.5 z-1",
                                        "text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors duration-150",
                                        availablePages.length === 0 && "opacity-30 cursor-not-allowed"
                                    )}
                                    aria-label="New tab"
                                    disabled={availablePages.length === 0}
                                >
                                    <Plus className="size-3.5" />
                                </button>
                            </PopoverTrigger>
                            <PopoverContent align="start" className="w-52 p-1.5">
                                <div className="space-y-0.5">
                                    <p className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                                        Open page
                                    </p>
                                    {availablePages.map(page => {
                                        const Icon = page.icon
                                        return (
                                            <button
                                                key={page.id}
                                                onClick={() => addTab(page.id)}
                                                className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-sm font-medium text-foreground/80 hover:bg-foreground/5 transition-colors duration-100"
                                            >
                                                <Icon className="size-4 shrink-0 opacity-50" />
                                                {page.label}
                                            </button>
                                        )
                                    })}
                                </div>
                            </PopoverContent>
                        </Popover>
                    </>
                )}
            </div>
        </nav>
    )
}
