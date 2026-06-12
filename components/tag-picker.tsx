//
//  tag-picker.tsx
//  Argent
//
//  Created by hilario on 22 May 2026 at 09:36.
//  Description: Implements the Tag picker React component for Argent, encapsulating reusable interface
//  structure, state handling, and presentation logic for feature screens.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

// Tag picker popover.
//
// Used wherever a user selects tags for a transaction (or any other
// taggable entity). Multi-select; the trigger renders the current value as
// pills; the popover content has a search input and a checklist.
//
// The Tag list is fetched from /api/tags on first open and cached in module
// state for the session — small enough to not bother with React Query, and
// avoids a fetch storm when many rows render the picker simultaneously.

import * as React from "react"
import {
    ArrowLeftRight,
    Book,
    Briefcase,
    Building2,
    Car,
    ChevronDown,
    CircleHelp,
    Dumbbell,
    Fuel,
    Gamepad2,
    Gift,
    Heart,
    HeartPulse,
    Home,
    Music,
    Percent,
    Pizza,
    Plane,
    Plug,
    Plus,
    Receipt,
    Repeat,
    Search,
    ShoppingBag,
    ShoppingCart,
    Tag as TagIcon,
    TrendingUp,
    Utensils,
    Wallet,
    X,
} from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { UDS } from "@/lib/UDS"
import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

// ---------------------------------------------------------------------------
// Shared cache (module-scope) — naive but sufficient for a session.
// ---------------------------------------------------------------------------

export interface ApiTag {
    id: string
    slug: string
    name: string
    color: string
    icon: string
}

let cachedTags: ApiTag[] | null = null
let inflight: Promise<ApiTag[]> | null = null
const subscribers = new Set<(tags: ApiTag[]) => void>()

async function fetchTagsOnce(): Promise<ApiTag[]> {
    if (cachedTags) return cachedTags
    if (inflight) return inflight
    inflight = fetch("/api/tags")
        .then(async (r) => {
            if (!r.ok) throw new Error(`Failed to load tags (${r.status})`)
            const data = (await r.json()) as { tags: ApiTag[] }
            cachedTags = data.tags
            subscribers.forEach((cb) => cb(data.tags))
            return data.tags
        })
        .finally(() => {
            inflight = null
        })
    return inflight
}

/** Drop the cache (call after creating/renaming a tag elsewhere). */
export function invalidateTagsCache() {
    cachedTags = null
}

// ---------------------------------------------------------------------------
// Palettes shared by the create-tag form and downstream renderers
// ---------------------------------------------------------------------------

// Same 12-step palette as scripts/backfill-tags.ts so tags created via either
// path pull from the same set.
export const TAG_COLOR_PALETTE = [
    "#ef4444", "#f97316", "#f59e0b", "#eab308",
    "#84cc16", "#10b981", "#14b8a6", "#06b6d4",
    "#3b82f6", "#6366f1", "#a855f7", "#ec4899",
] as const

// Icon catalog for the picker. Add to this when users ask — but keep it
// curated rather than exposing all of lucide.
export const TAG_ICON_OPTIONS: { name: string; Icon: React.ComponentType<{ className?: string }> }[] = [
    { name: "tag", Icon: TagIcon },
    { name: "shopping-cart", Icon: ShoppingCart },
    { name: "shopping-bag", Icon: ShoppingBag },
    { name: "utensils", Icon: Utensils },
    { name: "pizza", Icon: Pizza },
    { name: "car", Icon: Car },
    { name: "fuel", Icon: Fuel },
    { name: "plane", Icon: Plane },
    { name: "home", Icon: Home },
    { name: "building-2", Icon: Building2 },
    { name: "plug", Icon: Plug },
    { name: "wallet", Icon: Wallet },
    { name: "briefcase", Icon: Briefcase },
    { name: "receipt", Icon: Receipt },
    { name: "trending-up", Icon: TrendingUp },
    { name: "percent", Icon: Percent },
    { name: "repeat", Icon: Repeat },
    { name: "heart-pulse", Icon: HeartPulse },
    { name: "heart", Icon: Heart },
    { name: "music", Icon: Music },
    { name: "gamepad-2", Icon: Gamepad2 },
    { name: "book", Icon: Book },
    { name: "dumbbell", Icon: Dumbbell },
    { name: "gift", Icon: Gift },
    { name: "arrow-left-right", Icon: ArrowLeftRight },
    { name: "circle-help", Icon: CircleHelp },
]

// Resolve a stored icon name back to its React component. Falls back to the
// "tag" icon for anything we don't recognize.
export function getIconComponent(name: string | undefined | null): React.ComponentType<{ className?: string }> {
    if (!name) return TagIcon
    const found = TAG_ICON_OPTIONS.find((o) => o.name === name)
    return found?.Icon ?? TagIcon
}

/**
 * React hook: returns the list of available tags for the current user/scope,
 * cached at module scope so multiple consumers share a single fetch.
 */
export function useAvailableTags(): ApiTag[] {
    const [tags, setTags] = React.useState<ApiTag[]>(() => cachedTags ?? [])
    React.useEffect(() => {
        if (cachedTags) {
            setTags(cachedTags)
            return
        }
        let cancelled = false
        subscribers.add(setTags)
        fetchTagsOnce()
            .then((t) => {
                if (!cancelled) setTags(t)
            })
            .catch(() => {
                /* leave tags empty */
            })
        return () => {
            cancelled = true
            subscribers.delete(setTags)
        }
    }, [])
    return tags
}

// ---------------------------------------------------------------------------
// Tag pill (used in the trigger and the popover row)
// ---------------------------------------------------------------------------

export function TagPill({
    slug,
    name,
    color,
    className,
}: {
    slug: string
    name?: string
    color?: string
    className?: string
}) {
    return (
        <span
            className={cn(
                UDS.pillSurface,
                "inline-flex h-5 items-center px-2 text-xs font-medium",
                className,
            )}
            style={
                color
                    ? { backgroundColor: `${color}1a`, color: color, borderColor: `${color}33` }
                    : undefined
            }
        >
            {name ?? slug}
        </span>
    )
}

// ---------------------------------------------------------------------------
// Tag picker
// ---------------------------------------------------------------------------

export interface TagPickerProps {
    value: string[]                          // currently-selected tag slugs
    onChange: (next: string[]) => void       // called when selection changes
    children?: React.ReactNode               // custom trigger; default below
    align?: "start" | "center" | "end"
    disabled?: boolean
}

export function TagPicker({
    value,
    onChange,
    children,
    align = "start",
    disabled,
}: TagPickerProps) {
    const [open, setOpen] = React.useState(false)
    const [tags, setTags] = React.useState<ApiTag[] | null>(cachedTags)
    const [search, setSearch] = React.useState("")
    const [creating, setCreating] = React.useState(false)

    React.useEffect(() => {
        if (!open) return
        if (cachedTags) {
            setTags(cachedTags)
            return
        }
        fetchTagsOnce()
            .then(setTags)
            .catch(() => setTags([]))
    }, [open])

    // Re-sync local tags when the module cache changes (other consumers
    // creating tags via this same picker).
    React.useEffect(() => {
        if (!open) return
        const handler = (next: ApiTag[]) => setTags(next)
        subscribers.add(handler)
        return () => {
            subscribers.delete(handler)
        }
    }, [open])

    // Reset create form when popover closes.
    React.useEffect(() => {
        if (!open) setCreating(false)
    }, [open])

    const handleCreated = (created: ApiTag) => {
        // Add to the module cache so every other open picker also sees it.
        const next = cachedTags ? [...cachedTags, created] : [created]
        next.sort((a, b) => a.name.localeCompare(b.name))
        cachedTags = next
        setTags(next)
        subscribers.forEach((cb) => cb(next))
        // Auto-select the freshly-created tag.
        if (!value.includes(created.slug)) onChange([...value, created.slug])
        setCreating(false)
    }

    const tagsBySlug = React.useMemo(() => {
        const m = new Map<string, ApiTag>()
        for (const t of tags ?? []) m.set(t.slug, t)
        return m
    }, [tags])

    // Show selected slugs even if the Tag row doesn't exist yet (e.g. raw
    // Salt Edge category strings) so users see their state honestly.
    const selectedView = value.map((slug) => ({
        slug,
        name: tagsBySlug.get(slug)?.name ?? slug,
        color: tagsBySlug.get(slug)?.color,
    }))

    const filtered = React.useMemo(() => {
        if (!tags) return []
        const q = search.trim().toLowerCase()
        if (!q) return tags
        return tags.filter(
            (t) =>
                t.slug.toLowerCase().includes(q) ||
                t.name.toLowerCase().includes(q),
        )
    }, [tags, search])

    const toggle = (slug: string) => {
        const next = value.includes(slug)
            ? value.filter((s) => s !== slug)
            : [...value, slug]
        onChange(next)
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild disabled={disabled}>
                {children ?? <DefaultTrigger selected={selectedView} />}
            </PopoverTrigger>
            <PopoverContent align={align} className="w-[300px] p-0">
                {!creating && (
                    <div className={cn("flex items-center gap-2 border-b px-3 py-2", UDS.cardDivider)}>
                        <Search className="size-3.5 text-neutral-400" />
                        <input
                            autoFocus
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search tags…"
                            className="flex-1 bg-transparent outline-none text-sm placeholder:text-neutral-400"
                        />
                    </div>
                )}

                {creating ? (
                    <NewTagForm
                        onCancel={() => setCreating(false)}
                        onCreated={handleCreated}
                    />
                ) : (
                    <>
                        <div className="max-h-[260px] overflow-y-auto p-1">
                            {tags === null ? (
                                <p className="px-3 py-4 text-xs text-neutral-400">Loading…</p>
                            ) : filtered.length === 0 ? (
                                <p className="px-3 py-4 text-xs text-neutral-400">
                                    {search ? "No matching tags" : "No tags yet"}
                                </p>
                            ) : (
                                filtered.map((t) => {
                                    const checked = value.includes(t.slug)
                                    const Icon = getIconComponent(t.icon)
                                    return (
                                        <Button variant="ghost"
                                            key={t.id}
                                            type="button"
                                            data-glide-item={`tag-picker-${t.id}`}
                                            data-active={checked ? "true" : undefined}
                                            onClick={() => toggle(t.slug)}
                                            className={cn(
                                                UDS.item,
                                                UDS.glideItem,
                                                UDS.itemIcon,
                                                "w-full justify-start cursor-pointer",
                                            )}
                                        >
                                            <Icon className="size-3.5 shrink-0" />
                                            <span
                                                className="size-2 sq-full shrink-0"
                                                style={{ backgroundColor: t.color }}
                                            />
                                            <span className="flex-1 text-left truncate">{t.name}</span>
                                        </Button>
                                    )
                                })
                            )}
                        </div>
                        <div className={cn("border-t p-1", UDS.cardDivider)}>
                            <Button variant="ghost"
                                type="button"
                                data-glide-item="tag-picker-new"
                                onClick={() => setCreating(true)}
                                className={cn(
                                    UDS.item,
                                    UDS.glideItem,
                                    UDS.itemIcon,
                                    "w-full justify-start cursor-pointer text-neutral-400",
                                )}
                            >
                                <Plus className="size-3.5 shrink-0" />
                                <span className="flex-1 text-left">New tag</span>
                            </Button>
                        </div>
                    </>
                )}
            </PopoverContent>
        </Popover>
    )
}

// Default trigger: a row of pills with a clear "click to edit" affordance.
// Renders inside a button styled like a control (border, hover bg, chevron),
// so users can tell it's editable without a separate edit icon hovering.
function DefaultTrigger({
    selected,
}: {
    selected: { slug: string; name: string; color?: string }[]
}) {
    return (
        <Button variant="ghost"
            type="button"
            className={cn(
                "group inline-flex items-center gap-1.5 max-w-full",
                "sq-md px-1.5 py-0.5 -mx-1.5 -my-0.5",
                "border border-transparent",
                "cursor-pointer transition-all duration-150",
                UDS.itemHover,
                "outline-none focus-visible:ring-1 focus-visible:ring-black/20 dark:focus-visible:ring-white/20",
                UDS.itemOpen,
            )}
        >
            {selected.length === 0 ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-neutral-400 group-hover:text-black dark:group-hover:text-white transition-colors">
                    <TagIcon className="size-3.5" />
                    Add tag
                </span>
            ) : (
                <span className="inline-flex items-center gap-1 min-w-0 flex-wrap">
                    {selected.map((s) => (
                        <TagPill key={s.slug} slug={s.slug} name={s.name} color={s.color} />
                    ))}
                </span>
            )}
            <ChevronDown
                className={cn(
                    "size-3 shrink-0 text-neutral-400/0 group-hover:text-neutral-400",
                    "transition-colors duration-150",
                )}
            />
        </Button>
    )
}

// ---------------------------------------------------------------------------
// New tag form (inline inside the popover)
// ---------------------------------------------------------------------------

function NewTagForm({
    onCancel,
    onCreated,
}: {
    onCancel: () => void
    onCreated: (tag: ApiTag) => void
}) {
    const [name, setName] = React.useState("")
    const [color, setColor] = React.useState<string>(TAG_COLOR_PALETTE[9])
    const [icon, setIcon] = React.useState<string>("tag")
    const [submitting, setSubmitting] = React.useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const trimmed = name.trim()
        if (!trimmed) {
            toast.error("Name is required")
            return
        }
        setSubmitting(true)
        try {
            const res = await fetch("/api/tags", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: trimmed, color, icon }),
            })
            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error(err?.error || `Failed (${res.status})`)
            }
            const created = (await res.json()) as ApiTag
            toast.success(`Tag "${created.name}" created`)
            onCreated(created)
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to create tag")
        } finally {
            setSubmitting(false)
        }
    }

    const PreviewIcon = getIconComponent(icon)

    return (
        <form onSubmit={handleSubmit} className="p-3 space-y-3">
            <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">New tag</span>
                <Button variant="ghost"
                    type="button"
                    onClick={onCancel}
                    className="p-1 -m-1 sq text-neutral-400 hover:text-black dark:hover:text-white"
                    aria-label="Cancel"
                >
                    <X className="size-3.5" />
                </Button>
            </div>

            <div className="space-y-1.5">
                <label className="text-xs text-neutral-400">Name</label>
                <input
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Groceries"
                    maxLength={50}
                    className={cn(
                        UDS.inlineSurface,
                        "w-full px-2 py-1.5 text-sm outline-none",
                        UDS.inputFocus,
                    )}
                />
            </div>

            <div className="space-y-1.5">
                <label className="text-xs text-neutral-400">Color</label>
                <div className="flex flex-wrap gap-1.5">
                    {TAG_COLOR_PALETTE.map((c) => (
                        <Button variant="ghost"
                            key={c}
                            type="button"
                            onClick={() => setColor(c)}
                            aria-label={`Color ${c}`}
                            className={cn(
                                "size-5 sq-full transition-all",
                                "ring-offset-1 ring-offset-transparent",
                                color === c ? "ring-2 ring-black/30 dark:ring-white/40 scale-110" : "hover:scale-110",
                            )}
                            style={{ backgroundColor: c }}
                        />
                    ))}
                </div>
            </div>

            <div className="space-y-1.5">
                <label className="text-xs text-neutral-400">Icon</label>
                <div className="grid grid-cols-9 gap-1">
                    {TAG_ICON_OPTIONS.map(({ name: iconName, Icon }) => (
                        <Button variant="ghost"
                            key={iconName}
                            type="button"
                            onClick={() => setIcon(iconName)}
                            aria-label={iconName}
                            className={cn(
                                "p-1.5 sq transition-all",
                                icon === iconName
                                    ? cn(UDS.cardSelected, "text-black dark:text-white")
                                    : cn(UDS.itemHover, "text-neutral-400 hover:text-black dark:hover:text-white"),
                            )}
                        >
                            <Icon className="size-3.5" />
                        </Button>
                    ))}
                </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
                <span
                    className="inline-flex items-center gap-1.5 px-2 py-1 sq-md text-xs font-medium border"
                    style={{
                        backgroundColor: `${color}1a`,
                        borderColor: `${color}33`,
                        color,
                    }}
                >
                    <PreviewIcon className="size-3" />
                    {name.trim() || "Preview"}
                </span>
                <div className="flex-1" />
                <Button variant="ghost"
                    type="button"
                    onClick={onCancel}
                    disabled={submitting}
                    className="px-2.5 py-1 text-xs sq-md text-neutral-400 hover:text-black dark:hover:text-white"
                >
                    Cancel
                </Button>
                <Button variant="ghost"
                    type="submit"
                    disabled={submitting || !name.trim()}
                    className={cn(
                        "px-2.5 py-1 text-xs sq-md font-medium",
                        UDS.controlSurface,
                        UDS.itemHover,
                        "disabled:opacity-50 disabled:pointer-events-none",
                    )}
                >
                    {submitting ? "Creating…" : "Create"}
                </Button>
            </div>
        </form>
    )
}
