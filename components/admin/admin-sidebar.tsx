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
import Image from "next/image"
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
    SidebarSeparator,
    useSidebar,
} from "@/components/ui/sidebar"
import { NavUser } from "@/components/nav-user"
import { useLanguage } from "@/components/language-provider"
import { getTranslations, type LooseTranslations } from "@/lib/translation-utils"

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
    const { isMobile, setOpenMobile } = useSidebar()

    const handleNavClick = React.useCallback(() => {
        if (isMobile) setOpenMobile(false)
    }, [isMobile, setOpenMobile])

    return (
        <SidebarGroup className="px-2 py-1">
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
                                    onClick={handleNavClick}
                                    aria-current={isActive ? "page" : undefined}
                                >
                                    <item.icon />
                                    <span className="group-data-[collapsible=icon]:hidden">{item.name}</span>
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

    return (
        <Sidebar variant="inset" collapsible="icon">
            <SidebarHeader className="px-2 pt-2 pb-1">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <CollapsedTooltip asChild size="lg" tooltip="Argent Admin" className="group-data-[collapsible=icon]:p-1!">
                            <Link href="/admin" aria-label="Argent Admin">
                                <span className="flex min-w-0 flex-1 items-center justify-start text-sidebar-foreground group-data-[collapsible=icon]:hidden">
                                    <Image
                                        src="/full-icon-black.svg"
                                        alt=""
                                        width={369}
                                        height={104}
                                        priority
                                        aria-hidden
                                        draggable={false}
                                        className="h-8 w-[114px] max-w-full shrink-0 object-contain dark:hidden"
                                    />
                                    <Image
                                        src="/full-icon-white.svg"
                                        alt=""
                                        width={369}
                                        height={104}
                                        priority
                                        aria-hidden
                                        draggable={false}
                                        className="hidden h-8 w-[114px] max-w-full shrink-0 object-contain dark:block"
                                    />
                                </span>
                                <span className="hidden shrink-0 items-center justify-start text-sidebar-foreground group-data-[collapsible=icon]:flex">
                                    <Image
                                        src="/icon-black.svg"
                                        alt=""
                                        width={84}
                                        height={78}
                                        priority
                                        aria-hidden
                                        draggable={false}
                                        className="block size-6 shrink-0 object-contain dark:hidden"
                                    />
                                    <Image
                                        src="/icon-white.svg"
                                        alt=""
                                        width={84}
                                        height={78}
                                        priority
                                        aria-hidden
                                        draggable={false}
                                        className="hidden size-6 shrink-0 object-contain dark:block"
                                    />
                                </span>
                            </Link>
                        </CollapsedTooltip>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent className="pt-1">
                <NavSection label={a.overview || "Overview"} items={mainNav} />
                <NavSection label={a.financial_data || "Financial Data"} items={dataNav} />
                <NavSection label={a.system || "System"} items={systemNav} />
            </SidebarContent>

            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <CollapsedTooltip asChild tooltip={a.back_to_app || "Back to App"}>
                            <Link href="/">
                                <LogOut className="size-4 rotate-180" />
                                <span className="group-data-[collapsible=icon]:hidden">{a.back_to_app || "Back to App"}</span>
                            </Link>
                        </CollapsedTooltip>
                    </SidebarMenuItem>
                </SidebarMenu>
                <SidebarSeparator className="my-1" />
                <NavUser
                    user={{
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        avatar: user.avatar || "",
                    }}
                />
            </SidebarFooter>
        </Sidebar>
    )
}
