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
  DropdownLanguageSection,
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
import { PRISM } from "@/lib/PRISM"
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
  const { isMobile, side, setSide } = useSidebar()
  const { language, setLanguage } = useLanguage()
  const { logout } = useAuth()
  const settings = useSettings()
  const isAdmin = user.role === "admin" || user.role === "superadmin"
  const [dropdownOpen, setDropdownOpen] = React.useState(false)

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

  const handleOpenAccountSettings = React.useCallback(() => {
    setDropdownOpen(false)
    settings.open("account")
  }, [settings])

  if (isLoading) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <div className="flex items-center gap-2 p-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="flex-1 group-data-[collapsible=icon]:hidden">
              <Skeleton className="h-4 w-24 mb-1" />
              <Skeleton className="h-3 w-32" />
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
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
              </Avatar>
              <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                <span className="auto-scroll font-medium">{user.name}</span>
                <span className="auto-scroll text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </CollapsedTooltip>
          </DropdownTrigger>
          <DropdownContent
            width={260}
            side={isMobile ? "bottom" : side === "left" ? "right" : "left"}
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
                  PRISM.item,
                  PRISM.glideItem,
                  PRISM.itemIcon,
                  "w-full cursor-pointer px-4 py-2 text-left text-sm"
                )}
              >
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                </Avatar>
                <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                  <span className="auto-scroll font-medium">{user.name}</span>
                  <span className="auto-scroll text-xs text-neutral-400">{user.email}</span>
                </div>
                <ChevronsUpDown className="ml-auto size-3 text-neutral-400" />
              </Button>
            </DropdownLabel>
            <DropdownSeparator />
            <DropdownLanguageSection
              selectedLanguage={language}
              onSelectLanguage={(lang) => setLanguage(lang as "en" | "pt")}
              withSeparator
            />
            <DropdownSidebarPositionSection
              selectedSide={side}
              onSelectSide={(s) => setSide(s as "left" | "right")}
            />
            <DropdownSeparator />
            <DropdownSectionItem onSelect={() => settings.open("customization")} icon={<Settings />}>
              {language === 'pt' ? 'Configurações' : 'Settings'}
            </DropdownSectionItem>
            {isAdmin && (
              <DropdownSectionItem onSelect={() => router.push("/admin")} icon={<Shield />}>
                {language === 'pt' ? 'Painel Admin' : 'Admin Panel'}
              </DropdownSectionItem>
            )}
            <DropdownSectionItem onSelect={handleLogout} icon={<LogOut />}>
              {language === 'pt' ? 'Sair' : 'Log out'}
            </DropdownSectionItem>
          </DropdownContent>
        </Dropdown>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
