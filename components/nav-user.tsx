//
//  nav-user.tsx
//  Argent
//
//  Created by Hilario Ferreira on 08 December 2025 at 19:38.
//  Description: Implements the Nav user React component for Argent, encapsulating reusable interface
//  structure, state handling, and presentation logic for feature screens.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import * as React from "react"
import {
  ChevronsUpDown,
  LogOut,
  Settings,
  Shield,
} from "lucide-react"
import { useRouter } from "next/navigation"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Dropdown,
  DropdownContent,
  DropdownSectionItem,
  DropdownLabel,
  DropdownSeparator,
  DropdownTrigger,
  DropdownLanguageSubmenu,
  DropdownSidebarPositionSection,
} from "@/components/ui/dropdown"
import {
  SidebarMenu,
  CollapsedTooltip,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"

import { useLanguage } from "@/components/language-provider"
import { useAuth } from "@/components/auth-provider"
import { useSettings } from "@/hooks/use-settings"
import { UDS } from "@/lib/UDS"
import type { Language } from "@/lib/languages"
import { getTranslations } from "@/lib/translation-utils"
import { cn } from "@/lib/utils"

export function NavUser({
  user,
  isLoading = false,
}: {
  user: {
    name: string
    email: string
    role: string
    avatar: string
  }
  isLoading?: boolean
}) {
  const router = useRouter()
  const { isMobile, side, renderedSide, setSide } = useSidebar()
  const { t, language, setLanguage } = useLanguage()
  const { logout } = useAuth()
  const settings = useSettings()
  const isAdmin = user.role === "admin" || user.role === "superadmin"
  const [dropdownOpen, setDropdownOpen] = React.useState(false)
  const sidebarSkeletonClass = "!bg-sidebar-foreground/10 dark:!bg-sidebar-foreground/15"
  const navCopy = React.useMemo(() => getTranslations(t, "nav"), [t])
  const settingsCopy = React.useMemo(() => getTranslations(t, "settings"), [t])
  const adminCopy = React.useMemo(() => getTranslations(t, "admin"), [t])

  // Generate initials from name
  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U'

  const handleLogout = async () => {
    await logout()
  }

  const openSettingsPage = React.useCallback((page: "account" | "customization") => {
    setDropdownOpen(false)
    window.requestAnimationFrame(() => settings.open(page))
  }, [settings])

  const handleOpenAccountSettings = React.useCallback(() => {
    openSettingsPage("account")
  }, [openSettingsPage])

  const handleOpenCustomizationSettings = React.useCallback(() => {
    openSettingsPage("customization")
  }, [openSettingsPage])

  if (isLoading) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <div className="flex items-center gap-2 p-2">
            <Skeleton className={cn("size-8 sq-lg", sidebarSkeletonClass)} />
            <div className="flex-1 group-data-[collapsible=icon]:hidden">
              <Skeleton className={cn("h-4 w-24 mb-1", sidebarSkeletonClass)} />
              <Skeleton className={cn("h-3 w-32", sidebarSkeletonClass)} />
            </div>
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <Dropdown open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownTrigger asChild>
            <CollapsedTooltip size="lg">
              <Avatar className="size-8 sq-lg">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="sq-lg !bg-sidebar-foreground/10 text-sidebar-accent-foreground dark:!bg-sidebar-foreground/15">{initials}</AvatarFallback>
              </Avatar>
              <div className="grid min-w-0 flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="auto-scroll font-medium">{user.name}</span>
                <span className="auto-scroll text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
            </CollapsedTooltip>
          </DropdownTrigger>
          <DropdownContent
            width={260}
            side={isMobile ? "bottom" : renderedSide === "left" ? "right" : "left"}
            align="end"
            sideOffset={4}
          >
            <DropdownLabel className="p-0 font-normal">
              <Button
                variant="ghost"
                type="button"
                data-glide-item="account-settings"
                onClick={handleOpenAccountSettings}
                className={cn(
                  UDS.item,
                  UDS.glideItem,
                  UDS.itemIcon,
                  "h-auto min-h-12 w-full cursor-pointer px-4 py-2 text-left text-sm"
                )}
              >
                <Avatar className="size-8 sq-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="sq-lg">{initials}</AvatarFallback>
                </Avatar>
                <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                  <span className="auto-scroll font-medium">{user.name}</span>
                  <span className="auto-scroll text-xs text-neutral-400">{user.email}</span>
                </div>
                <ChevronsUpDown className="ml-auto size-3 text-neutral-400" />
              </Button>
            </DropdownLabel>
            <DropdownSeparator />
            <DropdownLanguageSubmenu
              selectedLanguage={language}
              onSelectLanguage={(lang) => setLanguage(lang as Language)}
              label={settingsCopy.language || "Language"}
            />
            <DropdownSeparator />
            <DropdownSidebarPositionSection
              selectedSide={side}
              onSelectSide={(s) => setSide(s as "left" | "right")}
            />
            <DropdownSeparator />
            <DropdownSectionItem onSelect={handleOpenCustomizationSettings} icon={<Settings />}>
              {settingsCopy.title || "Settings"}
            </DropdownSectionItem>
            {isAdmin && (
              <DropdownSectionItem onSelect={() => router.push("/admin")} icon={<Shield />}>
                {adminCopy.panel || navCopy.admin_panel || "Admin Panel"}
              </DropdownSectionItem>
            )}
            <DropdownSectionItem onSelect={handleLogout} icon={<LogOut />}>
              {navCopy.log_out || "Log out"}
            </DropdownSectionItem>
          </DropdownContent>
        </Dropdown>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
