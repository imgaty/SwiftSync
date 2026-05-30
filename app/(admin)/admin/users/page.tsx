//
//  page.tsx
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Renders the /admin/users route in Argent, composing page-level layout, data
//  dependencies, and feature components for that user-facing screen.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import * as React from "react"
import Link from "next/link"
import {
    Filter,
    Shield, ShieldAlert, ShieldCheck, Eye, MoreHorizontal,
    Ban, Unlock, KeyRound, Lock, RefreshCw, Users,
} from "lucide-react"

import { AdminHeader } from "@/components/admin/admin-header"
import { useLanguage } from "@/components/language-provider"
import { PRISM } from "@/lib/PRISM"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
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
    TableSortHeader,
    TableToolbar,
    TableToolbarGroup,
    UniversalTable,
} from "@/components/ui/table"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog } from "@/components/ui/dialog"
import {
    FormDialogActions,
    FormDialogContent,
    FormDialogHeader,
} from "@/components/form-dialog"
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
type AdminCopy = Record<string, string | undefined> & {
    users_page?: Record<string, string>
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function statusBadge(status: string, ad: Record<string, string | undefined> = {}) {
    switch (status) {
        case "active":
            return <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">{ad.active || "Active"}</Badge>
        case "suspended":
            return <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">{ad.suspended || "Suspended"}</Badge>
        case "banned":
            return <Badge variant="outline" className={PRISM.destructiveBadge}>{ad.banned || "Banned"}</Badge>
        case "deleted":
            return <Badge variant="outline" className="border-neutral-500/30 bg-neutral-500/10 text-neutral-400">{ad.deleted || "Deleted"}</Badge>
        default:
            return <Badge variant="outline">{status}</Badge>
    }
}

function roleBadge(role: string, up: Record<string, string | undefined> = {}) {
    switch (role) {
        case "superadmin":
            return <Badge variant="outline" className="border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400"><ShieldAlert className="size-3" />{up.super_admin || "Super"}</Badge>
        case "admin":
            return <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400"><ShieldCheck className="size-3" />{up.admin_role || "Admin"}</Badge>
        default:
            return <Badge variant="outline" className="text-neutral-400">{up.user_role || "User"}</Badge>
    }
}

function timeAgo(dateStr: string | null, ad: Record<string, string | undefined> = {}) {
    if (!dateStr) return ad.never || "Never"
    const d = new Date(dateStr)
    const now = Date.now()
    const diff = now - d.getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return ad.just_now || "Just now"
    if (mins < 60) return `${mins}${ad.m_ago || "m ago"}`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}${ad.h_ago || "h ago"}`
    const days = Math.floor(hours / 24)
    if (days < 30) return `${days}${ad.d_ago || "d ago"}`
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

    const { t } = useLanguage()
    const ad = ((t as { admin?: AdminCopy }).admin || {}) as AdminCopy
    const up = ad.users_page || {}

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
            toast.error(up.failed_to_load || "Failed to load users")
        } finally {
            setLoading(false)
        }
    }, [debouncedSearch, statusFilter, roleFilter, twoFaFilter, sortBy, sortDir, up.failed_to_load])

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
            toast.success(`${actionDialog.title} ${up.completed || "completed"}`)
            setActionDialog(prev => ({ ...prev, open: false }))
            setActionReason("")
            fetchUsers(pagination.page)
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : (up.action_failed || "Action failed"))
        } finally {
            setActionLoading(false)
        }
    }

    // Open action dialog helper
    const openAction = (user: AdminUserRow, action: string, title: string, description: string, needsReason = false) => {
        setActionDialog({ open: true, user, action, title, description, needsReason })
        setActionReason("")
    }

    const sortDirection = (field: string) => sortBy === field ? sortDir : undefined

    const toolbar = (
        <TableToolbar>
            <TableToolbarGroup>
                <TableSearchControl
                    value={search}
                    onValueChange={setSearch}
                    placeholder={up.search_placeholder || "Search by name or email..."}
                    width={300}
                />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[135px]" size="sm">
                        <Filter className="size-4" />
                        <SelectValue placeholder={up.status || "Status"} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{up.all_status || "All Status"}</SelectItem>
                        <SelectItem value="active">{ad.active || "Active"}</SelectItem>
                        <SelectItem value="suspended">{ad.suspended || "Suspended"}</SelectItem>
                        <SelectItem value="banned">{ad.banned || "Banned"}</SelectItem>
                        <SelectItem value="deleted">{ad.deleted || "Deleted"}</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-[125px]" size="sm">
                        <SelectValue placeholder={up.role || "Role"} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{up.all_roles || "All Roles"}</SelectItem>
                        <SelectItem value="user">{up.user_role || "User"}</SelectItem>
                        <SelectItem value="admin">{up.admin_role || "Admin"}</SelectItem>
                        <SelectItem value="superadmin">{up.super_admin || "Superadmin"}</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={twoFaFilter} onValueChange={setTwoFaFilter}>
                    <SelectTrigger className="w-[110px]" size="sm">
                        <SelectValue placeholder={up.twofa || "2FA"} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{up.all_twofa || "All 2FA"}</SelectItem>
                        <SelectItem value="enabled">{ad.enabled || "2FA On"}</SelectItem>
                        <SelectItem value="disabled">{ad.disabled || "2FA Off"}</SelectItem>
                    </SelectContent>
                </Select>
            </TableToolbarGroup>
        </TableToolbar>
    )

    return (
        <>
            <AdminHeader
                title={ad.users || "Users"}
                breadcrumbs={[{ label: ad.users || "Users" }]}
                actions={
                    <Button variant="glass" size="sm" onClick={() => fetchUsers(pagination.page)} disabled={loading}>
                        <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
                        {ad.refresh || "Refresh"}
                    </Button>
                }
            />

            <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-black/2 dark:bg-white/3 p-3">
                        <div className="flex items-center gap-2 text-sm text-neutral-400">
                            <Users className="size-4" /> {up.total_users || "Total Users"}
                        </div>
                        <div className="mt-1 text-2xl font-bold">{loading ? <Skeleton className="h-8 w-16" /> : pagination.total}</div>
                    </div>
                    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-black/2 dark:bg-white/3 p-3">
                        <div className="flex items-center gap-2 text-sm text-neutral-400">
                            <Shield className="size-4" /> {ad.active || "Active"}
                        </div>
                        <div className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                            {loading ? <Skeleton className="h-8 w-16" /> : users.filter(u => u.status === "active").length}
                        </div>
                    </div>
                    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-black/2 dark:bg-white/3 p-3">
                        <div className="flex items-center gap-2 text-sm text-neutral-400">
                            <Lock className="size-4" /> {ad.suspended || "Suspended"}
                        </div>
                        <div className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">
                            {loading ? <Skeleton className="h-8 w-16" /> : users.filter(u => u.status === "suspended").length}
                        </div>
                    </div>
                    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-black/2 dark:bg-white/3 p-3">
                        <div className="flex items-center gap-2 text-sm text-neutral-400">
                            <Ban className="size-4" /> {ad.banned || "Banned"}
                        </div>
                        <div className={`mt-1 text-2xl font-bold ${PRISM.destructiveText}`}>
                            {loading ? <Skeleton className="h-8 w-16" /> : users.filter(u => u.status === "banned").length}
                        </div>
                    </div>
                </div>

                <UniversalTable
                    toolbar={toolbar}
                    maxHeight="calc(100vh - 21rem)"
                    footer={!loading && pagination.totalPages > 1 ? (
                        <TablePaginationBar
                            page={pagination.page}
                            totalPages={pagination.totalPages}
                            pageSize={pagination.limit}
                            total={pagination.total}
                            label={up.showing || "Showing"}
                            ofLabel={up.of || "of"}
                            onFirst={() => fetchUsers(1)}
                            onPrevious={() => fetchUsers(pagination.page - 1)}
                            onNext={() => fetchUsers(pagination.page + 1)}
                            onLast={() => fetchUsers(pagination.totalPages)}
                        />
                    ) : undefined}
                >
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>
                                        <TableSortHeader direction={sortDirection("name")} onClick={() => toggleSort("name")}>
                                            {up.col_name || "User"}
                                        </TableSortHeader>
                                    </TableHead>
                                    <TableHead>
                                        <TableSortHeader direction={sortDirection("role")} onClick={() => toggleSort("role")}>
                                            {up.col_role || "Role"}
                                        </TableSortHeader>
                                    </TableHead>
                                    <TableHead>
                                        <TableSortHeader direction={sortDirection("status")} onClick={() => toggleSort("status")}>
                                            {up.col_status || "Status"}
                                        </TableSortHeader>
                                    </TableHead>
                                    <TableHead className="hidden md:table-cell">{up.col_twofa || "2FA"}</TableHead>
                                    <TableHead className="hidden lg:table-cell">{up.col_data || "Data"}</TableHead>
                                    <TableHead className="hidden md:table-cell">
                                        <TableSortHeader direction={sortDirection("lastLoginAt")} onClick={() => toggleSort("lastLoginAt")}>
                                            {up.col_last_login || "Last Login"}
                                        </TableSortHeader>
                                    </TableHead>
                                    <TableHead>
                                        <TableSortHeader direction={sortDirection("createdAt")} onClick={() => toggleSort("createdAt")}>
                                            {up.col_created || "Joined"}
                                        </TableSortHeader>
                                    </TableHead>
                                    <TableHead className="w-10" />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableSkeletonRows rows={10} columns={8} widths={[168, 84, 84, 52, 116, 104, 92, 40]} />
                                ) : users.length === 0 ? (
                                    <TableEmptyRow
                                        colSpan={8}
                                        title={up.no_users || "No users found"}
                                        description={up.no_users_hint || "Try adjusting your search or filters."}
                                    />
                                ) : users.map(user => (
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
                                                    <p className="text-xs text-neutral-400 truncate">{user.email}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>{roleBadge(user.role, up)}</TableCell>
                                        <TableCell>{statusBadge(user.status, ad)}</TableCell>
                                        <TableCell className="hidden md:table-cell">
                                            {user.twoFactorEnabled ? (
                                                <ShieldCheck className="size-4 text-emerald-500" />
                                            ) : (
                                                <span className="text-xs text-neutral-400">{ad.disabled || "Off"}</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="hidden lg:table-cell">
                                            <div className="flex items-center gap-2 text-xs text-neutral-400">
                                                <span title={up.col_transactions || "Transactions"}>{user._count.transactions} {up.txns_label || "txns"}</span>
                                                <span>·</span>
                                                <span title={up.col_accounts || "Accounts"}>{user._count.bankAccounts} {up.accts_label || "accts"}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">
                                            <span className="text-sm text-neutral-400">{timeAgo(user.lastLoginAt, ad)}</span>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm text-neutral-400">{timeAgo(user.createdAt, ad)}</span>
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <MoreHorizontal className="size-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem asChild>
                                                        <Link href={`/admin/users/${user.id}`}>
                                                            <Eye className="size-4 mr-2" /> {up.view_details || "View Details"}
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    {user.status === "active" && (
                                                        <DropdownMenuItem
                                                            onClick={() => openAction(user, "suspend", up.suspend_user || "Suspend User", `${up.suspend_confirm || "Suspend"} ${user.name}? ${up.suspend_warning || "They will not be able to sign in."}`, true)}
                                                        >
                                                            <Lock className="size-4 mr-2" /> {up.suspend_user || "Suspend"}
                                                        </DropdownMenuItem>
                                                    )}
                                                    {user.status === "suspended" && (
                                                        <DropdownMenuItem
                                                            onClick={() => openAction(user, "unsuspend", up.unsuspend_user || "Unsuspend User", `${up.reactivate_confirm || "Reactivate"} ${user.name}${up.account_question || "'s account?"}`)}
                                                        >
                                                            <Unlock className="size-4 mr-2" /> {up.unsuspend_user || "Unsuspend"}
                                                        </DropdownMenuItem>
                                                    )}
                                                    {user.status !== "banned" && (
                                                        <DropdownMenuItem
                                                            className={PRISM.destructiveText}
                                                            onClick={() => openAction(user, "ban", up.ban_user || "Ban User", `${up.ban_confirm || "Permanently ban"} ${user.name}? ${up.ban_warning || "This cannot be undone easily."}`, true)}
                                                        >
                                                            <Ban className="size-4 mr-2" /> {up.ban_user || "Ban"}
                                                        </DropdownMenuItem>
                                                    )}
                                                    {user.status === "banned" && (
                                                        <DropdownMenuItem
                                                            onClick={() => openAction(user, "activate", up.unban_user || "Unban User", `${up.reactivate_confirm || "Reactivate"} ${user.name}${up.banned_account_question || "'s banned account?"}`)}
                                                        >
                                                            <Unlock className="size-4 mr-2" /> {up.unban_user || "Unban"}
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuSeparator />
                                                    {user.twoFactorEnabled && (
                                                        <DropdownMenuItem
                                                            onClick={() => openAction(user, "reset_2fa", up.reset_2fa || "Reset 2FA", `${up.reset_2fa_confirm || "Remove 2FA from"} ${user.name}${up.reset_2fa_warning || "'s account? They'll need to set it up again."}`)}
                                                        >
                                                            <KeyRound className="size-4 mr-2" /> {up.reset_2fa || "Reset 2FA"}
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuItem
                                                        onClick={() => openAction(user, "force_reset_password", up.force_reset_password || "Force Password Reset", `${up.force_reset_confirm || "Send a password reset link to"} ${user.name}?`)}
                                                    >
                                                        <RefreshCw className="size-4 mr-2" /> {up.force_reset_password || "Force Password Reset"}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                </UniversalTable>
            </div>

            {/* Action Confirmation Dialog */}
            <Dialog open={actionDialog.open} onOpenChange={open => setActionDialog(prev => ({ ...prev, open }))}>
                <FormDialogContent>
                    <FormDialogHeader title={actionDialog.title} description={actionDialog.description} />
                    <form
                        onSubmit={(e) => {
                            e.preventDefault()
                            executeAction()
                        }}
                        className="flex flex-col gap-4"
                    >
                        {actionDialog.needsReason && (
                            <div className="space-y-2">
                                <Label htmlFor="reason">{up.reason_optional || "Reason (optional)"}</Label>
                                <Input
                                    id="reason"
                                    label={up.reason_label || "Reason"}
                                    placeholder={up.reason_placeholder || "Provide a reason..."}
                                    value={actionReason}
                                    onChange={e => setActionReason(e.target.value)}
                                />
                            </div>
                        )}
                    <FormDialogActions>
                        <Button
                            type="submit"
                            variant={actionDialog.action === "ban" ? "solid-destructive" : "solid"}
                            size="lg"
                            className="w-full"
                            disabled={actionLoading}
                        >
                            {actionLoading ? <RefreshCw className="size-4 animate-spin mr-2" /> : null}
                            {up.confirm || "Confirm"}
                        </Button>
                        <Button type="button" variant="glass" size="lg" className="w-full" onClick={() => setActionDialog(prev => ({ ...prev, open: false }))}>
                            {up.cancel || "Cancel"}
                        </Button>
                    </FormDialogActions>
                    </form>
                </FormDialogContent>
            </Dialog>
        </>
    )
}
