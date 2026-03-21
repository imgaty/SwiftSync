"use client"

import * as React from "react"
import {
    Settings, User, Shield, ShieldCheck, Download, FileText,
    Users as UsersIcon, RefreshCw, Key, Calendar,
} from "lucide-react"
import { AdminHeader } from "@/components/admin/admin-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"

interface AdminProfile {
    id: string; name: string; email: string; role: string
    createdAt: string; lastLoginAt: string | null; twoFactorEnabled: boolean
}

interface AdminUser {
    id: string; name: string; email: string; role: string
}

export default function AdminSettingsPage() {
    const [profile, setProfile] = React.useState<AdminProfile | null>(null)
    const [admins, setAdmins] = React.useState<AdminUser[]>([])
    const [loading, setLoading] = React.useState(true)

    React.useEffect(() => {
        (async () => {
            try {
                const res = await fetch("/api/admin/settings")
                if (!res.ok) throw new Error()
                const data = await res.json()
                setProfile(data.profile)
                setAdmins(data.admins)
            } catch { toast.error("Failed to load settings") }
            finally { setLoading(false) }
        })()
    }, [])

    const handleExport = async (type: string) => {
        try {
            const res = await fetch(`/api/admin/${type}?limit=100000`)
            if (!res.ok) throw new Error()
            const data = await res.json()
            const rows = data[type] || data.users || []
            const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" })
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `${type}_export_${new Date().toISOString().slice(0, 10)}.json`
            a.click()
            URL.revokeObjectURL(url)
            toast.success(`${type} exported successfully`)
        } catch { toast.error(`Failed to export ${type}`) }
    }

    return (
        <>
            <AdminHeader title="Settings" breadcrumbs={[{ label: "Settings" }]} />

            <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6 max-w-4xl">
                {loading ? <SettingsSkeleton /> : (
                    <>
                        {/* Admin Profile */}
                        <Section title="Your Admin Profile" icon={<User className="size-5 text-blue-500" />}>
                            {profile && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                    <InfoRow label="Name" value={profile.name} />
                                    <InfoRow label="Email" value={profile.email} />
                                    <InfoRow label="Role">
                                        <Badge variant="outline" className={profile.role === "superadmin" ? "border-purple-500/30 text-purple-600 dark:text-purple-400" : "border-blue-500/30 text-blue-600 dark:text-blue-400"}>
                                            {profile.role}
                                        </Badge>
                                    </InfoRow>
                                    <InfoRow label="2FA">
                                        <Badge variant="outline" className={profile.twoFactorEnabled ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400" : "border-amber-500/30 text-amber-600 dark:text-amber-400"}>
                                            {profile.twoFactorEnabled ? "Enabled" : "Disabled"}
                                        </Badge>
                                    </InfoRow>
                                    <InfoRow label="Account Created" value={new Date(profile.createdAt).toLocaleDateString()} />
                                    <InfoRow label="Last Login" value={profile.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleString() : "Never"} />
                                </div>
                            )}
                        </Section>

                        {/* Admin Users */}
                        <Section title="Admin Team" icon={<ShieldCheck className="size-5 text-purple-500" />}>
                            <div className="space-y-2">
                                {admins.map(a => (
                                    <div key={a.id} className="flex items-center gap-3 rounded-lg bg-black/2 dark:bg-white/3 border border-black/5 dark:border-white/5 p-3">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                                            {a.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm truncate">{a.name}</p>
                                            <p className="text-xs text-neutral-500 truncate">{a.email}</p>
                                        </div>
                                        <Badge variant="outline" className={a.role === "superadmin" ? "border-purple-500/30 text-purple-600 dark:text-purple-400" : "border-blue-500/30 text-blue-600 dark:text-blue-400"}>
                                            {a.role}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </Section>

                        {/* Data Export */}
                        <Section title="Data Export" icon={<Download className="size-5 text-emerald-500" />}>
                            <p className="text-sm text-neutral-500 mb-4">Export platform data as JSON for backup or analysis.</p>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                <ExportButton label="Users" onClick={() => handleExport("users")} icon={<UsersIcon className="size-4" />} />
                                <ExportButton label="Transactions" onClick={() => handleExport("transactions")} icon={<FileText className="size-4" />} />
                                <ExportButton label="Accounts" onClick={() => handleExport("accounts")} icon={<FileText className="size-4" />} />
                                <ExportButton label="Bills" onClick={() => handleExport("bills")} icon={<FileText className="size-4" />} />
                                <ExportButton label="Budgets" onClick={() => handleExport("budgets")} icon={<FileText className="size-4" />} />
                                <ExportButton label="Goals" onClick={() => handleExport("goals")} icon={<FileText className="size-4" />} />
                            </div>
                        </Section>

                        {/* Quick Links */}
                        <Section title="Quick Actions" icon={<Settings className="size-5 text-orange-500" />}>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                <QuickLink href="/admin/users" label="Manage Users" icon={<UsersIcon className="size-4" />} />
                                <QuickLink href="/admin/announcements" label="Announcements" icon={<Shield className="size-4" />} />
                                <QuickLink href="/admin/audit-log" label="Audit Log" icon={<FileText className="size-4" />} />
                                <QuickLink href="/admin/health" label="System Health" icon={<RefreshCw className="size-4" />} />
                                <QuickLink href="/admin/notifications" label="Notifications" icon={<Key className="size-4" />} />
                            </div>
                        </Section>
                    </>
                )}
            </div>
        </>
    )
}

// --- Sub-components ---

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <div className="rounded-xl border border-black/10 dark:border-white/10 p-5">
            <div className="flex items-center gap-2 mb-4">
                {icon}
                <h3 className="font-semibold">{title}</h3>
            </div>
            {children}
        </div>
    )
}

function InfoRow({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
    return (
        <div>
            <p className="text-xs text-neutral-500 mb-0.5">{label}</p>
            {children || <p className="font-medium">{value}</p>}
        </div>
    )
}

function ExportButton({ label, onClick, icon }: { label: string; onClick: () => void; icon: React.ReactNode }) {
    return (
        <Button variant="outline" size="sm" onClick={onClick} className="justify-start gap-2">
            {icon} {label}
        </Button>
    )
}

function QuickLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
    return (
        <a href={href} className="flex items-center gap-2 rounded-lg border border-black/5 dark:border-white/5 bg-black/2 dark:bg-white/3 px-3 py-2.5 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
            {icon} {label}
        </a>
    )
}

function SettingsSkeleton() {
    return (
        <div className="space-y-6">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}
        </div>
    )
}
