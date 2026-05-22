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
    const nav = (t as { nav?: Record<string, string> }).nav || {}
    const handleNavClick = React.useCallback(() => {
        if (isMobile) setOpenMobile(false)
    }, [isMobile, setOpenMobile])

    if (isLoading) {
        return (
            <SidebarGroup className="px-2 pt-1 pb-2">
                <SidebarMenu>
                    {[0, 1, 2, 3, 4, 5].map(i => (
                        <SidebarMenuItem key={i}>
                            <div className="flex items-center gap-2 p-2 w-full">
                                <Skeleton className="h-4 w-4" />
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
                {pages.map((item) => (
                    <SidebarMenuItem key={item.url}>
                        <CollapsedTooltip asChild tooltip={item.name}>
                            <Link href={item.url} onClick={handleNavClick}>
                                <item.icon />
                                <span>{item.name}</span>
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
                                    <ArrowUp className="text-neutral-400" />
                                    <span>{nav.move_up || "Move up"}</span>
                                </DropdownItem>
                                <DropdownItem
                                    onSelect={() => onMovePage(item.id, "down")}
                                    disabled={allPages.findIndex((p) => p.id === item.id) === allPages.length - 1}
                                >
                                    <ArrowDown className="text-neutral-400" />
                                    <span>{nav.move_down || "Move down"}</span>
                                </DropdownItem>

                                <DropdownSeparator />

                                <DropdownItem onSelect={() => onTogglePageHidden(item.id, true)}>
                                    <EyeOff className="text-neutral-400" />
                                    <span>{nav.hide_page || "Hide page"}</span>
                                </DropdownItem>

                                <DropdownSeparator />

                                <DropdownItem onSelect={() => open("customization")}>
                                    <ListTree className="text-neutral-400" />
                                    <span>{nav.manage_pages || "Manage pages"}</span>
                                </DropdownItem>
                            </DropdownContent>
                        </Dropdown>
                    </SidebarMenuItem>
                ))}

            </SidebarMenu>
        </SidebarGroup>
    )
}
