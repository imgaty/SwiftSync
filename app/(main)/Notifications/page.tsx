//
//  page.tsx
//  Argent
//
//  Created by hilario on 22 May 2026 at 09:36.
//  Description: Renders the /Notifications route in Argent, composing page-level layout, data
//  dependencies, and feature components for that user-facing screen.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import * as React from "react"
import Link from "next/link"
import { Bell, Check, SquareArrowOutUpRight as ExternalLink, Trash2, ChevronLeft, ChevronRight } from "lucide-react"

import { PageHeader, PageSection, PageShell } from "@/components/page-framework"
import { EmptyState } from "@/components/empty-state"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { TableInlineInput, TableToolbar, TableToolbarGroup } from "@/components/ui/table"
import { useLanguage } from "@/components/language-provider"
import { UDS } from "@/lib/UDS"
import { cn } from "@/lib/utils"

interface Notification {
    id: string
    title: string
    message: string
    type: string
    read: boolean
    actionUrl?: string | null
    createdAt: string
}

interface Pagination {
    page: number
    limit: number
    total: number
    totalPages: number
}

const typeBadgeClasses: Record<string, string> = {
    bill_due: UDS.semanticBadge.warning,
    budget_exceeded: UDS.destructiveBadge,
    goal_reached: UDS.semanticBadge.positive,
    general: UDS.semanticBadge.info,
}

function formatTimeAgo(dateStr: string, isPt: boolean) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (mins < 1) return isPt ? "agora" : "now"
    if (mins < 60) return `${mins}m`
    if (hours < 24) return `${hours}h`
    return `${days}d`
}

export default function NotificationsPage() {
    const { t } = useLanguage()
    const isPt = (t.config?.locale || "en-US").startsWith("pt")
    const [notifications, setNotifications] = React.useState<Notification[]>([])
    const [loading, setLoading] = React.useState(true)
    const [search, setSearch] = React.useState("")
    const [typeFilter, setTypeFilter] = React.useState("all")
    const [readFilter, setReadFilter] = React.useState("all")
    const [page, setPage] = React.useState(1)
    const [pagination, setPagination] = React.useState<Pagination | null>(null)

    const fetchNotifications = React.useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({
                page: String(page),
                limit: "25",
            })
            if (search) params.set("search", search)
            if (typeFilter !== "all") params.set("type", typeFilter)
            if (readFilter !== "all") params.set("read", readFilter)

            const res = await fetch(`/api/notifications?${params}`)
            if (!res.ok) throw new Error("Failed to fetch notifications")
            const data = await res.json()
            setNotifications(data.notifications || [])
            setPagination(data.pagination || null)
        } catch {
            setNotifications([])
            setPagination(null)
        } finally {
            setLoading(false)
        }
    }, [page, search, typeFilter, readFilter])

    React.useEffect(() => {
        fetchNotifications()
    }, [fetchNotifications])

    const hasFilters = Boolean(search) || typeFilter !== "all" || readFilter !== "all"

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

    return (
        <PageShell>
            <PageHeader
                breadcrumbs={[
                    { label: t.sidebar_dashboard || "Dashboard", href: "/" },
                    { label: isPt ? "Notificações" : "Notifications", href: "/Notifications" },
                ]}
                actions={
                    <div data-no-topline-style>
                        <Button variant="glass" size="sm" onClick={markAllRead}>
                            <Check className="size-4" />
                            {isPt ? "Marcar todas como lidas" : "Mark all as read"}
                        </Button>
                    </div>
                }
            />

            {!loading && notifications.length === 0 && !hasFilters ? (
                <EmptyState
                    variant="empty-inbox"
                    placement="page"
                    title={isPt ? "Sem notificações" : "No notifications"}
                    description={isPt ? "As novas notificações aparecem aqui." : "New notifications will appear here."}
                    icon={<Bell className="size-8" />}
                />
            ) : (
            <PageSection stagger={2} className="space-y-4">
                <TableToolbar>
                    <TableToolbarGroup className="flex-wrap">
                        <TableInlineInput
                            type="search"
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value)
                                setPage(1)
                            }}
                            placeholder={isPt ? "Pesquisar..." : "Search..."}
                        />
                        <Select
                            value={typeFilter}
                            onValueChange={(v) => {
                                setTypeFilter(v)
                                setPage(1)
                            }}
                        >
                            <SelectTrigger size="sm" className="w-44">
                                <SelectValue placeholder={isPt ? "Tipo" : "Type"} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{isPt ? "Todos os tipos" : "All types"}</SelectItem>
                                <SelectItem value="general">General</SelectItem>
                                <SelectItem value="bill_due">Bill Due</SelectItem>
                                <SelectItem value="budget_exceeded">Budget Exceeded</SelectItem>
                                <SelectItem value="goal_reached">Goal Reached</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select
                            value={readFilter}
                            onValueChange={(v) => {
                                setReadFilter(v)
                                setPage(1)
                            }}
                        >
                            <SelectTrigger size="sm" className="w-44">
                                <SelectValue placeholder={isPt ? "Estado" : "Status"} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{isPt ? "Todas" : "All"}</SelectItem>
                                <SelectItem value="false">{isPt ? "Não lidas" : "Unread"}</SelectItem>
                                <SelectItem value="true">{isPt ? "Lidas" : "Read"}</SelectItem>
                            </SelectContent>
                        </Select>
                    </TableToolbarGroup>
                </TableToolbar>

                <div>
                    {loading ? (
                        <div className="space-y-3 px-5 py-4 md:px-6">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <Skeleton key={i} className="h-16 w-full" />
                            ))}
                        </div>
                    ) : notifications.length === 0 ? (
                        <EmptyState
                            variant="no-results"
                            placement="section"
                            title={isPt ? "Sem notificações" : "No notifications"}
                            description={isPt ? "Tente ajustar a pesquisa ou os filtros." : "Try adjusting your search or filters."}
                            icon={<Bell className="size-7" />}
                        />
                    ) : (
                        <div className="divide-y divide-black/12 dark:divide-white/14">
                            {notifications.map((notif) => (
                                <div
                                    key={notif.id}
                                    className={cn(
                                        "flex items-start gap-3 px-5 py-4 md:px-6",
                                        !notif.read && UDS.subtleFill,
                                    )}
                                >
                                    <div className={cn("mt-2 size-2 sq-full", notif.read ? "bg-neutral-400/60" : "bg-primary")} />

                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className={cn("text-sm", !notif.read && "font-semibold")}>{notif.title}</p>
                                            <Badge
                                                variant="outline"
                                                className={cn("capitalize", typeBadgeClasses[notif.type] || typeBadgeClasses.general)}
                                            >
                                                {notif.type.replace(/_/g, " ")}
                                            </Badge>
                                            <span className="text-[11px] text-neutral-400">{formatTimeAgo(notif.createdAt, isPt)}</span>
                                        </div>
                                        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{notif.message}</p>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        {notif.actionUrl && (
                                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" asChild>
                                                <Link href={notif.actionUrl}>
                                                    <ExternalLink className="size-3.5" />
                                                </Link>
                                            </Button>
                                        )}
                                        {!notif.read && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 px-2 text-xs"
                                                onClick={() => markRead(notif.id)}
                                            >
                                                <Check className="size-3.5" />
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost-destructive"
                                            size="sm"
                                            className="h-7 px-2 text-xs"
                                            onClick={() => deleteNotification(notif.id)}
                                        >
                                            <Trash2 className="size-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {pagination && pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                            {(isPt ? "Página" : "Page")} {pagination.page} {(isPt ? "de" : "of")} {pagination.totalPages}
                            {" "}
                            ({pagination.total} {(isPt ? "total" : "total")})
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="glass"
                                size="sm"
                                onClick={() => setPage((p) => p - 1)}
                                disabled={page <= 1}
                            >
                                <ChevronLeft className="size-4" />
                                {isPt ? "Anterior" : "Previous"}
                            </Button>
                            <Button
                                variant="glass"
                                size="sm"
                                onClick={() => setPage((p) => p + 1)}
                                disabled={page >= pagination.totalPages}
                            >
                                {isPt ? "Seguinte" : "Next"}
                                <ChevronRight className="size-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </PageSection>
            )}
        </PageShell>
    )
}
