"use client"

import * as React from "react"
import Link from "next/link"
import {
    Search, Filter, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
    Shield, ShieldAlert, ShieldCheck, UserX, Eye, MoreHorizontal,
    Ban, Unlock, KeyRound, Lock, ArrowUpDown, RefreshCw, Users,
} from "lucide-react"

import { AdminHeader } from "@/components/admin/admin-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface AdminUserRow {
    id: string
    name: string
    email: string
    role: string
    status: string
    twoFactorEnabled: boolean
    createdAt: string
    lastLoginAt: string | null
    lastLoginIp: string | null
    suspendedAt: string | null
    suspendedReason: string | null
    _count: {
        transactions: number
        bankAccounts: number
        bills: number
        budgets: number
        financialGoals: number
    }
}

interface Pagination {
    page: number
    limit: number
    total: number
    totalPages: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function statusBadge(status: string) {
    switch (status) {
        case "active":
            return <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">Active</Badge>
        case "suspended":
            return <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">Suspended</Badge>
        case "banned":
            return <Badge variant="outline" className="border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400">Banned</Badge>
        case "deleted":
            return <Badge variant="outline" className="border-neutral-500/30 bg-neutral-500/10 text-neutral-500">Deleted</Badge>
        default:
            return <Badge variant="outline">{status}</Badge>
    }
}

function roleBadge(role: string) {
    switch (role) {
        case "superadmin":
            return <Badge variant="outline" className="border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400"><ShieldAlert className="size-3" />Super</Badge>
        case "admin":
            return <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400"><ShieldCheck className="size-3" />Admin</Badge>
        default:
            return <Badge variant="outline" className="text-neutral-500">User</Badge>
    }
}

function timeAgo(dateStr: string | null) {
    if (!dateStr) return "Never"
    const d = new Date(dateStr)
    const now = Date.now()
    const diff = now - d.getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "Just now"
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 30) return `${days}d ago`
    return d.toLocaleDateString()
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function AdminUsersPage() {
    const [users, setUsers] = React.useState<AdminUserRow[]>([])
    const [pagination, setPagination] = React.useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 })
    const [loading, setLoading] = React.useState(true)

    // Filters
    const [search, setSearch] = React.useState("")
    const [statusFilter, setStatusFilter] = React.useState("all")
    const [roleFilter, setRoleFilter] = React.useState("all")
    const [twoFaFilter, setTwoFaFilter] = React.useState("all")
    const [sortBy, setSortBy] = React.useState("createdAt")
    const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc")

    // Action dialog
    const [actionDialog, setActionDialog] = React.useState<{
        open: boolean
        user: AdminUserRow | null
        action: string
        title: string
        description: string
        needsReason: boolean
    }>({ open: false, user: null, action: "", title: "", description: "", needsReason: false })
    const [actionReason, setActionReason] = React.useState("")
    const [actionLoading, setActionLoading] = React.useState(false)

    // Debounced search
    const searchTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null)
    const [debouncedSearch, setDebouncedSearch] = React.useState("")

    React.useEffect(() => {
        if (searchTimeout.current) clearTimeout(searchTimeout.current)
        searchTimeout.current = setTimeout(() => setDebouncedSearch(search), 300)
        return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current) }
    }, [search])

    // Fetch users
    const fetchUsers = React.useCallback(async (page = 1) => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            params.set("page", String(page))
            params.set("limit", "20")
            if (debouncedSearch) params.set("search", debouncedSearch)
            if (statusFilter !== "all") params.set("status", statusFilter)
            if (roleFilter !== "all") params.set("role", roleFilter)
            if (twoFaFilter !== "all") params.set("2fa", twoFaFilter)
            params.set("sortBy", sortBy)
            params.set("sortDir", sortDir)

            const res = await fetch(`/api/admin/users?${params}`)
            if (!res.ok) throw new Error("Failed to fetch users")
            const data = await res.json()
            setUsers(data.users)
            setPagination(data.pagination)
        } catch {
            toast.error("Failed to load users")
        } finally {
            setLoading(false)
        }
    }, [debouncedSearch, statusFilter, roleFilter, twoFaFilter, sortBy, sortDir])

    React.useEffect(() => { fetchUsers(1) }, [fetchUsers])

    // Toggle sort
    const toggleSort = (field: string) => {
        if (sortBy === field) {
            setSortDir(d => d === "asc" ? "desc" : "asc")
        } else {
            setSortBy(field)
            setSortDir("desc")
        }
    }

    // Execute action
    const executeAction = async () => {
        if (!actionDialog.user) return
        setActionLoading(true)
        try {
            const res = await fetch(`/api/admin/users/${actionDialog.user.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: actionDialog.action,
                    reason: actionReason || undefined,
                }),
            })
            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || "Action failed")
            }
            toast.success(`${actionDialog.title} completed`)
            setActionDialog(prev => ({ ...prev, open: false }))
            setActionReason("")
            fetchUsers(pagination.page)
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Action failed")
        } finally {
            setActionLoading(false)
        }
    }

    // Open action dialog helper
    const openAction = (user: AdminUserRow, action: string, title: string, description: string, needsReason = false) => {
        setActionDialog({ open: true, user, action, title, description, needsReason })
        setActionReason("")
    }

    // Sort indicator
    const SortIcon = ({ field }: { field: string }) => (
        <ArrowUpDown className={`ml-1 inline size-3 ${sortBy === field ? "text-blue-500" : "text-neutral-400"}`} />
    )

    return (
        <>
            <AdminHeader
                title="Users"
                breadcrumbs={[{ label: "Users" }]}
                actions={
                    <Button variant="outline" size="sm" onClick={() => fetchUsers(pagination.page)} disabled={loading}>
                        <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                }
            />

            <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-black/2 dark:bg-white/3 p-3">
                        <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
                            <Users className="size-4" /> Total Users
                        </div>
                        <div className="mt-1 text-2xl font-bold">{loading ? <Skeleton className="h-8 w-16" /> : pagination.total}</div>
                    </div>
                    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-black/2 dark:bg-white/3 p-3">
                        <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
                            <Shield className="size-4" /> Active
                        </div>
                        <div className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                            {loading ? <Skeleton className="h-8 w-16" /> : users.filter(u => u.status === "active").length}
                        </div>
                    </div>
                    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-black/2 dark:bg-white/3 p-3">
                        <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
                            <Lock className="size-4" /> Suspended
                        </div>
                        <div className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">
                            {loading ? <Skeleton className="h-8 w-16" /> : users.filter(u => u.status === "suspended").length}
                        </div>
                    </div>
                    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-black/2 dark:bg-white/3 p-3">
                        <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
                            <Ban className="size-4" /> Banned
                        </div>
                        <div className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">
                            {loading ? <Skeleton className="h-8 w-16" /> : users.filter(u => u.status === "banned").length}
                        </div>
                    </div>
                </div>

                {/* Filters Row */}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 min-w-[200px] max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
                        <Input
                            label="Search users"
                            placeholder="Search by name or email..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[130px]" size="sm">
                            <Filter className="size-4" />
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="suspended">Suspended</SelectItem>
                            <SelectItem value="banned">Banned</SelectItem>
                            <SelectItem value="deleted">Deleted</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                        <SelectTrigger className="w-[120px]" size="sm">
                            <SelectValue placeholder="Role" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Roles</SelectItem>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="superadmin">Superadmin</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={twoFaFilter} onValueChange={setTwoFaFilter}>
                        <SelectTrigger className="w-[100px]" size="sm">
                            <SelectValue placeholder="2FA" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All 2FA</SelectItem>
                            <SelectItem value="enabled">2FA On</SelectItem>
                            <SelectItem value="disabled">2FA Off</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Table */}
                {loading ? (
                    <TableSkeleton />
                ) : users.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-black/10 dark:border-white/10 p-12 text-center">
                        <UserX className="size-12 text-neutral-300 dark:text-neutral-600 mb-3" />
                        <p className="text-lg font-medium text-neutral-600 dark:text-neutral-400">No users found</p>
                        <p className="text-sm text-neutral-500">Try adjusting your search or filters.</p>
                    </div>
                ) : (
                    <div className="rounded-xl border border-black/10 dark:border-white/10 overflow-hidden">
                        <Table>
                            <TableHeader className="bg-black/3 dark:bg-white/3">
                                <TableRow>
                                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("name")}>
                                        User <SortIcon field="name" />
                                    </TableHead>
                                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("role")}>
                                        Role <SortIcon field="role" />
                                    </TableHead>
                                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("status")}>
                                        Status <SortIcon field="status" />
                                    </TableHead>
                                    <TableHead className="hidden md:table-cell">2FA</TableHead>
                                    <TableHead className="hidden lg:table-cell">Data</TableHead>
                                    <TableHead className="hidden md:table-cell cursor-pointer select-none" onClick={() => toggleSort("lastLoginAt")}>
                                        Last Login <SortIcon field="lastLoginAt" />
                                    </TableHead>
                                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("createdAt")}>
                                        Joined <SortIcon field="createdAt" />
                                    </TableHead>
                                    <TableHead className="w-10" />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map(user => (
                                    <TableRow key={user.id} className="group">
                                        <TableCell>
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="flex size-8 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-sm font-semibold shrink-0">
                                                    {user.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <Link
                                                        href={`/admin/users/${user.id}`}
                                                        className="font-medium text-sm hover:underline truncate block"
                                                    >
                                                        {user.name}
                                                    </Link>
                                                    <p className="text-xs text-neutral-500 truncate">{user.email}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>{roleBadge(user.role)}</TableCell>
                                        <TableCell>{statusBadge(user.status)}</TableCell>
                                        <TableCell className="hidden md:table-cell">
                                            {user.twoFactorEnabled ? (
                                                <ShieldCheck className="size-4 text-emerald-500" />
                                            ) : (
                                                <span className="text-xs text-neutral-400">Off</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="hidden lg:table-cell">
                                            <div className="flex items-center gap-2 text-xs text-neutral-500">
                                                <span title="Transactions">{user._count.transactions} txns</span>
                                                <span>·</span>
                                                <span title="Accounts">{user._count.bankAccounts} accts</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">
                                            <span className="text-sm text-neutral-500">{timeAgo(user.lastLoginAt)}</span>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm text-neutral-500">{timeAgo(user.createdAt)}</span>
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="size-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <MoreHorizontal className="size-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem asChild>
                                                        <Link href={`/admin/users/${user.id}`}>
                                                            <Eye className="size-4 mr-2" /> View Details
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    {user.status === "active" && (
                                                        <DropdownMenuItem
                                                            onClick={() => openAction(user, "suspend", "Suspend User", `Suspend ${user.name}? They will not be able to sign in.`, true)}
                                                        >
                                                            <Lock className="size-4 mr-2" /> Suspend
                                                        </DropdownMenuItem>
                                                    )}
                                                    {user.status === "suspended" && (
                                                        <DropdownMenuItem
                                                            onClick={() => openAction(user, "unsuspend", "Unsuspend User", `Reactivate ${user.name}'s account?`)}
                                                        >
                                                            <Unlock className="size-4 mr-2" /> Unsuspend
                                                        </DropdownMenuItem>
                                                    )}
                                                    {user.status !== "banned" && (
                                                        <DropdownMenuItem
                                                            className="text-red-600 dark:text-red-400"
                                                            onClick={() => openAction(user, "ban", "Ban User", `Permanently ban ${user.name}? This cannot be undone easily.`, true)}
                                                        >
                                                            <Ban className="size-4 mr-2" /> Ban
                                                        </DropdownMenuItem>
                                                    )}
                                                    {user.status === "banned" && (
                                                        <DropdownMenuItem
                                                            onClick={() => openAction(user, "activate", "Unban User", `Reactivate ${user.name}'s banned account?`)}
                                                        >
                                                            <Unlock className="size-4 mr-2" /> Unban
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuSeparator />
                                                    {user.twoFactorEnabled && (
                                                        <DropdownMenuItem
                                                            onClick={() => openAction(user, "reset_2fa", "Reset 2FA", `Remove 2FA from ${user.name}'s account? They'll need to set it up again.`)}
                                                        >
                                                            <KeyRound className="size-4 mr-2" /> Reset 2FA
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuItem
                                                        onClick={() => openAction(user, "force_reset_password", "Force Password Reset", `Send a password reset link to ${user.name}?`)}
                                                    >
                                                        <RefreshCw className="size-4 mr-2" /> Force Password Reset
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}

                {/* Pagination */}
                {!loading && pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-neutral-500 hidden lg:block">
                            Showing {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} users
                        </p>
                        <div className="flex items-center gap-1 ml-auto">
                            <Button variant="outline" size="icon" className="size-8"
                                disabled={pagination.page <= 1}
                                onClick={() => fetchUsers(1)}
                            >
                                <ChevronsLeft className="size-4" />
                            </Button>
                            <Button variant="outline" size="icon" className="size-8"
                                disabled={pagination.page <= 1}
                                onClick={() => fetchUsers(pagination.page - 1)}
                            >
                                <ChevronLeft className="size-4" />
                            </Button>
                            <span className="px-3 text-sm text-neutral-600 dark:text-neutral-400">
                                {pagination.page} / {pagination.totalPages}
                            </span>
                            <Button variant="outline" size="icon" className="size-8"
                                disabled={pagination.page >= pagination.totalPages}
                                onClick={() => fetchUsers(pagination.page + 1)}
                            >
                                <ChevronRight className="size-4" />
                            </Button>
                            <Button variant="outline" size="icon" className="size-8"
                                disabled={pagination.page >= pagination.totalPages}
                                onClick={() => fetchUsers(pagination.totalPages)}
                            >
                                <ChevronsRight className="size-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Action Confirmation Dialog */}
            <Dialog open={actionDialog.open} onOpenChange={open => setActionDialog(prev => ({ ...prev, open }))}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{actionDialog.title}</DialogTitle>
                        <DialogDescription>{actionDialog.description}</DialogDescription>
                    </DialogHeader>
                    {actionDialog.needsReason && (
                        <div className="space-y-2">
                            <Label htmlFor="reason">Reason (optional)</Label>
                            <Input
                                id="reason"
                                label="Reason"
                                placeholder="Provide a reason..."
                                value={actionReason}
                                onChange={e => setActionReason(e.target.value)}
                            />
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setActionDialog(prev => ({ ...prev, open: false }))}>
                            Cancel
                        </Button>
                        <Button
                            variant={actionDialog.action === "ban" ? "destructive" : "default"}
                            onClick={executeAction}
                            disabled={actionLoading}
                        >
                            {actionLoading ? <RefreshCw className="size-4 animate-spin mr-2" /> : null}
                            Confirm
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------
function TableSkeleton() {
    return (
        <div className="rounded-xl border border-black/10 dark:border-white/10 overflow-hidden">
            <Table>
                <TableHeader className="bg-black/3 dark:bg-white/3">
                    <TableRow>
                        {["User", "Role", "Status", "2FA", "Data", "Last Login", "Joined", ""].map((h, i) => (
                            <TableHead key={i}>{h}</TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {[...Array(10)].map((_, i) => (
                        <TableRow key={i}>
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    <Skeleton className="size-8 rounded-full" />
                                    <div className="space-y-1">
                                        <Skeleton className="h-4 w-28" />
                                        <Skeleton className="h-3 w-36" />
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell><Skeleton className="h-5 w-14 rounded-full" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-6" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                            <TableCell><Skeleton className="h-6 w-6" /></TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
