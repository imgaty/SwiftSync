//
//  settings-dialog.tsx
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Implements the Settings dialog React component for Argent, encapsulating reusable
//  interface structure, state handling, and presentation logic for feature screens.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
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
import { UDS } from "@/lib/UDS"
import { useLanguage } from "@/components/language-provider"
import { useCurrency, type SupportedCurrency } from "@/components/currency-provider"
import {
    CollapsedTooltip,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarHeader,
    SidebarInput,
    SidebarMenu,
    SidebarMenuItem,
    useSidebar,
} from "@/components/ui/sidebar"
import { useColorBlind, type ColorBlindMode } from "@/components/colorblind-provider"
import { useOS } from "@/hooks/use-os"
import { useIsMobile } from "@/hooks/use-mobile"
import { toast } from "sonner"
import { getSidebarPageDefinitions, type SidebarPageDefinition } from "@/lib/sidebar-pages"
import { getTranslations, type LooseTranslations } from "@/lib/translation-utils"
import { getLanguageDefinition, LANGUAGE_OPTIONS, type Language } from "@/lib/languages"
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

type SettingsTranslations = LooseTranslations

const settingsPages: { id: SettingsPage; icon: React.ElementType; labelKey: string; defaultLabel: string }[] = [
    { id: "account", icon: User, labelKey: "account", defaultLabel: "Account" },
    { id: "customization", icon: SlidersHorizontal, labelKey: "customization", defaultLabel: "Customization" },
    { id: "notifications", icon: Bell, labelKey: "notifications", defaultLabel: "Notifications" },
    { id: "shortcuts", icon: Keyboard, labelKey: "shortcuts", defaultLabel: "Shortcuts" },
    { id: "rules", icon: ListFilter, labelKey: "rules", defaultLabel: "Rules" },
]

const settingsSidebarSurface = cn(
    "bg-sidebar",
    "text-sidebar-foreground",
)

const settingsOverlay = UDS.overlay

const settingsSidebarRule = "border-sidebar-border"
const settingsSidebarMuted = "text-sidebar-foreground/70"
const settingsInputFieldClass = "w-full max-w-sm"
const settingsDropdownButtonClass = "w-56 max-w-full"

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
            <mark key={`${part}-${index}`} className="sq bg-amber-300/50 px-0.5 text-current dark:bg-amber-500/30">
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
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-1.5">
            <div className="min-w-0 flex-1 space-y-0.5">
                <p className="text-sm font-medium leading-tight">{label}</p>
                <p className="text-xs text-neutral-400 leading-snug">{description}</p>
            </div>
            <div className="flex h-7 shrink-0 items-center justify-end">{children}</div>
        </div>
    )
}

function SectionHeader({ title, description }: { title: React.ReactNode; description: React.ReactNode }) {
    return (
        <div className="space-y-1">
            <h3 className="text-base font-semibold tracking-tight">{title}</h3>
            <p className="text-sm leading-relaxed text-neutral-400">{description}</p>
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
                    {title && <h4 className="text-sm font-semibold">{title}</h4>}
                    {description && <p className="text-xs text-neutral-400">{description}</p>}
                </div>
            )}
            {children}
        </section>
    )
}

function SettingsDivider() {
    return <div className={cn(UDS.separator, "my-5")} />
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

    const s = React.useMemo<SettingsTranslations>(() => getTranslations(t, "settings"), [t])
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
        [activePage, filteredPages, setActivePage],
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
            <SidebarHeader className="px-2 pt-2 pb-1">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <CollapsedTooltip
                            asChild
                            size="lg"
                            tooltip={s.title || "Settings"}
                            className="cursor-default hover:bg-transparent active:bg-transparent group-data-[collapsible=icon]:p-2!"
                        >
                            <div>
                                <SlidersHorizontal className="text-sidebar-accent-foreground" />
                                <div className="min-w-0 flex-1">
                                    <DialogTitle className="truncate text-sm font-semibold leading-5 text-sidebar-accent-foreground">
                                        {s.title || "Settings"}
                                    </DialogTitle>
                                    <DialogDescription className="truncate text-xs font-normal leading-4 text-sidebar-foreground/70">
                                        {s.description || "Manage your preferences"}
                                    </DialogDescription>
                                </div>
                            </div>
                        </CollapsedTooltip>
                    </SidebarMenuItem>
                </SidebarMenu>
                {isMobile && (
                    <DialogPrimitive.Close className={cn("absolute right-4 top-4", UDS.closeButton)}>
                        <X className="size-4" />
                        <span className="sr-only">Close</span>
                    </DialogPrimitive.Close>
                )}
            </SidebarHeader>

            <SidebarContent className="pt-1">
                <SidebarGroup className="px-2 pt-1 pb-2">
                    <SidebarInput
                        ref={searchRef}
                        id="settings-search"
                        type="search"
                        placeholder={s.search || "Search settings"}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="mb-1 h-8 w-full"
                        inputClassName="h-8 sq-md px-3 text-sm"
                    />

                    <SidebarMenu onKeyDown={handleSidebarKeyDown}>
                        {filteredPageResults.length === 0 && (
                            <SidebarMenuItem>
                                <p className={cn("px-2 py-4 text-center text-xs", settingsSidebarMuted)}>
                                    {s.no_results || "No results"}
                                </p>
                            </SidebarMenuItem>
                        )}
                        {filteredPageResults.map((result) => {
                            const page = result.page
                            const Icon = page.icon
                            const isActive = activePage === page.id
                            const pageTitle = s[page.labelKey] || page.defaultLabel

                            return (
                                <SidebarMenuItem key={page.id}>
                                    <CollapsedTooltip
                                        asChild
                                        tooltip={pageTitle}
                                        isActive={isActive}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => (search.trim() ? handleSearchResultSelect(result) : handlePageSelect(page.id))}
                                            aria-current={isActive ? "page" : undefined}
                                        >
                                            <Icon />
                                            <span>{search.trim() ? highlightSearchText(pageTitle, search) : pageTitle}</span>
                                        </button>
                                    </CollapsedTooltip>
                                </SidebarMenuItem>
                            )
                        })}
                    </SidebarMenu>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter>
                <p className={cn("text-center text-xs", settingsSidebarMuted)}>Argent v1.0</p>
            </SidebarFooter>
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
                <DialogOverlay className={settingsOverlay} />
                <DialogPrimitive.Content
                    style={isMobile ? undefined : { width: 900, height: 600, maxWidth: "calc(100vw - 2rem)", maxHeight: "calc(100vh - 2rem)" }}
                    className={cn(
                        "fixed overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 duration-200",
                        UDS.containerClass({ background: "modal", padding: false, zIndex: "z-[1000]" }), "p-0",
                        isMobile
                            ? "inset-0 sq-none"
                            : "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
                    )}
                >
                    {isMobile ? (
                        /* ─── Mobile: full-screen with slide between nav & content ─── */
                        <div className="flex flex-col w-full h-full">
                            {!showMobileContent ? (
                                /* Mobile nav screen */
                                <div className={cn("flex flex-col h-full", settingsSidebarSurface)}>
                                    {navContent}
                                </div>
                            ) : (
                                /* Mobile content screen */
                                <div className="flex flex-col h-full">
                                    <div className={cn("flex items-center gap-2 border-b px-3 pb-2 pt-3", UDS.cardDivider)}>
                                        <Button variant="ghost"
                                            type="button"
                                            onClick={() => setShowMobileContent(false)}
                                            className={cn("p-1.5 sq-md text-neutral-400 transition-all duration-150 hover:text-black dark:hover:text-white", UDS.itemHover)}
                                        >
                                            <ChevronLeft className="size-4" />
                                        </Button>
                                        <span className="text-sm font-semibold">{activePageLabel}</span>
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
                            <aside className={cn("flex w-60 shrink-0 flex-col border-r", settingsSidebarRule, settingsSidebarSurface)}>
                                {navContent}
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
                        <DialogPrimitive.Close className={cn("absolute right-4 top-4", UDS.closeButton)}>
                            <X className="size-4" />
                            <span className="sr-only">Close</span>
                        </DialogPrimitive.Close>
                    )}
                </DialogPrimitive.Content>
            </DialogPortal>
        </Dialog>
    )
}

/* ─── Account Settings ─── */

const EMPTY_ACCOUNT_PROFILE = { name: "", email: "", dob: "", recoveryEmail: "", emailTwoFactorEnabled: false }

function AccountSettings({ s, language }: { s: SettingsTranslations; language: Language }) {
    const [profile, setProfile] = React.useState(EMPTY_ACCOUNT_PROFILE)
    const [originalProfile, setOriginalProfile] = React.useState(EMPTY_ACCOUNT_PROFILE)
    const [profileAvatar, setProfileAvatar] = React.useState("")
    const [passwords, setPasswords] = React.useState({ new: "", confirm: "" })
    const [passwordDialogOpen, setPasswordDialogOpen] = React.useState(false)
    const [confirmationPassword, setConfirmationPassword] = React.useState("")
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
                        emailTwoFactorEnabled: data.emailTwoFactorEnabled === true,
                    }
                    setProfileAvatar(data.avatar || "")
                    setProfile(p)
                    setOriginalProfile(p)
                } else {
                    setProfileAvatar("")
                    setProfile(EMPTY_ACCOUNT_PROFILE)
                    setOriginalProfile(EMPTY_ACCOUNT_PROFILE)
                }
            } catch {
                toast.error("Failed to load profile")
            } finally {
                setIsLoading(false)
            }
        }
        fetchProfile()
    }, [])

    const hasProfileChanges = JSON.stringify(profile) !== JSON.stringify(originalProfile)
    const hasPasswordChanges = passwords.new !== "" || passwords.confirm !== ""
    const hasChanges = hasProfileChanges || hasPasswordChanges
    const emailChanged = profile.email.trim().toLowerCase() !== originalProfile.email.trim().toLowerCase()
    const recoveryEmailChanged = profile.recoveryEmail.trim().toLowerCase() !== originalProfile.recoveryEmail.trim().toLowerCase()
    const emailTwoFactorChanged = profile.emailTwoFactorEnabled !== originalProfile.emailTwoFactorEnabled
    const sensitiveProfileChanged = emailChanged || recoveryEmailChanged || emailTwoFactorChanged
    const requiresCurrentPassword = sensitiveProfileChanged || hasPasswordChanges

    const currentLocale = getLanguageDefinition(language).locale
    const dobDisplay = profile.dob
        ? new Date(`${profile.dob}T00:00:00`).toLocaleDateString(currentLocale, {
            month: "short",
            day: "numeric",
            year: "numeric",
        })
        : ""

    const handleSave = async (currentPassword?: string) => {
        if (hasPasswordChanges && (!passwords.new || !passwords.confirm)) {
            toast.error(s.fill_all_password_fields || "Please fill all password fields")
            return false
        }
        if (hasPasswordChanges && passwords.new !== passwords.confirm) {
            toast.error(s.passwords_dont_match || "Passwords do not match")
            return false
        }
        if (requiresCurrentPassword && !currentPassword) {
            setPasswordDialogOpen(true)
            return false
        }

        setIsSaving(true)
        try {
            const res = await fetch("/api/auth/update", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: profile.name,
                    dateOfBirth: profile.dob || null,
                    ...(emailChanged ? { email: profile.email } : {}),
                    ...(recoveryEmailChanged ? { recoveryEmail: profile.recoveryEmail || null } : {}),
                    ...(emailTwoFactorChanged ? { emailTwoFactorEnabled: profile.emailTwoFactorEnabled } : {}),
                    ...(requiresCurrentPassword && currentPassword ? { currentPassword } : {}),
                    ...(passwords.new ? { newPassword: passwords.new } : {}),
                }),
            })

            if (res.ok) {
                toast.success(s.profile_updated || "Saved")
                setOriginalProfile(profile)
                setPasswords({ new: "", confirm: "" })
                setConfirmationPassword("")
                setPasswordDialogOpen(false)
                window.dispatchEvent(new Event("profile-updated"))
                return true
            } else {
                const err = await res.json()
                toast.error(err.error || "Failed to save")
                return false
            }
        } catch {
            toast.error("Failed to save")
            return false
        } finally {
            setIsSaving(false)
        }
    }

    const handlePasswordConfirmation = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (!confirmationPassword) {
            toast.error(s.enter_current_password || "Enter your current password")
            return
        }
        await handleSave(confirmationPassword)
    }

    const closePasswordDialog = () => {
        setPasswordDialogOpen(false)
        setConfirmationPassword("")
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
            <div className={cn("flex items-center gap-4 px-4 py-4", UDS.cardSurface)}>
                <Avatar className="size-12 shrink-0 sq-full">
                    <AvatarImage src={profileAvatar} alt={profile.name || "User"} />
                    <AvatarFallback className="sq-full bg-primary/10 text-primary text-lg font-semibold">
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
                        className={settingsInputFieldClass}
                    />
                    <Input
                        placeholder={s.email || "Email"}
                        aria-label={s.email || "Email"}
                        type="email"
                        value={profile.email}
                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                        className={settingsInputFieldClass}
                    />
                    <DatePicker
                        value={profile.dob}
                        onChange={(value) => setProfile({ ...profile, dob: value })}
                        locale={language}
                        placeholder={s.dob || "Date of Birth"}
                        dobMode
                        className={settingsInputFieldClass}
                        trigger={
                            <Button variant="ghost"
                                type="button"
                                className={cn(
                                    UDS.controlSurface,
                                    UDS.inputHover,
                                    "relative flex h-11 items-center justify-start px-4 pr-10 text-left text-base text-neutral-900 transition-all duration-200 focus:outline-none dark:text-white",
                                    settingsInputFieldClass,
                                )}
                            >
                                <span className={cn("min-w-0 flex-1 truncate text-left", dobDisplay ? "text-neutral-900 dark:text-white" : "text-neutral-400/60") }>
                                    {dobDisplay || (s.dob || "Date of Birth")}
                                </span>
                                <span className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <Calendar className="size-4 text-neutral-400" />
                                </span>
                            </Button>
                        }
                    />
                    <Input
                        placeholder={s.recovery_email || "Recovery Email"}
                        aria-label={s.recovery_email || "Recovery Email"}
                        type="email"
                        value={profile.recoveryEmail}
                        onChange={(e) => setProfile({ ...profile, recoveryEmail: e.target.value })}
                        className={settingsInputFieldClass}
                    />
                </div>
            </SettingsSection>

            <SettingsDivider />

            <SettingsSection title={s.security || "Security"}>
                <div className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                        <p className="text-sm font-medium">{s.email_two_factor || "Email sign-in code"}</p>
                        <p className="text-xs text-neutral-400">{s.email_two_factor_desc || "Send a code to your email after password login"}</p>
                    </div>
                    <AnimatedToggle
                        checked={profile.emailTwoFactorEnabled}
                        onCheckedChange={(checked) => setProfile({ ...profile, emailTwoFactorEnabled: checked })}
                        disabled={isSaving}
                    />
                </div>
            </SettingsSection>

            <SettingsDivider />

            <SettingsSection title={s.change_password || "Change Password"}>
                <div className="space-y-3">
                    <Input
                        placeholder={s.new_password || "New Password"}
                        aria-label={s.new_password || "New Password"}
                        type="password"
                        value={passwords.new}
                        onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                        className={settingsInputFieldClass}
                    />
                    <Input
                        placeholder={s.confirm_password || "Confirm Password"}
                        aria-label={s.confirm_password || "Confirm Password"}
                        type="password"
                        value={passwords.confirm}
                        onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                        className={settingsInputFieldClass}
                    />
                </div>
            </SettingsSection>

            <SettingsDivider />

            <DeleteAccountSection s={s} />

            {/* Sticky save bar */}
            {hasChanges && (
                <div className={cn("uds-bg-glass uds-backdrop sticky bottom-0 -mx-6 mt-auto flex items-center justify-end gap-3 border-t px-6 py-3", UDS.cardDivider)}>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            setProfile(originalProfile)
                            setPasswords({ new: "", confirm: "" })
                            closePasswordDialog()
                        }}
                    >
                        {s.cancel || "Cancel"}
                    </Button>
                    <Button size="sm" variant="solid" onClick={() => void handleSave()} disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Save className="mr-1.5 size-3.5" />}
                        {s.save_changes || s.save || "Save Changes"}
                    </Button>
                </div>
            )}

            <Dialog
                open={passwordDialogOpen}
                onOpenChange={(nextOpen) => {
                    setPasswordDialogOpen(nextOpen)
                    if (!nextOpen) setConfirmationPassword("")
                }}
            >
                <DialogContent
                    showCloseButton={false}
                    overlayClassName="z-[1001] bg-black/16 backdrop-blur-[2px] dark:bg-black/45"
                    className="z-[1002] max-w-md gap-0 overflow-hidden p-0"
                >
                    <form onSubmit={handlePasswordConfirmation}>
                        <div className="px-6 pt-6 pb-2">
                            <DialogTitle className="text-base font-semibold">
                                {s.verify_current_password || "Confirm current password"}
                            </DialogTitle>
                            <DialogDescription className="mt-1.5 text-sm text-neutral-400 leading-relaxed">
                                {s.verify_current_password_desc || "Enter your current password to save these account changes."}
                            </DialogDescription>
                        </div>
                        <div className="space-y-4 px-6 pb-6">
                            <Input
                                type="password"
                                placeholder={s.current_password || "Current Password"}
                                aria-label={s.current_password || "Current Password"}
                                value={confirmationPassword}
                                onChange={(e) => setConfirmationPassword(e.target.value)}
                                disabled={isSaving}
                                autoFocus
                                className={settingsInputFieldClass}
                            />
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="glass"
                                    className="flex-1 h-9"
                                    onClick={closePasswordDialog}
                                    disabled={isSaving}
                                >
                                    {s.cancel || "Cancel"}
                                </Button>
                                <Button
                                    type="submit"
                                    variant="solid"
                                    className="flex-1 h-9"
                                    disabled={isSaving || !confirmationPassword}
                                >
                                    {isSaving ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Save className="mr-1.5 size-3.5" />}
                                    {s.confirm_and_save || "Confirm & Save"}
                                </Button>
                            </div>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
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
            <div className="sq-normal border border-destructive/20 bg-destructive/4 overflow-hidden">
                <div className="px-4 pt-4 pb-2">
                    <h4 className="text-sm font-semibold text-destructive">{s.danger_zone || "Danger Zone"}</h4>
                </div>
                <div className="px-4 pb-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <p className="text-sm font-medium">{s.delete_account || "Delete Account"}</p>
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
                        <div className="flex size-12 items-center justify-center sq-full bg-destructive/10 mb-3">
                            <AlertTriangle className="size-5 text-destructive" />
                        </div>
                        <DialogTitle className="text-base font-semibold">{s.delete_account_title || "Delete Account"}</DialogTitle>
                        <DialogDescription className="mt-1.5 text-sm text-neutral-400 leading-relaxed">
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
                            className={settingsInputFieldClass}
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
    language: Language
    setLanguage: (lang: Language) => void
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
                    className={cn("sq-lg px-2", flashTarget === "sidebar-position" && "ring-1 ring-amber-400/60")}
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
                            <SelectTrigger className={settingsDropdownButtonClass}>
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
                    className={cn("sq-lg px-2", flashTarget === "language" && "ring-1 ring-amber-400/60")}
                >
                    <SettingRow
                        label={searchHighlightQuery?.trim() ? highlightSearchText(s.language || "Language", searchHighlightQuery) : (s.language || "Language")}
                        description={searchHighlightQuery?.trim() ? highlightSearchText(s.language_desc || "Choose your preferred language", searchHighlightQuery) : (s.language_desc || "Choose your preferred language")}
                    >
                        <Select
                            value={language}
                            open={openLanguageSelect}
                            onOpenChange={setOpenLanguageSelect}
                            onValueChange={(v) => setLanguage(v as Language)}
                        >
                            <SelectTrigger className={settingsDropdownButtonClass}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {LANGUAGE_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        <span className="flex items-center gap-2">
                                            <span>{searchHighlightQuery?.trim() ? highlightSearchText(option.label, searchHighlightQuery) : option.label}</span>
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </SettingRow>
                </div>

                <div
                    ref={(el) => { targetRefs.current["currency"] = el }}
                    className={cn("sq-lg px-2", flashTarget === "currency" && "ring-1 ring-amber-400/60")}
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
                            <SelectTrigger className={settingsDropdownButtonClass}>
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
                    className={cn("sq-lg px-2", flashTarget === "theme" && "ring-1 ring-amber-400/60")}
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
                            <SelectTrigger className={settingsDropdownButtonClass}>
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
                    className={cn("sq-lg px-2", flashTarget === "colorblind" && "ring-1 ring-amber-400/60")}
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
                            <SelectTrigger className={settingsDropdownButtonClass}>
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
                className={cn("sq-lg px-2", flashTarget === "sidebar-pages" && "ring-1 ring-amber-400/60")}
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
                UDS.inlineSurface,
                "flex items-center gap-2 px-2.5 py-2",
                hidden && "grayscale opacity-55",
                isDragging && "z-20 sq-border-strong uds-bg-raised [box-shadow:var(--shadow-elevated)]",
            )}
        >
            <Button variant="ghost"
                type="button"
                className={cn("sq p-1 text-foreground-secondary/70 hover:text-foreground", UDS.itemHover)}
                aria-label={`Drag ${page.name}`}
                {...attributes}
                {...listeners}
            >
                <GripVertical className="size-4" />
            </Button>

            <Icon className="size-4 text-foreground-secondary/70" />
            <span className="flex-1 text-sm">
                {searchHighlightQuery?.trim() ? highlightSearchText(page.name, searchHighlightQuery) : page.name}
            </span>
            {hidden && <span className="text-xs text-foreground-secondary/70">Hidden</span>}

            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 text-foreground-secondary/75 hover:bg-foreground/8 hover:text-foreground"
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
                                    className="flex items-center justify-between sq-lg py-2"
                                >
                                    <span className="text-sm">{shortcut.action}</span>
                                    <div className="flex items-center gap-1">
                                        {shortcut.keys.map((key, j) => (
                                            <React.Fragment key={j}>
                                                <kbd className={`${UDS.inlineSurface} inline-flex h-6 min-w-6 items-center justify-center px-1.5 text-xs font-mono font-medium text-neutral-400`}>
                                                    {key}
                                                </kbd>
                                                {j < shortcut.keys.length - 1 && <span className="text-xs text-neutral-400/60">+</span>}
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
