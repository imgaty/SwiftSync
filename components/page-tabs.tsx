"use client"

import * as React from "react"
import { X, Plus } from "lucide-react"
import { usePageTabs, type Tab } from "@/components/tabs-provider"
import { useLanguage } from "@/components/language-provider"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
    LayoutDashboard, 
    ArrowLeftRight, 
    PiggyBank, 
    Receipt, 
    Wallet, 
    Calendar 
} from "lucide-react"

// ==============================================================================
// SINGLE TAB COMPONENT
// ==============================================================================

interface PageTabProps {
    tab: Tab
    title: string
    isActive: boolean
    onActivate: () => void
    onClose: () => void
    canClose: boolean
}

function PageTab({ tab, title, isActive, onActivate, onClose, canClose }: PageTabProps) {
    const Icon = tab.icon

    const handleClose = (e: React.MouseEvent) => {
        e.stopPropagation()
        onClose()
    }

    return (
        <div
            role="tab"
            aria-selected={isActive}
            onClick={onActivate}
            className={cn(
                "group relative flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer",
                "border-r border-border/50 min-w-[120px] max-w-[200px]",
                "transition-colors duration-150",
                isActive 
                    ? "bg-background text-foreground" 
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
        >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="truncate flex-1">{title}</span>
            {canClose && (
                <button
                    onClick={handleClose}
                    className={cn(
                        "shrink-0 p-0.5 rounded-sm",
                        "opacity-0 group-hover:opacity-100 transition-opacity",
                        "hover:bg-muted-foreground/20",
                        isActive && "opacity-100"
                    )}
                    aria-label={`Close ${title}`}
                >
                    <X className="w-3 h-3" />
                </button>
            )}
            {/* Active indicator */}
            {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
        </div>
    )
}

// ==============================================================================
// TABS BAR COMPONENT
// ==============================================================================

export function PageTabsBar() {
    const { tabs, activeTabId, setActiveTab, closeTab, openTab, isTabOpen, getTabTitle, isInitialized } = usePageTabs()
    const { t } = useLanguage()

    // Get translated titles for dropdown
    const getPageTitle = (titleKey: string) => {
        if (titleKey === "dashboard") return t.sidebar_dashboard || "Dashboard"
        if (titleKey === "calendar") return t.sidebar_calendar || "Calendar"
        const finance = t.finance as { [k: string]: unknown } | undefined
        const value = finance?.[titleKey]
        return typeof value === "string" ? value : titleKey.charAt(0).toUpperCase() + titleKey.slice(1)
    }

    const AVAILABLE_PAGES = [
        { path: "/", titleKey: "dashboard", icon: LayoutDashboard },
        { path: "/Transactions", titleKey: "transactions", icon: ArrowLeftRight },
        { path: "/Budgets", titleKey: "budgets", icon: PiggyBank },
        { path: "/Bills", titleKey: "bills", icon: Receipt },
        { path: "/Accounts", titleKey: "accounts", icon: Wallet },
        { path: "/Calendar", titleKey: "calendar", icon: Calendar },
    ]

    const unopenedPages = AVAILABLE_PAGES.filter(page => !isTabOpen(page.path))

    // Don't render until tabs are initialized
    if (!isInitialized || tabs.length === 0) return null

    return (
        <div className="flex items-center border-b border-border bg-muted/30 overflow-x-auto">
            <div className="flex items-stretch" role="tablist">
                {tabs.map(tab => (
                    <PageTab
                        key={tab.id}
                        tab={tab}
                        title={getTabTitle(tab)}
                        isActive={tab.id === activeTabId}
                        onActivate={() => setActiveTab(tab.id)}
                        onClose={() => closeTab(tab.id)}
                        canClose={tabs.length > 1}
                    />
                ))}
            </div>
            
            {/* Add Tab Button */}
            {unopenedPages.length > 0 && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 ml-1 shrink-0"
                            aria-label="Open new tab"
                        >
                            <Plus className="w-4 h-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                        {unopenedPages.map(page => {
                            const Icon = page.icon
                            return (
                                <DropdownMenuItem 
                                    key={page.path}
                                    onClick={() => openTab(page.path, true)}
                                >
                                    <Icon className="w-4 h-4 mr-2" />
                                    {getPageTitle(page.titleKey)}
                                </DropdownMenuItem>
                            )
                        })}
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
        </div>
    )
}
