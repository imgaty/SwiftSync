//
//  admin-sidebar.tsx
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Implements the Admin sidebar admin component for Argent, supporting administrative
//  navigation, reporting, and management screens with shared UI structure.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
    LayoutDashboard,
    Users,
    ArrowLeftRight,
    Receipt,
    PiggyBank,
    Wallet,
    Target,
    Shield,
    Megaphone,
    ScrollText,
    Activity,
    Bell,
    Settings,
    LogOut,
    type LucideIcon,
} from "lucide-react"

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuItem,
    SidebarGroup,
    SidebarGroupLabel,
    CollapsedTooltip,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { useLanguage } from "@/components/language-provider"
import { UDS } from "@/lib/UDS"
import { getTranslations, type LooseTranslations } from "@/lib/translation-utils"
import { cn } from "@/lib/utils"

interface AdminUser {
    id: string
    name: string
    email: string
    avatar?: string | null
    role: string
}

interface NavItem {
    name: string
    url: string
    icon: LucideIcon
}

function getMainNav(a: LooseTranslations): NavItem[] {
    return [
        { name: a.dashboard || "Dashboard", url: "/admin", icon: LayoutDashboard },
        { name: a.users || "Users", url: "/admin/users", icon: Users },
    ]
}

function getDataNav(a: LooseTranslations): NavItem[] {
    return [
        { name: a.transactions || "Transactions", url: "/admin/transactions", icon: ArrowLeftRight },
        { name: a.bills || "Bills", url: "/admin/bills", icon: Receipt },
        { name: a.budgets || "Budgets", url: "/admin/budgets", icon: PiggyBank },
        { name: a.accounts || "Accounts", url: "/admin/accounts", icon: Wallet },
        { name: a.goals || "Goals", url: "/admin/goals", icon: Target },
    ]
}

function getSystemNav(a: LooseTranslations): NavItem[] {
    return [
        { name: a.notifications || "Notifications", url: "/admin/notifications", icon: Bell },
        { name: a.announcements || "Announcements", url: "/admin/announcements", icon: Megaphone },
        { name: a.audit_log || "Audit Log", url: "/admin/audit-log", icon: ScrollText },
        { name: a.system_health || "System Health", url: "/admin/health", icon: Activity },
        { name: a.settings || "Settings", url: "/admin/settings", icon: Settings },
    ]
}

function NavSection({ label, items }: { label: string; items: NavItem[] }) {
    const pathname = usePathname()

    return (
        <SidebarGroup>
            <SidebarGroupLabel>{label}</SidebarGroupLabel>
            <SidebarMenu>
                {items.map((item) => {
                    const isActive =
                        item.url === "/admin"
                            ? pathname === "/admin"
                            : pathname.startsWith(item.url)

                    return (
                        <SidebarMenuItem key={item.url}>
                            <CollapsedTooltip asChild tooltip={item.name} isActive={isActive}>
                                <Link
                                    href={item.url}
                                    aria-current={isActive ? "page" : undefined}
                                >
                                    <item.icon />
                                    <span>{item.name}</span>
                                </Link>
                            </CollapsedTooltip>
                        </SidebarMenuItem>
                    )
                })}
            </SidebarMenu>
        </SidebarGroup>
    )
}

export function AdminSidebar({ user }: { user: AdminUser }) {
    const { t } = useLanguage()
    const a = React.useMemo(() => getTranslations(t, "admin"), [t])
    const mainNav = React.useMemo(() => getMainNav(a), [a])
    const dataNav = React.useMemo(() => getDataNav(a), [a])
    const systemNav = React.useMemo(() => getSystemNav(a), [a])

    const initials = user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "A"

    return (
        <Sidebar variant="inset" collapsible="icon">
            {/* Header — branding */}
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <div className={cn(UDS.commandTriggerSurface, "flex items-center gap-2 px-2 py-1.5")}>
                            <div className={cn(UDS.surfaceClass({ background: "raised", blur: true, border: "muted", radius: "md", shadow: "flat" }), "flex size-7 shrink-0 items-center justify-center text-primary")}>
                                <Shield className="size-4" />
                            </div>
                            <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
                                <span className="font-semibold text-sm">Argent</span>
                                <span className="text-[10px] text-neutral-400 uppercase tracking-wider">{a.panel || "Admin Panel"}</span>
                            </div>
                        </div>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            {/* Navigation */}
            <SidebarContent>
                <NavSection label={a.overview || "Overview"} items={mainNav} />
                <NavSection label={a.financial_data || "Financial Data"} items={dataNav} />
                <NavSection label={a.system || "System"} items={systemNav} />
            </SidebarContent>

            {/* Footer — admin user info + back to app */}
            <SidebarFooter>
                <SidebarMenu>
                    {/* Back to main app link */}
                    <SidebarMenuItem>
                        <CollapsedTooltip asChild tooltip={a.back_to_app || "Back to App"}>
                            <Link href="/">
                                <LogOut className="size-4 rotate-180" />
                                <span>{a.back_to_app || "Back to App"}</span>
                            </Link>
                        </CollapsedTooltip>
                    </SidebarMenuItem>

                    <Separator className="my-1" />

                    {/* Admin user */}
                    <SidebarMenuItem>
                        <div className="flex items-center gap-2 px-2 py-1.5">
                            <Avatar className="size-7 sq-md">
                                <AvatarImage src={user.avatar || ""} alt={user.name} />
                                <AvatarFallback className={cn(UDS.surfaceClass({ background: "subtle", blur: false, border: "muted", radius: "md", shadow: "flat" }), "text-[10px] text-primary")}>
                                    {initials}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col gap-0 leading-tight group-data-[collapsible=icon]:hidden">
                                <span className="text-sm font-medium truncate max-w-[140px]">{user.name}</span>
                                <span className="text-[11px] text-neutral-400 truncate max-w-[140px]">{user.role}</span>
                            </div>
                        </div>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    )
}
