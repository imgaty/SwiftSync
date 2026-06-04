//
//  nav-pages.tsx
//  Argent
//
//  Created by Hilario Ferreira on 08 December 2025 at 19:38.
//  Description: Implements the Nav pages React component for Argent, encapsulating reusable interface
//  structure, state handling, and presentation logic for feature screens.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import * as React from "react"
import {
    ArrowDown,
    ArrowUp,
    EyeOff,
    ListTree,
    MoreHorizontal,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSettings } from "@/hooks/use-settings"
import type { SidebarPageDefinition, SidebarPageId } from "@/lib/sidebar-pages"

import {
    Dropdown,
    DropdownContent,
    DropdownItem,
    DropdownSeparator,
    DropdownTrigger,
} from "@/components/ui/dropdown"

import {
    SidebarGroup,
    SidebarMenu,
    SidebarActionDropdown,
    CollapsedTooltip,
    SidebarMenuItem,
    useSidebar,
} from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { useLanguage } from "@/components/language-provider"

export function NavPages({
    pages,
    allPages,
    onMovePage,
    onTogglePageHidden,
    isLoading = false,
}: {
    pages: SidebarPageDefinition[]
    allPages: SidebarPageDefinition[]
    onMovePage: (id: SidebarPageId, direction: "up" | "down") => void
    onTogglePageHidden: (id: SidebarPageId, hidden: boolean) => void
    isLoading?: boolean
}) {
    const { isMobile, side, setOpenMobile } = useSidebar()
    const { open } = useSettings()
    const { t } = useLanguage()
    const pathname = usePathname()
    const nav = (t as { nav?: Record<string, string> }).nav || {}

    const isPageActive = React.useCallback((item: SidebarPageDefinition) => (
        pathname === item.url || (item.url !== "/" && pathname.startsWith(`${item.url}/`))
    ), [pathname])

    const handleNavClick = React.useCallback(() => {
        if (isMobile) setOpenMobile(false)
    }, [isMobile, setOpenMobile])

    const handleOpenCustomizationSettings = React.useCallback(() => {
        window.requestAnimationFrame(() => open("customization"))
    }, [open])

    if (isLoading) {
        return (
            <SidebarGroup className="px-2 pt-1 pb-2">
                <SidebarMenu>
                    {[0, 1, 2, 3, 4, 5].map(i => (
                        <SidebarMenuItem key={i}>
                            <div className="flex items-center gap-2 p-2 w-full">
                                <Skeleton className="size-4" />
                                <Skeleton className="h-4 w-24 group-data-[collapsible=icon]:hidden" />
                            </div>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </SidebarGroup>
        )
    }

    return (
        <SidebarGroup className="px-2 pt-1 pb-2">
            <SidebarMenu>
                {pages.map((item) => {
                    const isActive = isPageActive(item)

                    return (
                        <SidebarMenuItem key={item.url}>
                            <CollapsedTooltip
                                asChild
                                tooltip={item.name}
                                isActive={isActive}
                            >
                                <Link href={item.url} onClick={handleNavClick} aria-current={isActive ? "page" : undefined}>
                                    <item.icon />
                                    <span className="group-data-[collapsible=icon]:hidden">{item.name}</span>
                                </Link>
                            </CollapsedTooltip>

                            <Dropdown>
                                <DropdownTrigger asChild>
                                    <SidebarActionDropdown showOnHover>
                                        <MoreHorizontal />
                                        <span className="sr-only">More</span>
                                    </SidebarActionDropdown>
                                </DropdownTrigger>

                                <DropdownContent className="w-48" side={isMobile ? "bottom" : side === "left" ? "right" : "left"} align={isMobile ? "end" : "start"}>
                                    <DropdownItem
                                        onSelect={() => onMovePage(item.id, "up")}
                                        disabled={allPages.findIndex((p) => p.id === item.id) === 0}
                                    >
                                        <ArrowUp className="text-muted-foreground" />
                                        <span>{nav.move_up || "Move up"}</span>
                                    </DropdownItem>
                                    <DropdownItem
                                        onSelect={() => onMovePage(item.id, "down")}
                                        disabled={allPages.findIndex((p) => p.id === item.id) === allPages.length - 1}
                                    >
                                        <ArrowDown className="text-muted-foreground" />
                                        <span>{nav.move_down || "Move down"}</span>
                                    </DropdownItem>

                                    <DropdownSeparator />

                                    <DropdownItem onSelect={() => onTogglePageHidden(item.id, true)}>
                                        <EyeOff className="text-muted-foreground" />
                                        <span>{nav.hide_page || "Hide page"}</span>
                                    </DropdownItem>

                                    <DropdownSeparator />

                                    <DropdownItem onSelect={handleOpenCustomizationSettings}>
                                        <ListTree className="text-muted-foreground" />
                                        <span>{nav.manage_pages || "Manage pages"}</span>
                                    </DropdownItem>
                                </DropdownContent>
                            </Dropdown>
                        </SidebarMenuItem>
                    )
                })}

            </SidebarMenu>
        </SidebarGroup>
    )
}
