"use client"

import * as React from "react"
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core"
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
    SlidersHorizontal,
    Bell,
    Keyboard,
    PanelLeft,
    PanelRight,
    Sun,
    Moon,
    Monitor,
    User,
    Save,
    Loader2,
    Trash2,
    AlertTriangle,
    ChevronRight,
    ChevronLeft,
    X,
    Eye,
    EyeOff,
    Calendar,
    GripVertical,
    ListFilter,
} from "lucide-react"
import { useTheme } from "@/components/theme-provider"

import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogOverlay, DialogPortal } from "@/components/ui/dialog"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { AnimatedToggle } from "@/components/ui/animated-toggle"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePicker } from "@/components/date-picker"
import { cn } from "@/lib/utils"
import { PRISM } from "@/lib/PRISM"
import { useLanguage } from "@/components/language-provider"
import { useCurrency, type SupportedCurrency } from "@/components/currency-provider"
import { useSidebar } from "@/components/ui/sidebar"
import { useColorBlind, type ColorBlindMode } from "@/components/colorblind-provider"
import { useOS } from "@/hooks/use-os"
import { useIsMobile } from "@/hooks/use-mobile"
import { toast } from "sonner"
import { getSidebarPageDefinitions, type SidebarPageDefinition } from "@/lib/sidebar-pages"
import { useSidebarPagePreferences } from "@/hooks/use-sidebar-page-preferences"
import { RulesPanel } from "@/components/settings/rules-panel"

/* ─── Types ─── */

interface SettingsDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    initialPage?: SettingsPage
    onPageChange?: (page: SettingsPage) => void
}

export type SettingsPage = "account" | "customization" | "notifications" | "shortcuts" | "rules"

export const SETTINGS_PAGES = ["account", "customization", "notifications", "shortcuts", "rules"] as const

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SettingsTranslations = Record<string, any>

const settingsPages: { id: SettingsPage; icon: React.ElementType; labelKey: string; defaultLabel: string }[] = [
    { id: "account", icon: User, labelKey: "account", defaultLabel: "Account" },
    { id: "customization", icon: SlidersHorizontal, labelKey: "customization", defaultLabel: "Customization" },
    { id: "notifications", icon: Bell, labelKey: "notifications", defaultLabel: "Notifications" },
    { id: "shortcuts", icon: Keyboard, labelKey: "shortcuts", defaultLabel: "Shortcuts" },
    { id: "rules", icon: ListFilter, labelKey: "rules", defaultLabel: "Rules" },
]

type SettingsSearchResult = {
    page: (typeof settingsPages)[number]
    matches: Array<{ text: string; targetKey?: string }>
}

function escapeRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function highlightSearchText(text: string, query: string): React.ReactNode {
    const tokens = query
        .trim()
        .split(/\s+/)
        .filter(Boolean)

    if (!tokens.length) return text

    const pattern = tokens.map(escapeRegex).join("|")
    const regex = new RegExp(`(${pattern})`, "ig")
    const parts = text.split(regex)

    return parts.map((part, index) =>
        tokens.some((token) => part.toLowerCase() === token.toLowerCase()) ? (
            <mark key={`${part}-${index}`} className="rounded bg-amber-300/50 px-0.5 text-current dark:bg-amber-500/30">
                {part}
            </mark>
        ) : (
            <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>
        )
    )
}

/* ─── Primitives ─── */

// Flat label + description on the left, control on the right. No background,
// no border — sections are visually separated by <SettingsDivider /> below.
function SettingRow({
    label,
    description,
    children,
}: {
    label: React.ReactNode
    description: React.ReactNode
    children: React.ReactNode
}) {
    return (
        <div className="flex items-center justify-between gap-4 py-1">
            <div className="min-w-0 flex-1 space-y-0.5">
                <p className="text-[13px] font-medium leading-tight">{label}</p>
                <p className="text-xs text-neutral-400 leading-snug">{description}</p>
            </div>
            <div className="shrink-0">{children}</div>
        </div>
    )
}

function SectionHeader({ title, description }: { title: React.ReactNode; description: React.ReactNode }) {
    return (
        <div className="space-y-1">
            <h3 className="text-base font-semibold tracking-tight">{title}</h3>
            <p className="text-[13px] leading-relaxed text-neutral-400">{description}</p>
        </div>
    )
}

// A flat section: optional sub-heading + content. Place <SettingsDivider />
// between sections to separate them.
function SettingsSection({
    title,
    description,
    children,
    className,
}: {
    title?: React.ReactNode
    description?: React.ReactNode
    children: React.ReactNode
    className?: string
}) {
    return (
        <section className={cn("space-y-3", className)}>
            {(title || description) && (
                <div className="space-y-0.5">
                    {title && <h4 className="text-[13px] font-semibold">{title}</h4>}
                    {description && <p className="text-xs text-neutral-400">{description}</p>}
                </div>
            )}
            {children}
        </section>
    )
}

function SettingsDivider() {
    return <div className={cn(PRISM.separator, "my-5")} />
}

/* ─── Main Dialog ─── */

export function SettingsDialog({ open, onOpenChange, initialPage, onPageChange }: SettingsDialogProps) {
    const [activePage, setActivePageState] = React.useState<SettingsPage>(initialPage || "account")
    const [showMobileContent, setShowMobileContent] = React.useState(false)
    const [search, setSearch] = React.useState("")
    const [pendingFocusTarget, setPendingFocusTarget] = React.useState<string | null>(null)

    const setActivePage = React.useCallback((page: SettingsPage) => {
        setActivePageState(page)
        onPageChange?.(page)
    }, [onPageChange])

    // Sync with initialPage prop changes
    React.useEffect(() => {
        if (initialPage && initialPage !== activePage) {
            setActivePageState(initialPage)
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialPage])
    const { t, language, setLanguage } = useLanguage()
    const { currency, setCurrency, availableCurrencies } = useCurrency()
    const { theme, setTheme } = useTheme()
    const { side, setSide } = useSidebar()
    const { mode: colorBlindMode, setMode: setColorBlindMode } = useColorBlind()
    const isMobile = useIsMobile()
    const searchRef = React.useRef<HTMLInputElement>(null)

    const s: SettingsTranslations = (t as SettingsTranslations).settings || {}
    const sidebarPageNames = React.useMemo(() => getSidebarPageDefinitions(t, language).map((page) => page.name), [t, language])

    const pageSearchIndex = React.useMemo<Record<SettingsPage, Array<{ text: string; targetKey?: string }>>>(() => ({
        account: [
            { text: s.account || "Account" },
            { text: s.account_desc || "Manage your profile and security" },
            { text: s.profile || "Profile" },
            { text: s.name || "Name" },
            { text: s.email || "Email" },
            { text: s.dob || "Date of Birth" },
            { text: s.recovery_email || "Recovery Email" },
            { text: s.change_password || "Change Password" },
            { text: s.current_password || "Current Password" },
            { text: s.new_password || "New Password" },
            { text: s.confirm_password || "Confirm Password" },
            { text: s.danger_zone || "Danger Zone" },
            { text: s.delete_account || "Delete Account" },
        ],
        customization: [
            { text: s.customization || "Customization" },
            { text: s.customization_desc || "Manage layout, appearance, and sidebar pages from one place." },
            { text: s.general || "General" },
            { text: s.sidebar_position || "Sidebar Position", targetKey: "customization.sidebar-position" },
            { text: s.language || "Language", targetKey: "customization.language" },
            { text: s.currency || "Currency", targetKey: "customization.currency" },
            { text: s.appearance || "Appearance" },
            { text: s.theme || "Theme", targetKey: "customization.theme" },
            { text: s.dark || "Dark", targetKey: "customization.theme" },
            { text: s.light || "Light", targetKey: "customization.theme" },
            { text: s.system || "System", targetKey: "customization.theme" },
            { text: s.colorblind || "Colorblind Mode", targetKey: "customization.colorblind" },
            { text: s.sidebar || "Sidebar Pages", targetKey: "customization.sidebar-pages" },
            { text: s.sidebar_layout_desc || "Drag to reorder. Hidden pages stay in place and appear dimmed.", targetKey: "customization.sidebar-pages" },
            { text: s.reset_sidebar_layout || "Reset sidebar layout", targetKey: "customization.sidebar-pages" },
            ...sidebarPageNames.map((name) => ({ text: name, targetKey: "customization.sidebar-pages" as const })),
        ],
        notifications: [
            { text: s.notifications || "Notifications" },
            { text: s.notifications_desc || "Configure how you receive notifications" },
            { text: s.channels || "Channels" },
            { text: s.email_notifications || "Email Notifications" },
            { text: s.push_notifications || "Push Notifications" },
            { text: s.alerts || "Alerts" },
            { text: s.bill_reminders || "Bill Reminders" },
            { text: s.budget_alerts || "Budget Alerts" },
        ],
        shortcuts: [
            { text: s.shortcuts || "Keyboard Shortcuts" },
            { text: s.shortcuts_desc || "Quick actions to navigate faster" },
            { text: s.shortcuts_general || "General" },
            { text: s.shortcuts_navigation || "Navigation" },
            { text: s.shortcuts_actions || "Actions" },
            { text: s.shortcut_command_palette || "Open Command Palette" },
            { text: s.shortcut_toggle_sidebar || "Toggle Sidebar" },
            { text: s.shortcut_search || "Search" },
            { text: s.shortcut_new_transaction || "New Transaction" },
        ],
        rules: [
            { text: s.rules || "Rules" },
            { text: "tag" },
            { text: "categorize" },
            { text: "filter" },
            { text: "counterparty" },
            { text: "amount" },
        ],
    }), [s, sidebarPageNames])

    const filteredPageResults = React.useMemo<SettingsSearchResult[]>(() => {
        const q = search.trim().toLowerCase()
        if (!q) {
            return settingsPages.map((page) => ({ page, matches: [] }))
        }

        const tokens = q.split(/\s+/).filter(Boolean)

        return settingsPages
            .map((page) => {
                const title = s[page.labelKey] || page.defaultLabel
                const sources = [
                    { text: title },
                    { text: page.id },
                    ...(pageSearchIndex[page.id] || []),
                ]
                const sourceMatches = sources.filter((text) => {
                    const normalized = text.text.toLowerCase()
                    return tokens.every((token) => normalized.includes(token))
                })

                const deduped = Array.from(
                    new Map(sourceMatches.map((entry) => [entry.text.toLowerCase(), entry])).values()
                ).slice(0, 2)

                return {
                    page,
                    matches: deduped,
                }
            })
            .filter((entry) => entry.matches.length > 0)
    }, [pageSearchIndex, s, search])

    const filteredPages = React.useMemo(
        () => filteredPageResults.map((entry) => entry.page),
        [filteredPageResults],
    )

    // Keyboard navigation for sidebar
    const handleSidebarKeyDown = React.useCallback(
        (e: React.KeyboardEvent) => {
            const pages = filteredPages
            const idx = pages.findIndex((p) => p.id === activePage)
            if (e.key === "ArrowDown") {
                e.preventDefault()
                const next = pages[(idx + 1) % pages.length]
                if (next) setActivePage(next.id)
            } else if (e.key === "ArrowUp") {
                e.preventDefault()
                const prev = pages[(idx - 1 + pages.length) % pages.length]
                if (prev) setActivePage(prev.id)
            }
        },
        [activePage, filteredPages],
    )

    // Reset state on close
    React.useEffect(() => {
        if (!open) {
            setSearch("")
            setShowMobileContent(false)
        }
    }, [open])

    const handlePageSelect = (id: SettingsPage) => {
        setPendingFocusTarget(null)
        setActivePage(id)
        if (isMobile) setShowMobileContent(true)
    }

    const handleSearchResultSelect = React.useCallback((result: SettingsSearchResult) => {
        const target = result.matches.find((m) => m.targetKey)?.targetKey || null
        setPendingFocusTarget(target)
        setActivePage(result.page.id)
        if (isMobile) setShowMobileContent(true)
    }, [isMobile, setActivePage])

    /* ─── Shared nav list ─── */
    const navContent = (
        <>
            {/* Search */}
            <div className="px-3 pb-2">
                <div className="relative">
                    <Input
                        ref={searchRef}
                        id="settings-search"
                        type="search"
                        placeholder={s.search || "Search settings"}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pr-8 text-[13px]"
                    />
                </div>
            </div>

            <nav
                className="flex-1 overflow-y-auto px-3 pb-3 space-y-0.5"
                onKeyDown={handleSidebarKeyDown}
            >
                {filteredPageResults.length === 0 && (
                    <p className="px-2.5 py-4 text-center text-xs text-neutral-400">
                        {s.no_results || "No results"}
                    </p>
                )}
                {filteredPageResults.map((result) => {
                    const page = result.page
                    const Icon = page.icon
                    const isActive = activePage === page.id
                    const pageTitle = s[page.labelKey] || page.defaultLabel
                    return (
                        <button
                            key={page.id}
                            onClick={() => (search.trim() ? handleSearchResultSelect(result) : handlePageSelect(page.id))}
                            className={cn(
                                "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-all duration-150",
                                isActive
                                    ? "bg-white/12 text-black dark:text-white shadow-[inset_0_0.5px_0_rgba(255,255,255,0.15)]"
                                    : "text-neutral-400 hover:bg-black/6 dark:hover:bg-white/6 hover:text-black dark:hover:text-white",
                            )}
                        >
                            <Icon className="size-[15px]" />
                            <span className="flex-1 text-left">
                                <span className="block">{search.trim() ? highlightSearchText(pageTitle, search) : pageTitle}</span>
                                {search.trim() && result.matches.length > 0 && (
                                    <span className="mt-0.5 block text-[11px] font-normal text-neutral-400 line-clamp-2">
                                        {result.matches.map((match, index) => (
                                            <React.Fragment key={`${page.id}-match-${index}`}>
                                                {index > 0 && " • "}
                                                {highlightSearchText(match.text, search)}
                                            </React.Fragment>
                                        ))}
                                    </span>
                                )}
                            </span>
                            <ChevronRight className="size-3 opacity-60" />
                        </button>
                    )
                })}
            </nav>
        </>
    )

    /* ─── Shared content pages ─── */
    const activePageMeta = React.useMemo(
        () => settingsPages.find((p) => p.id === activePage),
        [activePage],
    )

    const activePageLabel = s[activePageMeta?.labelKey || ""] || activePageMeta?.defaultLabel || ""

    const activePageContent = React.useMemo(() => {
        switch (activePage) {
            case "account":
                return <AccountSettings s={s} language={language} />
            case "customization":
                return (
                    <CustomizationSettings
                        s={s}
                        t={t}
                        focusTarget={pendingFocusTarget}
                        onFocusTargetHandled={() => setPendingFocusTarget(null)}
                        searchHighlightQuery={search}
                        side={side}
                        setSide={setSide}
                        language={language}
                        setLanguage={setLanguage}
                        currency={currency}
                        setCurrency={setCurrency}
                        availableCurrencies={availableCurrencies}
                        theme={theme}
                        setTheme={setTheme}
                        colorBlindMode={colorBlindMode}
                        setColorBlindMode={setColorBlindMode}
                    />
                )
            case "notifications":
                return <NotificationSettings s={s} />
            case "shortcuts":
                return <ShortcutsSettings s={s} />
            case "rules":
                return <RulesPanel />
            default:
                return null
        }
    }, [activePage, availableCurrencies, colorBlindMode, currency, language, pendingFocusTarget, s, search, setColorBlindMode, setCurrency, setLanguage, setSide, setTheme, side, t, theme])

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogPortal>
                <DialogOverlay />
                <DialogPrimitive.Content
                    style={isMobile ? undefined : { width: 900, height: 600, maxWidth: "calc(100vw - 2rem)", maxHeight: "calc(100vh - 2rem)" }}
                    className={cn(
                        "fixed z-50 overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 duration-200",
                        PRISM.container, "p-0",
                        isMobile
                            ? "inset-0 rounded-none"
                            : "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
                        !isMobile && "shadow-[0_10px_28px_rgba(0,0,0,0.14),inset_0_0.5px_0_rgba(255,255,255,0.34)] dark:shadow-[0_10px_28px_rgba(0,0,0,0.22),inset_0_0.5px_0_rgba(255,255,255,0.18)]",
                    )}
                >
                    {isMobile ? (
                        /* ─── Mobile: full-screen with slide between nav & content ─── */
                        <div className="flex flex-col w-full h-full">
                            {!showMobileContent ? (
                                /* Mobile nav screen */
                                <div className="flex flex-col h-full">
                                    <div className="flex items-center justify-between px-5 pt-5 pb-3">
                                        <div>
                                            <DialogTitle className={cn(PRISM.title, "text-[15px]")}>
                                                {s.title || "Settings"}
                                            </DialogTitle>
                                            <DialogDescription className={cn(PRISM.description, "mt-0.5 text-xs")}>
                                                {s.description || "Manage your preferences"}
                                            </DialogDescription>
                                        </div>
                                        <DialogPrimitive.Close className={cn("absolute right-4 top-4", PRISM.closeButton)}>
                                            <X className="h-4 w-4" />
                                            <span className="sr-only">Close</span>
                                        </DialogPrimitive.Close>
                                    </div>
                                    {navContent}
                                    <div className="border-t border-black/8 dark:border-white/8 px-4 py-2.5">
                                        <p className="text-[10px] text-neutral-400/60 text-center">Argent v1.0</p>
                                    </div>
                                </div>
                            ) : (
                                /* Mobile content screen */
                                <div className="flex flex-col h-full">
                                    <div className="flex items-center gap-2 px-3 pt-3 pb-2 border-b border-black/8 dark:border-white/8">
                                        <button
                                            type="button"
                                            onClick={() => setShowMobileContent(false)}
                                            className="p-1.5 rounded-md text-neutral-400 hover:text-black dark:hover:text-white hover:bg-black/6 dark:hover:bg-white/6 transition-all duration-150"
                                        >
                                            <ChevronLeft className="size-4" />
                                        </button>
                                        <span className="text-[13px] font-semibold">{activePageLabel}</span>
                                    </div>
                                    <div className="flex-1 relative overflow-hidden">
                                        <div className="absolute inset-0 overflow-y-auto">
                                            <div className="mx-auto w-full max-w-2xl px-6 py-4">
                                                {activePageContent}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* ─── Desktop: side-by-side layout ─── */
                        <div className="flex w-full h-full">
                            <aside className="flex w-56 shrink-0 flex-col border-r border-black/8 dark:border-white/8 bg-black/2 dark:bg-white/2">
                                <div className="px-5 pt-5 pb-3">
                                    <DialogTitle className={cn(PRISM.title, "text-[15px]")}>
                                        {s.title || "Settings"}
                                    </DialogTitle>
                                    <DialogDescription className={cn(PRISM.description, "mt-0.5 text-xs")}>
                                        {s.description || "Manage your preferences"}
                                    </DialogDescription>
                                </div>
                                {navContent}
                                <div className="border-t border-black/8 dark:border-white/8 px-4 py-2.5">
                                    <p className="text-[10px] text-neutral-400/60 text-center">Argent v1.0</p>
                                </div>
                            </aside>
                            <div className="flex-1 relative overflow-hidden">
                                <div className="absolute inset-0 overflow-y-auto">
                                    <div className="mx-auto w-full max-w-2xl px-6 py-4">
                                        {activePageContent}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Close button (desktop only) */}
                    {!isMobile && (
                        <DialogPrimitive.Close className={cn("absolute right-4 top-4", PRISM.closeButton)}>
                            <X className="h-4 w-4" />
                            <span className="sr-only">Close</span>
                        </DialogPrimitive.Close>
                    )}
                </DialogPrimitive.Content>
            </DialogPortal>
        </Dialog>
    )
}

/* ─── Account Settings ─── */

function AccountSettings({ s, language }: { s: SettingsTranslations; language: string }) {
    const [profile, setProfile] = React.useState({ name: "", email: "", dob: "", recoveryEmail: "" })
    const [originalProfile, setOriginalProfile] = React.useState({ name: "", email: "", dob: "", recoveryEmail: "" })
    const [profileAvatar, setProfileAvatar] = React.useState("")
    const [passwords, setPasswords] = React.useState({ current: "", new: "", confirm: "" })
    const [isLoading, setIsLoading] = React.useState(true)
    const [isSaving, setIsSaving] = React.useState(false)

    React.useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await fetch("/api/auth/profile", {
                    cache: "no-store",
                    credentials: "include",
                })
                if (res.ok) {
                    const data = await res.json()
                    const p = {
                        name: data.name || "",
                        email: data.email || "",
                        dob: data.dateOfBirth ? new Date(data.dateOfBirth).toISOString().split("T")[0] : "",
                        recoveryEmail: data.recoveryEmail || "",
                    }
                    setProfileAvatar(data.avatar || "")
                    setProfile(p)
                    setOriginalProfile(p)
                } else {
                    setProfileAvatar("")
                    setProfile({ name: "", email: "", dob: "", recoveryEmail: "" })
                    setOriginalProfile({ name: "", email: "", dob: "", recoveryEmail: "" })
                }
            } catch {
                toast.error("Failed to load profile")
            } finally {
                setIsLoading(false)
            }
        }
        fetchProfile()
    }, [])

    const hasChanges =
        JSON.stringify(profile) !== JSON.stringify(originalProfile) ||
        passwords.current !== "" ||
        passwords.new !== "" ||
        passwords.confirm !== ""

    const dobDisplay = profile.dob
        ? new Date(`${profile.dob}T00:00:00`).toLocaleDateString(language === "pt" ? "pt-PT" : "en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        })
        : ""

    const handleSave = async () => {
        if (passwords.new && passwords.new !== passwords.confirm) {
            toast.error("Passwords do not match")
            return
        }
        if (passwords.new && !passwords.current) {
            toast.error("Enter your current password")
            return
        }

        setIsSaving(true)
        try {
            const res = await fetch("/api/auth/update", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: profile.name,
                    email: profile.email,
                    dateOfBirth: profile.dob || null,
                    recoveryEmail: profile.recoveryEmail || null,
                    ...(passwords.new ? { currentPassword: passwords.current, newPassword: passwords.new } : {}),
                }),
            })

            if (res.ok) {
                toast.success("Saved")
                setOriginalProfile(profile)
                setPasswords({ current: "", new: "", confirm: "" })
                window.dispatchEvent(new Event("profile-updated"))
            } else {
                const err = await res.json()
                toast.error(err.error || "Failed to save")
            }
        } catch {
            toast.error("Failed to save")
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="size-5 animate-spin text-neutral-400" />
            </div>
        )
    }

    return (
        <div className="flex min-h-full flex-col gap-4">
            <SectionHeader
                title={s.account || "Account"}
                description={s.account_desc || "Manage your profile and security"}
            />

            {/* Profile header with avatar */}
            <div className={cn("flex items-center gap-4 px-4 py-4", PRISM.cardSurface)}>
                <Avatar className="size-12 shrink-0 rounded-full">
                    <AvatarImage src={profileAvatar} alt={profile.name || "User"} />
                    <AvatarFallback className="rounded-full bg-primary/10 text-primary text-lg font-semibold">
                        {profile.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2) || <User className="size-5" />}
                    </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{profile.name || "Your Name"}</p>
                    <p className="text-xs text-neutral-400 truncate">{profile.email || "your@email.com"}</p>
                </div>
            </div>

            <SettingsDivider />

            <SettingsSection title={s.profile || "Profile"}>
                <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                        placeholder={s.name || "Name"}
                        aria-label={s.name || "Name"}
                        value={profile.name}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    />
                    <Input
                        placeholder={s.email || "Email"}
                        aria-label={s.email || "Email"}
                        type="email"
                        value={profile.email}
                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    />
                    <DatePicker
                        value={profile.dob}
                        onChange={(value) => setProfile({ ...profile, dob: value })}
                        locale={language}
                        placeholder={s.dob || "Date of Birth"}
                        dobMode
                        className="w-full"
                        trigger={
                            <button
                                type="button"
                                className="relative flex h-11 w-full items-center rounded-xl border border-black/10 bg-black/5 px-4 pr-10 text-left text-[15px] text-neutral-900 transition-all duration-200 hover:bg-black/8 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/8"
                            >
                                <span className={cn("truncate", dobDisplay ? "text-neutral-900 dark:text-white" : "text-neutral-400/60") }>
                                    {dobDisplay || (s.dob || "Date of Birth")}
                                </span>
                                <span className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <Calendar className="size-4 text-neutral-400" />
                                </span>
                            </button>
                        }
                    />
                    <Input
                        placeholder={s.recovery_email || "Recovery Email"}
                        aria-label={s.recovery_email || "Recovery Email"}
                        type="email"
                        value={profile.recoveryEmail}
                        onChange={(e) => setProfile({ ...profile, recoveryEmail: e.target.value })}
                    />
                </div>
            </SettingsSection>

            <SettingsDivider />

            <SettingsSection title={s.change_password || "Change Password"}>
                <div className="space-y-3">
                    <Input
                        placeholder={s.current_password || "Current Password"}
                        aria-label={s.current_password || "Current Password"}
                        type="password"
                        value={passwords.current}
                        onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                        className="max-w-sm"
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Input
                            placeholder={s.new_password || "New Password"}
                            aria-label={s.new_password || "New Password"}
                            type="password"
                            value={passwords.new}
                            onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                        />
                        <Input
                            placeholder={s.confirm_password || "Confirm Password"}
                            aria-label={s.confirm_password || "Confirm Password"}
                            type="password"
                            value={passwords.confirm}
                            onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                        />
                    </div>
                </div>
            </SettingsSection>

            <SettingsDivider />

            <DeleteAccountSection s={s} />

            {/* Sticky save bar */}
            {hasChanges && (
                <div className="sticky bottom-0 -mx-6 mt-auto flex items-center justify-end gap-3 border-t border-black/8 dark:border-white/8 bg-black/3 dark:bg-white/3 backdrop-blur-xl px-6 py-3">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            setProfile(originalProfile)
                            setPasswords({ current: "", new: "", confirm: "" })
                        }}
                    >
                        {s.cancel || "Cancel"}
                    </Button>
                    <Button size="sm" variant="solid" onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Save className="mr-1.5 size-3.5" />}
                        {s.save || "Save Changes"}
                    </Button>
                </div>
            )}
        </div>
    )
}

/* ─── Delete Account ─── */

function DeleteAccountSection({ s }: { s: SettingsTranslations }) {
    const [open, setOpen] = React.useState(false)
    const [password, setPassword] = React.useState("")
    const [isDeleting, setIsDeleting] = React.useState(false)

    const handleDelete = async () => {
        if (!password) {
            toast.error("Enter your password")
            return
        }
        setIsDeleting(true)
        try {
            const res = await fetch("/api/auth/delete-account", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password }),
            })
            if (res.ok) {
                toast.success("Account deleted")
                window.location.href = "/login"
            } else {
                const err = await res.json()
                toast.error(err.error || "Failed to delete account")
            }
        } catch {
            toast.error("Failed to delete account")
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <>
            <div className="rounded-xl border border-destructive/20 bg-destructive/4 overflow-hidden">
                <div className="px-4 pt-4 pb-2">
                    <h4 className="text-[13px] font-semibold text-destructive">{s.danger_zone || "Danger Zone"}</h4>
                </div>
                <div className="px-4 pb-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <p className="text-[13px] font-medium">{s.delete_account || "Delete Account"}</p>
                            <p className="text-xs text-neutral-400">{s.delete_account_desc || "Permanently remove your account and all data"}</p>
                        </div>
                        <Button variant="solid-destructive" size="sm" onClick={() => setOpen(true)}>
                            <Trash2 className="mr-1.5 size-3.5" />
                            {s.delete || "Delete"}
                        </Button>
                    </div>
                </div>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-md p-0 overflow-hidden">
                    <div className="flex flex-col items-center px-6 pt-6 pb-2 text-center">
                        <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 mb-3">
                            <AlertTriangle className="size-5 text-destructive" />
                        </div>
                        <DialogTitle className="text-base font-semibold">{s.delete_account_title || "Delete Account"}</DialogTitle>
                        <DialogDescription className="mt-1.5 text-[13px] text-neutral-400 leading-relaxed">
                            {s.delete_account_confirm || "This action cannot be undone. Enter your password to confirm."}
                        </DialogDescription>
                    </div>
                    <div className="px-6 pb-6 space-y-4">
                        <Input
                            type="password"
                            placeholder={s.password || "Password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleDelete()}
                        />
                        <div className="flex gap-2">
                            <Button variant="glass" className="flex-1 h-9" onClick={() => setOpen(false)}>
                                {s.cancel || "Cancel"}
                            </Button>
                            <Button variant="solid-destructive" className="flex-1 h-9" onClick={handleDelete} disabled={isDeleting || !password}>
                                {isDeleting ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Trash2 className="mr-1.5 size-3.5" />}
                                {s.delete_permanently || "Delete Permanently"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}

/* ─── General Settings ─── */

function CustomizationSettings({
    s,
    t,
    focusTarget,
    onFocusTargetHandled,
    searchHighlightQuery,
    side,
    setSide,
    language,
    setLanguage,
    currency,
    setCurrency,
    availableCurrencies,
    theme,
    setTheme,
    colorBlindMode,
    setColorBlindMode,
}: {
    s: SettingsTranslations
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    t: any
    focusTarget?: string | null
    onFocusTargetHandled?: () => void
    searchHighlightQuery?: string
    side: "left" | "right"
    setSide: (side: "left" | "right") => void
    language: string
    setLanguage: (lang: "en" | "pt") => void
    currency: SupportedCurrency
    setCurrency: (currency: SupportedCurrency) => void
    availableCurrencies: readonly { symbol: string; code: SupportedCurrency }[]
    theme: string | undefined
    setTheme: (t: string) => void
    colorBlindMode: string
    setColorBlindMode: (m: ColorBlindMode) => void
}) {
    const targetRefs = React.useRef<Record<string, HTMLDivElement | null>>({})
    const [flashTarget, setFlashTarget] = React.useState<string | null>(null)
    const [openSidebarPositionSelect, setOpenSidebarPositionSelect] = React.useState(false)
    const [openLanguageSelect, setOpenLanguageSelect] = React.useState(false)
    const [openCurrencySelect, setOpenCurrencySelect] = React.useState(false)
    const [openThemeSelect, setOpenThemeSelect] = React.useState(false)
    const [openColorblindSelect, setOpenColorblindSelect] = React.useState(false)

    const allPages = React.useMemo(() => getSidebarPageDefinitions(t, language), [t, language])
    const allPageIds = React.useMemo(() => allPages.map((page) => page.id), [allPages])
    const { orderedIds, hiddenSet, reorderPages, setHidden, reset } = useSidebarPagePreferences(allPageIds)

    const pagesById = React.useMemo(
        () => new Map(allPages.map((page) => [page.id, page] as const)),
        [allPages],
    )

    const orderedPages = React.useMemo(
        () => orderedIds.map((id) => pagesById.get(id)).filter((page): page is SidebarPageDefinition => Boolean(page)),
        [orderedIds, pagesById],
    )

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

    const handleDragEnd = React.useCallback((event: DragEndEvent) => {
        const { active, over } = event
        if (!over || active.id === over.id) return

        const oldIndex = orderedIds.indexOf(String(active.id) as (typeof orderedIds)[number])
        const newIndex = orderedIds.indexOf(String(over.id) as (typeof orderedIds)[number])
        if (oldIndex < 0 || newIndex < 0) return

        reorderPages(arrayMove(orderedIds, oldIndex, newIndex))
    }, [orderedIds, reorderPages])

    const themeOptions = [
        { value: "light", label: s.light || "Light", icon: Sun },
        { value: "dark", label: s.dark || "Dark", icon: Moon },
        { value: "system", label: s.system || "System", icon: Monitor },
    ]

    const colorBlindOptions = [
        { value: "none", label: s.none || "None" },
        { value: "deuteranopia", label: s.deuteranopia || "Deuteranopia" },
        { value: "protanopia", label: s.protanopia || "Protanopia" },
        { value: "tritanopia", label: s.tritanopia || "Tritanopia" },
    ]

    React.useEffect(() => {
        if (!focusTarget || !focusTarget.startsWith("customization.")) return

        const key = focusTarget.replace("customization.", "")
        const el = targetRefs.current[key]
        if (!el) return

        if (key === "sidebar-position") setOpenSidebarPositionSelect(true)
        if (key === "language") setOpenLanguageSelect(true)
        if (key === "currency") setOpenCurrencySelect(true)
        if (key === "theme") setOpenThemeSelect(true)
        if (key === "colorblind") setOpenColorblindSelect(true)

        el.scrollIntoView({ behavior: "smooth", block: "center" })
        setFlashTarget(key)
        const timeout = setTimeout(() => setFlashTarget((current) => (current === key ? null : current)), 1400)
        onFocusTargetHandled?.()
        return () => clearTimeout(timeout)
    }, [focusTarget, onFocusTargetHandled])

    return (
        <div className="space-y-4">
            <SectionHeader
                title={s.customization || "Customization"}
                description={s.customization_desc || "Manage layout, appearance, and sidebar pages from one place."}
            />

            <SettingsDivider />

            <SettingsSection title={s.general || "General"}>
                <div
                    ref={(el) => { targetRefs.current["sidebar-position"] = el }}
                    className={cn("rounded-lg px-2", flashTarget === "sidebar-position" && "ring-1 ring-amber-400/60")}
                >
                    <SettingRow
                        label={searchHighlightQuery?.trim() ? highlightSearchText(s.sidebar_position || "Sidebar Position", searchHighlightQuery) : (s.sidebar_position || "Sidebar Position")}
                        description={searchHighlightQuery?.trim() ? highlightSearchText(s.sidebar_position_desc || "Choose which side the navigation appears on", searchHighlightQuery) : (s.sidebar_position_desc || "Choose which side the navigation appears on")}
                    >
                        <Select
                            value={side}
                            open={openSidebarPositionSelect}
                            onOpenChange={setOpenSidebarPositionSelect}
                            onValueChange={(v) => setSide(v as "left" | "right")}
                        >
                            <SelectTrigger className="w-[180px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="left">
                                    <span className="flex items-center gap-2">
                                        <PanelLeft className="size-4 text-neutral-400" />
                                        {searchHighlightQuery?.trim() ? highlightSearchText(s.left || "Left", searchHighlightQuery) : (s.left || "Left")}
                                    </span>
                                </SelectItem>
                                <SelectItem value="right">
                                    <span className="flex items-center gap-2">
                                        <PanelRight className="size-4 text-neutral-400" />
                                        {searchHighlightQuery?.trim() ? highlightSearchText(s.right || "Right", searchHighlightQuery) : (s.right || "Right")}
                                    </span>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </SettingRow>
                </div>

                <div
                    ref={(el) => { targetRefs.current["language"] = el }}
                    className={cn("rounded-lg px-2", flashTarget === "language" && "ring-1 ring-amber-400/60")}
                >
                    <SettingRow
                        label={searchHighlightQuery?.trim() ? highlightSearchText(s.language || "Language", searchHighlightQuery) : (s.language || "Language")}
                        description={searchHighlightQuery?.trim() ? highlightSearchText(s.language_desc || "Choose your preferred language", searchHighlightQuery) : (s.language_desc || "Choose your preferred language")}
                    >
                        <Select
                            value={language}
                            open={openLanguageSelect}
                            onOpenChange={setOpenLanguageSelect}
                            onValueChange={(v) => setLanguage(v as "en" | "pt")}
                        >
                            <SelectTrigger className="w-[180px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="en">{searchHighlightQuery?.trim() ? highlightSearchText("English", searchHighlightQuery) : "English"}</SelectItem>
                                <SelectItem value="pt">{searchHighlightQuery?.trim() ? highlightSearchText("Português", searchHighlightQuery) : "Português"}</SelectItem>
                            </SelectContent>
                        </Select>
                    </SettingRow>
                </div>

                <div
                    ref={(el) => { targetRefs.current["currency"] = el }}
                    className={cn("rounded-lg px-2", flashTarget === "currency" && "ring-1 ring-amber-400/60")}
                >
                    <SettingRow
                        label={searchHighlightQuery?.trim() ? highlightSearchText(s.currency || "Currency", searchHighlightQuery) : (s.currency || "Currency")}
                        description={searchHighlightQuery?.trim() ? highlightSearchText(s.currency_live_rates || "Values are converted from your stored data using recent exchange rates.", searchHighlightQuery) : (s.currency_live_rates || "Values are converted from your stored data using recent exchange rates.")}
                    >
                        <Select
                            value={currency}
                            open={openCurrencySelect}
                            onOpenChange={setOpenCurrencySelect}
                            onValueChange={(value) => setCurrency(value as SupportedCurrency)}
                        >
                            <SelectTrigger className="w-[180px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {availableCurrencies.map((option) => (
                                    <SelectItem key={option.code} value={option.code}>
                                        {searchHighlightQuery?.trim()
                                            ? highlightSearchText(`${option.symbol} · ${option.code}`, searchHighlightQuery)
                                            : `${option.symbol} · ${option.code}`}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </SettingRow>
                </div>
            </SettingsSection>

            <SettingsDivider />

            <SettingsSection title={s.appearance || "Appearance"}>
                <div
                    ref={(el) => { targetRefs.current["theme"] = el }}
                    className={cn("rounded-lg px-2", flashTarget === "theme" && "ring-1 ring-amber-400/60")}
                >
                    <SettingRow
                        label={searchHighlightQuery?.trim() ? highlightSearchText(s.theme || "Theme", searchHighlightQuery) : (s.theme || "Theme")}
                        description={searchHighlightQuery?.trim() ? highlightSearchText(s.theme_desc || "Choose your preferred appearance", searchHighlightQuery) : (s.theme_desc || "Choose your preferred appearance")}
                    >
                        <Select
                            value={theme || "system"}
                            open={openThemeSelect}
                            onOpenChange={setOpenThemeSelect}
                            onValueChange={(v) => setTheme(v)}
                        >
                            <SelectTrigger className="w-[180px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {themeOptions.map((opt) => {
                                    const Icon = opt.icon
                                    return (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            <span className="flex items-center gap-2">
                                                <Icon className="size-4 text-neutral-400" />
                                                {searchHighlightQuery?.trim() ? highlightSearchText(opt.label, searchHighlightQuery) : opt.label}
                                            </span>
                                        </SelectItem>
                                    )
                                })}
                            </SelectContent>
                        </Select>
                    </SettingRow>
                </div>

                <div
                    ref={(el) => { targetRefs.current["colorblind"] = el }}
                    className={cn("rounded-lg px-2", flashTarget === "colorblind" && "ring-1 ring-amber-400/60")}
                >
                    <SettingRow
                        label={searchHighlightQuery?.trim() ? highlightSearchText(s.colorblind || "Colorblind Mode", searchHighlightQuery) : (s.colorblind || "Colorblind Mode")}
                        description={searchHighlightQuery?.trim() ? highlightSearchText(s.colorblind_desc || "Optimize colors for color vision deficiencies", searchHighlightQuery) : (s.colorblind_desc || "Optimize colors for color vision deficiencies")}
                    >
                        <Select
                            value={colorBlindMode}
                            open={openColorblindSelect}
                            onOpenChange={setOpenColorblindSelect}
                            onValueChange={(v) => setColorBlindMode(v as ColorBlindMode)}
                        >
                            <SelectTrigger className="w-[200px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {colorBlindOptions.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                        {searchHighlightQuery?.trim() ? highlightSearchText(opt.label, searchHighlightQuery) : opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </SettingRow>
                </div>
            </SettingsSection>

            <SettingsDivider />

            <div
                ref={(el) => { targetRefs.current["sidebar-pages"] = el }}
                className={cn("rounded-lg px-2", flashTarget === "sidebar-pages" && "ring-1 ring-amber-400/60")}
            >
                <SettingsSection
                    title={s.sidebar || "Sidebar Pages"}
                    description={s.sidebar_layout_desc || "Drag to reorder. Hidden pages stay in place and appear dimmed."}
                >
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
                            <div className="space-y-1.5">
                                {orderedPages.map((page) => (
                                    <SortableSidebarRow
                                        key={page.id}
                                        page={page}
                                        hidden={hiddenSet.has(page.id)}
                                        searchHighlightQuery={searchHighlightQuery}
                                        onToggleHidden={() => setHidden(page.id, !hiddenSet.has(page.id))}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>

                    <div className="pt-2">
                        <Button type="button" variant="ghost" size="sm" onClick={reset}>
                            {s.reset_sidebar_layout || "Reset sidebar layout"}
                        </Button>
                    </div>
                </SettingsSection>
            </div>
        </div>
    )
}

function SortableSidebarRow({
    page,
    hidden,
    searchHighlightQuery,
    onToggleHidden,
}: {
    page: SidebarPageDefinition
    hidden: boolean
    searchHighlightQuery?: string
    onToggleHidden: () => void
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: page.id })

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
    }

    const Icon = page.icon

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "flex items-center gap-2 rounded-lg border border-black/8 dark:border-white/8 px-2.5 py-2",
                "bg-black/2 dark:bg-white/2",
                hidden && "grayscale opacity-50 blur-[0.2px]",
                isDragging && "z-20 border-primary/30 bg-black/8 dark:bg-white/8 shadow-lg",
            )}
        >
            <button
                type="button"
                className="rounded p-1 text-neutral-400 hover:bg-black/8 dark:hover:bg-white/8"
                aria-label={`Drag ${page.name}`}
                {...attributes}
                {...listeners}
            >
                <GripVertical className="size-4" />
            </button>

            <Icon className="size-4 text-neutral-400" />
            <span className="flex-1 text-[13px]">
                {searchHighlightQuery?.trim() ? highlightSearchText(page.name, searchHighlightQuery) : page.name}
            </span>
            {hidden && <span className="text-[10px] text-neutral-400">Hidden</span>}

            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={onToggleHidden}
            >
                {hidden ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                <span className="sr-only">Toggle visibility</span>
            </Button>
        </div>
    )
}

/* ─── Notification Settings ─── */

const NOTIFICATION_STORAGE_KEY = "argent-notification-prefs"

function NotificationSettings({ s }: { s: SettingsTranslations }) {
    const [prefs, setPrefs] = React.useState(() => {
        if (typeof window === "undefined") return { email: true, push: false, bills: true, budget: true }
        try {
            const stored = localStorage.getItem(NOTIFICATION_STORAGE_KEY)
            if (stored) return JSON.parse(stored) as { email: boolean; push: boolean; bills: boolean; budget: boolean }
        } catch { /* ignore */ }
        return { email: true, push: false, bills: true, budget: true }
    })

    const updatePref = (key: keyof typeof prefs, value: boolean) => {
        const next = { ...prefs, [key]: value }
        setPrefs(next)
        try { localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(next)) } catch { /* ignore */ }
    }

    return (
        <div className="space-y-4">
            <SectionHeader
                title={s.notifications || "Notifications"}
                description={s.notifications_desc || "Configure how you receive notifications"}
            />

            <SettingsDivider />

            <SettingsSection title={s.channels || "Channels"}>
                <SettingRow
                    label={s.email_notifications || "Email Notifications"}
                    description={s.email_notifications_desc || "Receive notifications via email"}
                >
                    <AnimatedToggle checked={prefs.email} onCheckedChange={(v) => updatePref("email", v)} />
                </SettingRow>
                <SettingRow
                    label={s.push_notifications || "Push Notifications"}
                    description={s.push_notifications_desc || "Receive push notifications in browser"}
                >
                    <AnimatedToggle checked={prefs.push} onCheckedChange={(v) => updatePref("push", v)} />
                </SettingRow>
            </SettingsSection>

            <SettingsDivider />

            <SettingsSection title={s.alerts || "Alerts"}>
                <SettingRow
                    label={s.bill_reminders || "Bill Reminders"}
                    description={s.bill_reminders_desc || "Get reminded about upcoming bills"}
                >
                    <AnimatedToggle checked={prefs.bills} onCheckedChange={(v) => updatePref("bills", v)} />
                </SettingRow>
                <SettingRow
                    label={s.budget_alerts || "Budget Alerts"}
                    description={s.budget_alerts_desc || "Get alerted when nearing budget limits"}
                >
                    <AnimatedToggle checked={prefs.budget} onCheckedChange={(v) => updatePref("budget", v)} />
                </SettingRow>
            </SettingsSection>
        </div>
    )
}

/* ─── Shortcuts Settings ─── */

function ShortcutsSettings({ s }: { s: SettingsTranslations }) {
    const { modKey } = useOS()

    const shortcutGroups = [
        {
            title: s.shortcuts_general || "General",
            shortcuts: [
                { action: s.shortcut_command_palette || "Open Command Palette", keys: [modKey, "K"] },
                { action: s.shortcut_toggle_sidebar || "Toggle Sidebar", keys: [modKey, "B"] },
                { action: s.shortcut_search || "Search", keys: [modKey, "F"] },
            ],
        },
        {
            title: s.shortcuts_navigation || "Navigation",
            shortcuts: [
                { action: s.shortcut_dashboard || "Go to Dashboard", keys: ["G", "D"] },
                { action: s.shortcut_transactions || "Go to Transactions", keys: ["G", "T"] },
                { action: s.shortcut_accounts || "Go to Accounts", keys: ["G", "A"] },
                { action: s.shortcut_budgets || "Go to Budgets", keys: ["G", "B"] },
                { action: s.shortcut_bills || "Go to Bills", keys: ["G", "I"] },
                { action: s.shortcut_calendar || "Go to Calendar", keys: ["G", "C"] },
            ],
        },
        {
            title: s.shortcuts_actions || "Actions",
            shortcuts: [
                { action: s.shortcut_new_transaction || "New Transaction", keys: ["N", "T"] },
            ],
        },
    ]

    return (
        <div className="space-y-4">
            <SectionHeader
                title={s.shortcuts || "Keyboard Shortcuts"}
                description={s.shortcuts_desc || "Quick actions to navigate faster"}
            />

            {shortcutGroups.map((group, gi) => (
                <React.Fragment key={gi}>
                    <SettingsDivider />
                    <SettingsSection title={group.title}>
                        <div className="space-y-1">
                            {group.shortcuts.map((shortcut, i) => (
                                <div
                                    key={i}
                                    className="flex items-center justify-between rounded-lg py-2"
                                >
                                    <span className="text-[13px]">{shortcut.action}</span>
                                    <div className="flex items-center gap-1">
                                        {shortcut.keys.map((key, j) => (
                                            <React.Fragment key={j}>
                                                <kbd className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 text-[11px] font-mono font-medium rounded-md border border-black/8 dark:border-white/10 bg-black/3 dark:bg-white/4 text-neutral-400 shadow-[0_1px_0_0_rgba(0,0,0,0.05)] dark:shadow-[0_1px_0_0_rgba(255,255,255,0.05)]">
                                                    {key}
                                                </kbd>
                                                {j < shortcut.keys.length - 1 && <span className="text-[10px] text-neutral-400/60">+</span>}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </SettingsSection>
                </React.Fragment>
            ))}
        </div>
    )
}
