//
//  page.tsx
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Renders the /admin/settings route in Argent, composing page-level layout, data
//  dependencies, and feature components for that user-facing screen.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import * as React from "react"
import {
    Settings, User, Shield, ShieldCheck, Download, FileText,
    Users as UsersIcon, RefreshCw, Key,
} from "lucide-react"
import { AdminHeader } from "@/components/admin/admin-header"
import { useLanguage } from "@/components/language-provider"
import { getTranslations } from "@/lib/translation-utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { UDS } from "@/lib/UDS"

interface AdminProfile {
    id: string; name: string; email: string; role: string
    createdAt: string; lastLoginAt: string | null; twoFactorEnabled: boolean
}

interface AdminUser {
    id: string; name: string; email: string; role: string
}

export default function AdminSettingsPage() {
    const { t } = useLanguage()
    const ad = getTranslations(t, "admin")
    const sp = getTranslations(ad, "settings_page")
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
            } catch { toast.error(sp.failed_load || "Failed to load settings") }
            finally { setLoading(false) }
        })()
    }, [sp.failed_load])

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
            toast.success((sp.exported || "{type} exported successfully").replace("{type}", type))
        } catch { toast.error((sp.failed_export || "Failed to export {type}").replace("{type}", type)) }
    }

    return (
        <>
            <AdminHeader title={ad.settings || "Settings"} breadcrumbs={[{ label: ad.settings || "Settings" }]} />

            <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6 max-w-4xl">
                {loading ? <SettingsSkeleton /> : (
                    <>
                        {/* Admin Profile */}
                        <Section title={sp.profile || "Your Admin Profile"} icon={<User className="size-4 text-blue-500" />}>
                            {profile && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                    <InfoRow label={sp.name || "Name"} value={profile.name} />
                                    <InfoRow label={sp.email || "Email"} value={profile.email} />
                                    <InfoRow label={sp.role || "Role"}>
                                        <Badge variant="outline" className={profile.role === "superadmin" ? "border-purple-500/30 text-purple-600 dark:text-purple-400" : "border-blue-500/30 text-blue-600 dark:text-blue-400"}>
                                            {profile.role === "superadmin" ? (sp.superadmin || "superadmin") : (sp.admin_role || "admin")}
                                        </Badge>
                                    </InfoRow>
                                    <InfoRow label={sp.twofa || "2FA"}>
                                        <Badge variant="outline" className={profile.twoFactorEnabled ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400" : "border-amber-500/30 text-amber-600 dark:text-amber-400"}>
                                            {profile.twoFactorEnabled ? (ad.enabled || "Enabled") : (ad.disabled || "Disabled")}
                                        </Badge>
                                    </InfoRow>
                                    <InfoRow label={sp.account_created || "Account Created"} value={new Date(profile.createdAt).toLocaleDateString()} />
                                    <InfoRow label={sp.last_login || "Last Login"} value={profile.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleString() : "Never"} />
                                </div>
                            )}
                        </Section>

                        {/* Admin Users */}
                        <Section title={sp.admin_team || "Admin Team"} icon={<ShieldCheck className="size-4 text-purple-500" />}>
                            <div className="space-y-2">
                                {admins.map(a => (
                                    <div key={a.id} className={`${UDS.inlineSurface} flex items-center gap-3 p-3`}>
                                        <div className="flex size-8 items-center justify-center sq-full bg-primary/10 text-primary text-xs font-bold">
                                            {a.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm truncate">{a.name}</p>
                                            <p className="text-xs text-neutral-400 truncate">{a.email}</p>
                                        </div>
                                        <Badge variant="outline" className={a.role === "superadmin" ? "border-purple-500/30 text-purple-600 dark:text-purple-400" : "border-blue-500/30 text-blue-600 dark:text-blue-400"}>
                                            {a.role === "superadmin" ? (sp.superadmin || "superadmin") : (sp.admin_role || "admin")}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </Section>

                        {/* Data Export */}
                        <Section title={sp.data_export || "Data Export"} icon={<Download className="size-4 text-emerald-500" />}>
                            <p className="text-sm text-neutral-400 mb-4">{sp.export_description || "Export platform data as JSON for backup or analysis."}</p>
                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                                <ExportButton label={ad.users || "Users"} onClick={() => handleExport("users")} icon={<UsersIcon className="size-4" />} />
                                <ExportButton label={ad.transactions || "Transactions"} onClick={() => handleExport("transactions")} icon={<FileText className="size-4" />} />
                                <ExportButton label={ad.accounts || "Accounts"} onClick={() => handleExport("accounts")} icon={<FileText className="size-4" />} />
                                <ExportButton label={ad.bills || "Bills"} onClick={() => handleExport("bills")} icon={<FileText className="size-4" />} />
                                <ExportButton label={ad.budgets || "Budgets"} onClick={() => handleExport("budgets")} icon={<FileText className="size-4" />} />
                                <ExportButton label={ad.goals || "Goals"} onClick={() => handleExport("goals")} icon={<FileText className="size-4" />} />
                            </div>
                        </Section>

                        {/* Quick Links */}
                        <Section title={sp.quick_actions || "Quick Actions"} icon={<Settings className="size-4 text-orange-500" />}>
                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                                <QuickLink href="/admin/users" label={sp.manage_users || "Manage Users"} icon={<UsersIcon className="size-4" />} />
                                <QuickLink href="/admin/announcements" label={ad.announcements || "Announcements"} icon={<Shield className="size-4" />} />
                                <QuickLink href="/admin/audit-log" label={ad.audit_log || "Audit Log"} icon={<FileText className="size-4" />} />
                                <QuickLink href="/admin/health" label={ad.system_health || "System Health"} icon={<RefreshCw className="size-4" />} />
                                <QuickLink href="/admin/notifications" label={ad.notifications || "Notifications"} icon={<Key className="size-4" />} />
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
        <div className={`${UDS.panelSurface} p-5`}>
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
            <p className="text-xs text-neutral-400 mb-0.5">{label}</p>
            {children || <p className="font-medium">{value}</p>}
        </div>
    )
}

function ExportButton({ label, onClick, icon }: { label: string; onClick: () => void; icon: React.ReactNode }) {
    return (
        <Button variant="glass" size="sm" onClick={onClick} className="justify-start gap-2">
            {icon} {label}
        </Button>
    )
}

function QuickLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
    return (
        <a href={href} className={`${UDS.inlineSurface} ${UDS.itemHover} flex items-center gap-2 px-3 py-2.5 text-[13px] font-medium transition-colors`}>
            {icon} {label}
        </a>
    )
}

function SettingsSkeleton() {
    return (
        <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 w-full sq-xl" />)}
        </div>
    )
}
