//
//  page.tsx
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Renders the /admin/notifications route in Argent, composing page-level layout, data
//  dependencies, and feature components for that user-facing screen.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import * as React from "react"
import {
    Bell, Search, Send, Mail, MailOpen, Filter,
    X,
} from "lucide-react"
import { AdminHeader } from "@/components/admin/admin-header"
import { useLanguage } from "@/components/language-provider"
import { UDS } from "@/lib/UDS"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableEmptyRow,
    TableHead,
    TableHeader,
    TablePaginationBar,
    TableRow,
    TableSearchControl,
    TableSkeletonRows,
    TableToolbar,
    TableToolbarGroup,
    UniversalTable,
} from "@/components/ui/table"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Dialog } from "@/components/ui/dialog"
import {
    FormDialogActions,
    FormDialogContent,
    FormDialogHeader,
} from "@/components/form-dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

interface Notification {
    id: string
    title: string
    message: string
    type: string
    read: boolean
    actionUrl: string | null
    createdAt: string
    user: { id: string; name: string; email: string }
}

interface Pagination {
    page: number; limit: number; total: number; totalPages: number
}
type AdminCopy = Record<string, string | undefined> & {
    notifications_page?: Record<string, string>
}

const typeColors: Record<string, string> = {
    general: UDS.semanticBadge.info,
    bill_due: UDS.semanticBadge.warning,
    budget_exceeded: UDS.destructiveBadge,
    goal_reached: UDS.semanticBadge.positive,
    admin: UDS.semanticBadge.accent,
}

export default function AdminNotificationsPage() {
    const { t } = useLanguage()
    const ad = ((t as { admin?: AdminCopy }).admin || {}) as AdminCopy
    const np = ad.notifications_page || {}
    const [notifications, setNotifications] = React.useState<Notification[]>([])
    const [pagination, setPagination] = React.useState<Pagination | null>(null)
    const [loading, setLoading] = React.useState(true)
    const [search, setSearch] = React.useState("")
    const [typeFilter, setTypeFilter] = React.useState("all")
    const [readFilter, setReadFilter] = React.useState("all")
    const [page, setPage] = React.useState(1)
    const [showSend, setShowSend] = React.useState(false)

    const fetchData = React.useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({ page: String(page), limit: "25" })
            if (search) params.set("search", search)
            if (typeFilter !== "all") params.set("type", typeFilter)
            if (readFilter !== "all") params.set("read", readFilter)
            const res = await fetch(`/api/admin/notifications?${params}`)
            if (!res.ok) throw new Error()
            const data = await res.json()
            setNotifications(data.notifications)
            setPagination(data.pagination)
        } catch { toast.error(np.failed_load || "Failed to load notifications") }
        finally { setLoading(false) }
    }, [page, search, typeFilter, readFilter, np.failed_load])

    React.useEffect(() => { fetchData() }, [fetchData])

    const toolbar = (
        <TableToolbar>
            <TableToolbarGroup>
                <TableSearchControl
                    value={search}
                    onValueChange={(value) => {
                        setSearch(value)
                        setPage(1)
                    }}
                    placeholder={np.search_placeholder || "Search..."}
                    width={280}
                />
                <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1) }}>
                    <SelectTrigger className="w-40" size="sm">
                        <Filter className="size-3.5" />
                        <SelectValue placeholder={np.col_type || "Type"} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{np.all_types || "All Types"}</SelectItem>
                        <SelectItem value="general">{np.general || "General"}</SelectItem>
                        <SelectItem value="bill_due">{np.bill_due || "Bill Due"}</SelectItem>
                        <SelectItem value="budget_exceeded">{np.budget_exceeded || "Budget Exceeded"}</SelectItem>
                        <SelectItem value="goal_reached">{np.goal_reached || "Goal Reached"}</SelectItem>
                        <SelectItem value="admin">{np.admin_type || "Admin"}</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={readFilter} onValueChange={(v) => { setReadFilter(v); setPage(1) }}>
                    <SelectTrigger className="w-[130px]" size="sm">
                        <SelectValue placeholder={np.col_status || "Read"} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{np.all_read || "All"}</SelectItem>
                        <SelectItem value="false">{np.unread_filter || "Unread"}</SelectItem>
                        <SelectItem value="true">{np.read_filter || "Read"}</SelectItem>
                    </SelectContent>
                </Select>
            </TableToolbarGroup>
        </TableToolbar>
    )

    return (
        <>
            <AdminHeader title={ad.notifications || "Notifications"} breadcrumbs={[{ label: ad.notifications || "Notifications" }]}
                actions={
                    <Button size="sm" onClick={() => setShowSend(true)}>
                        <Send className="size-4" /> {np.send || "Send Notification"}
                    </Button>
                }
            />

            <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
                {/* Summary */}
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <SummaryCard label={np.total || "Total"} value={pagination?.total ?? 0} icon={<Bell className="size-3.5" />} />
                    <SummaryCard label={np.unread || "Unread"} value={notifications.filter(n => !n.read).length} icon={<Mail className="size-3.5 text-blue-500" />} />
                    <SummaryCard label={np.read || "Read"} value={notifications.filter(n => n.read).length} icon={<MailOpen className="size-3.5 text-emerald-500" />} />
                    <SummaryCard label={np.types || "Types"} value={new Set(notifications.map(n => n.type)).size} icon={<Filter className="size-3.5 text-purple-500" />} />
                </div>

                <UniversalTable
                    toolbar={toolbar}
                    maxHeight="calc(100vh - 20rem)"
                    footer={pagination && pagination.totalPages > 1 ? (
                        <TablePaginationBar
                            page={pagination.page}
                            totalPages={pagination.totalPages}
                            pageSize={pagination.limit}
                            total={pagination.total}
                            label={ad.showing_range || "Showing"}
                            onFirst={() => setPage(1)}
                            onPrevious={() => setPage((p) => p - 1)}
                            onNext={() => setPage((p) => p + 1)}
                            onLast={() => setPage(pagination.totalPages)}
                        />
                    ) : undefined}
                >
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{np.col_title || "Title"}</TableHead>
                                <TableHead>{np.col_user || "User"}</TableHead>
                                <TableHead>{np.col_type || "Type"}</TableHead>
                                <TableHead>{np.col_status || "Status"}</TableHead>
                                <TableHead>{np.col_date || "Date"}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableSkeletonRows rows={6} columns={5} widths={[188, 144, 116, 92, 96]} />
                            ) : notifications.length === 0 ? (
                                <TableEmptyRow
                                    colSpan={5}
                                    title={np.no_notifications || "No notifications found"}
                                    description={np.no_notifications_hint || "Try changing the search or filters."}
                                />
                            ) : notifications.map((n) => (
                                <TableRow key={n.id}>
                                    <TableCell>
                                            <p className="font-medium">{n.title}</p>
                                            <p className="text-xs text-neutral-400 mt-0.5 line-clamp-1">{n.message}</p>
                                    </TableCell>
                                    <TableCell>
                                            <p className="font-medium">{n.user.name}</p>
                                            <p className="text-xs text-neutral-400">{n.user.email}</p>
                                    </TableCell>
                                    <TableCell>
                                            <Badge variant="outline" className={typeColors[n.type] || typeColors.general}>
                                                {n.type.replace(/_/g, " ")}
                                            </Badge>
                                    </TableCell>
                                    <TableCell>
                                            {n.read
                                                ? <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">{np.read || "Read"}</Badge>
                                                : <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">{np.unread || "Unread"}</Badge>}
                                    </TableCell>
                                    <TableCell className="text-neutral-400">
                                            {new Date(n.createdAt).toLocaleDateString()}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </UniversalTable>
            </div>

            <SendNotificationDialog open={showSend} onClose={() => setShowSend(false)} onSent={fetchData} np={np} />
        </>
    )
}

// ----- Send dialog -----

function SendNotificationDialog({ open, onClose, onSent, np }: { open: boolean; onClose: () => void; onSent: () => void; np: Record<string, string> }) {
    const [title, setTitle] = React.useState("")
    const [message, setMessage] = React.useState("")
    const [type, setType] = React.useState("admin")
    const [target, setTarget] = React.useState<"all" | "specific">("all")
    const [userSearch, setUserSearch] = React.useState("")
    const [foundUsers, setFoundUsers] = React.useState<{ id: string; name: string; email: string }[]>([])
    const [selectedUsers, setSelectedUsers] = React.useState<{ id: string; name: string; email: string }[]>([])
    const [, setSearching] = React.useState(false)
    const [sending, setSending] = React.useState(false)

    const searchUsers = React.useCallback(async (q: string) => {
        if (q.length < 2) { setFoundUsers([]); return }
        setSearching(true)
        try {
            const res = await fetch(`/api/admin/users?search=${encodeURIComponent(q)}&limit=10`)
            if (!res.ok) throw new Error()
            const data = await res.json()
            setFoundUsers(data.users.map((u: { id: string; name: string; email: string }) => ({ id: u.id, name: u.name, email: u.email })))
        } catch { setFoundUsers([]) }
        finally { setSearching(false) }
    }, [])

    React.useEffect(() => {
        const t = setTimeout(() => searchUsers(userSearch), 300)
        return () => clearTimeout(t)
    }, [userSearch, searchUsers])

    const handleSend = async () => {
        if (!title.trim() || !message.trim()) {
            toast.error("Title and message are required"); return
        }

        let userIds: string[] = []
        if (target === "all") {
            const res = await fetch("/api/admin/users?limit=10000")
            const data = await res.json()
            userIds = data.users.map((u: { id: string }) => u.id)
        } else {
            if (selectedUsers.length === 0) {
                toast.error("Select at least one user"); return
            }
            userIds = selectedUsers.map(u => u.id)
        }

        setSending(true)
        try {
            const res = await fetch("/api/admin/notifications", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userIds, title, message, type }),
            })
            if (!res.ok) throw new Error()
            const data = await res.json()
            toast.success(`Notification sent to ${data.sent} user(s)`)
            setTitle(""); setMessage(""); setSelectedUsers([]); setUserSearch("")
            onClose(); onSent()
        } catch { toast.error(np.failed_send || "Failed to send notification") }
        finally { setSending(false) }
    }

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <FormDialogContent maxWidth="430px">
                <FormDialogHeader
                    title={np.send || "Send Notification"}
                    description={np.send_description || "Send a notification to all users or specific users."}
                />
                <form
                    onSubmit={(e) => {
                        e.preventDefault()
                        handleSend()
                    }}
                    className="flex flex-col gap-4"
                >
                    <div className="space-y-1.5">
                        <Label>{np.title_label || "Title"}</Label>
                        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Notification title" />
                    </div>
                    <div className="space-y-1.5">
                        <Label>{np.message_label || "Message"}</Label>
                        <Textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Notification message"
                            rows={3}
                            className="px-4 py-3 text-base focus-visible:ring-focus/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label>{np.type_label || "Type"}</Label>
                        <Select value={type} onValueChange={setType}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="admin">{np.admin_type || "Admin"}</SelectItem>
                                <SelectItem value="general">{np.general || "General"}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label>{np.target_users || "Recipients"}</Label>
                        <Select value={target} onValueChange={(v) => setTarget(v as "all" | "specific")}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{np.all_users || "All Users"}</SelectItem>
                                <SelectItem value="specific">{np.specific_users || "Specific Users"}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {target === "specific" && (
                        <div className="space-y-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
                                <Input label="Search users" placeholder="Search users..." className="pl-9"
                                    value={userSearch} onChange={(e) => setUserSearch(e.target.value)} />
                            </div>
                            {foundUsers.length > 0 && (
                                <div className={`${UDS.inlineSurface} max-h-32 overflow-y-auto divide-y divide-black/5 dark:divide-white/5`}>
                                    {foundUsers.filter(u => !selectedUsers.find(s => s.id === u.id)).map(u => (
                                        <Button type="button" variant="ghost" key={u.id} className={cn("w-full text-left px-3 py-2 text-sm", UDS.itemHover)}
                                            onClick={() => { setSelectedUsers(prev => [...prev, u]); setFoundUsers([]); setUserSearch("") }}>
                                            <span className="font-medium">{u.name}</span>{" "}
                                            <span className="text-neutral-400">{u.email}</span>
                                        </Button>
                                    ))}
                                </div>
                            )}
                            {selectedUsers.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {selectedUsers.map(u => (
                                        <Badge key={u.id} variant="secondary" className="gap-1">
                                            {u.name}
                                            <Button type="button" variant="ghost" size="icon-sm" onClick={() => setSelectedUsers(prev => prev.filter(s => s.id !== u.id))}>
                                                <X className="size-3" />
                                            </Button>
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    <FormDialogActions>
                    <Button type="submit" variant="solid" size="lg" className="w-full" disabled={sending}>
                        {sending ? "Sending..." : (np.send || "Send Notification")}
                    </Button>
                    <Button type="button" variant="glass" size="lg" className="w-full" onClick={onClose}>Cancel</Button>
                    </FormDialogActions>
                </form>
            </FormDialogContent>
        </Dialog>
    )
}

// ----- Summary Card -----
function SummaryCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
    return (
        <div className={UDS.summaryTileSurface}>
            <div className={UDS.summaryLabel}>{icon}{label}</div>
            <p className={UDS.summaryValue}>{value.toLocaleString()}</p>
        </div>
    )
}
