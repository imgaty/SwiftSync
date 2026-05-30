//
//  page.tsx
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Renders the /admin/announcements route in Argent, composing page-level layout, data
//  dependencies, and feature components for that user-facing screen.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import * as React from "react"
import {
    Megaphone, Plus, RefreshCw, Trash2, Edit, Info, AlertTriangle,
    AlertOctagon, Wrench, ToggleLeft, ToggleRight,
} from "lucide-react"

import { AdminHeader } from "@/components/admin/admin-header"
import { EmptyState } from "@/components/empty-state"
import { useLanguage } from "@/components/language-provider"
import { PRISM } from "@/lib/PRISM"
import { getTranslations } from "@/lib/translation-utils"
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
    FormDialogActions,
    FormDialogContent,
    FormDialogHeader,
} from "@/components/form-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

interface Announcement {
    id: string; title: string; message: string; type: string
    isActive: boolean; startsAt: string; expiresAt: string | null
    createdBy: string; createdAt: string; updatedAt: string
}

function typeIcon(type: string) {
    switch (type) {
        case "warning": return <AlertTriangle className="size-4 text-amber-500" />
        case "critical": return <AlertOctagon className="size-4 text-red-500" />
        case "maintenance": return <Wrench className="size-4 text-blue-500" />
        default: return <Info className="size-4 text-sky-500" />
    }
}

function typeBadge(type: string) {
    const styles: Record<string, string> = {
        info: "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400",
        warning: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
        critical: PRISM.destructiveBadge,
        maintenance: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
    }
    return <Badge variant="outline" className={`capitalize text-xs ${styles[type] || ""}`}>{type}</Badge>
}

export default function AdminAnnouncementsPage() {
    const { t } = useLanguage()
    const ad = getTranslations(t, "admin")
    const ap = getTranslations(ad, "announcements_page")

    const [data, setData] = React.useState<Announcement[]>([])
    const [loading, setLoading] = React.useState(true)

    // Create / Edit dialog
    const [dialog, setDialog] = React.useState<{ open: boolean; mode: "create" | "edit"; id?: string }>({ open: false, mode: "create" })
    const [form, setForm] = React.useState({ title: "", message: "", type: "info", expiresAt: "" })
    const [saving, setSaving] = React.useState(false)

    // Delete dialog
    const [deleteDialog, setDeleteDialog] = React.useState<{ open: boolean; id: string; title: string }>({ open: false, id: "", title: "" })

    const fetchData = React.useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch("/api/admin/announcements")
            if (!res.ok) throw new Error()
            const json = await res.json()
            setData(json.announcements)
        } catch { toast.error("Failed to load announcements") }
        finally { setLoading(false) }
    }, [])

    React.useEffect(() => { fetchData() }, [fetchData])

    const openCreate = () => {
        setForm({ title: "", message: "", type: "info", expiresAt: "" })
        setDialog({ open: true, mode: "create" })
    }

    const openEdit = (a: Announcement) => {
        setForm({
            title: a.title,
            message: a.message,
            type: a.type,
            expiresAt: a.expiresAt ? new Date(a.expiresAt).toISOString().slice(0, 16) : "",
        })
        setDialog({ open: true, mode: "edit", id: a.id })
    }

    const handleSave = async () => {
        if (!form.title.trim() || !form.message.trim()) {
            toast.error(ap.required_fields || "Title and message are required")
            return
        }
        setSaving(true)
        try {
            const body: Record<string, unknown> = {
                title: form.title,
                message: form.message,
                type: form.type,
                expiresAt: form.expiresAt || null,
            }

            if (dialog.mode === "create") {
                const res = await fetch("/api/admin/announcements", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                })
                if (!res.ok) throw new Error()
                toast.success(ap.created || "Announcement created")
            } else {
                const res = await fetch(`/api/admin/announcements/${dialog.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                })
                if (!res.ok) throw new Error()
                toast.success(ap.updated || "Announcement updated")
            }
            setDialog({ open: false, mode: "create" })
            fetchData()
        } catch { toast.error(ap.failed_save || "Failed to save") }
        finally { setSaving(false) }
    }

    const toggleActive = async (a: Announcement) => {
        try {
            const res = await fetch(`/api/admin/announcements/${a.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: !a.isActive }),
            })
            if (!res.ok) throw new Error()
            toast.success(a.isActive ? (ap.deactivated || "Deactivated") : (ap.activated || "Activated"))
            fetchData()
        } catch { toast.error(ap.failed_toggle || "Failed to toggle") }
    }

    const handleDelete = async () => {
        try {
            const res = await fetch(`/api/admin/announcements/${deleteDialog.id}`, { method: "DELETE" })
            if (!res.ok) throw new Error()
            toast.success(ap.ann_deleted || "Deleted")
            setDeleteDialog({ open: false, id: "", title: "" })
            fetchData()
        } catch { toast.error(ap.failed_delete || "Failed to delete") }
    }

    return (
        <>
            <AdminHeader title={ad.announcements || "Announcements"} breadcrumbs={[{ label: ad.announcements || "Announcements" }]}
                actions={
                    <>
                        <Button variant="glass" size="sm" onClick={fetchData} disabled={loading}>
                            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> {ad.refresh || "Refresh"}
                        </Button>
                        <Button size="sm" onClick={openCreate}>
                            <Plus className="size-4" /> New
                        </Button>
                    </>
                }
            />

            <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
                {loading ? (
                    <div className="space-y-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="rounded-xl border border-black/10 dark:border-white/10 p-4">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-2">
                                        <Skeleton className="h-5 w-48" />
                                        <Skeleton className="h-4 w-72" />
                                    </div>
                                    <Skeleton className="h-8 w-20" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : data.length === 0 ? (
                    <EmptyState
                        variant="nothing"
                        placement="section"
                        title="No announcements yet"
                        description="Create one to broadcast to all users."
                        icon={<Megaphone className="size-8" />}
                        action={{
                            label: ap.create || "Create Announcement",
                            onClick: openCreate,
                            icon: <Plus className="size-4" />,
                        }}
                        className="min-h-[280px]"
                    />
                ) : (
                    <div className="space-y-4">
                        {data.map(a => (
                            <div key={a.id} className={`rounded-xl border p-4 transition-colors ${a.isActive ? "border-black/10 dark:border-white/10" : "border-black/5 dark:border-white/5 opacity-60"}`}>
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            {typeIcon(a.type)}
                                            <h3 className="font-semibold text-sm">{a.title}</h3>
                                            {typeBadge(a.type)}
                                            {a.isActive
                                                ? <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs">Active</Badge>
                                                : <Badge variant="outline" className="text-neutral-400 text-xs">Inactive</Badge>}
                                        </div>
                                        <p className="text-sm text-neutral-400 mb-2">{a.message}</p>
                                        <div className="flex items-center gap-3 text-xs text-neutral-400">
                                            <span>Created {new Date(a.createdAt).toLocaleDateString()}</span>
                                            {a.expiresAt && <span>Expires {new Date(a.expiresAt).toLocaleDateString()}</span>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <Button variant="ghost" size="icon" onClick={() => toggleActive(a)} title={a.isActive ? "Deactivate" : "Activate"}>
                                            {a.isActive ? <ToggleRight className="size-4 text-emerald-500" /> : <ToggleLeft className="size-4 text-neutral-400" />}
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => openEdit(a)}><Edit className="size-4" /></Button>
                                        <Button variant="ghost-destructive" size="icon" onClick={() => setDeleteDialog({ open: true, id: a.id, title: a.title })}>
                                            <Trash2 className="size-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create / Edit Dialog */}
            <Dialog open={dialog.open} onOpenChange={open => setDialog(prev => ({ ...prev, open }))}>
                <FormDialogContent maxWidth="430px">
                    <FormDialogHeader
                        title={dialog.mode === "create" ? (ap.create || "New Announcement") : (ap.title || "Edit Announcement")}
                        description={dialog.mode === "create" ? (ap.create || "This will be visible to all users.") : (ap.message || "Update the announcement details.")}
                    />
                    <form
                        onSubmit={(e) => {
                            e.preventDefault()
                            handleSave()
                        }}
                        className="flex flex-col gap-4"
                    >
                        <div className="space-y-2">
                            <Label>{ap.title || "Title"}</Label>
                            <Input label={ap.title || "Title"} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder={ap.title || "Announcement title..."} />
                        </div>
                        <div className="space-y-2">
                            <Label>{ap.message || "Message"}</Label>
                            <textarea
                                className="min-h-24 w-full resize-none rounded-xl border border-[color:var(--input)] bg-[var(--surface)] px-4 py-3 text-[15px] text-foreground shadow-[var(--shadow-subtle)] outline-none transition-all placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-focus/70 focus:ring-offset-2 focus:ring-offset-background"
                                value={form.message}
                                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                                placeholder={ap.message || "Announcement message..."}
                            />
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label>{ap.type || "Type"}</Label>
                                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="info">{ap.info || "Info"}</SelectItem>
                                        <SelectItem value="warning">{ap.warning || "Warning"}</SelectItem>
                                        <SelectItem value="critical">{ap.critical || "Critical"}</SelectItem>
                                        <SelectItem value="maintenance">{ap.maintenance || "Maintenance"}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>{ap.expires_at || "Expires At (optional)"}</Label>
                                <Input label="Expires" type="datetime-local" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} />
                            </div>
                        </div>
                        <FormDialogActions>
                        <Button type="submit" variant="solid" size="lg" className="w-full" disabled={saving}>
                            {saving && <RefreshCw className="size-4 animate-spin mr-2" />}
                            {dialog.mode === "create" ? (ap.create || "Create") : (ap.title || "Save")}
                        </Button>
                        <Button type="button" variant="glass" size="lg" className="w-full" onClick={() => setDialog(prev => ({ ...prev, open: false }))}>Cancel</Button>
                        </FormDialogActions>
                    </form>
                </FormDialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={deleteDialog.open} onOpenChange={open => setDeleteDialog(prev => ({ ...prev, open }))}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Announcement</DialogTitle>
                        <DialogDescription>Delete &quot;{deleteDialog.title}&quot;? This cannot be undone.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="glass" onClick={() => setDeleteDialog(prev => ({ ...prev, open: false }))}>Cancel</Button>
                        <Button variant="solid-destructive" onClick={handleDelete}>Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
