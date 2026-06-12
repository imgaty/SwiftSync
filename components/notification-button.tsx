//
//  notification-button.tsx
//  Argent
//
//  Created by hilario on 22 May 2026 at 09:36.
//  Description: Implements the Notification button React component for Argent, encapsulating reusable
//  interface structure, state handling, and presentation logic for feature screens.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import * as React from "react"
import Link from "next/link"
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query"
import { Bell, Check, SquareArrowOutUpRight as ExternalLink, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { useLanguage } from "@/components/language-provider"
import { getTranslations } from "@/lib/translation-utils"
import { cn } from "@/lib/utils"
import { UDS } from "@/lib/UDS"
import { queryKeys } from "@/lib/query-keys"

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

const NOTIFICATION_CHECK_INTERVAL_MS = 5 * 60 * 1000
const NOTIFICATION_CHECK_THROTTLE_MS = 30 * 1000

let notificationCheckSubscribers = 0
let notificationCheckInterval: ReturnType<typeof setInterval> | null = null
let notificationCheckInFlight: Promise<void> | null = null
let lastNotificationCheckAt = 0
let notificationChangeSubscribers = 0
let removeNotificationChangeListener: (() => void) | null = null

async function fetchNotifications(signal?: AbortSignal): Promise<Notification[]> {
    const res = await fetch("/api/notifications", {
        credentials: "include",
        signal,
    })

    if (res.status === 401) return []
    if (!res.ok) throw new Error("Failed to fetch notifications")

    return await res.json() as Notification[]
}

function invalidateNotifications(queryClient: QueryClient) {
    void queryClient.invalidateQueries({ queryKey: queryKeys.notifications })
}

function runNotificationCheck(queryClient: QueryClient, force = false) {
    const now = Date.now()
    if (!force && now - lastNotificationCheckAt < NOTIFICATION_CHECK_THROTTLE_MS) {
        return notificationCheckInFlight ?? Promise.resolve()
    }
    if (notificationCheckInFlight) return notificationCheckInFlight

    lastNotificationCheckAt = now
    notificationCheckInFlight = fetch("/api/notifications/check", {
        method: "POST",
        credentials: "include",
    })
        .then(() => invalidateNotifications(queryClient))
        .catch(() => {})
        .finally(() => {
            notificationCheckInFlight = null
        })

    return notificationCheckInFlight
}

function subscribeNotificationChecks(queryClient: QueryClient) {
    notificationCheckSubscribers += 1

    if (notificationCheckSubscribers === 1) {
        void runNotificationCheck(queryClient)
        notificationCheckInterval = setInterval(() => {
            void runNotificationCheck(queryClient, true)
        }, NOTIFICATION_CHECK_INTERVAL_MS)
    }

    return () => {
        notificationCheckSubscribers = Math.max(0, notificationCheckSubscribers - 1)
        if (notificationCheckSubscribers === 0 && notificationCheckInterval) {
            clearInterval(notificationCheckInterval)
            notificationCheckInterval = null
        }
    }
}

function subscribeNotificationChanges(queryClient: QueryClient) {
    notificationChangeSubscribers += 1

    if (notificationChangeSubscribers === 1 && typeof window !== "undefined") {
        const handler = () => invalidateNotifications(queryClient)
        window.addEventListener("notifications:changed", handler)
        removeNotificationChangeListener = () => window.removeEventListener("notifications:changed", handler)
    }

    return () => {
        notificationChangeSubscribers = Math.max(0, notificationChangeSubscribers - 1)
        if (notificationChangeSubscribers === 0) {
            removeNotificationChangeListener?.()
            removeNotificationChangeListener = null
        }
    }
}

export function NotificationButton() {
    const { t } = useLanguage()
    const np = getTranslations(t, "notifications_page")
    const common = getTranslations(t, "common")
    const queryClient = useQueryClient()
    const { data: notifications = [] } = useQuery({
        queryKey: queryKeys.notifications,
        queryFn: ({ signal }) => fetchNotifications(signal),
        staleTime: 60 * 1000,
        gcTime: 10 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: false,
    })
    const [isOpen, setIsOpen] = React.useState(false)
    const [now, setNow] = React.useState(() => Date.now())

    React.useEffect(() => {
        return subscribeNotificationChecks(queryClient)
    }, [queryClient])

    // Listen for `notifications:changed` events fired by the notify() helper
    // so client-side toasts that persist to the DB show up immediately
    // rather than waiting for the 5-minute polling cycle.
    React.useEffect(() => {
        return subscribeNotificationChanges(queryClient)
    }, [queryClient])

    React.useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 60_000)
        return () => clearInterval(interval)
    }, [])

    const unreadCount = notifications.filter((n) => !n.read).length
    const visibleNotifications = notifications.slice(0, 20)

    const markRead = async (id: string) => {
        await fetch(`/api/notifications/${id}`, { method: "PATCH" })
        invalidateNotifications(queryClient)
    }

    const deleteNotification = async (id: string) => {
        await fetch(`/api/notifications/${id}`, { method: "DELETE" })
        invalidateNotifications(queryClient)
    }

    const formatTimeAgo = (dateStr: string) => {
        const diff = now - new Date(dateStr).getTime()
        const mins = Math.floor(diff / 60000)
        const hours = Math.floor(diff / 3600000)
        const days = Math.floor(diff / 86400000)

        if (mins < 1) return np.now || "now"
        if (mins < 60) return `${mins}m`
        if (hours < 24) return `${hours}h`
        return `${days}d`
    }

    return (
        <Tooltip>
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <TooltipTrigger asChild>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative sq-overflow-visible">
                    <Bell />
                    {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 size-4 sq-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-medium">
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">
                {np.title || "Notifications"}
            </TooltipContent>
            <PopoverContent align="end" className="w-[min(20rem,calc(100vw-1rem))] max-w-[20rem]">
                {/* Notification list — each row is a sq chip cell, same
                    family as UDS.item (used by the View all below and the
                    Clear filter row on the accounts dropdown). */}
                <div className="max-h-[300px] overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="px-4 py-6 text-center text-sm text-neutral-400">
                            {np.no_notifications || "No notifications"}
                        </div>
                    ) : (
                        visibleNotifications.map((notif, index) => (
                            <React.Fragment key={notif.id}>
                                <div
                                    className={cn(
                                        "flex gap-3 p-3 sq-lg transition-colors",
                                        UDS.itemHover,
                                        !notif.read && "bg-accent/30"
                                    )}
                                >
                                    {/* Type indicator */}
                                    <div className={cn("w-2 h-2 sq-full mt-1.5 shrink-0", typeColors[notif.type] || "bg-blue-500")} />

                                    <div className="flex-1 min-w-0">
                                        {/* Title row — title flexes (auto-scroll
                                            handles overflow), timestamp pinned right. */}
                                        <div className="flex items-baseline justify-between gap-3">
                                            <p className={cn("auto-scroll text-sm leading-snug", !notif.read && "font-semibold")}>
                                                {notif.title}
                                            </p>
                                            <span className="text-xs text-neutral-400 whitespace-nowrap shrink-0 tabular-nums">
                                                {formatTimeAgo(notif.createdAt)}
                                            </span>
                                        </div>
                                        {/* Description — single-line marquee that
                                            shifts left-to-right on overflow, same
                                            idiom as nav-tabs / bills-table. */}
                                        <p className="auto-scroll text-xs text-neutral-400 mt-0.5">
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
                                                    className="h-6 px-2 text-xs gap-1"
                                                    asChild
                                                >
                                                    <a href={notif.actionUrl}>
                                                        <ExternalLink className="size-3" />
                                                        {common.view || "View"}
                                                    </a>
                                                </Button>
                                            )}
                                            <div className={`${UDS.inlineSurface} flex items-center gap-0.5 p-0.5`}>
                                                {!notif.read && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="size-6 p-0 sq"
                                                        onClick={() => markRead(notif.id)}
                                                        aria-label={np.mark_read || "Mark read"}
                                                    >
                                                        <Check className="size-3" />
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="ghost-destructive"
                                                    size="sm"
                                                    className="size-6 p-0 sq"
                                                    onClick={() => deleteNotification(notif.id)}
                                                    aria-label={common.delete || "Delete"}
                                                >
                                                    <Trash2 className="size-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {index < visibleNotifications.length - 1 && (
                                    <div aria-hidden className={cn(UDS.separator, "my-1")} />
                                )}
                            </React.Fragment>
                        ))
                    )}
                </div>
                {/* UDS gradient separator — matches the divider above the
                    Clear filter row on the accounts dropdown. */}
                <div className={UDS.separator} />
                {/* View all — same chip cell shape as the notifications above
                    and the Clear filter row on the accounts dropdown. */}
                <Link
                    href="/Notifications"
                    data-glide-item="notifications-view-all"
                    onClick={() => setIsOpen(false)}
                    className={cn(UDS.item, UDS.glideItem, UDS.itemIcon, "w-full")}
                >
                    <ExternalLink className="size-4 shrink-0 text-neutral-400" />
                    <span className="text-neutral-400 text-sm">
                        {np.view_all || "View all"}
                    </span>
                </Link>
            </PopoverContent>
        </Popover>
        </Tooltip>
    )
}
