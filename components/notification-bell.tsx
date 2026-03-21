"use client"

import * as React from "react"
import { Bell, Check, X, ExternalLink, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { useLanguage } from "@/components/language-provider"
import { cn } from "@/lib/utils"

interface Notification {
    id: string
    title: string
    message: string
    type: string
    read: boolean
    actionUrl?: string
    createdAt: string
}

const typeColors: Record<string, string> = {
    bill_due: "bg-amber-500",
    budget_exceeded: "bg-red-500",
    goal_reached: "bg-green-500",
    general: "bg-blue-500",
}

export function NotificationBell() {
    const { language } = useLanguage()
    const [notifications, setNotifications] = React.useState<Notification[]>([])
    const [isOpen, setIsOpen] = React.useState(false)

    const fetchNotifications = React.useCallback(async () => {
        try {
            const res = await fetch("/api/notifications")
            if (res.ok) {
                const data = await res.json()
                setNotifications(data)
            }
        } catch {
            // Silently fail — notifications are non-critical
        }
    }, [])

    // Check for new notifications periodically
    React.useEffect(() => {
        fetchNotifications()

        // Also trigger notification check
        fetch("/api/notifications/check", { method: "POST" })
            .then(() => fetchNotifications())
            .catch(() => {})

        const interval = setInterval(() => {
            fetch("/api/notifications/check", { method: "POST" })
                .then(() => fetchNotifications())
                .catch(() => {})
        }, 5 * 60 * 1000) // Check every 5 minutes

        return () => clearInterval(interval)
    }, [fetchNotifications])

    const unreadCount = notifications.filter((n) => !n.read).length

    const markAllRead = async () => {
        await fetch("/api/notifications", { method: "PATCH" })
        fetchNotifications()
    }

    const markRead = async (id: string) => {
        await fetch(`/api/notifications/${id}`, { method: "PATCH" })
        fetchNotifications()
    }

    const deleteNotification = async (id: string) => {
        await fetch(`/api/notifications/${id}`, { method: "DELETE" })
        fetchNotifications()
    }

    const formatTimeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime()
        const mins = Math.floor(diff / 60000)
        const hours = Math.floor(diff / 3600000)
        const days = Math.floor(diff / 86400000)

        if (mins < 1) return language === "pt" ? "agora" : "now"
        if (mins < 60) return `${mins}m`
        if (hours < 24) return `${hours}h`
        return `${days}d`
    }

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-medium">
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
                {/* Header */}
                <div className="flex items-center justify-between p-3 border-b">
                    <h4 className="font-semibold text-sm">
                        {language === "pt" ? "Notificações" : "Notifications"}
                    </h4>
                    {unreadCount > 0 && (
                        <Button variant="ghost" size="sm" className="text-xs h-7" onClick={markAllRead}>
                            <Check className="h-3 w-3 mr-1" />
                            {language === "pt" ? "Marcar todas" : "Mark all read"}
                        </Button>
                    )}
                </div>

                {/* Notification List */}
                <div className="max-h-[300px] overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="p-6 text-center text-sm text-muted-foreground">
                            {language === "pt" ? "Sem notificações" : "No notifications"}
                        </div>
                    ) : (
                        notifications.slice(0, 20).map((notif) => (
                            <div
                                key={notif.id}
                                className={cn(
                                    "flex gap-3 p-3 border-b last:border-0 transition-colors",
                                    !notif.read && "bg-accent/30"
                                )}
                            >
                                {/* Type indicator */}
                                <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", typeColors[notif.type] || "bg-blue-500")} />

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className={cn("text-sm", !notif.read && "font-medium")}>
                                            {notif.title}
                                        </p>
                                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                            {formatTimeAgo(notif.createdAt)}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                        {notif.message}
                                    </p>

                                    {/* Actions */}
                                    <div className="flex items-center gap-1 mt-1.5">
                                        {notif.actionUrl && (
                                            <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1.5" asChild>
                                                <a href={notif.actionUrl}>
                                                    <ExternalLink className="h-2.5 w-2.5 mr-0.5" />
                                                    {language === "pt" ? "Ver" : "View"}
                                                </a>
                                            </Button>
                                        )}
                                        {!notif.read && (
                                            <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1.5" onClick={() => markRead(notif.id)}>
                                                <Check className="h-2.5 w-2.5 mr-0.5" />
                                            </Button>
                                        )}
                                        <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1.5 text-destructive" onClick={() => deleteNotification(notif.id)}>
                                            <Trash2 className="h-2.5 w-2.5" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </PopoverContent>
        </Popover>
    )
}
