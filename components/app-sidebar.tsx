"use client"

import * as React from "react"
import { useEffect, useState } from "react"

import {
    AudioWaveform,
    BookOpen,
    Bot,
    Calendar,
    SquareTerminal,
    LayoutDashboard,
    Map,
    SlidersHorizontal,
    Command,
    Option,
    ArrowLeftRight,
    PiggyBank,
    Receipt,
    Wallet,
    Target,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavPages } from "@/components/nav-pages"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
} from "@/components/ui/sidebar"

import { useLanguage } from "@/components/language-provider"

interface UserProfile {
    id: string;
    name: string;
    email: string;
    dateOfBirth: string;
    initials: string;
    createdAt: string;
}

// Company data (static)
const companyData = [
    {
        name: "Acme Inc.",
        logo: Option,
        plan: "Enterprise",
    },
    {
        name: "Feel Good Inc.",
        logo: AudioWaveform,
        plan: "Startup",
    },
    {
        name: "Evil Corp.",
        logo: Command,
        plan: "Free",
    },
]

const navMain = [
        {
            title: "Playground",
            url: "#",
            icon: SquareTerminal,
            isActive: true,
            items: [
                {
                    title: "History",
                    url: "#",
                },
                {
                    title: "Starred",
                    url: "#",
                },
                {
                    title: "Settings",
                    url: "#",
                },
            ],
        },
        {
            title: "Models",
            url: "#",
            icon: Bot,
            items: [
                {
                    title: "Genesis",
                    url: "#",
                },
                {
                    title: "Explorer",
                    url: "#",
                },
                {
                    title: "Quantum",
                    url: "#",
                },
            ],
        },
        {
            title: "Documentation",
            url: "#",
            icon: BookOpen,
            items: [
                {
                    title: "Introduction",
                    url: "#",
                },
                {
                    title: "Get Started",
                    url: "#",
                },
                {
                    title: "Tutorials",
                    url: "#",
                },
                {
                    title: "Changelog",
                    url: "#",
                },
            ],
        },
        {
            title: "Settings",
            url: "#",
            icon: SlidersHorizontal,
            items: [
                {
                    title: "General",
                    url: "#",
                },
                {
                    title: "Team",
                    url: "#",
                },
                {
                    title: "Billing",
                    url: "#",
                },
                {
                    title: "Limits",
                    url: "#",
                },
            ],
        },
    ]



export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const { t, language } = useLanguage()
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
    const [isLoadingUser, setIsLoadingUser] = useState(true)

    // Function to fetch user profile
    const fetchProfile = React.useCallback(async () => {
        try {
            const response = await fetch('/api/auth/profile')
            if (response.ok) {
                const data = await response.json()
                setUserProfile(data)
            }
        } catch (error) {
            console.error('Failed to fetch user profile:', error)
        } finally {
            setIsLoadingUser(false)
        }
    }, [])

    // Fetch user profile on mount
    useEffect(() => {
        fetchProfile()
    }, [fetchProfile])

    // Listen for profile updates from settings dialog
    useEffect(() => {
        const handleProfileUpdate = () => {
            fetchProfile()
        }
        window.addEventListener('profile-updated', handleProfileUpdate)
        return () => {
            window.removeEventListener('profile-updated', handleProfileUpdate)
        }
    }, [fetchProfile])

    // User data for NavUser
    const userData = {
        name: userProfile?.name || 'User',
        email: userProfile?.email || '',
        avatar: '', // Could add avatar URL later
    }

    // Pages use translations - must be inside component to access `t`
    const pages = [
        {
            name: t.sidebar_dashboard,
            url: "/",
            icon: LayoutDashboard,
        },
        {
            name: t.finance?.transactions || "Transactions",
            url: "/Transactions",
            icon: ArrowLeftRight,
        },
        {
            name: t.finance?.budgets || "Budgets",
            url: "/Budgets",
            icon: PiggyBank,
        },
        {
            name: t.finance?.bills || "Bills",
            url: "/Bills",
            icon: Receipt,
        },
        {
            name: t.finance?.accounts || "Accounts",
            url: "/Accounts",
            icon: Wallet,
        },
        {
            name: t.sidebar_calendar,
            url: "/Calendar",
            icon: Calendar,
        },
        {
            name: t.sidebar_goals || (language === "pt" ? "Metas" : "Goals"),
            url: "/Goals",
            icon: Target,
        },
    ]

    return (
        <Sidebar variant="inset" collapsible="icon" {...props}>
            <SidebarHeader>
                <TeamSwitcher teams={companyData} />
            </SidebarHeader>

            <SidebarContent>
                <NavPages pages={pages} />
                {/*<NavMain items={data.navMain} />*/}
            </SidebarContent>

            <SidebarFooter>
                <NavUser user={userData} isLoading={isLoadingUser} />
            </SidebarFooter>

        </Sidebar>
    )
}
