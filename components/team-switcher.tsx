"use client"

import * as React from "react"
import { ChevronsUpDown, Plus } from "lucide-react"

import {
  Dropdown,
  DropdownShell,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
  DropdownShortcut,
  DropdownTrigger,
} from "@/components/ui/app-dropdown"
import {
  SidebarMenu,
  CollapsedTooltip,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"

export function TeamSwitcher({
  teams,
  isLoading = false,
}: {
  teams: {
    name: string
    logo: React.ElementType
    plan: string
  }[]
  isLoading?: boolean
}) {
  const { isMobile, side } = useSidebar()
  const [activeTeam, setActiveTeam] = React.useState(teams[0])

  if (isLoading) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <div className="flex items-center gap-2 p-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="flex-1 group-data-[collapsible=icon]:hidden">
              <Skeleton className="h-4 w-24 mb-1" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  if (!activeTeam) {
    return null
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <Dropdown>
          <DropdownTrigger asChild>
            <CollapsedTooltip
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <activeTeam.logo className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="auto-scroll font-medium">{activeTeam.name}</span>
                <span className="auto-scroll text-xs">{activeTeam.plan}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </CollapsedTooltip>
          </DropdownTrigger>
          <DropdownShell
            className="min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : side === "left" ? "right" : "left"}
            sideOffset={4}
          >
            <DropdownLabel className="text-neutral-500 dark:text-neutral-400 text-xs">
              Teams
            </DropdownLabel>
            {teams.map((team, index) => (
              <DropdownItem
                key={team.name}
                onClick={() => setActiveTeam(team)}
                className="gap-2 p-2"
              >
                <div className="flex size-6 items-center justify-center rounded-md border">
                  <team.logo className="size-3.5 shrink-0" />
                </div>
                {team.name}
                <DropdownShortcut>⌘{index + 1}</DropdownShortcut>
              </DropdownItem>
            ))}
            <DropdownSeparator />
            <DropdownItem className="gap-2 p-2">
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <Plus className="size-4" />
              </div>
              <div className="text-neutral-500 dark:text-neutral-400 font-medium">Add team</div>
            </DropdownItem>
          </DropdownShell>
        </Dropdown>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
