"use client"

import * as React from "react"
import {
    Megaphone, Plus, RefreshCw, Trash2, Edit, Info, AlertTriangle,
    AlertOctagon, Wrench, ToggleLeft, ToggleRight,
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
        critical: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
        maintenance: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
    }
    return <Badge variant="outline" className={`capitalize text-xs ${styles[type] || ""}`}>{type}</Badge>
}

export default function AdminAnnouncementsPage() {
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
            toast.error("Title and message are required")
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
                toast.success("Announcement created")
            } else {
                const res = await fetch(`/api/admin/announcements/${dialog.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                })
                if (!res.ok) throw new Error()
                toast.success("Announcement updated")
            }
            setDialog({ open: false, mode: "create" })
            fetchData()
        } catch { toast.error("Failed to save") }
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
            toast.success(a.isActive ? "Deactivated" : "Activated")
            fetchData()
        } catch { toast.error("Failed to toggle") }
    }

    const handleDelete = async () => {
        try {
            const res = await fetch(`/api/admin/announcements/${deleteDialog.id}`, { method: "DELETE" })
            if (!res.ok) throw new Error()
            toast.success("Deleted")
            setDeleteDialog({ open: false, id: "", title: "" })
            fetchData()
        } catch { toast.error("Failed to delete") }
    }

    return (
        <>
            <AdminHeader title="Announcements" breadcrumbs={[{ label: "Announcements" }]}
                actions={
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
                            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh
                        </Button>
                        <Button size="sm" onClick={openCreate}>
                            <Plus className="size-4" /> New
                        </Button>
                    </div>
                }
            />

            <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
                {loading ? (
                    <div className="space-y-3">
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
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-black/10 dark:border-white/10 p-12 text-center">
                        <Megaphone className="size-12 text-neutral-300 dark:text-neutral-600 mb-3" />
                        <p className="text-lg font-medium text-neutral-600 dark:text-neutral-400">No announcements yet</p>
                        <p className="text-sm text-neutral-500 mb-4">Create one to broadcast to all users.</p>
                        <Button size="sm" onClick={openCreate}><Plus className="size-4 mr-1" /> Create Announcement</Button>
                    </div>
                ) : (
                    <div className="space-y-3">
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
                                        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">{a.message}</p>
                                        <div className="flex items-center gap-3 text-xs text-neutral-500">
                                            <span>Created {new Date(a.createdAt).toLocaleDateString()}</span>
                                            {a.expiresAt && <span>Expires {new Date(a.expiresAt).toLocaleDateString()}</span>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <Button variant="ghost" size="icon" className="size-8" onClick={() => toggleActive(a)} title={a.isActive ? "Deactivate" : "Activate"}>
                                            {a.isActive ? <ToggleRight className="size-4 text-emerald-500" /> : <ToggleLeft className="size-4 text-neutral-400" />}
                                        </Button>
                                        <Button variant="ghost" size="icon" className="size-8" onClick={() => openEdit(a)}><Edit className="size-4" /></Button>
                                        <Button variant="ghost" size="icon" className="size-8 text-red-500 hover:text-red-600" onClick={() => setDeleteDialog({ open: true, id: a.id, title: a.title })}>
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
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{dialog.mode === "create" ? "New Announcement" : "Edit Announcement"}</DialogTitle>
                        <DialogDescription>
                            {dialog.mode === "create" ? "This will be visible to all users." : "Update the announcement details."}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Title</Label>
                            <Input label="Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Announcement title..." />
                        </div>
                        <div className="space-y-2">
                            <Label>Message</Label>
                            <textarea
                                className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 text-sm min-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                value={form.message}
                                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                                placeholder="Announcement message..."
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Type</Label>
                                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="info">Info</SelectItem>
                                        <SelectItem value="warning">Warning</SelectItem>
                                        <SelectItem value="critical">Critical</SelectItem>
                                        <SelectItem value="maintenance">Maintenance</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Expires At (optional)</Label>
                                <Input label="Expires" type="datetime-local" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialog(prev => ({ ...prev, open: false }))}>Cancel</Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving && <RefreshCw className="size-4 animate-spin mr-2" />}
                            {dialog.mode === "create" ? "Create" : "Save"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={deleteDialog.open} onOpenChange={open => setDeleteDialog(prev => ({ ...prev, open }))}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Announcement</DialogTitle>
                        <DialogDescription>Delete &quot;{deleteDialog.title}&quot;? This cannot be undone.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialog(prev => ({ ...prev, open: false }))}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDelete}>Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
