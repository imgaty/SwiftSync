"use client"

import * as React from "react"
import { 
    Settings, 
    Palette, 
    Globe, 
    Bell, 
    Keyboard, 
    PanelLeft,
    PanelRight,
    Sun,
    Moon,
    Monitor,
    Check,
    Eye,
    User,
    Lock,
    Mail,
    Calendar,
    Save,
    Loader2,
} from "lucide-react"
import { useTheme } from "next-themes"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { AnimatedToggle } from "@/components/ui/animated-toggle"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/components/language-provider"
import { useSidebar } from "@/components/ui/sidebar"
import { useColorBlind } from "@/components/colorblind-provider"
import { toast } from "sonner"

interface SettingsDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

type SettingsPage = "account" | "general" | "appearance" | "language" | "notifications" | "shortcuts"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SettingsTranslations = Record<string, any>

const settingsPages: { id: SettingsPage; icon: React.ElementType; labelKey: string; defaultLabel: string }[] = [
    { id: "account", icon: User, labelKey: "account", defaultLabel: "Account" },
    { id: "general", icon: Settings, labelKey: "general", defaultLabel: "General" },
    { id: "appearance", icon: Palette, labelKey: "appearance", defaultLabel: "Appearance" },
    { id: "language", icon: Globe, labelKey: "language", defaultLabel: "Language" },
    { id: "notifications", icon: Bell, labelKey: "notifications", defaultLabel: "Notifications" },
    { id: "shortcuts", icon: Keyboard, labelKey: "shortcuts", defaultLabel: "Shortcuts" },
]

// Reusable selection card component for consistent styling
function SelectionCard({ 
    selected, 
    onClick, 
    children, 
    className 
}: { 
    selected: boolean
    onClick: () => void
    children: React.ReactNode
    className?: string 
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "relative flex items-center gap-4 p-4 rounded-lg border text-left transition-all",
                "hover:bg-accent/50",
                selected 
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20" 
                    : "border-border hover:border-border",
                className
            )}
        >
            {children}
            {selected && (
                <Check className="absolute right-4 top-1/2 -translate-y-1/2 size-4 text-primary" />
            )}
        </button>
    )
}

// Setting row component for consistent notification/toggle styling
function SettingRow({
    label,
    description,
    children
}: {
    label: string
    description: string
    children: React.ReactNode
}) {
    return (
        <div className="flex items-center justify-between gap-4 p-4 rounded-lg border bg-card">
            <div className="space-y-1 min-w-0 flex-1">
                <Label className="auto-scroll text-sm font-medium">{label}</Label>
                <p className="auto-scroll text-xs text-muted-foreground">{description}</p>
            </div>
            <div className="shrink-0">
                {children}
            </div>
        </div>
    )
}

// Section header component
function SectionHeader({ title, description }: { title: string; description: string }) {
    return (
        <div className="space-y-1">
            <h3 className="auto-scroll text-lg font-semibold tracking-tight">{title}</h3>
            <p className="auto-scroll text-sm text-muted-foreground">{description}</p>
        </div>
    )
}

// Subsection header component  
function SubsectionHeader({ title, description }: { title: string; description?: string }) {
    return (
        <div className="space-y-1">
            <h4 className="auto-scroll text-sm font-medium">{title}</h4>
            {description && <p className="auto-scroll text-xs text-muted-foreground">{description}</p>}
        </div>
    )
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
    const [activePage, setActivePage] = React.useState<SettingsPage>("account")
    const { t, language, setLanguage } = useLanguage()
    const { theme, setTheme } = useTheme()
    const { side, setSide } = useSidebar()
    const { mode: colorBlindMode, setMode: setColorBlindMode } = useColorBlind()

    const s: SettingsTranslations = (t as SettingsTranslations).settings || {}

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl h-[80vh] p-0 gap-0 overflow-hidden flex flex-col border-border/50 shadow-2xl">
                <div className="flex h-full min-h-0">
                    {/* Sidebar Navigation */}
                    <div className="w-56 border-r bg-muted/20 flex flex-col">
                        <DialogHeader className="p-5 pb-4">
                            <DialogTitle className="flex items-center gap-3 text-lg">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <Settings className="size-4 text-primary" />
                                </div>
                                {s.title || "Settings"}
                            </DialogTitle>
                            <DialogDescription className="text-xs mt-1">
                                {s.description || "Manage your preferences"}
                            </DialogDescription>
                        </DialogHeader>
                        <Separator />
                        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                            {settingsPages.map((page, index) => {
                                const Icon = page.icon
                                const isActive = activePage === page.id
                                return (
                                    <button
                                        key={page.id}
                                        onClick={() => setActivePage(page.id)}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                                            isActive
                                                ? "bg-primary text-primary-foreground shadow-sm"
                                                : "hover:bg-accent text-muted-foreground hover:text-foreground"
                                        )}
                                        style={{ animationDelay: `${index * 0.05}s` }}
                                    >
                                        <Icon className={cn("size-4 transition-transform duration-200", isActive && "scale-110")} />
                                        {s[page.labelKey] || page.defaultLabel}
                                        {isActive && (
                                            <div className="ml-auto w-1.5 h-1.5 bg-primary-foreground rounded-full animate-pulse" />
                                        )}
                                    </button>
                                )
                            })}
                        </nav>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden bg-background">
                        <div className="flex-1 overflow-y-auto p-6">
                            <div key={activePage} className="animate-fade-in-up" style={{ animationDuration: '0.25s' }}>
                                {activePage === "account" && (
                                    <AccountSettings s={s} />
                                )}
                                {activePage === "general" && (
                                    <GeneralSettings s={s} side={side} setSide={setSide} />
                                )}
                                {activePage === "appearance" && (
                                    <AppearanceSettings s={s} theme={theme} setTheme={setTheme} colorBlindMode={colorBlindMode} setColorBlindMode={setColorBlindMode} />
                                )}
                                {activePage === "language" && (
                                    <LanguageSettings s={s} language={language} setLanguage={setLanguage} />
                                )}
                                {activePage === "notifications" && (
                                    <NotificationSettings s={s} />
                                )}
                                {activePage === "shortcuts" && (
                                    <ShortcutsSettings s={s} />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

// Account Settings Page
function AccountSettings({ s }: { s: SettingsTranslations }) {
    const [isLoading, setIsLoading] = React.useState(true)
    const [isSaving, setIsSaving] = React.useState(false)
    const [hasChanges, setHasChanges] = React.useState(false)
    const [originalProfile, setOriginalProfile] = React.useState({
        name: "",
        email: "",
        dateOfBirth: "",
        recoveryEmail: ""
    })
    const [profile, setProfile] = React.useState({
        name: "",
        email: "",
        dateOfBirth: "",
        recoveryEmail: ""
    })
    const [passwords, setPasswords] = React.useState({
        current: "",
        new: "",
        confirm: ""
    })

    // Check for changes
    React.useEffect(() => {
        const profileChanged = JSON.stringify(profile) !== JSON.stringify(originalProfile)
        const passwordChanged = passwords.current || passwords.new || passwords.confirm
        setHasChanges(profileChanged || !!passwordChanged)
    }, [profile, originalProfile, passwords])

    // Fetch user profile on mount
    React.useEffect(() => {
        async function fetchProfile() {
            try {
                const res = await fetch("/api/auth/profile")
                if (res.ok) {
                    const data = await res.json()
                    const profileData = {
                        name: data.name || "",
                        email: data.email || "",
                        dateOfBirth: data.dateOfBirth || "",
                        recoveryEmail: data.recoveryEmail || ""
                    }
                    setProfile(profileData)
                    setOriginalProfile(profileData)
                }
            } catch (error) {
                console.error("Failed to fetch profile:", error)
                toast.error("Failed to load profile")
            } finally {
                setIsLoading(false)
            }
        }
        fetchProfile()
    }, [])

    const handleSaveAll = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault()
        e.stopPropagation()
        
        console.log("🔵 Save button clicked!")
        
        // Validate password fields if any are filled
        const isChangingPassword = passwords.current || passwords.new || passwords.confirm
        if (isChangingPassword) {
            if (!passwords.current || !passwords.new || !passwords.confirm) {
                toast.error(s.fill_all_password_fields || "Please fill all password fields to change password")
                return
            }
            if (passwords.new !== passwords.confirm) {
                toast.error(s.passwords_dont_match || "Passwords don't match")
                return
            }
            if (passwords.new.length < 8) {
                toast.error(s.password_too_short || "Password must be at least 8 characters")
                return
            }
        }

        setIsSaving(true)
        toast.loading("Saving changes...", { id: "saving" })
        
        try {
            // Build update payload
            const payload: Record<string, string> = {
                name: profile.name,
                email: profile.email,
                dateOfBirth: profile.dateOfBirth,
                recoveryEmail: profile.recoveryEmail
            }

            // Add password fields if changing password
            if (isChangingPassword) {
                payload.currentPassword = passwords.current
                payload.newPassword = passwords.new
            }

            console.log('📤 Sending update payload:', { ...payload, currentPassword: payload.currentPassword ? '[HIDDEN]' : undefined, newPassword: payload.newPassword ? '[HIDDEN]' : undefined })

            const res = await fetch("/api/auth/update", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            })
            
            console.log('📥 Response status:', res.status)
            const data = await res.json()
            console.log('📥 Response data:', data)
            
            if (res.ok) {
                toast.success(s.profile_updated || "Changes saved successfully!", { id: "saving" })
                // Update original profile to reflect saved state
                setOriginalProfile({ ...profile })
                // Clear password fields after successful save
                if (isChangingPassword) {
                    setPasswords({ current: "", new: "", confirm: "" })
                }
                // Trigger sidebar refresh
                window.dispatchEvent(new CustomEvent('profile-updated'))
            } else {
                toast.error(data.error || "Failed to save changes", { id: "saving" })
            }
        } catch (error) {
            console.error("Failed to save changes:", error)
            toast.error("Failed to save changes", { id: "saving" })
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="space-y-8">
            {/* Profile Section */}
            <div className="space-y-6">
                <div>
                    <h3 className="text-lg font-semibold">{s.profile_info || "Profile Information"}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                        {s.profile_info_desc || "Update your personal details"}
                    </p>
                </div>
                
                <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="account-name" className="text-sm font-medium">
                            {s.name || "Name"}
                        </Label>
                        <Input 
                            id="account-name" 
                            placeholder="John Doe" 
                            value={profile.name}
                            onChange={(e) => setProfile(p => ({ ...p, name: e.target.value }))}
                            className="h-10"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="account-email" className="text-sm font-medium">
                            {s.email || "Email"}
                        </Label>
                        <Input 
                            id="account-email" 
                            type="email"
                            placeholder="you@example.com"
                            value={profile.email}
                            onChange={(e) => setProfile(p => ({ ...p, email: e.target.value }))}
                            className="h-10"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="account-dob" className="text-sm font-medium">
                            {s.date_of_birth || "Date of Birth"}
                        </Label>
                        <Input 
                            id="account-dob" 
                            type="date" 
                            value={profile.dateOfBirth}
                            onChange={(e) => setProfile(p => ({ ...p, dateOfBirth: e.target.value }))}
                            className="h-10"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="account-recovery" className="text-sm font-medium">
                            {s.recovery_email || "Recovery Email"}
                        </Label>
                        <Input 
                            id="account-recovery" 
                            type="email" 
                            placeholder="recovery@example.com"
                            value={profile.recoveryEmail}
                            onChange={(e) => setProfile(p => ({ ...p, recoveryEmail: e.target.value }))}
                            className="h-10"
                        />
                        <p className="text-xs text-muted-foreground">
                            {s.recovery_email_desc || "Used for account recovery"}
                        </p>
                    </div>
                </div>
            </div>

            <Separator />

            {/* Password Section */}
            <div className="space-y-6">
                <div>
                    <h3 className="text-lg font-semibold">{s.change_password || "Change Password"}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                        {s.change_password_desc || "Leave blank to keep your current password"}
                    </p>
                </div>
                
                <div className="grid gap-4 max-w-sm">
                    <div className="space-y-2">
                        <Label htmlFor="current-password" className="text-sm font-medium">
                            {s.current_password || "Current Password"}
                        </Label>
                        <Input 
                            id="current-password" 
                            type="password" 
                            placeholder="Enter current password"
                            value={passwords.current}
                            onChange={(e) => setPasswords(p => ({ ...p, current: e.target.value }))}
                            className="h-10"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="new-password" className="text-sm font-medium">
                            {s.new_password || "New Password"}
                        </Label>
                        <Input 
                            id="new-password" 
                            type="password"
                            placeholder="Enter new password"
                            value={passwords.new}
                            onChange={(e) => setPasswords(p => ({ ...p, new: e.target.value }))}
                            className="h-10"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirm-password" className="text-sm font-medium">
                            {s.confirm_password || "Confirm Password"}
                        </Label>
                        <Input 
                            id="confirm-password" 
                            type="password"
                            placeholder="Confirm new password"
                            value={passwords.confirm}
                            onChange={(e) => setPasswords(p => ({ ...p, confirm: e.target.value }))}
                            className="h-10"
                        />
                    </div>
                </div>
            </div>

            {/* Sticky Save Bar */}
            <div className="sticky bottom-0 -mx-4 -mb-4 px-4 py-4 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 border-t">
                <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                        {hasChanges ? (s.unsaved_changes || "You have unsaved changes") : (s.no_changes || "No changes to save")}
                    </p>
                    <Button 
                        type="button"
                        onClick={handleSaveAll} 
                        disabled={isSaving || !hasChanges}
                        className="min-w-[140px]"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="size-4 mr-2 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="size-4 mr-2" />
                                {s.save_changes || "Save Changes"}
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    )
}

// General Settings Page
function GeneralSettings({ s, side, setSide }: { s: SettingsTranslations; side: "left" | "right"; setSide: (side: "left" | "right") => void }) {
    return (
        <div className="space-y-4">
            <SectionHeader 
                title={s.general || "General"} 
                description={s.general_desc || "Configure general application settings"} 
            />
            <Separator />
            
            {/* Sidebar Position */}
            <div className="space-y-4">
                <SubsectionHeader 
                    title={s.sidebar_position || "Sidebar Position"} 
                    description={s.sidebar_position_desc || "Choose which side the sidebar appears on"} 
                />
                <div className="grid grid-cols-2 gap-4">
                    <SelectionCard selected={side === "left"} onClick={() => setSide("left")}>
                        <PanelLeft className="size-5 text-muted-foreground" />
                        <span className="text-sm font-medium">{s.left || "Left"}</span>
                    </SelectionCard>
                    <SelectionCard selected={side === "right"} onClick={() => setSide("right")}>
                        <PanelRight className="size-5 text-muted-foreground" />
                        <span className="text-sm font-medium">{s.right || "Right"}</span>
                    </SelectionCard>
                </div>
            </div>
        </div>
    )
}

type ColorBlindMode = "none" | "deuteranopia" | "protanopia" | "tritanopia"

// Appearance Settings Page
function AppearanceSettings({ s, theme, setTheme, colorBlindMode, setColorBlindMode }: { 
    s: SettingsTranslations
    theme: string | undefined
    setTheme: (theme: string) => void
    colorBlindMode: ColorBlindMode
    setColorBlindMode: (mode: ColorBlindMode) => void 
}) {
    return (
        <div className="space-y-4">
            <SectionHeader 
                title={s.appearance || "Appearance"} 
                description={s.appearance_desc || "Customize how the application looks"} 
            />
            <Separator />
            
            {/* Theme Selection */}
            <div className="space-y-4">
                <SubsectionHeader 
                    title={s.theme || "Theme"} 
                    description={s.theme_desc || "Select your preferred color theme"} 
                />
                <div className="grid grid-cols-3 gap-4">
                    <SelectionCard 
                        selected={theme === "light"} 
                        onClick={() => setTheme("light")}
                        className="flex-col items-center text-center p-4"
                    >
                        <div className="w-full aspect-video rounded-lg bg-white border border-border flex items-center justify-center mb-4">
                            <Sun className="size-5 text-amber-500" />
                        </div>
                        <span className="text-sm font-medium">{s.light || "Light"}</span>
                    </SelectionCard>
                    <SelectionCard 
                        selected={theme === "dark"} 
                        onClick={() => setTheme("dark")}
                        className="flex-col items-center text-center p-4"
                    >
                        <div className="w-full aspect-video rounded-lg bg-zinc-900 border border-border flex items-center justify-center mb-4">
                            <Moon className="size-5 text-blue-400" />
                        </div>
                        <span className="text-sm font-medium">{s.dark || "Dark"}</span>
                    </SelectionCard>
                    <SelectionCard 
                        selected={theme === "system"} 
                        onClick={() => setTheme("system")}
                        className="flex-col items-center text-center p-4"
                    >
                        <div className="w-full aspect-video rounded-lg bg-linear-to-r from-white to-zinc-900 border border-border flex items-center justify-center mb-4">
                            <Monitor className="size-5 text-muted-foreground" />
                        </div>
                        <span className="text-sm font-medium">{s.system || "System"}</span>
                    </SelectionCard>
                </div>
            </div>

            {/* Colorblind Mode */}
            <div className="space-y-4">
                <SubsectionHeader 
                    title={s.colorblind_mode || "Color Vision"} 
                    description={s.colorblind_mode_desc || "Adjust colors for better visibility"} 
                />
                <div className="grid grid-cols-2 gap-4">
                    <SelectionCard 
                        selected={colorBlindMode === "none"} 
                        onClick={() => setColorBlindMode("none")}
                    >
                        <Eye className="size-5 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{s.colorblind_none || "Default"}</p>
                            <p className="text-xs text-muted-foreground">{s.colorblind_none_desc || "Standard color palette"}</p>
                        </div>
                    </SelectionCard>
                    <SelectionCard 
                        selected={colorBlindMode === "deuteranopia"} 
                        onClick={() => setColorBlindMode("deuteranopia")}
                    >
                        <div className="flex gap-1">
                            <div className="w-3 h-3 rounded-full bg-blue-500" />
                            <div className="w-3 h-3 rounded-full bg-orange-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{s.colorblind_deuteranopia || "Deuteranopia"}</p>
                            <p className="text-xs text-muted-foreground">{s.colorblind_deuteranopia_desc || "Red-green (most common)"}</p>
                        </div>
                    </SelectionCard>
                    <SelectionCard 
                        selected={colorBlindMode === "protanopia"} 
                        onClick={() => setColorBlindMode("protanopia")}
                    >
                        <div className="flex gap-1">
                            <div className="w-3 h-3 rounded-full bg-blue-500" />
                            <div className="w-3 h-3 rounded-full bg-yellow-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{s.colorblind_protanopia || "Protanopia"}</p>
                            <p className="text-xs text-muted-foreground">{s.colorblind_protanopia_desc || "Red-blind"}</p>
                        </div>
                    </SelectionCard>
                    <SelectionCard 
                        selected={colorBlindMode === "tritanopia"} 
                        onClick={() => setColorBlindMode("tritanopia")}
                    >
                        <div className="flex gap-1">
                            <div className="w-3 h-3 rounded-full bg-red-500" />
                            <div className="w-3 h-3 rounded-full bg-cyan-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{s.colorblind_tritanopia || "Tritanopia"}</p>
                            <p className="text-xs text-muted-foreground">{s.colorblind_tritanopia_desc || "Blue-yellow"}</p>
                        </div>
                    </SelectionCard>
                </div>
            </div>
        </div>
    )
}

// Language Settings Page
function LanguageSettings({ s, language, setLanguage }: { s: SettingsTranslations; language: string; setLanguage: (lang: "en" | "pt") => void }) {
    return (
        <div className="space-y-4">
            <SectionHeader 
                title={s.language || "Language"} 
                description={s.language_desc || "Choose your preferred language"} 
            />
            <Separator />
            
            <div className="grid gap-4">
                <SelectionCard selected={language === "en"} onClick={() => setLanguage("en")}>
                    <span className="text-xl">🇬🇧</span>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">English</p>
                        <p className="text-xs text-muted-foreground">English (United States)</p>
                    </div>
                </SelectionCard>
                <SelectionCard selected={language === "pt"} onClick={() => setLanguage("pt")}>
                    <span className="text-xl">🇵🇹</span>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">Português</p>
                        <p className="text-xs text-muted-foreground">Português (Portugal)</p>
                    </div>
                </SelectionCard>
            </div>
        </div>
    )
}

// Notification Settings Page
function NotificationSettings({ s }: { s: SettingsTranslations }) {
    const [emailNotifications, setEmailNotifications] = React.useState(true)
    const [pushNotifications, setPushNotifications] = React.useState(false)
    const [billReminders, setBillReminders] = React.useState(true)
    const [budgetAlerts, setBudgetAlerts] = React.useState(true)

    return (
        <div className="space-y-4">
            <SectionHeader 
                title={s.notifications || "Notifications"} 
                description={s.notifications_desc || "Configure how you receive notifications"} 
            />
            <Separator />
            
            <div className="space-y-4">
                <SettingRow 
                    label={s.email_notifications || "Email Notifications"}
                    description={s.email_notifications_desc || "Receive notifications via email"}
                >
                    <AnimatedToggle checked={emailNotifications} onCheckedChange={setEmailNotifications} />
                </SettingRow>
                <SettingRow 
                    label={s.push_notifications || "Push Notifications"}
                    description={s.push_notifications_desc || "Receive push notifications in browser"}
                >
                    <AnimatedToggle checked={pushNotifications} onCheckedChange={setPushNotifications} />
                </SettingRow>
                <SettingRow 
                    label={s.bill_reminders || "Bill Reminders"}
                    description={s.bill_reminders_desc || "Get reminded about upcoming bills"}
                >
                    <AnimatedToggle checked={billReminders} onCheckedChange={setBillReminders} />
                </SettingRow>
                <SettingRow 
                    label={s.budget_alerts || "Budget Alerts"}
                    description={s.budget_alerts_desc || "Get alerted when nearing budget limits"}
                >
                    <AnimatedToggle checked={budgetAlerts} onCheckedChange={setBudgetAlerts} />
                </SettingRow>
            </div>
        </div>
    )
}

// Shortcuts Settings Page
function ShortcutsSettings({ s }: { s: SettingsTranslations }) {
    const shortcuts = [
        { action: "Open Command Palette", keys: ["⌘", "K"] },
        { action: "Toggle Sidebar", keys: ["⌘", "B"] },
        { action: "Go to Dashboard", keys: ["G", "D"] },
        { action: "Go to Transactions", keys: ["G", "T"] },
        { action: "Go to Accounts", keys: ["G", "A"] },
        { action: "Go to Budgets", keys: ["G", "B"] },
        { action: "Go to Bills", keys: ["G", "I"] },
        { action: "Go to Calendar", keys: ["G", "C"] },
        { action: "New Transaction", keys: ["N", "T"] },
        { action: "Search", keys: ["⌘", "F"] },
    ]

    return (
        <div className="space-y-4">
            <SectionHeader 
                title={s.shortcuts || "Keyboard Shortcuts"} 
                description={s.shortcuts_desc || "Quick actions to navigate faster"} 
            />
            <Separator />
            
            <div className="space-y-4">
                {shortcuts.map((shortcut, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                        <span className="text-sm">{shortcut.action}</span>
                        <div className="flex items-center gap-1">
                            {shortcut.keys.map((key, j) => (
                                <React.Fragment key={j}>
                                    <kbd className="inline-flex items-center justify-center min-w-6 h-6 px-2 text-xs font-mono bg-muted rounded-lg border border-border">
                                        {key}
                                    </kbd>
                                    {j < shortcut.keys.length - 1 && <span className="text-xs text-muted-foreground mx-1">+</span>}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
