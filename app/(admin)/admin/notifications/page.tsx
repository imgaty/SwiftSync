"use client"

import * as React from "react"
import {
    Bell, Search, Send, Mail, MailOpen, Filter, ChevronLeft, ChevronRight,
    Users as UsersIcon, X,
} from "lucide-react"
import { AdminHeader } from "@/components/admin/admin-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog"
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

const typeColors: Record<string, string> = {
    general: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    bill_due: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    budget_exceeded: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    goal_reached: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    admin: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
}

export default function AdminNotificationsPage() {
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
        } catch { toast.error("Failed to load notifications") }
        finally { setLoading(false) }
    }, [page, search, typeFilter, readFilter])

    React.useEffect(() => { fetchData() }, [fetchData])

    return (
        <>
            <AdminHeader title="Notifications" breadcrumbs={[{ label: "Notifications" }]}
                actions={
                    <Button size="sm" onClick={() => setShowSend(true)}>
                        <Send className="size-4" /> Send Notification
                    </Button>
                }
            />

            <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
                {/* Summary */}
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <SummaryCard label="Total" value={pagination?.total ?? 0} icon={<Bell className="size-5" />} />
                    <SummaryCard label="Unread" value={notifications.filter(n => !n.read).length} icon={<Mail className="size-5 text-blue-500" />} />
                    <SummaryCard label="Read" value={notifications.filter(n => n.read).length} icon={<MailOpen className="size-5 text-emerald-500" />} />
                    <SummaryCard label="Types" value={new Set(notifications.map(n => n.type)).size} icon={<Filter className="size-5 text-purple-500" />} />
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-3 items-center">
                    <div className="relative flex-1 min-w-[200px] max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
                        <Input label="Search" placeholder="Search..." className="pl-9"
                            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
                    </div>
                    <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1) }}>
                        <SelectTrigger className="w-[160px]"><SelectValue placeholder="Type" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="general">General</SelectItem>
                            <SelectItem value="bill_due">Bill Due</SelectItem>
                            <SelectItem value="budget_exceeded">Budget Exceeded</SelectItem>
                            <SelectItem value="goal_reached">Goal Reached</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={readFilter} onValueChange={(v) => { setReadFilter(v); setPage(1) }}>
                        <SelectTrigger className="w-[130px]"><SelectValue placeholder="Read" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="false">Unread</SelectItem>
                            <SelectItem value="true">Read</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Table */}
                {loading ? <TableSkeleton /> : (
                    <div className="rounded-xl border border-black/10 dark:border-white/10 overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-black/5 dark:border-white/5 text-left text-xs text-neutral-500 uppercase">
                                    <th className="px-4 py-3">Title</th>
                                    <th className="px-4 py-3">User</th>
                                    <th className="px-4 py-3">Type</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {notifications.length === 0 ? (
                                    <tr><td colSpan={5} className="text-center py-8 text-neutral-500">No notifications found</td></tr>
                                ) : notifications.map((n) => (
                                    <tr key={n.id} className="border-b border-black/5 dark:border-white/5 hover:bg-black/2 dark:hover:bg-white/2">
                                        <td className="px-4 py-3">
                                            <p className="font-medium">{n.title}</p>
                                            <p className="text-xs text-neutral-500 mt-0.5 line-clamp-1">{n.message}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="font-medium">{n.user.name}</p>
                                            <p className="text-xs text-neutral-500">{n.user.email}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge variant="outline" className={typeColors[n.type] || typeColors.general}>
                                                {n.type.replace(/_/g, " ")}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3">
                                            {n.read
                                                ? <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">Read</Badge>
                                                : <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">Unread</Badge>}
                                        </td>
                                        <td className="px-4 py-3 text-neutral-500">
                                            {new Date(n.createdAt).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-neutral-500">
                            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                        </p>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>
                                <ChevronLeft className="size-4" /> Previous
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= pagination.totalPages}>
                                Next <ChevronRight className="size-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            <SendNotificationDialog open={showSend} onClose={() => setShowSend(false)} onSent={fetchData} />
        </>
    )
}

// ----- Send dialog -----

function SendNotificationDialog({ open, onClose, onSent }: { open: boolean; onClose: () => void; onSent: () => void }) {
    const [title, setTitle] = React.useState("")
    const [message, setMessage] = React.useState("")
    const [type, setType] = React.useState("admin")
    const [target, setTarget] = React.useState<"all" | "specific">("all")
    const [userSearch, setUserSearch] = React.useState("")
    const [foundUsers, setFoundUsers] = React.useState<{ id: string; name: string; email: string }[]>([])
    const [selectedUsers, setSelectedUsers] = React.useState<{ id: string; name: string; email: string }[]>([])
    const [searching, setSearching] = React.useState(false)
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
        } catch { toast.error("Failed to send notification") }
        finally { setSending(false) }
    }

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Send Notification</DialogTitle>
                    <DialogDescription>Send a notification to all users or specific users.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="space-y-1.5">
                        <Label>Title</Label>
                        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Notification title" />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Message</Label>
                        <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Notification message" rows={3} />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Type</Label>
                        <Select value={type} onValueChange={setType}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="general">General</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label>Recipients</Label>
                        <Select value={target} onValueChange={(v) => setTarget(v as "all" | "specific")}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Users</SelectItem>
                                <SelectItem value="specific">Specific Users</SelectItem>
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
                                <div className="max-h-32 overflow-y-auto rounded border border-black/10 dark:border-white/10 divide-y divide-black/5 dark:divide-white/5">
                                    {foundUsers.filter(u => !selectedUsers.find(s => s.id === u.id)).map(u => (
                                        <button key={u.id} className="w-full text-left px-3 py-2 text-sm hover:bg-black/3 dark:hover:bg-white/3"
                                            onClick={() => { setSelectedUsers(prev => [...prev, u]); setFoundUsers([]); setUserSearch("") }}>
                                            <span className="font-medium">{u.name}</span>{" "}
                                            <span className="text-neutral-500">{u.email}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                            {selectedUsers.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {selectedUsers.map(u => (
                                        <Badge key={u.id} variant="secondary" className="gap-1">
                                            {u.name}
                                            <button onClick={() => setSelectedUsers(prev => prev.filter(s => s.id !== u.id))}>
                                                <X className="size-3" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSend} disabled={sending}>
                        {sending ? "Sending..." : "Send Notification"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// ----- Summary Card -----
function SummaryCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
    return (
        <div className="rounded-xl border border-black/10 dark:border-white/10 p-4">
            <div className="flex items-center gap-2 text-neutral-500 text-xs mb-1">{icon}{label}</div>
            <p className="text-2xl font-bold">{value.toLocaleString()}</p>
        </div>
    )
}

function TableSkeleton() {
    return (
        <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
        </div>
    )
}
