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
    type LucideIcon 
} from "lucide-react"
import { useLanguage } from "@/components/language-provider"

// ==============================================================================
// TYPES
// ==============================================================================

export interface Tab {
    id: string
    path: string
    titleKey: string  // Key to look up in translations
    icon: LucideIcon
}

interface TabsContextType {
    tabs: Tab[]
    activeTabId: string | null
    openTab: (path: string, focus?: boolean) => void
    closeTab: (id: string) => void
    setActiveTab: (id: string) => void
    isTabOpen: (path: string) => boolean
    getTabInfo: (path: string) => { titleKey: string; icon: LucideIcon } | null
    getTabTitle: (tab: Tab) => string
    isInitialized: boolean
}

// ==============================================================================
// PAGE CONFIGURATION
// ==============================================================================

const PAGE_CONFIG: Record<string, { titleKey: string; icon: LucideIcon }> = {
    "/": { titleKey: "dashboard", icon: LayoutDashboard },
    "/Transactions": { titleKey: "transactions", icon: ArrowLeftRight },
    "/Budgets": { titleKey: "budgets", icon: PiggyBank },
    "/Bills": { titleKey: "bills", icon: Receipt },
    "/Accounts": { titleKey: "accounts", icon: Wallet },
    "/Calendar": { titleKey: "calendar", icon: Calendar },
}

// ==============================================================================
// CONTEXT
// ==============================================================================

const TabsContext = React.createContext<TabsContextType | null>(null)

export function usePageTabs() {
    const context = React.useContext(TabsContext)
    if (!context) {
        throw new Error("usePageTabs must be used within a TabsProvider")
    }
    return context
}

// ==============================================================================
// STORAGE
// ==============================================================================

const STORAGE_KEY = "swiftsync_tabs"

function loadTabsFromStorage(): Tab[] {
    if (typeof window === "undefined") return []
    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
            const parsed = JSON.parse(stored) as Array<{ id: string; path: string; titleKey?: string; title?: string }>
            // Restore icons from config, handle migration from old 'title' to 'titleKey'
            return parsed.map(tab => ({
                id: tab.id,
                path: tab.path,
                titleKey: tab.titleKey || PAGE_CONFIG[tab.path]?.titleKey || "dashboard",
                icon: PAGE_CONFIG[tab.path]?.icon || LayoutDashboard
            }))
        }
    } catch (e) {
        console.error("Failed to load tabs from storage", e)
        // Clear corrupted storage
        localStorage.removeItem(STORAGE_KEY)
    }
    return []
}

function saveTabsToStorage(tabs: Tab[]) {
    if (typeof window === "undefined") return
    try {
        // Don't store icon functions
        const serializable = tabs.map(({ id, path, titleKey }) => ({ id, path, titleKey }))
        localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable))
    } catch (e) {
        console.error("Failed to save tabs to storage", e)
    }
}

// ==============================================================================
// PROVIDER
// ==============================================================================

export function TabsProvider({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const router = useRouter()
    const { t } = useLanguage()
    const [tabs, setTabs] = React.useState<Tab[]>([])
    const [activeTabId, setActiveTabId] = React.useState<string | null>(null)
    const [isInitialized, setIsInitialized] = React.useState(false)

    // Get translated title for a tab
    const getTabTitle = React.useCallback((tab: Tab): string => {
        const key = tab.titleKey
        if (!key) return "Page"
        if (key === "dashboard") return t.sidebar_dashboard || "Dashboard"
        if (key === "calendar") return t.sidebar_calendar || "Calendar"
        const finance = t.finance as { [k: string]: unknown } | undefined
        const value = finance?.[key]
        return typeof value === "string" ? value : key.charAt(0).toUpperCase() + key.slice(1)
    }, [t])

    // Initialize tabs from storage on mount
    React.useEffect(() => {
        const storedTabs = loadTabsFromStorage()
        if (storedTabs.length > 0) {
            setTabs(storedTabs)
            // Find active tab based on current pathname
            const activeTab = storedTabs.find(t => t.path === pathname)
            if (activeTab) {
                setActiveTabId(activeTab.id)
            } else {
                // Current page not in tabs, add it
                const pageInfo = PAGE_CONFIG[pathname]
                if (pageInfo) {
                    const newTab: Tab = {
                        id: `tab-${Date.now()}`,
                        path: pathname,
                        titleKey: pageInfo.titleKey,
                        icon: pageInfo.icon
                    }
                    setTabs([...storedTabs, newTab])
                    setActiveTabId(newTab.id)
                }
            }
        } else {
            // No stored tabs, open current page as first tab
            const pageInfo = PAGE_CONFIG[pathname]
            if (pageInfo) {
                const newTab: Tab = {
                    id: `tab-${Date.now()}`,
                    path: pathname,
                    titleKey: pageInfo.titleKey,
                    icon: pageInfo.icon
                }
                setTabs([newTab])
                setActiveTabId(newTab.id)
            }
        }
        setIsInitialized(true)
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // Sync tabs to storage when they change
    React.useEffect(() => {
        if (isInitialized) {
            saveTabsToStorage(tabs)
        }
    }, [tabs, isInitialized])

    // Sync active tab when pathname changes (e.g., from sidebar navigation)
    React.useEffect(() => {
        if (!isInitialized) return
        
        const existingTab = tabs.find(t => t.path === pathname)
        if (existingTab) {
            setActiveTabId(existingTab.id)
        } else {
            // Page navigated to is not in tabs, add it
            const pageInfo = PAGE_CONFIG[pathname]
            if (pageInfo) {
                const newTab: Tab = {
                    id: `tab-${Date.now()}`,
                    path: pathname,
                    titleKey: pageInfo.titleKey,
                    icon: pageInfo.icon
                }
                setTabs(prev => [...prev, newTab])
                setActiveTabId(newTab.id)
            }
        }
    }, [pathname, isInitialized]) // eslint-disable-line react-hooks/exhaustive-deps

    const openTab = React.useCallback((path: string, focus = true) => {
        const existingTab = tabs.find(t => t.path === path)
        if (existingTab) {
            if (focus) {
                setActiveTabId(existingTab.id)
                router.push(path)
            }
            return
        }

        const pageInfo = PAGE_CONFIG[path]
        if (!pageInfo) return

        const newTab: Tab = {
            id: `tab-${Date.now()}`,
            path,
            titleKey: pageInfo.titleKey,
            icon: pageInfo.icon
        }
        setTabs(prev => [...prev, newTab])
        
        if (focus) {
            setActiveTabId(newTab.id)
            router.push(path)
        }
    }, [tabs, router])

    const closeTab = React.useCallback((id: string) => {
        const tabIndex = tabs.findIndex(t => t.id === id)
        if (tabIndex === -1) return

        const newTabs = tabs.filter(t => t.id !== id)
        setTabs(newTabs)

        // If closing active tab, switch to another
        if (activeTabId === id && newTabs.length > 0) {
            // Prefer tab to the left, then right
            const newActiveIndex = Math.min(tabIndex, newTabs.length - 1)
            const newActiveTab = newTabs[newActiveIndex]
            setActiveTabId(newActiveTab.id)
            router.push(newActiveTab.path)
        } else if (newTabs.length === 0) {
            // No tabs left, open dashboard
            openTab("/", true)
        }
    }, [tabs, activeTabId, router, openTab])

    const setActiveTab = React.useCallback((id: string) => {
        const tab = tabs.find(t => t.id === id)
        if (tab) {
            setActiveTabId(id)
            router.push(tab.path)
        }
    }, [tabs, router])

    const isTabOpen = React.useCallback((path: string) => {
        return tabs.some(t => t.path === path)
    }, [tabs])

    const getTabInfo = React.useCallback((path: string) => {
        return PAGE_CONFIG[path] || null
    }, [])

    const value = React.useMemo(() => ({
        tabs,
        activeTabId,
        openTab,
        closeTab,
        setActiveTab,
        isTabOpen,
        getTabInfo,
        getTabTitle,
        isInitialized
    }), [tabs, activeTabId, openTab, closeTab, setActiveTab, isTabOpen, getTabInfo, getTabTitle, isInitialized])

    return (
        <TabsContext.Provider value={value}>
            {children}
        </TabsContext.Provider>
    )
}
