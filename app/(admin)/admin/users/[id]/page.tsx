"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
    ArrowLeft, Shield, ShieldAlert, ShieldCheck, Ban, Lock, Unlock,
    KeyRound, RefreshCw, Mail, Calendar, Clock, Globe, CreditCard,
    Receipt, PiggyBank, Target, Bell, Smartphone, ArrowUpRight,
    ArrowDownRight, MoreHorizontal, User, FileText, AlertTriangle,
} from "lucide-react"

import { AdminHeader } from "@/components/admin/admin-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface UserDetail {
    id: string
    name: string
    email: string
    dateOfBirth: string
    recoveryEmail: string | null
    role: string
    status: string
    twoFactorEnabled: boolean
    createdAt: string
    updatedAt: string
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
        notifications: number
        categorizationRules: number
        oauthAccounts: number
        trustedDevices: number
        saltEdgeConnections: number
    }
    bankAccounts: {
        id: string; cardName: string; accountType: string; balance: number; createdAt: string
        bank: { name: string }
    }[]
    transactions: {
        id: string; description: string; amount: number; type: string; date: string; tags: string[]; createdAt: string
    }[]
    oauthAccounts: { id: string; provider: string; createdAt: string }[]
    auditLogs: {
        id: string; action: string; entity: string; details: string | null; createdAt: string
        performer: { id: string; name: string; email: string }
    }[]
}

interface FinancialSummary {
    totalTransactions: number
    totalAmount: number
    totalIncome: number
    totalExpenses: number
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
            return <Badge variant="outline" className="border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400"><ShieldAlert className="size-3" />Super Admin</Badge>
        case "admin":
            return <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400"><ShieldCheck className="size-3" />Admin</Badge>
        default:
            return <Badge variant="outline" className="text-neutral-500"><User className="size-3" />User</Badge>
    }
}

function formatDate(dateStr: string | null) {
    if (!dateStr) return "—"
    return new Date(dateStr).toLocaleDateString("en-US", {
        year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    })
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" }).format(value)
}

function timeAgo(dateStr: string) {
    const d = new Date(dateStr)
    const diff = Date.now() - d.getTime()
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
export default function AdminUserDetailPage() {
    const { id } = useParams<{ id: string }>()
    const router = useRouter()
    const [user, setUser] = React.useState<UserDetail | null>(null)
    const [financial, setFinancial] = React.useState<FinancialSummary | null>(null)
    const [loading, setLoading] = React.useState(true)
    const [error, setError] = React.useState("")

    // Action state
    const [actionDialog, setActionDialog] = React.useState<{
        open: boolean; action: string; title: string; description: string; needsReason: boolean
    }>({ open: false, action: "", title: "", description: "", needsReason: false })
    const [actionReason, setActionReason] = React.useState("")
    const [actionLoading, setActionLoading] = React.useState(false)

    // Role change state
    const [roleDialog, setRoleDialog] = React.useState(false)
    const [newRole, setNewRole] = React.useState("")

    const fetchUser = React.useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/admin/users/${id}`)
            if (!res.ok) throw new Error(res.status === 404 ? "User not found" : "Failed to fetch")
            const data = await res.json()
            setUser(data.user)
            setFinancial(data.financialSummary)
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to load user")
        } finally {
            setLoading(false)
        }
    }, [id])

    React.useEffect(() => { fetchUser() }, [fetchUser])

    const executeAction = async (action: string, extra?: Record<string, unknown>) => {
        setActionLoading(true)
        try {
            const res = await fetch(`/api/admin/users/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action, reason: actionReason || undefined, ...extra }),
            })
            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || "Action failed")
            }
            toast.success("Action completed")
            setActionDialog(prev => ({ ...prev, open: false }))
            setRoleDialog(false)
            setActionReason("")
            fetchUser()
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Action failed")
        } finally {
            setActionLoading(false)
        }
    }

    const openAction = (action: string, title: string, description: string, needsReason = false) => {
        setActionDialog({ open: true, action, title, description, needsReason })
        setActionReason("")
    }

    if (loading) return <DetailSkeleton />

    if (error || !user) {
        return (
            <>
                <AdminHeader title="User Not Found" breadcrumbs={[{ label: "Users", href: "/admin/users" }, { label: "Not Found" }]} />
                <div className="flex flex-col items-center justify-center p-12">
                    <AlertTriangle className="size-12 text-neutral-400 mb-3" />
                    <p className="text-lg font-medium">{error || "User not found"}</p>
                    <Button variant="outline" className="mt-4" onClick={() => router.push("/admin/users")}>
                        <ArrowLeft className="size-4 mr-2" /> Back to Users
                    </Button>
                </div>
            </>
        )
    }

    return (
        <>
            <AdminHeader
                title={user.name}
                breadcrumbs={[{ label: "Users", href: "/admin/users" }, { label: user.name }]}
                actions={
                    <Button variant="outline" size="sm" onClick={() => router.push("/admin/users")}>
                        <ArrowLeft className="size-4" /> Back
                    </Button>
                }
            />

            <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
                {/* --- Top: Profile + Quick Actions --- */}
                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Profile Card */}
                    <div className="lg:col-span-2 rounded-xl border border-black/10 dark:border-white/10 p-5">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                                <div className="flex size-14 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xl font-bold">
                                    {user.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold">{user.name}</h2>
                                    <p className="text-sm text-neutral-500">{user.email}</p>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        {roleBadge(user.role)}
                                        {statusBadge(user.status)}
                                        {user.twoFactorEnabled && (
                                            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                                <Shield className="size-3" />2FA
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {user.status === "suspended" && user.suspendedReason && (
                            <div className="mt-4 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 flex items-start gap-2">
                                <AlertTriangle className="size-4 text-amber-500 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Account Suspended</p>
                                    <p className="text-xs text-amber-600/80 dark:text-amber-400/80">{user.suspendedReason}</p>
                                    {user.suspendedAt && (
                                        <p className="text-xs text-amber-600/60 dark:text-amber-400/60 mt-1">Since {formatDate(user.suspendedAt)}</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {user.status === "banned" && (
                            <div className="mt-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3 flex items-start gap-2">
                                <Ban className="size-4 text-red-500 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-red-600 dark:text-red-400">Account Banned</p>
                                    <p className="text-xs text-red-600/80 dark:text-red-400/80">{user.suspendedReason || "No reason provided"}</p>
                                </div>
                            </div>
                        )}

                        <Separator className="my-4" />

                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <InfoRow icon={<Mail className="size-4" />} label="Recovery Email" value={user.recoveryEmail || "Not set"} />
                            <InfoRow icon={<Calendar className="size-4" />} label="Date of Birth" value={user.dateOfBirth} />
                            <InfoRow icon={<Clock className="size-4" />} label="Joined" value={formatDate(user.createdAt)} />
                            <InfoRow icon={<Clock className="size-4" />} label="Last Login" value={formatDate(user.lastLoginAt)} />
                            <InfoRow icon={<Globe className="size-4" />} label="Last IP" value={user.lastLoginIp || "Unknown"} />
                            <InfoRow icon={<Smartphone className="size-4" />} label="Trusted Devices" value={String(user._count.trustedDevices)} />
                        </div>

                        {user.oauthAccounts.length > 0 && (
                            <>
                                <Separator className="my-4" />
                                <div>
                                    <p className="text-sm font-medium mb-2">OAuth Connections</p>
                                    <div className="flex gap-2">
                                        {user.oauthAccounts.map(oa => (
                                            <Badge key={oa.id} variant="outline" className="capitalize">
                                                {oa.provider}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Quick Actions Card */}
                    <div className="rounded-xl border border-black/10 dark:border-white/10 p-5">
                        <h3 className="text-sm font-semibold mb-3">Quick Actions</h3>
                        <div className="flex flex-col gap-2">
                            {user.status === "active" && (
                                <Button variant="outline" size="sm" className="justify-start"
                                    onClick={() => openAction("suspend", "Suspend User", `Suspend ${user.name}?`, true)}>
                                    <Lock className="size-4 mr-2" /> Suspend Account
                                </Button>
                            )}
                            {user.status === "suspended" && (
                                <Button variant="outline" size="sm" className="justify-start"
                                    onClick={() => openAction("unsuspend", "Unsuspend User", `Reactivate ${user.name}?`)}>
                                    <Unlock className="size-4 mr-2" /> Unsuspend Account
                                </Button>
                            )}
                            {user.status !== "banned" ? (
                                <Button variant="outline" size="sm" className="justify-start text-red-600 dark:text-red-400 hover:bg-red-500/10"
                                    onClick={() => openAction("ban", "Ban User", `Permanently ban ${user.name}?`, true)}>
                                    <Ban className="size-4 mr-2" /> Ban Account
                                </Button>
                            ) : (
                                <Button variant="outline" size="sm" className="justify-start"
                                    onClick={() => openAction("activate", "Unban User", `Unban ${user.name}?`)}>
                                    <Unlock className="size-4 mr-2" /> Unban Account
                                </Button>
                            )}
                            <Separator className="my-1" />
                            <Button variant="outline" size="sm" className="justify-start"
                                onClick={() => { setNewRole(user.role); setRoleDialog(true) }}>
                                <ShieldCheck className="size-4 mr-2" /> Change Role
                            </Button>
                            {user.twoFactorEnabled && (
                                <Button variant="outline" size="sm" className="justify-start"
                                    onClick={() => openAction("reset_2fa", "Reset 2FA", `Remove 2FA from ${user.name}? They'll need to set it up again.`)}>
                                    <KeyRound className="size-4 mr-2" /> Reset 2FA
                                </Button>
                            )}
                            <Button variant="outline" size="sm" className="justify-start"
                                onClick={() => openAction("force_reset_password", "Force Password Reset", `Force a password reset for ${user.name}?`)}>
                                <RefreshCw className="size-4 mr-2" /> Force Password Reset
                            </Button>
                            <Separator className="my-1" />
                            <Button variant="outline" size="sm" className="justify-start text-red-600 dark:text-red-400 hover:bg-red-500/10"
                                onClick={() => openAction("delete", "Delete User", `Soft-delete ${user.name}? Their data will remain but the account will be disabled.`)}>
                                <AlertTriangle className="size-4 mr-2" /> Delete Account
                            </Button>
                        </div>
                    </div>
                </div>

                {/* --- Financial Overview --- */}
                <div>
                    <h3 className="text-sm font-semibold mb-3">Financial Overview</h3>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
                        <StatCard icon={<CreditCard className="size-4" />} label="Accounts" value={user._count.bankAccounts} />
                        <StatCard icon={<FileText className="size-4" />} label="Transactions" value={user._count.transactions} />
                        <StatCard icon={<Receipt className="size-4" />} label="Bills" value={user._count.bills} />
                        <StatCard icon={<PiggyBank className="size-4" />} label="Budgets" value={user._count.budgets} />
                        <StatCard icon={<Target className="size-4" />} label="Goals" value={user._count.financialGoals} />
                    </div>
                    {financial && (
                        <div className="grid grid-cols-3 gap-3 mt-3">
                            <div className="rounded-xl border border-black/10 dark:border-white/10 bg-black/2 dark:bg-white/3 p-3">
                                <p className="text-xs text-neutral-500 flex items-center gap-1">
                                    <ArrowUpRight className="size-3 text-emerald-500" /> Total Income
                                </p>
                                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(financial.totalIncome)}</p>
                            </div>
                            <div className="rounded-xl border border-black/10 dark:border-white/10 bg-black/2 dark:bg-white/3 p-3">
                                <p className="text-xs text-neutral-500 flex items-center gap-1">
                                    <ArrowDownRight className="size-3 text-red-500" /> Total Expenses
                                </p>
                                <p className="text-lg font-bold text-red-600 dark:text-red-400">{formatCurrency(financial.totalExpenses)}</p>
                            </div>
                            <div className="rounded-xl border border-black/10 dark:border-white/10 bg-black/2 dark:bg-white/3 p-3">
                                <p className="text-xs text-neutral-500">Net Balance</p>
                                <p className={`text-lg font-bold ${financial.totalIncome - financial.totalExpenses >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                                    {formatCurrency(financial.totalIncome - financial.totalExpenses)}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* --- Bank Accounts --- */}
                {user.bankAccounts.length > 0 && (
                    <div>
                        <h3 className="text-sm font-semibold mb-3">Bank Accounts (Top 10)</h3>
                        <div className="rounded-xl border border-black/10 dark:border-white/10 overflow-hidden">
                            <Table>
                                <TableHeader className="bg-black/3 dark:bg-white/3">
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Institution</TableHead>
                                        <TableHead className="text-right">Balance</TableHead>
                                        <TableHead>Created</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {user.bankAccounts.map(acc => (
                                        <TableRow key={acc.id}>
                                            <TableCell className="font-medium">{acc.cardName}</TableCell>
                                            <TableCell><Badge variant="outline" className="capitalize">{acc.accountType}</Badge></TableCell>
                                            <TableCell className="text-neutral-500">{acc.bank.name}</TableCell>
                                            <TableCell className="text-right font-mono">{formatCurrency(acc.balance)}</TableCell>
                                            <TableCell className="text-neutral-500 text-sm">{formatDate(acc.createdAt)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}

                {/* --- Recent Transactions --- */}
                {user.transactions.length > 0 && (
                    <div>
                        <h3 className="text-sm font-semibold mb-3">Recent Transactions (Top 10)</h3>
                        <div className="rounded-xl border border-black/10 dark:border-white/10 overflow-hidden">
                            <Table>
                                <TableHeader className="bg-black/3 dark:bg-white/3">
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead>Tags</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {user.transactions.map(tx => (
                                        <TableRow key={tx.id}>
                                            <TableCell className="text-sm">{tx.date}</TableCell>
                                            <TableCell className="font-medium max-w-[200px] truncate">{tx.description}</TableCell>
                                            <TableCell>
                                                {tx.tags.slice(0, 2).map(tag => (
                                                    <Badge key={tag} variant="outline" className="mr-1 capitalize text-xs">{tag}</Badge>
                                                ))}
                                            </TableCell>
                                            <TableCell className={`text-right font-mono ${tx.type === "in" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                                                {tx.type === "in" ? "+" : "-"}{formatCurrency(tx.amount)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}

                {/* --- Admin Audit Trail --- */}
                {user.auditLogs.length > 0 && (
                    <div>
                        <h3 className="text-sm font-semibold mb-3">Admin Actions on this User</h3>
                        <div className="rounded-xl border border-black/10 dark:border-white/10 overflow-hidden">
                            <Table>
                                <TableHeader className="bg-black/3 dark:bg-white/3">
                                    <TableRow>
                                        <TableHead>Action</TableHead>
                                        <TableHead>Performed By</TableHead>
                                        <TableHead>Details</TableHead>
                                        <TableHead>When</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {user.auditLogs.map(log => (
                                        <TableRow key={log.id}>
                                            <TableCell>
                                                <Badge variant="outline" className="capitalize font-mono text-xs">
                                                    {log.action}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm">{log.performer.name}</TableCell>
                                            <TableCell className="text-sm text-neutral-500 max-w-[200px] truncate">
                                                {log.details ? (() => { try { const d = JSON.parse(log.details); return Object.entries(d).map(([k, v]) => `${k}: ${v}`).join(", ") } catch { return log.details } })() : "—"}
                                            </TableCell>
                                            <TableCell className="text-sm text-neutral-500">{timeAgo(log.createdAt)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}
            </div>

            {/* --- Action Confirmation Dialog --- */}
            <Dialog open={actionDialog.open} onOpenChange={open => setActionDialog(prev => ({ ...prev, open }))}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{actionDialog.title}</DialogTitle>
                        <DialogDescription>{actionDialog.description}</DialogDescription>
                    </DialogHeader>
                    {actionDialog.needsReason && (
                        <div className="space-y-2">
                            <Label htmlFor="action-reason">Reason (optional)</Label>
                            <Input
                                id="action-reason"
                                label="Reason"
                                placeholder="Provide a reason..."
                                value={actionReason}
                                onChange={e => setActionReason(e.target.value)}
                            />
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setActionDialog(prev => ({ ...prev, open: false }))}>Cancel</Button>
                        <Button
                            variant={actionDialog.action === "ban" || actionDialog.action === "delete" ? "destructive" : "default"}
                            onClick={() => executeAction(actionDialog.action)}
                            disabled={actionLoading}
                        >
                            {actionLoading && <RefreshCw className="size-4 animate-spin mr-2" />}
                            Confirm
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* --- Role Change Dialog --- */}
            <Dialog open={roleDialog} onOpenChange={setRoleDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Change Role</DialogTitle>
                        <DialogDescription>Change the role for {user.name}. This affects their access permissions.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                        <Label>New Role</Label>
                        <Select value={newRole} onValueChange={setNewRole}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="user">User</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="superadmin">Super Admin</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRoleDialog(false)}>Cancel</Button>
                        <Button
                            onClick={() => executeAction("change_role", { role: newRole })}
                            disabled={actionLoading || newRole === user.role}
                        >
                            {actionLoading && <RefreshCw className="size-4 animate-spin mr-2" />}
                            Update Role
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="flex items-start gap-2">
            <div className="text-neutral-400 mt-0.5">{icon}</div>
            <div>
                <p className="text-xs text-neutral-500">{label}</p>
                <p className="text-sm font-medium">{value}</p>
            </div>
        </div>
    )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
    return (
        <div className="rounded-xl border border-black/10 dark:border-white/10 bg-black/2 dark:bg-white/3 p-3">
            <div className="flex items-center gap-2 text-neutral-500 text-xs">{icon} {label}</div>
            <p className="text-xl font-bold mt-1">{value}</p>
        </div>
    )
}

function DetailSkeleton() {
    return (
        <>
            <AdminHeader title="Loading..." breadcrumbs={[{ label: "Users", href: "/admin/users" }, { label: "..." }]} />
            <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2 rounded-xl border border-black/10 dark:border-white/10 p-5">
                        <div className="flex items-center gap-4">
                            <Skeleton className="size-14 rounded-full" />
                            <div className="space-y-2">
                                <Skeleton className="h-6 w-40" />
                                <Skeleton className="h-4 w-52" />
                                <div className="flex gap-2">
                                    <Skeleton className="h-5 w-16 rounded-full" />
                                    <Skeleton className="h-5 w-16 rounded-full" />
                                </div>
                            </div>
                        </div>
                        <Skeleton className="h-px w-full my-4" />
                        <div className="grid grid-cols-2 gap-4">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="flex gap-2">
                                    <Skeleton className="size-4 mt-0.5" />
                                    <div className="space-y-1">
                                        <Skeleton className="h-3 w-20" />
                                        <Skeleton className="h-4 w-32" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="rounded-xl border border-black/10 dark:border-white/10 p-5">
                        <Skeleton className="h-5 w-24 mb-3" />
                        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-8 w-full mb-2" />)}
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="rounded-xl border border-black/10 dark:border-white/10 p-3">
                            <Skeleton className="h-3 w-16 mb-2" />
                            <Skeleton className="h-6 w-10" />
                        </div>
                    ))}
                </div>
            </div>
        </>
    )
}
