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

export function NavDocuments({
  items,
}: {
  items: {
    name: string
    url: string
    icon: LucideIcon
  }[]
}) {
  const { isMobile } = useSidebar()

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Documents</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.name}>
            <CollapsedTooltip asChild>
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
              <DropdownShell
                className="w-48 rounded-lg"
                side={isMobile ? "bottom" : "right"}
                align={isMobile ? "end" : "start"}
              >
                <DropdownItem>
                  <Folder className="text-neutral-500 dark:text-neutral-400" />
                  <span>View Document</span>
                </DropdownItem>
                <DropdownItem>
                  <Forward className="text-neutral-500 dark:text-neutral-400" />
                  <span>Share Document</span>
                </DropdownItem>
                <DropdownSeparator />
                <DropdownItem>
                  <Trash2 className="text-neutral-500 dark:text-neutral-400" />
                  <span>Delete Document</span>
                </DropdownItem>
              </DropdownShell>
            </Dropdown>
          </SidebarMenuItem>
        ))}
        <SidebarMenuItem>
          <CollapsedTooltip className="text-sidebar-foreground/70">
            <MoreHorizontal className="text-sidebar-foreground/70" />
            <span>More</span>
          </CollapsedTooltip>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  )
}
