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
        <Dropdown>
          <DropdownTrigger asChild>
            <CollapsedTooltip
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="auto-scroll font-medium">{user.name}</span>
                <span className="auto-scroll text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </CollapsedTooltip>
          </DropdownTrigger>
          <DropdownContent
            className=""
            side={isMobile ? "bottom" : side === "left" ? "right" : "left"}
            align="end"
            sideOffset={4}
            style={{ width: 'auto' }}
          >
            <DropdownLabel className="p-0 font-normal">
              <button
                type="button"
                onClick={() => settings.open("account")}
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm rounded-lg transition-colors hover:bg-black/6 dark:hover:bg-white/12 hover:shadow-[inset_0_0.5px_0_rgba(255,255,255,0.15)]"
              >
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="auto-scroll font-medium">{user.name}</span>
                  <span className="auto-scroll text-xs text-neutral-400">{user.email}</span>
                </div>
                <ChevronsUpDown className="ml-auto size-3 text-neutral-400" />
              </button>
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
