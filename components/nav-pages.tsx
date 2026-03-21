"use client"

import {
    Folder,
    Forward,
    MoreHorizontal,
    Trash2,
    type LucideIcon,
} from "lucide-react"
import Link from "next/link"

import {
    Dropdown,
    DropdownShell,
    DropdownItem,
    DropdownSeparator,
    DropdownTrigger,
} from "@/components/ui/app-dropdown"

import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarActionDropdown,
    CollapsedTooltip,
    SidebarMenuItem,
    useSidebar,
} from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"

export function NavPages({
    pages,
    isLoading = false,
}: {
    pages: {
        name: string
        url: string
        icon: LucideIcon
    }[]
    isLoading?: boolean
}) {
    const { isMobile, side } = useSidebar()

    if (isLoading) {
        return (
            <SidebarGroup>
                <Skeleton className="h-4 w-16 mb-2 ml-2" />
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
        <SidebarGroup className="">
            <SidebarGroupLabel>Pages</SidebarGroupLabel>
            <SidebarMenu>
                {pages.map((item) => (
                    <SidebarMenuItem key={item.url}>
                        <CollapsedTooltip asChild tooltip={item.name}>
                            <Link href={item.url}>
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

                            <DropdownShell className="w-48 rounded-lg" side={isMobile ? "bottom" : side === "left" ? "right" : "left"} align={isMobile ? "end" : "start"}>
                                <DropdownItem>
                                    <Folder className="text-neutral-500 dark:text-neutral-400" />
                                    <span>View Page</span>
                                </DropdownItem>
                                <DropdownItem>
                                    <Forward className="text-neutral-500 dark:text-neutral-400" />
                                    <span>Share Page</span>
                                </DropdownItem>

                                <DropdownSeparator />

                                <DropdownItem>
                                    <Trash2 className="text-neutral-500 dark:text-neutral-400" />
                                    <span>Delete Page</span>
                                </DropdownItem>
                            </DropdownShell>
                        </Dropdown>
                    </SidebarMenuItem>
                ))}

                <SidebarMenuItem>
                    <CollapsedTooltip className="text-sidebar-foreground/70" tooltip="More">
                        <MoreHorizontal className="text-sidebar-foreground/70" />
                        <span>More</span>
                    </CollapsedTooltip>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarGroup>
    )
}
