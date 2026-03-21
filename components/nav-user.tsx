"use client"

import * as React from "react"
import {
  Bell,
  ChevronsUpDown,
  LogOut,
  Settings,
  Check,
  X,
  ExternalLink,
  Trash2,
} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  Dropdown,
  DropdownUniversalShell,
  DropdownUniversalItem,
  DropdownLabel,
  DropdownSeparator,
  DropdownTrigger,
  DropdownLanguageSection,
  DropdownSidebarPositionSection,
} from "@/components/ui/app-dropdown"
import {
  SidebarMenu,
  CollapsedTooltip,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

import { useLanguage } from "@/components/language-provider"
import { SettingsDialog } from "@/components/settings-dialog"
import { useAuth } from "@/components/auth-provider"
import { cn } from "@/lib/utils"

export function NavUser({
  user,
  isLoading = false,
}: {
  user: {
    name: string
    email: string
    avatar: string
  }
  isLoading?: boolean
}) {
  const { isMobile, side, setSide } = useSidebar()
  const { language, setLanguage } = useLanguage()
  const { logout } = useAuth()
  const [settingsOpen, setSettingsOpen] = React.useState(false)
  const [notificationsOpen, setNotificationsOpen] = React.useState(false)
  const [notifications, setNotifications] = React.useState<{
    id: string; title: string; message: string; type: string; read: boolean; actionUrl?: string; createdAt: string
  }[]>([])

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

  const fetchNotifications = React.useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data)
      }
    } catch { /* non-critical */ }
  }, [])

  React.useEffect(() => {
    fetchNotifications()
    fetch('/api/notifications/check', { method: 'POST' })
      .then(() => fetchNotifications()).catch(() => {})
    const interval = setInterval(() => {
      fetch('/api/notifications/check', { method: 'POST' })
        .then(() => fetchNotifications()).catch(() => {})
    }, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  const unreadCount = notifications.filter((n) => !n.read).length

  const markAllRead = async () => {
    await fetch('/api/notifications', { method: 'PATCH' })
    fetchNotifications()
  }

  const markRead = async (id: string) => {
    await fetch(`/api/notifications/${id}`, { method: 'PATCH' })
    fetchNotifications()
  }

  const deleteNotification = async (id: string) => {
    await fetch(`/api/notifications/${id}`, { method: 'DELETE' })
    fetchNotifications()
  }

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (mins < 1) return language === 'pt' ? 'agora' : 'now'
    if (mins < 60) return `${mins}m`
    if (hours < 24) return `${hours}h`
    return `${days}d`
  }

  const typeColors: Record<string, string> = {
    bill_due: 'bg-amber-500',
    budget_exceeded: 'bg-red-500',
    goal_reached: 'bg-green-500',
    general: 'bg-blue-500',
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
          <DropdownUniversalShell
            className="min-w-56"
            side={isMobile ? "bottom" : side === "left" ? "right" : "left"}
            align="end"
            sideOffset={4}
            style={{ width: 'auto' }}
          >
            <DropdownLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="auto-scroll font-medium">{user.name}</span>
                  <span className="auto-scroll text-xs">{user.email}</span>
                </div>
                <button
                  type="button"
                  className="relative rounded-md p-1.5 transition-colors hover:bg-black/10 dark:hover:bg-white/10"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setNotificationsOpen(true)
                  }}
                >
                  <Bell className="h-4 w-4 text-black/50 dark:text-white/50" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-medium">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
              </div>
            </DropdownLabel>
            <DropdownSeparator />
            <DropdownUniversalItem onSelect={() => setSettingsOpen(true)} icon={<Settings />}>
              {language === 'pt' ? 'Definições' : 'Settings'}
            </DropdownUniversalItem>
            <DropdownSeparator className="mx-2 my-[5px]" />
            <DropdownLanguageSection
              selectedLanguage={language}
              onSelectLanguage={(lang) => setLanguage(lang as "en" | "pt")}
              withSeparator
            />
            <DropdownSidebarPositionSection
              selectedSide={side}
              onSelectSide={(s) => setSide(s as "left" | "right")}
            />
            <DropdownSeparator className="mx-2 my-[5px]" />
            <DropdownUniversalItem onSelect={handleLogout} icon={<LogOut />}>
              {language === 'pt' ? 'Sair' : 'Log out'}
            </DropdownUniversalItem>
          </DropdownUniversalShell>
        </Dropdown>
        <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />

        {/* Notifications popup */}
        <Dialog open={notificationsOpen} onOpenChange={setNotificationsOpen}>
          <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
            <DialogHeader className="p-4 pb-3 border-b border-black/10 dark:border-white/10">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-base">
                  {language === 'pt' ? 'Notificações' : 'Notifications'}
                </DialogTitle>
                {unreadCount > 0 && (
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={markAllRead}>
                    <Check className="h-3 w-3 mr-1" />
                    {language === 'pt' ? 'Marcar todas' : 'Mark all read'}
                  </Button>
                )}
              </div>
              <DialogDescription className="sr-only">
                {language === 'pt' ? 'As suas notificações' : 'Your notifications'}
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
                  {language === 'pt' ? 'Sem notificações' : 'No notifications'}
                </div>
              ) : (
                notifications.slice(0, 20).map((notif) => (
                  <div
                    key={notif.id}
                    className={cn(
                      'flex gap-3 p-3 border-b border-black/5 dark:border-white/5 last:border-0 transition-colors',
                      !notif.read && 'bg-black/3 dark:bg-white/3'
                    )}
                  >
                    <div className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0', typeColors[notif.type] || 'bg-blue-500')} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn('text-sm', !notif.read && 'font-medium')}>{notif.title}</p>
                        <span className="text-[10px] text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                          {formatTimeAgo(notif.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-2">
                        {notif.message}
                      </p>
                      <div className="flex items-center gap-1 mt-1.5">
                        {notif.actionUrl && (
                          <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1.5" asChild>
                            <a href={notif.actionUrl}>
                              <ExternalLink className="h-2.5 w-2.5 mr-0.5" />
                              {language === 'pt' ? 'Ver' : 'View'}
                            </a>
                          </Button>
                        )}
                        {!notif.read && (
                          <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1.5" onClick={() => markRead(notif.id)}>
                            <Check className="h-2.5 w-2.5 mr-0.5" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1.5 text-red-500" onClick={() => deleteNotification(notif.id)}>
                          <Trash2 className="h-2.5 w-2.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
