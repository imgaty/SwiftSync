"use client"

import * as React from "react"
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
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
  DropdownTrigger,
} from "@/components/ui/dropdown"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarActionDropdown,
  CollapsedTooltip,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useLanguage } from "@/components/language-provider"

export function NavDocuments({
  items,
}: {
  items: {
    name: string
    url: string
    icon: LucideIcon
  }[]
}) {
  const { isMobile, setOpenMobile } = useSidebar()
  const { t } = useLanguage()
  const nav = (t as any).nav || {} as Record<string, string>
  const handleNavClick = React.useCallback(() => {
    if (isMobile) setOpenMobile(false)
  }, [isMobile, setOpenMobile])

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>{nav.documents || "Documents"}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.name}>
            <CollapsedTooltip asChild>
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
              <DropdownContent
                className="w-48 rounded-lg"
                side={isMobile ? "bottom" : "right"}
                align={isMobile ? "end" : "start"}
              >
                <DropdownItem>
                  <Folder className="text-neutral-400" />
                  <span>{nav.view_document || "View Document"}</span>
                </DropdownItem>
                <DropdownItem>
                  <Forward className="text-neutral-400" />
                  <span>{nav.share_document || "Share Document"}</span>
                </DropdownItem>
                <DropdownSeparator />
                <DropdownItem>
                  <Trash2 className="text-neutral-400" />
                  <span>{nav.delete_document || "Delete Document"}</span>
                </DropdownItem>
              </DropdownContent>
            </Dropdown>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
