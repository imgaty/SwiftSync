"use client"

import * as React from "react"
import Link from "next/link"
import { Bell, Check, SquareArrowOutUpRight as ExternalLink, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { useLanguage } from "@/components/language-provider"
import { cn } from "@/lib/utils"
import { PRISM } from "@/lib/PRISM"

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
    user_action: "bg-blue-500",
    user_warning: "bg-amber-500",
    user_error: "bg-red-500",
}

export function NotificationButton() {
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

    // Listen for `notifications:changed` events fired by the notify() helper
    // so client-side toasts that persist to the DB show up immediately
    // rather than waiting for the 5-minute polling cycle.
    React.useEffect(() => {
        if (typeof window === "undefined") return
        const handler = () => fetchNotifications()
        window.addEventListener("notifications:changed", handler)
        return () => window.removeEventListener("notifications:changed", handler)
    }, [fetchNotifications])

    const unreadCount = notifications.filter((n) => !n.read).length

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
        <Tooltip>
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <TooltipTrigger asChild>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell />
                    {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-medium">
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">
                {language === "pt" ? "Notificações" : "Notifications"}
            </TooltipContent>
            <PopoverContent align="end" className="w-fit min-w-[300px] max-w-[420px]">
                {/* Notification list — each row is a rounded chip cell, same
                    family as PRISM.item (used by the View all below and the
                    Clear filter row on the accounts dropdown). */}
                <div className="max-h-[300px] overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="px-4 py-6 text-center text-[13px] text-neutral-400">
                            {language === "pt" ? "Sem notificações" : "No notifications"}
                        </div>
                    ) : (
                        notifications.slice(0, 20).map((notif) => (
                            <div
                                key={notif.id}
                                className={cn(
                                    "flex gap-3 p-3 rounded-lg transition-colors",
                                    "hover:bg-black/6 dark:hover:bg-white/12",
                                    !notif.read && "bg-accent/30"
                                )}
                            >
                                {/* Type indicator */}
                                <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", typeColors[notif.type] || "bg-blue-500")} />

                                <div className="flex-1 min-w-0">
                                    {/* Title row — title flexes (auto-scroll
                                        handles overflow), timestamp pinned right. */}
                                    <div className="flex items-baseline justify-between gap-3">
                                        <p className={cn("auto-scroll text-[13px] leading-snug", !notif.read && "font-semibold")}>
                                            {notif.title}
                                        </p>
                                        <span className="text-[10.5px] text-neutral-400 whitespace-nowrap shrink-0 tabular-nums">
                                            {formatTimeAgo(notif.createdAt)}
                                        </span>
                                    </div>
                                    {/* Description — single-line marquee that
                                        shifts left-to-right on overflow, same
                                        idiom as nav-tabs / bills-table. */}
                                    <p className="auto-scroll text-[12px] text-neutral-400 mt-0.5">
                                        {notif.message}
                                    </p>

                                    {/* Actions — right-aligned cluster. Primary
                                        "View" keeps its label; secondary actions
                                        (mark read / delete) are icon-only and
                                        sit on a soft pill so they read as a
                                        deliberate group. */}
                                    <div className="flex items-center justify-end gap-1 mt-2">
                                        {notif.actionUrl && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 px-2 text-[11px] gap-1"
                                                asChild
                                            >
                                                <a href={notif.actionUrl}>
                                                    <ExternalLink className="size-3" />
                                                    {language === "pt" ? "Ver" : "View"}
                                                </a>
                                            </Button>
                                        )}
                                        <div className="flex items-center gap-0.5 rounded-md p-0.5 bg-black/3 dark:bg-white/4 border border-black/5 dark:border-white/6">
                                            {!notif.read && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="size-6 p-0 rounded"
                                                    onClick={() => markRead(notif.id)}
                                                    aria-label={language === "pt" ? "Marcar como lida" : "Mark read"}
                                                >
                                                    <Check className="size-3" />
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost-destructive"
                                                size="sm"
                                                className="size-6 p-0 rounded"
                                                onClick={() => deleteNotification(notif.id)}
                                                aria-label={language === "pt" ? "Apagar" : "Delete"}
                                            >
                                                <Trash2 className="size-3" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                {/* PRISM gradient separator — matches the divider above the
                    Clear filter row on the accounts dropdown. */}
                <div className={PRISM.separator} />
                {/* View all — same chip cell shape as the notifications above
                    and the Clear filter row on the accounts dropdown. */}
                <Link
                    href="/Notifications"
                    onClick={() => setIsOpen(false)}
                    className={cn(PRISM.item, PRISM.itemHover, "w-full")}
                >
                    <ExternalLink className="size-4 shrink-0 text-neutral-400" />
                    <span className="text-neutral-400 text-[13px]">
                        {language === "pt" ? "Ver todas" : "View all"}
                    </span>
                </Link>
            </PopoverContent>
        </Popover>
        </Tooltip>
    )
}
